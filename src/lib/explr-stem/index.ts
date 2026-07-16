// EXPLR STEM survey battery — typed loader over items.json.
//
// items.json is the source of truth (S-STEM Survey, Friday Institute 2012,
// plus career-planning items adapted from Falco & Summers 2019). Survey
// components never parse the JSON directly — they call the helpers here.
//
// Three survey flows:
//   retrospective   — one-week camp, single sitting, THEN/NOW dual rating
//   middle_school   — grades 5-8, separate pre + post administrations
//   high_school     — grades 9-12, separate pre + post; post adds the
//                     work-based-learning block
//
// See README.md in this folder for the full implementation guide.

import raw from "./items.json";

// ---- Raw JSON shape -------------------------------------------------------

export type ScaleId = "agreement_5pt" | "interest_4pt" | "confidence_5pt";

export type ScalePoint = { value: number; label: string };
export type Scale = {
  type: string;
  min: number;
  max: number;
  points: ScalePoint[];
};

export type SurveyItem = {
  id: string;
  text?: string;
  reverse_coded: boolean;
  // career_interest items carry these instead of `text`
  career_name?: string;
  description?: string;
  // career_planning items carry a domain label
  domain?: string;
};

export type ConstructId =
  | "math"
  | "science"
  | "engineering_technology"
  | "twentyfirst_century"
  | "career_interest"
  | "career_planning"
  | "work_based_learning";

export type Construct = {
  name: string;
  scale: ScaleId;
  items: SurveyItem[];
  preamble?: string;
  instructions?: string;
};

// The app-facing survey type keys.
export type SurveyType =
  | "retrospective"
  | "middle_school"
  | "high_school"
  | "internship_exit";
export type Administration = "pre" | "post" | "retrospective";

type RawConstructs = Record<string, Construct>;
type RawSurvey = {
  audience: string;
  administration: string;
  estimated_time_minutes: number;
  construct_subsets: Record<string, string | string[]>;
  response_format: string;
  open_ended_questions?: string[];
  post_only_open_ended?: string[];
};

const DATA = raw as unknown as {
  scales: Record<ScaleId, Scale>;
  constructs: RawConstructs;
  surveys: Record<string, RawSurvey>;
  demographics: {
    common_fields: DemographicField[];
    high_school_only_fields: DemographicField[];
  };
  scoring: { rules: string[] };
};

export type DemographicField = {
  id: string;
  label: string;
  type: string;
  min?: number;
  max?: number;
  options?: string[];
  followup_if?: string;
  followup_label?: string;
  show_if?: { field: string; value: string };
  max_items?: number;
};

// app survey type → items.json survey key
const SURVEY_KEY: Record<SurveyType, string> = {
  retrospective: "one_week_camp_retrospective",
  middle_school: "middle_school_prepost",
  high_school: "high_school_internship_prepost",
  internship_exit: "internship_exit",
};

// ---- Accessors ------------------------------------------------------------

export function getScale(id: ScaleId): Scale {
  return DATA.scales[id];
}

export function getConstruct(id: ConstructId): Construct {
  return DATA.constructs[id];
}

/** A single screen of the survey: one construct + the items to render. */
export type ConstructScreenDef = {
  constructId: ConstructId;
  name: string;
  scale: ScaleId;
  scaleDef: Scale;
  preamble?: string;
  instructions?: string;
  items: SurveyItem[];
};

/**
 * Resolve the ordered list of construct screens for a survey type +
 * administration. Honors items.json `construct_subsets`:
 *   - an array of ids  → exactly those items, in that order
 *   - "all_N_items"    → every item in the construct
 *   - "post_only_*"    → every item, but the construct is dropped entirely
 *                        unless administration === 'post'
 */
export function getSurveyScreens(
  surveyType: SurveyType,
  administration: Administration,
): ConstructScreenDef[] {
  const survey = DATA.surveys[SURVEY_KEY[surveyType]];
  const screens: ConstructScreenDef[] = [];

  for (const [cid, subset] of Object.entries(survey.construct_subsets)) {
    const constructId = cid as ConstructId;
    const construct = DATA.constructs[constructId];
    if (!construct) continue;

    const subsetStr = typeof subset === "string" ? subset : "";
    const isPostOnly = subsetStr.startsWith("post_only");
    if (isPostOnly && administration !== "post") continue;

    let items: SurveyItem[];
    if (Array.isArray(subset)) {
      const order = new Map(subset.map((id, i) => [id, i]));
      items = construct.items
        .filter((it) => order.has(it.id))
        .sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    } else {
      items = construct.items;
    }

    screens.push({
      constructId,
      name: construct.name,
      scale: construct.scale,
      scaleDef: DATA.scales[construct.scale],
      preamble: construct.preamble,
      instructions: construct.instructions,
      items,
    });
  }
  return screens;
}

/** Open-ended prompts for a survey type + administration. */
export function getOpenEndedPrompts(
  surveyType: SurveyType,
  administration: Administration,
): string[] {
  const survey = DATA.surveys[SURVEY_KEY[surveyType]];
  // Retrospective collects them in its single sitting; pre/post surveys
  // only collect them on the post administration.
  if (surveyType === "retrospective") {
    return survey.open_ended_questions ?? [];
  }
  return administration === "post" ? (survey.post_only_open_ended ?? []) : [];
}

/** Demographic fields to collect for a survey type. */
export function getDemographicFields(surveyType: SurveyType): DemographicField[] {
  const common = DATA.demographics.common_fields;
  if (surveyType === "high_school") {
    return [...common, ...DATA.demographics.high_school_only_fields];
  }
  return common;
}

/** Estimated completion time in minutes (shown on the intro screen). */
export function getEstimatedMinutes(surveyType: SurveyType): number {
  return DATA.surveys[SURVEY_KEY[surveyType]].estimated_time_minutes;
}

/** Every item id that belongs to a construct (for scoring lookups). */
export function getConstructItemIds(id: ConstructId): string[] {
  return DATA.constructs[id].items.map((it) => it.id);
}

/** All constructs, in canonical order — used by the scoring view + admin. */
export const ALL_CONSTRUCTS: ConstructId[] = [
  "math",
  "science",
  "engineering_technology",
  "twentyfirst_century",
  "career_interest",
  "career_planning",
  "work_based_learning",
];

/** Human label for a survey type. */
export const SURVEY_TYPE_LABEL: Record<SurveyType, string> = {
  retrospective: "One-week camp retrospective",
  middle_school: "Middle school pre/post",
  high_school: "High school internship pre/post",
  internship_exit: "End-of-internship assessment",
};
