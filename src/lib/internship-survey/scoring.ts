// Internship Interest Survey — scoring (pure, unit-testable).
//
// Reads tags + weights from config.ts only. No RIASEC tag or weight is ever
// hardcoded here, so the instrument can be re-tuned in config without touching
// this file (spec section 9).

import type { RIASECCode } from "@/lib/riasec";
import {
  ACTIVITY_ITEM_TAGS,
  ACTIVITY_RIASEC,
  ENV_FLAG,
  EXPERIENCE_ACTIVITY_TAGS,
  EXPERIENCE_RIASEC_LEAN,
  FORCED_CHOICE_TAGS,
  RIASEC_DIMS,
  SECTOR_LEAN,
  VALENCE_RIASEC_WEIGHT,
  VALENCE_TOPIC_MODIFIER,
  WEIGHTS,
  intensityBand,
} from "./config";
import type {
  ExperienceBand,
  Responses,
  RiasecVector,
  SectorTapValue,
  SurveyResult,
} from "./types";

function zeroVec(): RiasecVector {
  return { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
}

/**
 * Raw RIASEC vector + 0..100 normalized vector (spec 4a).
 * raw_d = activityScore_d + W_FC*fcWins_d + W_SECTOR*sectorLean_d + W_EXP*expLean_d
 */
export function computeRiasecVector(responses: Responses): {
  raw: RiasecVector;
  normalized: RiasecVector;
} {
  const raw = zeroVec();

  // Section 1 — activity ratings (0..3 each).
  for (const [id, dim] of Object.entries(ACTIVITY_RIASEC)) {
    const r = responses[id];
    if (r && r.kind === "scale4") raw[dim] += r.value;
  }

  // Section 2 — forced-choice bumps.
  for (const [id, [tagA, tagB]] of Object.entries(FORCED_CHOICE_TAGS)) {
    const r = responses[id];
    if (r && r.kind === "forcedChoice") {
      raw[r.value === "a" ? tagA : tagB] += WEIGHTS.fc;
    }
  }

  // Section 3 — sector leans (sectorValue * lean).
  for (const [id, leans] of Object.entries(SECTOR_LEAN)) {
    const r = responses[id];
    if (r && r.kind === "sectorTap" && r.value > 0) {
      for (const d of leans) raw[d] += WEIGHTS.sector * r.value;
    }
  }

  // Section 5 — experience leans (valenceWeight * topicLean).
  for (const [id, leans] of Object.entries(EXPERIENCE_RIASEC_LEAN)) {
    if (leans.length === 0) continue;
    const r = responses[id];
    if (r && r.kind === "experience4") {
      const w = VALENCE_RIASEC_WEIGHT[r.value];
      for (const d of leans) raw[d] += WEIGHTS.exp * w;
    }
  }

  // Normalize 0..100 via min-max across the six dimensions.
  const vals = RIASEC_DIMS.map((d) => raw[d]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const normalized = zeroVec();
  for (const d of RIASEC_DIMS) {
    normalized[d] =
      max > min ? Math.round(((raw[d] - min) / (max - min)) * 100) : max > 0 ? 100 : 0;
  }
  return { raw, normalized };
}

/** Top-N Holland code from a normalized vector, tie-broken by fixed RIASEC order. */
export function hollandCode(norm: RiasecVector, n = 3): string {
  return [...RIASEC_DIMS]
    .sort((a, b) => norm[b] - norm[a] || RIASEC_DIMS.indexOf(a) - RIASEC_DIMS.indexOf(b))
    .slice(0, n)
    .join("");
}

/** Sector tap values 0..2, defaulting unanswered sectors to 0. */
export function sectorValues(responses: Responses): Record<string, SectorTapValue> {
  const out: Record<string, SectorTapValue> = {};
  for (const id of Object.keys(SECTOR_LEAN)) {
    const r = responses[id];
    out[id] = r && r.kind === "sectorTap" ? r.value : 0;
  }
  return out;
}

/** Five environment scalars 0..100, defaulting unanswered sliders to the midpoint. */
export function envVector(responses: Responses): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, flag] of Object.entries(ENV_FLAG)) {
    const r = responses[id];
    out[flag] = r && r.kind === "slider" ? r.value : 50;
  }
  return out;
}

/**
 * Derived activity tags (spec 6): activity items rated >=2 plus DID_LIKE /
 * NEW_CURIOUS experience topics contribute their tags.
 */
export function deriveActivityTags(responses: Responses): string[] {
  const tags = new Set<string>();
  for (const [id, tg] of Object.entries(ACTIVITY_ITEM_TAGS)) {
    const r = responses[id];
    if (r && r.kind === "scale4" && r.value >= 2) tg.forEach((t) => tags.add(t));
  }
  for (const [id, tg] of Object.entries(EXPERIENCE_ACTIVITY_TAGS)) {
    const r = responses[id];
    if (r && r.kind === "experience4" && (r.value === "DID_LIKE" || r.value === "NEW_CURIOUS")) {
      tg.forEach((t) => tags.add(t));
    }
  }
  return [...tags];
}

/**
 * Experience signals (spec 4d): per-topic match modifier, plus an intensity
 * count (DID_LIKE + DID_DISLIKE) mapped to a readiness band. Never gates a topic.
 */
export function experienceSignals(responses: Responses): {
  topicModifiers: Record<string, number>;
  intensity: number;
  band: ExperienceBand;
} {
  const topicModifiers: Record<string, number> = {};
  let intensity = 0;
  for (const id of Object.keys(EXPERIENCE_RIASEC_LEAN)) {
    const r = responses[id];
    if (r && r.kind === "experience4") {
      topicModifiers[id] = VALENCE_TOPIC_MODIFIER[r.value];
      if (r.value === "DID_LIKE" || r.value === "DID_DISLIKE") intensity++;
    } else {
      topicModifiers[id] = 0;
    }
  }
  return { topicModifiers, intensity, band: intensityBand(intensity) };
}

/** Full survey result: composes every signal into one object. */
export function scoreSurvey(responses: Responses): SurveyResult {
  const { raw, normalized } = computeRiasecVector(responses);
  const { topicModifiers, intensity, band } = experienceSignals(responses);
  return {
    riasecRaw: raw,
    riasecNorm: normalized,
    hollandCode: hollandCode(normalized),
    sectorValues: sectorValues(responses),
    envVector: envVector(responses),
    activityTags: deriveActivityTags(responses),
    topicModifiers,
    intensity,
    intensityBand: band,
  };
}

// Re-export so consumers can import dimension order from one place.
export type { RIASECCode };
