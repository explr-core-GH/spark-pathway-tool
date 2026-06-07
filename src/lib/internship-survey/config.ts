// Internship Interest Survey — scoring config.
//
// EVERYTHING tunable lives here. The scoring and matching libraries read from
// this file and never hardcode a RIASEC tag or weight. To re-link an item to a
// different RIASEC dimension, or to re-weight any signal, edit this file only —
// no change to scoring.ts or matching.ts is ever required (see spec section 9).

import type { RIASECCode } from "@/lib/riasec";
import type { ExperienceBand, ExperienceValence } from "./types";

export const RIASEC_DIMS: RIASECCode[] = ["R", "I", "A", "S", "E", "C"];

// ── Scoring weights (RIASEC vector, spec 4a) ───────────────────────────────
export const WEIGHTS = {
  fc: 1.5, // W_FC — bump per forced-choice win
  sector: 0.5, // W_SECTOR — per (sectorValue * lean)
  exp: 0.5, // W_EXP — per (valenceWeight * topicLean)
} as const;

// RIASEC-lean contribution of an experience valence (spec 4a).
export const VALENCE_RIASEC_WEIGHT: Record<ExperienceValence, number> = {
  DID_LIKE: 1.0,
  NEW_CURIOUS: 0.75, // curiosity counts, never below a credential
  DID_DISLIKE: -0.5,
  NEW_NOPE: 0,
};

// Per-topic matching modifier, additive to a match score (spec 4d).
export const VALENCE_TOPIC_MODIFIER: Record<ExperienceValence, number> = {
  DID_LIKE: 0.1,
  NEW_CURIOUS: 0.08,
  DID_DISLIKE: -0.1,
  NEW_NOPE: 0,
};

// ── Matching weights (spec 6) ──────────────────────────────────────────────
export const COMPONENT_WEIGHTS = {
  riasecSim: 0.35,
  sectorMatch: 0.2,
  activityOverlap: 0.2,
  envFit: 0.1,
} as const;

export const EXP_MOD_CLAMP = 0.2; // expMod clamped to +/- this
export const INTENSITY_PENALTY = 0.9; // soft penalty, never excludes

export const SECTOR_MATCH_VALUE = { yes: 1.0, maybe: 0.5, none: 0.1 } as const;

// Internship RIASEC code-array -> numeric weights (spec 5): primary, secondary, tertiary.
export const INTERNSHIP_RIASEC_WEIGHT = [1.0, 0.6, 0.3] as const;

export const LEVEL_RANK: Record<ExperienceBand, number> = {
  intro: 0,
  some: 1,
  advanced: 2,
};

// Experience-intensity bands (spec 4d): maps to placement intensity, never gates.
export function intensityBand(count: number): ExperienceBand {
  if (count <= 1) return "intro";
  if (count <= 3) return "some";
  return "advanced";
}

// ── RIASEC links — edit here to re-tag any item (spec 9) ────────────────────

// Section 1 activity items -> dimension.
export const ACTIVITY_RIASEC: Record<string, RIASECCode> = {
  R1: "R", R2: "R", R3: "R",
  I1: "I", I2: "I", I3: "I",
  A1: "A", A2: "A", A3: "A",
  S1: "S", S2: "S", S3: "S",
  E1: "E", E2: "E", E3: "E",
  C1: "C", C2: "C", C3: "C",
};

// Section 2 forced choice -> [tag for option A, tag for option B].
export const FORCED_CHOICE_TAGS: Record<string, [RIASECCode, RIASECCode]> = {
  FC1: ["R", "E"],
  FC2: ["I", "A"],
  FC3: ["S", "C"],
  FC4: ["R", "A"],
  FC5: ["E", "I"],
  FC6: ["S", "C"],
};

// Section 3 sector leans — reinforce the interest profile (the sector tap value
// itself is the primary signal for matching by sector).
export const SECTOR_LEAN: Record<string, RIASECCode[]> = {
  SEC1: ["S", "I"],
  SEC2: ["R", "I"],
  SEC3: ["I", "R"],
  SEC4: ["R", "I", "S"],
  SEC5: ["E", "C"],
  SEC6: ["A", "E"],
  SEC7: ["S"],
  SEC8: ["R", "C"],
  SEC9: ["I"],
  SEC10: ["S", "E"],
};

// Section 4 work-style sliders -> environment flag. Stored 0..100 (left = 0).
export const ENV_FLAG: Record<string, string> = {
  ENV1: "handsOn",
  ENV2: "outdoor",
  ENV3: "team",
  ENV4: "structured",
  ENV5: "publicFacing",
};

// Section 5 experience topics -> RIASEC lean (empty = intensity only / general).
export const EXPERIENCE_RIASEC_LEAN: Record<string, RIASECCode[]> = {
  EXP1: [],
  EXP2: ["R", "I"],
  EXP3: [],
  EXP4: ["I"],
  EXP5: ["I", "R"],
  EXP6: ["R", "A"],
  EXP7: [],
};

// Section 5 experience topics -> free-form activity tags (used by activityOverlap
// once internships carry an `activities` list).
export const EXPERIENCE_ACTIVITY_TAGS: Record<string, string[]> = {
  EXP1: [],
  EXP2: ["build", "code"],
  EXP3: [],
  EXP4: ["research"],
  EXP5: ["code"],
  EXP6: ["build", "design"],
  EXP7: [],
};

// Section 1 activity items -> free-form activity tags (item rated >=2 contributes).
// Seeded so activityOverlap is meaningful the moment internships gain activities.
export const ACTIVITY_ITEM_TAGS: Record<string, string[]> = {
  R1: ["build"], R2: ["outdoor"], R3: ["build"],
  I1: ["research"], I2: ["research"], I3: ["data"],
  A1: ["design"], A2: ["media"], A3: ["design"],
  S1: ["teach"], S2: ["help"], S3: ["team"],
  E1: ["pitch"], E2: ["lead"], E3: ["lead"],
  C1: ["organize"], C2: ["data"], C3: ["organize"],
};
