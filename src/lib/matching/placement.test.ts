import { describe, expect, it } from "vitest";
import { hydrateWbl } from "@/lib/wbl-gate";
import {
  acknowledgmentsFor,
  hardChecks,
  match,
  rankFor,
  score,
  softChecks,
  turns14ByJune1,
  type Candidate,
  type Target,
} from "./placement";

function target(over: Partial<Target> = {}): Target {
  return {
    ref: "opp:1",
    name: "Pharmacy technician intern",
    description: "Help the pharmacy team fill prescriptions and track inventory in a hospital.",
    riasecWeights: { I: 5, C: 4, S: 2 },
    riasecCodes: [],
    gradeMin: 10,
    gradeMax: 12,
    startDate: "2027-06-15",
    scheduleDays: ["Mon", "Wed"],
    requirements: ["Closed-toed shoes required"],
    careerCluster: "health",
    wbl: hydrateWbl({
      legal: { minAge: "16" },
      site: { vaccinations: "Flu shot" },
      schedule: { modality: "in_person", totalHours: "80" },
    }),
    targetCompetencies: ["Reliability"],
    ...over,
  };
}

function candidate(over: Partial<Candidate> = {}): Candidate {
  const t = target();
  return {
    studentId: "s1",
    firstName: "Amara",
    grade: 11,
    dateOfBirth: "2009-03-10",
    hollandCode: "ICS",
    scaleScores: null,
    profile: {
      career_aspiration: "pharmacist or nurse",
      intended_major: "biology",
      likes: "helping people, organized work",
      coursework: [
        { subject: "Science", course: "Chemistry", relevance: "medications and hospital pharmacy" },
      ],
      availability: { days: ["Mon", "Tue", "Wed"] },
      transportation: "transit",
    },
    passport: { verifiedHours: 60, skillsProficient: 4, clusters: ["health"], exposureCount: 3 },
    rank: 1,
    acknowledgments: acknowledgmentsFor(t),
    ...over,
  };
}

const flags = (c: Candidate, t: Target) => softChecks(c, t).map((x) => x.flag);

describe("hard checks (age only)", () => {
  it("passes a fully eligible candidate", () => {
    expect(hardChecks(candidate(), target())).toEqual([]);
    expect(softChecks(candidate(), target())).toEqual([]);
  });
  it("enforces minimum age at the start date", () => {
    expect(hardChecks(candidate({ dateOfBirth: "2011-12-01" }), target())[0]).toMatch(
      /requires 16\+/,
    );
  });
  it("never blocks on grade, acknowledgments, transportation or days", () => {
    expect(
      hardChecks(candidate({ grade: 9, acknowledgments: [] }), target({ gradeMin: 10 })),
    ).toEqual([]);
  });
});

describe("soft checks (lower the score)", () => {
  it("flags below the grade minimum unless an 8th grader turns 14 by June 1", () => {
    expect(flags(candidate({ grade: 9 }), target({ gradeMin: 10 }))[0]).toMatch(/below/);
    const t = target({
      gradeMin: 9,
      wbl: hydrateWbl({
        site: { vaccinations: "Flu shot" },
        schedule: { modality: "in_person", totalHours: "80" },
      }),
    });
    const acks8 = acknowledgmentsFor(t);
    expect(
      flags(candidate({ grade: 8, dateOfBirth: "2013-02-01", acknowledgments: acks8 }), t),
    ).toEqual([]);
    expect(
      flags(candidate({ grade: 8, dateOfBirth: "2013-09-01", acknowledgments: acks8 }), t)[0],
    ).toMatch(/below/);
  });
  it("flags missing acknowledgments", () => {
    expect(
      flags(candidate({ acknowledgments: [] }), target()).some((f) => /not acknowledged/.test(f)),
    ).toBe(true);
  });
  it("flags transportation help the listing doesn't provide", () => {
    const c = candidate({ profile: { ...candidate().profile!, transportation: "needs_help" } });
    expect(flags(c, target()).some((f) => /transportation/.test(f))).toBe(true);
    expect(
      flags(c, target({ requirements: ["Transportation provided"] })).some((f) =>
        /transportation/.test(f),
      ),
    ).toBe(false);
  });
  it("flags days that never overlap and lowers the score", () => {
    const c = candidate({ profile: { ...candidate().profile!, availability: { days: ["Sat"] } } });
    expect(flags(c, target()).some((f) => /overlap/.test(f))).toBe(true);
    const m = match(c, target());
    expect(m.eligible).toBe(true);
    expect(m.score).toBeLessThan(score(c, target()).score);
  });
});

describe("scoring", () => {
  it("scores a strong fit high and explains it", () => {
    const r = score(candidate(), target());
    expect(r.score).toBeGreaterThan(0.6);
    expect(r.why).toContain("#1 choice");
    expect(r.breakdown.riasec).toBeGreaterThan(0.8);
  });
  it("prefers the better interest fit, all else equal", () => {
    const good = candidate({ hollandCode: "ICS" });
    const weak = candidate({ studentId: "s2", hollandCode: "AER" });
    expect(score(good, target()).score).toBeGreaterThan(score(weak, target()).score);
  });
  it("renormalizes when the profile and passport are missing", () => {
    const bare = candidate({ profile: null, passport: null, rank: null });
    const r = score(bare, target());
    expect(Object.keys(r.breakdown)).toEqual(["riasec"]);
    expect(r.score).toBeCloseTo(r.breakdown.riasec!, 3);
  });
  it("ranks eligible candidates ahead of ineligible ones regardless of score", () => {
    const strongButUnderage = candidate({ studentId: "young", dateOfBirth: "2012-01-01" });
    const okay = candidate({ studentId: "ok", hollandCode: "SEC", rank: 3 });
    const ranked = rankFor(target(), [strongButUnderage, okay]);
    expect(ranked[0].studentId).toBe("ok");
    expect(ranked[1].eligible).toBe(false);
  });
});

describe("helpers", () => {
  it("derives acknowledgments from requirements and WBL detail", () => {
    const a = acknowledgmentsFor(target());
    expect(a).toContain("Closed-toed shoes required");
    expect(a.some((x) => /at least 16/.test(x))).toBe(true);
    expect(a.some((x) => /Flu shot/.test(x))).toBe(true);
  });
  it("turns14ByJune1 uses the June 1 cutoff", () => {
    expect(turns14ByJune1("2013-05-31", 2027)).toBe(true);
    expect(turns14ByJune1("2013-06-02", 2027)).toBe(false);
  });
  it("match marks eligibility", () => {
    expect(match(candidate(), target()).eligible).toBe(true);
  });
});
