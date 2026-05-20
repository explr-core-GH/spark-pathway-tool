import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SURVEY_TYPE_LABEL, type SurveyType } from "@/lib/explr-stem";

/**
 * StudentSurveysPanel — the surveys section of the student dashboard.
 *
 * Surveys are admin-assigned to camps/internships (survey_assignments).
 * Like the existing assessment_assignments, assignments are visible to
 * every signed-in student; the student opens the one for their program.
 * Status (not started / in progress / done) comes from the student's own
 * survey_responses rows.
 */

const sb = supabase.from as (n: string) => ReturnType<typeof supabase.from>;

type Assignment = {
  id: string;
  survey_type: SurveyType;
  administration: string;
  title: string;
};
type Resp = { assignment_id: string; completed_at: string | null };

export function StudentSurveysPanel({ studentId }: { studentId: string }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [responses, setResponses] = useState<Resp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: a }, { data: r }] = await Promise.all([
        sb("survey_assignments")
          .select("id, survey_type, administration, title")
          .order("created_at", { ascending: false }),
        sb("survey_responses")
          .select("assignment_id, completed_at")
          .eq("student_id", studentId),
      ]);
      if (cancelled) return;
      setAssignments((a ?? []) as Assignment[]);
      setResponses((r ?? []) as Resp[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return <p className="mt-3 text-sm text-charcoal-400">Loading surveys…</p>;
  }
  if (assignments.length === 0) {
    return (
      <p className="mt-3 text-charcoal-500 max-w-2xl">
        No surveys have been assigned yet. Your camp or internship staff will
        share one when it&apos;s time.
      </p>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-charcoal-100 border-y border-charcoal-100">
      {assignments.map((a) => {
        const resp = responses.find((r) => r.assignment_id === a.id);
        const done = !!resp?.completed_at;
        const started = !!resp && !done;
        return (
          <li key={a.id} className="flex items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{a.title}</p>
              <p className="truncate text-xs text-charcoal-500">
                {SURVEY_TYPE_LABEL[a.survey_type]} ·{" "}
                <span className="capitalize">{a.administration}</span>
              </p>
            </div>
            {done ? (
              <span className="text-xs font-medium text-explr-600">
                ✓ Completed
              </span>
            ) : (
              <Link
                to="/survey/$assignmentId"
                params={{ assignmentId: a.id }}
                className="btn-ink shrink-0 text-xs"
              >
                {started ? "Continue →" : "Start survey →"}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
