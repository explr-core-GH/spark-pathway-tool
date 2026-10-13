import { useEffect, useState } from "react";
import type { RIASECCode } from "@/lib/riasec";

/**
 * Ohio job data layer. Built from Ohio LMI projections (2022-2032), Ohio
 * wages, O*NET interest profiles, and CSU / Tri-C programs by
 * scripts/build-ohio-careers.mjs into src/data/ohio-careers.json (≈0.5 MB,
 * loaded lazily the first time a careers surface renders).
 *
 * Everything here is pure: load once, then match, sort, and format.
 */

export type ClusterId = string;

export type OhioCareer = {
  soc: string;
  title: string;
  desc: string;
  cluster: ClusterId;
  /** Median annual wage; `wageScope` says whether it is Ohio or national. */
  wageAnnual: number;
  wageScope: "ohio" | "national";
  /** Projected employment change 2022-2032, percent (e.g. 12.5). */
  changePct: number | null;
  /** Annual total openings in Ohio (growth + exits + transfers). */
  openings: number | null;
  employment: number | null;
  education: string | null;
  /** O*NET job zone 1 (little preparation) to 5 (extensive). */
  jobZone: number | null;
  riasec: { code: string; primary: string; scores: Record<RIASECCode, number> } | null;
  /** AI research rating from the EXPLR workforce dashboard, when known. */
  ai: "boost" | "mixed" | "exposed" | null;
  tags: Array<
    "high_wage" | "high_growth" | "high_demand" | "social_mobility" | "middle_skill_high_wage"
  >;
  programs: Array<{ name: string; institution: "CSU" | "Tri-C"; credential: string }>;
  /** Slug of a kid career card about this job, when one exists. */
  kid?: string;
};

export type KidCareer = {
  slug: string;
  name: string;
  emoji: string;
  category: string;
  tagline: string;
  description: string;
  dailyWork: string[];
  skills: string[];
  subjects: string[];
  salary: { entry: number | null; median: number | null; experienced: number | null } | null;
  outlook: string | null;
  pathways: string[];
  soc: string | null;
};

export type CareerCluster = { id: ClusterId; name: string; short: string };
export type InterestGroup = {
  id: string;
  name: string;
  blurb: string;
  examples: string;
  clusters: ClusterId[];
};

export type OhioCareersData = {
  meta: {
    generatedAt: string;
    ohioProjections: string;
    ohioProjectionsUrl: string;
    wageYear: number;
    ohioMedianWageAnnual: number;
    programsSource: string;
    riasecSource: string;
    nationalSource: string;
    definitions: Record<string, string>;
  };
  clusters: CareerCluster[];
  interests: InterestGroup[];
  occupations: OhioCareer[];
  kidCareers: KidCareer[];
};

let cache: Promise<OhioCareersData> | null = null;

/** Lazy-load the data file once per session. */
export function loadOhioCareers(): Promise<OhioCareersData> {
  if (!cache) {
    cache = import("@/data/ohio-careers.json").then((m) => (m.default ?? m) as OhioCareersData);
  }
  return cache;
}

/**
 * React hook: the Ohio job data once it has loaded, else null. Surfaces
 * that use it render a `role="status"` line until data arrives.
 */
export function useOhioCareers(): OhioCareersData | null {
  const [data, setData] = useState<OhioCareersData | null>(null);
  useEffect(() => {
    let active = true;
    loadOhioCareers().then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
  }, []);
  return data;
}

// ── Plain-language labels ──────────────────────────────────────────────────

/** Kid- and family-friendly names for the six RIASEC types. */
export const TRAITS: Record<RIASECCode, { name: string; verb: string; blurb: string }> = {
  R: {
    name: "Doer",
    verb: "build and fix things",
    blurb: "Hands-on with tools, machines, plants, or the outdoors.",
  },
  I: {
    name: "Thinker",
    verb: "figure things out",
    blurb: "Science, math, data, and solving problems.",
  },
  A: { name: "Creator", verb: "make and design", blurb: "Art, music, writing, video, and design." },
  S: {
    name: "Helper",
    verb: "help and teach",
    blurb: "Caring for, teaching, and supporting people.",
  },
  E: {
    name: "Persuader",
    verb: "lead and persuade",
    blurb: "Leading teams, selling ideas, starting things.",
  },
  C: {
    name: "Organizer",
    verb: "organize and track",
    blurb: "Details, data, records, and keeping things running.",
  },
};

export const RIASEC_LETTERS: RIASECCode[] = ["R", "I", "A", "S", "E", "C"];

export function formatPay(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n.toLocaleString()}`;
}

/** Annual openings for cards: `4,210/yr`. */
export function formatOpenings(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n.toLocaleString("en-US")}/yr`;
}

/** Signed growth percent: `+12%`, `-3%`, `0%`. */
export function formatGrowth(pct: number | null | undefined): string {
  if (pct == null) return "—";
  const r = Math.round(pct);
  return `${r > 0 ? "+" : ""}${r}%`;
}

