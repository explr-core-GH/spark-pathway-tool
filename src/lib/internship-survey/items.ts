// Internship Interest Survey — item bank (presentation only).
//
// Item TEXT and ordering live here. RIASEC tags and all weights live in
// config.ts so the instrument can be re-tuned without touching this file or any
// scoring logic. One item per screen; target length 5-7 minutes.

export type SurveySection = 1 | 2 | 3 | 4 | 5 | 6;
export type SurveyItemType =
  | "scale4"
  | "forcedChoice"
  | "sectorTap"
  | "slider"
  | "experience4"
  | "open";

export type SurveyItem =
  | { id: string; section: 1; type: "scale4"; prompt: string }
  | { id: string; section: 2; type: "forcedChoice"; optionA: string; optionB: string }
  | { id: string; section: 3; type: "sectorTap"; sector: string }
  | { id: string; section: 4; type: "slider"; left: string; right: string }
  | { id: string; section: 5; type: "experience4"; topic: string; askKind?: boolean }
  | { id: string; section: 6; type: "open"; prompt: string };

// Index = value. Scale labels for section 1 (0..3).
export const SCALE4_LABELS = ["Not for me", "Eh", "Sounds good", "Love it"] as const;
export const SCALE4_FACES = ["😣", "😐", "🙂", "😄"] as const;

// Index = value. Sector tap labels for section 3 (0..2).
export const SECTOR_LABELS = ["Not interested", "Maybe", "Yes"] as const;

// Section 5 four-way buttons.
export const EXPERIENCE_OPTIONS: { value: string; label: string; sub: string }[] = [
  { value: "DID_LIKE", label: "Did it — want more", sub: "👍" },
  { value: "DID_DISLIKE", label: "Did it — not for me", sub: "👎" },
  { value: "NEW_CURIOUS", label: "Never tried — curious", sub: "✨" },
  { value: "NEW_NOPE", label: "Never tried — not interested", sub: "🚫" },
];

// EXP7 "what kind?" chips.
export const EXPERIENCE_KINDS = [
  "STEM",
  "Arts",
  "Sports",
  "Service / volunteer",
  "Student government",
  "Cultural",
  "Other",
] as const;

export const SECTION_INTROS: Record<SurveySection, { eyebrow: string; lead: string }> = {
  1: { eyebrow: "Activity interest", lead: "How into each of these are you?" },
  2: { eyebrow: "Quick picks", lead: "Pick the one that sounds more like you." },
  3: { eyebrow: "Sectors", lead: "How interested are you in working in this area?" },
  4: { eyebrow: "Work style", lead: "Where do you land?" },
  5: { eyebrow: "Experience", lead: "What have you tried? No experience needed — both are great." },
  6: { eyebrow: "One more thing", lead: "Optional — never required to finish." },
};

