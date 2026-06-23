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
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
          sb("internship_selections").select("internship_ref, status").eq("student_id", user.id),
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
      const preselect = new Set<string>();
      for (const s of (sels as Array<{ internship_ref: string; status: string }>) ?? []) {
        existingMap[s.internship_ref] = s.status;
        if (s.status !== "denied") preselect.add(s.internship_ref);
      }
      setExisting(existingMap);
      if (opportunity) {
        const slug = oppSlug(opportunity);
        if (orgList.some((i) => i.slug === slug)) preselect.add(slug);
      }
      setSelected(preselect);
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
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;
    // New requests = checked refs that aren't already on file.
    const fresh = [...selected].filter((ref) => !existing[ref]);
    if (fresh.length === 0) {
      setError("Pick at least one internship you haven't already requested.");
      return;
    }
    setSubmitting(true);
    const rows = fresh.map((ref) => ({
      student_id: user.id,
      internship_ref: ref,
      opportunity_id: isOppSlug(ref) ? oppIdFromSlug(ref) : null,
      status: "requested",
    }));
    const { error: insErr } = await sb("internship_selections").upsert(rows, {
      onConflict: "student_id,internship_ref",
      ignoreDuplicates: true,
    });
    setSubmitting(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setDone(true);
  }

  const nameByRef = useMemo(() => {
    const m = new Map(internships.map((i) => [i.slug, i.name]));
    return (ref: string) => m.get(ref) ?? ref;
  }, [internships]);

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
        <h1 className="display mt-3">Choose internships to apply to</h1>
        <p className="mt-4 max-w-2xl text-charcoal-500">
          Pick the internships you&apos;re interested in. An EXPLR admin reviews your picks and
          approves which ones you can apply to. Once approved, you&apos;ll come back to complete
          your application.
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
            <p className="text-sm text-charcoal-500">
              Listed by fit — from your interest survey{hollandCode ? <> and Holland code <span className="font-medium text-ink">{hollandCode}</span></> : null}.
            </p>
            <ul className="mt-6 grid gap-3">
              {ranked.map((i, idx) => {
                const r = interest[i.slug];
                const tag = r === "yes" ? "Interested" : r === "maybe" ? "Maybe" : r === "no" ? "Not for me" : "Unrated";
                const checked = selected.has(i.slug);
                const status = existing[i.slug];
                const why = buildWhyFits(i, r, scaleScores, hollandCode);
                return (
                  <li key={i.slug}>
                    <label className={`flex cursor-pointer items-start gap-4 border p-4 transition-colors ${checked ? "border-ink bg-charcoal-50" : "border-charcoal-100 hover:border-charcoal-300"}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(i.slug)} className="mt-1" />
                      <span className="flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="font-medium">
                            <span className="text-charcoal-400 mr-2">{idx + 1}.</span>
                            {i.emoji} {i.name}
                          </span>
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
              <p className="text-sm text-charcoal-500">{selected.size} selected</p>
              <button type="submit" disabled={submitting} className="btn-ink disabled:opacity-50">
                {submitting ? "Submitting…" : "Request approval to apply"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
