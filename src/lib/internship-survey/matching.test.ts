import { describe, expect, it } from "vitest";
import { cosine, internshipRiasecVector, rankMatches, scoreInternship } from "./matching";
import { scoreSurvey } from "./scoring";
import type { Internship } from "@/lib/internships-catalog";
import type { Responses, SurveyResult } from "./types";

const baseInternship = (over: Partial<Internship>): Internship => ({
  slug: "x",
  name: "X",
  theme: "T",
  lead: null,
  outsidePartners: "",
  deliverables: "",
  externalUrl: "",
  emoji: "🔬",
  riasec: ["I"],
  ...over,
});

const scale4 = (value: 0 | 1 | 2 | 3) => ({ kind: "scale4" as const, value });

describe("internshipRiasecVector", () => {
  it("applies primary/secondary/tertiary weights in order", () => {
    const v = internshipRiasecVector(baseInternship({ riasec: ["I", "R", "A"] }));
    expect(v.I).toBe(1.0);
    expect(v.R).toBe(0.6);
    expect(v.A).toBe(0.3);
    expect(v.S).toBe(0);
  });
});

describe("cosine", () => {
  it("is 1 for identical directions and 0 against a zero vector", () => {
    const a = { R: 1, I: 2, A: 0, S: 0, E: 0, C: 0 };
    expect(cosine(a, a)).toBeCloseTo(1);
    expect(cosine(a, { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 })).toBe(0);
  });
});

describe("scoreInternship (RIASEC-only catalog)", () => {
  const investigativeStudent: SurveyResult = scoreSurvey({
    I1: scale4(3), I2: scale4(3), I3: scale4(3),
    S1: scale4(0), S2: scale4(0), S3: scale4(0),
  });

  it("scores an I-internship above an S-internship for an Investigative student", () => {
    const iJob = scoreInternship(investigativeStudent, baseInternship({ riasec: ["I"] }));
    const sJob = scoreInternship(investigativeStudent, baseInternship({ riasec: ["S"] }));
    expect(iJob.score).toBeGreaterThan(sJob.score);
  });

  it("uses only riasecSim when no richer tags are present", () => {
    const { components } = scoreInternship(investigativeStudent, baseInternship({ riasec: ["I"] }));
    expect(components.riasecSim).toBeDefined();
    expect(components.sectorMatch).toBeUndefined();
    expect(components.activityOverlap).toBeUndefined();
    expect(components.envFit).toBeUndefined();
  });

  it("lights up sectorMatch once an internship declares a sector", () => {
    const responses: Responses = { I1: scale4(3), SEC9: { kind: "sectorTap", value: 2 } };
    const student = scoreSurvey(responses);
    const withSector = scoreInternship(student, baseInternship({ riasec: ["I"], sector: "SEC9" }));
    expect(withSector.components.sectorMatch).toBe(1.0);
  });
});

describe("rankMatches", () => {
  const student = scoreSurvey({ I1: scale4(3), I2: scale4(3) });

  it("returns at most N matches, sorted descending, each with a why-fit line", () => {
    const matches = rankMatches(student, undefined, 5);
    expect(matches.length).toBeLessThanOrEqual(5);
    for (let k = 1; k < matches.length; k++) {
      expect(matches[k - 1].score).toBeGreaterThanOrEqual(matches[k].score);
    }
    for (const m of matches) {
      expect(m.whyFit.length).toBeGreaterThan(0);
      expect(m.whyFit.endsWith(".")).toBe(true);
    }
  });

  it("still returns a full set when the student vector is empty", () => {
    const empty = scoreSurvey({});
    const matches = rankMatches(empty);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].whyFit.length).toBeGreaterThan(0);
  });
});
