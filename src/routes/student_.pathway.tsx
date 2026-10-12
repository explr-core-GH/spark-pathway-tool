import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { SiteFooter } from "@/components/SiteFooter";
import { RIASEC, type RIASECCode } from "@/lib/riasec";
import { fetchInternshipCatalog, useInternshipRefs } from "@/lib/internship-refs";
import type { Opportunity } from "@/lib/opportunities";
import { StudentSurveysPanel } from "@/components/StudentSurveysPanel";
import { FamilyPortal } from "@/components/FamilyPortal";
import { FamilyCodePanel } from "@/components/FamilyCodePanel";
import { SurveyResultsPanel } from "@/components/SurveyResultsPanel";
import { ApplyStatusBanner } from "@/components/ApplyStatusBanner";

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
    return <main className="mx-auto max-w-3xl px-6 py-24 text-sm text-ink-500">Loading…</main>;
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
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-xl font-medium tracking-tight">
            EXPLR <span style={{ color: "var(--color-green)" }}>Pathways</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link to="/student" className="font-medium text-green-deep hover:underline">
              ← My passport
            </Link>
            <Link to="/sign-out" className="text-ink-500 hover:text-ink-900">
              Sign out
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <p className="eyebrow">Assessments &amp; internships</p>
        <h1 className="display mt-3">Your pathway</h1>

        {/* Tabs: the student's pathway vs the family-facing explainer. */}
        <div
          role="tablist"
          aria-label="Dashboard sections"
          className="mt-6 flex gap-1 border-b border-line"
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
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className="border-b-2 px-4 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor: tab === id ? "var(--color-ink-900)" : "transparent",
                color: tab === id ? "var(--color-ink-900)" : "var(--color-ink-500)",
                fontWeight: tab === id ? 500 : 400,
              }}
            >
              {label}
            </button>
          ))}
          <Link
            to="/opportunities"
            className="ml-auto self-center text-sm text-ink-700 hover:underline"
          >
            Explore opportunities →
          </Link>
        </div>

        {tab === "families" && (
          <>
            <FamilyCodePanel />
            <FamilyPortal studentId={user!.id} grade={grade} />
          </>
        )}

        {tab === "dashboard" && (
          <>
            <ApplyStatusBanner studentId={user!.id} />

            {/* Placement banner — top priority when present */}
            {placement && (
              <section className="mt-10 rounded-[var(--radius-card)] border border-ink-900 bg-ink-900 p-6 text-paper">
                <p className="eyebrow" style={{ color: "var(--color-green)" }}>
                  You're in
                </p>
                <h2 className="mt-2 text-3xl font-light">
                  Accepted to <span className="font-medium">{placedName}</span>
                </h2>
                <p className="mt-2 text-sm opacity-70">
                  Approved {new Date(placement.approved_at).toLocaleDateString()}.
                </p>
                {placedId && (
                  <Link
                    to="/opportunity/$id"
                    params={{ id: placedId }}
                    className="mt-5 inline-block border border-paper px-5 py-2 text-sm transition-colors hover:bg-paper hover:text-ink-900"
                  >
                    View {placedName} →
                  </Link>
                )}
              </section>
            )}

            {/* Assessment status */}
            <section className="mt-12 border-t border-line pt-10">
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
                    <p className="mt-3 text-2xl font-light text-ink-500">
                      You have an assessment in progress. Pick up where you left off.
                    </p>
                  ) : (
                    <p className="mt-3 text-2xl font-light text-ink-500">
                      You haven't started the assessment yet.
                    </p>
                  )}
                </div>
                {hasResults ? (
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Link
                      to="/assessment/$sessionId/results"
                      params={{ sessionId: session!.session_id }}
                      className="btn-ghost"
                    >
                      View full results
                    </Link>
                    <Link to="/assessment" className="text-xs text-ink-500 hover:text-ink-900">
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
            <section className="mt-12 border-t border-line pt-10">
              <p className="eyebrow">STEM surveys</p>
              <p className="mt-3 max-w-2xl text-ink-500">
                Short research surveys from your camp or internship. They help EXPLR understand
                what&apos;s working — your answers are never shown next to your name to anyone else.
              </p>
              <StudentSurveysPanel studentId={user!.id} />

              <p className="eyebrow mt-8">Your results</p>
              <p className="mt-2 max-w-2xl text-sm text-ink-500">
                How your confidence and interest scored across STEM areas — only you (and your
                family) can see these.
              </p>
              <SurveyResultsPanel studentId={user!.id} />
            </section>

            {/* Application & internships — grades 8–12. */}
            {canSeeInternshipTrack && (
              <>
                <section className="mt-12 border-t border-line pt-10">
                  <p className="eyebrow">Internship application</p>
                  {activeApplication ? (
                    <div className="mt-4">
                      <p className="text-2xl font-light">
                        Status:{" "}
                        <span className="font-medium capitalize text-ink-900">
                          {application!.status.replace(/_/g, " ")}
                        </span>
                      </p>
                      <p className="mt-2 text-sm text-ink-500">
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
                          <span className="text-xs text-ink-500">
                            Take it back to change your picks and apply again.
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4">
                      {application && (
                        <p className="mb-2 text-sm text-ink-500">
                          Your previous application was{" "}
                          <span className="capitalize text-ink-900">{application.status}</span>. You
                          can apply again below.
                        </p>
                      )}
                      <p className="max-w-2xl text-ink-500">
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

                <section className="mt-12 border-t border-line pt-10">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="eyebrow">Internships open now</p>
                    <Link to="/opportunities" className="text-xs text-ink-500 hover:text-ink-900">
                      Browse all opportunities →
                    </Link>
                  </div>
                  <p className="mt-3 max-w-2xl text-ink-500">
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
                            className="group block h-full rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 transition-colors hover:border-ink-900"
                          >
                            <p className="eyebrow" style={{ color: "var(--color-green)" }}>
                              {o.org_name ?? "Partner internship"}
                            </p>
                            <h3 className="mt-2 text-lg font-medium leading-tight text-ink-900">
                              {o.name ?? "Internship"}
                            </h3>
                            {o.description && (
                              <p className="mt-4 text-sm text-ink-500">
                                {shortDescription(o.description)}
                              </p>
                            )}
                            <span className="mt-4 inline-block text-xs text-ink-700 group-hover:underline">
                              View details →
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
      </main>
      <SiteFooter />
    </div>
  );
}
