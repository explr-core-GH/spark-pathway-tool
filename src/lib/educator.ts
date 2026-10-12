// Shared types + helpers for the educator portal.
// Mirror of supabase/educator-schema.sql — keep these in sync if the enum changes.

export const PROGRAM_TYPES = [
  "stem",
  "cs",
  "robotics_fll",
  "robotics_ftc",
  "robotics_frc",
  "camp",
  "internship",
] as const;

export type ProgramType = (typeof PROGRAM_TYPES)[number];

export type ProgramMeta = {
  label: string; // short label for picker
  full: string; // expanded name
  band: string; // grade band displayed to the user
  blurb: string; // one-line description
  accent: string; // hex color for badge/accent
};

export const PROGRAM_META: Record<ProgramType, ProgramMeta> = {
  stem: {
    label: "Science / STEM",
    full: "Science / STEM educator",
    band: "K-12",
    blurb: "Classroom science, integrated STEM, lab-based courses.",
    accent: "#15CD86", // explr green
  },
  cs: {
    label: "Computer Science",
    full: "Computer Science educator",
    band: "K-12",
    blurb: "CS / coding / digital fluency teachers.",
    accent: "#4D5BAE", // riasec investigative blue
  },
  robotics_fll: {
    label: "Robotics — FLL",
    full: "FIRST LEGO League coach",
    band: "K-8",
    blurb: "Elementary + middle school LEGO League teams.",
    accent: "#D9952A", // amber
  },
  robotics_ftc: {
    label: "Robotics — FTC",
    full: "FIRST Tech Challenge coach",
    band: "7-12",
    blurb: "Middle + high school FTC teams.",
    accent: "#D9523B", // riasec realistic red
  },
  robotics_frc: {
    label: "Robotics — FRC",
    full: "FIRST Robotics Competition mentor",
    band: "9-12",
    blurb: "High school FRC teams.",
    accent: "#B14A99", // magenta
  },
  camp: {
    label: "EXPLR Camp",
    full: "EXPLR Camp educator",
    band: "Summer / after-school",
    blurb: "Summer camps and short-form EXPLR experiences.",
    accent: "#2E8FB0", // teal
  },
  internship: {
    label: "EXPLR Internship",
    full: "EXPLR Internship educator",
    band: "High school",
    blurb: "Workforce-connected internships for HS students.",
    accent: "#1A1D1F", // charcoal
  },
};

export function isProgramType(v: unknown): v is ProgramType {
  return typeof v === "string" && (PROGRAM_TYPES as readonly string[]).includes(v);
}

export const ASSESSMENT_KINDS = ["interest_ms", "interest_hs", "stem_survey"] as const;

export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number];

export const ASSESSMENT_META: Record<
  AssessmentKind,
  { label: string; band: string; blurb: string }
> = {
  interest_ms: {
    label: "Interest survey · MS",
    band: "Grades 5-8",
    blurb: "Picture-supported, plain-language RIASEC items.",
  },
  interest_hs: {
    label: "Interest survey · HS",
    band: "Grades 9-12",
    blurb: "Full RIASEC interest profile with text items.",
  },
  stem_survey: {
    label: "STEM efficacy survey",
    band: "Grades 4-12",
    blurb: "Pre/post STEM self-efficacy and career-interest survey.",
  },
};

// Generate a URL-safe invite token (32 chars). Safe to call client-side.
export function newInviteToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  // URL-safe base64
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  if (typeof btoa !== "undefined") {
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  // Node fallback
  return Buffer.from(bin, "binary")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
