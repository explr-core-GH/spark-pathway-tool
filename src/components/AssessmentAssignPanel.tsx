import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { SURVEY_TYPE_LABEL, type SurveyType } from "@/lib/explr-stem";

/**
 * AssessmentAssignPanel — assign one or more assessments to a target.
 *
 * A target is one of:
 *   educator  — cascades to that instructor's camps and classes.
 *   camp      — cascades to every student linked to that camp session.
 *   class     — cascades to the class roster (class_students).
 *   student   — one specific kid; for individualized / one-off needs.
 *
 * Writes rows to assessment_targets. Lives as the "Assign" tab of the
 * Assessments admin page, and mirrors the per-group assign UI in the group
 * workspaces (GroupAssignPanel).
 */

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
  target_type: string;
  target_id: string | null;
  due_at: string | null;
  available_from: string | null;
  available_until: string | null;
  notes: string | null;
  created_at: string;
};

type CampSession = { id: string; title: string; date: string | null };
type ClassRow = { id: string; name: string; grade: number | null };
type TargetType = "educator" | "student" | "camp" | "class";

// The fixed (non-survey) assessment kinds. Survey administrations are added
// dynamically from survey_assignments.
const FIXED_KINDS: Array<{ kind: string; label: string }> = [
  { kind: "riasec", label: "RIASEC interest assessment" },
];

const TARGET_CHOICES: Array<{ key: TargetType; label: string }> = [
  { key: "educator", label: "Instructor" },
  { key: "camp", label: "Camp session" },
  { key: "class", label: "Class" },
  { key: "student", label: "Student" },
];

const TARGET_LIST_LABEL: Record<TargetType, string> = {
  educator: "Instructors",
  camp: "Camp sessions",
  class: "Classes",
  student: "Students",
};

