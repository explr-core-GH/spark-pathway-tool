import type { ScalePoint } from "@/lib/explr-stem";
import { RatingButtons } from "./RatingButtons";

/**
 * LikertItem — one standard attitude item: a number, the statement text,
 * and a single row of response options. Used for math / science /
 * engineering / 21st-century / career-planning / work-based-learning
 * constructs on the non-retrospective surveys.
 *
 * No item is required — the student can skip it. A skip is recorded as
 * skipped=true (missing data), never as a zero.
 */
export function LikertItem({
  number,
  text,
  points,
  value,
  skipped,
  onChange,
  onSkip,
}: {
  number: number;
  text: string;
  points: ScalePoint[];
  value: number | null;
  skipped: boolean;
  onChange: (v: number) => void;
  onSkip: () => void;
}) {
  return (
    <div className="border-b border-charcoal-100 py-5 last:border-b-0">
      <div className="flex gap-3">
        <span className="select-none text-sm font-semibold text-charcoal-400">
          {number}.
        </span>
        <p className="flex-1 text-sm leading-relaxed text-ink">{text}</p>
      </div>
      <div className={skipped ? "mt-3 opacity-40" : "mt-3"}>
        <RatingButtons
          points={points}
          value={value}
          onChange={onChange}
          name={`item-${number}`}
          ariaLabel={text}
        />
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs">
        {skipped ? (
          <span className="text-charcoal-400">Skipped</span>
        ) : (
          <button
            type="button"
            onClick={onSkip}
            className="text-charcoal-400 underline hover:text-ink"
          >
            Skip this question
          </button>
        )}
      </div>
    </div>
  );
}
