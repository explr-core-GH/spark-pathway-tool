import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import {
  ALL_CONSTRUCTS,
  getConstruct,
  SURVEY_TYPE_LABEL,
  type ConstructId,
  type SurveyType,
  type Administration,
} from "@/lib/explr-stem";
import {
  scoreConstruct,
  pairedChange,
  cohenLabel,
  type ItemResponseValue,
} from "@/lib/explr-stem/scoring";

const sb = supabase.from as (n: string) => ReturnType<typeof supabase.from>;

export const Route = createFileRoute("/educator/admin/surveys")({
  head: () => ({ meta: [{ title: "STEM Surveys — Admin" }] }),
  component: SurveysAdmin,
});

type Assignment = {
  id: string;
  survey_type: SurveyType;
  administration: Administration;
  unit_type: string;
  unit_ref: string;
  title: string;
  created_at: string;
};
type ResponseRow = {
  id: string;
  assignment_id: string;
  student_id: string;
  survey_type: SurveyType;
  administration: Administration;
  demographics: { grade?: number | null } | null;
  completed_at: string | null;
};
type ItemRow = {
  survey_response_id: string;
  item_id: string;
  value_now: number | null;
  value_then: number | null;
  skipped: boolean;
};

const SURVEY_TYPES: SurveyType[] = [
  "retrospective",
  "middle_school",
  "high_school",
];

// scale max per construct — career_interest is the only 4-point construct.
function scaleMax(c: ConstructId): number {
  return c === "career_interest" ? 4 : 5;
}

/** Build the {item_id: response} map for one survey_response, for a given track. */
function trackMap(
  items: ItemRow[],
  track: "now" | "then",
): Record<string, ItemResponseValue> {
  const out: Record<string, ItemResponseValue> = {};
  for (const it of items) {
    out[it.item_id] = {
      value: track === "now" ? it.value_now : it.value_then,
      skipped: it.skipped,
    };
  }
  return out;
}

/** Construct means for one response on one track. */
function scoreAll(
  itemsByResponse: Record<string, ItemRow[]>,
  responseId: string,
  track: "now" | "then",
): Partial<Record<ConstructId, number | null>> {
  const items = itemsByResponse[responseId] ?? [];
  const map = trackMap(items, track);
  const out: Partial<Record<ConstructId, number | null>> = {};
  for (const c of ALL_CONSTRUCTS) {
    const def = getConstruct(c);
    if (!def) continue;
    out[c] = scoreConstruct(def.items, map, 1, scaleMax(c));
  }
  return out;
}

