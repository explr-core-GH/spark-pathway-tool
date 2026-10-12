import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { School, Tent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchGroups,
  fetchCompletion,
  isGroupKind,
  KIND_META,
  type GroupKind,
  type GroupSummary,
  type Completion,
} from "@/lib/admin-groups";

export const Route = createFileRoute("/instructor/admin/groups/$kind/")({
  head: () => ({ meta: [{ title: "Groups — Admin" }] }),
  component: GroupGrid,
});

const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

function GroupGrid() {
  const { kind } = useParams({ from: "/instructor/admin/groups/$kind/" });
  if (!isGroupKind(kind)) {
    return (
      <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-red-700">Unknown group type “{kind}”.</p>
      </main>
    );
  }
  return <GroupGridInner kind={kind} />;
}

function GroupGridInner({ kind }: { kind: GroupKind }) {
  const meta = KIND_META[kind];
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [query, setQuery] = useState("");
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [creating, setCreating] = useState(false);

  async function load() {
    setSetupNeeded(false);
    setGroups(null);
    try {
      const gs = await fetchGroups(kind);
      const comp = await fetchCompletion(gs.flatMap((g) => g.studentIds));
      setGroups(gs);
      setCompletion(comp);
    } catch {
      // The classes tables may not be migrated yet.
      setSetupNeeded(true);
      setGroups([]);
      setCompletion(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = groups ?? [];
    if (!q) return list;
    return list.filter((g) => g.name.toLowerCase().includes(q) || g.meta.toLowerCase().includes(q));
  }, [groups, query]);

  return (
    <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="display mt-2">{meta.label}</h1>
          <p className="lead mt-3 max-w-2xl">
            Pick a {meta.singular.toLowerCase()} to see its overall results, then dive into students
            one by one.
          </p>
        </div>
        {meta.newLabel ? (
          <button type="button" className="btn-ink" onClick={() => setCreating(true)}>
            + {meta.newLabel}
          </button>
        ) : meta.createHint ? (
          <Link to={meta.createHint.to} className="btn-ghost text-sm">
            {meta.createHint.label}
          </Link>
        ) : null}
      </div>

      {groups && groups.length > 8 && (
        <div className="mt-8">
          <input
            className="field max-w-sm"
            aria-label={`Filter ${meta.label.toLowerCase()}`}
            placeholder={`Filter ${meta.label.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {groups === null ? (
        <p role="status" className="mt-10 text-sm text-ink-500">
          Loading…
        </p>
      ) : setupNeeded ? (
        <ClassesSetupNote />
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-paper-raised px-6 py-12 text-center">
          <p className="text-sm text-ink-700">
            {kind === "classes"
              ? "No classes yet. Create one to start grouping students."
              : `No rostered ${meta.label.toLowerCase()} yet.`}
          </p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <GroupCard key={g.id} kind={kind} group={g} completion={completion} />
          ))}
        </div>
      )}

      {creating && (
        <NewClassModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </main>
  );
}

function GroupCard({
  kind,
  group,
  completion,
}: {
  kind: GroupKind;
  group: GroupSummary;
  completion: Completion | null;
}) {
  const total = group.studentIds.length;
  const done = completion
    ? group.studentIds.filter((id) => completion.assessmentDone.has(id)).length
    : 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <Link
      to="/instructor/admin/groups/$kind/$id"
      params={{ kind, id: group.id }}
      className="flex flex-col rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card transition-colors hover:border-emerald focus-visible:border-emerald"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-[12px] border border-mint-soft bg-mint-tint text-green-deep shrink-0">
          {kind === "camps" ? (
            <Tent className="h-5 w-5" strokeWidth={2} aria-hidden />
          ) : (
            <School className="h-5 w-5" strokeWidth={2} aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold leading-tight text-ink-900">
            {group.name}
          </p>
          <p className="mt-1 h-4 truncate text-xs text-ink-500">{group.meta}</p>
        </div>
      </div>

      <div className="mt-5 flex items-baseline justify-between text-xs text-ink-500">
        <span>{total ? `${done} / ${total} assessed` : "No students yet"}</span>
        {total > 0 && <span className="tabular-nums">{pct}%</span>}
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper-sunken">
        <div className="h-1.5 rounded-full bg-green" style={{ width: `${pct}%` }} />
      </div>

      <p className="mt-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-green">
        {total} student{total === 1 ? "" : "s"}
      </p>
    </Link>
  );
}

function ClassesSetupNote() {
  return (
    <div className="mt-10 rounded-[var(--radius-card)] border border-gold bg-gold-tint px-6 py-6 text-sm text-ink-900">
      <p className="font-medium">Classes need a quick database setup.</p>
      <p className="mt-2 text-ink-700">
        The <span className="font-mono">classes</span> and{" "}
        <span className="font-mono">class_students</span> tables aren&apos;t in the database yet.
        They ship in the migration <span className="font-mono text-xs">…_classes.sql</span> — once
        it&apos;s applied (Lovable runs new migrations automatically on the next sync), this page
        will let you create classes.
      </p>
    </div>
  );
}

type EducatorOpt = { id: string; full_name: string | null };

function NewClassModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [period, setPeriod] = useState("");
  const [educatorId, setEducatorId] = useState("");
  const [educators, setEducators] = useState<EducatorOpt[]>([]);
  const [saving, setSaving] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Focus management: move focus into the dialog on open and give it back to
  // whatever opened it on close (WCAG 2.4.3). Escape closes (2.1.2).
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  useEffect(() => {
    supabase
      .from("educators")
      .select("id, full_name")
      .eq("approved", true)
      .order("full_name")
      .then(({ data }) => setEducators((data as EducatorOpt[]) ?? []));
  }, []);

  async function save() {
    setSaving(true);
    const payload: Record<string, unknown> = { name: name.trim() };
    if (grade.trim()) payload.grade = Number(grade) || null;
    if (period.trim()) payload.period = period.trim();
    if (educatorId) payload.educator_id = educatorId;
    const { error } = await sb("classes").insert(payload);
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    onSaved();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-class-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 sm:p-6"
    >
      <div className="w-full max-w-md rounded-[var(--radius-card)] bg-paper-raised p-6 shadow-lift sm:p-8">
        <h2 id="new-class-title" className="font-display text-2xl font-bold">
          New class
        </h2>
        <div className="mt-6 grid gap-4">
          <div>
            <label className="label" htmlFor="nc-name">
              Class name
            </label>
            <input
              id="nc-name"
              ref={firstFieldRef}
              className="field mt-1"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ms. Rivera · Period 3"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="nc-grade">
                Grade
              </label>
              <input
                id="nc-grade"
                className="field mt-1"
                type="number"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="8"
              />
            </div>
            <div>
              <label className="label" htmlFor="nc-period">
                Period (optional)
              </label>
              <input
                id="nc-period"
                className="field mt-1"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="3rd"
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="nc-teacher">
              Teacher
            </label>
            <select
              id="nc-teacher"
              className="field mt-1"
              value={educatorId}
              onChange={(e) => setEducatorId(e.target.value)}
            >
              <option value="">— Select instructor —</option>
              {educators.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name ?? "(instructor)"}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-ink"
            disabled={saving || !name.trim()}
            onClick={save}
          >
            {saving ? "Saving…" : "Create class"}
          </button>
        </div>
      </div>
    </div>
  );
}
