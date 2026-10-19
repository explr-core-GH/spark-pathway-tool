import type { RIASECCode } from "@/lib/riasec";
import { RIASEC_ACTIVITIES } from "@/lib/opportunities";
import { hydrateWbl } from "@/lib/wbl-gate";
import type { Listing } from "./match";
import { hydrateBuilder, type ApplicationBuilder } from "./types";

const DIMS: RIASECCode[] = ["R", "I", "A", "S", "E", "C"];
const ACTIVITY_LETTER = new Map(RIASEC_ACTIVITIES.map((a) => [a.key, a.letter as RIASECCode]));

/** The opportunity columns the application flow reads. */
export type OppRow = {
  id: string;
  org_id: string;
  org_name?: string | null;
  name: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  grade_min: number | null;
  grade_max: number | null;
  location?: string | null;
  riasec_code: string | null;
  riasec_weights: Record<string, number> | null;
  custom?: Record<string, unknown> | null;
  wbl?: unknown;
  status: string;
  application_builder?: unknown;
  application_version_id?: string | null;
};

/** RIASEC letters from either letter weights or the partner's activity-time split. */
export function riasecFromOpportunity(
  o: Pick<OppRow, "riasec_weights" | "riasec_code">,
): Partial<Record<RIASECCode, number>> {
  const out: Partial<Record<RIASECCode, number>> = {};
  const w = o.riasec_weights ?? {};
  for (const [k, v] of Object.entries(w)) {
    const letter = DIMS.includes(k as RIASECCode) ? (k as RIASECCode) : ACTIVITY_LETTER.get(k);
    if (letter && typeof v === "number" && v > 0) out[letter] = (out[letter] ?? 0) + v;
  }
  if (Object.keys(out).length === 0) {
    (o.riasec_code ?? "").split("").forEach((c, i) => {
      if (DIMS.includes(c as RIASECCode)) out[c as RIASECCode] = [1, 0.6, 0.3][i] ?? 0.2;
    });
  }
  return out;
}

export function listingFromOpportunity(o: OppRow, builderRaw?: unknown): Listing {
  const b: ApplicationBuilder | null = builderRaw ? hydrateBuilder(builderRaw) : null;
  const wbl = hydrateWbl(o.wbl);
  const legacyMin = Number(wbl.legal.minAge || 0) || null;
  const customFields = Array.isArray(o.custom?.career_fields)
    ? (o.custom?.career_fields as string[])
    : [];
  return {
    ref: `opp:${o.id}`,
    name: b?.profile.title || o.name || "Internship",
    riasec: riasecFromOpportunity(o),
    careerFields: b?.profile.careerFields.length ? b.profile.careerFields : customFields,
    environment: b?.profile.environment ?? {},
    ageMin: b?.age.min ?? legacyMin,
    ageMax: b?.age.max ?? null,
    startDate: b?.profile.startDate || o.start_date,
    gradeMin: o.grade_min,
    gradeMax: o.grade_max,
  };
}

/** Demo listings carry custom.demo = true and only show to demo accounts. */
export function isDemoListing(o: Pick<OppRow, "custom">): boolean {
  return o.custom?.demo === true;
}
