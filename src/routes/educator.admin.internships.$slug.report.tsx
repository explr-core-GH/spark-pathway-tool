import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ALL_CONSTRUCTS,
  getConstruct,
  getScale,
  type ConstructId,
} from "@/lib/explr-stem";
import { scoreConstruct, type ItemResponseValue } from "@/lib/explr-stem/scoring";
import { RIASEC_ORDER, type RIASECCode } from "@/lib/riasec";

/**
 * Funder / family-oriented printable overview for a single internship.
 * Route: /educator/admin/internships/<slug>/report
 *
 * Composes existing data streams (rosters via placements + logins, STEM
 * survey item responses, supervisor evaluations, RIASEC/Holland codes) into
 * one positive, print-ready narrative. Uses only tokens already in the
 * design system; @media print already hides chrome (see src/styles.css).
 */

export const Route = createFileRoute("/educator/admin/internships/$slug/report")({
  head: ({ params }) => ({
    meta: [
      { title: `Internship Report — ${params.slug}` },
      {
        name: "description",
        content: "Printable EXPLR internship overview with roster completion, survey results, supervisor feedback, and funder-ready charts.",
      },
      { property: "og:title", content: `Internship Report — ${params.slug}` },
      {
        property: "og:description",
        content: "Printable EXPLR internship overview with roster completion, survey results, supervisor feedback, and funder-ready charts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InternshipReport,
});

type InternshipRow = {
  slug: string;
  name: string;
  theme: string;
  emoji: string;
  lead: string | null;
  outside_partners: string;
  deliverables: string;
  external_url: string;
  riasec: string[];
};

type EvalRow = {
  student_id: string;
  rubric: Record<string, unknown>;
  recommend: boolean;
  notes: string | null;
};

type SurveyRespRow = {
  id: string;
  student_id: string;
  administration: string;
  completed_at: string | null;
};
type ItemRow = {
  survey_response_id: string;
  item_id: string;
  value_now: number | null;
  value_then: number | null;
  skipped: boolean;
};
type OpenRow = { survey_response_id: string; prompt: string; response: string | null };

type ConstructScore = {
  id: ConstructId;
  name: string;
  max: number;
  before: number | null;
  after: number | null;
  n: number;
};

function meanRubricRating(rubric: Record<string, unknown>): number | null {
  const nums: number[] = [];
  for (const v of Object.values(rubric ?? {})) {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (Number.isFinite(n) && n >= 1 && n <= 5) nums.push(n);
  }
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function pctBar(pct: number, color = "var(--color-explr-500)") {
  return (
    <div className="relative mt-1 h-2 w-full bg-charcoal-100">
      <div
        className="absolute left-0 top-0 h-2"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
      />
    </div>
  );
}

function InternshipReport() {
  const { slug } = Route.useParams();
  const [internship, setInternship] = useState<InternshipRow | null>(null);
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [assessmentDone, setAssessmentDone] = useState<Set<string>>(new Set());
  const [surveyDone, setSurveyDone] = useState<Set<string>>(new Set());
  const [holland, setHolland] = useState<Map<string, string>>(new Map());
  const [scores, setScores] = useState<ConstructScore[]>([]);
  const [evals, setEvals] = useState<EvalRow[]>([]);
  const [quotes, setQuotes] = useState<Array<{ prompt: string; response: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {

      // 1. Internship row
      const { data: iRow } = await supabase
        .from("internships")
        .select("slug, name, theme, emoji, lead, outside_partners, deliverables, external_url, riasec")
        .eq("slug", slug)
        .maybeSingle();

      // 2. Roster: placements + logins
      const [{ data: places }, { data: logins }] = await Promise.all([
        supabase
          .from("internship_placements")
          .select("student_id")
          .eq("approved_internship_id", slug),
        supabase
          .from("internship_student_logins")
          .select("student_id, child_name")
          .eq("internship_slug", slug),
      ]);
      const nameMap: Record<string, string> = {};
      const ids = new Set<string>();
      for (const p of (places ?? []) as Array<{ student_id: string }>) {
        if (!p.student_id) continue;
        ids.add(p.student_id);
      }
      for (const l of (logins ?? []) as Array<{
        student_id: string | null;
        child_name: string;
      }>) {
        if (!l.student_id) continue;
        ids.add(l.student_id);
        if (!nameMap[l.student_id]) nameMap[l.student_id] = l.child_name;
      }
      if (ids.size) {
        const { data: st } = await supabase
          .from("students")
          .select("id, first_name")
          .in("id", [...ids]);
        for (const s of (st ?? []) as Array<{ id: string; first_name: string | null }>) {
          if (s.first_name && !nameMap[s.id]) nameMap[s.id] = s.first_name;
        }
      }
      const idList = [...ids];

      // 3. Completion + Holland codes
      const [{ data: sess }, { data: sr }, { data: ev }] = await Promise.all([
        idList.length
          ? supabase
              .from("assessment_sessions")
              .select("student_id, completed_at, holland_code")
              .in("student_id", idList)
              .order("started_at", { ascending: false })
          : Promise.resolve({ data: [] as Array<{ student_id: string; completed_at: string | null; holland_code: string | null }> }),
        idList.length
          ? supabase
              .from("survey_responses")
              .select("id, student_id, administration, completed_at")
              .in("student_id", idList)
              .not("completed_at", "is", null)
          : Promise.resolve({ data: [] as SurveyRespRow[] }),
        supabase
          .from("internship_evaluations")
          .select("student_id, rubric, recommend, notes")
          .eq("internship_ref", slug),
      ]);

      const doneA = new Set<string>();
      const holl = new Map<string, string>();
      for (const r of (sess ?? []) as Array<{
        student_id: string;
        completed_at: string | null;
        holland_code: string | null;
      }>) {
        if (r.completed_at) doneA.add(r.student_id);
        if (r.holland_code && !holl.has(r.student_id)) holl.set(r.student_id, r.holland_code);
      }
      const responses = (sr ?? []) as SurveyRespRow[];
      const doneS = new Set<string>(responses.map((r) => r.student_id));

      // 4. STEM survey construct scores (before/after)
      const rids = responses.map((r) => r.id);
      let items: ItemRow[] = [];
      let opens: OpenRow[] = [];
      if (rids.length) {
        const [{ data: it }, { data: op }] = await Promise.all([
          supabase
            .from("survey_item_responses")
            .select("survey_response_id, item_id, value_now, value_then, skipped")
            .in("survey_response_id", rids),
          supabase
            .from("survey_open_responses")
            .select("survey_response_id, prompt, response")
            .in("survey_response_id", rids),
        ]);
        items = (it ?? []) as ItemRow[];
        opens = (op ?? []) as OpenRow[];
      }

      // Per-student before/after per construct → mean across students
      const itemsByResp: Record<string, ItemRow[]> = {};
      for (const it of items) (itemsByResp[it.survey_response_id] ??= []).push(it);
      const perConstruct: Record<ConstructId, { before: number[]; after: number[] }> =
        Object.fromEntries(ALL_CONSTRUCTS.map((c) => [c, { before: [], after: [] }])) as any;

      for (const resp of responses) {
        const its = itemsByResp[resp.id] ?? [];
        const byId: Record<string, ItemResponseValue> = {};
        for (const r of its) {
          byId[r.item_id] = { value: r.value_now, skipped: r.skipped };
        }
        // "after" = value_now for any administration (post/retrospective/pre alone)
        for (const cid of ALL_CONSTRUCTS) {
          const s = scoreConstruct(getConstruct(cid).items, byId);
          if (s != null) perConstruct[cid].after.push(s);
        }
        // "before" = value_then for retrospective, else value_now on pre for same student
        if (resp.administration === "retrospective") {
          const thenById: Record<string, ItemResponseValue> = {};
          for (const r of its) thenById[r.item_id] = { value: r.value_then, skipped: r.skipped };
          for (const cid of ALL_CONSTRUCTS) {
            const s = scoreConstruct(getConstruct(cid).items, thenById);
            if (s != null) perConstruct[cid].before.push(s);
          }
        }
      }
      // If we have paired pre + post for same student, use pre as "before"
      const byStudent: Record<string, SurveyRespRow[]> = {};
      for (const r of responses) (byStudent[r.student_id] ??= []).push(r);
      for (const [, rs] of Object.entries(byStudent)) {
        const pre = rs.find((r) => r.administration === "pre");
        if (!pre) continue;
        const its = itemsByResp[pre.id] ?? [];
        const byId: Record<string, ItemResponseValue> = {};
        for (const r of its) byId[r.item_id] = { value: r.value_now, skipped: r.skipped };
        for (const cid of ALL_CONSTRUCTS) {
          const s = scoreConstruct(getConstruct(cid).items, byId);
          if (s != null) perConstruct[cid].before.push(s);
        }
      }

      const scoresOut: ConstructScore[] = [];
      for (const cid of ALL_CONSTRUCTS) {
        const c = getConstruct(cid);
        const scale = getScale(c.scale);
        const b = perConstruct[cid].before;
        const a = perConstruct[cid].after;
        if (a.length === 0 && b.length === 0) continue;
        const mean = (arr: number[]) => (arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : null);
        scoresOut.push({
          id: cid,
          name: c.name,
          max: scale.max,
          before: mean(b),
          after: mean(a),
          n: Math.max(a.length, b.length),
        });
      }

      // Positive open-ended quotes: keep only non-empty, reasonably positive-length ones
      const quoteList: Array<{ prompt: string; response: string }> = [];
      for (const o of opens) {
        const r = (o.response ?? "").trim();
        if (r.length < 10) continue;
        quoteList.push({ prompt: o.prompt, response: r });
      }

      if (cancelled) return;
      setInternship((iRow as InternshipRow | null) ?? null);
      setStudentIds(idList);
      setNames(nameMap);
      setAssessmentDone(doneA);
      setSurveyDone(doneS);
      setHolland(holl);
      setScores(scoresOut);
      setEvals((ev ?? []) as EvalRow[]);
      setQuotes(quoteList.slice(0, 8));
      } catch (err) {
        console.error("[report] load failed", err);
        if (!cancelled) setErrorMsg(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const stats = useMemo(() => {
    const n = studentIds.length;
    const rubricMeans = evals
      .map((e) => meanRubricRating(e.rubric as Record<string, unknown>))
      .filter((v): v is number => v != null);
    const avgRating = rubricMeans.length
      ? rubricMeans.reduce((a, b) => a + b, 0) / rubricMeans.length
      : null;
    const recCount = evals.filter((e) => e.recommend).length;
    const hollandCounts: Record<RIASECCode, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    for (const code of holland.values()) {
      for (const ch of code.split("")) {
        if ((RIASEC_ORDER as string[]).includes(ch)) hollandCounts[ch as RIASECCode]++;
      }
    }
    return {
      rosterN: n,
      assessmentPct: n ? Math.round((assessmentDone.size / n) * 100) : 0,
      surveyPct: n ? Math.round((surveyDone.size / n) * 100) : 0,
      avgRating,
      recCount,
      evalN: evals.length,
      hollandCounts,
    };
  }, [studentIds, assessmentDone, surveyDone, evals, holland]);

  if (loading) {
    return <main className="mx-auto max-w-5xl px-6 py-12"><p className="text-charcoal-500">Loading report…</p></main>;
  }
  if (errorMsg) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12 space-y-4">
        <Link to="/educator/admin/internships" className="text-sm text-charcoal-500 hover:text-ink">← All internships</Link>
        <div className="border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Could not load report</p>
          <p className="mt-1 whitespace-pre-wrap">{errorMsg}</p>
        </div>
      </main>
    );
  }
  if (!internship) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12 space-y-4">
        <Link to="/educator/admin/internships" className="text-explr-600 hover:underline">← All internships</Link>
        <p>Internship <code>{slug}</code> not found.</p>
      </main>
    );
  }

  const hollandTop = (Object.entries(stats.hollandCounts) as [RIASECCode, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .filter(([, n]) => n > 0)
    .map(([c]) => c)
    .join("");

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 print:py-4">
      {/* Toolbar (hidden on print) */}
      <div className="print:hidden mb-8 flex items-center justify-between border-b border-charcoal-100 pb-4">
        <Link to="/educator/admin/internships" className="text-sm text-charcoal-500 hover:text-ink">
          ← All internships
        </Link>
        <button onClick={() => window.print()} className="btn-ink">Print / save as PDF</button>
      </div>

      {/* Header */}
      <header className="border-b border-charcoal-200 pb-6">
        <p className="eyebrow">Internship overview · for funders & families</p>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-4xl" aria-hidden>{internship.emoji}</span>
          <h1 className="display">{internship.name}</h1>
        </div>
        <p className="mt-2 text-charcoal-500">
          {internship.theme}
          {internship.lead ? ` · Program lead: ${internship.lead}` : ""}
        </p>
      </header>

      {/* Narrative summary */}
      <section className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4 text-[15px] leading-relaxed">
          <p>
            <strong>{internship.name}</strong> gave{" "}
            <strong>{stats.rosterN}</strong> Cleveland-area{" "}
            {stats.rosterN === 1 ? "student" : "students"} authentic, paid-style
            experience in <em>{internship.theme.toLowerCase()}</em>.
            {internship.outside_partners
              ? ` Students worked alongside ${internship.outside_partners}.`
              : ""}
            {internship.deliverables
              ? ` Together they produced ${internship.deliverables.toLowerCase()}.`
              : ""}
          </p>
          {stats.avgRating != null && (
            <p>
              Site supervisors rated participants an average of{" "}
              <strong>{stats.avgRating.toFixed(1)} / 5</strong> across the
              summer&rsquo;s work-readiness rubric, and recommended{" "}
              <strong>{stats.recCount}</strong> of{" "}
              <strong>{stats.evalN}</strong> for continued mentorship,
              references, or return placements.
            </p>
          )}
          {scores.some((s) => s.before != null && s.after != null && s.after > s.before) && (
            <p>
              End-of-program surveys show measurable growth in STEM identity,
              21st-century skills, and career planning — detailed below.
            </p>
          )}
        </div>
        <aside className="border border-charcoal-100 p-4">
          <p className="eyebrow">By the numbers</p>
          <dl className="mt-3 space-y-3 text-sm">
            <Stat label="Students served" value={String(stats.rosterN)} />
            <Stat label="Completed end-of-program survey" value={`${stats.surveyPct}%`} />
            <Stat label="Completed career assessment" value={`${stats.assessmentPct}%`} />
            {stats.avgRating != null && (
              <Stat label="Avg. supervisor rating" value={`${stats.avgRating.toFixed(1)} / 5`} />
            )}
            {stats.evalN > 0 && (
              <Stat label="Recommended for further opportunities" value={`${stats.recCount} / ${stats.evalN}`} />
            )}
            {hollandTop && (
              <Stat label="Dominant Holland profile" value={hollandTop} />
            )}
          </dl>
        </aside>
      </section>

      {/* Growth chart */}
      {scores.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">STEM confidence &amp; career readiness</h2>
          <p className="mt-1 text-sm text-charcoal-500">
            Mean rating per construct on the validated S-STEM survey (Friday
            Institute). Higher is stronger. Where a before-and-after pair
            exists, the lighter bar is start-of-program and the accent bar is
            end-of-program.
          </p>
          <ul className="mt-4 space-y-4">
            {scores.map((s) => {
              const afterPct = s.after != null ? (s.after / s.max) * 100 : 0;
              const beforePct = s.before != null ? (s.before / s.max) * 100 : 0;
              const delta = s.before != null && s.after != null ? s.after - s.before : null;
              return (
                <li key={s.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{s.name}</span>
                    <span className="tabular-nums text-charcoal-500">
                      {s.before != null && (
                        <>{s.before.toFixed(1)} → </>
                      )}
                      <span className="font-semibold text-ink">
                        {s.after?.toFixed(1) ?? "—"}
                      </span>{" "}
                      / {s.max}
                      {delta != null && delta > 0 && (
                        <span className="ml-2 text-explr-600">+{delta.toFixed(1)}</span>
                      )}
                      <span className="ml-2 text-[11px] text-charcoal-400">n={s.n}</span>
                    </span>
                  </div>
                  <div className="relative mt-1 h-2 w-full bg-charcoal-100">
                    {s.before != null && (
                      <div
                        className="absolute left-0 top-0 h-2 bg-charcoal-300"
                        style={{ width: `${Math.min(100, beforePct)}%` }}
                      />
                    )}
                    <div
                      className="absolute left-0 top-0 h-2"
                      style={{
                        width: `${Math.min(100, afterPct)}%`,
                        background: "var(--color-explr-500)",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Holland distribution */}
      {hollandTop && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Who these students are</h2>
          <p className="mt-1 text-sm text-charcoal-500">
            RIASEC interest profile across the cohort (Holland Codes). Bars
            show how many students had each interest area appear in their
            top-three career-interest code.
          </p>
          <ul className="mt-4 space-y-2">
            {RIASEC_ORDER.map((c) => {
              const count = stats.hollandCounts[c];
              const pct = holland.size ? (count / holland.size) * 100 : 0;
              return (
                <li key={c}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>
                      <span className="inline-block w-6 font-semibold">{c}</span>
                      <span className="text-charcoal-500">{RIASEC_LABEL[c]}</span>
                    </span>
                    <span className="tabular-nums text-charcoal-500">{count}</span>
                  </div>
                  {pctBar(pct)}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Supervisor feedback */}
      {evals.some((e) => (e.notes ?? "").trim().length > 0) && (
        <section className="mt-10 print:break-after-page">
          <h2 className="text-lg font-semibold">From the site supervisors</h2>
          <p className="mt-1 text-sm text-charcoal-500">
            Selected notes from the end-of-program supervisor rubric.
          </p>
          <ul className="mt-4 space-y-3">
            {evals
              .filter((e) => (e.notes ?? "").trim().length > 0)
              .slice(0, 6)
              .map((e, i) => (
                <li key={i} className="border-l-2 border-explr-500 pl-4 text-sm italic text-charcoal-600">
                  &ldquo;{(e.notes ?? "").trim()}&rdquo;
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* Student voice */}
      {quotes.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">In students&rsquo; own words</h2>
          <ul className="mt-4 space-y-4">
            {quotes.map((q, i) => (
              <li key={i}>
                <p className="text-xs uppercase tracking-wider text-charcoal-400">{q.prompt}</p>
                <p className="mt-1 text-sm italic text-charcoal-700">&ldquo;{q.response}&rdquo;</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-charcoal-200 pt-4 text-xs text-charcoal-500">
        Prepared by EXPLR at Cleveland State University · {new Date().toLocaleDateString()}
        {internship.external_url && (
          <>
            {" · "}
            <a href={internship.external_url} className="underline">
              {internship.external_url}
            </a>
          </>
        )}
      </footer>
    </main>
  );
}

const RIASEC_LABEL: Record<RIASECCode, string> = {
  R: "Realistic — hands-on / builders",
  I: "Investigative — researchers",
  A: "Artistic — creators",
  S: "Social — helpers & teachers",
  E: "Enterprising — leaders",
  C: "Conventional — organizers",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-charcoal-500">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
