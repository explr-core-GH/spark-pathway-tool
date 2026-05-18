import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { INTERNSHIPS } from "@/lib/internships-catalog";
import { RIASEC, type RIASECCode } from "@/lib/riasec";
import { StemActivitiesMarquee } from "@/components/StemActivitiesMarquee";

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
  }, [user]);

  if (authLoading || loading) {
    return <main className="mx-auto max-w-3xl px-6 py-24 text-sm text-charcoal-400">Loading…</main>;
  }

  const hasResults = !!(session?.completed_at && session.holland_code);
  const hasInProgress = !!(session && !session.completed_at && session.session_id);
  const topCode = hasResults ? (session!.holland_code![0] as RIASECCode) : null;
  const primary = topCode ? RIASEC[topCode] : null;

  // Internships are only available to grades 8-12 who've finished the interest survey.
  const eligibleByGrade = grade !== null && grade >= 8 && grade <= 12;
  const canSeeInternships = eligibleByGrade && interestDone;
  const visibleInternships = INTERNSHIPS.filter((i) => !hiddenSlugs.has(i.slug));
  const placedInternship = placement
    ? INTERNSHIPS.find((i) => i.slug === placement.approved_internship_id)
    : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-sm tracking-tight">
            EXPLR <span style={{ color: "var(--explr)" }}>Pathways</span>
          </Link>
          <Link to="/sign-out" className="text-sm text-charcoal-500 hover:text-ink">Sign out</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <p className="eyebrow">Student dashboard</p>
        <h1 className="display mt-3">Your pathway</h1>

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
              <Link
                to="/assessment/$sessionId/results"
                params={{ sessionId: session!.session_id }}
                className="btn-ghost shrink-0"
              >
                View full results
              </Link>
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

        {/* Application & internships — only for grades 8-12 who finished the interest survey */}
        {eligibleByGrade && (
          <>
            <section className="mt-12 border-t border-charcoal-100 pt-10">
              <p className="eyebrow">Internship application</p>
              {application ? (
                <div className="mt-4">
                  <p className="text-2xl font-light">
                    Status:{" "}
                    <span className="text-ink font-medium capitalize">
                      {application.status.replace(/_/g, " ")}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-charcoal-500">
                    Submitted {new Date(application.submitted_at).toLocaleDateString()} for{" "}
                    {application.submission_term}. You ranked{" "}
                    {application.selected_internship_ids.length} internship
                    {application.selected_internship_ids.length === 1 ? "" : "s"}.
                  </p>
                </div>
              ) : !interestDone ? (
                <div className="mt-4">
                  <p className="text-charcoal-500 max-w-2xl">
                    Before you can browse and apply, set your internship preferences — a quick
                    yes / maybe / no across the catalog so we can rank your application list.
                  </p>
                  <Link to="/assessment/internship-interest" className="btn-ink mt-5 inline-block">
                    Set internship preferences
                  </Link>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-charcoal-500 max-w-2xl">
                    {hasResults
                      ? "You're ready to apply. Pick the internships that fit and fill in your digital résumé."
                      : "Finish the main assessment too — your Holland code helps match you to internships that fit."}
                  </p>
                  <Link to="/student/apply" className="btn-ink mt-5 inline-block">
                    Apply now →
                  </Link>
                </div>
              )}
            </section>

            {canSeeInternships && (
              <section className="mt-12 border-t border-charcoal-100 pt-10">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="eyebrow">Internships</p>
                  <Link to="/assessment/internship-interest" className="text-xs text-charcoal-500 hover:text-ink">
                    Update preferences →
                  </Link>
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

            {placedInternship && (
              <section className="mt-12 border-t border-charcoal-100 pt-10">
                <p className="eyebrow" style={{ color: "var(--explr)" }}>Your placement</p>
                <h2 className="mt-3 text-2xl font-light">
                  You've been accepted to{" "}
                  <span className="font-medium text-ink">{placedInternship.name}</span>
                </h2>
                <p className="mt-2 text-sm text-charcoal-500">
                  Approved {new Date(placement!.approved_at).toLocaleDateString()}. Use the link
                  below to access your internship's program site.
                </p>
                <a
                  href={placedInternship.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ink mt-5 inline-block"
                >
                  Open {placedInternship.name} site →
                </a>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
