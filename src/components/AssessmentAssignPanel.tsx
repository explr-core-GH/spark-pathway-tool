import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { SURVEY_TYPE_LABEL, type SurveyType } from "@/lib/explr-stem";

/**
 * AssessmentAssignPanel — assign one or more assessments to a target.
 *
 * A target is either an educator (the assignment cascades to their whole
 * roster) or an individual student (for kids not attached to an educator
 * or one-off / individualized needs). Writes rows to assessment_targets.
 *
 * Lives as the "Assign" tab of the Assessments admin page.
 */

// Inline call keeps `this` bound to the supabase client.
const sb = (table: string) =>
  (supabase.from as (n: string) => ReturnType<typeof supabase.from>)(table);

type Educator = { id: string; full_name: string; email: string };
type Student = { id: string; first_name: string | null; grade: number };
type SurveyAssignment = {
  id: string;
  title: string;
  survey_type: SurveyType;
  administration: string;
};
type TargetRow = {
  id: string;
  assessment_kind: string;
  survey_assignment_id: string | null;
  target_type: "educator" | "student";
  target_id: string;
  due_at: string | null;
  notes: string | null;
  created_at: string;
};

// The four fixed (non-survey) assessment kinds.
const FIXED_KINDS: Array<{ kind: string; label: string }> = [
  { kind: "riasec", label: "RIASEC interest assessment" },
  { kind: "internship_interest", label: "Internship interest survey" },
  { kind: "aptitude_ms", label: "Aptitude battery · Middle school" },
  { kind: "aptitude_hs", label: "Aptitude battery · High school" },
];

