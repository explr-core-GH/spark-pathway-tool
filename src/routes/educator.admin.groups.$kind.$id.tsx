import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RosterDataPanel } from "@/components/RosterDataPanel";
import { CampAssignmentsPanel } from "@/components/CampAssignmentsPanel";
import { CampLoginsPanel } from "@/components/CampLoginsPanel";
import { InternshipPipelinePanel } from "@/components/InternshipPipelinePanel";
import { GroupMaterialsPanel } from "@/components/GroupMaterialsPanel";
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

export const Route = createFileRoute("/educator/admin/groups/$kind/$id")({
  head: () => ({ meta: [{ title: "Group — Admin" }] }),
  component: GroupWorkspace,
});

const sb = (table: string): any =>
  (supabase.from as unknown as (n: string) => any)(table);

type TabId =
  | "overview"
  | "students"
  | "assessments"
  | "materials"
  | "educators"
  | "logins"
  | "pipeline";

function tabsFor(kind: GroupKind): Array<{ id: TabId; label: string }> {
  const base: Array<{ id: TabId; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "students", label: "Students" },
    { id: "assessments", label: "Assessments & surveys" },
    { id: "materials", label: "Materials" },
    { id: "educators", label: "Educators" },
  ];
  if (kind === "camps") base.push({ id: "logins", label: "Logins" });
  if (kind === "internships") base.push({ id: "pipeline", label: "Applicants & placements" });
  return base;
}

function GroupWorkspace() {
  const { kind, id } = useParams({ from: "/educator/admin/groups/$kind/$id" });
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
        <p className="text-sm text-charcoal-400">Loading…</p>
      </main>
    );
  }
  if (group === null) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm text-charcoal-500">
          That {meta.singular.toLowerCase()} wasn&apos;t found.{" "}
          <Link to="/educator/admin/groups/$kind" params={{ kind }} className="ink-link">
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
        to="/educator/admin/groups/$kind"
        params={{ kind }}
        className="text-xs text-charcoal-500 hover:text-ink"
      >
        ← {meta.label}
      </Link>
      <h1 className="mt-2 text-3xl font-light">{group.name}</h1>
      {group.meta && <p className="mt-1 text-sm text-charcoal-500">{group.meta}</p>}

      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-b border-charcoal-100 pb-2 text-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? "font-medium text-ink"
                : "text-charcoal-500 hover:text-ink"
            }
            style={
              tab === t.id
                ? { boxShadow: "inset 0 -2px 0 0 var(--color-explr-500)" }
                : undefined
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "overview" && <Overview group={group} completion={completion} onJump={() => setTab("students")} />}
        {tab === "students" && (
          <>
            {kind === "classes" && (
              <ClassRoster classId={group.id} memberIds={group.studentIds} onChange={load} />
            )}
            <RosterDataPanel studentIds={group.studentIds} names={group.names} />
          </>
        )}
        {tab === "assessments" && <AssessmentsTab kind={kind} group={group} completion={completion} />}
        {tab === "materials" && <GroupMaterialsPanel kind={kind} id={group.id} />}
        {tab === "educators" && <GroupEducatorsPanel kind={kind} id={group.id} />}
        {tab === "logins" && <CampLoginsPanel campId={group.id} title={group.name} />}
        {tab === "pipeline" && <InternshipPipelinePanel slug={group.id} />}
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
        <Metric
          label="Assessed"
          value={total ? `${Math.round((aDone / total) * 100)}%` : "—"}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400">
          Top interests in this group
        </h2>
        {mix.length === 0 ? (
          <p className="mt-3 text-sm text-charcoal-400">
            No completed assessments yet, so there&apos;s no interest mix to show.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {mix.map((m) => (
              <li key={m.letter} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-charcoal-600">{m.label}</span>
                <div className="relative h-2 flex-1 bg-charcoal-100">
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${Math.round((m.count / maxCount) * 100)}%`,
                      background: "var(--color-explr-500)",
                    }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs text-charcoal-500 tabular-nums">
                  {m.count} · {m.pct}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button onClick={onJump} className="mt-8 text-sm text-explr-600 hover:underline">
        Dive into students one by one →
      </button>
    </div>
  );
}

function AssessmentsTab({
  kind,
  group,
  completion,
}: {
  kind: GroupKind;
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
    <div className="max-w-2xl">
      <p className="text-sm text-charcoal-600">
        One place for everything this group is asked to complete — the RIASEC
        interest assessment, the internship interest survey, and the STEM survey.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Metric label="RIASEC assessment" value={`${aDone} / ${total} done`} />
        <Metric label="Surveys" value={`${sDone} / ${total} done`} />
      </div>

      {kind === "camps" && (
        <div className="mt-8">
          <h2 className="text-xs uppercase tracking-wider text-charcoal-400">
            Assigned to this camp
          </h2>
          <div className="mt-3">
            <CampAssignmentsPanel campId={group.id} studentIds={group.studentIds} />
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/educator/admin/assessments" className="btn-ink text-sm">
          Assign & manage
        </Link>
        <Link to="/educator/admin/completion" className="btn-ghost text-sm">
          Completion by roster
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-charcoal-100 bg-white p-4">
      <p className="text-[10px] uppercase tracking-wider text-charcoal-400">{label}</p>
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
    <div className="mb-6 border border-charcoal-100 bg-charcoal-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-400">
        Manage roster
      </p>
      <div className="relative mt-3 max-w-sm">
        <input
          className="field"
          placeholder="Add a student by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full border border-charcoal-200 bg-white shadow-sm">
            {results.map((s) => {
              const already = memberSet.has(s.id);
              return (
                <li key={s.id}>
                  <button
                    disabled={already || busy}
                    onClick={() => add(s.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-charcoal-50 disabled:opacity-40"
                  >
                    <span>{s.first_name ?? "Student"}</span>
                    <span className="text-xs text-charcoal-400">
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
        <p className="mt-3 text-xs text-charcoal-500">
          {memberIds.length} student{memberIds.length === 1 ? "" : "s"} in this class.
          Remove from the table below.
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
          className="inline-flex items-center gap-2 border border-charcoal-200 bg-white px-2.5 py-1 text-xs"
        >
          {names[id] ?? "…"}
          <button
            onClick={() => onRemove(id)}
            disabled={busy}
            aria-label="Remove"
            className="text-charcoal-400 hover:text-red-600"
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}
