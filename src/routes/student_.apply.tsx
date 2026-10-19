import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { SiteFooter } from "@/components/SiteFooter";
import { PortalHeader, type PortalLink } from "@/components/passport";
import {
  AboutStep,
  DemographicsStep,
  LogisticsStep,
  MatchesStep,
  PlansStep,
  StoryStep,
  SupportStep,
  SurveyStep,
  validateMatches,
  type MatchCard,
} from "@/components/hs-application/GeneralSteps";
import { ReviewStep } from "@/components/hs-application/ReviewStep";
import { ApplicationHub } from "@/components/hs-application/ApplicationHub";
import {
  ACTIVITY_ITEMS,
  ENVIRONMENT_DIMS,
  EXPERIENCE_ITEMS,
  FORCED_PAIRS,
  TOP_MATCHES,
} from "@/lib/hs-application/content";
import {
  applicantFrom,
  isDemoEmail,
  loadItemResponses,
  loadOpenListings,
  loadOrCreateGeneral,
  loadThisYearsAssessment,
  loadCurrentSeason,
  saveGeneral,
  type AssessmentSnapshot,
  type ListingRow,
  type Season,
} from "@/lib/hs-application/data";
import { listingFromOpportunity } from "@/lib/hs-application/listings";
import { rankListings } from "@/lib/hs-application/match";
import { recordApplicationStatus } from "@/lib/hs-application/notify.functions";
import type { Demographics, GeneralApplication } from "@/lib/hs-application/types";
import {
  GENERAL_STEPS,
  validateCoreStep,
  validateExtras,
  type StepErrors,
} from "@/lib/hs-application/validate";

const STUDENT_LINKS: PortalLink[] = [
  { label: "My passport", to: "/student" },
  { label: "Opportunities", to: "/opportunities" },
  { label: "Careers", to: "/careers" },
  { label: "Families", to: "/student/pathway", search: { tab: "families" } },
];

