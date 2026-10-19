import type { RIASECCode } from "@/lib/riasec";
import {
  ACTIVITY_ITEMS,
  ASSESSMENT_ITEM_FIELDS,
  CAREER_FIELD_LABEL,
  ENVIRONMENT_DIMS,
  EXPERIENCE_ITEMS,
  FORCED_PAIRS,
} from "./content";
import { HS_MATCH_CONFIG as CFG } from "./match-config";
import type { CoreAnswers, SurveyExtras } from "./types";
import { ageOn } from "./validate";

/**
 * Matching for the high school application (pure, unit-tested).
 * Age is the ONLY hard filter. Everything else adds to or lowers the score.
 */

const DIMS: RIASECCode[] = ["R", "I", "A", "S", "E", "C"];
type Vec = Record<RIASECCode, number>;
const zero = (): Vec => ({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 });

export type Applicant = {
  core: Pick<CoreAnswers, "dob" | "gradeFall" | "allWeeks" | "transport">;
  extras: SurveyExtras;
  /** Mean 1-5 per scale from the RIASEC assessment, if taken. */
  scaleScores: Partial<Record<RIASECCode, number>> | null;
  hollandCode: string | null;
  /** item_id → 1-5 from the assessment, for activity overlap. */
  itemResponses: Record<string, number>;
  /** Requirement keys this student answered "I'd need help" on for this listing, minus any staff cleared. */
  openNeedHelp: string[];
};

export type Listing = {
  ref: string;
  name: string;
  riasec: Partial<Vec>;
  careerFields: string[];
  environment: Partial<Record<string, number>>;
  ageMin: number | null;
  ageMax: number | null;
  startDate: string | null;
  gradeMin: number | null;
  gradeMax: number | null;
};

export type HsMatch = {
  ref: string;
  eligible: boolean;
  /** Student-facing reason when not eligible, e.g. "Opens at 16". */
  blockedLabel: string | null;
  score: number;
  parts: Partial<Record<keyof typeof CFG.weights, number>>;
  adjustments: Array<{ label: string; amount: number }>;
  why: string;
};

export function cosine(a: Vec, b: Vec): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (const d of DIMS) {
    dot += a[d] * b[d];
    na += a[d] * a[d];
    nb += b[d] * b[d];
  }
  if (!na || !nb) return 0;
  return Math.max(0, Math.min(1, dot / Math.sqrt(na * nb)));
}

/** Student RIASEC vector: assessment scores (or code), nudged by forced-choice picks. */
export function applicantVector(a: Applicant): Vec | null {
  const v = zero();
  let any = false;
  if (a.scaleScores && Object.keys(a.scaleScores).length) {
    for (const d of DIMS) v[d] = a.scaleScores[d] ?? 0;
    any = true;
  } else if (a.hollandCode) {
    a.hollandCode.split("").forEach((ch, i) => {
      if (DIMS.includes(ch as RIASECCode)) v[ch as RIASECCode] = [5, 4, 3][i] ?? 0;
    });
    any = true;
  }
  for (const p of FORCED_PAIRS) {
    const pick = a.extras.pairs[p.id];
    if (!pick) continue;
    v[p[pick].code] += CFG.forcedPairNudge;
    any = true;
  }
  return any ? v : null;
}

/** Listing RIASEC from letter weights or a code string. */
export function listingVector(riasec: Partial<Vec>): Vec | null {
  const v = zero();
  let any = false;
  for (const d of DIMS) {
    v[d] = riasec[d] ?? 0;
    if (v[d]) any = true;
  }
  return any ? v : null;
}

/** Per-field counts of activities the student liked (assessment + extra items). */
export function likedFieldCounts(a: Applicant): Record<string, number> {
  const out: Record<string, number> = {};
  const add = (fields: readonly string[]) => {
    for (const f of fields) out[f] = (out[f] ?? 0) + 1;
  };
  for (const [id, val] of Object.entries(a.itemResponses))
    if (val >= CFG.likedAssessmentValue) add(ASSESSMENT_ITEM_FIELDS[id] ?? []);
  for (const item of ACTIVITY_ITEMS)
    if ((a.extras.activities[item.id] ?? 0) >= CFG.likedActivityValue) add(item.fields);
  return out;
}

