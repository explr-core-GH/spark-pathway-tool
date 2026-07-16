import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { SURVEY_TYPE_LABEL, type SurveyType } from "@/lib/explr-stem";

/**
 * AssessmentAssignPanel — assign one or more assessments to a target.
 *
 * A target is one of:
 *   educator    — cascades to that educator's whole roster.
 *   camp        — cascades to every student linked to that camp session.
 *   class       — cascades to a teacher's class roster (class_students).
 *   internship  — cascades to the internship's placed students.
 *   student     — one specific kid; for individualized / one-off needs.
 *
 * Writes rows to assessment_targets. Lives as the "Assign" tab of the
 * Assessments admin page, and mirrors the per-group assign UI in the entity
 * workspaces.
 */

// Untyped accessor for tables/columns newer than the generated types
// (classes, assessment_targets.target_slug / nullable target_id).
const sb = (table: string): any =>
  (supabase.from as unknown as (n: string) => any)(table);

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
  target_slug: string | null;
  due_at: string | null;
  available_from: string | null;
  available_until: string | null;
  notes: string | null;
  created_at: string;
};

type CampSession = { id: string; title: string; date: string | null };
type ClassRow = { id: string; name: string; grade: number | null };
type InternshipRow = { slug: string; name: string };
type TargetType = "educator" | "student" | "camp" | "class" | "internship";

// The four fixed (non-survey) assessment kinds.
const FIXED_KINDS: Array<{ kind: string; label: string }> = [
  { kind: "riasec", label: "RIASEC interest assessment" },
  { kind: "internship_interest", label: "Internship interest survey" },
  { kind: "aptitude_ms", label: "Aptitude battery · Middle school" },
  { kind: "aptitude_hs", label: "Aptitude battery · High school" },
];

const TARGET_CHOICES: Array<{ key: TargetType; label: string }> = [
  { key: "educator", label: "Educator (whole roster)" },
  { key: "camp", label: "Camp session (whole roster)" },
  { key: "class", label: "Class (whole roster)" },
  { key: "internship", label: "Internship (placed students)" },
  { key: "student", label: "Individual student" },
];

const TARGET_NOUN: Record<TargetType, string> = {
  educator: "an educator",
  camp: "a camp session",
  class: "a class",
  internship: "an internship",
  student: "a student",
};

