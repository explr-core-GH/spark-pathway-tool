import { describe, expect, it } from "vitest";
import { checkBuilder, estimateMinutes, studentPaysItems } from "./guardrails";
import { listingFromOpportunity, riasecFromOpportunity } from "./listings";
import { matchListing, rankListings, type Applicant, type Listing } from "./match";
import {
  EMPTY_BUILDER,
  EMPTY_CHOICES,
  EMPTY_CORE,
  EMPTY_EXTRAS,
  type ApplicationBuilder,
} from "./types";
import { ageOn, isUnder18, validateCoreStep, wordCount, youEmailFlags } from "./validate";

const NOW = new Date(2026, 9, 19);

function goodBuilder(): ApplicationBuilder {
  return {
    ...structuredClone(EMPTY_BUILDER),
    profile: {
      ...structuredClone(EMPTY_BUILDER.profile),
      title: "Newsroom Intern",
      description:
        "Work with our reporters to find local stories, interview neighbors, take photos, and publish short pieces on our website every week of the summer.",
      weekly: ["Pitch a story", "Interview a neighbor", "Edit photos"],
      learnEarn: "Interviewing, AP style, a published clip",
      careerFields: ["arts_comm"],
      environment: { team: 4, screen: 3, structure: 3, outdoors: 2, pace: 4 },
      seats: 3,
      startDate: "2027-06-14",
      endDate: "2027-07-23",
      dailyHours: "9-2",
      address: "123 Main St, Cleveland",
    },
    questions: [
      { id: "B-01", prompt: "What made you interested?", kind: "text", options: [], maxWords: 100 },
      { id: "B-08", prompt: "Headline", kind: "text", options: [], maxWords: 75 },
    ],
    requirements: [{ key: "photo_id" }],
  };
}

describe("validate", () => {
  it("counts words and ages", () => {
    expect(wordCount("  one two   three ")).toBe(3);
    expect(ageOn("2010-10-20", NOW)).toBe(15);
    expect(ageOn("2010-10-19", NOW)).toBe(16);
    expect(isUnder18({ dob: "2008-01-01" }, NOW)).toBe(false);
    expect(isUnder18({ dob: "" }, NOW)).toBe(true);
  });

  it("requires the YOU email and guardian consent for minors", () => {
    const about = validateCoreStep("about", { ...EMPTY_CORE }, NOW);
    expect(about.youEmail).toBeTruthy();
    const minor = {
      ...EMPTY_CORE,
      dob: "2010-05-01",
      emergencyName: "A",
      emergencyPhone: "2165550100",
      consentStudent: true,
      consentStudentName: "Theo",
    };
    const support = validateCoreStep("support", minor, NOW);
    expect(support.guardianName).toBeTruthy();
    expect(support.consentGuardian).toBeTruthy();
    const adult = { ...minor, dob: "2007-05-01" };
    expect(validateCoreStep("support", adult, NOW)).toEqual({});
  });

  it("enforces 75-150 words on short answers", () => {
    const e = validateCoreStep(
      "story",
      { ...EMPTY_CORE, madeFixed: "too short", hopeToGet: "word ".repeat(80) },
      NOW,
    );
    expect(e.madeFixed).toMatch(/at least 75/);
    expect(e.hopeToGet).toBeUndefined();
  });

  it("flags duplicate and near-match YOU emails", () => {
    const flags = youEmailFlags("theo.m@gmail.com", [
      { id: "1", email: "Theo.M@gmail.com" },
      { id: "2", email: "theo.n@gmail.com" },
      { id: "3", email: "someone@else.org" },
    ]);
    expect(flags.map((f) => f.kind)).toEqual(["duplicate", "near"]);
  });
});

