import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [selected, setSelected] = useState<StemActivity | null>(null);

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
      </div>

      <div className="mt-6 space-y-4 overflow-hidden">
        <MarqueeRow items={rowA} hollandCode={hollandCode} direction="left" onSelect={setSelected} />
        {rowB.length > 0 && (
          <MarqueeRow items={rowB} hollandCode={hollandCode} direction="right" onSelect={setSelected} />
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span aria-hidden className="text-2xl">{selected.emoji}</span>
                  <span>{selected.name}</span>
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-charcoal-500">{selected.program}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-charcoal-500">
                <span className="border border-charcoal-100 px-2 py-0.5">{selected.duration}</span>
                <span className="border border-charcoal-100 px-2 py-0.5">{selected.ageRange}</span>
                {selected.dayCount > 0 && (
                  <span className="border border-charcoal-100 px-2 py-0.5">
                    {selected.dayCount} days
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink/80">{selected.overview}</p>
              <div className="mt-4 space-y-2">
                {CODES.map((c) => {
                  const v = selected.scores[c] ?? 0;
                  return (
                    <div key={c} className="flex items-center gap-3">
                      <span className="w-28 text-xs font-medium" style={{ color: RIASEC[c].color }}>
                        {c} · {RIASEC[c].name}
                      </span>
                      <div className="h-2 flex-1 rounded bg-charcoal-50">
                        <div
                          className="h-2 rounded"
                          style={{ width: `${(v / 3) * 100}%`, background: RIASEC[c].color }}
                        />
                      </div>
                      <span className="w-6 text-right text-xs text-charcoal-500">{v}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
  onSelect,
}: {
  items: StemActivity[];
  hollandCode: string | null;
  direction: "left" | "right";
  onSelect: (a: StemActivity) => void;
}) {
  if (items.length === 0) return null;
  const loop = [...items, ...items];
  const top = (hollandCode?.[0] as RIASECCode | undefined) ?? null;
  const duration = Math.max(60, items.length * 10);

  return (
    <div className="group relative overflow-hidden">
      <div
        className="flex w-max gap-3 py-1"
        style={{ animation: `stem-marquee-${direction} ${duration}s linear infinite` }}
      >
        {loop.map((a, idx) => {
          const code = dominantCode(a);
          const dim = RIASEC[code];
          const fits = top ? (a.scores[top] ?? 0) >= 2 : true;
          return (
            <button
              type="button"
              key={`${a.id}-${idx}`}
              onClick={() => onSelect(a)}
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
                <span aria-hidden className="text-xl leading-none">{a.emoji}</span>
              </div>
              <h4 className="mt-2 text-sm font-medium leading-snug text-ink">{a.name}</h4>
              <p className="mt-1 text-xs text-charcoal-500">{a.program}</p>
            </button>
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
        .group:hover > div { animation-play-state: paused; }
      `}</style>
    </div>
  );
}
