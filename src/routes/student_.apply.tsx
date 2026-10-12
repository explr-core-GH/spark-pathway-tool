import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { SiteFooter } from "@/components/SiteFooter";
import { PortalHeader, type PortalLink } from "@/components/passport";
import { ArrowDown, ArrowUp, ListOrdered, ShieldCheck, X } from "lucide-react";
import { HollandLetter, buildWhyFits, type ScaleScores } from "@/lib/holland-fit";
import {
  oppSlug,
  isOppSlug,
  oppIdFromSlug,
  type Internship,
  type Opportunity,
} from "@/lib/opportunities";
import { fetchInternshipCatalog } from "@/lib/internship-refs";
import type { RIASECCode } from "@/lib/riasec";
import { acknowledgmentsFor, targetFromOpportunity } from "@/lib/matching/placement";

const STUDENT_LINKS: PortalLink[] = [
  { label: "My passport", to: "/student" },
  { label: "Opportunities", to: "/opportunities" },
  { label: "Families", to: "/student/pathway", search: { tab: "families" } },
];

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
  const [hollandCode, setHollandCode] = useState<string | null>(null);
  const [scaleScores, setScaleScores] = useState<ScaleScores>({});
  // Ordered = rank order (index 0 = #1 choice).
  const [selected, setSelected] = useState<string[]>([]);
  const [existing, setExisting] = useState<Record<string, string>>({}); // ref → status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [hasProfile, setHasProfile] = useState(true);
  const [oppRows, setOppRows] = useState<Opportunity[]>([]);
  // ref → acknowledgments the student has accepted for that listing.
  const [acks, setAcks] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: sess }, catalog, { data: sels }] = await Promise.all([
        supabase
          .from("assessment_sessions")
          .select("holland_code, scale_scores, completed_at")
          .eq("student_id", user.id)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        fetchInternshipCatalog(),
        sb("internship_selections")
          .select("internship_ref, status, rank, acknowledgments")
          .eq("student_id", user.id),
      ]);
      const { data: prof } = await sb("internship_profiles")
        .select("student_id")
        .eq("student_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      // Every internship is an approved partner opportunity.
      const orgList: Internship[] = catalog.cards;
      setOppRows(catalog.rows);
      setHasProfile(!!prof);
      const ackMap: Record<string, string[]> = {};
      for (const s of (sels as Array<{
        internship_ref: string;
        acknowledgments?: string[] | null;
      }>) ?? []) {
        if (s.acknowledgments?.length) ackMap[s.internship_ref] = s.acknowledgments;
      }
      setAcks(ackMap);
      setInternships(orgList);
      setHollandCode(sess?.holland_code ?? null);
      setScaleScores((sess?.scale_scores as ScaleScores) ?? {});

      const existingMap: Record<string, string> = {};
      const existingRows = (
        (sels as Array<{ internship_ref: string; status: string; rank: number | null }>) ?? []
      )
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
    const riasecScore = (i: Internship) => {
      if (Object.keys(scaleScores).length > 0)
        return i.riasec.reduce((s: number, c: RIASECCode) => s + (scaleScores[c] ?? 0), 0);
      if (hollandCode) {
        const codes = hollandCode.split("");
        return i.riasec.reduce(
          (s: number, c: RIASECCode) => s + (codes.includes(c) ? 3 - codes.indexOf(c) : 0),
          0,
        );
      }
      return 0;
    };
    return [...internships].sort((a, b) => riasecScore(b) - riasecScore(a));
  }, [internships, scaleScores, hollandCode]);

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

  // Requirements a student must acknowledge for a partner listing.
  const requiredAcks = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const o of oppRows)
      m.set(oppSlug(o.id), acknowledgmentsFor(targetFromOpportunity(o as never)));
    return (ref: string) => m.get(ref) ?? [];
  }, [oppRows]);
  function toggleAck(ref: string, a: string) {
    setAcks((prev) => {
      const cur = prev[ref] ?? [];
      return { ...prev, [ref]: cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a] };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;
    if (selected.length < MIN_CHOICES) {
      setError(`Choose and rank at least ${MIN_CHOICES} internships.`);
      return;
    }
    if (!hasProfile) {
      setError("Fill in your internship profile first.");
      return;
    }
    const unacked = selected.filter((ref) =>
      requiredAcks(ref).some((a) => !(acks[ref] ?? []).includes(a)),
    );
    if (unacked.length) {
      setError(
        `Check every requirement for ${unacked.map(nameByRef).join(", ")} before requesting.`,
      );
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
      acknowledgments: acks[ref] ?? [],
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
          .update({ rank: selected.indexOf(ref) + 1, acknowledgments: acks[ref] ?? [] })
          .eq("student_id", user.id)
          .eq("internship_ref", ref);
      }
    }
    setSubmitting(false);
    setDone(true);
  }

  if (authLoading || loading) {
    return <main className="mx-auto max-w-3xl px-6 py-24 text-sm text-ink-500">Loading…</main>;
  }

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <PortalHeader role="Student" links={STUDENT_LINKS} signedIn />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link
          to="/student"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
        >
          ← My passport
        </Link>
        <p className="eyebrow text-green">Internships · step 1 of 2</p>
        <h1 className="display mt-1">Choose &amp; rank internships.</h1>
        <p className="lead mt-4 max-w-2xl">
          Pick at least <span className="font-medium text-ink-900">{MIN_CHOICES}</span> internships
          you&apos;re interested in and put them in order of preference. An EXPLR admin reviews your
          picks and approves which ones you can apply to — then you complete the application.
        </p>

        {Object.keys(existing).length > 0 && (
          <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card">
            <p className="eyebrow">Your requests so far</p>
            <ul className="mt-3 divide-y divide-line text-sm">
              {Object.entries(existing).map(([ref, status]) => (
                <li key={ref} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-medium">{nameByRef(ref)}</span>
                  <span className="inline-flex items-center rounded-full bg-paper-sunken px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-700">
                    {STATUS_LABEL[status] ?? status}
                  </span>
                </li>
              ))}
            </ul>
            {Object.values(existing).some((s) => s === "approved") && (
              <Link to="/student/apply-complete" className="btn-ink mt-4">
                Complete approved applications →
              </Link>
            )}
          </div>
        )}

        {!hasProfile && !done && (
          <div className="mt-8 rounded-[var(--radius-card)] bg-gold-tint p-5 text-sm text-ink-900">
            <p className="eyebrow text-gold-deep">One thing first</p>
            <p className="mt-1 font-display text-lg font-semibold">Your internship profile.</p>
            <p className="mt-1 text-ink-700">
              Coursework, what you like, where you're headed, when you're free, and how you'd get
              there. It's what EXPLR uses to match you, and you fill it in once.
            </p>
            <Link
              to="/student/profile"
              search={{ next: "/student/apply" }}
              className="btn-ink mt-4"
            >
              Fill in my profile
            </Link>
          </div>
        )}

        {done ? (
          <div className="mt-10 rounded-[var(--radius-card)] border border-mint-soft bg-mint-tint p-6">
            <p className="font-display text-xl font-semibold text-green-deep">
              Requests submitted.
            </p>
            <p className="mt-1 text-sm text-ink-700">
              An admin will review them. You&apos;ll be able to complete the application for each
              one that&apos;s approved.
            </p>
            <button onClick={() => navigate({ to: "/student" })} className="btn-ink mt-4">
              Back to my passport
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10">
            {/* Ranked choices */}
            <section className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
                    <ListOrdered className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
                  </span>
                  <h2 className="font-display text-xl font-semibold">Your ranked choices</h2>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] ${
                    selected.length >= MIN_CHOICES
                      ? "bg-mint-tint text-green-deep"
                      : "bg-gold-tint text-gold-deep"
                  }`}
                >
                  {selected.length} of {MIN_CHOICES}+ chosen
                </span>
              </div>
              {selected.length === 0 ? (
                <p className="mt-3 text-sm text-ink-700">
                  Check internships below to add them here, then order them #1 (top) and down.
                </p>
              ) : (
                <ol className="mt-4 space-y-2">
                  {selected.map((ref, idx) => (
                    <li
                      key={ref}
                      className="flex flex-wrap items-center gap-2 rounded-[var(--radius-control)] border border-line bg-paper px-3 py-2 text-sm sm:gap-3"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-900 font-mono text-xs font-medium text-paper tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="min-w-0 flex-1 font-medium">{nameByRef(ref)}</span>
                      {existing[ref] && (
                        <span className="inline-flex items-center rounded-full bg-paper-sunken px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-700">
                          {STATUS_LABEL[existing[ref]] ?? existing[ref]}
                        </span>
                      )}
                      <span className="flex items-center">
                        <button
                          type="button"
                          onClick={() => move(ref, -1)}
                          disabled={idx === 0}
                          className="grid h-11 w-11 place-items-center rounded-[var(--radius-control)] text-ink-500 hover:bg-paper-sunken hover:text-ink-900 disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(ref, 1)}
                          disabled={idx === selected.length - 1}
                          className="grid h-11 w-11 place-items-center rounded-[var(--radius-control)] text-ink-500 hover:bg-paper-sunken hover:text-ink-900 disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggle(ref)}
                          className="grid h-11 w-11 place-items-center rounded-[var(--radius-control)] text-ink-500 hover:bg-paper-sunken hover:text-red-700"
                          aria-label="Remove"
                        >
                          <X className="h-4 w-4" aria-hidden />
                        </button>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <p className="mt-8 text-sm text-ink-700">
              {hollandCode ? (
                <>
                  Listed by fit with your Holland code{" "}
                  <span className="font-medium text-ink-900">{hollandCode}</span>.
                </>
              ) : (
                <>Approved partner internships.</>
              )}{" "}
              Check the ones you want.
            </p>
            <ul className="mt-4 grid gap-3">
              {ranked.length === 0 && (
                <li className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-4 text-sm text-ink-700">
                  No partner internships are open right now. Check back soon.
                </li>
              )}
              {ranked.map((i) => {
                const checked = selected.includes(i.slug);
                const status = existing[i.slug];
                const why = buildWhyFits(i, undefined, scaleScores, hollandCode);
                return (
                  <li key={i.slug}>
                    <label
                      className={`flex cursor-pointer items-start gap-4 rounded-[var(--radius-card)] border bg-paper-raised p-4 transition-colors ${checked ? "border-emerald bg-mint-tint/40" : "border-line hover:border-emerald"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(i.slug)}
                        className="mt-1 h-5 w-5 shrink-0 accent-green-deep"
                      />
                      <span className="flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="font-medium">
                            {i.name}
                            {i.outsidePartners ? (
                              <span className="ml-2 text-xs font-normal text-ink-500">
                                {i.outsidePartners}
                              </span>
                            ) : null}
                          </span>
                          {status && (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-paper-sunken px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-700">
                              {STATUS_LABEL[status] ?? status}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-sm text-ink-700">{i.deliverables}</span>
                        <span className="mt-1 block text-xs text-ink-500">
                          Holland fit:{" "}
                          {i.riasec.map((c: RIASECCode, idx2: number) => (
                            <span key={c}>
                              {idx2 > 0 && " · "}
                              <HollandLetter code={c} />
                            </span>
                          ))}
                        </span>
                        {why && (
                          <span className="mt-2 block text-sm text-green">
                            Why this fits you: {why}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            {selected.some((ref) => requiredAcks(ref).length > 0) && (
              <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
                    <ShieldCheck className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
                  </span>
                  <h2 className="font-display text-xl font-semibold">
                    Before you request: the fine print
                  </h2>
                </div>
                <p className="mt-3 text-sm text-ink-700">
                  These listings have special requirements. Check each one to confirm it works for
                  you. We won't place you somewhere that doesn't.
                </p>
                {selected
                  .filter((ref) => requiredAcks(ref).length > 0)
                  .map((ref) => (
                    <div key={ref} className="mt-4">
                      <p className="text-sm font-medium">{nameByRef(ref)}</p>
                      <ul className="mt-1 space-y-1">
                        {requiredAcks(ref).map((a) => (
                          <li key={a}>
                            <label className="flex min-h-[44px] items-start gap-2 py-2 text-sm text-ink-700">
                              <input
                                type="checkbox"
                                className="mt-1 h-5 w-5 shrink-0 accent-green-deep"
                                checked={(acks[ref] ?? []).includes(a)}
                                onChange={() => toggleAck(ref, a)}
                              />
                              <span>{a}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </section>
            )}

            {error && (
              <p role="alert" className="mt-4 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
              <p className="text-sm text-ink-700">
                {selected.length} selected · need {MIN_CHOICES}+
              </p>
              <button
                type="submit"
                disabled={submitting || selected.length < MIN_CHOICES}
                className="btn-ink disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Request approval to apply"}
              </button>
            </div>
          </form>
        )}
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );
}
