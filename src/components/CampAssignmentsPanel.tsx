import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * CampAssignmentsPanel — for a single camp session, lists every
 * assessment/survey currently assigned to its roster, where the
 * assignment came from (direct camp target vs. cascaded via an
 * educator), and how many of the camp's students have completed it.
 *
 * Used in the expanded view on /educator/admin/camp-logins so an admin
 * can pull up a camp and see, at a glance, what its kids should be
 * doing — and how far along they are.
 *
 * Completion counts:
 *   survey              — survey_responses.completed_at, scoped to the
 *                         specific survey_assignments row.
 *   riasec              — assessment_sessions.completed_at, any session.
 *   internship_interest — internship_interest_completions row exists.
 *   aptitude_*          — not tracked here; shown as "—".
 */

type Props = {
  campId: string;
  studentIds: string[];
};

type Target = {
  id: string;
  assessment_kind: string;
  survey_assignment_id: string | null;
  target_type: "camp" | "educator";
  target_id: string;
  due_at: string | null;
  notes: string | null;
  created_at: string;
};

type EnrichedTarget = Target & {
  /** Pretty title for the row */
  title: string;
  /** Where this assignment came from, in human terms */
  via: string;
  /** Completed count among the camp's students, or null if not tracked */
  completed: number | null;
};

const FIXED_LABELS: Record<string, string> = {
  riasec: "RIASEC interest assessment",
  internship_interest: "Internship interest survey",
  aptitude_ms: "Aptitude battery · Middle school",
  aptitude_hs: "Aptitude battery · High school",
};

export function CampAssignmentsPanel({ campId, studentIds }: Props) {
  const [rows, setRows] = useState<EnrichedTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const total = studentIds.length;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // 1. Direct camp-targeted assignments.
      const { data: campTargets } = await supabase
        .from("assessment_targets")
        .select(
          "id, assessment_kind, survey_assignment_id, target_type, target_id, due_at, notes, created_at",
        )
        .eq("target_type", "camp")
        .eq("target_id", campId);

      // 2. Educator-cascaded: educators of this camp → their assignments.
      const { data: ece } = await supabase
        .from("explr_camp_educators")
        .select("educator_id")
        .eq("explr_camp_id", campId);
      const educatorIds = [
        ...new Set(
          ((ece ?? []) as Array<{ educator_id: string }>).map(
            (r) => r.educator_id,
          ),
        ),
      ];
      let eduTargets: Target[] = [];
      let educatorNames: Map<string, string> = new Map();
      if (educatorIds.length > 0) {
        const [{ data: viaEdu }, { data: educators }] = await Promise.all([
          supabase
            .from("assessment_targets")
            .select(
              "id, assessment_kind, survey_assignment_id, target_type, target_id, due_at, notes, created_at",
            )
            .eq("target_type", "educator")
            .in("target_id", educatorIds),
          supabase
            .from("educators")
            .select("id, full_name")
            .in("id", educatorIds),
        ]);
        eduTargets = (viaEdu ?? []) as Target[];
        educatorNames = new Map(
          ((educators ?? []) as Array<{ id: string; full_name: string }>).map(
            (e) => [e.id, e.full_name],
          ),
        );
      }

      const allTargets: Target[] = [
        ...((campTargets ?? []) as Target[]),
        ...eduTargets,
      ];

      // 3. Survey titles for any survey-kind targets.
      const surveyIds = [
        ...new Set(
          allTargets
            .map((t) => t.survey_assignment_id)
            .filter((x): x is string => !!x),
        ),
      ];
      const surveyTitles = new Map<string, string>();
      if (surveyIds.length > 0) {
        const { data: sv } = await supabase
          .from("survey_assignments")
          .select("id, title")
          .in("id", surveyIds);
        for (const s of (sv ?? []) as Array<{ id: string; title: string }>) {
          surveyTitles.set(s.id, s.title);
        }
      }

      // 4. Completion counts — different table per assessment kind.
      const kinds = new Set(allTargets.map((t) => t.assessment_kind));
      let riasecDone = 0;
      let interestDone = 0;
      const surveyDone = new Map<string, number>(); // survey_assignment_id → count

      if (studentIds.length > 0) {
        // Supabase builder chains return PromiseLike (not full Promise),
        // so widen the array type to match.
        const queries: Array<PromiseLike<unknown>> = [];
        if (kinds.has("riasec")) {
          queries.push(
            supabase
              .from("assessment_sessions")
              .select("student_id", { count: "exact", head: true })
              .in("student_id", studentIds)
              .not("completed_at", "is", null)
              .then(({ count }) => {
                riasecDone = count ?? 0;
              }),
          );
        }
        if (kinds.has("internship_interest")) {
          queries.push(
            supabase
              .from("internship_interest_completions")
              .select("student_id", { count: "exact", head: true })
              .in("student_id", studentIds)
              .then(({ count }) => {
                interestDone = count ?? 0;
              }),
          );
        }
        if (kinds.has("survey") && surveyIds.length > 0) {
          queries.push(
            supabase
              .from("survey_responses")
              .select("assignment_id, student_id")
              .in("assignment_id", surveyIds)
              .in("student_id", studentIds)
              .not("completed_at", "is", null)
              .then(({ data }) => {
                for (const r of (data ?? []) as Array<{
                  assignment_id: string;
                }>) {
                  surveyDone.set(
                    r.assignment_id,
                    (surveyDone.get(r.assignment_id) ?? 0) + 1,
                  );
                }
              }),
          );
        }
        await Promise.all(queries);
      }

      if (cancelled) return;

      // 5. Enrich for display, de-duped by row id.
      const seen = new Set<string>();
      const enriched: EnrichedTarget[] = [];
      for (const t of allTargets) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);

        let title: string;
        let completed: number | null = null;
        if (t.assessment_kind === "survey") {
          const sId = t.survey_assignment_id ?? "";
          title = `STEM survey · ${surveyTitles.get(sId) ?? "Survey"}`;
          completed = surveyDone.get(sId) ?? 0;
        } else {
          title = FIXED_LABELS[t.assessment_kind] ?? t.assessment_kind;
          if (t.assessment_kind === "riasec") completed = riasecDone;
          else if (t.assessment_kind === "internship_interest")
            completed = interestDone;
        }

        const via =
          t.target_type === "camp"
            ? "Assigned to camp"
            : `Via ${educatorNames.get(t.target_id) ?? "educator"}`;

        enriched.push({ ...t, title, via, completed });
      }
      enriched.sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      );
      setRows(enriched);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [campId, studentIds.join(",")]);

  if (loading) {
    return <p className="text-sm text-charcoal-400">Loading assignments…</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-charcoal-400">
        Nothing assigned to this camp yet. Use{" "}
        <span className="text-charcoal-600">Admin → Tools → Assessments</span>{" "}
        to add one.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-charcoal-100 border-y border-charcoal-100">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{r.title}</p>
            <p className="truncate text-xs text-charcoal-500">
              {r.via}
              {r.due_at
                ? ` · due ${new Date(r.due_at).toLocaleDateString()}`
                : ""}
              {r.notes ? ` · ${r.notes}` : ""}
            </p>
          </div>
          <span className="shrink-0 text-xs tabular-nums text-charcoal-600">
            {r.completed == null
              ? "—"
              : `${r.completed} / ${total} done`}
          </span>
        </li>
      ))}
    </ul>
  );
}
