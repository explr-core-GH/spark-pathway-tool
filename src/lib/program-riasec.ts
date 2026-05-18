// Program-RIASEC coder tool — shared types, constants, and aggregation math.
// Rebuilt from the standalone explrtools.cc/program-riasec tool so admins can
// score EXPLR programs by RIASEC dimension and store the result locally.

import type { RIASECCode } from "./riasec";

export const AGE_BANDS = ["K-2", "3-5", "6-8", "9-12", "Mixed K-12"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export const FORMAT_TYPES = [
  "Camp",
  "Internship",
  "League",
  "Course",
  "Workshop",
  "After-school",
] as const;
export type FormatType = (typeof FORMAT_TYPES)[number];

export const DIFFICULTIES = [
  "Intro",
  "Intermediate",
  "Intermediate-Advanced",
  "Advanced",
] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const SOCIAL_STRUCTURES = [
  "Individual",
  "Individual + peer feedback",
  "Small team",
  "Large group",
  "Individual paths + cohort",
] as const;
export type SocialStructure = (typeof SOCIAL_STRUCTURES)[number];

export const OUTPUT_TYPES = [
  "Physical artifact",
  "Digital artifact",
  "Performance",
  "Knowledge",
  "Functional artifact + performance",
  "Physical artifact + presentation",
  "Digital artifact + presentation",
] as const;
export type OutputType = (typeof OUTPUT_TYPES)[number];

export const CULMINATING_EVENTS = [
  "None",
  "Reflection only",
  "Peer share",
  "Presentation to guests",
  "Showcase",
  "Competition",
  "Mission run",
  "Public showcase",
] as const;
export type CulminatingEvent = (typeof CULMINATING_EVENTS)[number];

// O*NET cross-functional skill domains
export const ONET_SKILLS = [
  "Active Learning",
  "Active Listening",
  "Complex Problem Solving",
  "Coordination",
  "Critical Thinking",
  "Equipment Maintenance",
  "Equipment Selection",
  "Instructing",
  "Judgment and Decision Making",
  "Learning Strategies",
  "Mathematics",
  "Monitoring",
  "Negotiation",
  "Operations Analysis",
  "Operations Monitoring",
  "Persuasion",
  "Programming",
  "Quality Control Analysis",
  "Reading Comprehension",
  "Repairing",
  "Science",
  "Service Orientation",
  "Social Perceptiveness",
  "Speaking",
  "Systems Analysis",
  "Systems Evaluation",
  "Technology Design",
  "Time Management",
  "Troubleshooting",
  "Visualization",
  "Writing",
] as const;
export type ONetSkill = (typeof ONET_SKILLS)[number];

// 16 National Career Clusters (NCCC)
export const CAREER_CLUSTERS = [
  "Agriculture, Food & Natural Resources",
  "Architecture & Construction",
  "Arts, A/V Technology & Communications",
  "Business Management & Administration",
  "Education & Training",
  "Finance",
  "Government & Public Administration",
  "Health Science",
  "Hospitality & Tourism",
  "Human Services",
  "Information Technology",
  "Law, Public Safety, Corrections & Security",
  "Manufacturing",
  "Marketing",
  "Science, Technology, Engineering & Mathematics (STEM)",
  "Transportation, Distribution & Logistics",
] as const;
export type CareerCluster = (typeof CAREER_CLUSTERS)[number];

export type ActivityScore = Record<RIASECCode, number>; // each 0-3

export type Activity = {
  id: string;
  name: string;
  timePct: number;   // 0-100; relative weight
  scores: ActivityScore;
  notes?: string;
};

export type Program = {
  id: string;
  name: string;
  ageBand: AgeBand | "";
  duration: string;
  formatType: FormatType | "";
  difficulty: Difficulty | "";
  socialStructure: SocialStructure | "";
  outputType: OutputType | "";
  culminatingEvent: CulminatingEvent | "";
  branchingPaths: boolean;
  notes: string;
  activities: Activity[];
  topSkills: (ONetSkill | "")[];
  primaryCluster: CareerCluster | "";
  secondaryClusters: CareerCluster[];
};

export const RIASEC_LETTERS: RIASECCode[] = ["R", "I", "A", "S", "E", "C"];

// Aggregate a program's RIASEC scores by weighting each activity's per-dimension
// score (0-3) by its time%, then normalizing the six totals into 0-100 percentages
// that sum to 100. Returns zeros if there are no activities or no time.
export function computeRiasecProfile(p: Program): Record<RIASECCode, number> {
  const totals: Record<RIASECCode, number> = {
    R: 0, I: 0, A: 0, S: 0, E: 0, C: 0,
  };
  let timeSum = 0;
  for (const a of p.activities) {
    const t = Math.max(0, a.timePct || 0);
    if (t === 0) continue;
    timeSum += t;
    for (const letter of RIASEC_LETTERS) {
      totals[letter] += (a.scores[letter] || 0) * t;
    }
  }
  if (timeSum === 0) return totals;
  const grand =
    totals.R + totals.I + totals.A + totals.S + totals.E + totals.C;
  if (grand === 0) return totals;
  const out: Record<RIASECCode, number> = {
    R: 0, I: 0, A: 0, S: 0, E: 0, C: 0,
  };
  for (const letter of RIASEC_LETTERS) {
    out[letter] = (totals[letter] / grand) * 100;
  }
  return out;
}

// Sum of a single activity's RIASEC scores (for the row-end "Sum" column).
export function activitySum(a: Activity): number {
  return RIASEC_LETTERS.reduce((s, l) => s + (a.scores[l] || 0), 0);
}

export function emptyActivity(): Activity {
  return {
    id: `a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: "",
    timePct: 0,
    scores: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
  };
}

export function emptyProgram(name = "New program"): Program {
  return {
    id: `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name,
    ageBand: "",
    duration: "",
    formatType: "",
    difficulty: "",
    socialStructure: "",
    outputType: "",
    culminatingEvent: "",
    branchingPaths: false,
    notes: "",
    activities: [],
    topSkills: ["", "", "", "", ""],
    primaryCluster: "",
    secondaryClusters: [],
  };
}

// Example programs — match the original tool's bundled examples.
export function exampleSeed(): Program[] {
  const ff = emptyProgram("FashionForge");
  ff.ageBand = "6-8";
  ff.duration = "5 days";
  ff.formatType = "Camp";
  ff.difficulty = "Intro";
  ff.socialStructure = "Individual + peer feedback";
  ff.outputType = "Physical artifact + presentation";
  ff.culminatingEvent = "Showcase";
  ff.notes =
    "Stealth Realistic program with Artistic on-ramp. Sewing, jewelry design, 3D-printed accessories.";
  ff.primaryCluster = "Arts, A/V Technology & Communications";
  ff.secondaryClusters = [
    "Manufacturing",
    "Science, Technology, Engineering & Mathematics (STEM)",
  ];
  ff.topSkills = [
    "Visualization",
    "Critical Thinking",
    "Active Learning",
    "Technology Design",
    "Complex Problem Solving",
  ];
  ff.activities = [
    {
      id: "ff-01",
      name: "Design ideation + mood boards",
      timePct: 15,
      scores: { R: 1, I: 2, A: 3, S: 1, E: 1, C: 1 },
    },
    {
      id: "ff-02",
      name: "Jewelry design + casting",
      timePct: 20,
      scores: { R: 3, I: 1, A: 3, S: 0, E: 0, C: 1 },
    },
    {
      id: "ff-03",
      name: "Sewing + textile work",
      timePct: 20,
      scores: { R: 3, I: 1, A: 2, S: 0, E: 0, C: 2 },
    },
    {
      id: "ff-04",
      name: "3D printing accessories",
      timePct: 15,
      scores: { R: 3, I: 2, A: 2, S: 0, E: 0, C: 1 },
    },
    {
      id: "ff-05",
      name: "Showcase prep + reflection",
      timePct: 15,
      scores: { R: 1, I: 1, A: 2, S: 2, E: 2, C: 1 },
    },
    {
      id: "ff-06",
      name: "Live showcase + critique",
      timePct: 15,
      scores: { R: 0, I: 1, A: 3, S: 2, E: 3, C: 0 },
    },
  ];

  const sp = emptyProgram("SeaPerch ROV");
  sp.ageBand = "6-8";
  sp.duration = "5 days";
  sp.formatType = "Camp";
  sp.difficulty = "Intermediate";
  sp.socialStructure = "Small team";
  sp.outputType = "Functional artifact + performance";
  sp.culminatingEvent = "Mission run";
  sp.notes =
    "Underwater ROV build. Strong Realistic + Investigative; team coordination drives Social/Enterprising.";
  sp.primaryCluster =
    "Science, Technology, Engineering & Mathematics (STEM)";
  sp.secondaryClusters = ["Manufacturing", "Information Technology"];
  sp.topSkills = [
    "Complex Problem Solving",
    "Repairing",
    "Equipment Selection",
    "Science",
    "Mathematics",
  ];
  sp.activities = [
    {
      id: "sp-01",
      name: "ROV frame + waterproofing",
      timePct: 25,
      scores: { R: 3, I: 2, A: 1, S: 1, E: 0, C: 2 },
    },
    {
      id: "sp-02",
      name: "Electronics + motor wiring",
      timePct: 20,
      scores: { R: 3, I: 3, A: 0, S: 0, E: 0, C: 2 },
    },
    {
      id: "sp-03",
      name: "Pool testing + iteration",
      timePct: 25,
      scores: { R: 3, I: 3, A: 1, S: 2, E: 1, C: 1 },
    },
    {
      id: "sp-04",
      name: "Mission planning + team strategy",
      timePct: 15,
      scores: { R: 1, I: 2, A: 0, S: 3, E: 3, C: 1 },
    },
    {
      id: "sp-05",
      name: "Mission run + team retro",
      timePct: 15,
      scores: { R: 2, I: 2, A: 0, S: 3, E: 2, C: 0 },
    },
  ];

  const ai = emptyProgram("AI Deep Dive");
  ai.ageBand = "9-12";
  ai.duration = "10 weeks";
  ai.formatType = "Course";
  ai.difficulty = "Intermediate-Advanced";
  ai.socialStructure = "Individual paths + cohort";
  ai.outputType = "Digital artifact + presentation";
  ai.culminatingEvent = "Presentation to guests";
  ai.branchingPaths = true;
  ai.notes =
    "Investigative-heavy with Conventional structure for ML pipelines. Real LLM project work.";
  ai.primaryCluster = "Information Technology";
  ai.secondaryClusters = [
    "Science, Technology, Engineering & Mathematics (STEM)",
  ];
  ai.topSkills = [
    "Programming",
    "Complex Problem Solving",
    "Critical Thinking",
    "Mathematics",
    "Systems Analysis",
  ];
  ai.activities = [
    {
      id: "ai-01",
      name: "Foundations: math + Python",
      timePct: 20,
      scores: { R: 0, I: 3, A: 0, S: 0, E: 0, C: 3 },
    },
    {
      id: "ai-02",
      name: "Build a classifier",
      timePct: 25,
      scores: { R: 1, I: 3, A: 1, S: 0, E: 0, C: 3 },
    },
    {
      id: "ai-03",
      name: "LLM project: capstone build",
      timePct: 30,
      scores: { R: 1, I: 3, A: 2, S: 1, E: 1, C: 2 },
    },
    {
      id: "ai-04",
      name: "Cohort critique + iteration",
      timePct: 15,
      scores: { R: 0, I: 2, A: 1, S: 3, E: 2, C: 1 },
    },
    {
      id: "ai-05",
      name: "Public presentation",
      timePct: 10,
      scores: { R: 0, I: 1, A: 2, S: 2, E: 3, C: 0 },
    },
  ];

  return [ff, sp, ai];
}

export const STORAGE_KEY = "explr-program-riasec:v1";

export type StoredState = {
  version: 1;
  programs: Program[];
  selectedId: string | null;
};
