// RIASEC = John Holland's six interest dimensions (Holland, 1959; Holland 1997).
// Arranged on a hexagon: adjacent dimensions correlate (sit next to each other);
// opposite dimensions contrast (sit across the hexagon).
//
// The six are the most rigorously validated framework for adolescent interest
// assessment. Structural validity confirmed across diverse populations
// (Day, Rounds & Swaney 1998), interest stability documented from age 12 onward
// (Low, Yoon, Roberts & Rounds 2005). It is the framework underneath the
// O*NET Interest Profiler, the Self-Directed Search, and the Strong Interest
// Inventory.
//
// COLOR SYSTEM
// Colors are placed on the color wheel at 60° intervals so that:
//   - Adjacent dimensions (which correlate) get analogous colors
//   - Opposite dimensions (which contrast) get complementary colors
//   - R↔S, I↔E, A↔C are the three opposite pairs
// All six are tonally controlled (similar saturation/lightness) and held distinct
// from the EXPLR brand mint (#2BEDA1, hue ~155°) by saturation and value.

export type RIASECCode = "R" | "I" | "A" | "S" | "E" | "C";

export type RIASECDimension = {
  code: RIASECCode;
  name: string;
  msPlainName: string; // grade 4 reading
  hsPlainName: string; // grade 7-8 reading
  msDescription: string;
  hsDescription: string;
  examples: string[];
  color: string;
  colorSoft: string; // soft tint for backgrounds
  hexAngle: number; // degrees on the hexagon, 0 = top, clockwise
};

export const RIASEC: Record<RIASECCode, RIASECDimension> = {
  R: {
    code: "R",
    name: "Realistic",
    msPlainName: "Building & Doing",
    hsPlainName: "Hands-On & Practical",
    msDescription:
      "You like working with your hands. Tools, machines, animals, and being outside.",
    hsDescription:
      "Hands-on, practical work. Tools, machines, equipment, animals, and being outside.",
    examples: ["Mechanic", "Carpenter", "Veterinary tech", "Electrician", "Park ranger"],
    color: "#D9523B", // warm vermillion · hue 10°
    colorSoft: "#FBEBE6",
    hexAngle: 0,
  },
  I: {
    code: "I",
    name: "Investigative",
    msPlainName: "Thinking & Figuring Out",
    hsPlainName: "Investigating & Analyzing",
    msDescription:
      "You like to figure things out. Asking questions, doing science, solving puzzles.",
    hsDescription:
      "Research, science, analysis. Asking questions and finding answers with data.",
    examples: ["Scientist", "Doctor", "Software developer", "Data analyst", "Lab tech"],
    color: "#D9952A", // amber-gold · hue 45°
    colorSoft: "#FBEEDC",
    hexAngle: 60,
  },
  A: {
    code: "A",
    name: "Artistic",
    msPlainName: "Making & Creating",
    hsPlainName: "Creating & Expressing",
    msDescription:
      "You like to make things. Drawing, music, writing, design, performing.",
    hsDescription:
      "Creative work. Visual art, music, writing, design, performance, media.",
    examples: ["Designer", "Musician", "Writer", "Photographer", "Animator"],
    color: "#3D9C56", // forest green · hue 135° (distinct from EXPLR mint by saturation+value)
    colorSoft: "#E1F1E5",
    hexAngle: 120,
  },
  S: {
    code: "S",
    name: "Social",
    msPlainName: "Helping & Teaching",
    hsPlainName: "Helping & Teaching",
    msDescription: "You like helping people. Teaching, listening, taking care of others.",
    hsDescription:
      "Working with people. Teaching, counseling, healthcare, community service.",
    examples: ["Teacher", "Nurse", "Counselor", "Coach", "Social worker"],
    color: "#2E8FB0", // teal-cyan · hue 195° (opposite of R warm vermillion)
    colorSoft: "#DBEBF1",
    hexAngle: 180,
  },
  E: {
    code: "E",
    name: "Enterprising",
    msPlainName: "Leading & Persuading",
    hsPlainName: "Leading & Building",
    msDescription:
      "You like to lead. Talking people into things, starting projects, being in charge.",
    hsDescription:
      "Leadership, sales, entrepreneurship, business — moving people and projects forward.",
    examples: ["Entrepreneur", "Manager", "Salesperson", "Lawyer", "Real estate agent"],
    color: "#5C56B0", // indigo-violet · hue 245° (opposite of I gold)
    colorSoft: "#E5E3F1",
    hexAngle: 240,
  },
  C: {
    code: "C",
    name: "Conventional",
    msPlainName: "Organizing & Planning",
    hsPlainName: "Organizing & Detail Work",
    msDescription:
      "You like things organized. Numbers, lists, plans, neat and clear.",
    hsDescription:
      "Detail-oriented work. Records, data, systems, organization, accuracy.",
    examples: ["Accountant", "Office manager", "Logistics coordinator", "Bookkeeper", "Paralegal"],
    color: "#B14A99", // magenta-orchid · hue 315° (opposite of A green)
    colorSoft: "#F3E0EE",
    hexAngle: 300,
  },
};

export const RIASEC_ORDER: RIASECCode[] = ["R", "I", "A", "S", "E", "C"];

// The three opposite pairs in Holland's hexagon
export const RIASEC_OPPOSITES: Array<[RIASECCode, RIASECCode]> = [
  ["R", "S"],
  ["I", "E"],
  ["A", "C"],
];

export function getDimension(code: RIASECCode): RIASECDimension {
  return RIASEC[code];
}
