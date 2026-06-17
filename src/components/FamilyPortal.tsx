import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RIASEC, RIASEC_ORDER, type RIASECCode } from "@/lib/riasec";
import { INTERNSHIPS } from "@/lib/internships-catalog";
import { sectorLabel } from "@/lib/internship-survey/items";

/**
 * FamilyPortal — the "For families" tab on the student dashboard. Shows the
 * student's COMPLETED results across instruments (RIASEC interest profile,
 * internship matches, aptitude snapshot) on sub-tabs — each only appears when
 * that one's done — plus an "About these results" explainer. Runs in the
 * student's own session, so it reads their own rows under existing RLS.
 */

// internship_survey_results / aptitude_results aren't in the generated types.
const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

type Riasec = { hollandCode: string; scaleScores: Record<string, number> };
type Match = { slug: string; name: string; emoji: string; theme: string; whyFit: string };
type SurveyRes = {
  hollandCode: string | null;
  sectorValues: Record<string, number> | null;
  matches: Match[] | null;
};
type Apt = { band: string; subscaleScores: Record<string, number> | null; total: number; items: number };

export function FamilyPortal({ studentId, grade }: { studentId: string; grade: number | null }) {
  const [loading, setLoading] = useState(true);
  const [riasec, setRiasec] = useState<Riasec | null>(null);
  const [survey, setSurvey] = useState<SurveyRes | null>(null);
  const [apt, setApt] = useState<Apt | null>(null);
  const [tab, setTab] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: sess }, { data: sv }, { data: ap }] = await Promise.all([
        supabase
          .from("assessment_sessions")
          .select("holland_code, scale_scores, completed_at")
          .eq("student_id", studentId)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        sb("internship_survey_results")
          .select("holland_code, sector_values, matches")
          .eq("student_id", studentId)
          .maybeSingle(),
        sb("aptitude_results")
          .select("band, subscale_scores, total_score, total_items, completed_at")
          .eq("student_id", studentId)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      const r: Riasec | null =
        sess?.holland_code ? { hollandCode: sess.holland_code, scaleScores: (sess.scale_scores as Record<string, number>) ?? {} } : null;
      const s: SurveyRes | null = sv
        ? { hollandCode: sv.holland_code ?? null, sectorValues: sv.sector_values ?? null, matches: (sv.matches as Match[]) ?? null }
        : null;
      const a: Apt | null = ap
        ? { band: ap.band, subscaleScores: ap.subscale_scores ?? null, total: ap.total_score ?? 0, items: ap.total_items ?? 0 }
        : null;

      setRiasec(r);
      setSurvey(s);
      setApt(a);
      // Default to the first available results tab; fall back to the explainer.
      setTab(r ? "interest" : s ? "internship" : a ? "aptitude" : "about");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return <p className="mt-8 text-sm text-charcoal-400">Loading results…</p>;
  }

  const tabs: Array<{ id: string; label: string }> = [];
  if (riasec) tabs.push({ id: "interest", label: "Interest profile" });
  if (survey) tabs.push({ id: "internship", label: "Internship matches" });
  if (apt) tabs.push({ id: "aptitude", label: "Aptitude" });
  tabs.push({ id: "about", label: "About these results" });

  const current = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;

  return (
    <div className="mt-6 pb-8">
      <p className="text-sm text-charcoal-500">
        Your student&rsquo;s completed results, plus what each one means. Everything is a starting
        point for conversation — never a label or a verdict.
      </p>

      {/* Sub-tabs — only the completed instruments show up. */}
      <div role="tablist" aria-label="Family results" className="mt-5 flex flex-wrap gap-1 border-b border-charcoal-100">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={current === t.id}
            onClick={() => setTab(t.id)}
            className="border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              borderColor: current === t.id ? "var(--ink)" : "transparent",
              color: current === t.id ? "var(--ink)" : "var(--color-charcoal-400)",
              fontWeight: current === t.id ? 500 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {current === "interest" && riasec && <InterestPanel data={riasec} />}
        {current === "internship" && survey && <InternshipPanel data={survey} />}
        {current === "aptitude" && apt && <AptitudePanel data={apt} />}
        {current === "about" && <AboutPanel grade={grade} />}
      </div>
    </div>
  );
}

