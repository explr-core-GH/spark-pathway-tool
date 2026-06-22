import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { SURVEY_TYPE_LABEL, type SurveyType } from "@/lib/explr-stem";
import type { GroupKind } from "@/lib/admin-groups";

/**
 * GroupAssignPanel — assign assessments/surveys to ONE group, in its
 * workspace. Writes assessment_targets rows that cascade to the group's
 * students:
 *   camps        → target_type 'camp',       target_id = camp uuid
 *   classes      → target_type 'class',      target_id = class uuid
 *   internships  → target_type 'internship', target_slug = slug (target_id null)
 *
 * Uses the untyped `sb()` accessor because target_slug / nullable target_id /
 * the 'class' + 'internship' target types are newer than the generated types.
 */

const sb = (table: string): any =>
  (supabase.from as unknown as (n: string) => any)(table);

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
  { kind: "internship_interest", label: "Internship interest survey" },
  { kind: "aptitude_ms", label: "Aptitude battery · Middle school" },
  { kind: "aptitude_hs", label: "Aptitude battery · High school" },
];

export function GroupAssignPanel({ kind, groupId }: { kind: GroupKind; groupId: string }) {
  const { user } = useSession();
  const [surveys, setSurveys] = useState<SurveyAssignment[]>([]);
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const match = useCallback(
    (q: any) =>
      kind === "internships"
        ? q.eq("target_type", "internship").eq("target_slug", groupId)
        : q.eq("target_type", kind === "camps" ? "camp" : "class").eq("target_id", groupId),
    [kind, groupId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: sv }, { data: tg }] = await Promise.all([
      supabase
        .from("survey_assignments")
        .select("id, title, survey_type, administration")
        .order("created_at", { ascending: false }),
      match(sb("assessment_targets").select("*")).order("created_at", { ascending: false }),
    ]);
    setSurveys((sv ?? []) as SurveyAssignment[]);
    setTargets((tg ?? []) as TargetRow[]);
    setLoading(false);
  }, [match]);

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
    const base: Record<string, unknown> =
      kind === "internships"
        ? { target_type: "internship", target_slug: groupId, target_id: null }
        : { target_type: kind === "camps" ? "camp" : "class", target_id: groupId };
    const rows = [...picked].map((key) => {
      const isSurvey = key.startsWith("survey:");
      const row: Record<string, unknown> = {
        ...base,
        assessment_kind: isSurvey ? "survey" : key,
        survey_assignment_id: isSurvey ? key.slice("survey:".length) : null,
        assigned_by: user?.id ?? null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        notes: notes.trim() || null,
      };
      if (availableFrom) row.available_from = new Date(availableFrom).toISOString();
      if (availableUntil) row.available_until = new Date(availableUntil).toISOString();
      return row;
    });
    const { error } = await sb("assessment_targets").insert(rows);
    setBusy(false);
    if (error) {
      alert(error.message);
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
    const { error } = await sb("assessment_targets").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  }

  const noun = kind === "camps" ? "camp" : kind === "classes" ? "class" : "internship";

  return (
    <div className="max-w-2xl">
      <div className="border border-charcoal-100 p-5">
        <h3 className="eyebrow" style={{ margin: 0 }}>
          Assign to this {noun}
        </h3>
        <div className="mt-3">
          <label className="label">Pick one or more</label>
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
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Available from (optional)</label>
            <input
              type="datetime-local"
              className="field mt-1"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Available until (optional)</label>
            <input
              type="datetime-local"
              className="field mt-1"
              value={availableUntil}
              onChange={(e) => setAvailableUntil(e.target.value)}
            />
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
          disabled={busy || picked.size === 0}
          className="btn-ink mt-4 disabled:opacity-40"
        >
          {busy ? "Assigning…" : `Assign ${picked.size || ""}`.trim()}
        </button>
      </div>

      <div className="mt-6">
        <h3 className="eyebrow">Assigned to this {noun}</h3>
        {loading ? (
          <p className="mt-3 text-sm text-charcoal-400">Loading…</p>
        ) : targets.length === 0 ? (
          <p className="mt-3 text-sm text-charcoal-400">Nothing assigned directly yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-charcoal-100 border-y border-charcoal-100">
            {targets.map((t) => (
              <li key={t.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{labelFor(t)}</p>
                  <p className="truncate text-xs text-charcoal-500">
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
                  onClick={() => remove(t.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
