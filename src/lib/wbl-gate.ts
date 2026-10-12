import { EXPERIENCE_TYPE_BY_KEY, type Stage } from "@/lib/wbl-taxonomy";
import type { OppType } from "@/lib/opportunities";

/**
 * Work-based learning detail a partner supplies with an opportunity, and the
 * EXPLR gate (spec sections 4, 6, 7). Stored as `opportunities.wbl` (jsonb)
 * plus `stage`, `experience_type`, `target_competencies`, `gate_*`.
 */

export type WblDetail = {
  mentor: { name: string; title: string; email: string; phone: string; guidanceAck: boolean };
  work: { positionDescription: string; duties: string[]; noDisplacementAttestation: boolean };
  learning: { objectives: string[]; technicalSkills: string; professionalSkills: string };
  schedule: {
    totalHours: string;
    weeklyHours: string;
    modality: "in_person" | "remote" | "hybrid" | "";
  };
  compensation: {
    type: "paid" | "stipend" | "credit" | "unpaid" | "";
    hourlyRate: string;
    w2: boolean;
    primaryBeneficiaryAttestation: boolean;
    reimbursement: string[];
  };
  legal: {
    minAge: string;
    hoursWithinLimits: boolean;
    hazardous: string[];
    workersComp: boolean;
    liabilityInsurance: boolean;
    safetyTrainingPlan: string;
  };
  site: {
    dressCode: string;
    vaccinations: string;
    safetyEquipment: string;
    transportationNotes: string;
    accessibilityNotes: string;
    inclusiveRecruitment: boolean;
    other: string;
  };
  commitments: { evaluation: boolean; hoursConfirmation: boolean };
};

export const EMPTY_WBL: WblDetail = {
  mentor: { name: "", title: "", email: "", phone: "", guidanceAck: false },
  work: { positionDescription: "", duties: [], noDisplacementAttestation: false },
  learning: { objectives: [], technicalSkills: "", professionalSkills: "" },
  schedule: { totalHours: "", weeklyHours: "", modality: "" },
  compensation: {
    type: "",
    hourlyRate: "",
    w2: false,
    primaryBeneficiaryAttestation: false,
    reimbursement: [],
  },
  legal: {
    minAge: "",
    hoursWithinLimits: false,
    hazardous: [],
    workersComp: false,
    liabilityInsurance: false,
    safetyTrainingPlan: "",
  },
  site: {
    dressCode: "",
    vaccinations: "",
    safetyEquipment: "",
    transportationNotes: "",
    accessibilityNotes: "",
    inclusiveRecruitment: false,
    other: "",
  },
  commitments: { evaluation: false, hoursConfirmation: false },
};

/** Merge a stored (possibly partial) record over the empty shape. */
export function hydrateWbl(raw: unknown): WblDetail {
  const r = (raw ?? {}) as Partial<Record<keyof WblDetail, Record<string, unknown>>>;
  const out = structuredClone(EMPTY_WBL) as WblDetail;
  for (const k of Object.keys(EMPTY_WBL) as (keyof WblDetail)[]) {
    Object.assign(out[k] as object, r[k] ?? {});
  }
  return out;
}

export const MODALITIES = [
  { key: "in_person", label: "In person" },
  { key: "remote", label: "Remote" },
  { key: "hybrid", label: "Hybrid" },
] as const;

export const REIMBURSEMENTS = [
  {
    key: "hs_tech_internship",
    label: "Ohio High School Tech Internship (75% of wages, up to $5,000)",
  },
  { key: "techcred", label: "TechCred" },
] as const;

/** The federal Hazardous Occupations Orders (DOL Fact Sheet 43), abbreviated. */
export const HAZARDOUS_ORDERS = [
  "HO 1 · Manufacturing or storing explosives",
  "HO 2 · Driving a motor vehicle or outside helper",
  "HO 3 · Coal mining",
  "HO 4 · Logging and sawmilling",
  "HO 5 · Power-driven woodworking machines",
  "HO 6 · Exposure to radioactive substances",
  "HO 7 · Power-driven hoisting apparatus (forklifts, cranes)",
  "HO 8 · Power-driven metal forming, punching, shearing",
  "HO 9 · Mining other than coal",
  "HO 10 · Meat and poultry processing, power-driven slicers",
  "HO 11 · Power-driven bakery machines",
  "HO 12 · Balers, compactors, paper-products machines",
  "HO 13 · Manufacturing brick, tile, kindred products",
  "HO 14 · Power-driven circular saws, band saws, chain saws, guillotine shears",
  "HO 15 · Wrecking, demolition, shipbreaking",
  "HO 16 · Roofing and work on or about a roof",
  "HO 17 · Excavation operations",
];

/** Default stage/type for a listing type so partners start in the right place. */
export function defaultTaxonomy(type: OppType): { stage: Stage; experienceType: string } {
  switch (type) {
    case "internship":
      return { stage: "participation", experienceType: "internship_offsite_placement" };
    case "workshop":
      return { stage: "exploration", experienceType: "industry_design_challenge" };
    case "camp":
      return { stage: "exploration", experienceType: "camp_or_program" };
    default:
      return { stage: "exploration", experienceType: "career_mentoring" };
  }
}

export type WblIssue = { field: string; message: string };