// ── Career explorer callout ──────────────────────────────────────────────
function CareersCallout() {
  return (
    <div className="mt-6 border border-charcoal-200 bg-charcoal-50 p-5">
      <p className="eyebrow" style={{ color: "var(--explr)" }}>Search careers by interest code</p>
      <p className="mt-2 max-w-2xl text-sm text-charcoal-600">
        Your student&rsquo;s interest code uses the same six-interest (RIASEC) system career experts
        use — it&rsquo;s the framework behind the U.S. Department of Labor&rsquo;s O*NET career database.
        On the EXPLR Pathways site you can explore careers that match a code.
      </p>
      <ol className="mt-3 space-y-1 text-sm text-charcoal-600">
        <li>1. Go to{" "}
          <a className="ink-link" href="https://explrpathways.netlify.app/" target="_blank" rel="noreferrer">
            explrpathways.netlify.app
          </a>
          .
        </li>
        <li>2. On the Holland wheel, tap your student&rsquo;s interest letters (their code).</li>
        <li>3. See careers that match — and the EXPLR programs that build toward them.</li>
      </ol>
      <a
        href="https://explrpathways.netlify.app/"
        target="_blank"
        rel="noreferrer"
        className="btn-ink mt-4 inline-block text-sm"
      >
        Explore careers by code →
      </a>
    </div>
  );
}

// ── Interest profile (RIASEC) ────────────────────────────────────────────
function InterestPanel({ data }: { data: Riasec }) {
  const top = (data.hollandCode.split("").filter((c) => RIASEC[c as RIASECCode]) as RIASECCode[]).slice(0, 3);
  const sorted = [...RIASEC_ORDER].sort((a, b) => (data.scaleScores[b] ?? 0) - (data.scaleScores[a] ?? 0));
  return (
    <div>
      <p className="eyebrow">Interest assessment (RIASEC)</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {top.map((c) => (
          <span
            key={c}
            className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ background: RIASEC[c].color }}
            aria-hidden
          >
            {c}
          </span>
        ))}
        <span className="text-3xl font-light tracking-wide">{top.join("")}</span>
      </div>
      <p className="mt-3 max-w-2xl text-sm text-charcoal-600">
        Your student leaned toward{" "}
        {top.map((c, i) => (
          <span key={c}>
            {i > 0 ? " · " : ""}
            <span style={{ color: RIASEC[c].color }} className="font-medium">
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
                  <span className="font-semibold" style={{ color: d.color }}>{d.code}</span>{" "}
                  {d.hsPlainName}
                </span>
                <span className="text-xs tabular-nums text-charcoal-500">{score.toFixed(1)} / 5</span>
              </div>
              <div className="mt-1 h-1.5 bg-charcoal-100">
                <div className="h-full" style={{ width: `${(score / 5) * 100}%`, background: d.color }} />
              </div>
            </li>
          );
        })}
      </ul>
      <CareersCallout />
    </div>
  );
}