describe("guardrails", () => {
  it("passes a clean builder", () => {
    const r = checkBuilder(goodBuilder());
    expect(r.errors).toEqual([]);
    expect(r.minutes).toBe(estimateMinutes(goodBuilder()));
  });

  it("blocks protected topics and cutoffs in custom questions", () => {
    const b = goodBuilder();
    b.questions.push({
      id: "custom-1",
      prompt: "What is your religion?",
      kind: "text",
      options: [],
      custom: true,
    });
    b.questions.push({
      id: "custom-2",
      prompt: "What is your GPA?",
      kind: "text",
      options: [],
      custom: true,
    });
    const msgs = checkBuilder(b)
      .errors.map((e) => e.message)
      .join(" | ");
    expect(msgs).toMatch(/religion/);
    expect(msgs).toMatch(/GPA/);
  });

  it("caps custom questions, words and added time", () => {
    const b = goodBuilder();
    b.questions = [
      { id: "custom-1", prompt: "a", kind: "text", options: [], custom: true },
      { id: "custom-2", prompt: "b", kind: "text", options: [], custom: true },
      { id: "custom-3", prompt: "word ".repeat(31), kind: "text", options: [], custom: true },
    ];
    const msgs = checkBuilder(b)
      .errors.map((e) => e.message)
      .join(" | ");
    expect(msgs).toMatch(/up to 2 questions/);
    expect(msgs).toMatch(/under 30 words/);
    const long = goodBuilder();
    long.questions = ["B-01", "B-03", "B-04", "B-06", "B-08"].map((id) => ({
      id,
      prompt: id,
      kind: "text" as const,
      options: id === "B-04" ? ["A problem"] : [],
      optional: id === "B-06",
    }));
    expect(checkBuilder(long).errors.some((e) => /minutes/.test(e.message))).toBe(true);
  });

  it("requires who pays, essential physical demands and age reasons", () => {
    const b = goodBuilder();
    b.requirements = [{ key: "steel_toe" }, { key: "lifting", detail: "25 lb" }];
    b.age = { min: 16, max: null, reason: "" };
    const msgs = checkBuilder(b)
      .errors.map((e) => e.message)
      .join(" | ");
    expect(msgs).toMatch(/who pays/);
    expect(msgs).toMatch(/essential/);
    expect(msgs).toMatch(/age limit needs a reason/);
    b.requirements = [{ key: "steel_toe", whoPays: "student" }];
    expect(studentPaysItems(b)).toEqual(["Steel-toed boots"]);
  });

  it("keeps uploads optional", () => {
    const b = goodBuilder();
    b.questions = [{ id: "B-05", prompt: "Share", kind: "upload", options: [], optional: false }];
    expect(checkBuilder(b).errors.some((e) => /optional/.test(e.message))).toBe(true);
  });
});

function applicant(over: Partial<Applicant> = {}): Applicant {
  return {
    core: { dob: "2010-03-01", gradeFall: "11", allWeeks: true, transport: ["transit"] },
    extras: {
      ...structuredClone(EMPTY_EXTRAS),
      fields: ["arts_comm"],
      environment: { team: 4, screen: 3, structure: 3, outdoors: 2, pace: 4 },
    },
    scaleScores: { R: 2, I: 3, A: 4.6, S: 3.5, E: 3, C: 2 },
    hollandCode: "ASI",
    itemResponses: { A3: 5, A4: 5, I6: 2 },
    openNeedHelp: [],
    ...over,
  };
}

const NEWS: Listing = {
  ref: "opp:news",
  name: "Newsroom",
  riasec: { A: 3, S: 2, E: 1 },
  careerFields: ["arts_comm"],
  environment: { team: 4, screen: 3, structure: 3, outdoors: 2, pace: 4 },
  ageMin: null,
  ageMax: null,
  startDate: "2027-06-14",
  gradeMin: 9,
  gradeMax: 12,
};
const LAB: Listing = {
  ...NEWS,
  ref: "opp:lab",
  name: "Lab",
  riasec: { I: 3, R: 2, C: 1 },
  careerFields: ["engineering_science"],
  environment: { team: 1, screen: 2, structure: 1, outdoors: 1, pace: 1 },
};

