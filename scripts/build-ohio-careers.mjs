#!/usr/bin/env node
/**
 * Build src/data/ohio-careers.json — the Ohio job data layer.
 *
 * Sources (EXPLR's career-pathways data site, which publishes the cleaned
 * public datasets as JSON):
 *   data.json        Ohio LMI Occupational Employment Projections 2022-2032 +
 *                    Ohio wages (OES) + CSU / Tri-C programs via the CIP-SOC crosswalk
 *   riasec.json      O*NET Interests (RIASEC) per SOC, 1-7 scale
 *   kid_careers.json 57 kid-friendly career cards (grades 4-8)
 *   national.json    BLS Employment Projections 2024-2034 (fallback growth / wage)
 *
 * Cluster assignment follows the same rules as that site: priority SOC list,
 * then SOC major group, then CIP family, then title keywords
 * (scripts/ohio-careers/clusters.json). Family-facing interest groups map to
 * clusters (scripts/ohio-careers/interests.json).
 *
 *   node scripts/build-ohio-careers.mjs [--base https://explrpathways.netlify.app]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const baseArg = process.argv.indexOf("--base");
const BASE = baseArg > -1 ? process.argv[baseArg + 1] : "https://explrpathways.netlify.app";

const clusters = JSON.parse(readFileSync(join(here, "ohio-careers", "clusters.json"), "utf8"));
const interests = JSON.parse(readFileSync(join(here, "ohio-careers", "interests.json"), "utf8"));
// Optional: per-SOC AI impact rating (boost | mixed | exposed) from the same site.
let aiImpact = {};
try {
  aiImpact = JSON.parse(readFileSync(join(here, "ohio-careers", "ai-impact.json"), "utf8"));
} catch {
  aiImpact = {};
}

async function fetchJson(name) {
  const res = await fetch(`${BASE}/${name}.json`);
  if (!res.ok) throw new Error(`${name}.json: HTTP ${res.status}`);
  return res.json();
}

const [data, riasec, kids, national] = await Promise.all([
  fetchJson("data"),
  fetchJson("riasec"),
  fetchJson("kid_careers"),
  fetchJson("national"),
]);

const nationalBySoc = new Map(national.occupations.map((o) => [o.soc, o]));
const programsById = new Map(data.programs.map((p) => [p.id, p]));

function clusterFor(o) {
  const soc = o.soc;
  const major = soc.slice(0, 2);
  for (const c of clusters) if (c.priorityOccupations.includes(soc)) return c.id;
  for (const c of clusters) if (c.socMajorGroups.includes(major)) return c.id;
  const fams = new Set((o.related_cips ?? []).map((cip) => cip.slice(0, 2)));
  for (const c of clusters) if (c.cipFallbackFamilies.some((f) => fams.has(f))) return c.id;
  const t = o.title.toLowerCase();
  for (const c of clusters) if (c.cipFallbackKeywords.some((k) => t.includes(k))) return c.id;
  return null;
}

/** Strip the long O*NET description to one or two sentences, ≤ 240 chars. */
function shortDesc(s) {
  if (!s) return "";
  const sentences = s.replace(/\s+/g, " ").split(/(?<=\.)\s/);
  let out = "";
  for (const sen of sentences) {
    if ((out + " " + sen).trim().length > 240) break;
    out = (out + " " + sen).trim();
  }
  return out || s.slice(0, 237) + "…";
}

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const singular = (s) => s.replace(/s\b/g, "");

/** Best-effort link from a kid career card to an Ohio SOC by title. */
function kidSocFor(card, occs) {
  const want = singular(norm(card.name));
  let best = null;
  for (const o of occs) {
    const have = singular(norm(o.title.split(",")[0]));
    if (have === want) return o.soc;
    if (have.includes(want) || want.includes(have)) {
      if (!best || Math.abs(have.length - want.length) < best.d)
        best = { soc: o.soc, d: Math.abs(have.length - want.length) };
    }
  }
  return best?.soc ?? null;
}

const occupations = data.occupations
  .map((o) => {
    const r = riasec.by_soc[o.soc];
    const n = nationalBySoc.get(o.soc);
    const programs = (o.related_programs ?? [])
      .map((id) => programsById.get(id))
      .filter(Boolean)
      .map((p) => ({
        name: p.name,
        institution: p.institution.includes("Tri-C") ? "Tri-C" : "CSU",
        credential: p.credential,
      }))
      // de-dupe by name+credential, keep up to 6
      .filter(
        (p, i, arr) =>
          arr.findIndex((q) => q.name === p.name && q.credential === p.credential) === i,
      )
      .slice(0, 6);
    const wageAnnual =
      o.wage_kind === "not_disclosed"
        ? (n?.median_wage_annual ?? null)
        : (o.median_wage_annual ?? null);
    return {
      soc: o.soc,
      title: o.title,
      desc: shortDesc(o.description),
      cluster: clusterFor(o),
      wageAnnual,
      wageScope: o.wage_kind === "not_disclosed" ? "national" : "ohio",
      changePct: o.change_pct == null ? null : Math.round(o.change_pct * 1000) / 10,
      openings: o.annual_total_openings ?? null,
      employment: o.emp_2022 ?? null,
      education: o.typical_education ?? null,
      jobZone: o.job_zone ?? null,
      riasec: r ? { code: r.code, primary: r.primary, scores: r.scores } : null,
      ai: aiImpact[o.soc] ?? null,
      tags: Object.entries(o.tags ?? {})
        .filter(([k, v]) => v && k !== "has_pathway")
        .map(([k]) => k),
      programs,
    };
  })
  .filter((o) => o.cluster && o.riasec && o.wageAnnual != null)
  .sort((a, b) => a.title.localeCompare(b.title));

const kidCareers = Object.values(kids).map((c) => ({
  slug: c.slug,
  name: c.name,
  emoji: c.emoji,
  category: c.category,
  tagline: c.tagline,
  description: c.description,
  dailyWork: (c.dailyWork ?? []).slice(0, 5),
  skills: (c.skills ?? []).slice(0, 6),
  subjects: (c.subjects ?? []).slice(0, 5),
  salary: c.salary ?? null,
  outlook: c.outlook ?? null,
  pathways: (c.pathways ?? []).slice(0, 5),
  soc: kidSocFor(c, occupations),
}));
for (const k of kidCareers) {
  const o = occupations.find((x) => x.soc === k.soc);
  if (o) o.kid = k.slug;
}

const out = {
  meta: {
    generatedAt: new Date().toISOString().slice(0, 10),
    ohioProjections: data.meta.ohio_projections_source,
    ohioProjectionsUrl: data.meta.ohio_projections_url,
    wageYear: data.meta.wage_year,
    ohioMedianWageAnnual: data.meta.state_median_wage_annual,
    programsSource: data.meta.programs_source,
    riasecSource: riasec.meta.source,
    nationalSource: national.meta.source,
    definitions: data.meta.definitions,
  },
  clusters: clusters.map((c) => ({ id: c.id, name: c.name, short: c.short })),
  interests,
  occupations,
  kidCareers,
};

mkdirSync(join(root, "src", "data"), { recursive: true });
const file = join(root, "src", "data", "ohio-careers.json");
writeFileSync(file, JSON.stringify(out));
console.log(
  `wrote ${file}: ${occupations.length} occupations, ${kidCareers.length} kid cards (${kidCareers.filter((k) => k.soc).length} linked), ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`,
);
