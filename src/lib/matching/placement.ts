import type { RIASECCode } from "@/lib/riasec";
import { hydrateWbl, type WblDetail } from "@/lib/wbl-gate";

/**
 * Internship placement matching (pure, unit-tested).
 *
 * Two layers, in this order:
 *   1. Hard checks. A listing's special requirements must be met or the
 *      candidate is out, whatever the score: grade band, age at start,
 *      hazardous work for under-16s, every acknowledgment accepted,
 *      transportation, and day-of-week availability.
 *   2. Weighted score, 0..1, over whatever components are available for the
 *      pair (weights renormalize when a component is missing, so a student
 *      without a profile still gets a RIASEC-based score).
 */

export const MATCH_WEIGHTS = {
  /** Cosine similarity between the student's RIASEC profile and the listing's. */
  riasec: 0.3,
  /** Student's rank for this listing: #1 = 1.0, #2 = 0.5, #3 = 0.33 … */
  interestRank: 0.15,
  /** Career aspiration / major / cluster overlap with the listing's field. */
  aspiration: 0.15,
  /** Relevant coursework the student flagged for this field. */
  coursework: 0.15,
  /** Verified experience: hours, proficient skills, same cluster. */
  experience: 0.15,
  /** Day-of-week availability coverage of the listing's schedule. */
  availability: 0.1,
} as const;

export type MatchComponent = keyof typeof MATCH_WEIGHTS;

export type CandidateProfile = {
  career_aspiration: string | null;
  intended_major: string | null;
  likes: string | null;
  coursework: Array<{ subject?: string; course?: string; relevance?: string }>;
  availability: { days?: string[]; summer?: boolean; school_year?: boolean };
  transportation: "own" | "family" | "transit" | "bike_walk" | "needs_help" | null;
};

export type Candidate = {
  studentId: string;
  firstName: string;
  grade: number | null;
  dateOfBirth: string | null;
  hollandCode: string | null;
  /** 0..100 per dimension when the full assessment is available. */
  scaleScores: Partial<Record<RIASECCode, number>> | null;
  profile: CandidateProfile | null;
  passport: {
    verifiedHours: number;
    skillsProficient: number;
    clusters: string[];
    exposureCount: number;
  } | null;
  /** The student's selection of this listing. */
  rank: number | null;
  acknowledgments: string[];
};

export type Target = {
  ref: string;
  name: string;
  description: string;
  /** Listing RIASEC: a weight map (partner listing) or ordered codes (catalog). */
  riasecWeights: Partial<Record<RIASECCode, number>> | null;
  riasecCodes: RIASECCode[];
  gradeMin: number | null;
  gradeMax: number | null;
  startDate: string | null;
  scheduleDays: string[];
  requirements: string[];
  careerCluster: string | null;
  wbl: WblDetail;
  targetCompetencies: string[];
};

export type MatchOutcome = {
  ref: string;
  studentId: string;
  eligible: boolean;
  hardFails: string[];
  score: number;
  breakdown: Partial<Record<MatchComponent, number>>;
  why: string;
};

const DIMS: RIASECCode[] = ["R", "I", "A", "S", "E", "C"];
const STOP = new Set(
  "a an the and or of to in for with on at by from is are be as this that it its our your you we they their into about over under will can".split(
    " ",
  ),
);

export function tokens(s: string | null | undefined): Set<string> {
  return new Set(
    (s ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n / Math.min(a.size, b.size);
}

function studentVector(c: Candidate): Record<RIASECCode, number> | null {
  const v: Record<RIASECCode, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  if (c.scaleScores && Object.keys(c.scaleScores).length) {
    for (const d of DIMS) v[d] = c.scaleScores[d] ?? 0;
    return v;
  }
  if (c.hollandCode) {
    c.hollandCode.split("").forEach((ch, i) => {
      if (DIMS.includes(ch as RIASECCode)) v[ch as RIASECCode] = [1, 0.6, 0.3][i] ?? 0;
    });
    return v;
  }
  return null;
}

function targetVector(t: Target): Record<RIASECCode, number> | null {
  const v: Record<RIASECCode, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  let any = false;
  if (t.riasecWeights) {
    for (const d of DIMS) {
      v[d] = t.riasecWeights[d] ?? 0;
      if (v[d]) any = true;
    }
  }
  if (!any) {
    t.riasecCodes.forEach((c, i) => {
      v[c] = [1, 0.6, 0.3][i] ?? 0;
      any = true;
    });
  }
  return any ? v : null;
}

export function cosine(a: Record<RIASECCode, number>, b: Record<RIASECCode, number>): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (const d of DIMS) {
    dot += a[d] * b[d];
    na += a[d] * a[d];
    nb += b[d] * b[d];
  }
  if (!na || !nb) return 0;
  return Math.max(0, Math.min(1, dot / (Math.sqrt(na) * Math.sqrt(nb))));
}

/** Age in whole years on a date. */
export function ageOn(dob: string, on: Date): number {
  // Parse YYYY-MM-DD as a local calendar date; `new Date("2013-06-02")` is UTC
  // midnight, which lands on June 1 in U.S. time zones and shifts birthdays.
  const [yy, mm, dd] = dob.slice(0, 10).split("-").map(Number);
  const b =
    Number.isFinite(yy) && Number.isFinite(mm) && Number.isFinite(dd)
      ? new Date(yy, mm - 1, dd)
      : new Date(dob);
  let age = on.getFullYear() - b.getFullYear();
  const m = on.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < b.getDate())) age--;
  return age;
}

