import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * AssignedAssessmentsPanel — the "Assigned to you" section of the student
 * dashboard. Shows assessments an admin targeted directly at this student
 * (assessment_targets, target_type='student').
 *
 * Educator-targeted assignments cascade to a roster — those will surface
 * here too once camp-student account generation links each student to
 * their educator (Phase 2). For now this panel shows direct targets.
 */

const sb = (table: string) =>
  (supabase.from as (n: string) => ReturnType<typeof supabase.from>)(table);

type Target = {
  id: string;
  assessment_kind: string;
  survey_assignment_id: string | null;
  due_at: string | null;
  notes: string | null;
};

// Where each assessment kind sends the student.
function destination(
  kind: string,
  surveyAssignmentId: string | null,
): { label: string; to: string; params?: Record<string, string> } | null {
  switch (kind) {
    case "riasec":
      return { label: "RIASEC interest assessment", to: "/assessment" };
    case "internship_interest":
      return {
        label: "Internship interest survey",
        to: "/assessment/internship-interest",
      };
    case "aptitude_ms":
      return {
        label: "Aptitude battery",
        to: "/demo/aptitude/$band/take",
        params: { band: "MS" },
      };
    case "aptitude_hs":
      return {
        label: "Aptitude battery",
        to: "/demo/aptitude/$band/take",
        params: { band: "HS" },
      };
    case "survey":
      if (!surveyAssignmentId) return null;
      return {
        label: "STEM survey",
        to: "/survey/$assignmentId",
        params: { assignmentId: surveyAssignmentId },
      };
    default:
      return null;
  }
}

export function AssignedAssessmentsPanel({ studentId }: { studentId: string }) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [surveyTitles, setSurveyTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await sb("assessment_targets")
        .select("id, assessment_kind, survey_assignment_id, due_at, notes")
        .eq("target_type", "student")
        .eq("target_id", studentId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const rows = (data ?? []) as Target[];
      setTargets(rows);

      const surveyIds = rows
        .map((r) => r.survey_assignment_id)
        .filter((x): x is string => !!x);
      if (surveyIds.length > 0) {
        const { data: sv } = await sb("survey_assignments")
          .select("id, title")
          .in("id", surveyIds);
        if (!cancelled) {
          const m: Record<string, string> = {};
          for (const s of (sv ?? []) as Array<{ id: string; title: string }>) {
            m[s.id] = s.title;
          }
          setSurveyTitles(m);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return <p className="mt-3 text-sm text-charcoal-400">Loading…</p>;
  }
  if (targets.length === 0) {
    return (
      <p className="mt-3 text-charcoal-500 max-w-2xl">
        Nothing assigned to you right now. Anything your educator or an EXPLR
        admin assigns will show up here.
      </p>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-charcoal-100 border-y border-charcoal-100">
      {targets.map((t) => {
        const dest = destination(t.assessment_kind, t.survey_assignment_id);
        if (!dest) return null;
        const title =
          t.assessment_kind === "survey" && t.survey_assignment_id
            ? `STEM survey · ${surveyTitles[t.survey_assignment_id] ?? "Survey"}`
            : dest.label;
        return (
          <li key={t.id} className="flex items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{title}</p>
              <p className="truncate text-xs text-charcoal-500">
                {t.due_at
                  ? `Due ${new Date(t.due_at).toLocaleDateString()}`
                  : "No due date"}
                {t.notes ? ` · ${t.notes}` : ""}
              </p>
            </div>
            <Link
              to={dest.to as never}
              params={dest.params as never}
              className="btn-ink shrink-0 text-xs"
            >
              Start →
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
