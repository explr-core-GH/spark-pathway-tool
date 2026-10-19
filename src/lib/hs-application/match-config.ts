/**
 * Matching weights for the high school internship application.
 * Edit numbers here; the logic in ./match.ts reads them and never hard-codes
 * a weight. Component weights renormalize when a component is missing.
 */
export const HS_MATCH_CONFIG = {
  weights: {
    /** Cosine similarity of student and listing RIASEC profiles. */
    riasec: 0.35,
    /** Overlap of the student's career-field taps with the listing's fields. */
    careerField: 0.2,
    /** Liked survey activities that point at the listing's fields. */
    activity: 0.2,
    /** Closeness on the five work-environment sliders. */
    environment: 0.1,
  },
  /** Each forced-choice pick nudges that RIASEC scale (on the 1-5 scale). */
  forcedPairNudge: 0.15,
  /** Experience answers in the listing's fields move the score by this much. */
  experience: {
    did_more: 0.04,
    curious: 0.03,
    did_not: -0.03,
    not_interested: -0.02,
    /** "A job or internship: did it, want more" counts for every listing. */
    anyJobBonus: 0.02,
    cap: 0.08,
  },
  /** Soft reductions: they lower a match, never block it. */
  reductions: {
    /** Each "I'd need help" answer on a site requirement (until staff clear it). */
    needHelpEach: 0.05,
    needHelpCap: 0.15,
    /** Student can't work every program week. */
    notAllWeeks: 0.05,
    /** Only answer to "how would you get there" is "not sure yet". */
    transportUnsure: 0.03,
    /** Grade is outside the listing's grade range. */
    gradeOutside: 0.1,
  },
  /** An activity counts as "liked" at this rating or above. */
  likedAssessmentValue: 4,
  likedActivityValue: 3,
} as const;
