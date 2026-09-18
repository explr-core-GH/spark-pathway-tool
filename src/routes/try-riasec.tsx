import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ITEMS,
  LIKERT_LABELS,
  buildItemSequence,
  scoreResponses,
  type LikertValue,
} from "@/lib/assessment-items";
import { RIASEC, RIASEC_ORDER, type RIASECCode } from "@/lib/riasec";
import { HollandHexagon } from "@/components/HollandHexagon";

/**
 * Public, login-free RIASEC demo for educators. Nothing is written to the
 * database — answers live in component state and results are computed with
 * the same scoring function the student assessment uses.
 */
export const Route = createFileRoute("/try-riasec")({
  head: () => ({
    meta: [
      { title: "Try the RIASEC interest assessment — EXPLR Pathways" },
      {
        name: "description",
        content:
          "Take the EXPLR RIASEC interest assessment yourself — no account needed. See the same Holland code results your students receive.",
      },
      { property: "og:title", content: "Try the RIASEC interest assessment — EXPLR Pathways" },
      {
        property: "og:description",
        content:
          "Experience the student interest assessment and get your own Holland code. No login required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TryRiasec,
});

const FACES: Record<LikertValue, string> = { 1: "😣", 2: "🙁", 3: "😐", 4: "🙂", 5: "😄" };

function TryRiasec() {
  const [seed] = useState(() => Math.random().toString(36).slice(2));
  const sequence = useMemo(() => buildItemSequence(seed), [seed]);
  const itemMap = useMemo(() => new Map(ITEMS.map((i) => [i.id, i])), []);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  const total = sequence.length;

  function answer(value: LikertValue) {
    const itemId = sequence[idx];
    setAnswers((a) => ({ ...a, [itemId]: value }));
    if (idx + 1 >= total) setDone(true);
    else setIdx(idx + 1);
  }

  function restart() {
    setAnswers({});
    setIdx(0);
    setDone(false);
  }

  if (done) {
    const responses = sequence
      .filter((id) => answers[id] != null)
      .map((id) => ({ item_id: id, value: answers[id], response_time_ms: 2000 }));
    const { scale_scores, holland_code } = scoreResponses(responses);
    const top = holland_code.split("") as RIASECCode[];
    const primary = RIASEC[top[0]];
    const sorted = [...RIASEC_ORDER].sort((a, b) => scale_scores[b] - scale_scores[a]);

    return (
      <div className="min-h-screen">
        <Header right={<button onClick={restart} className="text-sm text-charcoal-500 hover:text-ink">Start over</button>} />
        <main className="mx-auto max-w-5xl px-6 py-16">
          <p className="eyebrow">Your Holland code</p>
          <h1 className="display mt-4" style={{ color: primary.color }}>{holland_code}</h1>
          <p className="lead mt-6 max-w-2xl">
            You leaned strongest toward <strong>{primary.name}</strong>. This is exactly what
            your students see when they finish the assessment.
          </p>

          <div className="mt-14 grid gap-14 lg:grid-cols-[360px_1fr]">
            <div className="flex justify-center">
              <HollandHexagon size={320} active={top[0]} />
            </div>
            <div>
              <p className="eyebrow">All six dimensions</p>
              <ul className="mt-6 space-y-4">
                {sorted.map((c, i) => {
                  const dim = RIASEC[c];
                  const score = scale_scores[c];
                  return (
                    <li key={c}>
                      <div className="flex items-baseline justify-between gap-4">
                        <div className="flex items-baseline gap-3">
                          <span className="w-4 text-xs tabular-nums text-charcoal-400">{i + 1}</span>
                          <span className="text-sm font-medium" style={{ color: dim.color }}>{dim.code}</span>
                          <span className={top.includes(c) ? "text-ink" : "text-charcoal-500"}>{dim.name}</span>
                        </div>
                        <span className="text-sm tabular-nums text-charcoal-500">{score.toFixed(2)}</span>
                      </div>
                      <div className="mt-2 h-1 bg-charcoal-100">
                        <div className="h-full" style={{ width: `${(score / 5) * 100}%`, background: dim.color }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <section className="mt-16 border-t border-charcoal-100 pt-10">
            <p className="eyebrow" style={{ color: primary.color }}>{primary.code} · {primary.name}</p>
            <p className="mt-4 text-2xl font-light">{primary.hsDescription}</p>
            <p className="mt-4 text-sm text-charcoal-500">
              Example careers: {primary.examples.join(" · ")}
            </p>
          </section>

          <p className="mt-12 text-xs text-charcoal-400">
            Practice mode — nothing from this page is saved or reported.
          </p>
        </main>
      </div>
    );
  }

  const item = itemMap.get(sequence[idx]);
  const scale = item ? RIASEC[item.scale] : null;
  const pct = Math.round((idx / total) * 100);

  return (
    <div className="min-h-screen">
      <Header right={<span className="text-xs text-charcoal-500">{idx + 1} of {total}</span>} />
      <div className="h-0.5 bg-charcoal-100">
        <div className="h-full transition-[width] duration-300" style={{ width: `${pct}%`, background: "var(--color-explr-500)" }} />
      </div>

      <main className="mx-auto max-w-2xl px-6 py-14">
        {idx === 0 && (
          <p className="mb-8 border-l-2 border-charcoal-200 pl-4 text-sm text-charcoal-500">
            Practice run for educators. No account, no saving — answer as yourself and
            you'll get your own Holland code at the end.
          </p>
        )}

        {scale && (
          <div
            className="relative mb-8 flex h-48 w-full items-center justify-center overflow-hidden rounded-lg sm:h-64"
            style={{ background: scale.colorSoft }}
          >
            {item?.image ? (
              <img src={item.image} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-center text-sm font-semibold uppercase tracking-wider" style={{ color: scale.color }}>
                {scale.name}
              </span>
            )}
          </div>
        )}

        {scale && <p className="eyebrow" style={{ color: scale.color }}>How much would you like to…</p>}
        <h1 id="prompt-text" className="mt-4 text-3xl font-light leading-tight md:text-4xl">
          {item ? item.hs : "—"}
        </h1>

        <div role="radiogroup" aria-labelledby="prompt-text" className="mt-10 grid grid-cols-5 gap-2">
          {([1, 2, 3, 4, 5] as LikertValue[]).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={false}
              onClick={() => answer(v)}
              aria-label={LIKERT_LABELS[v]}
              className="group flex flex-col items-center gap-2 border border-charcoal-100 px-1 py-4 transition-colors hover:border-ink hover:bg-charcoal-50 focus-visible:border-ink"
            >
              <span className="text-3xl leading-none transition-transform group-hover:scale-110 sm:text-4xl" aria-hidden>
                {FACES[v]}
              </span>
              <span className="text-center text-[11px] leading-tight text-charcoal-500">{LIKERT_LABELS[v]}</span>
            </button>
          ))}
        </div>

        {idx > 0 && (
          <button
            type="button"
            onClick={() => setIdx(idx - 1)}
            className="mt-8 text-sm text-charcoal-500 hover:text-ink"
          >
            ← Back
          </button>
        )}
      </main>
    </div>
  );
}

function Header({ right }: { right?: React.ReactNode }) {
  return (
    <header className="border-b border-charcoal-100">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-sm tracking-tight">
          EXPLR <span style={{ color: "var(--explr)" }}>Pathways</span>
        </Link>
        {right}
      </div>
    </header>
  );
}
