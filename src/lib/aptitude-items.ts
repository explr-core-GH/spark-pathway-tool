// Aptitude battery item banks for MS (middle school) and HS (high school).
// Three subscales: numeric (number series), pattern (letter/shape series), verbal (analogies).
// Each item has 4 choices and one correct answer index.

export type AptitudeBand = "MS" | "HS";
export type AptitudeSubscale = "numeric" | "pattern" | "verbal";

export type AptitudeItem = {
  id: string;
  subscale: AptitudeSubscale;
  prompt: string;
  choices: string[];
  answer: number; // index into choices
};

export const SUBSCALE_LABELS: Record<AptitudeSubscale, string> = {
  numeric: "Numeric reasoning",
  pattern: "Pattern reasoning",
  verbal: "Verbal reasoning",
};

const MS_ITEMS: AptitudeItem[] = [
  // Numeric — number series
  { id: "MS-N1", subscale: "numeric", prompt: "What number comes next? 2, 4, 6, 8, ___", choices: ["9", "10", "12", "16"], answer: 1 },
  { id: "MS-N2", subscale: "numeric", prompt: "What number comes next? 3, 6, 12, 24, ___", choices: ["30", "36", "48", "60"], answer: 2 },
  { id: "MS-N3", subscale: "numeric", prompt: "What number is missing? 5, 10, ___, 20, 25", choices: ["12", "13", "15", "18"], answer: 2 },
  { id: "MS-N4", subscale: "numeric", prompt: "If you have 4 packs of 6 markers, how many markers do you have?", choices: ["10", "18", "24", "30"], answer: 2 },

  // Pattern — letter & shape series
  { id: "MS-P1", subscale: "pattern", prompt: "What letter comes next? A, C, E, G, ___", choices: ["H", "I", "J", "K"], answer: 1 },
  { id: "MS-P2", subscale: "pattern", prompt: "What comes next? ▲ ▲ ■ ▲ ▲ ■ ▲ ▲ ___", choices: ["▲", "■", "●", "◆"], answer: 1 },
  { id: "MS-P3", subscale: "pattern", prompt: "What letter is missing? B, D, F, ___, J", choices: ["G", "H", "I", "K"], answer: 1 },
  { id: "MS-P4", subscale: "pattern", prompt: "Which shape does NOT belong? ● ● ● ■ ●", choices: ["First ●", "Second ●", "■", "Last ●"], answer: 2 },

  // Verbal — analogies & vocabulary
  { id: "MS-V1", subscale: "verbal", prompt: "Bird is to sky as fish is to ___", choices: ["land", "water", "tree", "air"], answer: 1 },
  { id: "MS-V2", subscale: "verbal", prompt: "Which word means the opposite of 'happy'?", choices: ["glad", "sad", "tired", "loud"], answer: 1 },
  { id: "MS-V3", subscale: "verbal", prompt: "Hot is to cold as up is to ___", choices: ["over", "around", "down", "near"], answer: 2 },
  { id: "MS-V4", subscale: "verbal", prompt: "Which word does NOT belong? apple, banana, carrot, grape", choices: ["apple", "banana", "carrot", "grape"], answer: 2 },
];

const HS_ITEMS: AptitudeItem[] = [
  // Numeric
  { id: "HS-N1", subscale: "numeric", prompt: "What number comes next? 2, 6, 12, 20, 30, ___", choices: ["36", "40", "42", "44"], answer: 2 },
  { id: "HS-N2", subscale: "numeric", prompt: "What number comes next? 1, 1, 2, 3, 5, 8, ___", choices: ["11", "12", "13", "14"], answer: 2 },
  { id: "HS-N3", subscale: "numeric", prompt: "If 3x + 4 = 19, what is x?", choices: ["3", "5", "6", "7"], answer: 1 },
  { id: "HS-N4", subscale: "numeric", prompt: "A shirt costs $40 after a 20% discount. What was the original price?", choices: ["$48", "$50", "$52", "$60"], answer: 1 },

  // Pattern
  { id: "HS-P1", subscale: "pattern", prompt: "What comes next? AZ, BY, CX, DW, ___", choices: ["EU", "EV", "FV", "EW"], answer: 1 },
  { id: "HS-P2", subscale: "pattern", prompt: "What letter is missing? J, M, P, ___, V", choices: ["Q", "R", "S", "T"], answer: 2 },
  { id: "HS-P3", subscale: "pattern", prompt: "What comes next? ◐ ◓ ◑ ◒ ___", choices: ["◐", "◑", "◓", "●"], answer: 0 },
  { id: "HS-P4", subscale: "pattern", prompt: "Which sequence completes the pattern? 1A, 3C, 5E, 7G, ___", choices: ["8H", "9H", "9I", "10J"], answer: 2 },

  // Verbal
  { id: "HS-V1", subscale: "verbal", prompt: "Architect is to building as composer is to ___", choices: ["instrument", "symphony", "audience", "stage"], answer: 1 },
  { id: "HS-V2", subscale: "verbal", prompt: "Which word means the opposite of 'transparent'?", choices: ["clear", "opaque", "hidden", "fragile"], answer: 1 },
  { id: "HS-V3", subscale: "verbal", prompt: "Chapter is to book as scene is to ___", choices: ["actor", "stage", "play", "audience"], answer: 2 },
  { id: "HS-V4", subscale: "verbal", prompt: "Which word does NOT belong? candid, frank, sincere, deceptive", choices: ["candid", "frank", "sincere", "deceptive"], answer: 3 },
];

export function getItems(band: AptitudeBand): AptitudeItem[] {
  return band === "MS" ? MS_ITEMS : HS_ITEMS;
}

export type SubscaleScores = Record<AptitudeSubscale, { correct: number; total: number }>;

export function scoreAptitude(
  band: AptitudeBand,
  answers: Record<string, number>,
): { subscale_scores: SubscaleScores; total_score: number; total_items: number } {
  const items = getItems(band);
  const scores: SubscaleScores = {
    numeric: { correct: 0, total: 0 },
    pattern: { correct: 0, total: 0 },
    verbal: { correct: 0, total: 0 },
  };
  let total_score = 0;
  for (const item of items) {
    scores[item.subscale].total += 1;
    if (answers[item.id] === item.answer) {
      scores[item.subscale].correct += 1;
      total_score += 1;
    }
  }
  return { subscale_scores: scores, total_score, total_items: items.length };
}
