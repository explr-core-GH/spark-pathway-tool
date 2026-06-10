import { useEffect, useMemo, useState } from "react";
import { RIASEC, type RIASECCode } from "@/lib/riasec";
import {
  STEM_ACTIVITIES,
  dominantCode,
  rankByHollandCode,
  type StemActivity,
} from "@/lib/stem-activities";

type Props = {
  hollandCode: string | null; // e.g. "RIA"
};

const CODES: RIASECCode[] = ["R", "I", "A", "S", "E", "C"];

export function StemActivitiesMarquee({ hollandCode }: Props) {
  const top = (hollandCode?.[0] as RIASECCode | undefined) ?? null;
  const [filter, setFilter] = useState<RIASECCode | "ALL">(top ?? "ALL");
  // Explicit pause control (WCAG 2.2.2 — auto-moving content >5s must be
  // pausable by a real control, not hover alone). Starts paused when the user
  // prefers reduced motion.
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
  }, []);

  const ranked = useMemo(
    () => rankByHollandCode(STEM_ACTIVITIES, hollandCode),
    [hollandCode],
  );

  const filtered = useMemo(() => {
    if (filter === "ALL") return ranked;
    return ranked.filter((a) => (a.scores[filter] ?? 0) >= 2);
  }, [filter, ranked]);

  // Split into two rows that scroll in opposite directions for visual rhythm.
  const half = Math.ceil(filtered.length / 2);
  const rowA = filtered.slice(0, half);
  const rowB = filtered.slice(half);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={filter === "ALL"} onClick={() => setFilter("ALL")} label="All" />
        {CODES.map((c) => (
          <FilterChip
            key={c}
            active={filter === c}
            onClick={() => setFilter(c)}
            label={`${c} · ${RIASEC[c].name}`}
            color={RIASEC[c].color}
            highlight={top === c}
          />
        ))}
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={paused ? "Play the scrolling activities" : "Pause the scrolling activities"}
          className="ml-auto rounded-full border border-charcoal-200 px-3 py-1 text-xs text-charcoal-600 hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {paused ? "▶ Play" : "⏸ Pause"}
        </button>
      </div>

      <div className="mt-6 space-y-4 overflow-hidden">
        <MarqueeRow items={rowA} hollandCode={hollandCode} direction="left" forcePaused={paused} />
        {rowB.length > 0 && (
          <MarqueeRow items={rowB} hollandCode={hollandCode} direction="right" forcePaused={paused} />
        )}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 text-sm text-charcoal-500">
          No activities match this filter yet.
        </p>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
  highlight,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-3 py-1 text-xs transition-colors"
      style={{
        borderColor: active ? (color ?? "var(--ink)") : "var(--color-charcoal-100)",
        background: active ? (color ?? "var(--ink)") : "transparent",
        color: active ? "white" : "var(--color-charcoal-500)",
        fontWeight: highlight ? 600 : 400,
      }}
    >
      {label}
      {highlight && !active ? " ★" : ""}
    </button>
  );
}

function MarqueeRow({
  items,
  hollandCode,
  direction,
  forcePaused,
}: {
  items: StemActivity[];
  hollandCode: string | null;
  direction: "left" | "right";
  forcePaused: boolean;
}) {
  const [hoverPaused, setHoverPaused] = useState(false);
  if (items.length === 0) return null;
  const loop = [...items, ...items];
  const top = (hollandCode?.[0] as RIASECCode | undefined) ?? null;
  // Much slower than before so cards are easy to click.
  const duration = Math.max(120, items.length * 18);
  const paused = forcePaused || hoverPaused;

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      <div
        className="flex w-max gap-3 py-1"
        style={{
          animation: `stem-marquee-${direction} ${duration}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {loop.map((a, idx) => {
          const code = dominantCode(a);
          const dim = RIASEC[code];
          const fits = top ? (a.scores[top] ?? 0) >= 2 : true;
          return (
            <a
              key={`${a.id}-${idx}`}
              href={a.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-64 shrink-0 cursor-pointer border p-4 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md"
              style={{
                borderColor: fits ? dim.color : "var(--color-charcoal-100)",
                background: fits ? dim.colorSoft : "white",
                opacity: top && !fits ? 0.55 : 1,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className="text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: dim.color }}
                >
                  {dim.code} · {dim.name}
                </span>
                <span className="text-[10px] text-charcoal-400">{a.gradeBand}</span>
              </div>
              <h4 className="mt-2 text-sm font-medium leading-snug text-ink">{a.name}</h4>
              <p className="mt-1 text-xs text-charcoal-500 line-clamp-2">{a.blurb}</p>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-charcoal-400">
                {a.category}
              </p>
            </a>
          );
        })}
      </div>

      <style>{`
        @keyframes stem-marquee-left {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes stem-marquee-right {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
