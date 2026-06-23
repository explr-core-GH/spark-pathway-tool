// Shared types + helpers for the organization opportunity portal.

import type { Internship } from "./internships-catalog";

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
  holland: string;
  blurb: string;
  examples: string;
}> = [
  {
    key: "building",
    letter: "R",
    holland: "Realistic",
    label: "Building & making",
    blurb: "Hands-on work with tools, machines, materials, or the outdoors.",
    examples: "Welding, wiring a robot, running a CNC mill, assembling, repairing, fieldwork.",
  },
  {
    key: "investigating",
    letter: "I",
    holland: "Investigative",
    label: "Investigating & experimenting",
    blurb: "Researching, analyzing, testing ideas, and solving technical problems.",
    examples: "Running experiments, analyzing data, debugging code, diagnosing, modeling.",
  },
  {
    key: "designing",
    letter: "A",
    holland: "Artistic",
    label: "Designing & creating",
    blurb: "Open-ended creating, designing, and self-expression.",
    examples: "UX / graphic design, prototyping, video, animation, writing, music, art.",
  },
  {
    key: "helping",
    letter: "S",
    holland: "Social",
    label: "Helping & teaching",
    blurb: "Working with and for people — guiding, teaching, and supporting them.",
    examples: "Tutoring, mentoring younger students, patient or customer care, facilitating.",
  },
  {
    key: "leading",
    letter: "E",
    holland: "Enterprising",
    label: "Leading & persuading",
    blurb: "Leading, pitching, persuading, and organizing people toward a goal.",
    examples: "Pitching an idea, managing a team, sales, marketing, running an event.",
  },
  {
    key: "organizing",
    letter: "C",
    holland: "Conventional",
    label: "Organizing & data",
    blurb: "Working accurately with data, records, and clear procedures.",
    examples: "Spreadsheets, inventory, scheduling, quality checks, documentation, bookkeeping.",
  },
];

export const RIASEC_INTRO =
  "EXPLR matches students to opportunities by RIASEC (Holland) interest type — the same six types your students' interest assessment produces. Rather than guess at a code, estimate how a typical participant's time is split across these six kinds of activity. We weight the sliders and take the top one to three as this opportunity's interest code, so students who'll thrive here can find it. The closer this reflects the real day-to-day, the better the match.";

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}

/** Human schedule line from the structured picker. */
export function composeSchedule(days: string[], start: string, end: string): string {
  const d = days.length ? days.join(", ") : "";
  const t = start && end ? `${fmtTime(start)}–${fmtTime(end)}` : start ? `from ${fmtTime(start)}` : "";
  return [d, t].filter(Boolean).join(" · ");
}

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
  schedule_json: { days?: string[]; start?: string; end?: string } | null;
  lat: number | null;
  lng: number | null;
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
  requirements: string[];
  application_links: AppLink[];
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

// ── Worksite requirements, application links, forms ──────────────────────────

export type AppLink = { label: string; url: string };

export type OpportunityForm = {
  id: string;
  opportunity_id: string;
  name: string;
  file_url: string | null;
  requires_signature: boolean;
  sort_order: number;
};

export type FormCompletion = {
  id: string;
  form_id: string;
  student_id: string;
  completed_file_url: string | null;
  signed_name: string | null;
  signed_at: string | null;
};

/** Common requirement presets an org can check on (any opportunity type). */
export const REQUIREMENT_PRESETS = [
  "Casual dress",
  "Business casual",
  "Business / professional dress",
  "Closed-toed shoes required",
  "Steel-toed boots required",
  "Long pants required",
  "Safety glasses (provided on site)",
  "Pack a lunch",
  "Lunch available for purchase",
  "Lunch provided",
  "Transportation provided",
  "Must arrange own transportation",
  "Field trips included",
  "Background check required",
];

/** Requirement entries that name certifications are stored with this prefix. */
export const CERT_PREFIX = "Certifications: ";

/** Stable synthetic slug for an org internship inside the apply pipeline. */
export const OPP_SLUG_PREFIX = "opp:";
export function oppSlug(id: string): string {
  return `${OPP_SLUG_PREFIX}${id}`;
}
export function isOppSlug(slug: string): boolean {
  return slug.startsWith(OPP_SLUG_PREFIX);
}
export function oppIdFromSlug(slug: string): string {
  return slug.slice(OPP_SLUG_PREFIX.length);
}

/** Map an approved org internship into the catalog Internship shape used by
 *  the apply picker, so org + catalog internships unify in one flow. */
export function oppToCatalogInternship(o: Opportunity): Internship {
  const letters = (o.riasec_code ?? "")
    .toUpperCase()
    .split("")
    .filter((c) => "RIASEC".includes(c)) as Internship["riasec"];
  return {
    slug: oppSlug(o.id),
    name: o.name ?? "Internship",
    theme: o.org_name ?? "Partner internship",
    lead: null,
    outsidePartners: o.org_name ?? "",
    deliverables: o.description ?? "",
    externalUrl: o.external_url ?? "",
    emoji: "💼",
    riasec: letters.length ? letters : (["I"] as Internship["riasec"]),
  };
}