/** O*NET job zone in words, for families. */
export function jobZoneLabel(z: number | null | undefined): string {
  const m: Record<number, string> = {
    1: "Little or no preparation",
    2: "Some preparation",
    3: "Medium preparation",
    4: "Considerable preparation",
    5: "Extensive preparation",
  };
  return z != null ? (m[z] ?? "Varies") : "Varies";
}

/** The letters of a Holland code, in order, dropping anything that isn't RIASEC. */
export function codeLetters(code: string | null | undefined): RIASECCode[] {
  if (!code) return [];
  const out: RIASECCode[] = [];
  for (const c of code.toUpperCase()) {
    if ((["R", "I", "A", "S", "E", "C"] as string[]).includes(c) && !out.includes(c as RIASECCode))
      out.push(c as RIASECCode);
  }
  return out.slice(0, 3);
}

/** Education level bucket for the careers filter. */
export type EducationBucket = "two_year_or_less" | "four_year" | "graduate";
export function educationBucket(e: string | null): EducationBucket {
  switch (e) {
    case "Bachelor's degree":
      return "four_year";
    case "Master's degree":
    case "Doctoral or professional degree":
      return "graduate";
    default:
      return "two_year_or_less";
  }
}

/** Rough starting pay: 70% of the median, like the EXPLR dashboard shows. */
export function startingPay(median: number | null | undefined): number | null {
  return median == null ? null : Math.round((median * 0.7) / 500) * 500;
}

export function growthLabel(pct: number | null): { label: string; tone: "up" | "flat" | "down" } {
  if (pct == null) return { label: "No projection", tone: "flat" };
  if (pct >= 10) return { label: `Growing fast · +${Math.round(pct)}%`, tone: "up" };
  if (pct >= 5) return { label: `Growing · +${Math.round(pct)}%`, tone: "up" };
  if (pct > -2)
    return { label: `Steady · ${pct > 0 ? "+" : ""}${Math.round(pct * 10) / 10}%`, tone: "flat" };
  return { label: `Shrinking · ${Math.round(pct)}%`, tone: "down" };
}

/** Short education label for cards. */
export function educationShort(e: string | null): string {
  if (!e) return "Varies";
  const m: Record<string, string> = {
    "No formal educational credential": "No degree needed",
    "High school diploma or equivalent": "High school diploma",
    "Some college, no degree": "Some college",
    "Postsecondary non-degree award": "Certificate",
    "Associate's degree": "Associate's (2 yr)",
    "Bachelor's degree": "Bachelor's (4 yr)",
    "Master's degree": "Master's",
    "Doctoral or professional degree": "Doctorate / professional",
  };
  return m[e] ?? e;
}

/** How long after high school, in plain words, for families. */
export function trainingTime(e: string | null): string {
  const m: Record<string, string> = {
    "No formal educational credential": "Start right after high school",
    "High school diploma or equivalent": "Start right after high school",
    "Some college, no degree": "A year or so of college or training",
    "Postsecondary non-degree award": "A certificate, often under a year",
    "Associate's degree": "About two years at a community college",
    "Bachelor's degree": "A four-year degree",
    "Master's degree": "A four-year degree plus a master's",
    "Doctoral or professional degree": "Graduate or professional school after college",
  };
  return (e && m[e]) || "Training varies";
}

export const TAG_LABEL: Record<OhioCareer["tags"][number], string> = {
  high_wage: "Pays above the Ohio median",
  high_growth: "High growth",
  high_demand: "High demand",
  social_mobility: "Reachable with a two-year degree or less",
  middle_skill_high_wage: "Middle-skill, high-wage",
};

// ── Matching ───────────────────────────────────────────────────────────────

export type MatchInput =
  { scores: Partial<Record<RIASECCode, number>> } | { code: string } | { letters: RIASECCode[] };

function vectorFrom(input: MatchInput): Record<RIASECCode, number> | null {
  const v: Record<RIASECCode, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  if ("scores" in input) {
    let any = false;
    for (const l of RIASEC_LETTERS) {
      const n = input.scores[l];
      if (typeof n === "number" && n > 0) {
        v[l] = n;
        any = true;
      }
    }
    return any ? v : null;
  }
  const letters =
    "letters" in input
      ? input.letters
      : (input.code
          .toUpperCase()
          .split("")
          .filter((c) => RIASEC_LETTERS.includes(c as RIASECCode)) as RIASECCode[]);
  if (letters.length === 0) return null;
  // Primary letter counts most, then secondary, then tertiary.
  const weights = [1, 0.6, 0.35];
  letters.slice(0, 3).forEach((l, i) => {
    v[l] = Math.max(v[l], weights[i]);
  });
  return v;
}

function cosine(a: Record<RIASECCode, number>, b: Record<RIASECCode, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const l of RIASEC_LETTERS) {
    dot += a[l] * b[l];
    na += a[l] * a[l];
    nb += b[l] * b[l];
  }
  if (!na || !nb) return 0;
  return dot / Math.sqrt(na * nb);
}

export type CareerMatch = { career: OhioCareer; fit: number; shared: RIASECCode[] };

/**
 * Rank Ohio careers against a student's interests. Fit is cosine similarity
 * between the student's profile (assessment scale scores, or a Holland
 * code) and the job's O*NET interest profile, lightly boosted for jobs that
 * are growing and pay above the Ohio median so the list is useful, not just
 * similar.
 */