/** Turns 14 by June 1 of the given year (Ohio's internship floor for 8th graders). */
export function turns14ByJune1(dob: string, year: number): boolean {
  return ageOn(dob, new Date(year, 5, 1)) >= 14;
}

/** The statements a student must accept before requesting a specific listing. */
export function acknowledgmentsFor(t: Target): string[] {
  const out: string[] = [...t.requirements];
  const w = t.wbl;
  if (w.legal.minAge) out.push(`I will be at least ${w.legal.minAge} when this starts`);
  if (w.site.vaccinations) out.push(`Health requirements: ${w.site.vaccinations}`);
  if (w.site.dressCode) out.push(`Dress code: ${w.site.dressCode}`);
  if (w.site.safetyEquipment) out.push(`Safety equipment: ${w.site.safetyEquipment}`);
  if (w.schedule.modality === "in_person" && w.site.transportationNotes)
    out.push(`Getting there: ${w.site.transportationNotes}`);
  if (w.schedule.totalHours) out.push(`I can commit about ${w.schedule.totalHours} hours in total`);
  return [...new Set(out)];
}

export function hardChecks(c: Candidate, t: Target): string[] {
  const fails: string[] = [];
  const start = t.startDate ? new Date(t.startDate) : new Date();
  const year = start.getFullYear();
  if (c.grade !== null) {
    if (t.gradeMin !== null && c.grade < t.gradeMin) {
      // 8th graders may apply to internships if they turn 14 by June 1.
      const eighthOk =
        c.grade === 8 && t.gradeMin <= 9 && !!c.dateOfBirth && turns14ByJune1(c.dateOfBirth, year);
      if (!eighthOk)
        fails.push(`Grade ${c.grade} is below the listing's grade ${t.gradeMin} minimum`);
    }
    if (t.gradeMax !== null && c.grade > t.gradeMax)
      fails.push(`Grade ${c.grade} is above the listing's grade ${t.gradeMax} maximum`);
  }
  const minAge = Number(t.wbl.legal.minAge || 0);
  if (minAge) {
    if (!c.dateOfBirth)
      fails.push(`Listing requires age ${minAge}+; student's date of birth is missing`);
    else if (ageOn(c.dateOfBirth, start) < minAge)
      fails.push(
        `Student will be ${ageOn(c.dateOfBirth, start)} at start; listing requires ${minAge}+`,
      );
  }
  if (c.dateOfBirth && ageOn(c.dateOfBirth, start) < 16 && t.wbl.legal.hazardous.length > 0) {
    fails.push("Under 16 and the listing involves a Hazardous Occupations Order");
  }
  const required = acknowledgmentsFor(t);
  const missing = required.filter((a) => !c.acknowledgments.includes(a));
  if (missing.length)
    fails.push(`${missing.length} requirement${missing.length === 1 ? "" : "s"} not acknowledged`);
  if (c.profile?.transportation === "needs_help") {
    const provides =
      /transportation provided/i.test(t.requirements.join(" ")) ||
      /provided|shuttle|bus pass|pickup/i.test(t.wbl.site.transportationNotes);
    const remote = t.wbl.schedule.modality === "remote";
    if (!provides && !remote)
      fails.push("Student needs transportation help and the listing doesn't provide it");
  }
  const days = c.profile?.availability?.days ?? [];
  if (days.length && t.scheduleDays.length && !t.scheduleDays.some((d) => days.includes(d))) {
    fails.push(
      `No overlap between listing days (${t.scheduleDays.join(", ")}) and student availability`,
    );
  }
  return fails;
}

