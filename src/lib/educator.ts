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
  label: string;        // short label for picker
  full: string;         // expanded name
  band: string;         // grade band displayed to the user
  blurb: string;        // one-line description
  accent: string;       // hex color for badge/accent
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

export const ASSESSMENT_KINDS = [
  "interest_ms",
  "interest_hs",
  "aptitude_ms",
  "aptitude_hs",
  "internships",
] as const;

export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number];

export const ASSESSMENT_META: Record<AssessmentKind, { label: string; band: string; blurb: string }> = {
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
  aptitude_ms: {
    label: "Aptitude battery · MS",
    band: "Grades 5-8",
    blurb: "Spatial, pattern, idea-generation, working memory.",
  },
  aptitude_hs: {
    label: "Aptitude battery · HS",
    band: "Grades 9-12",
    blurb: "Full aptitude battery including 3D rotation.",
  },
  internships: {
    label: "Internship interest",
    band: "Grades 9-12",
    blurb: "Yes/maybe/no across the Summer 2026 internship catalog.",
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

// Curriculum stub content. POC: each program type gets a structured outline.
// Real content lives elsewhere; we link out when we have URLs.
export type CurriculumSection = {
  title: string;
  body: string;
  resources?: { label: string; href?: string }[];
};

export const CURRICULUM: Record<ProgramType, CurriculumSection[]> = {
  stem: [
    {
      title: "Unit launch — Find what you like",
      body: "Run the EXPLR interest survey in week 1 to anchor the year around student-specific career connections. Class-level RIASEC distribution becomes the spine of unit framing.",
      resources: [
        { label: "MS interest survey", href: "/demo/interest/MS/take" },
        { label: "HS interest survey", href: "/demo/interest/HS/take" },
      ],
    },
    {
      title: "Lab cycles aligned to NGSS",
      body: "Three-week lab cycles (Investigate → Build → Communicate) with explicit RIASEC tie-ins each week.",
      resources: [{ label: "Lab cycle planner (coming)" }],
    },
    {
      title: "Career-connected assessments",
      body: "Use the aptitude battery mid-year to surface students with high spatial / pattern aptitude for STEM enrichment placement.",
      resources: [{ label: "MS aptitude battery", href: "/demo/aptitude/MS/take" }],
    },
  ],
  cs: [
    {
      title: "Block-to-text progression",
      body: "Scope-and-sequence for K-12 CS, from block-based intro to text-based capstone. RIASEC Investigative + Realistic alignment.",
      resources: [{ label: "Scope-and-sequence (coming)" }],
    },
    {
      title: "Project portfolio",
      body: "Each student maintains a portfolio mapped to their Holland code. Investigative-leaning students do system-design projects; Artistic-leaning students do creative-coding projects.",
    },
    {
      title: "Assessment cadence",
      body: "Interest survey at intake, aptitude mid-year, then a one-page reflection at year-end tied to the EXPLR report.",
      resources: [
        { label: "MS interest survey", href: "/demo/interest/MS/take" },
        { label: "HS interest survey", href: "/demo/interest/HS/take" },
      ],
    },
  ],
  robotics_fll: [
    {
      title: "Season kickoff playbook",
      body: "Run interest + working-memory items in the first two meetings to balance team roles (builder / coder / presenter / researcher).",
      resources: [
        { label: "MS aptitude battery", href: "/demo/aptitude/MS/take" },
      ],
    },
    {
      title: "Core values rubric",
      body: "FLL Core Values rubric mapped to EXPLR's career-readiness indicators. Builder-leaning students still get Investigative + Communication exposure.",
    },
    {
      title: "Innovation Project pipeline",
      body: "Use the interest survey to seed Innovation Project topic selection — students lean into topics aligned with their top RIASEC dimensions.",
    },
  ],
  robotics_ftc: [
    {
      title: "Team formation",
      body: "Aptitude + interest data informs sub-team placement (CAD, build, drive, programming, outreach). Especially useful for first-year teams.",
      resources: [
        { label: "MS aptitude battery", href: "/demo/aptitude/MS/take" },
        { label: "HS aptitude battery", href: "/demo/aptitude/HS/take" },
      ],
    },
    {
      title: "Engineering portfolio prep",
      body: "Use the EXPLR report as the opening section of each student's engineering portfolio — career direction grounded in real data.",
    },
    {
      title: "Outreach + judging",
      body: "Holland-code talking points for outreach interviews. Helps students articulate why FTC fits their long-term path.",
    },
  ],
  robotics_frc: [
    {
      title: "Pre-season skills inventory",
      body: "September: aptitude battery + interest survey across the whole team. Captain + leads use the dashboard to plan sub-team training.",
      resources: [{ label: "HS aptitude battery", href: "/demo/aptitude/HS/take" }],
    },
    {
      title: "Mentor matching",
      body: "Pair mentors with students whose RIASEC top-three matches the mentor's professional field.",
    },
    {
      title: "Post-season transition",
      body: "Seniors run their EXPLR report alongside their college / workforce application materials.",
    },
  ],
  camp: [
    {
      title: "Day 1 onboarding",
      body: "Campers do the MS interest survey on intake — counselors see a per-cabin RIASEC snapshot before activities start.",
      resources: [{ label: "MS interest survey", href: "/demo/interest/MS/take" }],
    },
    {
      title: "Activity rotation design",
      body: "Rotate campers through Realistic / Investigative / Artistic / Social blocks daily. EXPLR data ensures coverage rather than self-selection bias.",
    },
    {
      title: "Camper report-out",
      body: "Last-day family event uses the EXPLR report as the centerpiece — campers explain what they learned about themselves.",
    },
  ],
  internship: [
    {
      title: "Pre-placement screening",
      body: "Applicants complete the full assessment (interest + aptitude + internship interest) before site assignment.",
      resources: [
        { label: "HS interest survey", href: "/demo/interest/HS/take" },
        { label: "HS aptitude battery", href: "/demo/aptitude/HS/take" },
        { label: "Internship interest", href: "/demo/internships/take" },
      ],
    },
    {
      title: "Site supervisor briefing",
      body: "Supervisors receive a one-page intern profile (Holland code + aptitude strengths + intern's stated career hypothesis).",
    },
    {
      title: "Mid-summer + closeout",
      body: "Mid-summer check-in revisits the EXPLR report; closeout produces the student's reflective career-readiness statement.",
      resources: [{ label: "Cohort dashboard", href: "/staff/dashboard" }],
    },
  ],
};