export function matchCareers(
  data: OhioCareersData,
  input: MatchInput,
  opts: { limit?: number; cluster?: ClusterId | null; minFit?: number } = {},
): CareerMatch[] {
  const v = vectorFrom(input);
  if (!v) return [];
  const top = RIASEC_LETTERS.filter((l) => v[l] > 0).sort((a, b) => v[b] - v[a]);
  const scored: Array<CareerMatch & { score: number }> = [];
  for (const c of data.occupations) {
    if (!c.riasec) continue;
    if (opts.cluster && c.cluster !== opts.cluster) continue;
    const fit = cosine(v, c.riasec.scores);
    if (fit < (opts.minFit ?? 0.6)) continue;
    const shared = top.filter((l) => c.riasec!.code.includes(l));
    let score = fit;
    if (c.tags.includes("high_growth")) score += 0.03;
    if (c.tags.includes("high_wage")) score += 0.02;
    if (c.tags.includes("high_demand")) score += 0.02;
    scored.push({ career: c, fit: Math.round(fit * 100) / 100, shared, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored
    .slice(0, opts.limit ?? 12)
    .map(({ career, fit, shared }) => ({ career, fit, shared }));
}

/** Careers in one cluster, best-paying and most open first. */
export function careersInCluster(data: OhioCareersData, cluster: ClusterId): OhioCareer[] {
  return data.occupations
    .filter((c) => c.cluster === cluster)
    .sort(
      (a, b) =>
        (b.openings ?? 0) * 0.5 +
        b.wageAnnual / 100 -
        ((a.openings ?? 0) * 0.5 + a.wageAnnual / 100),
    );
}

/** Careers for a family-facing interest group. */
export function careersForInterest(data: OhioCareersData, interestId: string): OhioCareer[] {
  const g = data.interests.find((i) => i.id === interestId);
  if (!g) return [];
  return data.occupations
    .filter((c) => g.clusters.includes(c.cluster))
    .sort((a, b) => (b.openings ?? 0) - (a.openings ?? 0));
}

export function careerBySoc(data: OhioCareersData, soc: string): OhioCareer | undefined {
  return data.occupations.find((c) => c.soc === soc);
}

/** Case-insensitive title lookup (exact title, or a singular/plural variant). */
export function careerByTitle(data: OhioCareersData, title: string | null): OhioCareer | undefined {
  if (!title) return undefined;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const t = norm(title);
  if (!t) return undefined;
  const variants = new Set([t, `${t}s`, t.endsWith("s") ? t.slice(0, -1) : t]);
  return data.occupations.find((c) => variants.has(norm(c.title)));
}

export function clusterName(data: OhioCareersData, id: ClusterId): string {
  return data.clusters.find((c) => c.id === id)?.name ?? id;
}

export function kidCareerFor(data: OhioCareersData, career: OhioCareer): KidCareer | undefined {
  return career.kid ? data.kidCareers.find((k) => k.slug === career.kid) : undefined;
}

/** Kid cards ranked for a Holland code (via their linked Ohio job, else by category keywords). */
export function kidCareersFor(data: OhioCareersData, input: MatchInput, limit = 8): KidCareer[] {
  const v = vectorFrom(input);
  if (!v) return data.kidCareers.slice(0, limit);
  const scored = data.kidCareers.map((k) => {
    const o = k.soc ? careerBySoc(data, k.soc) : undefined;
    const fit = o?.riasec ? cosine(v, o.riasec.scores) : 0.5;
    return { k, fit };
  });
  scored.sort((a, b) => b.fit - a.fit);
  return scored.slice(0, limit).map((s) => s.k);
}

/** Map a Pathways career-cluster slug (wbl-taxonomy) to the data layer's cluster id. */
export const PATHWAYS_CLUSTER_TO_DATA: Record<string, ClusterId> = {
  agriculture: "agriculture_food_natural_resources",
  architecture: "architecture_construction",
  "arts-av": "arts_av_communications",
  business: "business_management_administration",
  education: "education_training",
  finance: "finance",
  government: "government_public_administration",
  health: "health_science",
  hospitality: "hospitality_tourism",
  "human-services": "human_services",
  it: "information_technology",
  "law-public-safety": "law_public_safety",
  manufacturing: "manufacturing",
  marketing: "marketing",
  stem: "stem",
  transportation: "transportation_distribution_logistics",
};

/**
 * The reverse: data cluster id → the Pathways cluster slug that
 * `career_goals.cluster` and the checkpoint form use (wbl-taxonomy
 * CAREER_CLUSTERS). Four slugs differ from the short keys above, so the
 * reverse map is corrected to the taxonomy spelling.
 */
export const DATA_CLUSTER_TO_PATHWAYS: Record<ClusterId, string> = {
  ...Object.fromEntries(Object.entries(PATHWAYS_CLUSTER_TO_DATA).map(([slug, id]) => [id, slug])),
  architecture_construction: "construction",
  arts_av_communications: "arts",
  information_technology: "information-technology",
  law_public_safety: "public-safety",
};
