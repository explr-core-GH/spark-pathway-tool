/**
 * Archive export — pure helpers shared by the server functions and the
 * admin "Archive export" page. No I/O here so it can be unit tested.
 *
 * Two jobs:
 *   1. The fixed allow-list of public tables the archive covers.
 *   2. Deidentification: stable per-export pseudonyms for people, direct
 *      identifiers nulled, date of birth collapsed to an age band.
 *
 * Free-text columns (notes, open survey responses, jsonb blobs) are NOT
 * scrubbed — the README sheet says so loudly.
 */

// ── tables ──────────────────────────────────────────────────────────────

/** Every table in the public schema as of the Oct 2026 snapshot (ordered as exported). */
export const ARCHIVE_TABLES = [
  "admins",
  "aptitude_results",
  "assessment_assignments",
  "assessment_item_photos",
  "assessment_responses",
  "assessment_sessions",
  "assessment_targets",
  "camp_educators",
  "camp_student_logins",
  "camps",
  "career_clusters",
  "class_students",
  "classes",
  "curriculum_tags",
  "educator_invites",
  "educators",
  "explr_camp_curriculum_links",
  "explr_camp_educators",
  "explr_camps",
  "explr_registrations",
  "form_completions",
  "internship_applications",
  "internship_career_tags",
  "internship_educators",
  "internship_evaluations",
  "internship_interest_completions",
  "internship_interest_responses",
  "internship_occupations",
  "internship_placements",
  "internship_rosters",
  "internship_student_logins",
  "internship_survey_results",
  "internship_tags",
  "internship_visibility",
  "internships",
  "module_progress",
  "occupation_programs",
  "occupations",
  "opportunities",
  "opportunity_form_fields",
  "opportunity_forms",
  "opportunity_registrations",
  "organizations",
  "program_educators",
  "programs",
  "responses",
  "student_camp_links",
  "student_presence",
  "students",
  "survey_assignments",
  "survey_item_responses",
  "survey_open_responses",
  "survey_responses",
  "unit_rosters",
] as const;

/** Newer tables that may not exist in every environment yet — skipped silently when missing. */
export const OPTIONAL_ARCHIVE_TABLES = [
  "experiences",
  "experience_ratings",
  "credentials",
  "portfolio_pieces",
  "checkpoints",
  "checkpoint_tasks",
  "career_goals",
  "checklist_items",
  "plan_approvals",
  "attestation_requests",
  "explore_logins",
  "family_links",
  "family_sessions",
  "internship_profiles",
  "internship_selections",
  "application_seasons",
  "hs_general_applications",
  "hs_demographics",
  "opp_application_versions",
  "hs_partner_applications",
  "application_status_events",
] as const;

export const ALL_ARCHIVE_TABLES = [...ARCHIVE_TABLES, ...OPTIONAL_ARCHIVE_TABLES] as const;
export type ArchiveTable = (typeof ALL_ARCHIVE_TABLES)[number];

/** JSON-serializable cell value — what PostgREST returns and what server functions may carry. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
export type ArchiveRow = Record<string, JsonValue>;

// ── column rules ────────────────────────────────────────────────────────

/** Columns holding a student's uuid → `S-0001`… */
export const STUDENT_ID_COLUMNS = ["student_id"] as const;

/** Columns holding an educator / admin / organization uuid → `A-0001`… */
export const ADULT_ID_COLUMNS = [
  "educator_id",
  "evaluator_id",
  "assigned_by",
  "approved_by",
  "created_by",
  "invited_by",
  "accepted_by",
  "generated_by",
  "imported_by",
  "tagged_by",
  "linked_by",
  "updated_by",
  "org_id",
] as const;

/** Tables whose own primary key is a person (or org) id. */
export const PERSON_ID_TABLES: Record<string, "student" | "adult"> = {
  students: "student",
  educators: "adult",
  admins: "adult",
  organizations: "adult",
};

/** Direct identifiers — nulled wherever they appear. */
export const DROP_COLUMNS = [
  "first_name",
  "last_name",
  "full_name",
  "child_name",
  "student_name",
  "parent_name",
  "parent_email",
  "parent_phone",
  "email",
  "contact_name",
  "contact_email",
  "username",
  "password_plain",
  "signed_name",
  "supervisor_name",
  "supervisor_email",
  "rater_name",
  "rater_email",
  "guardian_name",
  "guardian_email",
  "token",
  "login_code",
  "secret_hash",
  "code_hash",
  "token_hash",
  "lead",
  "phone",
  // HS internship application: the core answers hold names, emails and
  // phone numbers, and delivery logs hold addresses. Dropped whole.
  "core",
  "delivery",
  "question_notes",
] as const;

/** Date-of-birth columns → `"age 13"` on the export date. */
export const DOB_COLUMNS = ["date_of_birth", "dob"] as const;

/** Free-text / jsonb columns kept as-is that may still contain names. */
export const UNSCRUBBED_FREE_TEXT = [
  "notes",
  "staff_notes",
  "review_notes",
  "response",
  "responses",
  "demographics",
  "reflection",
  "duties",
  "answers",
  "data",
] as const;