export function matchListing(a: Applicant, l: Listing, now: Date = new Date()): HsMatch {
  // ── Hard filter: age only ───────────────────────────────────────────
  let blockedLabel: string | null = null;
  const start = l.startDate ? new Date(`${l.startDate.slice(0, 10)}T12:00:00`) : now;
  const age = a.core.dob ? ageOn(a.core.dob, start) : null;
  if (age !== null) {
    if (l.ageMin !== null && age < l.ageMin) blockedLabel = `Opens at ${l.ageMin}`;
    else if (l.ageMax !== null && age > l.ageMax) blockedLabel = `For ages ${l.ageMax} and under`;
  }

  // ── Weighted components ─────────────────────────────────────────────
  const parts: HsMatch["parts"] = {};
  const sv = applicantVector(a);
  const lv = listingVector(l.riasec);
  if (sv && lv) parts.riasec = cosine(sv, lv);

  const lf = new Set(l.careerFields);
  if (lf.size && a.extras.fields.length) {
    const hits = a.extras.fields.filter((f) => lf.has(f)).length;
    parts.careerField = Math.min(1, hits / Math.min(lf.size, a.extras.fields.length));
  }

  const liked = likedFieldCounts(a);
  const total = Object.values(liked).reduce((s, n) => s + n, 0);
  if (lf.size && total > 0) {
    const hits = [...lf].reduce((s, f) => s + (liked[f] ?? 0), 0);
    parts.activity = Math.min(1, (2 * hits) / total);
  }

  const envDiffs: number[] = [];
  for (const d of ENVIRONMENT_DIMS) {
    const s = a.extras.environment[d.key];
    const t = l.environment[d.key];
    if (s && t) envDiffs.push(Math.abs(s - t) / 4);
  }
  if (envDiffs.length)
    parts.environment = 1 - envDiffs.reduce((x, y) => x + y, 0) / envDiffs.length;

  let wsum = 0,
    acc = 0;
  for (const k of Object.keys(CFG.weights) as Array<keyof typeof CFG.weights>) {
    const v = parts[k];
    if (v === undefined) continue;
    wsum += CFG.weights[k];
    acc += CFG.weights[k] * v;
  }
  let score = wsum ? acc / wsum : 0;

  // ── Adjustments ─────────────────────────────────────────────────────
  const adjustments: HsMatch["adjustments"] = [];
  let exp = 0;
  for (const item of EXPERIENCE_ITEMS) {
    const ans = a.extras.experience[item.key];
    if (!ans) continue;
    if (item.key === "job" && ans === "did_more") exp += CFG.experience.anyJobBonus;
    if (item.fields.some((f) => lf.has(f))) exp += CFG.experience[ans];
  }
  exp = Math.max(-CFG.experience.cap, Math.min(CFG.experience.cap, exp));
  if (exp) adjustments.push({ label: "Experience in this field", amount: exp });

  const help = Math.min(
    CFG.reductions.needHelpCap,
    a.openNeedHelp.length * CFG.reductions.needHelpEach,
  );
  if (help)
    adjustments.push({
      label: `Needs help with ${a.openNeedHelp.length} requirement(s)`,
      amount: -help,
    });
  if (a.core.allWeeks === false)
    adjustments.push({ label: "Can't work every week", amount: -CFG.reductions.notAllWeeks });
  if (a.core.transport.length > 0 && a.core.transport.every((t) => t === "not_sure"))
    adjustments.push({
      label: "Not sure how they'd get there",
      amount: -CFG.reductions.transportUnsure,
    });
  const grade = Number(a.core.gradeFall);
  if (Number.isFinite(grade) && grade > 0) {
    if ((l.gradeMin !== null && grade < l.gradeMin) || (l.gradeMax !== null && grade > l.gradeMax))
      adjustments.push({
        label: "Grade outside the listing's range",
        amount: -CFG.reductions.gradeOutside,
      });
  }
  for (const adj of adjustments) score += adj.amount;
  score = Math.max(0, Math.min(1, score));

  // ── Student-facing why ──────────────────────────────────────────────
  const why: string[] = [];
  const tapped = a.extras.fields.filter((f) => lf.has(f));
  if (tapped.length) why.push(`You picked ${CAREER_FIELD_LABEL[tapped[0]] ?? tapped[0]}`);
  if ((parts.riasec ?? 0) >= 0.8) why.push("the work fits your interests");
  if ((parts.activity ?? 0) >= 0.5) why.push("you like activities this job uses");
  if ((parts.environment ?? 0) >= 0.75) why.push("it fits how you like to work");
  const whyText = why.length
    ? `${why[0]}${why.length > 1 ? `, and ${why.slice(1).join(", ")}` : ""}.`
    : "It could be a good way to try something new.";

  return {
    ref: l.ref,
    eligible: blockedLabel === null,
    blockedLabel,
    score: Math.round(score * 1000) / 1000,
    parts,
    adjustments,
    why: whyText.charAt(0).toUpperCase() + whyText.slice(1),
  };
}

/** Rank every listing for one applicant: eligible first, best score first. */
export function rankListings(a: Applicant, listings: Listing[], now?: Date): HsMatch[] {
  return listings
    .map((l) => matchListing(a, l, now))
    .sort((x, y) => Number(y.eligible) - Number(x.eligible) || y.score - x.score);
}
