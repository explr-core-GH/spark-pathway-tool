import { PortalHeader } from "@/components/passport/PortalHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Annoyed, Frown, Laugh, Meh, Smile, type LucideIcon } from "lucide-react";
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

const FACES: Record<LikertValue, LucideIcon> = { 1: Frown, 2: Annoyed, 3: Meh, 4: Smile, 5: Laugh };

function TryRiasec() {
  // Seed on the client only, so the server-rendered HTML matches the first
  // client paint (a random seed during SSR caused a hydration mismatch).
  const [seed, setSeed] = useState<string | null>(null);
  useEffect(() => {
    setSeed(Math.random().toString(36).slice(2));
  }, []);
  const sequence = useMemo(() => (seed ? buildItemSequence(seed) : []), [seed]);
  const itemMap = useMemo(() => new Map(ITEMS.map((i) => [i.id, i])), []);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  // Admin-uploaded context photos per item (same table the real runner uses).
  const [photos, setPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    (
      supabase.from as unknown as (n: string) => {
        select: (c: string) => Promise<{ data: Array<{ item_id: string; url: string }> | null }>;
      }
    )("assessment_item_photos")
      .select("item_id, url")
      .then(({ data: rows }) => {
        const m: Record<string, string> = {};
        for (const r of rows ?? []) m[r.item_id] = r.url;
        setPhotos(m);
      });
  }, []);

  const total = sequence.length;
  if (!seed) {
    return (
      <div className="min-h-screen bg-paper text-ink-900">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
          <h1 className="font-display text-2xl font-bold">Loading the interest survey…</h1>
          <p className="mt-2 text-sm text-ink-500" role="status">
            One moment.
          </p>
        </main>
      </div>
    );
  }

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
      <div className="min-h-screen bg-paper text-ink-900">
        <Header
          right={
            <button
              onClick={restart}
              className="inline-flex min-h-[44px] items-center text-sm text-ink-500 hover:text-ink-900"
            >
              Start over
            </button>
          }
        />
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <p className="eyebrow text-green">Your Holland code</p>
          <h1 className="display mt-2" style={{ color: primary.color }}>
            {holland_code}
          </h1>
          <p className="lead mt-6 max-w-2xl">
            You leaned strongest toward <strong>{primary.name}</strong>. This is exactly what your
            students see when they finish the assessment.
          </p>

          <div className="mt-12 grid gap-8 lg:grid-cols-[360px_1fr]">
            <div className="flex justify-center rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 shadow-card">
              <HollandHexagon size={300} active={top[0]} />
            </div>
            <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 shadow-card">
              <p className="eyebrow">All six dimensions</p>
              <ul className="mt-6 space-y-4">
                {sorted.map((c, i) => {
                  const dim = RIASEC[c];
                  const score = scale_scores[c];
                  return (
                    <li key={c}>
                      <div className="flex items-baseline justify-between gap-4">
                        <div className="flex items-baseline gap-3">
                          <span className="w-4 text-xs tabular-nums text-ink-500">{i + 1}</span>
                          <span className="text-sm font-medium" style={{ color: dim.color }}>
                            {dim.code}
                          </span>
                          <span className={top.includes(c) ? "text-ink-900" : "text-ink-500"}>
                            {dim.name}
                          </span>
                        </div>
                        <span className="text-sm tabular-nums text-ink-500">
                          {score.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-sunken">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(score / 5) * 100}%`, background: dim.color }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <section className="mt-12 border-t border-line pt-10">
            <p className="eyebrow" style={{ color: primary.color }}>
              {primary.code} · {primary.name}
            </p>
            <p className="mt-4 font-display text-2xl font-bold">{primary.hsDescription}</p>
            <p className="mt-4 text-ink-700">Example careers: {primary.examples.join(" · ")}</p>
          </section>

          <p className="mt-12 text-sm text-ink-500">
            Practice mode — nothing from this page is saved or reported.
          </p>
        </main>
        <SiteFooter className="mt-16" />
      </div>
    );
  }

  const item = itemMap.get(sequence[idx]);
  const scale = item ? RIASEC[item.scale] : null;
  const pct = Math.round((idx / total) * 100);

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <Header
        right={
          <span className="font-mono text-xs text-ink-500" aria-live="polite">
            {idx + 1} of {total}
          </span>
        }
      />
      <div className="h-1 bg-paper-sunken" aria-hidden>
        <div
          className="h-full bg-green transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {idx === 0 && (
          <p className="mb-8 rounded-[var(--radius-card)] bg-gold-tint px-4 py-3 text-sm text-ink-900">
            Practice run for instructors. No account, no saving — answer as yourself and you'll get
            your own Holland code at the end.
          </p>
        )}

        {scale && (
          <div
            className="relative mb-8 flex h-48 w-full items-center justify-center overflow-hidden rounded-[var(--radius-card)] border border-line sm:h-64"
            style={{ background: scale.colorSoft }}
          >
            {item && (photos[item.id] ?? item.image) ? (
              <img
                src={photos[item.id] ?? item.image}
                alt=""
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span
                className="text-center font-mono text-sm font-medium uppercase tracking-[0.08em]"
                style={{ color: scale.color }}
              >
                {scale.name}
              </span>
            )}
          </div>
        )}

        {scale && (
          <p className="eyebrow" style={{ color: scale.color }}>
            How much would you like to…
          </p>
        )}
        <h1
          id="prompt-text"
          className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl"
        >
          {item ? item.hs : "—"}
        </h1>

        <div
          role="radiogroup"
          aria-labelledby="prompt-text"
          className="mt-10 grid grid-cols-5 gap-2"
        >
          {([1, 2, 3, 4, 5] as LikertValue[]).map((v) => {
            const Face = FACES[v];
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={false}

                onClick={() => answer(v)}
                aria-label={LIKERT_LABELS[v]}
                className="group flex min-h-[44px] flex-col items-center gap-2 rounded-[var(--radius-card)] border border-line bg-paper-raised px-1 py-4 transition-colors hover:border-emerald hover:bg-mint-tint/50 focus-visible:border-emerald"
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-full border border-mint-soft bg-mint-tint text-green-deep transition-transform group-hover:scale-110 sm:h-14 sm:w-14"
                  aria-hidden
                >
                  <Face className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.75} />
                </span>
                <span className="text-center text-[11px] font-medium leading-tight text-ink-700">
                  {LIKERT_LABELS[v]}
                </span>
              </button>
            );
          })}
        </div>

        {idx > 0 && (
          <button
            type="button"
            onClick={() => setIdx(idx - 1)}
            className="mt-8 inline-flex min-h-[44px] items-center text-sm text-ink-500 hover:text-ink-900"
          >
            ← Back
          </button>
        )}
      </main>
    </div>
  );
}

function Header({ right }: { right?: React.ReactNode }) {
  return <PortalHeader links={[{ label: "Home", to: "/" }]} right={right} />;
}