function SurveysAdmin() {
  const { user } = useSession();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [itemsByResponse, setItemsByResponse] = useState<
    Record<string, ItemRow[]>
  >({});
  const [loading, setLoading] = useState(true);

  // create-form state
  const [fSurveyType, setFSurveyType] = useState<SurveyType>("retrospective");
  const [fUnitType, setFUnitType] = useState<"camp" | "internship">("camp");
  const [fUnitRef, setFUnitRef] = useState("");
  const [fTitle, setFTitle] = useState("");
  const [busy, setBusy] = useState(false);

  // Pickable units for the create form — camp sessions (explr_camps) and
  // internships, so the admin never hand-types a slug / id.
  const [campSessions, setCampSessions] = useState<
    Array<{ id: string; title: string; date: string | null }>
  >([]);
  const [internships, setInternships] = useState<
    Array<{ slug: string; name: string }>
  >([]);

  // selected results group
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [byGrade, setByGrade] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: a }, { data: r }] = await Promise.all([
      sb("survey_assignments")
        .select("id, survey_type, administration, unit_type, unit_ref, title, created_at")
        .order("created_at", { ascending: false }),
      sb("survey_responses")
        .select("id, assignment_id, student_id, survey_type, administration, demographics, completed_at"),
    ]);
    const asg = (a ?? []) as Assignment[];
    const resp = (r ?? []) as ResponseRow[];
    setAssignments(asg);
    setResponses(resp);

    const respIds = resp.map((x) => x.id);
    if (respIds.length > 0) {
      const { data: items } = await sb("survey_item_responses")
        .select("survey_response_id, item_id, value_now, value_then, skipped")
        .in("survey_response_id", respIds);
      const map: Record<string, ItemRow[]> = {};
      for (const it of (items ?? []) as ItemRow[]) {
        (map[it.survey_response_id] ??= []).push(it);
      }
      setItemsByResponse(map);
    } else {
      setItemsByResponse({});
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  // Load the unit options once.
  useEffect(() => {
    sb("explr_camps")
      .select("id, title, date")
      .order("date", { ascending: true })
      .then(({ data }: { data: unknown }) => {
        setCampSessions(
          (data ?? []) as Array<{ id: string; title: string; date: string | null }>,
        );
      });
    supabase
      .from("internships")
      .select("slug, name")
      .order("name")
      .then(({ data }) => {
        setInternships((data ?? []) as Array<{ slug: string; name: string }>);
      });
  }, []);

  async function createAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!fUnitRef.trim() || !fTitle.trim()) return;
    setBusy(true);
    // Retrospective surveys are a single administration; pre/post surveys
    // get a separate assignment per administration so the admin controls
    // when the post opens. For a pre/post type we create BOTH here.
    const rows =
      fSurveyType === "retrospective"
        ? [
            {
              survey_type: fSurveyType,
              administration: "retrospective",
              unit_type: fUnitType,
              unit_ref: fUnitRef.trim(),
              title: fTitle.trim(),
              created_by: user?.id ?? null,
            },
          ]
        : (["pre", "post"] as const).map((adm) => ({
            survey_type: fSurveyType,
            administration: adm,
            unit_type: fUnitType,
            unit_ref: fUnitRef.trim(),
            title: `${fTitle.trim()} — ${adm === "pre" ? "Start" : "End"}`,
            created_by: user?.id ?? null,
          }));
    const { error } = await sb("survey_assignments").insert(rows as never);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    setFUnitRef("");
    setFTitle("");
    await load();
  }

  async function removeAssignment(id: string) {
    if (!confirm("Delete this survey assignment and all its responses?")) return;
    const { error } = await sb("survey_assignments").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    await load();
  }

  // Group assignments by survey_type + unit_ref so a pre/post pair shows
  // as one row.
  const groups = useMemo(() => {
    const m = new Map<
      string,
      { key: string; surveyType: SurveyType; unitRef: string; unitType: string; title: string; assignmentIds: string[] }
    >();
    for (const a of assignments) {
      const key = `${a.survey_type}::${a.unit_ref}`;
      const g = m.get(key);
      if (g) g.assignmentIds.push(a.id);
      else
        m.set(key, {
          key,
          surveyType: a.survey_type,
          unitRef: a.unit_ref,
          unitType: a.unit_type,
          title: a.title.replace(/ — (Start|End)$/, ""),
          assignmentIds: [a.id],
        });
    }
    return [...m.values()];
  }, [assignments]);

  const completedCount = (assignmentId: string) =>
    responses.filter((r) => r.assignment_id === assignmentId && r.completed_at)
      .length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">STEM Surveys</h1>
      <p className="lead mt-3">
        Research-based pre/post surveys (S-STEM) for camps and internships.
        Assign one to a camp or internship; results appear here as students
        complete them.
      </p>

      {/* Create */}
      <section className="mt-10 border border-charcoal-100 p-6">
        <h2 className="eyebrow">New survey assignment</h2>
        <form onSubmit={createAssignment} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Survey</label>
            <select
              className="field mt-1"
              value={fSurveyType}
              onChange={(e) => setFSurveyType(e.target.value as SurveyType)}
            >
              {SURVEY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SURVEY_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-charcoal-400">
              {fSurveyType === "retrospective"
                ? "Single sitting on the last day (then/now ratings)."
                : "Creates a Start and an End assignment; the End is gated behind the Start."}
            </p>
          </div>
          <div>
            <label className="label">Attach to</label>
            <div className="mt-1 inline-flex border border-charcoal-200">
              {(["camp", "internship"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => {
                    setFUnitType(u);
                    setFUnitRef(""); // ref is unit-type specific
                  }}
                  className="px-3 py-1.5 text-xs"
                  style={{
                    background: fUnitType === u ? "var(--ink)" : "white",
                    color: fUnitType === u ? "white" : "var(--color-charcoal-500)",
                  }}
                >
                  {u === "camp" ? "Camp session" : "Internship"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">
              {fUnitType === "camp" ? "Camp session" : "Internship"}
            </label>
            <select
              className="field mt-1"
              value={fUnitRef}
              onChange={(e) => {
                setFUnitRef(e.target.value);
                // Prefill the student-facing title from the picked unit if
                // the admin hasn't typed one yet.
                if (!fTitle.trim()) {
                  if (fUnitType === "camp") {
                    const s = campSessions.find((c) => c.id === e.target.value);
                    if (s) setFTitle(s.title);
                  } else {
                    const i = internships.find((x) => x.slug === e.target.value);
                    if (i) setFTitle(i.name);
                  }
                }
              }}
            >
              <option value="">
                Pick a {fUnitType === "camp" ? "camp session" : "internship"}…
              </option>
              {fUnitType === "camp"
                ? campSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                      {s.date ? ` · ${new Date(s.date).toLocaleDateString()}` : ""}
                    </option>
                  ))
                : internships.map((i) => (
                    <option key={i.slug} value={i.slug}>
                      {i.name}
                    </option>
                  ))}
            </select>
            {fUnitType === "camp" && campSessions.length === 0 && (
              <p className="mt-1 text-[11px] text-charcoal-400">
                No camp sessions synced yet — run an ExplrMore sync first.
              </p>
            )}
          </div>
          <div>
            <label className="label">Title shown to students</label>
            <input
              className="field mt-1"
              value={fTitle}
              onChange={(e) => setFTitle(e.target.value)}
              placeholder="BoxCraft — Week 2"
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-ink">
              {busy ? "Creating…" : "Create assignment"}
            </button>
          </div>
        </form>
      </section>

      {/* Assignment list */}
      <section className="mt-12">
        <h2 className="eyebrow">Assignments</h2>
        {loading ? (
          <p className="mt-4 text-sm text-charcoal-400">Loading…</p>
        ) : assignments.length === 0 ? (
          <p className="mt-4 text-sm text-charcoal-400">No assignments yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
            {assignments.map((a) => (
              <li key={a.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="truncate text-xs text-charcoal-500">
                    {SURVEY_TYPE_LABEL[a.survey_type]} ·{" "}
                    <span className="capitalize">{a.administration}</span> ·{" "}
                    {a.unit_type}/{a.unit_ref}
                  </p>
                </div>
                <span className="text-xs text-charcoal-500">
                  {completedCount(a.id)} completed
                </span>
                <button
                  onClick={() => removeAssignment(a.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Results */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="eyebrow">Results</h2>
          {groups.length > 0 && (
            <select
              className="field max-w-xs"
              value={selectedGroup ?? ""}
              onChange={(e) => setSelectedGroup(e.target.value || null)}
            >
              <option value="">Pick a survey…</option>
              {groups.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.title} ({SURVEY_TYPE_LABEL[g.surveyType]})
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedGroup ? (
          <ResultsPanel
            group={groups.find((g) => g.key === selectedGroup)!}
            assignments={assignments}
            responses={responses}
            itemsByResponse={itemsByResponse}
            byGrade={byGrade}
            onToggleByGrade={() => setByGrade((v) => !v)}
          />
        ) : (
          <p className="mt-4 text-sm text-charcoal-400">
            Pick a survey above to see pre/post construct change.
          </p>
        )}
      </section>
    </main>
  );
}

// ── Results panel ───────────────────────────────────────────────────────────

type Group = {
  key: string;
  surveyType: SurveyType;
  unitRef: string;
  unitType: string;
  title: string;
  assignmentIds: string[];
};

function ResultsPanel({
  group,
  assignments,
  responses,
  itemsByResponse,
  byGrade,
  onToggleByGrade,
}: {
  group: Group;
  assignments: Assignment[];
  responses: ResponseRow[];
  itemsByResponse: Record<string, ItemRow[]>;
  byGrade: boolean;
  onToggleByGrade: () => void;
}) {
  const groupAssignments = assignments.filter((a) =>
    group.assignmentIds.includes(a.id),
  );
  const groupAsgIds = new Set(groupAssignments.map((a) => a.id));
  const completed = responses.filter(
    (r) => groupAsgIds.has(r.assignment_id) && r.completed_at,
  );

  // Build matched pre/post pairs per construct.
  const isRetro = group.surveyType === "retrospective";

  // student_id → { pre: scores, post: scores, grade }
  type Paired = {
    pre: Partial<Record<ConstructId, number | null>>;
    post: Partial<Record<ConstructId, number | null>>;
    grade: number | null;
  };
  const pairs: Paired[] = [];

  if (isRetro) {
    // One response per student; 'then' = pre, 'now' = post.
    for (const r of completed) {
      pairs.push({
        pre: scoreAll(itemsByResponse, r.id, "then"),
        post: scoreAll(itemsByResponse, r.id, "now"),
        grade: r.demographics?.grade ?? null,
      });
    }
  } else {
    // Match a completed 'pre' response to a completed 'post' response by
    // student_id.
    const preByStudent = new Map<string, ResponseRow>();
    const postByStudent = new Map<string, ResponseRow>();
    for (const r of completed) {
      if (r.administration === "pre") preByStudent.set(r.student_id, r);
      if (r.administration === "post") postByStudent.set(r.student_id, r);
    }
    for (const [sid, preR] of preByStudent) {
      const postR = postByStudent.get(sid);
      if (!postR) continue;
      pairs.push({
        pre: scoreAll(itemsByResponse, preR.id, "now"),
        post: scoreAll(itemsByResponse, postR.id, "now"),
        grade: postR.demographics?.grade ?? preR.demographics?.grade ?? null,
      });
    }
  }

  function constructTable(rows: Paired[], label: string) {
    return (
      <div className="mt-4">
        <p className="text-xs font-semibold text-charcoal-600">
          {label} · n = {rows.length}
        </p>
        {rows.length < 5 ? (
          <p className="mt-2 text-xs text-charcoal-400">
            Fewer than 5 matched students — hidden to protect privacy.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y border-charcoal-100 text-left text-xs uppercase tracking-wider text-charcoal-400">
                  <th className="py-2 pr-4 font-normal">Construct</th>
                  <th className="py-2 pr-4 font-normal">Pre</th>
                  <th className="py-2 pr-4 font-normal">Post</th>
                  <th className="py-2 pr-4 font-normal">Change</th>
                  <th className="py-2 pr-4 font-normal">n</th>
                  <th className="py-2 pr-4 font-normal">Cohen&apos;s d</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100">
                {ALL_CONSTRUCTS.map((c) => {
                  const pre: number[] = [];
                  const post: number[] = [];
                  for (const p of rows) {
                    const a = p.pre[c];
                    const b = p.post[c];
                    if (a != null && b != null) {
                      pre.push(a);
                      post.push(b);
                    }
                  }
                  if (pre.length === 0) return null;
                  const r = pairedChange(pre, post);
                  if (!r) return null;
                  return (
                    <tr key={c}>
                      <td className="py-2 pr-4 font-medium">
                        {getConstruct(c)?.name ?? c}
                      </td>
                      <td className="py-2 pr-4 text-charcoal-600">
                        {r.meanPre.toFixed(2)}
                      </td>
                      <td className="py-2 pr-4 text-charcoal-600">
                        {r.meanPost.toFixed(2)}
                      </td>
                      <td
                        className="py-2 pr-4 font-medium"
                        style={{
                          color:
                            r.meanChange > 0
                              ? "var(--color-explr-600)"
                              : r.meanChange < 0
                                ? "var(--color-destructive, #b91c1c)"
                                : undefined,
                        }}
                      >
                        {r.meanChange > 0 ? "+" : ""}
                        {r.meanChange.toFixed(2)}
                      </td>
                      <td className="py-2 pr-4 text-charcoal-500">{r.n}</td>
                      <td className="py-2 pr-4 text-charcoal-600">
                        {r.cohensD.toFixed(2)}{" "}
                        <span className="text-xs text-charcoal-400">
                          ({cohenLabel(r.cohensD)})
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function exportCsv() {
    const header = [
      "survey_response_id",
      "assignment_id",
      "student_id",
      "survey_type",
      "administration",
      "grade",
      "item_id",
      "value_now",
      "value_then",
      "skipped",
    ];
    const lines = [header.join(",")];
    for (const r of completed) {
      const items = itemsByResponse[r.id] ?? [];
      for (const it of items) {
        lines.push(
          [
            r.id,
            r.assignment_id,
            r.student_id,
            r.survey_type,
            r.administration,
            r.demographics?.grade ?? "",
            it.item_id,
            it.value_now ?? "",
            it.value_then ?? "",
            it.skipped ? "true" : "false",
          ].join(","),
        );
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `survey_${group.surveyType}_${group.unitRef}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // grade disaggregation buckets
  const gradeBuckets = byGrade
    ? [
        { label: "Grades 5–6", test: (g: number | null) => g != null && g <= 6 },
        { label: "Grades 7–8", test: (g: number | null) => g != null && g >= 7 && g <= 8 },
        { label: "Grades 9–12", test: (g: number | null) => g != null && g >= 9 },
      ]
    : [];

  return (
    <div className="mt-4 border border-charcoal-100 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-base font-medium">{group.title}</h3>
        <div className="flex gap-3 text-xs">
          <button
            onClick={onToggleByGrade}
            className="text-charcoal-500 underline hover:text-ink"
          >
            {byGrade ? "Show overall" : "Disaggregate by grade"}
          </button>
          <button onClick={exportCsv} className="ink-link">
            Export raw CSV
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-charcoal-500">
        {completed.length} completed response
        {completed.length === 1 ? "" : "s"} · {pairs.length} matched pre/post
        pair{pairs.length === 1 ? "" : "s"}
      </p>

      {byGrade ? (
        gradeBuckets.map((b) =>
          constructTable(
            pairs.filter((p) => b.test(p.grade)),
            b.label,
          ),
        )
      ) : (
        <>{constructTable(pairs, "All students")}</>
      )}

      <p className="mt-4 text-[11px] text-charcoal-400">
        Cohen&apos;s d: 0.2 small · 0.5 medium · 0.8 large. The S-STEM is
        validated at the construct level — treat item-level numbers as
        diagnostic only.
      </p>
    </div>
  );
}