export const Route = createFileRoute("/student_/apply")({
  validateSearch: (s: Record<string, unknown>): { opportunity?: string } => ({
    opportunity: typeof s.opportunity === "string" ? s.opportunity : undefined,
  }),
  head: () => ({ meta: [{ title: "Internship application — EXPLR" }] }),
  component: () => (
    <RoleGuard requires="student">
      <ApplyPage />
    </RoleGuard>
  ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

const fmt = (d: string | null) =>
  d
    ? new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric" })
    : "";

function ApplyPage() {
  const { user, loading: authLoading } = useSession();
  const { opportunity } = Route.useSearch();
  const [season, setSeason] = useState<Season | null>(null);
  const [app, setApp] = useState<GeneralApplication | null>(null);
  const [assessment, setAssessment] = useState<AssessmentSnapshot | null>(null);
  const [itemResponses, setItemResponses] = useState<Record<string, number>>({});
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [demographics, setDemographics] = useState<Demographics>({});
  const [errors, setErrors] = useState<StepErrors>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isDemo = isDemoEmail(user?.email);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await loadCurrentSeason();
        if (!s) throw new Error("Applications aren't open yet. Check back soon.");
        const [a, asmt, ls] = await Promise.all([
          loadOrCreateGeneral(user.id, user.email ?? null, s),
          loadThisYearsAssessment(user.id),
          loadOpenListings(isDemoEmail(user.email)),
        ]);
        const items = await loadItemResponses(asmt?.session_id ?? null);
        const { data: demo } = await sb("hs_demographics")
          .select("data")
          .eq("application_id", a.id)
          .maybeSingle();
        if (cancelled) return;
        setSeason(s);
        setApp(a);
        setAssessment(asmt);
        setItemResponses(items);
        setListings(ls);
        setDemographics((demo?.data as Demographics) ?? {});
        if (asmt && a.status === "draft" && a.assessment_session_id !== asmt.session_id)
          await saveGeneral(a.id, { assessment_session_id: asmt.session_id });
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Ranked matches for the General track (age is the only hard filter).
  const allCards: MatchCard[] = useMemo(() => {
    if (!app) return [];
    const applicant = applicantFrom(app, assessment, itemResponses);
    const byRef = new Map(listings.map((l) => [`opp:${l.id}`, l]));
    return rankListings(
      applicant,
      listings.map((l) => listingFromOpportunity(l, l.version?.builder)),
    ).map((m) => {
      const l = byRef.get(m.ref)!;
      return {
        ref: m.ref,
        name: l.version?.builder.profile.title || l.name || "Internship",
        org: l.org_name ?? "",
        blurb: l.version?.builder.profile.description || l.description || "",
        match: m,
        questionCount: l.version?.builder.questions.length ?? 0,
      };
    });
  }, [app, assessment, itemResponses, listings]);
  const topCards = useMemo(() => {
    if (!app) return [];
    // Keep the matches the student already reacted to stable between visits.
    if (app.choices.shown.length)
      return app.choices.shown
        .map((r) => allCards.find((c) => c.ref === r))
        .filter((c): c is MatchCard => !!c);
    return allCards.filter((c) => c.match.eligible).slice(0, TOP_MATCHES);
  }, [allCards, app]);

  const update = useCallback((patch: Partial<GeneralApplication>) => {
    setApp((a) => (a ? { ...a, ...patch } : a));
  }, []);

  async function persist(next: GeneralApplication, extra?: Partial<GeneralApplication>) {
    setSaving("saving");
    const err = await saveGeneral(next.id, {
      core: next.core,
      extras: next.extras,
      choices: next.choices,
      step: next.step,
      ...extra,
    });
    setSaving(err ? "error" : "saved");
    if (err) setErrors({ save: err });
    return !err;
  }

  async function saveDemographics(d: Demographics) {
    if (!app || !user) return;
    await sb("hs_demographics").upsert({ application_id: app.id, student_id: user.id, data: d });
  }

  function stepErrors(stepIdx: number, a: GeneralApplication): StepErrors {
    const key = GENERAL_STEPS[stepIdx].key;
    if (key === "survey") {
      const e = validateExtras(a.extras, {
        activities: ACTIVITY_ITEMS.length,
        pairs: FORCED_PAIRS.length,
        environment: ENVIRONMENT_DIMS.length,
        experience: EXPERIENCE_ITEMS.length,
      });
      if (!assessment) e.assessment = "Take the interest survey before you go on.";
      return e;
    }
    if (key === "matches")
      return validateMatches(
        a.choices,
        topCards.map((c) => c.ref),
      );
    return validateCoreStep(key, a.core);
  }

  async function go(delta: number) {
    if (!app) return;
    const here = app.step;
    if (delta > 0) {
      const e = stepErrors(here, app);
      setErrors(e);
      if (Object.keys(e).length) {
        requestAnimationFrame(() =>
          document.querySelector<HTMLElement>("[aria-invalid='true'], [role='alert']")?.focus?.(),
        );
        return;
      }
    } else setErrors({});
    let next = { ...app, step: Math.max(0, Math.min(GENERAL_STEPS.length - 1, here + delta)) };
    // Freeze which matches were shown once the student reaches that step.
    if (GENERAL_STEPS[next.step].key === "matches" && next.choices.shown.length === 0)
      next = {
        ...next,
        choices: {
          ...next.choices,
          shown: allCards
            .filter((c) => c.match.eligible)
            .slice(0, TOP_MATCHES)
            .map((c) => c.ref),
        },
      };
    if (GENERAL_STEPS[here].key === "demographics") await saveDemographics(demographics);
    setApp(next);
    await persist(next);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  async function submit() {
    if (!app || !user) return;
    // Re-check every step before submitting.
    for (let i = 0; i < GENERAL_STEPS.length - 1; i++) {
      const e = stepErrors(i, app);
      if (Object.keys(e).length) {
        const next = { ...app, step: i };
        setApp(next);
        setErrors(e);
        await persist(next);
        return;
      }
    }
    setSubmitting(true);
    const ok = await persist(app);
    if (!ok) {
      setSubmitting(false);
      return;
    }
    const { error } = await sb("hs_general_applications")
      .update({ status: "received" })
      .eq("id", app.id);
    if (error) {
      setErrors({ save: error.message });
      setSubmitting(false);
      return;
    }
    try {
      await recordApplicationStatus({
        data: { generalId: app.id, status: "received", origin: window.location.origin },
      });
    } catch {
      /* the application is saved even if the email fails */
    }
    setApp({ ...app, status: "received", submitted_at: new Date().toISOString() });
    setSubmitting(false);
    window.scrollTo({ top: 0 });
  }

  if (authLoading || (!app && !loadError)) {
    return (
      <main role="status" className="mx-auto max-w-3xl px-6 py-24 text-sm text-ink-500">
        Loading your application…
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <PortalHeader role="Student" links={STUDENT_LINKS} signedIn />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          to="/student"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
        >
          ← My passport
        </Link>
        {loadError && (
          <p role="alert" className="mt-6 rounded-[var(--radius-card)] bg-gold-tint p-4 text-sm">
            {loadError}
          </p>
        )}
        {app && season && app.status !== "draft" && (
          <ApplicationHub
            app={app}
            season={season}
            cards={allCards}
            listings={listings}
            highlight={opportunity ?? null}
          />
        )}
        {app && season && app.status === "draft" && (
          <>
            <p className="eyebrow mt-4 text-green">
              {season.name} internships · general application
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="mt-1 font-display text-3xl font-bold leading-tight outline-none sm:text-4xl"
            >
              {GENERAL_STEPS[app.step].label}
            </h1>
            {app.step === 0 && (
              <p className="lead mt-3">
                Fill this out once. After you submit, you can apply to any internship by answering
                just that partner's questions. Your answers save as you go, so you can stop and come
                back.
              </p>
            )}
            {opportunity && app.step === 0 && (
              <p className="mt-3 rounded-[var(--radius-control)] bg-mint-tint p-3 text-sm">
                Finish this general application first. Then you'll answer the questions for the
                internship you picked.
              </p>
            )}
            <StepProgress step={app.step} />

            <div className="mt-6 grid gap-6">
              {GENERAL_STEPS[app.step].key === "about" && (
                <AboutStep
                  core={app.core}
                  set={(p) => update({ core: { ...app.core, ...p } })}
                  errors={errors}
                />
              )}
              {GENERAL_STEPS[app.step].key === "logistics" && (
                <LogisticsStep
                  core={app.core}
                  set={(p) => update({ core: { ...app.core, ...p } })}
                  errors={errors}
                  programDates={
                    season.program_start && season.program_end
                      ? `${fmt(season.program_start)} to ${fmt(season.program_end)}`
                      : ""
                  }
                />
              )}
              {GENERAL_STEPS[app.step].key === "story" && (
                <StoryStep
                  core={app.core}
                  set={(p) => update({ core: { ...app.core, ...p } })}
                  errors={errors}
                />
              )}
              {GENERAL_STEPS[app.step].key === "plans" && (
                <PlansStep
                  core={app.core}
                  set={(p) => update({ core: { ...app.core, ...p } })}
                  errors={errors}
                />
              )}
              {GENERAL_STEPS[app.step].key === "support" && (
                <SupportStep
                  core={app.core}
                  set={(p) => update({ core: { ...app.core, ...p } })}
                  errors={errors}
                />
              )}
              {GENERAL_STEPS[app.step].key === "demographics" && (
                <DemographicsStep value={demographics} onChange={setDemographics} />
              )}
              {GENERAL_STEPS[app.step].key === "survey" && (
                <SurveyStep
                  extras={app.extras}
                  setExtras={(x) => update({ extras: x })}
                  assessment={assessment}
                  errors={errors}
                />
              )}
              {GENERAL_STEPS[app.step].key === "matches" && (
                <MatchesStep
                  cards={topCards}
                  allCards={allCards}
                  choices={app.choices}
                  setChoices={(c) => update({ choices: c })}
                  errors={errors}
                />
              )}
              {GENERAL_STEPS[app.step].key === "review" && (
                <ReviewStep
                  app={app}
                  cards={allCards}
                  assessment={assessment}
                  onEdit={(i) => {
                    const n = { ...app, step: i };
                    setApp(n);
                    void persist(n);
                  }}
                />
              )}
            </div>

            {errors.save && (
              <p role="alert" className="mt-4 text-sm text-red-700">
                Couldn't save: {errors.save}
              </p>
            )}
            {Object.keys(errors).length > 0 && !errors.save && (
              <p role="alert" className="mt-4 text-sm text-red-700">
                A few answers need attention before you go on.
              </p>
            )}

            <div className="sticky bottom-0 mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper py-4">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => go(-1)}
                disabled={app.step === 0}
              >
                Back
              </button>
              <span aria-live="polite" className="text-xs text-ink-500">
                {saving === "saving" ? "Saving…" : saving === "saved" ? "Saved" : ""}
              </span>
              {GENERAL_STEPS[app.step].key === "review" ? (
                <button type="button" className="btn-ink" onClick={submit} disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit my application"}
                </button>
              ) : (
                <button type="button" className="btn-ink" onClick={() => go(1)}>
                  {GENERAL_STEPS[app.step].key === "demographics"
                    ? "Save or skip →"
                    : "Save and continue →"}
                </button>
              )}
            </div>
          </>
        )}
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );
}

function StepProgress({ step }: { step: number }) {
  const total = GENERAL_STEPS.length;
  return (
    <div className="mt-5">
      <p className="text-xs font-medium text-ink-700">
        Step {step + 1} of {total}
      </p>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-paper-sunken"
        role="progressbar"
        aria-label="Application progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step + 1}
      >
        <div
          className="h-full rounded-full bg-green-deep transition-all"
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
