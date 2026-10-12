import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RIASEC, RIASEC_ORDER, type RIASECCode } from "@/lib/riasec";
import { SurveyResultsPanel } from "@/components/SurveyResultsPanel";

/**
 * FamilyPortal — the "For families" tab on the student dashboard. Shows the
 * student's COMPLETED results (RIASEC interest profile, STEM survey) on
 * sub-tabs — each only appears when that one's done — plus an "About these
 * results" explainer. Runs in the student's own session, so it reads their
 * own rows under existing RLS.
 */

// survey_responses isn't in the generated types.
const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

type Riasec = { hollandCode: string; scaleScores: Record<string, number> };

export type FamilyResultsData = {
  riasec: Riasec | null;
  stemDone: boolean;
};

export function FamilyPortal({ studentId, grade }: { studentId: string; grade: number | null }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FamilyResultsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: sess }, { data: stem }] = await Promise.all([
        supabase
          .from("assessment_sessions")
          .select("holland_code, scale_scores, completed_at")
          .eq("student_id", studentId)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        sb("survey_responses")
          .select("id")
          .eq("student_id", studentId)
          .not("completed_at", "is", null)
          .limit(1),
      ]);
      if (cancelled) return;

      const r: Riasec | null = sess?.holland_code
        ? {
            hollandCode: sess.holland_code,
            scaleScores: (sess.scale_scores as Record<string, number>) ?? {},
          }
        : null;

      setData({ riasec: r, stemDone: ((stem ?? []) as unknown[]).length > 0 });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading || !data) {
    return (
      <p role="status" className="mt-8 text-sm text-ink-500">
        Loading results…
      </p>
    );
  }
  return (
    <FamilyResults data={data} grade={grade} stemPanel={<StemPanel studentId={studentId} />} />
  );
}

/**
 * The family-facing results view. Used inside the student's own session
 * (above) and on /family/view for caregivers who opened a family code,
 * where the data arrives from the server and the STEM panel (which needs
 * the student's own RLS access) is omitted.
 */
