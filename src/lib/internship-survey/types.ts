// Internship Interest Survey — shared types.
//
// This is NOT the application. It is a short, mobile-first survey that produces
// a RIASEC interest profile and a ranked list of internship matches. No PII,
// eligibility, transcript, or demographic data lives here.

import type { RIASECCode } from "@/lib/riasec";

export type Scale4Value = 0 | 1 | 2 | 3; // Not for me / Eh / Sounds good / Love it
export type SectorTapValue = 0 | 1 | 2; // Not interested / Maybe / Yes
export type ForcedChoiceValue = "a" | "b";
export type ExperienceValence = "DID_LIKE" | "DID_DISLIKE" | "NEW_CURIOUS" | "NEW_NOPE";

// One entry per answered item, keyed by item id. A discriminated union so the
// scoring code never has to guess what an item's value means.
export type ResponseValue =
  | { kind: "scale4"; value: Scale4Value }
  | { kind: "forcedChoice"; value: ForcedChoiceValue }
  | { kind: "sectorTap"; value: SectorTapValue }
  | { kind: "slider"; value: number } // 0..100
  | { kind: "experience4"; value: ExperienceValence; expKind?: string }
  | { kind: "open"; value: string };

export type Responses = Record<string, ResponseValue>;

export type RiasecVector = Record<RIASECCode, number>;

export type ExperienceBand = "intro" | "some" | "advanced";

export type SurveyResult = {
  riasecRaw: RiasecVector;
  riasecNorm: RiasecVector; // 0..100 per dimension
  hollandCode: string; // top 3 letters, e.g. "IRA"
  sectorValues: Record<string, SectorTapValue>;
  envVector: Record<string, number>; // env flag -> 0..100
  activityTags: string[];
  topicModifiers: Record<string, number>; // experience topic id -> additive modifier
  intensity: number; // count of DID_LIKE + DID_DISLIKE
  intensityBand: ExperienceBand;
};

export type MatchComponents = {
  riasecSim?: number;
  sectorMatch?: number;
  activityOverlap?: number;
  envFit?: number;
  expMod: number;
};

export type MatchResult = {
  slug: string;
  name: string;
  emoji: string;
  theme: string;
  score: number; // 0..1
  components: MatchComponents;
  whyFit: string;
};
