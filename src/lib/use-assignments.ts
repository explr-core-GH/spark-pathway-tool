// Resolves the assessments/surveys a student has been assigned, with two
// behaviours the dashboard, the "assigned" pop-up, and the internship gate all
// share:
//
//   1. Scheduling window — assignments only count while now is within
//      [available_from, available_until]. Outside the window they're hidden.
//   2. Completion — each kind is checked against its own results table so we
//      can tell "still to do" from "already done".
//
// Targets resolve three ways (same as the original panel): a direct
// student target, a camp target (via student_camp_links), and an educator
// target (the camp's educators).

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AssignmentItem = {
  id: string; // assessment_targets row id
  kind: string; // assessment_kind
  surveyAssignmentId: string | null;
  label: string;
  to: string;
  params?: Record<string, string>;
  dueAt: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  notes: string | null;
  done: boolean;
};

type RawTarget = {
  id: string;
  assessment_kind: string;
  survey_assignment_id: string | null;
  due_at: string | null;
  available_from: string | null;
  available_until: string | null;
  notes: string | null;
};

// Where each assessment kind sends the student.
export function assignmentDest(
  kind: string,
  surveyAssignmentId: string | null,
): { label: string; to: string; params?: Record<string, string> } | null {
  switch (kind) {
    case "riasec":
      return { label: "RIASEC interest assessment", to: "/assessment" };
    case "internship_interest":
      return { label: "Internship interest survey", to: "/assessment/internship-interest" };
    case "aptitude_ms":
      return { label: "Aptitude battery", to: "/demo/aptitude/$band/take", params: { band: "MS" } };
    case "aptitude_hs":
      return { label: "Aptitude battery", to: "/demo/aptitude/$band/take", params: { band: "HS" } };
    case "survey":
      if (!surveyAssignmentId) return null;
      return { label: "STEM survey", to: "/survey/$assignmentId", params: { assignmentId: surveyAssignmentId } };
    default:
      return null;
  }
}

export type StudentAssignments = {
  loading: boolean;
  items: AssignmentItem[]; // active window only
  pending: AssignmentItem[]; // active && not done
  hasInternshipAssignment: boolean; // ever assigned the internship survey (any window)
};

export function useStudentAssignments(studentId: string | null): StudentAssignments {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [hasInternshipAssignment, setHasInternshipAssignment] = useState(false);

  useEffect(() => {
    if (!studentId) {
      setItems([]);
      setHasInternshipAssignment(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      // select("*") so the new available_from/until columns degrade gracefully
      // before the migration is applied (missing columns just read undefined).
      const { data: direct } = await supabase
        .from("assessment_targets")
        .select("*")
        .eq("target_type", "student")
        .eq("target_id", studentId);

      const { data: links } = await supabase
        .from("student_camp_links")
        .select("explr_camp_id")
        .eq("student_id", studentId);
      const campIds = ((links ?? []) as Array<{ explr_camp_id: string }>).map((l) => l.explr_camp_id);

      const cascade: RawTarget[] = [];
      if (campIds.length > 0) {
        const { data: viaCamp } = await supabase
          .from("assessment_targets")
          .select("*")
          .eq("target_type", "camp")
          .in("target_id", campIds);
        cascade.push(...((viaCamp ?? []) as unknown as RawTarget[]));

        const { data: ece } = await supabase
          .from("explr_camp_educators")
          .select("educator_id")
          .in("explr_camp_id", campIds);
        const eduIds = [...new Set(((ece ?? []) as Array<{ educator_id: string }>).map((r) => r.educator_id))];
        if (eduIds.length > 0) {
          const { data: viaEdu } = await supabase
            .from("assessment_targets")
            .select("*")
            .eq("target_type", "educator")
            .in("target_id", eduIds);
          cascade.push(...((viaEdu ?? []) as unknown as RawTarget[]));
        }
      }
      if (cancelled) return;

      const seen = new Set<string>();
      const raw: RawTarget[] = [];
      for (const t of [...((direct ?? []) as unknown as RawTarget[]), ...cascade]) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        raw.push(t);
      }

      const internshipAssigned = raw.some((t) => t.assessment_kind === "internship_interest");

      // Completion sources — one query each, mapped below.
      const surveyIds = raw
        .filter((t) => t.assessment_kind === "survey" && t.survey_assignment_id)
        .map((t) => t.survey_assignment_id as string);

      const [{ data: sess }, { data: intern }, { data: apt }, { data: sr }, { data: sv }] = await Promise.all([
        supabase
          .from("assessment_sessions")
          .select("session_id")
          .eq("student_id", studentId)
          .not("completed_at", "is", null)
          .limit(1),
        supabase
          .from("internship_interest_completions")
          .select("student_id")
          .eq("student_id", studentId)
          .maybeSingle(),
        supabase.from("aptitude_results").select("band").eq("student_id", studentId),
        surveyIds.length
          ? supabase
              .from("survey_responses")
              .select("assignment_id, completed_at")
              .eq("student_id", studentId)
              .in("assignment_id", surveyIds)
          : Promise.resolve({ data: [] as Array<{ assignment_id: string; completed_at: string | null }> }),
        surveyIds.length
          ? supabase.from("survey_assignments").select("id, title").in("id", surveyIds)
          : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
      ]);
      if (cancelled) return;

      const riasecDone = ((sess ?? []) as unknown[]).length > 0;
      const internDone = !!intern;
      const aptBands = new Set(((apt ?? []) as Array<{ band: string }>).map((a) => a.band));
      const surveyDone = new Set<string>();
      for (const r of (sr ?? []) as Array<{ assignment_id: string; completed_at: string | null }>) {
        if (r.completed_at) surveyDone.add(r.assignment_id);
      }
      const surveyTitles: Record<string, string> = {};
      for (const s of (sv ?? []) as Array<{ id: string; title: string }>) surveyTitles[s.id] = s.title;

      const now = Date.now();
      const out: AssignmentItem[] = [];
      for (const t of raw) {
        const dest = assignmentDest(t.assessment_kind, t.survey_assignment_id);
        if (!dest) continue;
        // Scheduling window — hide outside [from, until].
        if (t.available_from && now < new Date(t.available_from).getTime()) continue;
        if (t.available_until && now > new Date(t.available_until).getTime()) continue;

        let done = false;
        switch (t.assessment_kind) {
          case "riasec":
            done = riasecDone;
            break;
          case "internship_interest":
            done = internDone;
            break;
          case "aptitude_ms":
            done = aptBands.has("MS");
            break;
          case "aptitude_hs":
            done = aptBands.has("HS");
            break;
          case "survey":
            done = !!(t.survey_assignment_id && surveyDone.has(t.survey_assignment_id));
            break;
        }

        const label =
          t.assessment_kind === "survey" && t.survey_assignment_id
            ? `STEM survey · ${surveyTitles[t.survey_assignment_id] ?? "Survey"}`
            : dest.label;

        out.push({
          id: t.id,
          kind: t.assessment_kind,
          surveyAssignmentId: t.survey_assignment_id,
          label,
          to: dest.to,
          params: dest.params,
          dueAt: t.due_at,
          availableFrom: t.available_from ?? null,
          availableUntil: t.available_until ?? null,
          notes: t.notes,
          done,
        });
      }
      if (cancelled) return;
      setItems(out);
      setHasInternshipAssignment(internshipAssigned);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const pending = items.filter((i) => !i.done);
  return { loading, items, pending, hasInternshipAssignment };
}