const dropSet = new Set<string>(DROP_COLUMNS);
const studentSet = new Set<string>(STUDENT_ID_COLUMNS);
const adultSet = new Set<string>(ADULT_ID_COLUMNS);
const dobSet = new Set<string>(DOB_COLUMNS);

export const isDroppedColumn = (col: string): boolean => dropSet.has(col) || col.endsWith("_phone");

export function personKind(table: string, col: string): "student" | "adult" | null {
  if (studentSet.has(col)) return "student";
  if (adultSet.has(col)) return "adult";
  if (col === "id") return PERSON_ID_TABLES[table] ?? null;
  return null;
}

// ── pseudonyms ──────────────────────────────────────────────────────────

/**
 * One instance per export. The same uuid always maps to the same token, no
 * matter which table or column it shows up in, so joins still work in the
 * deidentified workbook.
 */
export class Pseudonymizer {
  private readonly students = new Map<string, string>();
  private readonly adults = new Map<string, string>();

  student(id: string): string {
    return this.lookup(this.students, "S", id);
  }

  adult(id: string): string {
    return this.lookup(this.adults, "A", id);
  }

  get counts(): { students: number; adults: number } {
    return { students: this.students.size, adults: this.adults.size };
  }

  private lookup(map: Map<string, string>, prefix: string, id: string): string {
    const hit = map.get(id);
    if (hit) return hit;
    const token = `${prefix}-${String(map.size + 1).padStart(4, "0")}`;
    map.set(id, token);
    return token;
  }
}

// ── age band ────────────────────────────────────────────────────────────

/** Whole years between a DOB and the export date; null when the DOB is unparseable. */
export function ageOn(dob: unknown, on: Date): number | null {
  if (dob == null || dob === "") return null;
  const d = dob instanceof Date ? dob : new Date(String(dob));
  if (Number.isNaN(d.getTime())) return null;
  let age = on.getUTCFullYear() - d.getUTCFullYear();
  const beforeBirthday =
    on.getUTCMonth() < d.getUTCMonth() ||
    (on.getUTCMonth() === d.getUTCMonth() && on.getUTCDate() < d.getUTCDate());
  if (beforeBirthday) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

export function ageBand(dob: unknown, on: Date): string | null {
  const age = ageOn(dob, on);
  return age == null ? null : `age ${age}`;
}

// ── row transforms ──────────────────────────────────────────────────────

export type DeidentifyResult = {
  rows: ArchiveRow[];
  /** Columns in this table that were nulled. */
  dropped: string[];
  /** Columns in this table that were replaced with S-/A- tokens. */
  pseudonymized: string[];
  /** Columns in this table replaced by an age band. */
  banded: string[];
  /** Free-text columns present in this table that were left untouched. */
  unscrubbed: string[];
};

export function deidentifyRow(
  table: string,
  row: ArchiveRow,
  pseudo: Pseudonymizer,
  exportDate: Date,
): ArchiveRow {
  const out: ArchiveRow = {};
  for (const [col, value] of Object.entries(row)) {
    if (isDroppedColumn(col)) {
      out[col] = null;
      continue;
    }
    const kind = personKind(table, col);
    if (kind) {
      out[col] =
        typeof value === "string" && value !== ""
          ? kind === "student"
            ? pseudo.student(value)
            : pseudo.adult(value)
          : value;
      continue;
    }
    if (dobSet.has(col)) {
      out[col] = value == null ? null : ageBand(value, exportDate);
      continue;
    }
    out[col] = value;
  }
  return out;
}

export function deidentifyTable(
  table: string,
  rows: ArchiveRow[],
  pseudo: Pseudonymizer,
  exportDate: Date,
): DeidentifyResult {
  const cols = columnsOf(rows);
  const unscrubbedSet = new Set<string>(UNSCRUBBED_FREE_TEXT);
  return {
    rows: rows.map((r) => deidentifyRow(table, r, pseudo, exportDate)),
    dropped: cols.filter(isDroppedColumn),
    pseudonymized: cols.filter((c) => personKind(table, c) !== null),
    banded: cols.filter((c) => dobSet.has(c)),
    unscrubbed: cols.filter((c) => unscrubbedSet.has(c)),
  };
}

/** Union of keys across rows, in first-seen order. */
export function columnsOf(rows: ArchiveRow[]): string[] {
  const seen = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) seen.add(k);
  return [...seen];
}

// ── cell serialization ──────────────────────────────────────────────────

/** jsonb objects/arrays become JSON strings so every Excel cell is a scalar. */
export function serializeCell(value: JsonValue): string | number | boolean | null {
  if (value == null) return value;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

export function serializeRow(row: ArchiveRow): ArchiveRow {
  const out: ArchiveRow = {};
  for (const [k, v] of Object.entries(row)) out[k] = serializeCell(v);
  return out;
}

// ── sheet helpers ───────────────────────────────────────────────────────

/** Excel sheet names: ≤31 chars, unique within a workbook. */
export function sheetName(table: string, used: Set<string>): string {
  let base = table.slice(0, 31);
  let name = base;
  let n = 2;
  while (used.has(name)) {
    const suffix = `~${n++}`;
    base = table.slice(0, 31 - suffix.length);
    name = base + suffix;
  }
  used.add(name);
  return name;
}

export function fileDateTag(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
