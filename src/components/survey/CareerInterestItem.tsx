import type { ScalePoint } from "@/lib/explr-stem";
import { RatingButtons } from "./RatingButtons";

/**
 * CareerInterestItem — one STEM career-interest item: the field name in
 * bold, then the full description (what the field is + example jobs),
 * then the 4-point interest rating.
 *
 * The description is part of the validated S-STEM instrument — it anchors
 * how the student interprets the field. It is shown inline, NOT in a
 * tooltip the student can ignore.
 *
 * `retrospective` mode renders THEN + NOW tracks (the one-week camp
 * survey rates career interest twice, same as its attitude items).
 */
export function CareerInterestItem({
  number,
  careerName,
  description,
  points,
  retrospective,
  valueNow,
  valueThen,
  skipped,
  onChangeNow,
  onChangeThen,
  onSkip,
}: {
  number: number;
  careerName: string;
  description: string;
  points: ScalePoint[];
  retrospective: boolean;
  valueNow: number | null;
  valueThen: number | null;
  skipped: boolean;
  onChangeNow: (v: number) => void;
  onChangeThen: (v: number) => void;
  onSkip: () => void;
}) {
  return (
    <div className="border-b border-line py-5 last:border-b-0">
      <div className="flex gap-3">
        <span className="select-none text-sm font-semibold text-ink-500">{number}.</span>
        <div className="flex-1">
          <p className="font-display text-base font-semibold text-ink-900">{careerName}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-700">
            {careerName} {description}
          </p>
        </div>
      </div>
      <div className={skipped ? "mt-3 space-y-3 opacity-40" : "mt-3 space-y-3"}>
        {retrospective ? (
          <>
            <div>
              <p className="eyebrow mb-1">Before camp</p>
              <RatingButtons
                points={points}
                value={valueThen}
                onChange={onChangeThen}
                name={`career-${number}-then`}
                ariaLabel={`${careerName} — interest before camp`}
              />
            </div>
            <div>
              <p className="eyebrow mb-1">Right now</p>
              <RatingButtons
                points={points}
                value={valueNow}
                onChange={onChangeNow}
                name={`career-${number}-now`}
                ariaLabel={`${careerName} — interest right now`}
              />
            </div>
          </>
        ) : (
          <RatingButtons
            points={points}
            value={valueNow}
            onChange={onChangeNow}
            name={`career-${number}`}
            ariaLabel={`${careerName} — interest`}
          />
        )}
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs">
        {skipped ? (
          <span className="text-ink-500">Skipped</span>
        ) : (
          <button
            type="button"
            onClick={onSkip}
            className="ink-link inline-flex min-h-[44px] items-center text-ink-500 hover:text-ink-900"
          >
            Skip this question
          </button>
        )}
      </div>
    </div>
  );
}
