import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Compass, GraduationCap, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildItemSequence } from "@/lib/assessment-items";
import { HollandHexagon } from "@/components/HollandHexagon";
import { DoorCard } from "@/components/passport/DoorCard";
import { PortalHeader, type PortalLink } from "@/components/passport/PortalHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/assessment/")({
  head: () => ({ meta: [{ title: "Take the assessment — EXPLR" }] }),
  component: AssessmentIntro,
});

function Shell({
  authed,
  explore,
  children,
}: {
  authed: boolean;
  explore?: boolean;
  children: ReactNode;
}) {
  const links: PortalLink[] = authed
    ? [{ label: "My passport", to: "/student" }]
    : [
        { label: "Home", to: "/" },
        { label: "Get started", to: "/start", secondary: true },
      ];
  return (
    <div
      className="flex min-h-screen flex-col bg-paper text-ink-900"
      data-density={explore ? "explore" : undefined}
    >
      <PortalHeader
        role={authed ? "Student" : undefined}
        links={links}
        signedIn={authed ? true : undefined}
      />
      <main className="mx-auto w-full max-w-[1312px] flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {children}
      </main>
      <SiteFooter className="mt-10" />
    </div>
  );
}

function AssessmentIntro() {
  const navigate = useNavigate();
  const [grade, setGrade] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [educatorMismatch, setEducatorMismatch] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      setAuthed(true);
      setUserId(session.user.id);
      const { data: edu } = await supabase
        .from("educators")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      // Non-admin instructors shouldn't take the student assessment.
      if (edu && edu.role !== "admin") {
        setEducatorMismatch(true);
        setLoading(false);
        return;
      }
      const { data: stud } = await supabase
        .from("students")
        .select("grade")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (stud?.grade) setGrade(stud.grade);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function start() {
    if (!userId || !grade) return;
    setStarting(true);
    setError(null);
    // Resume any in-progress session first
    const { data: existing } = await supabase
      .from("assessment_sessions")
      .select("session_id, completed_at")
      .eq("student_id", userId)
      .is("completed_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.session_id) {
      navigate({ to: "/assessment/$sessionId", params: { sessionId: existing.session_id } });
      return;
    }
    // Ensure a students row exists (required by FK). Safe for both real students
    // and admins previewing as a student.
    const { error: studErr } = await supabase
      .from("students")
      .upsert({ id: userId, grade }, { onConflict: "id" });
    if (studErr) {
      setError(studErr.message);
      setStarting(false);
      return;
    }

    const sessionId = crypto.randomUUID();
    const item_sequence = buildItemSequence(sessionId);
    const { error: insErr } = await supabase.from("assessment_sessions").insert({
      session_id: sessionId,
      student_id: userId,
      grade_at_session: grade,
      form_version: grade <= 6 ? "MS" : "HS",
      item_sequence,
    });
    if (insErr) {
      setError(insErr.message);
      setStarting(false);
      return;
    }
    navigate({ to: "/assessment/$sessionId", params: { sessionId } });
  }

  if (loading) {
    return (
      <Shell authed={false}>
        <h1 className="pt-14 text-center font-display text-2xl font-bold">
          Loading the assessment…
        </h1>
        <p className="pb-14 pt-2 text-center text-sm text-ink-500" role="status">
          One moment.
        </p>
      </Shell>
    );
  }

  if (educatorMismatch) {
    return (
      <Shell authed>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-8 text-center shadow-card">
          <span className="grid h-12 w-12 place-items-center rounded-[14px] border border-mint-soft bg-mint-tint text-green-deep">
            <UserCheck className="h-6 w-6" strokeWidth={2} aria-hidden />
          </span>
          <p className="eyebrow">Instructors</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            This area is for students
          </h1>
          <p className="text-sm text-ink-700">
            Your account is registered as an instructor. Head to your instructor dashboard for
            rosters, checkpoints, and experiences to review.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link to="/instructor/dashboard" className="btn-ink">
              Go to instructor dashboard
            </Link>
            <Link to="/" className="btn-ghost">
              Back to home
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  if (!authed) {
    return (
      <Shell authed={false}>
        <div className="flex flex-col gap-2.5">
          <p className="eyebrow text-green">The RIASEC assessment</p>
          <h1 className="display">Get started.</h1>
          <p className="lead max-w-[600px] text-ink-700">
            Sign in to take the interest assessment and keep your Holland code on your passport.
            Pick your pathway.
          </p>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <DoorCard
            headingLevel="h2"
            eyebrow="Students"
            icon={GraduationCap}
            image="/passport/assessments.webp"
            title="A starting point you actually own."
            body="Take the survey. See your Holland code. Use it to ask better questions about what comes after high school."
            cta="Create student account"
            to="/sign-up"
            pills={[{ label: "Sign in", to: "/sign-in" }]}
          />
          <DoorCard
            headingLevel="h2"
            eyebrow="Instructors"
            icon={UserCheck}
            image="/passport/grades-9-12.webp"
            title="Rosters and checkpoints in one place."
            body="STEM, CS, robotics coaches, camp instructors, and internship supervisors. Manage assignments and student lists per program."
            cta="Request instructor access"
            to="/instructor/sign-up"
            pills={[{ label: "Sign in", to: "/instructor/sign-in" }]}
          />
        </div>
      </Shell>
    );
  }

  return (
    <Shell authed explore={grade != null && grade <= 8}>
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
        <div>
          <p className="eyebrow text-green">Students</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border border-mint-soft bg-mint-tint text-green-deep">
              <Compass className="h-6 w-6" strokeWidth={2} aria-hidden />
            </span>
            <span className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-green">
              RIASEC · about ten minutes
            </span>
          </div>
          <h1 className="display mt-4">The assessment.</h1>
          <p className="lead mt-6 max-w-xl text-ink-700">
            Forty-eight short statements. For each one, say how much you&apos;d like to do it. About
            ten minutes. Be honest; there are no right answers.
          </p>
          <ul className="mt-8 flex flex-col gap-2 text-sm text-ink-700">
            <li className="flex gap-2">
              <span className="text-green" aria-hidden>
                ·
              </span>
              Your answers are private to you.
            </li>
            <li className="flex gap-2">
              <span className="text-green" aria-hidden>
                ·
              </span>
              You can pause and come back later.
            </li>
            <li className="flex gap-2">
              <span className="text-green" aria-hidden>
                ·
              </span>
              You&apos;ll get a personal Holland code at the end.
            </li>
          </ul>

          <div className="mt-10 flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 shadow-card sm:flex-row sm:items-end">
            <div>
              <label className="label" htmlFor="assess-grade">
                Grade this fall
              </label>
              <select
                id="assess-grade"
                aria-describedby="assess-grade-hint"
                className="field sm:w-32"
                value={grade ?? ""}
                onChange={(e) => setGrade(Number(e.target.value))}
              >
                <option value="" disabled>
                  —
                </option>
                {[5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <p id="assess-grade-hint" className="mt-1.5 text-xs text-ink-500">
                The grade you&apos;re entering this fall.
              </p>
            </div>
            <button
              className="btn-ink justify-center sm:mb-6"
              disabled={!grade || starting}
              onClick={start}
            >
              {starting ? "Starting…" : "Begin"}
            </button>
          </div>
          {error && (
            <p
              className="mt-4 rounded-[var(--radius-control)] bg-gold-tint px-3 py-2 text-sm text-ink-900"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-center">
          <HollandHexagon size={260} />
        </div>
      </div>
    </Shell>
  );
}
