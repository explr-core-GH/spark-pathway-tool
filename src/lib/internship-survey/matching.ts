// Internship Interest Survey — matching (pure, unit-testable).
//
// Scores each internship against a student's SurveyResult and ranks the top
// matches. The component weights and all tags come from config.ts.
//
// RIASEC-only by default: an internship's optional sector / activities /
// environment / experienceLevel tags are absent today, so the matcher
// renormalizes the component weights over whatever IS present (currently just
// riasecSim). The moment those tags are filled into the catalog, their
// components light up automatically — no change here.

import { RIASEC, type RIASECCode } from "@/lib/riasec";
import { INTERNSHIPS, type Internship } from "@/lib/internships-catalog";
import {
  COMPONENT_WEIGHTS,
  EXPERIENCE_ACTIVITY_TAGS,
  EXP_MOD_CLAMP,
  INTENSITY_PENALTY,
  INTERNSHIP_RIASEC_WEIGHT,
  LEVEL_RANK,
  RIASEC_DIMS,
  SECTOR_MATCH_VALUE,
} from "./config";
import type { MatchComponents, MatchResult, RiasecVector, SurveyResult } from "./types";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Internship RIASEC code-array -> numeric vector (primary 1.0, secondary 0.6, tertiary 0.3). */
export function internshipRiasecVector(i: Internship): RiasecVector {
  const v: RiasecVector = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  i.riasec.forEach((code, idx) => {
    v[code] = INTERNSHIP_RIASEC_WEIGHT[idx] ?? 0;
  });
  return v;
}

/** Cosine similarity of two RIASEC vectors, 0..1 (0 if either is the zero vector). */
export function cosine(a: RiasecVector, b: RiasecVector): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const d of RIASEC_DIMS) {
    dot += a[d] * b[d];
    na += a[d] * a[d];
    nb += b[d] * b[d];
  }
  if (na === 0 || nb === 0) return 0;
  return clamp01(dot / (Math.sqrt(na) * Math.sqrt(nb)));
}

/**
 * Score one internship for one student. Returns the 0..1 score and the raw
 * component breakdown (used to build the "why this fits" line).
 */
export function scoreInternship(
  student: SurveyResult,
  i: Internship,
): { score: number; components: MatchComponents } {
  const components: MatchComponents = { expMod: 0 };
  const parts: Array<{ value: number; weight: number }> = [];

  // riasecSim — always available.
  const sim = cosine(student.riasecNorm, internshipRiasecVector(i));
  components.riasecSim = sim;
  parts.push({ value: sim, weight: COMPONENT_WEIGHTS.riasecSim });

  // sectorMatch — only if the internship declares a sector.
  if (i.sector) {
    const tap = student.sectorValues[i.sector] ?? 0;
    const v =
      tap === 2 ? SECTOR_MATCH_VALUE.yes : tap === 1 ? SECTOR_MATCH_VALUE.maybe : SECTOR_MATCH_VALUE.none;
    components.sectorMatch = v;
    parts.push({ value: v, weight: COMPONENT_WEIGHTS.sectorMatch });
  }

  // activityOverlap — only if the internship lists activities.
  if (i.activities && i.activities.length > 0) {
    const studentTags = new Set(student.activityTags);
    const overlap = i.activities.filter((t) => studentTags.has(t)).length / i.activities.length;
    components.activityOverlap = overlap;
    parts.push({ value: overlap, weight: COMPONENT_WEIGHTS.activityOverlap });
  }

  // envFit — only if the internship has environment targets.
  if (i.environment) {
    const flags = Object.keys(i.environment);
    if (flags.length > 0) {
      let dist = 0;
      for (const f of flags) {
        const target = (i.environment as Record<string, number>)[f];
        dist += Math.abs((student.envVector[f] ?? 50) - target) / 100;
      }
      const envFit = 1 - dist / flags.length;
      components.envFit = envFit;
      parts.push({ value: envFit, weight: COMPONENT_WEIGHTS.envFit });
    }
  }

  // Weighted base, renormalized over the components actually present.
  const totalW = parts.reduce((s, p) => s + p.weight, 0) || 1;
  const base = parts.reduce((s, p) => s + p.value * p.weight, 0) / totalW;

  // expMod — additive, only over experience topics whose tags this internship uses.
  let expMod = 0;
  if (i.activities && i.activities.length > 0) {
    for (const [topic, tags] of Object.entries(EXPERIENCE_ACTIVITY_TAGS)) {
      if (tags.some((t) => i.activities!.includes(t))) {
        expMod += student.topicModifiers[topic] ?? 0;
      }
    }
  }
  expMod = Math.max(-EXP_MOD_CLAMP, Math.min(EXP_MOD_CLAMP, expMod));
  components.expMod = expMod;

  let score = base + expMod;

  // Soft intensity adjustment — never a hard exclude.
  if (i.experienceLevel && LEVEL_RANK[student.intensityBand] < LEVEL_RANK[i.experienceLevel]) {
    score *= INTENSITY_PENALTY;
  }

  return { score: clamp01(score), components };
}

/** Rank internships by match score, returning the top N with a why-fit line each. */
export function rankMatches(
  student: SurveyResult,
  internships: Internship[] = INTERNSHIPS,
  top = 5,
): MatchResult[] {
  const scored: MatchResult[] = internships.map((i) => {
    const { score, components } = scoreInternship(student, i);
    return {
      slug: i.slug,
      name: i.name,
      emoji: i.emoji,
      theme: i.theme,
      score,
      components,
      whyFit: buildWhyFit(student, i, components),
    };
  });
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, top);
}

const dimName = (code: RIASECCode) => RIASEC[code].name;

/**
 * Templated "why this fits" line from the two highest-contributing components.
 * No LLM required. Always returns a non-empty, encouraging sentence.
 */
export function buildWhyFit(student: SurveyResult, i: Internship, c: MatchComponents): string {
  const contribs: Array<{ key: string; weighted: number }> = [];
  if (c.riasecSim !== undefined) contribs.push({ key: "riasec", weighted: c.riasecSim * COMPONENT_WEIGHTS.riasecSim });
  if (c.sectorMatch !== undefined) contribs.push({ key: "sector", weighted: c.sectorMatch * COMPONENT_WEIGHTS.sectorMatch });
  if (c.activityOverlap !== undefined) contribs.push({ key: "activity", weighted: c.activityOverlap * COMPONENT_WEIGHTS.activityOverlap });
  if (c.envFit !== undefined) contribs.push({ key: "env", weighted: c.envFit * COMPONENT_WEIGHTS.envFit });
  contribs.sort((a, b) => b.weighted - a.weighted);

  const top = (student.hollandCode[0] as RIASECCode) ?? "R";
  const phrases: string[] = [];
  for (const cc of contribs.slice(0, 2)) {
    if (cc.key === "riasec") {
      phrases.push(`you lean ${dimName(top)} and this program is ${dimName(i.riasec[0])}-focused`);
    } else if (cc.key === "sector" && c.sectorMatch && c.sectorMatch >= SECTOR_MATCH_VALUE.maybe) {
      phrases.push("you said yes to this kind of work");
    } else if (cc.key === "activity" && c.activityOverlap && c.activityOverlap > 0) {
      phrases.push(`it uses things you're into (${(i.activities ?? []).slice(0, 2).join(", ")})`);
    } else if (cc.key === "env" && c.envFit && c.envFit > 0.6) {
      phrases.push("the work setting matches how you like to work");
    }
  }
  if (phrases.length === 0) phrases.push(`it lines up with your ${dimName(top)} strengths`);
  const s = phrases.join(", and ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}
