import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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

export const Route = createFileRoute("/educator/admin/groups/$kind/")({
  head: () => ({ meta: [{ title: "Groups — Admin" }] }),
  component: GroupGrid,
});

const sb = (table: string): any =>
  (supabase.from as unknown as (n: string) => any)(table);

function GroupGrid() {
  const { kind } = useParams({ from: "/educator/admin/groups/$kind/" });
  if (!isGroupKind(kind)) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm text-red-600">Unknown group type “{kind}”.</p>
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
    return list.filter(
      (g) => g.name.toLowerCase().includes(q) || g.meta.toLowerCase().includes(q),
    );
  }, [groups, query]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="display mt-2">{meta.label}</h1>
          <p className="lead mt-2 max-w-2xl">
            Pick a {meta.singular.toLowerCase()} to see its overall results, then dive
            into students one by one.
          </p>
        </div>
        {meta.newLabel ? (
          <button className="btn-ink" onClick={() => setCreating(true)}>
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
            placeholder={`Filter ${meta.label.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {groups === null ? (
        <p className="mt-10 text-sm text-charcoal-400">Loading…</p>
      ) : setupNeeded ? (
        <ClassesSetupNote />
      ) : filtered.length === 0 ? (
        <div className="mt-10 border border-dashed border-charcoal-200 bg-charcoal-50 px-6 py-12 text-center">
          <p className="text-sm text-charcoal-500">
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
      to="/educator/admin/groups/$kind/$id"
      params={{ kind, id: group.id }}
      className="block border border-charcoal-100 bg-white p-5 transition-colors hover:border-charcoal-300"
    >
      <p className="text-sm font-medium leading-snug">{group.name}</p>
      <p className="mt-1 h-4 truncate text-xs text-charcoal-500">{group.meta}</p>

      <div className="mt-4 flex items-baseline justify-between text-xs text-charcoal-500">
        <span>
          {total ? `${done} / ${total} assessed` : "No students yet"}
        </span>
        {total > 0 && <span className="tabular-nums">{pct}%</span>}
      </div>
      <div className="mt-1.5 h-1.5 w-full bg-charcoal-100">
        <div
          className="h-1.5"
          style={{ width: `${pct}%`, background: "var(--color-explr-500)" }}
        />
      </div>

      <div className="mt-3 flex items-center gap-1 text-xs text-charcoal-400">
        <span className="tabular-nums">{total}</span>
        <span>student{total === 1 ? "" : "s"}</span>
      </div>
    </Link>
  );
}

function ClassesSetupNote() {
  return (
    <div className="mt-10 border border-amber-200 bg-amber-50 px-6 py-6 text-sm text-amber-900">
      <p className="font-medium">Classes need a quick database setup.</p>
      <p className="mt-2 text-amber-800">
        The <span className="font-mono">classes</span> and{" "}
        <span className="font-mono">class_students</span> tables aren&apos;t in the
        database yet. They ship in the migration{" "}
        <span className="font-mono text-xs">…_classes.sql</span> — once it&apos;s
        applied (Lovable runs new migrations automatically on the next sync), this
        page will let you create classes.
      </p>
    </div>
  );
}

type EducatorOpt = { id: string; full_name: string | null };

function NewClassModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [period, setPeriod] = useState("");
  const [educatorId, setEducatorId] = useState("");
  const [educators, setEducators] = useState<EducatorOpt[]>([]);
  const [saving, setSaving] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
      <div className="w-full max-w-md border bg-white p-8">
        <h2 className="text-xl font-medium">New class</h2>
        <div className="mt-6 grid gap-4">
          <div>
            <label className="label">Class name</label>
            <input
              className="field mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ms. Rivera · Period 3"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Grade</label>
              <input
                className="field mt-1"
                type="number"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="8"
              />
            </div>
            <div>
              <label className="label">Period (optional)</label>
              <input
                className="field mt-1"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="3rd"
              />
            </div>
          </div>
          <div>
            <label className="label">Teacher</label>
            <select
              className="field mt-1"
              value={educatorId}
              onChange={(e) => setEducatorId(e.target.value)}
            >
              <option value="">— Select educator —</option>
              {educators.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name ?? "(educator)"}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
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
