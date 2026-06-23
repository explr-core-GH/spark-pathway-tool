import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { INTERNSHIPS, type Internship } from "@/lib/internships-catalog";
import { HollandLetter, buildWhyFits, type ScaleScores } from "@/lib/holland-fit";
import {
  oppToCatalogInternship,
  oppSlug,
  isOppSlug,
  oppIdFromSlug,
  type Opportunity,
} from "@/lib/opportunities";

export const Route = createFileRoute("/student_/apply")({
  validateSearch: (s: Record<string, unknown>): { opportunity?: string } => ({
    opportunity: typeof s.opportunity === "string" ? s.opportunity : undefined,
  }),
  head: () => ({ meta: [{ title: "Apply for internships — EXPLR" }] }),
  component: () => (
    <RoleGuard requires="student">
      <SelectPage />
    </RoleGuard>
  ),
});

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);
const MIN_CHOICES = 4;

type InterestMap = Record<string, "yes" | "maybe" | "no">;
const STATUS_LABEL: Record<string, string> = {
  requested: "Requested",
  approved: "Approved — complete it",
  denied: "Not approved",
  submitted: "Application submitted",
};

function SelectPage() {
  const { user, loading: authLoading } = useSession();
  const navigate = useNavigate();
  const { opportunity } = Route.useSearch();

  const [internships, setInternships] = useState<Internship[]>([]);
  const [interest, setInterest] = useState<InterestMap>({});
  const [hollandCode, setHollandCode] = useState<string | null>(null);
  const [scaleScores, setScaleScores] = useState<ScaleScores>({});
  // Ordered = rank order (index 0 = #1 choice).
  const [selected, setSelected] = useState<string[]>([]);
  const [existing, setExisting] = useState<Record<string, string>>({}); // ref → status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: vis }, { data: ints }, { data: sess }, { data: orgInts }, { data: sels }] =
        await Promise.all([
          supabase.from("internship_visibility").select("internship_slug, visible"),
          supabase.from("internship_interest_responses").select("internship_slug, response").eq("student_id", user.id),
          supabase
            .from("assessment_sessions")
            .select("holland_code, scale_scores, completed_at")
            .eq("student_id", user.id)
            .not("completed_at", "is", null)
            .order("completed_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          sb("opportunities").select("*").eq("type", "internship").eq("status", "approved"),
          sb("internship_selections").select("internship_ref, status, rank").eq("student_id", user.id),
        ]);
      if (cancelled) return;
      const hidden = new Set((vis ?? []).filter((r) => r.visible === false).map((r) => r.internship_slug));
      const orgList = ((orgInts as Opportunity[]) ?? []).map(oppToCatalogInternship);
      setInternships([...INTERNSHIPS.filter((i) => !hidden.has(i.slug)), ...orgList]);
      const map: InterestMap = {};
      for (const r of ints ?? []) map[r.internship_slug] = r.response as "yes" | "maybe" | "no";
      setInterest(map);
      setHollandCode(sess?.holland_code ?? null);
      setScaleScores((sess?.scale_scores as ScaleScores) ?? {});

      const existingMap: Record<string, string> = {};
      const existingRows = ((sels as Array<{ internship_ref: string; status: string; rank: number | null }>) ?? [])
        .filter((s) => s.status !== "denied")
        .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
      const order: string[] = [];
      for (const s of (sels as Array<{ internship_ref: string; status: string }>) ?? []) {
        existingMap[s.internship_ref] = s.status;
      }
      for (const s of existingRows) order.push(s.internship_ref);
      if (opportunity) {
        const slug = oppSlug(opportunity);
        if (orgList.some((i) => i.slug === slug) && !order.includes(slug)) order.push(slug);
      }
      setExisting(existingMap);
      setSelected(order);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, opportunity]);

  const ranked = useMemo(() => {
    const interestWeight = (slug: string) => {
      const r = interest[slug];
      if (r === "yes") return 3;
      if (r === "maybe") return 2;
      if (r === "no") return 0;
      return 1;
    };
    const riasecScore = (i: Internship) => {
      if (Object.keys(scaleScores).length > 0) return i.riasec.reduce((s, c) => s + (scaleScores[c] ?? 0), 0);
      if (hollandCode) {
        const codes = hollandCode.split("");
        return i.riasec.reduce((s, c) => s + (codes.includes(c) ? 3 - codes.indexOf(c) : 0), 0);
      }
      return 0;
    };
    return [...internships].sort((a, b) => {
      const iw = interestWeight(b.slug) - interestWeight(a.slug);
      if (iw !== 0) return iw;
      return riasecScore(b) - riasecScore(a);
    });
  }, [internships, interest, scaleScores, hollandCode]);

  function toggle(ref: string) {
    setSelected((prev) => (prev.includes(ref) ? prev.filter((r) => r !== ref) : [...prev, ref]));
  }
  function move(ref: string, dir: -1 | 1) {
    setSelected((prev) => {
      const i = prev.indexOf(ref);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const nameByRef = useMemo(() => {
    const m = new Map(internships.map((i) => [i.slug, i.name]));
    return (ref: string) => m.get(ref) ?? ref;
  }, [internships]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;
    if (selected.length < MIN_CHOICES) {
      setError(`Choose and rank at least ${MIN_CHOICES} internships.`);
      return;
    }
    setSubmitting(true);
    // Insert fresh requests with their rank; re-rank existing still-requested rows.
    const fresh = selected.filter((ref) => !existing[ref]);
    const rows = fresh.map((ref) => ({
      student_id: user.id,
      internship_ref: ref,
      opportunity_id: isOppSlug(ref) ? oppIdFromSlug(ref) : null,
      status: "requested",
      rank: selected.indexOf(ref) + 1,
    }));
    if (rows.length > 0) {
      const { error: insErr } = await sb("internship_selections").upsert(rows, {
        onConflict: "student_id,internship_ref",
        ignoreDuplicates: true,
      });
      if (insErr) {
        setSubmitting(false);
        setError(insErr.message);
        return;
      }
    }
    // Update rank on existing requests that are still pending.
    for (const ref of selected) {
      if (existing[ref] === "requested") {
        await sb("internship_selections")
          .update({ rank: selected.indexOf(ref) + 1 })
          .eq("student_id", user.id)
          .eq("internship_ref", ref);
      }
    }
    setSubmitting(false);
    setDone(true);
  }

  if (authLoading || loading) {
    return <main className="mx-auto max-w-3xl px-6 py-24 text-sm text-charcoal-400">Loading…</main>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link to="/student" className="text-sm tracking-tight">← Back to dashboard</Link>
          <Link to="/sign-out" className="text-sm text-charcoal-500 hover:text-ink">Sign out</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="eyebrow">Internships · step 1 of 2</p>
        <h1 className="display mt-3">Choose &amp; rank internships</h1>
        <p className="mt-4 max-w-2xl text-charcoal-500">
          Pick at least <span className="font-medium text-ink">{MIN_CHOICES}</span> internships
          you&apos;re interested in and put them in order of preference. An EXPLR admin reviews your
          picks and approves which ones you can apply to — then you complete the application.
        </p>

        {Object.keys(existing).length > 0 && (
          <div className="mt-8 border border-charcoal-100 bg-charcoal-50 p-4">
            <p className="text-xs uppercase tracking-wider text-charcoal-400">Your requests so far</p>
            <ul className="mt-2 space-y-1 text-sm">
              {Object.entries(existing).map(([ref, status]) => (
                <li key={ref} className="flex items-center justify-between">
                  <span>{nameByRef(ref)}</span>
                  <span className="text-xs text-charcoal-500">{STATUS_LABEL[status] ?? status}</span>
                </li>
              ))}
            </ul>
            {Object.values(existing).some((s) => s === "approved") && (
              <Link to="/student/apply-complete" className="btn-ink mt-3 inline-flex text-sm">
                Complete approved applications →
              </Link>
            )}
          </div>
        )}

        {done ? (
          <div className="mt-10 border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-sm font-medium text-emerald-800">Requests submitted.</p>
            <p className="mt-1 text-sm text-emerald-800">
              An admin will review them. You&apos;ll be able to complete the application for each one
              that&apos;s approved.
            </p>
            <button onClick={() => navigate({ to: "/student" })} className="btn-ink mt-4 text-sm">
              Back to dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10">
            {/* Ranked choices */}
            <section className="border border-charcoal-100 p-5">
              <div className="flex items-baseline justify-between">
                <p className="eyebrow" style={{ margin: 0 }}>Your ranked choices</p>
                <span className={`text-xs ${selected.length >= MIN_CHOICES ? "text-explr-600" : "text-amber-700"}`}>
                  {selected.length} of {MIN_CHOICES}+ chosen
                </span>
              </div>
              {selected.length === 0 ? (
                <p className="mt-3 text-sm text-charcoal-400">
                  Check internships below to add them here, then order them #1 (top) and down.
                </p>
              ) : (
                <ol className="mt-3 space-y-1.5">
                  {selected.map((ref, idx) => (
                    <li key={ref} className="flex items-center gap-3 border border-charcoal-100 px-3 py-2 text-sm">
                      <span className="w-6 shrink-0 text-center font-medium tabular-nums">{idx + 1}</span>
                      <span className="flex-1">{nameByRef(ref)}</span>
                      {existing[ref] && (
                        <span className="text-xs text-charcoal-400">{STATUS_LABEL[existing[ref]] ?? existing[ref]}</span>
                      )}
                      <button type="button" onClick={() => move(ref, -1)} disabled={idx === 0} className="px-1 text-charcoal-400 hover:text-ink disabled:opacity-30" aria-label="Move up">▲</button>
                      <button type="button" onClick={() => move(ref, 1)} disabled={idx === selected.length - 1} className="px-1 text-charcoal-400 hover:text-ink disabled:opacity-30" aria-label="Move down">▼</button>
                      <button type="button" onClick={() => toggle(ref)} className="px-1 text-charcoal-400 hover:text-red-600" aria-label="Remove">✕</button>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <p className="mt-8 text-sm text-charcoal-500">
              Listed by fit — from your interest survey{hollandCode ? <> and Holland code <span className="font-medium text-ink">{hollandCode}</span></> : null}. Check the ones you want.
            </p>
            <ul className="mt-4 grid gap-3">
              {ranked.map((i) => {
                const r = interest[i.slug];
                const tag = r === "yes" ? "Interested" : r === "maybe" ? "Maybe" : r === "no" ? "Not for me" : "Unrated";
                const checked = selected.includes(i.slug);
                const status = existing[i.slug];
                const why = buildWhyFits(i, r, scaleScores, hollandCode);
                return (
                  <li key={i.slug}>
                    <label className={`flex cursor-pointer items-start gap-4 border p-4 transition-colors ${checked ? "border-ink bg-charcoal-50" : "border-charcoal-100 hover:border-charcoal-300"}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(i.slug)} className="mt-1" />
                      <span className="flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="font-medium">{i.emoji} {i.name}</span>
                          <span className="text-xs uppercase tracking-wider text-charcoal-500">
                            {status ? STATUS_LABEL[status] ?? status : tag}
                          </span>
                        </span>
                        <span className="mt-1 block text-sm text-charcoal-500">{i.deliverables}</span>
                        <span className="mt-1 block text-xs text-charcoal-400">
                          Holland fit:{" "}
                          {i.riasec.map((c, idx2) => (
                            <span key={c}>{idx2 > 0 && " · "}<HollandLetter code={c} /></span>
                          ))}
                        </span>
                        {why && (
                          <span className="mt-2 block text-sm italic" style={{ color: "var(--explr)" }}>
                            Why this fits you: {why}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <div className="mt-8 flex items-center justify-between border-t border-charcoal-100 pt-8">
              <p className="text-sm text-charcoal-500">{selected.length} selected · need {MIN_CHOICES}+</p>
              <button type="submit" disabled={submitting || selected.length < MIN_CHOICES} className="btn-ink disabled:opacity-50">
                {submitting ? "Submitting…" : "Request approval to apply"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
