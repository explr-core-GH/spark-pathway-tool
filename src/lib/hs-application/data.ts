import { supabase } from "@/integrations/supabase/client";
import { DEMO_DOMAIN } from "@/lib/demo";
import type { Applicant } from "./match";
import { isDemoListing, type OppRow } from "./listings";
import {
  EMPTY_CHOICES,
  EMPTY_CORE,
  EMPTY_EXTRAS,
  hydrateBuilder,
  type ApplicationBuilder,
  type GeneralApplication,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

export type Season = {
  id: string;
  name: string;
  program_start: string | null;
  program_end: string | null;
  opens_at: string | null;
  closes_at: string | null;
};

export async function loadCurrentSeason(): Promise<Season | null> {
  const { data } = await sb("application_seasons")
    .select("id, name, program_start, program_end, opens_at, closes_at")
    .eq("is_current", true)
    .maybeSingle();
  return (data as Season) ?? null;
}

export function hydrateGeneral(row: Record<string, unknown>): GeneralApplication {
  return {
    ...(row as unknown as GeneralApplication),
    core: { ...EMPTY_CORE, ...((row.core as object) ?? {}) },
    extras: { ...EMPTY_EXTRAS, ...((row.extras as object) ?? {}) },
    choices: { ...EMPTY_CHOICES, ...((row.choices as object) ?? {}) },
  };
}

/** Load this season's general application, creating a prefilled draft if needed. */
export async function loadOrCreateGeneral(
  userId: string,
  email: string | null,
  season: Season,
): Promise<GeneralApplication> {
  const { data: existing } = await sb("hs_general_applications")
    .select("*")
    .eq("student_id", userId)
    .eq("season_id", season.id)
    .maybeSingle();
  if (existing) return hydrateGeneral(existing);

  const [{ data: stu }, { data: prof }] = await Promise.all([
    sb("students").select("first_name, grade, date_of_birth").eq("id", userId).maybeSingle(),
    sb("internship_profiles").select("high_school").eq("student_id", userId).maybeSingle(),
  ]);
  const grade = typeof stu?.grade === "number" ? stu.grade + 1 : null;
  const core = {
    ...EMPTY_CORE,
    legalFirst: stu?.first_name ?? "",
    dob: stu?.date_of_birth ?? "",
    email: email && !email.endsWith(DEMO_DOMAIN) ? email : "",
    school: prof?.high_school ?? "",
    gradeFall: grade && grade >= 9 && grade <= 12 ? String(grade) : "",
  };
  const { data: created, error } = await sb("hs_general_applications")
    .insert({
      student_id: userId,
      season_id: season.id,
      core,
      extras: EMPTY_EXTRAS,
      choices: EMPTY_CHOICES,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return hydrateGeneral(created);
}

export async function saveGeneral(
  id: string,
  patch: Partial<
    Pick<GeneralApplication, "core" | "extras" | "choices" | "step" | "assessment_session_id">
  >,
): Promise<string | null> {
  const { error } = await sb("hs_general_applications").update(patch).eq("id", id);
  return error ? error.message : null;
}

export type AssessmentSnapshot = {
  session_id: string;
  holland_code: string | null;
  scale_scores: Record<string, number> | null;
  completed_at: string;
};

/** Latest completed survey since August 1 (this school year). */
export async function loadThisYearsAssessment(userId: string): Promise<AssessmentSnapshot | null> {
  const now = new Date();
  const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const { data } = await sb("assessment_sessions")
    .select("session_id, holland_code, scale_scores, completed_at")
    .eq("student_id", userId)
    .not("completed_at", "is", null)
    .gte("completed_at", new Date(y, 7, 1).toISOString())
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AssessmentSnapshot) ?? null;
}

export async function loadItemResponses(sessionId: string | null): Promise<Record<string, number>> {
  if (!sessionId) return {};
  const { data } = await sb("assessment_responses")
    .select("item_id, response_value, is_practice")
    .eq("session_id", sessionId);
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as Array<{
    item_id: string;
    response_value: unknown;
    is_practice: boolean | null;
  }>) {
    if (r.is_practice) continue;
    const v =
      typeof r.response_value === "number"
        ? r.response_value
        : typeof r.response_value === "object" && r.response_value !== null
          ? Number(
              (r.response_value as { likert?: unknown; value?: unknown }).likert ??
                (r.response_value as { value?: unknown }).value,
            )
          : Number(r.response_value);
    if (Number.isFinite(v)) out[r.item_id] = v;
  }
  return out;
}

export type ListingRow = OppRow & {
  version: { id: string; version: number; builder: ApplicationBuilder } | null;
};

/**
 * Open internships with their published application version. Demo accounts
 * see only demo listings; everyone else never sees them.
 */
export async function loadOpenListings(isDemo: boolean): Promise<ListingRow[]> {
  const { data } = await sb("opportunities")
    .select("*")
    .eq("type", "internship")
    .eq("status", "approved")
    .order("name");
  const rows = ((data ?? []) as OppRow[]).filter((o) => isDemoListing(o) === isDemo);
  const versionIds = rows.map((r) => r.application_version_id).filter(Boolean) as string[];
  const versions = new Map<string, { id: string; version: number; builder: ApplicationBuilder }>();
  if (versionIds.length) {
    const { data: vs } = await sb("opp_application_versions")
      .select("id, version, builder")
      .in("id", versionIds);
    for (const v of (vs ?? []) as Array<{ id: string; version: number; builder: unknown }>)
      versions.set(v.id, { id: v.id, version: v.version, builder: hydrateBuilder(v.builder) });
  }
  return rows.map((r) => ({
    ...r,
    version: r.application_version_id ? (versions.get(r.application_version_id) ?? null) : null,
  }));
}

export function isDemoEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(DEMO_DOMAIN);
}

export function applicantFrom(
  app: GeneralApplication,
  assessment: AssessmentSnapshot | null,
  itemResponses: Record<string, number>,
  openNeedHelp: string[] = [],
): Applicant {
  return {
    core: app.core,
    extras: app.extras,
    scaleScores: (assessment?.scale_scores as Applicant["scaleScores"]) ?? null,
    hollandCode: assessment?.holland_code ?? null,
    itemResponses,
    openNeedHelp,
  };
}
