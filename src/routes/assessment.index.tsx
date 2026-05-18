import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildItemSequence } from "@/lib/assessment-items";
import { HollandHexagon } from "@/components/HollandHexagon";

export const Route = createFileRoute("/assessment/")({
  head: () => ({ meta: [{ title: "Take the assessment — EXPLR" }] }),
  component: AssessmentIntro,
});

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
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) { setAuthed(false); setLoading(false); return; }
      setAuthed(true);
      setUserId(session.user.id);
      const { data: edu } = await supabase
        .from("educators").select("role").eq("id", session.user.id).maybeSingle();
      if (cancelled) return;
      // Non-admin educators shouldn't take the student assessment.
      if (edu && edu.role !== "admin") {
        setEducatorMismatch(true);
        setLoading(false);
        return;
      }
      const { data: stud } = await supabase
        .from("students").select("grade").eq("id", session.user.id).maybeSingle();
      if (cancelled) return;
      if (stud?.grade) setGrade(stud.grade);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  async function start() {
    if (!userId || !grade) return;
    setStarting(true); setError(null);
    // Resume any in-progress session first
    const { data: existing } = await supabase
      .from("assessment_sessions")
      .select("session_id, completed_at")
      .eq("student_id", userId)
      .is("completed_at", null)
      .order("started_at", { ascending: false })
      .limit(1).maybeSingle();
    if (existing?.session_id) {
      navigate({ to: "/assessment/$sessionId", params: { sessionId: existing.session_id } });
      return;
    }
    // Ensure a students row exists (required by FK). Safe for both real students
    // and admins previewing as a student.
    const { error: studErr } = await supabase
      .from("students")
      .upsert({ id: userId, grade }, { onConflict: "id" });
    if (studErr) { setError(studErr.message); setStarting(false); return; }

    const sessionId = crypto.randomUUID();
    const item_sequence = buildItemSequence(sessionId);
    const { error: insErr } = await supabase.from("assessment_sessions").insert({
      session_id: sessionId,
      student_id: userId,
      grade_at_session: grade,
      form_version: grade <= 6 ? "MS" : "HS",
      item_sequence,
    });
    if (insErr) { setError(insErr.message); setStarting(false); return; }
    navigate({ to: "/assessment/$sessionId", params: { sessionId } });
  }

  if (loading) return <div className="mx-auto max-w-2xl px-6 py-24 text-charcoal-500">Loading…</div>;

  if (educatorMismatch) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="eyebrow">Educator account</p>
        <h1 className="mt-3 text-2xl font-light">This area is for students</h1>
        <p className="mt-4 text-sm text-charcoal-500">
          Your account is registered as an educator. Head to your educator
          dashboard for curriculum, internships, and rosters.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/educator/dashboard" className="btn-ink">Go to educator dashboard</Link>
          <Link to="/" className="btn-ghost">Back to home</Link>
        </div>
      </main>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20">
        <Link to="/" className="eyebrow">← EXPLR</Link>
        <h1 className="display mt-10">Get started.</h1>
        <p className="lead mt-4">Pick your pathway.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="r-md border border-charcoal-100 p-8">
            <p className="eyebrow">For students</p>
            <h4 className="mt-3 text-xl font-light text-charcoal-700">A starting point you actually own.</h4>
            <p className="mt-3 text-sm text-charcoal-500">
              Take the survey. See your Holland code. Use it to ask better questions about
              what comes after high school.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/sign-up" className="btn-ink">Create student account</Link>
              <Link to="/sign-in" className="btn-ghost">Sign in</Link>
            </div>
          </div>
          <div className="r-md border border-charcoal-100 p-8">
            <p className="eyebrow">For educators</p>
            <h4 className="mt-3 text-xl font-light text-charcoal-700">Curriculum and rosters in one place.</h4>
            <p className="mt-3 text-sm text-charcoal-500">
              STEM, CS, robotics coaches, camp instructors, and internship supervisors —
              manage assignments and student lists per program.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/educator/sign-up" className="btn-ink">Request educator access</Link>
              <Link to="/educator/sign-in" className="btn-ghost">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <Link to="/" className="eyebrow">← EXPLR</Link>
      <div className="mt-10 grid items-center gap-12 lg:grid-cols-[1fr_280px]">
        <div>
          <h1 className="display">The assessment.</h1>
          <p className="lead mt-6">
            Thirty short statements. For each one, say how much you'd like to do it.
            About ten minutes. Be honest — there are no right answers.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-charcoal-500">
            <li>· Your answers are private to you.</li>
            <li>· You can pause and come back later.</li>
            <li>· You'll get a personal Holland code at the end.</li>
          </ul>

          <div className="mt-10 flex items-end gap-4">
            <div>
              <label className="label">Grade</label>
              <select className="field w-28" value={grade ?? ""} onChange={(e) => setGrade(Number(e.target.value))}>
                <option value="" disabled>—</option>
                {[5,6,7,8,9,10,11,12].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <button className="btn-ink" disabled={!grade || starting} onClick={start}>
              {starting ? "Starting…" : "Begin"}
            </button>
          </div>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex justify-center">
          <HollandHexagon size={260} />
        </div>
      </div>
    </div>
  );
}
