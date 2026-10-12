// Resolves the assessments/surveys a student has been assigned, with two
// behaviours the dashboard and the "assigned" pop-up share:
//
//   1. Scheduling window — assignments only count while now is within
//      [available_from, available_until]. Outside the window they're hidden.
//   2. Completion — each kind is checked against its own results table so we
//      can tell "still to do" from "already done".
//
// Targets resolve four ways: a direct student target, a camp target (via
// student_camp_links), a class target (via class_students), and an instructor
// target (the camp's instructors via explr_camp_educators, or the class's
// classes.educator_id).

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

// Where each assessment kind sends the student. Only two instruments exist:
// the RIASEC interest assessment and the STEM efficacy survey.
export function assignmentDest(
  kind: string,
  surveyAssignmentId: string | null,
): { label: string; to: string; params?: Record<string, string> } | null {
  switch (kind) {
    case "riasec":
      return { label: "RIASEC interest assessment", to: "/assessment" };
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

export type StudentAssignments = {
  loading: boolean;
  items: AssignmentItem[]; // active window only
  pending: AssignmentItem[]; // active && not done
};

export function useStudentAssignments(studentId: string | null): StudentAssignments {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AssignmentItem[]>([]);

  useEffect(() => {
    if (!studentId) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: direct } = await supabase
        .from("assessment_targets")
        .select("*")
        .eq("target_type", "student")
        .eq("target_id", studentId);

      const { data: links } = await supabase
        .from("student_camp_links")
        .select("explr_camp_id")
        .eq("student_id", studentId);
      const campIds = ((links ?? []) as Array<{ explr_camp_id: string }>).map(
        (l) => l.explr_camp_id,
      );

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
        const eduIds = [
          ...new Set(((ece ?? []) as Array<{ educator_id: string }>).map((r) => r.educator_id)),
        ];
        if (eduIds.length > 0) {
          const { data: viaEdu } = await supabase
            .from("assessment_targets")
            .select("*")
            .eq("target_type", "educator")
            .in("target_id", eduIds);
          cascade.push(...((viaEdu ?? []) as unknown as RawTarget[]));
        }
      }

      // Class targets: student → class_students → class targets, plus the
      // class instructor's targets.
      const { data: classLinks } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", studentId);
      const classIds = [
        ...new Set(((classLinks ?? []) as Array<{ class_id: string }>).map((l) => l.class_id)),
      ];
      if (classIds.length > 0) {
        const { data: viaClass } = await supabase
          .from("assessment_targets")
          .select("*")
          .eq("target_type", "class")
          .in("target_id", classIds);
        cascade.push(...((viaClass ?? []) as unknown as RawTarget[]));
        const { data: cls } = await supabase
          .from("classes")
          .select("educator_id")
          .in("id", classIds);
        const classEduIds = [
          ...new Set(
            ((cls ?? []) as Array<{ educator_id: string | null }>)
              .map((c) => c.educator_id)
              .filter(Boolean),
          ),
        ] as string[];
        if (classEduIds.length > 0) {
          const { data: viaClassEdu } = await supabase
            .from("assessment_targets")
            .select("*")
            .eq("target_type", "educator")
            .in("target_id", classEduIds);
          cascade.push(...((viaClassEdu ?? []) as unknown as RawTarget[]));
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

      // Completion sources — one query each, mapped below.
      const surveyIds = raw
        .filter((t) => t.assessment_kind === "survey" && t.survey_assignment_id)
        .map((t) => t.survey_assignment_id as string);

      const [{ data: sess }, { data: sr }, { data: sv }] = await Promise.all([
        supabase
          .from("assessment_sessions")
          .select("session_id")
          .eq("student_id", studentId)
          .not("completed_at", "is", null)
          .limit(1),
        surveyIds.length
          ? supabase
              .from("survey_responses")
              .select("assignment_id, completed_at")
              .eq("student_id", studentId)
              .in("assignment_id", surveyIds)
          : Promise.resolve({
              data: [] as Array<{ assignment_id: string; completed_at: string | null }>,
            }),
        surveyIds.length
          ? supabase.from("survey_assignments").select("id, title").in("id", surveyIds)
          : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
      ]);
      if (cancelled) return;

      const riasecDone = ((sess ?? []) as unknown[]).length > 0;
      const surveyDone = new Set<string>();
      for (const r of (sr ?? []) as Array<{ assignment_id: string; completed_at: string | null }>) {
        if (r.completed_at) surveyDone.add(r.assignment_id);
      }
      const surveyTitles: Record<string, string> = {};
      for (const s of (sv ?? []) as Array<{ id: string; title: string }>)
        surveyTitles[s.id] = s.title;

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
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const pending = items.filter((i) => !i.done);
  return { loading, items, pending };
}
