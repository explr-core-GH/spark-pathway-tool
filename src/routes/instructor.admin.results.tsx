import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ALL_CONSTRUCTS, getConstruct, getScale } from "@/lib/explr-stem";
import { scoreConstruct, type ItemResponseValue } from "@/lib/explr-stem/scoring";
import {
  fetchGroups,
  GROUP_KINDS,
  KIND_META,
  type GroupKind,
  type GroupSummary,
} from "@/lib/admin-groups";

export const Route = createFileRoute("/instructor/admin/results")({
  head: () => ({ meta: [{ title: "Results & downloads — Admin" }] }),
  component: ResultsHub,
});

/**
 * ResultsHub — every survey & assessment result in one place, downloadable.
 * On-screen tables show the first 200 rows; the Excel exports contain
 * everything. STEM survey construct scores are computed client-side from
 * survey_item_responses with the validated scoreConstruct (same as the
 * student-facing panel) — never the RLS-bypassing view.
 */

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);
const RIASEC_LETTERS = ["R", "I", "A", "S", "E", "C"] as const;
const DISPLAY_CAP = 200;

/** Page through a query builder factory — Supabase caps single reads at 1000. */
async function fetchAll<T>(make: () => any): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await make().range(from, from + size - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as T[];
    out.push(...batch);
    if (batch.length < size) break;
  }
  return out;
}

type RiasecRow = {
  sid: string;
  student: string;
  grade: number | string;
  holland: string;
  scores: Record<string, number>;
  completed: string;
};
type StemRow = {
  sid: string;
  student: string;
  survey: string;
  surveyType: string;
  administration: string;
  completed: string;
  /** constructId → { before, after } (before null unless retro/then) */
  scores: Record<string, { before: number | null; after: number | null }>;
};
type OpenRow = {
  sid: string;
  student: string;
  survey: string;
  prompt: string;
  response: string;
  date: string;
};
/** Item-level Likert response (used by the choice-distribution view). */
type StemItemRow = {
  sid: string;
  surveyType: string;
  administration: string;
  completed: string;
  itemId: string;
  valueNow: number | null;
  valueThen: number | null;
  skipped: boolean;
};

type TabId = "charts" | "riasec" | "stem";
const TABS: Array<{ id: TabId; label: string }> = [
  { id: "charts", label: "Charts & impact" },
  { id: "riasec", label: "RIASEC assessment" },
  { id: "stem", label: "STEM survey" },
];

