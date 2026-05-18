// STEM Lab activities — sourced from src/lib/stemlab-catalog.ts (the 45
// interactive activities hosted at /lab/t/<slug>). Each catalog entry's
// riasec[] tag list is converted to a 0-3 score per dimension so the student
// dashboard marquee can rank/filter against a student's Holland code.

import {
  STEM_LAB_ACTIVITIES,
  stemLabActivityLink,
  type StemLabActivity,
  type RiasecType,
} from "./stemlab-catalog";
import type { RIASECCode } from "./riasec";

export type StemActivity = {
  id: string;     // catalog slug
  slug: string;
  name: string;
  blurb: string;
  category: string;
  gradeBand: string;
  href: string;   // opens the actual activity in /lab/
  scores: Record<RIASECCode, number>;
};

// primary tag = 3, secondary = 2, tertiary = 1, untagged = 0
function toScores(tags: RiasecType[]): Record<RIASECCode, number> {
  const out: Record<RIASECCode, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  tags.forEach((t, i) => { out[t] = Math.max(out[t], 3 - i); });
  return out;
}

function toActivity(a: StemLabActivity): StemActivity {
  return {
    id: a.slug,
    slug: a.slug,
    name: a.title,
    blurb: a.blurb,
    category: a.category,
    gradeBand: a.grade_band,
    href: stemLabActivityLink(a.slug),
    scores: toScores(a.riasec),
  };
}

export const STEM_ACTIVITIES: StemActivity[] = STEM_LAB_ACTIVITIES.map(toActivity);

export function dominantCode(a: StemActivity): RIASECCode {
  let best: RIASECCode = "R";
  let bestVal = -1;
  (Object.keys(a.scores) as RIASECCode[]).forEach((k) => {
    if (a.scores[k] > bestVal) { bestVal = a.scores[k]; best = k; }
  });
  return best;
}

// Sort activities by how well they match a Holland code (e.g. "RIA").
// Earlier letters in the code weigh more.
export function rankByHollandCode(
  activities: StemActivity[],
  code: string | null,
): StemActivity[] {
  if (!code) return activities;
  const weights: Partial<Record<RIASECCode, number>> = {};
  code.split("").forEach((l, i) => { weights[l as RIASECCode] = 3 - i; });
  const fit = (a: StemActivity) =>
    (Object.entries(weights) as [RIASECCode, number][])
      .reduce((s, [k, w]) => s + (a.scores[k] || 0) * w, 0);
  return [...activities].sort((a, b) => fit(b) - fit(a));
}