export function FamilyResults({
  data,
  grade,
  stemPanel,
}: {
  data: FamilyResultsData;
  grade: number | null;
  stemPanel?: React.ReactNode;
}) {
  const { riasec, stemDone } = data;
  const tabs: Array<{ id: string; label: string }> = [];
  if (riasec) tabs.push({ id: "interest", label: "Interest profile" });
  if (stemDone && stemPanel) tabs.push({ id: "stem", label: "STEM survey" });
  tabs.push({ id: "about", label: "About these results" });
  const [tab, setTab] = useState<string>(tabs[0].id);
  const current = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;

  return (
    <div className="mt-6 pb-8">
      <p className="text-sm text-ink-700">
        Your student&rsquo;s completed results, plus what each one means. Everything is a starting
        point for conversation — never a label or a verdict.
      </p>

      {/* Sub-tabs — only the completed instruments show up. */}
      <div
        role="tablist"
        aria-label="Family results"
        className="mt-5 flex flex-wrap gap-1 border-b border-line"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`family-tab-${t.id}`}
            aria-selected={current === t.id}
            aria-controls="family-tabpanel"
            tabIndex={current === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => {
              const i = tabs.findIndex((x) => x.id === current);
              let next = -1;
              if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
              else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
              else if (e.key === "Home") next = 0;
              else if (e.key === "End") next = tabs.length - 1;
              if (next >= 0) {
                e.preventDefault();
                setTab(tabs[next].id);
                document.getElementById(`family-tab-${tabs[next].id}`)?.focus();
              }
            }}
            className={`-mb-px inline-flex min-h-[44px] items-center border-b-2 px-3 text-[15px] transition-colors ${
              current === t.id
                ? "border-ink-900 font-semibold text-ink-900"
                : "border-transparent text-ink-500 hover:text-ink-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        className="mt-6"
        role="tabpanel"
        id="family-tabpanel"
        aria-labelledby={`family-tab-${current}`}
      >
        {current === "interest" && riasec && <InterestPanel data={riasec} />}
        {current === "stem" && stemPanel}
        {current === "about" && <AboutPanel grade={grade} />}
      </div>
    </div>
  );
}

// ── Career explorer callout ──────────────────────────────────────────────
function CareersCallout() {
  return (
    <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
          <Search className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
        </span>
        <p className="font-display text-lg font-semibold">Search jobs by your Holland code</p>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-ink-700">
        Your student&rsquo;s <strong>Holland code</strong> (their three interest letters) is the
        key. The EXPLR career-connected site is wired to real workforce data, so families can search
        for jobs and careers that match the code —{" "}
        <strong>what they pay, where they&rsquo;re growing, and the path to get there</strong>.
        It&rsquo;s the same six-interest (RIASEC) system as the U.S. Department of Labor&rsquo;s
        O*NET.
      </p>
      <ol className="mt-3 space-y-1 text-sm text-ink-700">
        <li>
          1. Go to{" "}
          <a
            className="ink-link"
            href="https://explrpathways.netlify.app/"
            target="_blank"
            rel="noreferrer"
          >
            explrpathways.netlify.app
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </li>
        <li>
          2. Choose <strong>&ldquo;Explore as a family.&rdquo;</strong>
        </li>
        <li>
          3. Search by your student&rsquo;s Holland code (e.g. their letters above) to see matching
          jobs — with pay and pathways.
        </li>
      </ol>
      <a
        href="https://explrpathways.netlify.app/"
        target="_blank"
        rel="noreferrer"
        className="btn-ink mt-4"
      >
        Search jobs by code →<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  );
}

// ── Interest profile (RIASEC) ────────────────────────────────────────────
function InterestPanel({ data }: { data: Riasec }) {
  const top = (
    data.hollandCode.split("").filter((c) => RIASEC[c as RIASECCode]) as RIASECCode[]
  ).slice(0, 3);
  const sorted = [...RIASEC_ORDER].sort(
    (a, b) => (data.scaleScores[b] ?? 0) - (data.scaleScores[a] ?? 0),
  );
  return (
    <div>
      <p className="eyebrow">Interest assessment (RIASEC)</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {top.map((c) => (
          <span
            key={c}
            className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-paper-raised"
            style={{ background: RIASEC[c].color }}
            aria-hidden
          >
            {c}
          </span>
        ))}
        <span className="font-display text-3xl font-bold tracking-wide">{top.join("")}</span>
      </div>
      <p className="mt-3 max-w-2xl text-sm text-ink-700">
        Your student leaned toward{" "}
        {top.map((c, i) => (
          <span key={c}>
            {i > 0 ? " · " : ""}
            <span style={{ color: RIASEC[c].ink }} className="font-medium">
              {RIASEC[c].hsPlainName}
            </span>
          </span>
        ))}
        . Here&rsquo;s how all six interests ranked:
      </p>
      <ul className="mt-5 space-y-3">
        {sorted.map((c) => {
          const d = RIASEC[c];
          const score = data.scaleScores[c] ?? 0;
          return (
            <li key={c}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm">
                  <span className="font-semibold" style={{ color: d.ink }}>
                    {d.code}
                  </span>{" "}
                  {d.hsPlainName}
                </span>
                <span className="text-xs tabular-nums text-ink-500">{score.toFixed(1)} / 5</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper-sunken">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(score / 5) * 100}%`, background: d.color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <CareersCallout />
    </div>
  );
}