export function AssessmentAssignPanel() {
  const { user } = useSession();
  const [educators, setEducators] = useState<Educator[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [camps, setCamps] = useState<CampSession[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [surveys, setSurveys] = useState<SurveyAssignment[]>([]);
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Split the panel into two sub-tabs so the create form and the list of
  // existing assignments don't compete for screen space.
  const [subTab, setSubTab] = useState<"create" | "manage">("create");

  // form state
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [targetType, setTargetType] = useState<TargetType>("educator");
  // Multiple targets can be picked — one row per assessment × target.
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [dueAt, setDueAt] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: ed }, { data: st }, { data: cp }, { data: cl }, { data: sv }, { data: tg }] =
      await Promise.all([
        supabase
          .from("educators")
          .select("id, full_name, email")
          .eq("approved", true)
          .order("full_name"),
        supabase.from("students").select("id, first_name, grade").order("first_name"),
        supabase.from("explr_camps").select("id, title, date").order("date", { ascending: true }),
        supabase.from("classes").select("id, name, grade").order("name"),
        supabase
          .from("survey_assignments")
          .select("id, title, survey_type, administration")
          .order("created_at", { ascending: false }),
        supabase.from("assessment_targets").select("*").order("created_at", { ascending: false }),
      ]);

    setEducators((ed ?? []) as Educator[]);
    setStudents((st ?? []) as Student[]);
    setCamps((cp ?? []) as CampSession[]);
    setClasses((cl ?? []) as ClassRow[]);
    setSurveys((sv ?? []) as SurveyAssignment[]);
    setTargets((tg ?? []) as unknown as TargetRow[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  // Selectable assessment options: the fixed kinds + every survey
  // administration. Key form: "riasec" / "survey:<surveyAssignmentId>".
  const options = useMemo(() => {
    const opts: Array<{ key: string; label: string }> = FIXED_KINDS.map((k) => ({
      key: k.kind,
      label: k.label,
    }));
    for (const s of surveys) {
      opts.push({
        key: `survey:${s.id}`,
        label: `STEM survey · ${s.title} (${SURVEY_TYPE_LABEL[s.survey_type]}, ${s.administration})`,
      });
    }
    return opts;
  }, [surveys]);

  const eduName = useMemo(() => new Map(educators.map((e) => [e.id, e.full_name])), [educators]);
  const studName = useMemo(
    () => new Map(students.map((s) => [s.id, `${s.first_name ?? "Student"} · grade ${s.grade}`])),
    [students],
  );
  const campName = useMemo(() => new Map(camps.map((c) => [c.id, c.title])), [camps]);
  const className = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);

  function toggle(key: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function assign() {
    if (picked.size === 0 || targetIds.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    // One row per assessment × target — assigning the RIASEC + a survey to
    // five camps creates ten rows in one click.
    const rows = targetIds.flatMap((tid) =>
      [...picked].map((key) => {
        const isSurvey = key.startsWith("survey:");
        return {
          assessment_kind: isSurvey ? "survey" : key,
          survey_assignment_id: isSurvey ? key.slice("survey:".length) : null,
          target_type: targetType,
          target_id: tid,
          assigned_by: user?.id ?? null,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
          available_from: availableFrom ? new Date(availableFrom).toISOString() : null,
          available_until: availableUntil ? new Date(availableUntil).toISOString() : null,
          notes: notes.trim() || null,
        };
      }),
    );
    const { error: err } = await supabase.from("assessment_targets").insert(rows);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setPicked(new Set());
    setTargetIds([]);
    setDueAt("");
    setAvailableFrom("");
    setAvailableUntil("");
    setNotes("");
    await load();
  }

  async function remove(id: string) {
    setError(null);
    const { error: err } = await supabase.from("assessment_targets").delete().eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    await load();
  }

  const targetOptions: Array<{ id: string; label: string }> =
    targetType === "educator"
      ? educators.map((e) => ({ id: e.id, label: `${e.full_name} · ${e.email}` }))
      : targetType === "camp"
        ? camps.map((c) => ({
            id: c.id,
            label: `${c.title}${c.date ? ` · ${new Date(c.date).toLocaleDateString()}` : ""}`,
          }))
        : targetType === "class"
          ? classes.map((c) => ({
              id: c.id,
              label: `${c.name}${c.grade != null ? ` · grade ${c.grade}` : ""}`,
            }))
          : students.map((s) => ({
              id: s.id,
              label: `${s.first_name ?? "Student"} · grade ${s.grade}`,
            }));

  function labelForKind(t: TargetRow): string {
    if (t.assessment_kind === "survey") {
      const s = surveys.find((x) => x.id === t.survey_assignment_id);
      return s ? `STEM survey · ${s.title}` : "STEM survey";
    }
    return FIXED_KINDS.find((k) => k.kind === t.assessment_kind)?.label ?? t.assessment_kind;
  }

  function targetDescription(t: TargetRow): string {
    switch (t.target_type) {
      case "educator":
        return `Instructor: ${eduName.get(t.target_id ?? "") ?? t.target_id} · their camps & classes`;
      case "camp":
        return `Camp: ${campName.get(t.target_id ?? "") ?? t.target_id} · whole roster`;
      case "class":
        return `Class: ${className.get(t.target_id ?? "") ?? t.target_id} · whole roster`;
      case "student":
        return `Student: ${studName.get(t.target_id ?? "") ?? t.target_id}`;
      default:
        return t.target_type;
    }
  }

  const emptyTargetHint =
    targetType === "camp"
      ? "No camp sessions synced yet — run an ExplrMore sync first."
      : targetType === "class"
        ? "No classes yet — create one under Groups."
        : targetType === "educator"
          ? "No approved instructors yet."
          : "No students yet.";

  return (
    <div>
      <p className="max-w-2xl text-sm text-ink-700">
        Assign the RIASEC interest assessment or a STEM survey to an instructor (cascades to their
        camps and classes), a camp session or class (whole roster), or an individual student.
      </p>

      {/* Sub-tabs — keep create vs. manage separate so the page doesn't
          turn into a wall of cards once a handful of things are assigned. */}
      <div className="mt-6 flex flex-wrap gap-2">
        {[
          { id: "create" as const, label: "Create new" },
          { id: "manage" as const, label: `Manage existing (${targets.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            aria-pressed={subTab === t.id}
            className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium transition-colors ${
              subTab === t.id
                ? "border-ink-900 bg-ink-900 text-paper"
                : "border-line-strong text-ink-700 hover:border-ink-900 hover:text-ink-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {subTab === "create" && (
        <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
              <ClipboardList className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
            </span>
            <div>
              <p className="eyebrow">New assignment</p>
              <h3 className="mt-1 font-display text-xl font-semibold">What, and to whom</h3>
            </div>
          </div>

          {/* assessment multi-select */}
          <div className="mt-6">
            <p className="label" id="assign-assessments-label">
              Assessments — pick one or more
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-labelledby="assign-assessments-label"
            >
              {options.map((o) => {
                const on = picked.has(o.key);
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => toggle(o.key)}
                    aria-pressed={on}
                    className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium transition-colors ${
                      on
                        ? "border-ink-900 bg-ink-900 text-paper"
                        : "border-line-strong text-ink-700 hover:border-ink-900 hover:text-ink-900"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
              {options.length === 0 && (
                <p className="text-sm text-ink-500">No assessments found.</p>
              )}
            </div>
          </div>

          {/* target */}
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="label" id="assign-target-type-label">
                Assign to
              </p>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-labelledby="assign-target-type-label"
              >
                {TARGET_CHOICES.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setTargetType(key);
                      setTargetIds([]);
                    }}
                    aria-pressed={targetType === key}
                    className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium transition-colors ${
                      targetType === key
                        ? "border-ink-900 bg-ink-900 text-paper"
                        : "border-line-strong text-ink-700 hover:border-ink-900 hover:text-ink-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <fieldset className="sm:col-span-2">
              <legend className="label">{TARGET_LIST_LABEL[targetType]} — pick one or more</legend>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-[var(--radius-control)] border border-line bg-paper p-2">
                {targetOptions.map((o) => (
                  <label
                    key={o.id}
                    className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-[var(--radius-stamp)] px-2 text-sm hover:bg-paper-sunken"
                  >
                    <input
                      type="checkbox"
                      className="h-5 w-5 shrink-0 accent-green-deep"
                      checked={targetIds.includes(o.id)}
                      onChange={(e) =>
                        setTargetIds((prev) =>
                          e.target.checked ? [...prev, o.id] : prev.filter((x) => x !== o.id),
                        )
                      }
                    />
                    <span className="min-w-0 truncate">{o.label}</span>
                  </label>
                ))}
                {targetOptions.length === 0 && (
                  <p className="px-2 py-3 text-sm text-ink-500">{emptyTargetHint}</p>
                )}
              </div>
              <p
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-500"
                aria-live="polite"
              >
                <Users className="h-3.5 w-3.5" aria-hidden />
                {targetIds.length} selected — every picked assessment goes to each one.
              </p>
            </fieldset>
            <div>
              <label className="label" htmlFor="assign-from">
                Available from (optional)
              </label>
              <input
                id="assign-from"
                type="datetime-local"
                className="field"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-ink-500">
                Before this, it&apos;s hidden from the student.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="assign-until">
                Available until (optional)
              </label>
              <input
                id="assign-until"
                type="datetime-local"
                className="field"
                value={availableUntil}
                onChange={(e) => setAvailableUntil(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-ink-500">
                After this, it disappears from the dashboard.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="assign-due">
                Due date (optional)
              </label>
              <input
                id="assign-due"
                type="date"
                className="field"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="assign-note">
                Note (optional)
              </label>
              <input
                id="assign-note"
                className="field"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Shown with the assignment"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={assign}
            disabled={busy || picked.size === 0 || targetIds.length === 0}
            className="btn-ink mt-6 disabled:opacity-40"
          >
            {busy
              ? "Assigning…"
              : `Assign ${picked.size || ""} assessment${picked.size === 1 ? "" : "s"} to ${targetIds.length || ""} target${targetIds.length === 1 ? "" : "s"}`}
          </button>
        </section>
      )}

      {subTab === "manage" && (
        <section className="mt-6">
          <p className="eyebrow">Current assignments</p>
          {loading ? (
            <p role="status" className="mt-3 text-sm text-ink-500">
              Loading…
            </p>
          ) : targets.length === 0 ? (
            <p className="mt-3 text-sm text-ink-700">Nothing assigned yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper-raised">
              {targets.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{labelForKind(t)}</p>
                    <p className="truncate text-xs text-ink-700">
                      {targetDescription(t)}
                      {t.due_at ? ` · due ${new Date(t.due_at).toLocaleDateString()}` : ""}
                      {t.available_from
                        ? ` · from ${new Date(t.available_from).toLocaleString()}`
                        : ""}
                      {t.available_until
                        ? ` · until ${new Date(t.available_until).toLocaleString()}`
                        : ""}
                      {t.notes ? ` · ${t.notes}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(t.id)}
                    className="inline-flex min-h-[44px] items-center text-xs text-red-700 hover:underline"
                  >
                    Remove
                    <span className="sr-only">
                      {" "}
                      {labelForKind(t)} ({targetDescription(t)})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