export function AssessmentAssignPanel() {
  const { user } = useSession();
  const [educators, setEducators] = useState<Educator[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [surveys, setSurveys] = useState<SurveyAssignment[]>([]);
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [targetType, setTargetType] = useState<"educator" | "student">(
    "educator",
  );
  const [targetId, setTargetId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: ed }, { data: st }, { data: sv }, { data: tg }] =
      await Promise.all([
        supabase
          .from("educators")
          .select("id, full_name, email")
          .eq("approved", true)
          .order("full_name"),
        supabase
          .from("students")
          .select("id, first_name, grade")
          .order("first_name"),
        sb("survey_assignments")
          .select("id, title, survey_type, administration")
          .order("created_at", { ascending: false }),
        sb("assessment_targets")
          .select(
            "id, assessment_kind, survey_assignment_id, target_type, target_id, due_at, notes, created_at",
          )
          .order("created_at", { ascending: false }),
      ]);
    setEducators((ed ?? []) as Educator[]);
    setStudents((st ?? []) as Student[]);
    setSurveys((sv ?? []) as SurveyAssignment[]);
    setTargets((tg ?? []) as TargetRow[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  // Selectable assessment options: the 4 fixed kinds + every survey
  // assignment. Key form: "riasec" / "survey:<surveyAssignmentId>".
  const options = useMemo(() => {
    const opts: Array<{ key: string; label: string }> = FIXED_KINDS.map(
      (k) => ({ key: k.kind, label: k.label }),
    );
    for (const s of surveys) {
      opts.push({
        key: `survey:${s.id}`,
        label: `STEM survey · ${s.title} (${SURVEY_TYPE_LABEL[s.survey_type]}, ${s.administration})`,
      });
    }
    return opts;
  }, [surveys]);

  const eduName = useMemo(
    () => new Map(educators.map((e) => [e.id, e.full_name])),
    [educators],
  );
  const studName = useMemo(
    () =>
      new Map(
        students.map((s) => [
          s.id,
          `${s.first_name ?? "Student"} · grade ${s.grade}`,
        ]),
      ),
    [students],
  );

  function toggle(key: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function assign() {
    if (picked.size === 0 || !targetId || busy) return;
    setBusy(true);
    const rows = [...picked].map((key) => {
      const isSurvey = key.startsWith("survey:");
      return {
        assessment_kind: isSurvey ? "survey" : key,
        survey_assignment_id: isSurvey ? key.slice("survey:".length) : null,
        target_type: targetType,
        target_id: targetId,
        assigned_by: user?.id ?? null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        notes: notes.trim() || null,
      };
    });
    const { error } = await sb("assessment_targets").insert(rows as never);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    setPicked(new Set());
    setDueAt("");
    setNotes("");
    await load();
  }

  async function remove(id: string) {
    const { error } = await sb("assessment_targets").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    await load();
  }

  function labelForKind(t: TargetRow): string {
    if (t.assessment_kind === "survey") {
      const s = surveys.find((x) => x.id === t.survey_assignment_id);
      return s ? `STEM survey · ${s.title}` : "STEM survey";
    }
    return (
      FIXED_KINDS.find((k) => k.kind === t.assessment_kind)?.label ??
      t.assessment_kind
    );
  }

  return (
    <div>
      <p className="lead">
        Assign assessments to an educator — it cascades to their whole roster —
        or to an individual student for one-off and individualized needs.
      </p>

      {/* Create form */}
      <section className="mt-8 border border-charcoal-100 p-6">
        <h3 className="eyebrow">New assignment</h3>

        {/* assessment multi-select */}
        <div className="mt-4">
          <label className="label">Assessments — pick one or more</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {options.map((o) => {
              const on = picked.has(o.key);
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => toggle(o.key)}
                  className="border px-3 py-1.5 text-xs"
                  style={
                    on
                      ? { background: "var(--ink)", color: "white", borderColor: "var(--ink)" }
                      : { borderColor: "var(--color-charcoal-200)" }
                  }
                >
                  {o.label}
                </button>
              );
            })}
            {options.length === 0 && (
              <p className="text-xs text-charcoal-400">No assessments found.</p>
            )}
          </div>
        </div>

        {/* target */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Assign to</label>
            <div className="mt-1 inline-flex border border-charcoal-200">
              {(["educator", "student"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTargetType(t);
                    setTargetId("");
                  }}
                  className="px-3 py-1.5 text-xs"
                  style={{
                    background: targetType === t ? "var(--ink)" : "white",
                    color: targetType === t ? "white" : "var(--color-charcoal-500)",
                  }}
                >
                  {t === "educator" ? "Educator (whole roster)" : "Individual student"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">
              {targetType === "educator" ? "Educator" : "Student"}
            </label>
            <select
              className="field mt-1"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              <option value="">
                Pick {targetType === "educator" ? "an educator" : "a student"}…
              </option>
              {targetType === "educator"
                ? educators.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} · {e.email}
                    </option>
                  ))
                : students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name ?? "Student"} · grade {s.grade}
                    </option>
                  ))}
            </select>
          </div>
          <div>
            <label className="label">Due date (optional)</label>
            <input
              type="date"
              className="field mt-1"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <input
              className="field mt-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Shown with the assignment"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={assign}
          disabled={busy || picked.size === 0 || !targetId}
          className="btn-ink mt-5 disabled:opacity-40"
        >
          {busy
            ? "Assigning…"
            : `Assign ${picked.size || ""} assessment${picked.size === 1 ? "" : "s"}`}
        </button>
      </section>

      {/* Existing targets */}
      <section className="mt-10">
        <h3 className="eyebrow">Current assignments</h3>
        {loading ? (
          <p className="mt-4 text-sm text-charcoal-400">Loading…</p>
        ) : targets.length === 0 ? (
          <p className="mt-4 text-sm text-charcoal-400">
            Nothing assigned yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
            {targets.map((t) => (
              <li key={t.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {labelForKind(t)}
                  </p>
                  <p className="truncate text-xs text-charcoal-500">
                    {t.target_type === "educator"
                      ? `Educator: ${eduName.get(t.target_id) ?? t.target_id} · whole roster`
                      : `Student: ${studName.get(t.target_id) ?? t.target_id}`}
                    {t.due_at
                      ? ` · due ${new Date(t.due_at).toLocaleDateString()}`
                      : ""}
                    {t.notes ? ` · ${t.notes}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => remove(t.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