// ── STEM survey results + explainer ──────────────────────────────────────
function StemPanel({ studentId }: { studentId: string }) {
  return (
    <div className="space-y-8">
      <section>
        <p className="eyebrow">STEM survey</p>
        <h3 className="mt-2 font-display text-xl font-semibold">
          Your student&rsquo;s STEM attitudes &amp; confidence
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-700">
          Programs give this short survey at the start and end (or as one before-and-after
          reflection) to see how a student&rsquo;s confidence and interest grow. It measures{" "}
          <strong>attitudes — there are no right or wrong answers</strong> — across several areas:
        </p>
        <ul className="mt-3 grid gap-1.5 text-sm text-ink-700 sm:grid-cols-2">
          <li>
            · <strong>Math / Science</strong> — confidence and attitudes toward each.
          </li>
          <li>
            · <strong>Engineering &amp; Technology</strong> — interest in building and tech.
          </li>
          <li>
            · <strong>21st-Century Learning</strong> — teamwork, communication, persistence.
          </li>
          <li>
            · <strong>STEM career interest</strong> — interest in STEM jobs.
          </li>
          <li>
            · <strong>Career planning</strong> — confidence planning next steps.
          </li>
        </ul>
      </section>

      <SurveyResultsPanel studentId={studentId} />

      <p className="border-t border-line pt-6 text-xs text-ink-500">
        Based on the <strong>S-STEM Survey</strong> (Friday Institute for Educational Innovation,
        2012) — a widely used, validated instrument for evaluating STEM programs — with
        career-planning items adapted from Falco &amp; Summers (2019). Scored at the area level
        (never single questions); it reflects attitudes and confidence, not ability.
      </p>
    </div>
  );
}

// ── About / explainer ────────────────────────────────────────────────────
function AboutPanel({ grade: _grade }: { grade: number | null }) {
  return (
    <div className="space-y-10">
      <section>
        <p className="eyebrow">The interest assessment</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-700">
          Students rate how much they&rsquo;d enjoy a range of everyday activities. Their answers
          sort into <strong>six interest areas</strong> (the RIASEC model); the top three become
          their &ldquo;Holland code.&rdquo; Almost everyone is a blend. EXPLR uses RIASEC because
          it&rsquo;s the most researched framework for this age (45+ years; it underlies the U.S.
          Department of Labor&rsquo;s O*NET career tools).
        </p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {RIASEC_ORDER.map((c) => {
            const d = RIASEC[c];
            return (
              <li key={c} className="flex gap-3">
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-paper-raised"
                  style={{ background: d.color }}
                  aria-hidden
                >
                  {c}
                </span>
                <div>
                  <p className="font-medium" style={{ color: d.ink }}>
                    {d.hsPlainName}
                  </p>
                  <p className="text-sm text-ink-700">{d.hsDescription}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <CareersCallout />
      </section>

      <section className="border-t border-line pt-8">
        <p className="eyebrow">What the results are — and aren&rsquo;t</p>
        <ul className="mt-3 max-w-2xl space-y-2 text-sm text-ink-700">
          <li>
            · A <strong>strength</strong>, framed positively — never a verdict or a limit.
          </li>
          <li>
            · <strong>Private</strong> to your student; research surveys are never shown next to a
            name.
          </li>
          <li>
            · <strong>No grades</strong> and no high-stakes scoring in the interest tools.
          </li>
          <li>· A moment in time — interests grow and change a lot at this age.</li>
        </ul>
      </section>

      <section className="border-t border-line pt-8">
        <p className="eyebrow">How to use this at home</p>
        <ul className="mt-3 max-w-2xl space-y-2 text-sm text-ink-700">
          <li>
            · Ask <em>&ldquo;which activities did you enjoy, and why?&rdquo;</em>
          </li>
          <li>· Use the interests to pick clubs, summer programs, and things to try next.</li>
          <li>
            · Reframe &ldquo;what do you want to be?&rdquo; as &ldquo;what do you like to do?&rdquo;
          </li>
        </ul>
      </section>

      <p className="border-t border-line pt-6 text-xs text-ink-500">
        Questions? Ask your camp instructor or email{" "}
        <a href="mailto:j.seigler@csuohio.edu" className="ink-link">
          j.seigler@csuohio.edu
        </a>
        .
      </p>
    </div>
  );
}
