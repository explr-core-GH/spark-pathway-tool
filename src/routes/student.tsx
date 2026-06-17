import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { INTERNSHIPS } from "@/lib/internships-catalog";
import { RIASEC, type RIASECCode } from "@/lib/riasec";
import { StemActivitiesMarquee } from "@/components/StemActivitiesMarquee";
import { StudentSurveysPanel } from "@/components/StudentSurveysPanel";
import { AssignedAssessmentsPanel } from "@/components/AssignedAssessmentsPanel";
import { FamilyPortal } from "@/components/FamilyPortal";
import { SurveyResultsPanel } from "@/components/SurveyResultsPanel";
import { useStudentAssignments } from "@/lib/use-assignments";

export const Route = createFileRoute("/student")({
  head: () => ({ meta: [{ title: "Your dashboard — EXPLR" }] }),
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

function StudentDashboard() {
  const { user, loading: authLoading } = useSession();

  const [session, setSession] = useState<SessionSummary | null>(null);
  const [application, setApplication] = useState<ApplicationRow | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [interestDone, setInterestDone] = useState(false);
  const [hiddenSlugs, setHiddenSlugs] = useState<Set<string>>(new Set());
  const [placement, setPlacement] = useState<PlacementRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [reload, setReload] = useState(0);
  const [tab, setTab] = useState<"dashboard" | "families">("dashboard");

  // Shared assignment resolver — also tells us whether this student was
  // assigned the internship survey (which unlocks the internship track even
  // for students outside grades 8–12).
  const { hasInternshipAssignment } = useStudentAssignments(user?.id ?? null);

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
      const [{ data: sess }, { data: app }, { data: stud }, { data: comp }, { data: vis }, { data: plac }] =
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
            .from("internship_interest_completions")
            .select("completed_at")
            .eq("student_id", user.id)
            .maybeSingle(),
          supabase.from("internship_visibility").select("internship_slug, visible"),
          supabase
            .from("internship_placements")
            .select("approved_internship_id, approved_at")
            .eq("student_id", user.id)
            .order("approved_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
      if (cancelled) return;
      setSession((sess as SessionSummary) ?? null);
      setApplication((app as ApplicationRow) ?? null);
      setGrade(stud?.grade ?? null);
      setInterestDone(!!comp?.completed_at);
      setHiddenSlugs(
        new Set((vis ?? []).filter((r) => r.visible === false).map((r) => r.internship_slug)),
      );
      setPlacement((plac as PlacementRow) ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, reload]);

  if (authLoading || loading) {
    return <main className="mx-auto max-w-3xl px-6 py-24 text-sm text-charcoal-400">Loading…</main>;
  }

  const hasResults = !!(session?.completed_at && session.holland_code);
  const hasInProgress = !!(session && !session.completed_at && session.session_id);
  const topCode = hasResults ? (session!.holland_code![0] as RIASECCode) : null;
  const primary = topCode ? RIASEC[topCode] : null;

  // Internship track: grades 8-12, OR any student specifically assigned the
  // internship interest survey. The internship LISTING additionally requires
  // finishing that survey.
  const eligibleByGrade = grade !== null && grade >= 8 && grade <= 12;
  const canSeeInternshipTrack = eligibleByGrade || hasInternshipAssignment;
  const canSeeInternships = canSeeInternshipTrack && interestDone;
  // An application only counts as "active" while it's live — a withdrawn or
  // declined one frees the student to apply again.
  const activeApplication =
    application && application.status !== "withdrawn" && application.status !== "declined";
  const canWithdraw =
    application && (application.status === "submitted" || application.status === "reviewing");
  const visibleInternships = INTERNSHIPS.filter((i) => !hiddenSlugs.has(i.slug));
  const placedInternship = placement
    ? INTERNSHIPS.find((i) => i.slug === placement.approved_internship_id)
    : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-xl font-medium tracking-tight">
            EXPLR <span style={{ color: "var(--explr)" }}>Pathways</span>
          </Link>
          <Link to="/sign-out" className="text-sm text-charcoal-500 hover:text-ink">Sign out</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <p className="eyebrow">Student dashboard</p>
        <h1 className="display mt-3">Your pathway</h1>

        {/* Tabs: the student's pathway vs the family-facing explainer. */}
        <div
          role="tablist"
          aria-label="Dashboard sections"
          className="mt-6 flex gap-1 border-b border-charcoal-100"
        >
          {([
            ["dashboard", "My pathway"],
            ["families", "For families"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className="border-b-2 px-4 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor: tab === id ? "var(--ink)" : "transparent",
                color: tab === id ? "var(--ink)" : "var(--color-charcoal-400)",
                fontWeight: tab === id ? 500 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "families" && <FamilyPortal studentId={user!.id} grade={grade} />}

        {tab === "dashboard" && (
        <>
        {/* Assigned to you — FIRST thing on the dashboard so nothing assigned
            gets missed. Resolution + scheduling window live in the panel. */}
        <section className="mt-10">
          <p className="eyebrow">Assigned to you</p>
          <p className="mt-3 text-charcoal-500 max-w-2xl">
            Assessments and surveys your educator or an EXPLR admin has asked
            you to complete.
          </p>
          <AssignedAssessmentsPanel studentId={user!.id} />
        </section>

        {/* Placement banner — top priority when present */}
        {placedInternship && (
          <section className="mt-10 border border-ink bg-ink p-6 text-canvas">
            <p className="eyebrow" style={{ color: "var(--explr)" }}>You're in</p>
            <h2 className="mt-2 text-3xl font-light">
              Accepted to <span className="font-medium">{placedInternship.name}</span> {placedInternship.emoji}
            </h2>
            <p className="mt-2 text-sm opacity-70">
              Approved {new Date(placement!.approved_at).toLocaleDateString()}.
            </p>
            <a
              href={placedInternship.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-block border border-canvas px-5 py-2 text-sm hover:bg-canvas hover:text-ink transition-colors"
            >
              Open {placedInternship.name} site →
            </a>
          </section>
        )}

        {/* Assessment status */}
        <section className="mt-12 border-t border-charcoal-100 pt-10">
          <div className="flex items-baseline justify-between gap-6">
            <div>
              <p className="eyebrow">Assessment</p>
              {hasResults ? (
                <p className="mt-3 text-2xl font-light">
                  Your Holland code is{" "}
                  <span style={{ color: primary!.color }} className="font-medium">
                    {session!.holland_code}
                  </span>
                </p>
              ) : hasInProgress ? (
                <p className="mt-3 text-2xl font-light text-charcoal-500">
                  You have an assessment in progress. Pick up where you left off.
                </p>
              ) : (
                <p className="mt-3 text-2xl font-light text-charcoal-500">
                  You haven't started the assessment yet.
                </p>
              )}
            </div>
            {hasResults ? (
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Link
                  to="/assessment/$sessionId/results"
                  params={{ sessionId: session!.session_id }}
                  className="btn-ghost"
                >
                  View full results
                </Link>
                <Link to="/assessment" className="text-xs text-charcoal-500 hover:text-ink">
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
              <Link to="/assessment" className="btn-ink shrink-0">Take the assessment</Link>
            )}
          </div>
        </section>

        {/* STEM Lab activities — animated scroll filtered by Holland code */}
        <section className="mt-12 border-t border-charcoal-100 pt-10">
          <div className="flex items-baseline justify-between gap-6">
            <div>
              <p className="eyebrow">STEM Lab activities</p>
              <p className="mt-3 text-2xl font-light text-charcoal-500">
                {hasResults
                  ? <>Hands-on activities ranked by your <span style={{ color: primary!.color }} className="font-medium">{session!.holland_code}</span> code.</>
                  : "Explore hands-on activities across every interest area. Take the assessment to see which fit you best."}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <StemActivitiesMarquee hollandCode={session?.holland_code ?? null} />
          </div>
        </section>

        {/* Aptitude battery */}
        <section className="mt-12 border-t border-charcoal-100 pt-10">
          <div className="flex items-baseline justify-between gap-6">
            <div>
              <p className="eyebrow">Aptitude battery</p>
              <p className="mt-3 text-2xl font-light text-charcoal-500">
                A short {grade !== null && grade >= 8 ? "high-school" : "middle-school"} battery
                covering numeric, pattern, and verbal reasoning.
              </p>
            </div>
            <Link
              to="/demo/aptitude/$band/take"
              params={{ band: grade !== null && grade >= 8 ? "HS" : "MS" }}
              className="btn-ink shrink-0"
            >
              Take aptitude battery
            </Link>
          </div>
        </section>

        {/* STEM surveys — admin-assigned pre/post research surveys */}
        <section className="mt-12 border-t border-charcoal-100 pt-10">
          <p className="eyebrow">STEM surveys</p>
          <p className="mt-3 text-charcoal-500 max-w-2xl">
            Short research surveys from your camp or internship. They help
            EXPLR understand what&apos;s working — your answers are never
            shown next to your name to anyone else.
          </p>
          <StudentSurveysPanel studentId={user!.id} />

          <p className="eyebrow mt-8">Your results</p>
          <p className="mt-2 text-sm text-charcoal-500 max-w-2xl">
            How your confidence and interest scored across STEM areas — only you (and your family)
            can see these.
          </p>
          <SurveyResultsPanel studentId={user!.id} />
        </section>

        {/* Application & internships — grades 8-12, or anyone assigned the
            internship interest survey. */}
        {canSeeInternshipTrack && (
          <>
            <section className="mt-12 border-t border-charcoal-100 pt-10">
              <p className="eyebrow">Internship application</p>
              {activeApplication ? (
                <div className="mt-4">
                  <p className="text-2xl font-light">
                    Status:{" "}
                    <span className="text-ink font-medium capitalize">
                      {application!.status.replace(/_/g, " ")}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-charcoal-500">
                    Submitted {new Date(application!.submitted_at).toLocaleDateString()} for{" "}
                    {application!.submission_term}. You ranked{" "}
                    {application!.selected_internship_ids.length} internship
                    {application!.selected_internship_ids.length === 1 ? "" : "s"}.
                  </p>
                  {canWithdraw && (
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <button
                        onClick={withdrawApplication}
                        disabled={withdrawing}
                        className="btn-ghost disabled:opacity-50"
                      >
                        {withdrawing ? "Withdrawing…" : "Withdraw application"}
                      </button>
                      <span className="text-xs text-charcoal-500">
                        Take it back to change your picks and apply again.
                      </span>
                    </div>
                  )}
                </div>
              ) : !interestDone ? (
                <div className="mt-4">
                  <p className="text-charcoal-500 max-w-2xl">
                    Before you can browse and apply, take a quick 5–7 minute interest survey.
                    It reads your interests and ranks the EXPLR internships that fit you best.
                  </p>
                  <Link to="/assessment/internship-interest" className="btn-ink mt-5 inline-block">
                    Take the interest survey
                  </Link>
                </div>
              ) : (
                <div className="mt-4">
                  {application && (
                    <p className="mb-2 text-sm text-charcoal-500">
                      Your previous application was{" "}
                      <span className="capitalize text-ink">{application.status}</span>. You can
                      apply again below.
                    </p>
                  )}
                  <p className="text-charcoal-500 max-w-2xl">
                    {hasResults
                      ? "You're ready to apply. Pick the internships that fit and fill in your digital résumé."
                      : "Finish the main assessment too — your Holland code helps match you to internships that fit."}
                  </p>
                  <Link to="/student/apply" className="btn-ink mt-5 inline-block">
                    {application ? "Apply again →" : "Apply now →"}
                  </Link>
                </div>
              )}
            </section>

            {canSeeInternships && (
              <section className="mt-12 border-t border-charcoal-100 pt-10">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="eyebrow">Internships</p>
                  <div className="flex items-center gap-4">
                    <Link
                      to="/assessment/internship-interest/results"
                      className="text-xs text-charcoal-500 hover:text-ink"
                    >
                      View your matches →
                    </Link>
                    <Link
                      to="/assessment/internship-interest"
                      search={{ retake: true }}
                      className="text-xs text-charcoal-500 hover:text-ink"
                    >
                      Retake interest survey
                    </Link>
                  </div>
                </div>
                <p className="mt-3 text-charcoal-500 max-w-2xl">
                  EXPLR internships span biomedical, design, software, education, and
                  more. Explore the programs below.
                </p>

                {visibleInternships.length === 0 ? (
                  <p className="mt-8 text-sm text-charcoal-500">
                    No internships are open right now. Check back soon.
                  </p>
                ) : (
                  <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleInternships.map((i) => (
                      <li
                        key={i.slug}
                        className="group border border-charcoal-100 p-5 transition-colors hover:border-ink"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="eyebrow" style={{ color: "var(--explr)" }}>{i.theme}</p>
                            <h3 className="mt-2 text-lg font-medium leading-tight">{i.name}</h3>
                          </div>
                          <span className="text-2xl" aria-hidden>{i.emoji}</span>
                        </div>
                        <p className="mt-4 text-sm text-charcoal-500 line-clamp-3">
                          {i.deliverables}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

          </>
        )}
        </>
        )}
      </main>
    </div>
  );
}