export function score(
  c: Candidate,
  t: Target,
): { score: number; breakdown: Partial<Record<MatchComponent, number>>; why: string } {
  const parts: Partial<Record<MatchComponent, number>> = {};
  const sv = studentVector(c);
  const tv = targetVector(t);
  if (sv && tv) parts.riasec = cosine(sv, tv);
  if (c.rank !== null && c.rank > 0) parts.interestRank = 1 / c.rank;

  const field = tokens(
    `${t.name} ${t.description} ${t.careerCluster ?? ""} ${t.wbl.work.positionDescription} ${t.wbl.learning.technicalSkills} ${t.targetCompetencies.join(" ")}`,
  );
  if (c.profile) {
    const asp = tokens(
      `${c.profile.career_aspiration ?? ""} ${c.profile.intended_major ?? ""} ${c.profile.likes ?? ""}`,
    );
    if (asp.size) parts.aspiration = overlap(asp, field);
    const relevant = c.profile.coursework.filter(
      (cw) =>
        overlap(tokens(`${cw.subject ?? ""} ${cw.course ?? ""} ${cw.relevance ?? ""}`), field) >
        0.15,
    );
    parts.coursework = c.profile.coursework.length ? Math.min(1, relevant.length / 3) : undefined;
    const days = c.profile.availability?.days ?? [];
    if (days.length && t.scheduleDays.length)
      parts.availability =
        t.scheduleDays.filter((d) => days.includes(d)).length / t.scheduleDays.length;
  }
  if (c.passport) {
    const hours = Math.min(1, c.passport.verifiedHours / 100);
    const skills = Math.min(1, c.passport.skillsProficient / 8);
    const cluster = t.careerCluster && c.passport.clusters.includes(t.careerCluster) ? 1 : 0;
    const exposure = Math.min(1, c.passport.exposureCount / 5);
    parts.experience = 0.4 * hours + 0.3 * skills + 0.2 * cluster + 0.1 * exposure;
  }

  let wsum = 0,
    acc = 0;
  for (const k of Object.keys(MATCH_WEIGHTS) as MatchComponent[]) {
    const v = parts[k];
    if (v === undefined) continue;
    wsum += MATCH_WEIGHTS[k];
    acc += MATCH_WEIGHTS[k] * v;
  }
  const s = wsum ? acc / wsum : 0;
  const whyParts: string[] = [];
  if ((parts.riasec ?? 0) >= 0.7) whyParts.push("strong interest fit");
  if (c.rank === 1) whyParts.push("their #1 choice");
  if ((parts.coursework ?? 0) >= 0.66) whyParts.push("relevant coursework");
  if ((parts.experience ?? 0) >= 0.5) whyParts.push("verified experience");
  if ((parts.aspiration ?? 0) >= 0.3) whyParts.push("matches their stated goal");
  return {
    score: Math.round(s * 1000) / 1000,
    breakdown: parts,
    why: whyParts.join(" · ") || "partial fit",
  };
}

export function match(c: Candidate, t: Target): MatchOutcome {
  const hardFails = hardChecks(c, t);
  const s = score(c, t);
  return { ref: t.ref, studentId: c.studentId, eligible: hardFails.length === 0, hardFails, ...s };
}

/** Rank candidates for one listing: eligible first by score, then ineligible by score. */
export function rankFor(t: Target, candidates: Candidate[]): MatchOutcome[] {
  return candidates
    .map((c) => match(c, t))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
}

/** Build a Target from a partner listing row (opportunities). */
export function targetFromOpportunity(o: {
  id: string;
  name: string | null;
  description: string | null;
  riasec_weights: Partial<Record<RIASECCode, number>> | null;
  riasec_code: string | null;
  grade_min: number | null;
  grade_max: number | null;
  start_date: string | null;
  schedule_json: { days?: string[] } | null;
  requirements: string[] | null;
  wbl?: unknown;
  target_competencies?: string[] | null;
  custom?: Record<string, unknown> | null;
}): Target {
  return {
    ref: `opp:${o.id}`,
    name: o.name ?? "Internship",
    description: o.description ?? "",
    riasecWeights: o.riasec_weights,
    riasecCodes: (o.riasec_code ?? "")
      .split("")
      .filter((c): c is RIASECCode => DIMS.includes(c as RIASECCode)),
    gradeMin: o.grade_min,
    gradeMax: o.grade_max,
    startDate: o.start_date,
    scheduleDays: o.schedule_json?.days ?? [],
    requirements: o.requirements ?? [],
    careerCluster:
      typeof o.custom?.career_cluster === "string" ? (o.custom.career_cluster as string) : null,
    wbl: hydrateWbl(o.wbl),
    targetCompetencies: o.target_competencies ?? [],
  };
}
