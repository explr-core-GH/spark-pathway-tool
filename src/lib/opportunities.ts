// Shared types + helpers for the organization opportunity portal.

export type OppType = "camp" | "workshop" | "internship" | "ongoing";

export const OPP_TYPES: Array<{
  key: OppType;
  label: string;
  blurb: string;
  gradeMin: number | null;
  gradeMax: number | null;
  oneTime: boolean;
  /** Internships always register in-system; the rest can choose. */
  registrationLocked: boolean;
}> = [
  {
    key: "camp",
    label: "Camp",
    blurb: "Multi-day program, grades 4–8",
    gradeMin: 4,
    gradeMax: 8,
    oneTime: false,
    registrationLocked: false,
  },
  {
    key: "workshop",
    label: "Workshop",
    blurb: "One-time event, any grade (hackathon, CNC training)",
    gradeMin: null,
    gradeMax: null,
    oneTime: true,
    registrationLocked: false,
  },
  {
    key: "internship",
    label: "Internship",
    blurb: "Grades 9–12 · everything happens in-system",
    gradeMin: 9,
    gradeMax: 12,
    oneTime: false,
    registrationLocked: true,
  },
  {
    key: "ongoing",
    label: "Ongoing opportunity",
    blurb: "A class or club, any grade",
    gradeMin: null,
    gradeMax: null,
    oneTime: false,
    registrationLocked: false,
  },
];

export function oppTypeMeta(type: OppType) {
  return OPP_TYPES.find((t) => t.key === type) ?? OPP_TYPES[0];
}

/**
 * RIASEC activity domains. An organization splits the program's TIME across
 * these; we weight and take the top letters as the opportunity's Holland code.
 * Grounded in Holland's RIASEC theory + time-on-task weighting.
 */
export const RIASEC_ACTIVITIES: Array<{
  key: string;
  label: string;
  letter: string;
  blurb: string;
}> = [
  { key: "building", label: "Building & making", letter: "R", blurb: "hands-on, tools, machines" },
  { key: "investigating", label: "Investigating & experimenting", letter: "I", blurb: "research, analyze, solve" },
  { key: "designing", label: "Designing & creating", letter: "A", blurb: "art, media, design" },
  { key: "helping", label: "Helping & teaching", letter: "S", blurb: "mentor, serve, collaborate" },
  { key: "leading", label: "Leading & pitching", letter: "E", blurb: "persuade, sell, entrepreneurship" },
  { key: "organizing", label: "Organizing & data", letter: "C", blurb: "records, details, procedures" },
];

const RIASEC_ORDER = ["R", "I", "A", "S", "E", "C"];

export function emptyRiasecWeights(): Record<string, number> {
  return Object.fromEntries(RIASEC_ACTIVITIES.map((a) => [a.key, 0]));
}

/**
 * Holland code from time weights: sum per letter, take the top up to 3 with a
 * non-trivial share (≥10% of the total). Ties break by canonical RIASEC order.
 */
export function codeFromWeights(weights: Record<string, number>): string {
  const byLetter = new Map<string, number>();
  let total = 0;
  for (const a of RIASEC_ACTIVITIES) {
    const v = Math.max(0, weights[a.key] ?? 0);
    byLetter.set(a.letter, (byLetter.get(a.letter) ?? 0) + v);
    total += v;
  }
  if (total === 0) return "";
  return [...byLetter.entries()]
    .filter(([, v]) => v / total >= 0.1)
    .sort((a, b) => b[1] - a[1] || RIASEC_ORDER.indexOf(a[0]) - RIASEC_ORDER.indexOf(b[0]))
    .slice(0, 3)
    .map(([letter]) => letter)
    .join("");
}

export type FieldConfig = {
  id: string;
  opportunity_type: OppType;
  field_key: string;
  label: string;
  help_text: string | null;
  field_type: "text" | "textarea" | "number" | "select" | "checkbox" | "date";
  options: string[] | null;
  required: boolean;
  enabled: boolean;
  sort_order: number;
  is_core: boolean;
};

export type Opportunity = {
  id: string;
  org_id: string;
  org_name: string | null;
  org_logo_url: string | null;
  type: OppType;
  name: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  schedule: string | null;
  grade_min: number | null;
  grade_max: number | null;
  is_free: boolean;
  cost_cents: number | null;
  capacity: number | null;
  location: string | null;
  image_url: string | null;
  registration_mode: "internal" | "external";
  external_url: string | null;
  riasec_code: string | null;
  riasec_weights: Record<string, number> | null;
  custom: Record<string, unknown>;
  status: "draft" | "submitted" | "approved" | "rejected";
  review_notes: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

export const STATUS_LABEL: Record<Opportunity["status"], string> = {
  draft: "Draft",
  submitted: "In review",
  approved: "Approved",
  rejected: "Needs changes",
};

export function dollars(cents: number | null | undefined): string {
  if (!cents) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

// ── Internship age gate ──────────────────────────────────────────────────────
// Students must be 14 by June 1 of the internship's year, and in grade 8+.

/**
 * The cohort year for an internship with no explicit date: if today is on/after
 * June 1, the next cohort is next year (this year's already started).
 */
export function nextInternshipCohortYear(now: Date): number {
  const juneFirst = new Date(now.getFullYear(), 5, 1); // month 5 = June
  return now >= juneFirst ? now.getFullYear() + 1 : now.getFullYear();
}

/** The year whose June 1 cutoff applies to this internship. */
export function internshipYearOf(startDate: string | null, now: Date): number {
  if (startDate) return Number(startDate.slice(0, 4));
  return nextInternshipCohortYear(now);
}

/** True if a student with this DOB turns 14 on or before June 1 of `year`. */
export function turns14ByJune1(dob: string, year: number): boolean {
  const [y, m, d] = dob.split("-").map(Number);
  if (!y || !m || !d) return false;
  const fourteenth = new Date(y + 14, m - 1, d);
  const cutoff = new Date(year, 5, 1); // June 1 of the cohort year
  return fourteenth <= cutoff;
}

/** Shared-letter count between a student's Holland code and an opportunity's. */
export function hollandMatch(studentCode: string | null, oppCode: string | null): number {
  if (!studentCode || !oppCode) return 0;
  const have = new Set(studentCode.toUpperCase().split(""));
  let n = 0;
  for (const c of oppCode.toUpperCase()) if (have.has(c)) n += 1;
  return n;
}

export const INTERNSHIP_MIN_GRADE = 8;
