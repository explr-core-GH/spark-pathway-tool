/**
 * Per-item response state held by the survey runner.
 *
 * `now` is the single rating for non-retrospective surveys, and the
 * "right now" rating for retrospective ones. `then` is only used by the
 * retrospective survey (the "before camp" rating). `skipped` marks the
 * item as intentionally missing — distinct from simply unanswered.
 */
export type SurveyItemState = {
  now: number | null;
  then: number | null;
  skipped: boolean;
};

export const EMPTY_ITEM_STATE: SurveyItemState = {
  now: null,
  then: null,
  skipped: false,
};
