import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Briefcase,
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  Compass,
  PartyPopper,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { SiteFooter } from "@/components/SiteFooter";
import { PortalHeader, type PortalLink } from "@/components/passport";
import { RIASEC, type RIASECCode } from "@/lib/riasec";
import { fetchInternshipCatalog, useInternshipRefs } from "@/lib/internship-refs";
import type { Opportunity } from "@/lib/opportunities";
import { StudentSurveysPanel } from "@/components/StudentSurveysPanel";
import { AssignedAssessmentsPanel } from "@/components/AssignedAssessmentsPanel";
import { FamilyPortal } from "@/components/FamilyPortal";
import { FamilyCodePanel } from "@/components/FamilyCodePanel";
import { SurveyResultsPanel } from "@/components/SurveyResultsPanel";
import { ApplyStatusBanner } from "@/components/ApplyStatusBanner";

const STUDENT_LINKS: PortalLink[] = [
  { label: "My passport", to: "/student" },
  { label: "Opportunities", to: "/opportunities" },
  { label: "Families", to: "/student/pathway", search: { tab: "families" } },
];

export const Route = createFileRoute("/student_/pathway")({
  head: () => ({ meta: [{ title: "Your pathway — EXPLR" }] }),
  validateSearch: (s: Record<string, unknown>): { tab?: "dashboard" | "families" } =>
    s.tab === "families" ? { tab: "families" } : {},
  component: () => (
    <RoleGuard requires="student">
      <StudentDashboard />
    </RoleGuard>
  ),
});

type SessionSummary = {
  session_id: string;
  holland_code: string | null;
  completed_at: string | null;
};

type ApplicationRow = {
  id: string;
  status: string;
  submitted_at: string;
  selected_internship_ids: string[];
  submission_term: string;
};

type PlacementRow = {
  approved_internship_id: string;
  approved_at: string;
};

/** One line of an opportunity description for the "open now" cards. */
function shortDescription(text: string | null, max = 160): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

