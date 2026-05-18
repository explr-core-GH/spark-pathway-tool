// Curated STEM Lab activity catalog. Each activity has per-RIASEC scores (0-3)
// pulled from the program-RIASEC coder examples (FashionForge, SeaPerch ROV,
// AI Deep Dive) plus additional camp activities tagged in the same scheme.
// Used by the student dashboard to render a RIASEC-filtered marquee.

import type { RIASECCode } from "./riasec";

export type StemActivity = {
  id: string;
  name: string;
  program: string;        // parent program / lab
  emoji: string;
  scores: Record<RIASECCode, number>; // 0-3
};

const z = (): Record<RIASECCode, number> => ({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 });

export const STEM_ACTIVITIES: StemActivity[] = [
  // FashionForge
  { id: "ff-01", name: "Design ideation & mood boards", program: "FashionForge", emoji: "🎨", scores: { ...z(), R: 1, I: 2, A: 3, S: 1, E: 1, C: 1 } },
  { id: "ff-02", name: "Jewelry design & casting", program: "FashionForge", emoji: "💍", scores: { ...z(), R: 3, I: 1, A: 3, C: 1 } },
  { id: "ff-03", name: "Sewing & textile work", program: "FashionForge", emoji: "🧵", scores: { ...z(), R: 3, I: 1, A: 2, C: 2 } },
  { id: "ff-04", name: "3D-printed accessories", program: "FashionForge", emoji: "🖨️", scores: { ...z(), R: 3, I: 2, A: 2, C: 1 } },
  { id: "ff-05", name: "Live runway showcase", program: "FashionForge", emoji: "✨", scores: { ...z(), I: 1, A: 3, S: 2, E: 3 } },

  // SeaPerch ROV
  { id: "sp-01", name: "ROV frame & waterproofing", program: "SeaPerch ROV", emoji: "🛠️", scores: { ...z(), R: 3, I: 2, A: 1, S: 1, C: 2 } },
  { id: "sp-02", name: "Electronics & motor wiring", program: "SeaPerch ROV", emoji: "🔌", scores: { ...z(), R: 3, I: 3, C: 2 } },
  { id: "sp-03", name: "Pool testing & iteration", program: "SeaPerch ROV", emoji: "🌊", scores: { ...z(), R: 3, I: 3, A: 1, S: 2, E: 1, C: 1 } },
  { id: "sp-04", name: "Mission planning & team strategy", program: "SeaPerch ROV", emoji: "🗺️", scores: { ...z(), R: 1, I: 2, S: 3, E: 3, C: 1 } },
  { id: "sp-05", name: "Underwater mission run", program: "SeaPerch ROV", emoji: "🤿", scores: { ...z(), R: 2, I: 2, S: 3, E: 2 } },

  // AI Deep Dive
  { id: "ai-01", name: "Python & math foundations", program: "AI Deep Dive", emoji: "🐍", scores: { ...z(), I: 3, C: 3 } },
  { id: "ai-02", name: "Build a machine-learning classifier", program: "AI Deep Dive", emoji: "🤖", scores: { ...z(), R: 1, I: 3, A: 1, C: 3 } },
  { id: "ai-03", name: "LLM capstone build", program: "AI Deep Dive", emoji: "🧠", scores: { ...z(), R: 1, I: 3, A: 2, S: 1, E: 1, C: 2 } },
  { id: "ai-04", name: "Cohort code critique", program: "AI Deep Dive", emoji: "💬", scores: { ...z(), I: 2, A: 1, S: 3, E: 2, C: 1 } },
  { id: "ai-05", name: "Public capstone presentation", program: "AI Deep Dive", emoji: "🎤", scores: { ...z(), I: 1, A: 2, S: 2, E: 3 } },

  // BoxCraft
  { id: "bx-01", name: "Cardboard prototyping", program: "BoxCraft", emoji: "📦", scores: { ...z(), R: 3, A: 2, C: 1 } },
  { id: "bx-02", name: "Design-thinking sprints", program: "BoxCraft", emoji: "💡", scores: { ...z(), I: 2, A: 2, S: 2, E: 1 } },

  // Bike Cleveland
  { id: "bc-01", name: "Bike mechanics teardown", program: "Bike Cleveland", emoji: "🚲", scores: { ...z(), R: 3, I: 2, C: 1 } },
  { id: "bc-02", name: "Gear-ratio physics lab", program: "Bike Cleveland", emoji: "⚙️", scores: { ...z(), R: 2, I: 3, C: 2 } },

  // Biomed Lab
  { id: "bm-01", name: "Microscopy & cell staining", program: "Biomed Lab", emoji: "🔬", scores: { ...z(), R: 2, I: 3, C: 2 } },
  { id: "bm-02", name: "Patient case study", program: "Biomed Lab", emoji: "🩺", scores: { ...z(), I: 3, S: 3, C: 1 } },

  // Game Design
  { id: "gd-01", name: "Pixel-art sprite design", program: "Game Design", emoji: "👾", scores: { ...z(), A: 3, C: 1 } },
  { id: "gd-02", name: "Unity scripting & physics", program: "Game Design", emoji: "🎮", scores: { ...z(), R: 1, I: 3, A: 2, C: 2 } },

  // Civic Innovation
  { id: "ci-01", name: "Community needs interviews", program: "Civic Innovation", emoji: "🏘️", scores: { ...z(), S: 3, E: 2 } },
  { id: "ci-02", name: "Pitch to city council", program: "Civic Innovation", emoji: "📣", scores: { ...z(), A: 1, S: 2, E: 3 } },
];

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
