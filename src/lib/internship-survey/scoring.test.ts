import { describe, expect, it } from "vitest";
import {
  computeRiasecVector,
  deriveActivityTags,
  envVector,
  experienceSignals,
  hollandCode,
  scoreSurvey,
  sectorValues,
} from "./scoring";
import { WEIGHTS } from "./config";
import type { Responses } from "./types";

const scale4 = (value: 0 | 1 | 2 | 3) => ({ kind: "scale4" as const, value });
const fc = (value: "a" | "b") => ({ kind: "forcedChoice" as const, value });
const sec = (value: 0 | 1 | 2) => ({ kind: "sectorTap" as const, value });
const exp = (value: "DID_LIKE" | "DID_DISLIKE" | "NEW_CURIOUS" | "NEW_NOPE") => ({
  kind: "experience4" as const,
  value,
});

describe("computeRiasecVector", () => {
  it("sums activity ratings into the right dimension", () => {
    const responses: Responses = { R1: scale4(3), R2: scale4(3), R3: scale4(3) };
    const { raw } = computeRiasecVector(responses);
    expect(raw.R).toBe(9); // 3 + 3 + 3
    expect(raw.I).toBe(0);
  });

  it("adds a forced-choice bump of W_FC to the chosen dimension", () => {
    const a: Responses = { FC1: fc("a") }; // FC1 -> [R, E]
    const b: Responses = { FC1: fc("b") };
    expect(computeRiasecVector(a).raw.R).toBeCloseTo(WEIGHTS.fc);
    expect(computeRiasecVector(b).raw.E).toBeCloseTo(WEIGHTS.fc);
  });

  it("applies sector leans scaled by tap value", () => {
    const responses: Responses = { SEC9: sec(2) }; // SEC9 -> [I]
    const { raw } = computeRiasecVector(responses);
    expect(raw.I).toBeCloseTo(WEIGHTS.sector * 2);
  });

  it("weights experience valence: NEW_CURIOUS positive, NEW_NOPE zero", () => {
    const curious: Responses = { EXP4: exp("NEW_CURIOUS") }; // EXP4 -> [I]
    const nope: Responses = { EXP4: exp("NEW_NOPE") };
    expect(computeRiasecVector(curious).raw.I).toBeGreaterThan(0);
    expect(computeRiasecVector(nope).raw.I).toBe(0);
  });

  it("normalizes the strongest dimension to 100 and weakest to 0", () => {
    const responses: Responses = {
      I1: scale4(3), I2: scale4(3), I3: scale4(3),
      R1: scale4(0), R2: scale4(0), R3: scale4(0),
    };
    const { normalized } = computeRiasecVector(responses);
    expect(normalized.I).toBe(100);
    expect(normalized.R).toBe(0);
  });
});

describe("hollandCode", () => {
  it("returns the top three dimensions, high to low", () => {
    const code = hollandCode({ R: 10, I: 90, A: 80, S: 70, E: 5, C: 1 });
    expect(code).toBe("IAS");
  });

  it("breaks ties using fixed RIASEC order", () => {
    const code = hollandCode({ R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 });
    expect(code).toBe("RIA");
  });
});

describe("sectorValues / envVector defaults", () => {
  it("defaults unanswered sectors to 0 and unanswered sliders to 50", () => {
    const sv = sectorValues({});
    expect(sv.SEC1).toBe(0);
    const ev = envVector({});
    expect(ev.handsOn).toBe(50);
  });

  it("maps slider items to their environment flag", () => {
    const ev = envVector({ ENV3: { kind: "slider", value: 90 } });
    expect(ev.team).toBe(90);
  });
});

describe("deriveActivityTags", () => {
  it("includes tags from activity items rated >= 2 and curious/liked experiences", () => {
    const responses: Responses = {
      I1: scale4(3), // research
      A1: scale4(1), // below threshold -> excluded
      EXP5: exp("NEW_CURIOUS"), // code
    };
    const tags = deriveActivityTags(responses);
    expect(tags).toContain("research");
    expect(tags).toContain("code");
    expect(tags).not.toContain("design");
  });
});

describe("experienceSignals", () => {
  it("counts DID_LIKE + DID_DISLIKE as intensity and bands it", () => {
    const responses: Responses = {
      EXP1: exp("DID_LIKE"),
      EXP2: exp("DID_DISLIKE"),
      EXP3: exp("NEW_CURIOUS"), // does not count toward intensity
    };
    const { intensity, band } = experienceSignals(responses);
    expect(intensity).toBe(2);
    expect(band).toBe("some");
  });

  it("bands 0-1 as intro and 4+ as advanced", () => {
    expect(experienceSignals({}).band).toBe("intro");
    const many: Responses = {
      EXP1: exp("DID_LIKE"), EXP2: exp("DID_LIKE"), EXP3: exp("DID_LIKE"),
      EXP4: exp("DID_LIKE"), EXP5: exp("DID_DISLIKE"),
    };
    expect(experienceSignals(many).band).toBe("advanced");
  });
});

describe("scoreSurvey", () => {
  it("produces a full result object even from a tiny response set", () => {
    const result = scoreSurvey({ I1: scale4(3) });
    expect(result.hollandCode.length).toBe(3);
    expect(Object.keys(result.sectorValues).length).toBe(10);
    expect(Object.keys(result.envVector).length).toBe(5);
    expect(result.intensityBand).toBe("intro");
  });
});