function StudentDashboard() {
  const { user, loading: authLoading } = useSession();

  const [session, setSession] = useState<SessionSummary | null>(null);
  const [application, setApplication] = useState<ApplicationRow | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [placement, setPlacement] = useState<PlacementRow | null>(null);
  const [openInternships, setOpenInternships] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [reload, setReload] = useState(0);
  const initialTab = Route.useSearch().tab ?? "dashboard";
  const [tab, setTab] = useState<"dashboard" | "families">(initialTab);

  // Resolves the placed internship's name/id from its `opp:<id>` ref.
  const internshipRefs = useInternshipRefs();

  async function withdrawApplication() {
    if (!application) return;
    setWithdrawing(true);
    const { error } = await supabase
      .from("internship_applications")
      .update({ status: "withdrawn", decided_at: new Date().toISOString() })
      .eq("id", application.id);
    setWithdrawing(false);
    if (error) {
      alert(error.message);
      return;
    }
    setReload((r) => r + 1);
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: sess }, { data: app }, { data: stud }, { data: plac }, catalog] =
        await Promise.all([
          supabase
            .from("assessment_sessions")
            .select("session_id, holland_code, completed_at")
            .eq("student_id", user.id)
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("internship_applications")
            .select("id, status, submitted_at, selected_internship_ids, submission_term")
            .eq("student_id", user.id)
            .order("submitted_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("students").select("grade").eq("id", user.id).maybeSingle(),
          supabase
            .from("internship_placements")
            .select("approved_internship_id, approved_at")
            .eq("student_id", user.id)
            .order("approved_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          fetchInternshipCatalog(),
        ]);
      if (cancelled) return;
      setSession((sess as SessionSummary) ?? null);
      setApplication((app as ApplicationRow) ?? null);
      setGrade(stud?.grade ?? null);
      setPlacement((plac as PlacementRow) ?? null);
      setOpenInternships(catalog.rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, reload]);

  if (authLoading || loading) {
    return (
      <main role="status" className="mx-auto max-w-3xl px-6 py-24 text-sm text-ink-500">
        Loading…
      </main>
    );
  }

  const hasResults = !!(session?.completed_at && session.holland_code);
  const hasInProgress = !!(session && !session.completed_at && session.session_id);
  const topCode = hasResults ? (session!.holland_code![0] as RIASECCode) : null;
  const primary = topCode ? RIASEC[topCode] : null;

  // Internship track: grades 8–12 only.
  const canSeeInternshipTrack = grade !== null && grade >= 8 && grade <= 12;
  // An application only counts as "active" while it's live — a withdrawn or
  // declined one frees the student to apply again.
  const activeApplication =
    application && application.status !== "withdrawn" && application.status !== "declined";
  const canWithdraw =
    application && (application.status === "submitted" || application.status === "reviewing");
  const placedName = placement ? internshipRefs.nameFor(placement.approved_internship_id) : null;
  const placedId = placement ? internshipRefs.idFor(placement.approved_internship_id) : null;

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <PortalHeader role="Student" links={STUDENT_LINKS} signedIn />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link
          to="/student"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
        >
          ← My passport
        </Link>
        <p className="eyebrow text-green">Assessments &amp; internships</p>
        <h1 className="display mt-1">Your pathway.</h1>

        {/* Tabs: the student's pathway vs the family-facing explainer. */}
        <div
          role="tablist"
          aria-label="Dashboard sections"
          className="mt-6 flex flex-wrap items-center gap-1 border-b border-line"
        >
          {(
            [
              ["dashboard", "My pathway"],
              ["families", "For families"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`pathway-tab-${id}`}
              aria-selected={tab === id}
              aria-controls="pathway-tabpanel"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  const next = tab === "dashboard" ? "families" : "dashboard";
                  setTab(next);
                  document.getElementById(`pathway-tab-${next}`)?.focus();
                }
              }}
              className={`-mb-px inline-flex min-h-[44px] items-center border-b-2 px-4 text-[15px] transition-colors ${
                tab === id
                  ? "border-ink-900 font-semibold text-ink-900"
                  : "border-transparent text-ink-500 hover:text-ink-900"
              }`}
            >
              {label}
            </button>
          ))}
          <Link
            to="/opportunities"
            className="ml-auto inline-flex min-h-[44px] items-center text-sm text-ink-700 hover:text-green-deep"
          >
            Explore opportunities →
          </Link>
        </div>

        <div role="tabpanel" id="pathway-tabpanel" aria-labelledby={`pathway-tab-${tab}`}>
          {tab === "families" && (
            <>
              <FamilyCodePanel />
              <FamilyPortal studentId={user!.id} grade={grade} />
            </>
          )}

          {tab === "dashboard" && (
            <>
              <ApplyStatusBanner studentId={user!.id} />

              {/* Assigned to you — pending assessments/surveys from an instructor or admin */}
              <section className="mt-10 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card sm:p-6">
                <div className="flex items-center gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
                    <CalendarCheck className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
                  </span>
                  <div>
                    <p className="eyebrow">Assigned to you</p>
                    <h2 className="mt-1 font-display text-xl font-semibold">Things to complete</h2>
                  </div>
                </div>
                <p className="mt-3 max-w-2xl text-ink-700">
                  Assessments and surveys your instructor or an EXPLR admin has asked you to finish.
                </p>
                <AssignedAssessmentsPanel studentId={user!.id} />
              </section>

              {/* Placement banner — top priority when present */}
              {placement && (
                <section className="mt-10 flex flex-wrap items-start gap-4 rounded-[var(--radius-card)] border border-ink-900 bg-ink-900 p-6 text-paper shadow-card">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-mint text-ink-900">
                    <PartyPopper className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow text-mint">You're in</p>
                    <h2 className="mt-2 font-display text-3xl font-bold">
                      Accepted to <span className="text-mint">{placedName}</span>
                    </h2>
                    <p className="mt-2 text-sm text-paper/70">
                      Approved {new Date(placement.approved_at).toLocaleDateString()}.
                    </p>
                    {placedId && (
                      <Link
                        to="/opportunity/$id"
                        params={{ id: placedId }}
                        className="btn-mint mt-5"
                      >
                        View {placedName} →
                      </Link>
                    )}
                  </div>
                </section>
              )}

              {/* Assessment status */}
              <section className="mt-10 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
                      <Compass className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="eyebrow">Assessment</p>
                      {hasResults ? (
                        <p className="mt-2 font-display text-2xl font-bold">
                          Your Holland code is{" "}
                          <span style={{ color: primary!.color }}>{session!.holland_code}</span>
                        </p>
                      ) : hasInProgress ? (
                        <p className="mt-2 font-display text-2xl font-bold text-ink-700">
                          You have an assessment in progress. Pick up where you left off.
                        </p>
                      ) : (
                        <p className="mt-2 font-display text-2xl font-bold text-ink-700">
                          You haven't started the assessment yet.
                        </p>
                      )}
                    </div>
                  </div>
                  {hasResults ? (
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Link
                        to="/assessment/$sessionId/results"
                        params={{ sessionId: session!.session_id }}
                        className="btn-ghost"
                      >
                        View full assessment results
                      </Link>
                      <Link
                        to="/assessment"
                        className="inline-flex min-h-[44px] items-center text-sm text-ink-500 hover:text-ink-900"
                      >
                        Retake assessment
                      </Link>
                    </div>
                  ) : hasInProgress ? (
                    <Link
                      to="/assessment/$sessionId"
                      params={{ sessionId: session!.session_id }}
                      className="btn-ink shrink-0"
                    >
                      Resume assessment →
                    </Link>
                  ) : (
                    <Link to="/assessment" className="btn-ink shrink-0">
                      Take the assessment
                    </Link>
                  )}
                </div>
              </section>

              {/* STEM surveys — admin-assigned pre/post research surveys */}
              <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card sm:p-6">
                <div className="flex items-center gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
                    <ClipboardList className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
                  </span>
                  <h2 className="font-display text-xl font-semibold">STEM surveys</h2>
                </div>
                <p className="mt-3 max-w-2xl text-ink-700">
                  Short research surveys from your camp or internship. They help EXPLR understand
                  what&apos;s working — your answers are never shown next to your name to anyone
                  else.
                </p>
                <StudentSurveysPanel studentId={user!.id} />

                <p className="eyebrow mt-8">Your results</p>
                <p className="mt-2 max-w-2xl text-sm text-ink-700">
                  How your confidence and interest scored across STEM areas — only you (and your
                  family) can see these.
                </p>
                <SurveyResultsPanel studentId={user!.id} />
              </section>

              {/* Application & internships — grades 8–12. */}
              {canSeeInternshipTrack && (
                <>
                  <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card sm:p-6">
                    <div className="flex items-center gap-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
                        <Briefcase className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
                      </span>
                      <h2 className="font-display text-xl font-semibold">Internship application</h2>
                    </div>
                    {activeApplication ? (
                      <div className="mt-4">
                        <p className="flex flex-wrap items-center gap-2 text-lg">
                          Status:{" "}
                          <span className="inline-flex items-center rounded-full bg-mint-tint px-3 py-1 font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-green-deep">
                            {application!.status.replace(/_/g, " ")}
                          </span>
                        </p>
                        <p className="mt-2 text-sm text-ink-700">
                          Submitted {new Date(application!.submitted_at).toLocaleDateString()} for{" "}
                          {application!.submission_term}. You ranked{" "}
                          {application!.selected_internship_ids.length} internship
                          {application!.selected_internship_ids.length === 1 ? "" : "s"}.
                        </p>
                        {canWithdraw && (
                          <div className="mt-5 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={withdrawApplication}
                              disabled={withdrawing}
                              className="btn-ghost disabled:opacity-50"
                            >
                              {withdrawing ? "Withdrawing…" : "Withdraw application"}
                            </button>
                            <span className="text-sm text-ink-500">
                              Take it back to change your picks and apply again.
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4">
                        {application && (
                          <p className="mb-2 text-sm text-ink-700">
                            Your previous application was{" "}
                            <span className="capitalize text-ink-900">{application.status}</span>.
                            You can apply again below.
                          </p>
                        )}
                        <p className="max-w-2xl text-ink-700">
                          {hasResults
                            ? "You're ready to apply. Pick the internships that fit and fill in your digital résumé."
                            : "Finish the main assessment too — your Holland code helps match you to internships that fit."}
                        </p>
                        <Link to="/student/apply" className="btn-ink mt-5">
                          {application ? "Apply again →" : "Apply now →"}
                        </Link>
                      </div>
                    )}
                  </section>

                  <section className="mt-10 border-t border-line pt-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <h2 className="font-display text-2xl font-bold">Internships open now</h2>
                      <Link
                        to="/opportunities"
                        className="inline-flex min-h-[44px] items-center text-sm text-ink-700 hover:text-green-deep"
                      >
                        Browse all opportunities →
                      </Link>
                    </div>
                    <p className="mt-2 max-w-2xl text-ink-700">
                      Approved partner internships you can request through the application above.
                    </p>

                    {openInternships.length === 0 ? (
                      <p className="mt-8 text-sm text-ink-500">
                        No internships are open right now. Check back soon.
                      </p>
                    ) : (
                      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {openInternships.map((o) => (
                          <li key={o.id}>
                            <Link
                              to="/opportunity/$id"
                              params={{ id: o.id }}
                              className="group block h-full rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card transition-colors hover:border-emerald"
                            >
                              <p className="eyebrow text-green">
                                {o.org_name ?? "Partner internship"}
                              </p>
                              <h3 className="mt-2 font-display text-lg font-semibold leading-tight text-ink-900">
                                {o.name ?? "Internship"}
                              </h3>
                              {o.description && (
                                <p className="mt-3 text-sm text-ink-700">
                                  {shortDescription(o.description)}
                                </p>
                              )}
                              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-green-deep group-hover:underline">
                                View details <ChevronRight className="h-4 w-4" aria-hidden />
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );
}
