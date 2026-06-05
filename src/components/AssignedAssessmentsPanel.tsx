import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * AssignedAssessmentsPanel — the "Assigned to you" section of the student
 * dashboard. Resolves the assessments this student should take from
 * assessment_targets, two ways:
 *
 *   1. Direct  — target_type='student', target_id = this student.
 *   2. Cascade — target_type='educator': the student is reached through
 *      student_camp_links → explr_camp_educators. A student generated for
 *      a camp session inherits every assignment targeted at that camp's
 *      educators.
 */

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
      // 1. Direct student-targeted assignments.
      const { data: direct } = await supabase
        .from("assessment_targets")
        .select("id, assessment_kind, survey_assignment_id, due_at, notes")
        .eq("target_type", "student")
        .eq("target_id", studentId)
        .order("created_at", { ascending: false });

      // 2. Cascade through this student's camps. Two paths, both rooted
      //    at student_camp_links:
      //      (a) target_type='camp'      — assigned directly to the camp,
      //                                    no educator needed.
      //      (b) target_type='educator'  — assigned to an educator who
      //                                    runs the camp.
      const { data: links } = await supabase
        .from("student_camp_links")
        .select("explr_camp_id")
        .eq("student_id", studentId);
      const campIds = ((links ?? []) as Array<{ explr_camp_id: string }>).map(
        (l) => l.explr_camp_id,
      );
      let cascade: Target[] = [];
      if (campIds.length > 0) {
        // (a) direct camp targets.
        const { data: viaCamp } = await supabase
          .from("assessment_targets")
          .select("id, assessment_kind, survey_assignment_id, due_at, notes")
          .eq("target_type", "camp")
          .in("target_id", campIds)
          .order("created_at", { ascending: false });
        cascade.push(...((viaCamp ?? []) as Target[]));

        // (b) educator path — the camp's educators' assignments.
        const { data: ece } = await supabase
          .from("explr_camp_educators")
          .select("educator_id")
          .in("explr_camp_id", campIds);
        const educatorIds = [
          ...new Set(
            ((ece ?? []) as Array<{ educator_id: string }>).map(
              (r) => r.educator_id,
            ),
          ),
        ];
        if (educatorIds.length > 0) {
          const { data: viaEdu } = await supabase
            .from("assessment_targets")
            .select("id, assessment_kind, survey_assignment_id, due_at, notes")
            .eq("target_type", "educator")
            .in("target_id", educatorIds)
            .order("created_at", { ascending: false });
          cascade.push(...((viaEdu ?? []) as Target[]));
        }
      }
      if (cancelled) return;

      // Merge, de-duplicating by row id.
      const seen = new Set<string>();
      const rows: Target[] = [];
      for (const t of [...((direct ?? []) as Target[]), ...cascade]) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        rows.push(t);
      }
      setTargets(rows);

      const surveyIds = rows
        .map((r) => r.survey_assignment_id)
        .filter((x): x is string => !!x);
      if (surveyIds.length > 0) {
        const { data: sv } = await supabase
          .from("survey_assignments")
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