export const SURVEY_ITEMS: SurveyItem[] = [
  // Section 1 — Activity interest (RIASEC core)
  { id: "R1", section: 1, type: "scale4", prompt: "Build or fix something with tools and your hands" },
  { id: "R2", section: 1, type: "scale4", prompt: "Work outside or be physically active on the job" },
  { id: "R3", section: 1, type: "scale4", prompt: "Take apart a machine to see how it works" },
  { id: "I1", section: 1, type: "scale4", prompt: "Dig into why something works the way it does" },
  { id: "I2", section: 1, type: "scale4", prompt: "Run an experiment and analyze what happened" },
  { id: "I3", section: 1, type: "scale4", prompt: "Solve a tricky problem with data or numbers" },
  { id: "A1", section: 1, type: "scale4", prompt: "Design something that looks good (a poster, a space, a product)" },
  { id: "A2", section: 1, type: "scale4", prompt: "Make a video, photos, music, or other media" },
  { id: "A3", section: 1, type: "scale4", prompt: "Come up with original ideas nobody has tried" },
  { id: "S1", section: 1, type: "scale4", prompt: "Teach, coach, or help someone learn" },
  { id: "S2", section: 1, type: "scale4", prompt: "Work directly with people who need support" },
  { id: "S3", section: 1, type: "scale4", prompt: "Be part of a team working toward a shared goal" },
  { id: "E1", section: 1, type: "scale4", prompt: "Pitch an idea and get people on board" },
  { id: "E2", section: 1, type: "scale4", prompt: "Lead a project or organize a group" },
  { id: "E3", section: 1, type: "scale4", prompt: "Start something of your own" },
  { id: "C1", section: 1, type: "scale4", prompt: "Keep things organized, accurate, and on schedule" },
  { id: "C2", section: 1, type: "scale4", prompt: "Work with records, spreadsheets, or detailed info" },
  { id: "C3", section: 1, type: "scale4", prompt: "Follow a clear process to get a job done right" },

  // Section 2 — Quick picks (forced choice)
  { id: "FC1", section: 2, type: "forcedChoice", optionA: "Fix something that is broken", optionB: "Plan an event" },
  { id: "FC2", section: 2, type: "forcedChoice", optionA: "Figure out why an experiment failed", optionB: "Design how it looks" },
  { id: "FC3", section: 2, type: "forcedChoice", optionA: "Help someone learn something", optionB: "Keep everything organized and accurate" },
  { id: "FC4", section: 2, type: "forcedChoice", optionA: "Build a prototype", optionB: "Make a video about it" },
  { id: "FC5", section: 2, type: "forcedChoice", optionA: "Lead the group", optionB: "Dig into the research" },
  { id: "FC6", section: 2, type: "forcedChoice", optionA: "Support or care for people", optionB: "Run the numbers and track the details" },

  // Section 3 — Sectors
  { id: "SEC1", section: 3, type: "sectorTap", sector: "Health and medicine" },
  { id: "SEC2", section: 3, type: "sectorTap", sector: "Engineering and building" },
  { id: "SEC3", section: 3, type: "sectorTap", sector: "Technology and coding" },
  { id: "SEC4", section: 3, type: "sectorTap", sector: "Environment and sustainability" },
  { id: "SEC5", section: 3, type: "sectorTap", sector: "Business and entrepreneurship" },
  { id: "SEC6", section: 3, type: "sectorTap", sector: "Media, design, and communication" },
  { id: "SEC7", section: 3, type: "sectorTap", sector: "Education and working with kids" },
  { id: "SEC8", section: 3, type: "sectorTap", sector: "Skilled trades and manufacturing" },
  { id: "SEC9", section: 3, type: "sectorTap", sector: "Science and research" },
  { id: "SEC10", section: 3, type: "sectorTap", sector: "Public service and community" },

  // Section 4 — Work style (sliders, 0..100, left = 0)
  { id: "ENV1", section: 4, type: "slider", left: "Hands-on physical work", right: "Screen or desk work" },
  { id: "ENV2", section: 4, type: "slider", left: "Indoors", right: "Outdoors" },
  { id: "ENV3", section: 4, type: "slider", left: "Work solo", right: "Work on a team" },
  { id: "ENV4", section: 4, type: "slider", left: "Structured routine", right: "Figure it out as you go" },
  { id: "ENV5", section: 4, type: "slider", left: "Lots of talking to people", right: "Heads-down focus" },

  // Section 5 — Experience (with valence)
  { id: "EXP1", section: 5, type: "experience4", topic: "A previous internship or job" },
  { id: "EXP2", section: 5, type: "experience4", topic: "A robotics team (FLL, FTC, VEX, etc.)" },
  { id: "EXP3", section: 5, type: "experience4", topic: "A STEM camp" },
  { id: "EXP4", section: 5, type: "experience4", topic: "A science fair or research project" },
  { id: "EXP5", section: 5, type: "experience4", topic: "Coding or app/game development" },
  { id: "EXP6", section: 5, type: "experience4", topic: "CAD, 3D design, or building/fabrication" },
  { id: "EXP7", section: 5, type: "experience4", topic: "A club", askKind: true },

  // Section 6 — One more thing (optional, not scored)
  {
    id: "OPEN1",
    section: 6,
    type: "open",
    prompt: "Anything else you have made, built, joined, or messed around with that we should know?",
  },
];

// Convenience: sector id -> label, derived from the bank so there's one source.
export const SECTORS: { id: string; label: string }[] = SURVEY_ITEMS.filter(
  (i): i is Extract<SurveyItem, { type: "sectorTap" }> => i.type === "sectorTap",
).map((i) => ({ id: i.id, label: i.sector }));

export function sectorLabel(id: string): string {
  return SECTORS.find((s) => s.id === id)?.label ?? id;
}
