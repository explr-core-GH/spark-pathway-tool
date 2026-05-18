// Built-in RIASEC item bank for the EXPLR mini-IP.
// Five items per scale × 6 scales = 30 items. Replace with a curated bank later.
// Each item has MS (grade 4 reading) and HS (grade 7-8 reading) prompts.

import type { RIASECCode } from "./riasec";

export type AssessmentItem = {
  id: string;          // stable item id, persisted in responses
  scale: RIASECCode;   // which RIASEC dimension this item loads on
  ms: string;          // middle-school prompt
  hs: string;          // high-school prompt
};

export const FORM_VERSION = "explr-mini-ip-v1";

export const ITEMS: AssessmentItem[] = [
  // R — Realistic
  { id: "R1", scale: "R", ms: "Fix something that is broken.", hs: "Repair a piece of equipment that's broken." },
  { id: "R2", scale: "R", ms: "Build something out of wood or metal.", hs: "Build a structure out of wood, metal, or other materials." },
  { id: "R3", scale: "R", ms: "Take care of animals.", hs: "Work outdoors with animals or plants." },
  { id: "R4", scale: "R", ms: "Drive a tractor or a forklift.", hs: "Operate heavy machinery or vehicles." },
  { id: "R5", scale: "R", ms: "Put together a model or kit.", hs: "Assemble electronic components from a kit." },

  // I — Investigative
  { id: "I1", scale: "I", ms: "Do a science experiment.", hs: "Design and run a science experiment." },
  { id: "I2", scale: "I", ms: "Solve a hard puzzle.", hs: "Solve complex logic or math puzzles." },
  { id: "I3", scale: "I", ms: "Read about how the body works.", hs: "Study how the human body or diseases work." },
  { id: "I4", scale: "I", ms: "Look at things under a microscope.", hs: "Analyze samples in a lab." },
  { id: "I5", scale: "I", ms: "Figure out why something works.", hs: "Investigate why something behaves the way it does." },

  // A — Artistic
  { id: "A1", scale: "A", ms: "Draw or paint a picture.", hs: "Create original visual art." },
  { id: "A2", scale: "A", ms: "Play a musical instrument.", hs: "Compose or perform music." },
  { id: "A3", scale: "A", ms: "Write a story or a poem.", hs: "Write fiction, poetry, or scripts." },
  { id: "A4", scale: "A", ms: "Take and edit photos.", hs: "Shoot and edit photos or video." },
  { id: "A5", scale: "A", ms: "Design a logo or poster.", hs: "Design graphics, logos, or layouts." },

  // S — Social
  { id: "S1", scale: "S", ms: "Help a younger student with homework.", hs: "Tutor someone in a subject you're good at." },
  { id: "S2", scale: "S", ms: "Listen to a friend who is upset.", hs: "Counsel a friend through a hard time." },
  { id: "S3", scale: "S", ms: "Take care of someone who is sick.", hs: "Care for patients in a healthcare setting." },
  { id: "S4", scale: "S", ms: "Teach kids a new game.", hs: "Lead a workshop or class for younger students." },
  { id: "S5", scale: "S", ms: "Volunteer in your neighborhood.", hs: "Organize a community service project." },

  // E — Enterprising
  { id: "E1", scale: "E", ms: "Be the captain of a team.", hs: "Lead a team toward a goal." },
  { id: "E2", scale: "E", ms: "Sell things at a school fundraiser.", hs: "Sell a product or service to customers." },
  { id: "E3", scale: "E", ms: "Start a small business of your own.", hs: "Launch and run your own business." },
  { id: "E4", scale: "E", ms: "Convince people to vote for your idea.", hs: "Persuade people to support a cause or proposal." },
  { id: "E5", scale: "E", ms: "Run a meeting and keep it moving.", hs: "Manage projects and direct other people's work." },

  // C — Conventional
  { id: "C1", scale: "C", ms: "Keep things neat and in order.", hs: "Organize records and files so they're easy to find." },
  { id: "C2", scale: "C", ms: "Work with numbers and money.", hs: "Track budgets, invoices, or accounting records." },
  { id: "C3", scale: "C", ms: "Follow a checklist exactly.", hs: "Follow detailed procedures precisely." },
  { id: "C4", scale: "C", ms: "Make a chart or a spreadsheet.", hs: "Build spreadsheets and data tables." },
  { id: "C5", scale: "C", ms: "Plan out a schedule.", hs: "Plan logistics and schedules for a team or event." },
];

export type LikertValue = 1 | 2 | 3 | 4 | 5;

export const LIKERT_LABELS: Record<LikertValue, string> = {
  1: "Strongly dislike",
  2: "Dislike",
  3: "Neutral",
  4: "Like",
  5: "Strongly like",
};

// Fisher-Yates shuffle, seeded by session id substring so order is deterministic per session.
export function buildItemSequence(seed: string): string[] {
  const arr = ITEMS.map((i) => i.id);
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Compute per-scale mean (1-5), top-3 Holland code, and validity flags.
export type ScaleScores = Record<RIASECCode, number>;

export function scoreResponses(
  responses: Array<{ item_id: string; value: number; response_time_ms: number }>,
): { scale_scores: ScaleScores; holland_code: string; flag_uniform: boolean; flag_speeding: boolean } {
  const byScale: Record<RIASECCode, number[]> = { R: [], I: [], A: [], S: [], E: [], C: [] };
  const itemMap = new Map(ITEMS.map((i) => [i.id, i]));
  for (const r of responses) {
    const item = itemMap.get(r.item_id);
    if (item) byScale[item.scale].push(r.value);
  }
  const scale_scores = {} as ScaleScores;
  (Object.keys(byScale) as RIASECCode[]).forEach((k) => {
    const vals = byScale[k];
    scale_scores[k] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });
  const holland_code = (Object.keys(scale_scores) as RIASECCode[])
    .sort((a, b) => scale_scores[b] - scale_scores[a])
    .slice(0, 3)
    .join("");
  // Validity flags
  const values = responses.map((r) => r.value);
  const unique = new Set(values);
  const flag_uniform = values.length >= 10 && unique.size <= 1;
  const medianTime = (() => {
    const t = responses.map((r) => r.response_time_ms).sort((a, b) => a - b);
    return t.length ? t[Math.floor(t.length / 2)] : 0;
  })();
  const flag_speeding = responses.length >= 10 && medianTime > 0 && medianTime < 800;
  return { scale_scores, holland_code, flag_uniform, flag_speeding };
}