describe("matching", () => {
  it("ranks the better fit first", () => {
    const ranked = rankListings(applicant(), [LAB, NEWS], NOW);
    expect(ranked[0].ref).toBe("opp:news");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    expect(ranked[0].why).toMatch(/Arts and Communication/);
  });

  it("uses age as the only hard filter", () => {
    const young = applicant({
      core: { dob: "2012-01-01", gradeFall: "8", allWeeks: false, transport: ["not_sure"] },
    });
    const m = matchListing(young, { ...NEWS, ageMin: 16 }, NOW);
    expect(m.eligible).toBe(false);
    expect(m.blockedLabel).toBe("Opens at 16");
    const noAge = matchListing(young, NEWS, NOW);
    expect(noAge.eligible).toBe(true);
    expect(noAge.adjustments.map((a) => a.label)).toEqual(
      expect.arrayContaining(["Can't work every week", "Grade outside the listing's range"]),
    );
  });

  it("lowers the score for open 'I'd need help' answers, capped", () => {
    const base = matchListing(applicant(), NEWS, NOW).score;
    const one = matchListing(applicant({ openNeedHelp: ["steel_toe"] }), NEWS, NOW).score;
    const many = matchListing(
      applicant({ openNeedHelp: ["a", "b", "c", "d", "e"] }),
      NEWS,
      NOW,
    ).score;
    expect(one).toBeCloseTo(base - 0.05, 2);
    expect(many).toBeCloseTo(base - 0.15, 2);
  });

  it("reads activity-time weights and builder data from an opportunity", () => {
    expect(
      riasecFromOpportunity({ riasec_weights: { helping: 20, organizing: 30 }, riasec_code: null }),
    ).toEqual({ S: 20, C: 30 });
    const l = listingFromOpportunity(
      {
        id: "x",
        org_id: "o",
        name: "Old",
        description: "",
        start_date: "2027-06-01",
        end_date: null,
        grade_min: 10,
        grade_max: 12,
        riasec_code: "ICS",
        riasec_weights: null,
        status: "approved",
        wbl: { legal: { minAge: "16" } },
      },
      {
        profile: { title: "New title", careerFields: ["health"] },
        age: { min: null, max: null, reason: "" },
      },
    );
    expect(l.name).toBe("New title");
    expect(l.careerFields).toEqual(["health"]);
    expect(l.ageMin).toBe(16);
  });
});

describe("demo sample answers", async () => {
  const { DEMO_CORE, DEMO_EXTRAS, demoChoices, demoPartnerAnswers, demoPartnerBuilder } =
    await import("./demo-fill");
  const { GENERAL_STEPS, validateExtras } = await import("./validate");
  const content = await import("./content");
  it("pass every general-application step", () => {
    for (const s of GENERAL_STEPS)
      if (!["demographics", "survey", "matches", "review"].includes(s.key))
        expect(validateCoreStep(s.key, DEMO_CORE, NOW)).toEqual({});
    expect(
      validateExtras(DEMO_EXTRAS, {
        activities: content.ACTIVITY_ITEMS.length,
        pairs: content.FORCED_PAIRS.length,
        environment: content.ENVIRONMENT_DIMS.length,
        experience: content.EXPERIENCE_ITEMS.length,
      }),
    ).toEqual({});
    expect(
      demoChoices(["opp:a", "opp:b", "opp:c"], structuredClone(EMPTY_CHOICES)).ranked,
    ).toHaveLength(2);
  });
  it("produce a publishable partner application and complete answers", () => {
    const b = demoPartnerBuilder("2027-06-14", "2027-08-06", "1 Main St");
    expect(checkBuilder(b).errors).toEqual([]);
    const a = demoPartnerAnswers(b);
    expect(Object.keys(a.requirements)).toHaveLength(b.requirements.length);
    expect(Object.values(a.requirements)).toContain("help");
  });
});