/**
 * Submission checks (spec 7). Awareness/exploration listings need little;
 * preparation/participation listings must satisfy the mentor, work, pay, and
 * minor-labor rules before they can be submitted.
 */
export function validateWbl(
  w: WblDetail,
  stage: Stage,
  experienceType: string,
  gradeMin: number | null,
): WblIssue[] {
  const issues: WblIssue[] = [];
  const formal = EXPERIENCE_TYPE_BY_KEY[experienceType]?.ohioFormalWbl ?? false;
  const deep = stage === "preparation" || stage === "participation";
  if (!deep) {
    if (!w.site.transportationNotes.trim())
      issues.push({
        field: "site.transportationNotes",
        message: "Say how students get there (transportation is Ohio's top barrier).",
      });
    return issues;
  }
  if (!w.mentor.name.trim() || !w.mentor.email.trim())
    issues.push({
      field: "mentor",
      message: "Name the main mentor and give an email we can send the evaluation link to.",
    });
  if (!w.mentor.guidanceAck)
    issues.push({
      field: "mentor.guidanceAck",
      message: "Confirm the mentor will give regular feedback.",
    });
  if (w.work.positionDescription.trim().length < 60)
    issues.push({
      field: "work.positionDescription",
      message:
        "Write a position description of at least a few sentences: what the student will do or observe.",
    });
  if (w.work.duties.filter(Boolean).length < 2)
    issues.push({ field: "work.duties", message: "List at least two real duties of the field." });
  if (!w.work.noDisplacementAttestation)
    issues.push({
      field: "work.noDisplacementAttestation",
      message: "Confirm the student complements, not displaces, paid staff.",
    });
  if (w.learning.objectives.filter(Boolean).length < 1)
    issues.push({ field: "learning.objectives", message: "Add at least one learning objective." });
  if (!w.schedule.totalHours)
    issues.push({
      field: "schedule.totalHours",
      message: "Estimate total hours (this drives the 250-hour log).",
    });
  if (!w.schedule.modality)
    issues.push({ field: "schedule.modality", message: "Choose in person, remote, or hybrid." });
  if (!w.compensation.type)
    issues.push({ field: "compensation.type", message: "Say how the student is compensated." });
  if (w.compensation.type === "unpaid" && !w.compensation.primaryBeneficiaryAttestation) {
    issues.push({
      field: "compensation.primaryBeneficiaryAttestation",
      message: "Unpaid placements need the FLSA primary-beneficiary attestation.",
    });
  }
  if (w.compensation.type === "paid" && !w.compensation.hourlyRate)
    issues.push({ field: "compensation.hourlyRate", message: "Give the hourly rate." });
  const minAge = Number(w.legal.minAge || 0);
  if (experienceType === "youth_apprenticeship" && minAge < 16)
    issues.push({
      field: "legal.minAge",
      message: "Youth apprenticeships require age 16 or older.",
    });
  if (formal && (gradeMin ?? 9) < 11 && !w.legal.hoursWithinLimits)
    issues.push({
      field: "legal.hoursWithinLimits",
      message:
        "Confirm the schedule fits the hour limits for ages 14-15 (3 on a school day, 18 in a school week, 7am to 7pm).",
    });
  if (minAge && minAge < 16 && w.legal.hazardous.length > 0)
    issues.push({
      field: "legal.hazardous",
      message:
        "Ages 14-15 may not work in manufacturing, power-driven machinery, construction, or warehousing. Raise the minimum age or remove the hazardous work.",
    });
  if (!w.legal.workersComp || !w.legal.liabilityInsurance)
    issues.push({
      field: "legal.insurance",
      message:
        "Placements with minors need workers' compensation and liability coverage confirmed.",
    });
  if (!w.site.transportationNotes.trim())
    issues.push({
      field: "site.transportationNotes",
      message: "Say how students get there (transportation is Ohio's top barrier).",
    });
  if (!w.commitments.evaluation || !w.commitments.hoursConfirmation)
    issues.push({
      field: "commitments",
      message: "Commit to the one-link evaluation and hours confirmation.",
    });
  return issues;
}

export type GateEvidence = {
  socCode: string;
  demandCitation: string;
  entryWage: string;
  wageSource: string;
  progressionExample: string;
  realWorkReviewed: boolean;
  note: string;
};

export const EMPTY_GATE: GateEvidence = {
  socCode: "",
  demandCitation: "",
  entryWage: "",
  wageSource: "",
  progressionExample: "",
  realWorkReviewed: false,
  note: "",
};

/** The three EXPLR gate questions (spec 4). All three must pass. */
export function gatePasses(g: GateEvidence): { pass: boolean; why: string[] } {
  const why: string[] = [];
  if (!g.socCode.trim() || !g.demandCitation.trim())
    why.push(
      "High-growth, high-demand: needs a SOC code or cluster on Ohio's Top Jobs list or a regional demand analysis.",
    );
  if (!g.entryWage.trim() || !g.wageSource.trim() || !g.progressionExample.trim())
    why.push(
      "Path to social mobility: needs a family-sustaining entry wage with a source and a visible advancement ladder.",
    );
  if (!g.realWorkReviewed)
    why.push(
      "Real work of the field: the position description must be reviewed as the occupation's actual tasks.",
    );
  return { pass: why.length === 0, why };
}