function ResultsHub() {
  const [tab, setTab] = useState<TabId>("charts");
  const [riasec, setRiasec] = useState<RiasecRow[] | null>(null);
  const [stem, setStem] = useState<StemRow[] | null>(null);
  const [stemItems, setStemItems] = useState<StemItemRow[] | null>(null);
  const [openResp, setOpenResp] = useState<OpenRow[] | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Filter: program type + a specific rostered group (or "all in type") + optional date range.
  const [groups, setGroups] = useState<Array<{ kind: GroupKind; g: GroupSummary }>>([]);
  const [kindKey, setKindKey] = useState<"all" | GroupKind>("all");
  const [groupKey, setGroupKey] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Per-tab focus pickers — narrow to ONE construct/letter/prompt so
  // camps-vs-classes or before-vs-after comparisons are readable.
  const [riasecFocus, setRiasecFocus] = useState<string>("all");
  const [stemFocus, setStemFocus] = useState<string>("all");
  const [openFocus, setOpenFocus] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const loaded = await Promise.all(
        GROUP_KINDS.map((k) =>
          fetchGroups(k)
            .then((gs) => gs.map((g) => ({ kind: k, g })))
            .catch(() => []),
        ),
      );
      setGroups(loaded.flat());
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Names: prefer the camp login's full name, fall back to first_name.
        const [students, logins] = await Promise.all([
          fetchAll<{ id: string; first_name: string | null; grade: number | null }>(() =>
            sb("students").select("id, first_name, grade").order("id"),
          ),
          fetchAll<{ student_id: string | null; child_name: string }>(() =>
            sb("camp_student_logins").select("student_id, child_name").order("id"),
          ),
        ]);
        const nameMap: Record<string, string> = {};
        const gradeMap: Record<string, number | null> = {};
        for (const s of students) {
          nameMap[s.id] = s.first_name ?? "Student";
          gradeMap[s.id] = s.grade;
        }
        for (const l of logins) if (l.student_id) nameMap[l.student_id] = l.child_name;
        if (cancelled) return;
        const nm = (id: string) => nameMap[id] ?? id.slice(0, 8);

        // RIASEC — completed sessions.
        const sessions = await fetchAll<{
          student_id: string;
          holland_code: string | null;
          scale_scores: Record<string, number> | null;
          completed_at: string | null;
          grade_at_session: number | null;
        }>(() =>
          sb("assessment_sessions")
            .select("student_id, holland_code, scale_scores, completed_at, grade_at_session")
            .not("completed_at", "is", null)
            .order("completed_at", { ascending: false }),
        );
        if (cancelled) return;
        setRiasec(
          sessions.map((s) => ({
            sid: s.student_id,
            student: nm(s.student_id),
            grade: s.grade_at_session ?? gradeMap[s.student_id] ?? "",
            holland: s.holland_code ?? "",
            scores: s.scale_scores ?? {},
            completed: (s.completed_at ?? "").slice(0, 10),
          })),
        );

        // STEM survey — score each completed response client-side.
        const [responses, assignments] = await Promise.all([
          fetchAll<{
            id: string;
            student_id: string;
            assignment_id: string;
            survey_type: string | null;
            administration: string;
            completed_at: string | null;
          }>(() =>
            sb("survey_responses")
              .select("id, student_id, assignment_id, survey_type, administration, completed_at")
              .not("completed_at", "is", null)
              .order("completed_at", { ascending: false }),
          ),
          fetchAll<{ id: string; title: string }>(() =>
            sb("survey_assignments").select("id, title").order("id"),
          ),
        ]);
        const titleOf = new Map(assignments.map((a) => [a.id, a.title]));
        const items = await fetchAll<{
          survey_response_id: string;
          item_id: string;
          value_now: number | null;
          value_then: number | null;
          skipped: boolean;
        }>(() =>
          sb("survey_item_responses")
            .select("survey_response_id, item_id, value_now, value_then, skipped")
            .order("survey_response_id"),
        );
        if (cancelled) return;
        const byResp = new Map<string, typeof items>();
        for (const it of items) {
          const arr = byResp.get(it.survey_response_id);
          if (arr) arr.push(it);
          else byResp.set(it.survey_response_id, [it]);
        }
        const means = (rows: typeof items, which: "now" | "then") => {
          const byId: Record<string, ItemResponseValue> = {};
          for (const it of rows)
            byId[it.item_id] = {
              value: which === "now" ? it.value_now : it.value_then,
              skipped: it.skipped,
            };
          const out: Record<string, number | null> = {};
          for (const cid of ALL_CONSTRUCTS)
            out[cid] = scoreConstruct(getConstruct(cid).items, byId);
          return out;
        };
        setStem(
          responses.map((r) => {
            const rows = byResp.get(r.id) ?? [];
            const now = means(rows, "now");
            const retro = r.administration === "retrospective";
            const then = retro ? means(rows, "then") : null;
            const scores: StemRow["scores"] = {};
            for (const cid of ALL_CONSTRUCTS) {
              scores[cid] = { before: then?.[cid] ?? null, after: now[cid] ?? null };
            }
            return {
              sid: r.student_id,
              student: nm(r.student_id),
              survey: titleOf.get(r.assignment_id) ?? "STEM survey",
              surveyType: r.survey_type ?? "stem",
              administration: r.administration,
              completed: (r.completed_at ?? "").slice(0, 10),
              scores,
            };
          }),
        );

        // Item-level Likert responses — for choice-distribution charts.
        const respMeta = new Map(responses.map((r) => [r.id, r]));
        setStemItems(
          items.flatMap((it) => {
            const r = respMeta.get(it.survey_response_id);
            if (!r) return [];
            return [
              {
                sid: r.student_id,
                surveyType: r.survey_type ?? "stem",
                administration: r.administration,
                completed: (r.completed_at ?? "").slice(0, 10),
                itemId: it.item_id,
                valueNow: it.value_now,
                valueThen: it.value_then,
                skipped: it.skipped,
              },
            ];
          }),
        );

        // Open-ended survey answers (e.g. "What did you like about your
        // camp?", "What are 1-3 careers you are interested in?") — joined
        // back to the response for student + survey + date.
        const opens = await fetchAll<{
          survey_response_id: string;
          prompt: string;
          response: string;
        }>(() =>
          sb("survey_open_responses")
            .select("survey_response_id, prompt, response")
            .order("survey_response_id"),
        );
        if (cancelled) return;
        const respById = new Map(responses.map((r) => [r.id, r]));
        setOpenResp(
          opens.flatMap((o) => {
            const r = respById.get(o.survey_response_id);
            if (!r) return [];
            return [
              {
                sid: r.student_id,
                student: nm(r.student_id),
                survey: titleOf.get(r.assignment_id) ?? "STEM survey",
                prompt: o.prompt,
                response: o.response,
                date: (r.completed_at ?? "").slice(0, 10),
              },
            ];
          }),
        );
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load results");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Membership set for the selected group/kind (null = whole population).
  const memberSet = useMemo(() => {
    if (kindKey === "all" && groupKey === "all") return null;
    if (groupKey !== "all") {
      const found = groups.find((x) => `${x.kind}:${x.g.id}` === groupKey);
      return new Set(found?.g.studentIds ?? []);
    }
    // "All in <kind>" — union of every roster in that kind.
    const ids = new Set<string>();
    for (const x of groups) {
      if (x.kind === kindKey) for (const id of x.g.studentIds) ids.add(id);
    }
    return ids;
  }, [kindKey, groupKey, groups]);

  const selectedGroup =
    groupKey === "all" ? null : (groups.find((x) => `${x.kind}:${x.g.id}` === groupKey) ?? null);

  function makeFilter() {
    return (sid: string, date: string) =>
      (!memberSet || memberSet.has(sid)) &&
      (!dateFrom || date >= dateFrom) &&
      (!dateTo || date <= dateTo);
  }
  const fRiasec = useMemo(() => {
    const pass = makeFilter();
    return riasec?.filter((r) => pass(r.sid, r.completed)) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riasec, memberSet, dateFrom, dateTo]);
  const fStem = useMemo(() => {
    const pass = makeFilter();
    return stem?.filter((r) => pass(r.sid, r.completed)) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stem, memberSet, dateFrom, dateTo]);
  const fStemItems = useMemo(() => {
    const pass = makeFilter();
    return stemItems?.filter((r) => pass(r.sid, r.completed)) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stemItems, memberSet, dateFrom, dateTo]);

  const fOpen = useMemo(() => {
    const pass = makeFilter();
    return openResp?.filter((r) => pass(r.sid, r.date)) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openResp, memberSet, dateFrom, dateTo]);

  const filterActive = kindKey !== "all" || groupKey !== "all" || !!dateFrom || !!dateTo;

  // ── Excel export (always exports the FILTERED set) ─────────────────────
  function riasecSheetRows() {
    return (fRiasec ?? []).map((r) => ({
      Student: r.student,
      Grade: r.grade,
      "Holland code": r.holland,
      ...Object.fromEntries(
        RIASEC_LETTERS.map((l) => [l, r.scores[l] ?? r.scores[l.toLowerCase()] ?? ""]),
      ),
      Completed: r.completed,
    }));
  }
  function stemSheetRows() {
    return (fStem ?? []).map((r) => {
      const row: Record<string, unknown> = {
        Student: r.student,
        Survey: r.survey,
        Administration: r.administration,
        Completed: r.completed,
      };
      for (const cid of ALL_CONSTRUCTS) {
        const name = getConstruct(cid).name;
        const s = r.scores[cid];
        if (s.before != null) row[`${name} (before)`] = Number(s.before.toFixed(2));
        row[name] = s.after != null ? Number(s.after.toFixed(2)) : "";
      }
      return row;
    });
  }
  function openSheetRows() {
    return (fOpen ?? []).map((r) => ({
      Student: r.student,
      Survey: r.survey,
      Question: r.prompt,
      Answer: r.response,
      Date: r.date,
    }));
  }

  function fileTag(): string {
    const parts: string[] = [];
    if (selectedGroup) {
      parts.push(
        selectedGroup.g.name
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase()
          .slice(0, 40) || "group",
      );
    } else if (kindKey !== "all") {
      parts.push(`all-${kindKey}`);
    }
    if (dateFrom || dateTo) parts.push(`${dateFrom || "start"}_to_${dateTo || "now"}`);
    parts.push(new Date().toISOString().slice(0, 10));
    return parts.join("-");
  }

  async function exportAll() {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(riasecSheetRows()), "RIASEC");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stemSheetRows()), "STEM survey");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(openSheetRows()), "Open responses");
      XLSX.writeFile(wb, `explr-results-${fileTag()}.xlsx`);
    } finally {
      setExporting(false);
    }
  }
  async function exportTab() {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const rows = tab === "riasec" ? riasecSheetRows() : stemSheetRows();
      const label = TABS.find((t) => t.id === tab)?.label ?? "Results";
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), label.slice(0, 31));
      if (tab === "stem") {
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(openSheetRows()),
          "Open responses",
        );
      }
      XLSX.writeFile(wb, `explr-${tab}-${fileTag()}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  const counts: Record<TabId, number | null> = {
    charts: null,
    riasec: fRiasec?.length ?? null,
    stem: fStem?.length ?? null,
  };

  return (
    <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="display mt-2">Results &amp; downloads</h1>
          <p className="lead mt-3 max-w-2xl">
            Every survey and assessment result across all students — view them here, or download
            everything as one Excel workbook (a sheet per instrument).
          </p>
        </div>
        <button
          onClick={exportAll}
          disabled={exporting || !riasec || !stem}
          className="print:hidden btn-ink disabled:opacity-40"
        >
          {exporting ? "Exporting…" : "Download all (Excel)"}
        </button>
      </div>

      {err && <p className="mt-6 text-sm text-red-700">Couldn&apos;t load results: {err}</p>}

      {/* Filter — program type + specific group + date range.
          Applies to the tables AND the downloads. */}
      <div className="print:hidden mt-8 flex flex-wrap items-end gap-3 rounded-[var(--radius-card)] border border-line bg-paper-sunken px-4 py-4">
        <label className="label mb-0">
          Program type
          <select
            className="field mt-1 w-44"
            value={kindKey}
            onChange={(e) => {
              setKindKey(e.target.value as "all" | GroupKind);
              setGroupKey("all");
            }}
          >
            <option value="all">All types</option>
            {GROUP_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_META[k].label} only
              </option>
            ))}
          </select>
        </label>
        <label className="label mb-0">
          Group
          <select
            className="field mt-1 max-w-xs"
            value={groupKey}
            onChange={(e) => setGroupKey(e.target.value)}
          >
            <option value="all">
              {kindKey === "all"
                ? "All students (everyone)"
                : `All ${KIND_META[kindKey].label.toLowerCase()}`}
            </option>
            {GROUP_KINDS.filter((k) => kindKey === "all" || k === kindKey).map((kind) => {
              const of = groups.filter((x) => x.kind === kind && x.g.studentIds.length > 0);
              if (of.length === 0) return null;
              return (
                <optgroup key={kind} label={KIND_META[kind].label}>
                  {of.map(({ g }) => (
                    <option key={`${kind}:${g.id}`} value={`${kind}:${g.id}`}>
                      {g.name} ({g.studentIds.length})
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </label>
        <label className="label mb-0">
          From
          <input
            type="date"
            className="field mt-1 w-40"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label className="label mb-0">
          To
          <input
            type="date"
            className="field mt-1 w-40"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        {filterActive && (
          <button
            onClick={() => {
              setKindKey("all");
              setGroupKey("all");
              setDateFrom("");
              setDateTo("");
            }}
            className="btn-ghost text-xs"
          >
            Clear — show everyone
          </button>
        )}
        <span className="self-center text-xs text-ink-500 sm:ml-auto">
          {filterActive
            ? "Filter applies to tables and downloads."
            : "Showing the whole population."}
        </span>
      </div>

      <div className="print:hidden mt-6 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium ${tab === t.id ? "border-ink-900 bg-ink-900 text-paper" : "border-line-strong text-ink-700 hover:border-ink-900 hover:text-ink-900"}`}
          >
            {t.label}
            {counts[t.id] != null && <span className="ml-1.5 opacity-70">({counts[t.id]})</span>}
          </button>
        ))}
        {tab === "charts" ? (
          <button
            onClick={() => window.print()}
            className="inline-flex min-h-[44px] items-center text-xs font-medium text-green-deep hover:underline sm:ml-auto"
          >
            Print / save as PDF
          </button>
        ) : (
          <button
            onClick={exportTab}
            disabled={exporting}
            className="inline-flex min-h-[44px] items-center text-xs font-medium text-green-deep hover:underline disabled:opacity-40 sm:ml-auto"
          >
            Export this tab
          </button>
        )}
      </div>

      {/* Per-tab focus picker — narrow to ONE question/construct/subscale so
          side-by-side comparison across groups is readable. */}
      {tab !== "charts" && (
        <div className="print:hidden mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-500">
          <span className="eyebrow">Focus</span>
          {tab === "riasec" && (
            <select
              className="field w-full sm:w-56"
              value={riasecFocus}
              onChange={(e) => setRiasecFocus(e.target.value)}
            >
              <option value="all">All six letters</option>
              {RIASEC_LETTERS.map((l) => (
                <option key={l} value={l}>
                  {l} only
                </option>
              ))}
            </select>
          )}
          {tab === "stem" && (
            <select
              className="field w-full sm:w-72"
              value={stemFocus}
              onChange={(e) => setStemFocus(e.target.value)}
            >
              <option value="all">All constructs</option>
              {ALL_CONSTRUCTS.map((cid) => (
                <option key={cid} value={cid}>
                  {getConstruct(cid).name}
                </option>
              ))}
            </select>
          )}
          {tab === "stem" && (
            <select
              className="field w-full sm:w-72"
              value={openFocus}
              onChange={(e) => setOpenFocus(e.target.value)}
            >
              <option value="all">All open-ended questions</option>
              {[...new Set((fOpen ?? []).map((r) => r.prompt))].sort().map((p) => (
                <option key={p} value={p}>
                  {p.length > 60 ? p.slice(0, 60) + "…" : p}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        {tab === "charts" && (
          <ImpactCharts
            riasec={fRiasec}
            stem={fStem}
            stemItems={fStemItems}
            scope={
              (selectedGroup
                ? selectedGroup.g.name
                : kindKey === "all"
                  ? "All students"
                  : `All ${KIND_META[kindKey].label.toLowerCase()}`) +
              (dateFrom || dateTo ? ` · ${dateFrom || "start"} → ${dateTo || "now"}` : "")
            }
          />
        )}
        {tab === "riasec" && <RiasecTable rows={fRiasec} focus={riasecFocus} />}
        {tab === "stem" && (
          <>
            <StemTable rows={fStem} focus={stemFocus} />
            <StemItemDistribution rows={fStemItems} focus={stemFocus} />
            <OpenResponsesList
              rows={
                openFocus === "all" ? fOpen : (fOpen ?? []).filter((r) => r.prompt === openFocus)
              }
            />
          </>
        )}
      </div>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-left font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
      {children}
    </th>
  );
}
function Empty({ loading }: { loading: boolean }) {
  return <p className="py-8 text-sm text-ink-500">{loading ? "Loading…" : "No results yet."}</p>;
}
function Capped({ total }: { total: number }) {
  if (total <= DISPLAY_CAP) return null;
  return (
    <p className="mt-2 text-xs text-ink-500">
      Showing the first {DISPLAY_CAP} of {total} — the Excel download has everything.
    </p>
  );
}

function RiasecTable({ rows, focus = "all" }: { rows: RiasecRow[] | null; focus?: string }) {
  if (!rows || rows.length === 0) return <Empty loading={!rows} />;
  const letters = focus === "all" ? RIASEC_LETTERS : [focus];
  return (
    <>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken">
              <Th>Student</Th>
              <Th>Grade</Th>
              <Th>Code</Th>
              {letters.map((l) => (
                <Th key={l}>{l}</Th>
              ))}
              <Th>Completed</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-paper-raised">
            {rows.slice(0, DISPLAY_CAP).map((r, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium">{r.student}</td>
                <td className="px-3 py-2 tabular-nums">{r.grade}</td>
                <td className="px-3 py-2 font-mono font-semibold tracking-wide">{r.holland}</td>
                {letters.map((l) => (
                  <td key={l} className="px-3 py-2 tabular-nums">
                    {r.scores[l] ?? r.scores[l.toLowerCase()] ?? "—"}
                  </td>
                ))}
                <td className="px-3 py-2 text-xs text-ink-500">{r.completed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Capped total={rows.length} />
    </>
  );
}

function StemTable({ rows, focus = "all" }: { rows: StemRow[] | null; focus?: string }) {
  if (!rows || rows.length === 0) return <Empty loading={!rows} />;
  const constructs = focus === "all" ? ALL_CONSTRUCTS : [focus as (typeof ALL_CONSTRUCTS)[number]];
  return (
    <>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-sunken">
              <Th>Student</Th>
              <Th>Survey</Th>
              <Th>Admin</Th>
              {constructs.map((cid) => (
                <Th key={cid}>{getConstruct(cid).name}</Th>
              ))}
              <Th>Completed</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-paper-raised">
            {rows.slice(0, DISPLAY_CAP).map((r, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium">{r.student}</td>
                <td className="px-3 py-2 text-xs">{r.survey}</td>
                <td className="px-3 py-2 text-xs text-ink-500">{r.administration}</td>
                {constructs.map((cid) => {
                  const s = r.scores[cid];
                  return (
                    <td key={cid} className="px-3 py-2 tabular-nums text-xs">
                      {!s || s.after == null
                        ? "—"
                        : s.before != null
                          ? `${s.before.toFixed(1)}→${s.after.toFixed(1)}`
                          : s.after.toFixed(1)}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-xs text-ink-500">{r.completed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Capped total={rows.length} />
    </>
  );
}

/** Open-ended survey answers ("what did you like", career interests, …). */
function OpenResponsesList({ rows }: { rows: OpenRow[] | null }) {
  if (!rows || rows.length === 0) return null;
  return (
    <section className="mt-10">
      <h3 className="font-display text-xl font-bold">Open responses ({rows.length})</h3>
      <p className="mt-1 text-sm text-ink-700">
        What students wrote in their own words — also in the Excel download as its own sheet.
      </p>
      <div className="mt-4 space-y-3">
        {rows.slice(0, DISPLAY_CAP).map((r, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-4"
          >
            <p className="text-xs text-ink-500">
              <span className="font-medium text-ink-900">{r.student}</span> · {r.survey} · {r.date}
            </p>
            <p className="mt-1 text-xs text-ink-500">{r.prompt}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{r.response}</p>
          </div>
        ))}
      </div>
      <Capped total={rows.length} />
    </section>
  );
}

/**
 * ImpactCharts — funder-shareable visual summary of the (filtered) results.
 * STEM efficacy pairs "start" and "end" per construct from BOTH sources:
 * matched pre+post responses (same student + survey) and retrospective
 * then→now responses. Print / save as PDF hides the admin chrome.
 */
function ImpactCharts({
  riasec,
  stem,
  stemItems,
  scope,
}: {
  riasec: RiasecRow[] | null;
  stem: StemRow[] | null;
  stemItems: StemItemRow[] | null;
  scope: string;
}) {
  const loading = !riasec || !stem;

  // ── STEM start→end pairs per construct ──────────────────────────────────
  const efficacy = useMemo(() => {
    const pairs: Record<string, Array<{ b: number; a: number }>> = {};
    for (const cid of ALL_CONSTRUCTS) pairs[cid] = [];
    // Normalize the administration. Programs often create the start and end
    // as two SEPARATE assignments titled "… START" / "… END" — honor the
    // pre/post administration when present, otherwise infer it from the
    // title/label keywords.
    const norm = (r: StemRow): string => {
      const a = r.administration.toLowerCase();
      if (a === "pre" || a === "post" || a === "retrospective") return a;
      const t = `${a} ${r.survey.toLowerCase()}`;
      if (/(^|\W)(start|pre|before|beginning)(\W|$)/.test(t)) return "pre";
      if (/(^|\W)(end|post|after|final)(\W|$)/.test(t)) return "post";
      return a;
    };
    // Pair by student + survey TYPE — not by title, so a "START" assignment
    // and a separate "END" assignment still match up as one pre/post pair.
    const byKey = new Map<string, StemRow[]>();
    for (const r of stem ?? []) {
      const k = `${r.sid}::${r.surveyType}`;
      const arr = byKey.get(k);
      if (arr) arr.push(r);
      else byKey.set(k, [r]);
    }
    for (const rows of byKey.values()) {
      // Retrospective rows carry before/after together.
      for (const r of rows.filter((x) => norm(x) === "retrospective")) {
        for (const cid of ALL_CONSTRUCTS) {
          const s = r.scores[cid];
          if (s.before != null && s.after != null) pairs[cid].push({ b: s.before, a: s.after });
        }
      }
      // Matched pre + post: earliest start paired with latest end.
      const pres = rows
        .filter((x) => norm(x) === "pre")
        .sort((x, y) => x.completed.localeCompare(y.completed));
      const posts = rows
        .filter((x) => norm(x) === "post")
        .sort((x, y) => y.completed.localeCompare(x.completed));
      if (pres.length > 0 && posts.length > 0) {
        const pre = pres[0];
        const post = posts[0];
        for (const cid of ALL_CONSTRUCTS) {
          const b = pre.scores[cid].after;
          const a = post.scores[cid].after;
          if (b != null && a != null) pairs[cid].push({ b, a });
        }
      }
    }
    return ALL_CONSTRUCTS.map((cid) => {
      const p = pairs[cid];
      const n = p.length;
      const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
      return {
        cid,
        name: getConstruct(cid).name,
        max: getScale(getConstruct(cid).scale).max,
        n,
        before: n ? avg(p.map((x) => x.b)) : null,
        after: n ? avg(p.map((x) => x.a)) : null,
      };
    }).filter((r) => r.n > 0);
  }, [stem]);

  const avgGrowth = useMemo(() => {
    const deltas = efficacy.map((e) => (e.after ?? 0) - (e.before ?? 0));
    if (deltas.length === 0) return null;
    return deltas.reduce((s, d) => s + d, 0) / deltas.length;
  }, [efficacy]);

  // ── RIASEC dominant-interest distribution ────────────────────────────────
  const riasecDist = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of riasec ?? []) {
      const top = (r.holland[0] ?? "").toUpperCase();
      if (!"RIASEC".includes(top) || !top) continue;
      counts.set(top, (counts.get(top) ?? 0) + 1);
    }
    const labels: Record<string, string> = {
      R: "Realistic",
      I: "Investigative",
      A: "Artistic",
      S: "Social",
      E: "Enterprising",
      C: "Conventional",
    };
    const total = [...counts.values()].reduce((s, x) => s + x, 0);
    return RIASEC_LETTERS.map((l) => ({
      letter: l,
      label: labels[l],
      count: counts.get(l) ?? 0,
      pct: total ? Math.round(((counts.get(l) ?? 0) / total) * 100) : 0,
    }));
  }, [riasec]);
  const riasecMax = Math.max(1, ...riasecDist.map((d) => d.count));

  const assessed = new Set((riasec ?? []).map((r) => r.sid)).size;

  if (loading) return <p className="py-8 text-sm text-ink-500">Loading…</p>;

  return (
    <div className="max-w-4xl">
      <p className="text-sm text-ink-500">
        <span className="font-medium text-ink-900">{scope}</span>
        <span className="ml-2 text-xs text-ink-500">
          generated {new Date().toLocaleDateString()}
        </span>
      </p>

      {/* Stat tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Students assessed" value={String(assessed)} />
        <Tile label="STEM surveys" value={String(stem!.length)} />
        <Tile
          label="Avg STEM growth"
          value={avgGrowth == null ? "—" : `${avgGrowth >= 0 ? "+" : ""}${avgGrowth.toFixed(2)}`}
          accent={avgGrowth != null && avgGrowth > 0}
        />
        <Tile label="RIASEC assessments" value={String(riasec!.length)} />
      </div>

      {/* STEM efficacy start → end */}
      <section className="mt-10">
        <h3 className="font-display text-xl font-bold">STEM efficacy — start vs. end of program</h3>
        <p className="mt-1 text-sm text-ink-700">
          Average construct score before and after, from matched pre/post surveys and retrospective
          before/after items. Higher = more confidence and interest.
        </p>
        {efficacy.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">
            No matched start/end surveys in this selection yet.
          </p>
        ) : (
          <div className="mt-5 space-y-5">
            {efficacy.map((e) => {
              const delta = (e.after ?? 0) - (e.before ?? 0);
              return (
                <div key={e.cid}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>{e.name}</span>
                    <span className="text-xs text-ink-500">
                      {e.before!.toFixed(2)} → {e.after!.toFixed(2)} / {e.max}
                      <span
                        className={`ml-2 font-semibold ${delta >= 0 ? "text-green-deep" : "text-red-700"}`}
                      >
                        {delta >= 0 ? "+" : ""}
                        {delta.toFixed(2)}
                      </span>
                      <span className="ml-2 text-ink-500">n={e.n}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-10 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-500">
                        start
                      </span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-paper-sunken">
                        <div
                          className="h-3 rounded-full bg-ink-500"
                          style={{ width: `${Math.min(100, (e.before! / e.max) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-10 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-500">
                        end
                      </span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-paper-sunken">
                        <div
                          className="h-3 rounded-full bg-green"
                          style={{ width: `${Math.min(100, (e.after! / e.max) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* RIASEC distribution */}
      <section className="mt-10">
        <h3 className="font-display text-xl font-bold">Interest profile of this group</h3>
        <p className="mt-1 text-sm text-ink-700">
          Students by dominant Holland (RIASEC) interest type.
        </p>
        <div className="mt-4 space-y-2">
          {riasecDist.map((d) => (
            <div key={d.letter} className="flex items-center gap-3 text-sm">
              <span className="w-28 shrink-0 text-ink-700">{d.label}</span>
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-paper-sunken">
                <div
                  className="h-4 rounded-full bg-green"
                  style={{ width: `${(d.count / riasecMax) * 100}%` }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-xs tabular-nums text-ink-500">
                {d.count} · {d.pct}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* STEM item-level response distribution — full choice breakdown */}
      <section className="mt-10">
        <h3 className="font-display text-xl font-bold">STEM survey — response breakdown</h3>
        <p className="mt-1 text-sm text-ink-700">
          Every Likert response shown as a percentage of respondents per question. Switch focused
          construct on the &ldquo;STEM survey&rdquo; tab to change scope.
        </p>
        <StemItemDistribution rows={stemItems} focus="all" compact />
      </section>

      <p className="mt-10 text-xs text-ink-500">
        EXPLR Pathways · RIASEC interest assessment &amp; S-STEM survey · Use &ldquo;Print / save as
        PDF&rdquo; to share this page.
      </p>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-4">
      <p className="eyebrow">{label}</p>
      <p
        className={`mt-2 font-display text-3xl font-bold tabular-nums ${accent ? "text-green-deep" : "text-ink-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

// ─── STEM item-level response distribution ─────────────────────────────────
//
// For each item on the chosen construct(s), tally how many students picked
// each Likert point and render it as a stacked % bar. When both `then` and
// `now` values are stored on the same response (retrospective survey), we
// render a Before + After pair so growth per item is visible.

type ItemCatalog = {
  itemId: string;
  text: string;
  construct: string;
  scale: ReturnType<typeof getScale>;
};

function buildItemCatalog(): ItemCatalog[] {
  const out: ItemCatalog[] = [];
  for (const cid of ALL_CONSTRUCTS) {
    const c = getConstruct(cid);
    const scale = getScale(c.scale);
    for (const it of c.items) {
      out.push({
        itemId: it.id,
        text: it.text ?? it.career_name ?? it.domain ?? it.id,
        construct: c.name,
        scale,
      });
    }
  }
  return out;
}

const LIKERT_COLORS = ["#B85042", "#D48A7A", "#B0B0B0", "#8FC0B3", "var(--color-green)"];

function StemItemDistribution({
  rows,
  focus,
  compact,
}: {
  rows: StemItemRow[] | null;
  focus: string;
  compact?: boolean;
}) {
  const catalog = useMemo(buildItemCatalog, []);
  const byId = useMemo(() => new Map(catalog.map((c) => [c.itemId, c])), [catalog]);
  const focusName =
    focus === "all" ? null : (getConstruct(focus as (typeof ALL_CONSTRUCTS)[number])?.name ?? null);

  const distributions = useMemo(() => {
    if (!rows) return null;
    type Tally = {
      now: Map<number, number>;
      then: Map<number, number>;
      nNow: number;
      nThen: number;
    };
    const map = new Map<string, Tally>();
    for (const r of rows) {
      if (r.skipped) continue;
      const t = map.get(r.itemId) ?? { now: new Map(), then: new Map(), nNow: 0, nThen: 0 };
      if (r.valueNow != null) {
        t.now.set(r.valueNow, (t.now.get(r.valueNow) ?? 0) + 1);
        t.nNow++;
      }
      if (r.valueThen != null) {
        t.then.set(r.valueThen, (t.then.get(r.valueThen) ?? 0) + 1);
        t.nThen++;
      }
      map.set(r.itemId, t);
    }
    const out: Array<{
      construct: string;
      itemId: string;
      text: string;
      scale: ItemCatalog["scale"];
      nNow: number;
      nThen: number;
      now: Array<{ value: number; label: string; count: number; pct: number }>;
      then: Array<{ value: number; label: string; count: number; pct: number }> | null;
    }> = [];
    for (const [itemId, t] of map) {
      const cat = byId.get(itemId);
      if (!cat) continue;
      if (focusName && cat.construct !== focusName) continue;
      if (t.nNow === 0 && t.nThen === 0) continue;
      const asRow = (m: Map<number, number>, n: number) =>
        cat.scale.points.map((p) => {
          const count = m.get(p.value) ?? 0;
          return {
            value: p.value,
            label: p.label,
            count,
            pct: n ? Math.round((count / n) * 100) : 0,
          };
        });
      out.push({
        construct: cat.construct,
        itemId,
        text: cat.text,
        scale: cat.scale,
        nNow: t.nNow,
        nThen: t.nThen,
        now: asRow(t.now, t.nNow),
        then: t.nThen > 0 ? asRow(t.then, t.nThen) : null,
      });
    }
    const order = new Map(ALL_CONSTRUCTS.map((cid, i) => [getConstruct(cid).name, i]));
    out.sort(
      (a, b) =>
        order.get(a.construct)! - order.get(b.construct)! || a.itemId.localeCompare(b.itemId),
    );
    return out;
  }, [rows, focusName, byId]);

  if (!rows) return <p className="mt-6 text-sm text-ink-500">Loading response breakdown…</p>;
  if (!distributions || distributions.length === 0) {
    return (
      <p className="mt-6 text-sm text-ink-500">No STEM survey responses in this selection yet.</p>
    );
  }

  const byConstruct = new Map<string, typeof distributions>();
  for (const d of distributions) {
    const arr = byConstruct.get(d.construct);
    if (arr) arr.push(d);
    else byConstruct.set(d.construct, [d]);
  }

  return (
    <section className={compact ? "mt-6" : "mt-10"}>
      {!compact && (
        <h3 className="font-display text-xl font-bold">Response breakdown per question</h3>
      )}
      {!compact && (
        <p className="mt-1 text-sm text-ink-700">
          For each Likert item, % of students picking each option. Retrospective surveys show a
          Before → After pair.
        </p>
      )}
      <div className="mt-4 space-y-8">
        {[...byConstruct.entries()].map(([cname, items]) => (
          <div key={cname}>
            <p className="eyebrow">{cname}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-ink-500">
              {items[0].scale.points.map((p, i) => (
                <span key={p.value} className="inline-flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-sm"
                    style={{ background: LIKERT_COLORS[i] ?? "#999" }}
                  />
                  {p.label}
                </span>
              ))}
            </div>
            <div className="mt-3 space-y-4">
              {items.map((d) => (
                <div key={d.itemId}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex-1">{d.text}</span>
                    <span className="text-[10px] tabular-nums text-ink-500">
                      n={d.nNow || d.nThen}
                    </span>
                  </div>
                  {d.then && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="w-12 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-500">
                        before
                      </span>
                      <StackedBar segments={d.then} />
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    {d.then && (
                      <span className="w-12 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-500">
                        after
                      </span>
                    )}
                    <StackedBar segments={d.now} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StackedBar({
  segments,
}: {
  segments: Array<{ value: number; label: string; count: number; pct: number }>;
}) {
  return (
    <div className="flex h-5 flex-1 overflow-hidden rounded-full bg-paper-sunken text-[9px] font-medium text-white">
      {segments.map((s, i) =>
        s.pct > 0 ? (
          <div
            key={s.value}
            title={`${s.label}: ${s.count} (${s.pct}%)`}
            className="flex items-center justify-center"
            style={{ width: `${s.pct}%`, background: LIKERT_COLORS[i] ?? "#999" }}
          >
            {s.pct >= 8 ? `${s.pct}%` : ""}
          </div>
        ) : null,
      )}
    </div>
  );
}
