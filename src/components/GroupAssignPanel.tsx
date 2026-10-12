import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { SURVEY_TYPE_LABEL, type SurveyType } from "@/lib/explr-stem";
import type { GroupKind } from "@/lib/admin-groups";

/**
 * GroupAssignPanel — assign assessments/surveys to ONE group, in its
 * workspace. Writes assessment_targets rows that cascade to the group's
 * students:
 *   camps    → target_type 'camp',  target_id = camp uuid
 *   classes  → target_type 'class', target_id = class uuid
 */

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
  due_at: string | null;
  available_from: string | null;
  available_until: string | null;
  notes: string | null;
};

const FIXED_KINDS: Array<{ kind: string; label: string }> = [
  { kind: "riasec", label: "RIASEC interest assessment" },
];

export function GroupAssignPanel({ kind, groupId }: { kind: GroupKind; groupId: string }) {
  const { user } = useSession();
  const [surveys, setSurveys] = useState<SurveyAssignment[]>([]);
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const targetType = kind === "camps" ? "camp" : "class";
  const noun = kind === "camps" ? "camp" : "class";

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: sv }, { data: tg }] = await Promise.all([
      supabase
        .from("survey_assignments")
        .select("id, title, survey_type, administration")
        .order("created_at", { ascending: false }),
      supabase
        .from("assessment_targets")
        .select("*")
        .eq("target_type", targetType)
        .eq("target_id", groupId)
        .order("created_at", { ascending: false }),
    ]);
    setSurveys((sv ?? []) as SurveyAssignment[]);
    setTargets((tg ?? []) as TargetRow[]);
    setLoading(false);
  }, [targetType, groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const options = useMemo(() => {
    const opts = FIXED_KINDS.map((k) => ({ key: k.kind, label: k.label }));
    for (const s of surveys) {
      opts.push({
        key: `survey:${s.id}`,
        label: `STEM survey · ${s.title} (${SURVEY_TYPE_LABEL[s.survey_type]}, ${s.administration})`,
      });
    }
    return opts;
  }, [surveys]);

  function toggle(key: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function labelFor(t: TargetRow): string {
    if (t.assessment_kind === "survey") {
      const s = surveys.find((x) => x.id === t.survey_assignment_id);
      return s ? `STEM survey · ${s.title}` : "STEM survey";
    }
    return FIXED_KINDS.find((k) => k.kind === t.assessment_kind)?.label ?? t.assessment_kind;
  }

  async function assign() {
    if (picked.size === 0 || busy) return;
    setBusy(true);
    setError(null);
    const rows = [...picked].map((key) => {
      const isSurvey = key.startsWith("survey:");
      return {
        target_type: targetType,
        target_id: groupId,
        assessment_kind: isSurvey ? "survey" : key,
        survey_assignment_id: isSurvey ? key.slice("survey:".length) : null,
        assigned_by: user?.id ?? null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        available_from: availableFrom ? new Date(availableFrom).toISOString() : null,
        available_until: availableUntil ? new Date(availableUntil).toISOString() : null,
        notes: notes.trim() || null,
      };
    });
    const { error: err } = await supabase.from("assessment_targets").insert(rows);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setPicked(new Set());
    setAvailableFrom("");
    setAvailableUntil("");
    setDueAt("");
    setNotes("");
    load();
  }

  async function remove(id: string) {
    setError(null);
    const { error: err } = await supabase.from("assessment_targets").delete().eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    load();
  }

  return (
    <div className="max-w-2xl">
      <section className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
            <ClipboardList className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <p className="eyebrow">Assign to this {noun}</p>
            <h3 className="mt-1 font-display text-xl font-semibold">Pick one or more</h3>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
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
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor={`group-assign-from-${groupId}`}>
              Available from (optional)
            </label>
            <input
              id={`group-assign-from-${groupId}`}
              type="datetime-local"
              className="field"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor={`group-assign-until-${groupId}`}>
              Available until (optional)
            </label>
            <input
              id={`group-assign-until-${groupId}`}
              type="datetime-local"
              className="field"
              value={availableUntil}
              onChange={(e) => setAvailableUntil(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor={`group-assign-due-${groupId}`}>
              Due date (optional)
            </label>
            <input
              id={`group-assign-due-${groupId}`}
              type="date"
              className="field"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor={`group-assign-note-${groupId}`}>
              Note (optional)
            </label>
            <input
              id={`group-assign-note-${groupId}`}
              className="field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Shown with the assignment"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={assign}
          disabled={busy || picked.size === 0}
          className="btn-ink mt-6 disabled:opacity-40"
        >
          {busy ? "Assigning…" : `Assign ${picked.size || ""}`.trim()}
        </button>
      </section>

      <div className="mt-6">
        <p className="eyebrow">Assigned to this {noun}</p>
        {loading ? (
          <p role="status" className="mt-3 text-sm text-ink-500">
            Loading…
          </p>
        ) : targets.length === 0 ? (
          <p className="mt-3 text-sm text-ink-700">Nothing assigned directly yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper-raised">
            {targets.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{labelFor(t)}</p>
                  <p className="truncate text-xs text-ink-700">
                    {t.due_at ? `due ${new Date(t.due_at).toLocaleDateString()}` : "no due date"}
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
                  Remove<span className="sr-only"> {labelFor(t)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