// ── Internship matches ───────────────────────────────────────────────────
function InternshipPanel({ data }: { data: SurveyRes }) {
  const sectorIds = data.sectorValues
    ? Object.entries(data.sectorValues)
        .filter(([, v]) => v === 2)
        .map(([id]) => id)
    : [];
  const matches = data.matches ?? [];
  return (
    <div>
      <p className="eyebrow">Internship interest survey</p>
      <h3 className="mt-2 text-lg font-medium">Internships your student matched with</h3>
      {sectorIds.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {sectorIds.map((id) => (
            <li key={id} className="border border-charcoal-200 px-3 py-1 text-xs text-charcoal-700">
              {sectorLabel(id)}
            </li>
          ))}
        </ul>
      )}
      {matches.length === 0 ? (
        <p className="mt-4 text-sm text-charcoal-500">No matches recorded yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {matches.map((m, i) => {
            const full = INTERNSHIPS.find((x) => x.slug === m.slug);
            return (
              <li key={m.slug} className="border border-charcoal-100 p-4">
                <p className="eyebrow" style={{ color: "var(--explr)" }}>{i + 1}. {m.theme}</p>
                <p className="mt-1 font-medium">
                  <span className="mr-2" aria-hidden>{m.emoji}</span>{m.name}
                </p>
                {full?.deliverables && <p className="mt-1 text-sm text-charcoal-500">{full.deliverables}</p>}
                {m.whyFit && (
                  <p className="mt-2 text-sm italic" style={{ color: "var(--explr)" }}>
                    Why this fits: {m.whyFit}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-xs text-charcoal-400">
        Matches are ranked by your student&rsquo;s interests. In grades 8–12 they can apply to any of
        these from their dashboard.
      </p>
    </div>
  );
}

// ── Aptitude ───────────────────────────────────────────────────────────────
function AptitudePanel({ data }: { data: Apt }) {
  const subs = data.subscaleScores && typeof data.subscaleScores === "object"
    ? Object.entries(data.subscaleScores)
    : [];
  const pct = data.items > 0 ? Math.round((data.total / data.items) * 100) : null;
  return (
    <div>
      <p className="eyebrow">Aptitude battery ({data.band === "HS" ? "high school" : "middle school"})</p>
      <h3 className="mt-2 text-lg font-medium">A quick reasoning snapshot</h3>
      {pct !== null && (
        <p className="mt-3 text-3xl font-light">
          {data.total}
          <span className="text-lg text-charcoal-400"> / {data.items} correct</span>
        </p>
      )}
      {subs.length > 0 && (
        <ul className="mt-4 space-y-2">
          {subs.map(([name, val]) => (
            <li key={name} className="flex items-baseline justify-between border-b border-charcoal-100 pb-2 text-sm">
              <span className="capitalize text-charcoal-700">{name.replace(/[_-]+/g, " ")}</span>
              <span className="tabular-nums text-charcoal-500">{String(val)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 max-w-2xl text-xs text-charcoal-400">
        This is a low-stakes snapshot of puzzle-style reasoning — it is <strong>not a grade</strong>,
        not a placement test, and is never used to limit any opportunity. Use it to celebrate a
        strength or spark a conversation.
      </p>
    </div>
  );
}

// ── About / explainer ────────────────────────────────────────────────────
function AboutPanel({ grade }: { grade: number | null }) {
  const isHS = grade !== null && grade >= 8;
  return (
    <div className="space-y-10">
      <section>
        <p className="eyebrow">The interest assessment</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-600">
          Students rate how much they&rsquo;d enjoy a range of everyday activities. Their answers sort
          into <strong>six interest areas</strong> (the RIASEC model); the top three become their
          &ldquo;Holland code.&rdquo; Almost everyone is a blend. EXPLR uses RIASEC because it&rsquo;s the
          most researched framework for this age (45+ years; it underlies the U.S. Department of
          Labor&rsquo;s O*NET career tools).
        </p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {RIASEC_ORDER.map((c) => {
            const d = RIASEC[c];
            return (
              <li key={c} className="flex gap-3">
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: d.color }}
                  aria-hidden
                >
                  {c}
                </span>
                <div>
                  <p className="font-medium" style={{ color: d.color }}>{d.hsPlainName}</p>
                  <p className="text-sm text-charcoal-600">{d.hsDescription}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <CareersCallout />
      </section>

      <section className="border-t border-charcoal-100 pt-8">
        <p className="eyebrow">The internship interest survey</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-600">
          A short survey that reads interests, sectors, and work style, then <strong>ranks the real
          EXPLR internships</strong> that fit best — each with a plain &ldquo;why this fits you.&rdquo;
          {isHS ? " Your student can explore and apply." : " Matching opens up in grades 8–12."}
        </p>
      </section>

      <section className="border-t border-charcoal-100 pt-8">
        <p className="eyebrow">What the results are — and aren&rsquo;t</p>
        <ul className="mt-3 max-w-2xl space-y-2 text-sm text-charcoal-600">
          <li>· A <strong>strength</strong>, framed positively — never a verdict or a limit.</li>
          <li>· <strong>Private</strong> to your student; research surveys are never shown next to a name.</li>
          <li>· <strong>No grades</strong> and no high-stakes scoring in the interest tools.</li>
          <li>· A moment in time — interests grow and change a lot at this age.</li>
        </ul>
      </section>

      <section className="border-t border-charcoal-100 pt-8">
        <p className="eyebrow">How to use this at home</p>
        <ul className="mt-3 max-w-2xl space-y-2 text-sm text-charcoal-600">
          <li>· Ask <em>&ldquo;which activities did you enjoy, and why?&rdquo;</em></li>
          <li>· Use the interests to pick clubs, summer programs, and things to try next.</li>
          <li>· Reframe &ldquo;what do you want to be?&rdquo; as &ldquo;what do you like to do?&rdquo;</li>
        </ul>
      </section>

      <p className="border-t border-charcoal-100 pt-6 text-xs text-charcoal-400">
        Questions? Ask your camp educator or email{" "}
        <a href="mailto:support@explr.cc" className="ink-link">support@explr.cc</a>.
      </p>
    </div>
  );
}
