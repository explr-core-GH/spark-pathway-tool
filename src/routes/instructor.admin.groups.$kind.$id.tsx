import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RosterDataPanel } from "@/components/RosterDataPanel";
import { CampLoginsPanel } from "@/components/CampLoginsPanel";
import { GroupEducatorsPanel } from "@/components/GroupEducatorsPanel";
import {
  fetchGroup,
  fetchCompletion,
  hollandMix,
  isGroupKind,
  KIND_META,
  type Completion,
  type GroupKind,
  type GroupSummary,
} from "@/lib/admin-groups";

export const Route = createFileRoute("/instructor/admin/groups/$kind/$id")({
  head: () => ({ meta: [{ title: "Group — Admin" }] }),
  component: GroupWorkspace,
});

const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

type TabId = "overview" | "students" | "assessments" | "educators" | "logins";

function tabsFor(kind: GroupKind): Array<{ id: TabId; label: string }> {
  const base: Array<{ id: TabId; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "students", label: "Students" },
    { id: "assessments", label: "Assessments & surveys" },
    { id: "educators", label: "Instructors" },
  ];
  if (kind === "camps") base.push({ id: "logins", label: "Logins" });
  return base;
}

function GroupWorkspace() {
  const { kind, id } = useParams({ from: "/instructor/admin/groups/$kind/$id" });
  if (!isGroupKind(kind)) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm text-red-600">Unknown group type “{kind}”.</p>
      </main>
    );
  }
  return <Inner kind={kind} id={id} />;
}

function Inner({ kind, id }: { kind: GroupKind; id: string }) {
  const meta = KIND_META[kind];
  const [group, setGroup] = useState<GroupSummary | null | undefined>(undefined);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [tab, setTab] = useState<TabId>("overview");

  const load = useCallback(async () => {
    const g = await fetchGroup(kind, id);
    setGroup(g);
    if (g) setCompletion(await fetchCompletion(g.studentIds));
  }, [kind, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (group === undefined) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm text-ink-500">Loading…</p>
      </main>
    );
  }
  if (group === null) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm text-ink-500">
          That {meta.singular.toLowerCase()} wasn&apos;t found.{" "}
          <Link to="/instructor/admin/groups/$kind" params={{ kind }} className="ink-link">
            Back to {meta.label.toLowerCase()}
          </Link>
        </p>
      </main>
    );
  }

  const tabs = tabsFor(kind);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        to="/instructor/admin/groups/$kind"
        params={{ kind }}
        className="text-xs text-ink-500 hover:text-ink"
      >
        ← {meta.label}
      </Link>
      <h1 className="mt-2 text-3xl font-light">{group.name}</h1>
      {group.meta && <p className="mt-1 text-sm text-ink-500">{group.meta}</p>}
      {(kind === "classes" || kind === "camps") && (
        <Link
          to="/instructor/explore-cards/$kind/$id"
          params={{ kind: kind === "classes" ? "class" : "camp", id: group.id }}
          className="btn-ghost mt-4 text-sm"
        >
          Picture sign-in cards (grades 4-8)
        </Link>
      )}

      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-b border-line pb-2 text-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={tab === t.id ? "font-medium text-ink" : "text-ink-500 hover:text-ink"}
            style={tab === t.id ? { boxShadow: "inset 0 -2px 0 0 var(--color-green)" } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "overview" && (
          <Overview group={group} completion={completion} onJump={() => setTab("students")} />
        )}
        {tab === "students" && (
          <>
            {kind === "classes" && (
              <ClassRoster classId={group.id} memberIds={group.studentIds} onChange={load} />
            )}
            <RosterDataPanel studentIds={group.studentIds} names={group.names} />
          </>
        )}
        {tab === "assessments" && <AssessmentsTab group={group} completion={completion} />}
        {tab === "educators" && <GroupEducatorsPanel kind={kind} id={group.id} />}
        {tab === "logins" && <CampLoginsPanel campId={group.id} title={group.name} />}
      </div>
    </main>
  );
}

