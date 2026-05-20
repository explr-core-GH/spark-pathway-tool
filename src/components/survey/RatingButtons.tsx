import type { ScalePoint } from "@/lib/explr-stem";

/**
 * RatingButtons — the horizontal row of response options shared by every
 * survey item component. Not exported from the survey barrel; item
 * components compose it.
 *
 * Each option is a ≥48dp tap target (Material minimum) showing the value
 * number large and the scale label small beneath it. Neutral styling —
 * no color coding, no emoji — so response framing isn't biased.
 */
export function RatingButtons({
  points,
  value,
  onChange,
  name,
  ariaLabel,
}: {
  points: ScalePoint[];
  value: number | null;
  onChange: (v: number) => void;
  /** radiogroup name — unique per item+track */
  name: string;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex gap-1.5"
    >
      {points.map((p) => {
        const on = value === p.value;
        return (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${p.value} — ${p.label}`}
            name={name}
            onClick={() => onChange(p.value)}
            className={
              on
                ? "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 border px-1 py-1.5"
                : "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 border border-charcoal-200 px-1 py-1.5 hover:border-ink"
            }
            style={
              on
                ? { background: "var(--ink)", color: "var(--bg)", borderColor: "var(--ink)" }
                : undefined
            }
          >
            <span className="text-sm font-semibold leading-none">{p.value}</span>
            <span
              className={
                on
                  ? "text-center text-[10px] leading-tight"
                  : "text-center text-[10px] leading-tight text-charcoal-500"
              }
            >
              {p.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
