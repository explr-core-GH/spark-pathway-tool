import type { ScalePoint } from "@/lib/explr-stem";
import { RatingButtons } from "./RatingButtons";

/**
 * RetrospectiveLikertItem — one item rated TWICE: how the student felt
 * BEFORE camp (THEN) and how they feel NOW. Both tracks render together
 * for the same item so the student makes a coherent comparison — never
 * "all THENs then all NOWs."
 *
 * Used by the one-week camp retrospective survey, which sidesteps the
 * response-shift problem (Day-1 self-ratings are inflated because
 * students don't yet know what they don't know).
 */
export function RetrospectiveLikertItem({
  number,
  text,
  points,
  valueThen,
  valueNow,
  skipped,
  onChangeThen,
  onChangeNow,
  onSkip,
}: {
  number: number;
  text: string;
  points: ScalePoint[];
  valueThen: number | null;
  valueNow: number | null;
  skipped: boolean;
  onChangeThen: (v: number) => void;
  onChangeNow: (v: number) => void;
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
      <div className={skipped ? "mt-3 space-y-3 opacity-40" : "mt-3 space-y-3"}>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-charcoal-400">
            Before camp
          </p>
          <RatingButtons
            points={points}
            value={valueThen}
            onChange={onChangeThen}
            name={`item-${number}-then`}
            ariaLabel={`${text} — before camp`}
          />
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-charcoal-400">
            Right now
          </p>
          <RatingButtons
            points={points}
            value={valueNow}
            onChange={onChangeNow}
            name={`item-${number}-now`}
            ariaLabel={`${text} — right now`}
          />
        </div>
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