function Overview({
  group,
  completion,
  onJump,
}: {
  group: GroupSummary;
  completion: Completion | null;
  onJump: () => void;
}) {
  const total = group.studentIds.length;
  const aDone = completion
    ? group.studentIds.filter((id) => completion.assessmentDone.has(id)).length
    : 0;
  const sDone = completion
    ? group.studentIds.filter((id) => completion.surveyDone.has(id)).length
    : 0;
  const mix = completion ? hollandMix(group.studentIds, completion.holland) : [];
  const maxCount = mix.length ? mix[0].count : 1;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Students" value={`${total}`} />
        <Metric label="Assessment done" value={`${aDone} / ${total}`} />
        <Metric label="Survey done" value={`${sDone} / ${total}`} />
        <Metric label="Assessed" value={total ? `${Math.round((aDone / total) * 100)}%` : "—"} />
      </div>

      <section className="mt-10">
        <h2 className="text-xs uppercase tracking-wider text-ink-500">
          Top interests in this group
        </h2>
        {mix.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">
            No completed assessments yet, so there&apos;s no interest mix to show.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {mix.map((m) => (
              <li key={m.letter} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-ink-700">{m.label}</span>
                <div className="relative h-2 flex-1 bg-paper-sunken">
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${Math.round((m.count / maxCount) * 100)}%`,
                      background: "var(--color-green)",
                    }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs text-ink-500 tabular-nums">
                  {m.count} · {m.pct}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button onClick={onJump} className="mt-8 text-sm text-green-deep hover:underline">
        Dive into students one by one →
      </button>
    </div>
  );
}

function AssessmentsTab({
  group,
  completion,
}: {
  group: GroupSummary;
  completion: Completion | null;
}) {
  const total = group.studentIds.length;
  const aDone = completion
    ? group.studentIds.filter((id) => completion.assessmentDone.has(id)).length
    : 0;
  const sDone = completion
    ? group.studentIds.filter((id) => completion.surveyDone.has(id)).length
    : 0;
  return (
    <div>
      <p className="max-w-2xl text-sm text-ink-700">
        How far this group has come on the two instruments EXPLR Pathways uses: the RIASEC interest
        assessment and the STEM efficacy survey.
      </p>
      <div className="mt-6 grid max-w-2xl grid-cols-2 gap-3">
        <Metric label="RIASEC done" value={`${aDone} / ${total}`} />
        <Metric label="Surveys done" value={`${sDone} / ${total}`} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/instructor/admin/assessments" className="btn-ghost text-sm">
          Surveys &amp; item banks
        </Link>
        <Link to="/instructor/admin/completion" className="btn-ghost text-sm">
          Completion by roster
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-paper-raised p-4 rounded-[var(--radius-card)]">
      <p className="text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-light tabular-nums text-ink">{value}</p>
    </div>
  );
}

/** Add / remove students for a class (classes kind only). */
type StudentOpt = { id: string; first_name: string | null; grade: number };

function ClassRoster({
  classId,
  memberIds,
  onChange,
}: {
  classId: string;
  memberIds: string[];
  onChange: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentOpt[]>([]);
  const [busy, setBusy] = useState(false);
  const memberSet = useMemo(() => new Set(memberIds), [memberIds]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("students")
      .select("id, first_name, grade")
      .ilike("first_name", `%${q}%`)
      .limit(8)
      .then(({ data }) => {
        if (!cancelled) setResults((data as StudentOpt[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  async function add(studentId: string) {
    setBusy(true);
    const { error } = await sb("class_students").insert({
      class_id: classId,
      student_id: studentId,
    });
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    setQuery("");
    setResults([]);
    onChange();
  }

  async function remove(studentId: string) {
    setBusy(true);
    const { error } = await sb("class_students")
      .delete()
      .eq("class_id", classId)
      .eq("student_id", studentId);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    onChange();
  }

  return (
    <div className="mb-6 border border-line bg-paper-sunken p-4 rounded-[var(--radius-card)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Manage roster</p>
      <div className="relative mt-3 max-w-sm">
        <input
          className="field"
          placeholder="Add a student by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full border border-line-strong bg-paper-raised shadow-sm">
            {results.map((s) => {
              const already = memberSet.has(s.id);
              return (
                <li key={s.id}>
                  <button
                    disabled={already || busy}
                    onClick={() => add(s.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-paper-sunken disabled:opacity-40"
                  >
                    <span>{s.first_name ?? "Student"}</span>
                    <span className="text-xs text-ink-500">
                      {already ? "in class" : `Grade ${s.grade} · add`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {memberIds.length > 0 && (
        <p className="mt-3 text-xs text-ink-500">
          {memberIds.length} student{memberIds.length === 1 ? "" : "s"} in this class. Remove from
          the table below.
        </p>
      )}
      <RemovableList memberIds={memberIds} onRemove={remove} busy={busy} />
    </div>
  );
}

function RemovableList({
  memberIds,
  onRemove,
  busy,
}: {
  memberIds: string[];
  onRemove: (id: string) => void;
  busy: boolean;
}) {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (memberIds.length === 0) {
      setNames({});
      return;
    }
    supabase
      .from("students")
      .select("id, first_name")
      .in("id", memberIds)
      .then(({ data }) => {
        const m: Record<string, string> = {};
        for (const s of (data as Array<{ id: string; first_name: string | null }>) ?? []) {
          m[s.id] = s.first_name ?? "Student";
        }
        setNames(m);
      });
  }, [memberIds.join(",")]);

  if (memberIds.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {memberIds.map((id) => (
        <span
          key={id}
          className="inline-flex items-center gap-2 border border-line-strong bg-paper-raised px-2.5 py-1 text-xs"
        >
          {names[id] ?? "…"}
          <button
            onClick={() => onRemove(id)}
            disabled={busy}
            aria-label="Remove"
            className="text-ink-500 hover:text-red-600"
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}
