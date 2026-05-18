// STEM Lab activities = the real camp catalog (src/lib/camp-curriculum.ts).
// Each camp is tagged with per-RIASEC scores (0-3) so the student dashboard
// can rank and filter the marquee against a student's Holland code.

import { CAMPS, type CampCurriculum } from "./camp-curriculum";
import type { RIASECCode } from "./riasec";

export type StemActivity = {
  id: string;          // camp slug
  slug: string;
  name: string;
  program: string;     // tagline
  emoji: string;
  overview: string;
  duration: string;
  ageRange: string;
  dayCount: number;
  scores: Record<RIASECCode, number>;
};

// RIASEC scoring per camp slug (0-3). Derived from the program-RIASEC coder
// examples where available; remaining camps scored from their curriculum
// overview (build/test = R+I, design/showcase = A, team/competition = S+E,
// data/standards = C).
const CAMP_SCORES: Record<string, Record<RIASECCode, number>> = {
  "bike-cleveland":         { R: 3, I: 2, A: 1, S: 1, E: 0, C: 1 },
  "boxcraft":               { R: 3, I: 2, A: 2, S: 1, E: 1, C: 1 },
  "fashionforge":           { R: 3, I: 1, A: 3, S: 1, E: 1, C: 2 },
  "fll-challenge":          { R: 3, I: 3, A: 1, S: 2, E: 2, C: 2 },
  "microclimate":           { R: 2, I: 3, A: 1, S: 2, E: 1, C: 2 },
  "oda-workshop":           { R: 0, I: 2, A: 1, S: 3, E: 2, C: 1 },
  "robobattles":            { R: 3, I: 2, A: 1, S: 2, E: 3, C: 1 },
  "roller-coasters-drones": { R: 3, I: 3, A: 2, S: 1, E: 1, C: 2 },
  "seaperch":               { R: 3, I: 3, A: 1, S: 2, E: 1, C: 2 },
  "seamate":                { R: 3, I: 3, A: 1, S: 2, E: 1, C: 2 },
  "xrp":                    { R: 3, I: 3, A: 1, S: 1, E: 1, C: 3 },
};

function toActivity(c: CampCurriculum): StemActivity {
  const scores = CAMP_SCORES[c.slug] ?? { R: 1, I: 1, A: 1, S: 1, E: 1, C: 1 };
  return {
    id: c.slug,
    slug: c.slug,
    name: c.name,
    program: c.tagline,
    emoji: c.emoji,
    overview: c.overview,
    duration: c.duration,
    ageRange: c.ageRange,
    dayCount: c.days.length,
    scores,
  };
}

export const STEM_ACTIVITIES: StemActivity[] = CAMPS.map(toActivity);

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