export function AssessmentAssignPanel() {
  const { user } = useSession();
  const [educators, setEducators] = useState<Educator[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [camps, setCamps] = useState<CampSession[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [internships, setInternships] = useState<InternshipRow[]>([]);
  const [surveys, setSurveys] = useState<SurveyAssignment[]>([]);
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [loading, setLoading] = useState(true);

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
    const [{ data: ed }, { data: st }, { data: cp }, { data: sv }, { data: tg }, { data: ins }] =
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
        supabase
          .from("explr_camps")
          .select("id, title, date")
          .order("date", { ascending: true }),
        supabase
          .from("survey_assignments")
          .select("id, title, survey_type, administration")
          .order("created_at", { ascending: false }),
        // select("*") so the window + target_slug columns degrade gracefully
        // before their migrations are applied.
        supabase
          .from("assessment_targets")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("internships").select("slug, name").order("sort_order").order("name"),
      ]);
    // Classes are newer than the generated types — read via the cast and
    // degrade to empty if the migration isn't applied yet.
    const { data: cl } = await sb("classes").select("id, name, grade").order("name");

    setEducators((ed ?? []) as Educator[]);
    setStudents((st ?? []) as Student[]);
    setCamps((cp ?? []) as CampSession[]);
    setSurveys((sv ?? []) as SurveyAssignment[]);
    setTargets((tg ?? []) as unknown as TargetRow[]);
    setInternships((ins ?? []) as InternshipRow[]);
    setClasses((cl ?? []) as ClassRow[]);
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
        students.map((s) => [s.id, `${s.first_name ?? "Student"} · grade ${s.grade}`]),
      ),
    [students],
  );
  const campName = useMemo(() => new Map(camps.map((c) => [c.id, c.title])), [camps]);
  const className = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);
  const internshipName = useMemo(
    () => new Map(internships.map((i) => [i.slug, i.name])),
    [internships],
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
    if (picked.size === 0 || targetIds.length === 0 || busy) return;
    setBusy(true);
    const isInternship = targetType === "internship";
    // One row per assessment × target — assigning the RIASEC + a survey to
    // five camps creates ten rows in one click.
    const rows = targetIds.flatMap((tid) =>
      [...picked].map((key) => {
        const isSurvey = key.startsWith("survey:");
        const row: Record<string, unknown> = {
          assessment_kind: isSurvey ? "survey" : key,
          survey_assignment_id: isSurvey ? key.slice("survey:".length) : null,
          target_type: targetType,
          // Internships are slug-keyed → target_slug; everything else uuid → target_id.
          target_id: isInternship ? null : tid,
          assigned_by: user?.id ?? null,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
          notes: notes.trim() || null,
        };
        if (isInternship) row.target_slug = tid;
        if (availableFrom) row.available_from = new Date(availableFrom).toISOString();
        if (availableUntil) row.available_until = new Date(availableUntil).toISOString();
        return row;
      }),
    );
    const { error } = await sb("assessment_targets").insert(rows);
    setBusy(false);
    if (error) {
      alert(error.message);
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
    const { error } = await supabase.from("assessment_targets").delete().eq("id", id);
    if (error) {
      alert(error.message);
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
          : targetType === "internship"
            ? internships.map((i) => ({ id: i.slug, label: i.name }))
            : students.map((s) => ({
                id: s.id,
                label: `${s.first_name ?? "Student"} · grade ${s.grade}`,
              }));

  function labelForKind(t: TargetRow): string {
    if (t.assessment_kind === "survey") {
      const s = surveys.find((x) => x.id === t.survey_assignment_id);
      return s ? `STEM survey · ${s.title}` : "STEM survey";
    }
    return (
      FIXED_KINDS.find((k) => k.kind === t.assessment_kind)?.label ?? t.assessment_kind
    );
  }

  function targetDescription(t: TargetRow): string {
    switch (t.target_type) {
      case "educator":
        return `Educator: ${eduName.get(t.target_id ?? "") ?? t.target_id} · whole roster`;
      case "camp":
        return `Camp: ${campName.get(t.target_id ?? "") ?? t.target_id} · whole roster`;
      case "class":
        return `Class: ${className.get(t.target_id ?? "") ?? t.target_id} · whole roster`;
      case "internship":
        return `Internship: ${internshipName.get(t.target_slug ?? "") ?? t.target_slug} · placed students`;
      case "student":
        return `Student: ${studName.get(t.target_id ?? "") ?? t.target_id}`;
      default:
        return t.target_type;
    }
  }

  return (
    <div>
      <p className="lead">
        Assign assessments to an educator or camp (cascades to the whole roster),
        a class or internship (its students), or an individual student.
      </p>

      {/* Sub-tabs — keep create vs. manage separate so the page doesn't
          turn into a wall of cards once a handful of things are assigned. */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-charcoal-100">
        {(
          [
            { id: "create" as const, label: "Create new" },
            { id: "manage" as const, label: `Manage existing (${targets.length})` },
          ]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className="border-b-2 px-4 py-2 text-sm transition-colors"
            style={{
              borderColor: subTab === t.id ? "var(--ink)" : "transparent",
              color: subTab === t.id ? "var(--ink)" : "var(--color-charcoal-400)",
              fontWeight: subTab === t.id ? 500 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "create" && (
        <>
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
                <div className="mt-1 inline-flex flex-wrap border border-charcoal-200">
                  {TARGET_CHOICES.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setTargetType(key);
                        setTargetIds([]);
                      }}
                      className="px-3 py-1.5 text-xs"
                      style={{
                        background: targetType === key ? "var(--ink)" : "white",
                        color: targetType === key ? "white" : "var(--color-charcoal-500)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">
                  {targetType === "educator"
                    ? "Educators"
                    : targetType === "camp"
                      ? "Camp sessions"
                      : targetType === "class"
                        ? "Classes"
                        : targetType === "internship"
                          ? "Internships"
                          : "Students"}{" "}
                  — pick one or more
                </label>
                <div className="mt-1 max-h-48 space-y-1 overflow-y-auto border border-charcoal-200 bg-white p-2">
                  {targetOptions.map((o) => (
                    <label key={o.id} className="flex items-center gap-2 px-1 py-0.5 text-sm">
                      <input
                        type="checkbox"
                        checked={targetIds.includes(o.id)}
                        onChange={(e) =>
                          setTargetIds((prev) =>
                            e.target.checked ? [...prev, o.id] : prev.filter((x) => x !== o.id),
                          )
                        }
                      />
                      {o.label}
                    </label>
                  ))}
                  {targetOptions.length === 0 && (
                    <p className="px-1 py-2 text-[11px] text-charcoal-400">
                      {targetType === "camp"
                        ? "No camp sessions synced yet — run an ExplrMore sync first."
                        : targetType === "class"
                          ? "No classes yet — create one under Classes."
                          : `No ${TARGET_NOUN[targetType].replace(/^an? /, "")} options yet.`}
                    </p>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-charcoal-400">
                  {targetIds.length} selected — every picked assessment goes to each one.
                </p>
              </div>
              <div>
                <label className="label">Available from (optional)</label>
                <input
                  type="datetime-local"
                  className="field mt-1"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-charcoal-400">
                  Before this, it&apos;s hidden from the student.
                </p>
              </div>
              <div>
                <label className="label">Available until (optional)</label>
                <input
                  type="datetime-local"
                  className="field mt-1"
                  value={availableUntil}
                  onChange={(e) => setAvailableUntil(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-charcoal-400">
                  After this, it disappears from the dashboard.
                </p>
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
              disabled={busy || picked.size === 0 || targetIds.length === 0}
              className="btn-ink mt-5 disabled:opacity-40"
            >
              {busy
                ? "Assigning…"
                : `Assign ${picked.size || ""} assessment${picked.size === 1 ? "" : "s"} to ${targetIds.length || ""} target${targetIds.length === 1 ? "" : "s"}`}
            </button>
          </section>
        </>
      )}

      {subTab === "manage" && (
        <section className="mt-8">
          <h3 className="eyebrow">Current assignments</h3>
          {loading ? (
            <p className="mt-4 text-sm text-charcoal-400">Loading…</p>
          ) : targets.length === 0 ? (
            <p className="mt-4 text-sm text-charcoal-400">Nothing assigned yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
              {targets.map((t) => (
                <li key={t.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{labelForKind(t)}</p>
                    <p className="truncate text-xs text-charcoal-500">
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
      )}
    </div>
  );
}
