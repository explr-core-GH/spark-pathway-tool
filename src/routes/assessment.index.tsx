import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildItemSequence, FORM_VERSION } from "@/lib/assessment-items";
import { HollandHexagon } from "@/components/HollandHexagon";

export const Route = createFileRoute("/assessment/")({
  head: () => ({ meta: [{ title: "Take the assessment — EXPLR" }] }),
  component: AssessmentIntro,
});

function AssessmentIntro() {
  const navigate = useNavigate();
  const [grade, setGrade] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) { navigate({ to: "/sign-in" }); return; }
      setUserId(session.user.id);
      const { data: stud } = await supabase
        .from("students").select("grade").eq("id", session.user.id).maybeSingle();
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
    const sessionId = crypto.randomUUID();
    const item_sequence = buildItemSequence(sessionId);
    const { error: insErr } = await supabase.from("assessment_sessions").insert({
      session_id: sessionId,
      student_id: userId,
      grade_at_session: grade,
      form_version: FORM_VERSION,
      item_sequence,
    });
    if (insErr) { setError(insErr.message); setStarting(false); return; }
    navigate({ to: "/assessment/$sessionId", params: { sessionId } });
  }

  if (loading) return <div className="mx-auto max-w-2xl px-6 py-24 text-charcoal-500">Loading…</div>;

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
