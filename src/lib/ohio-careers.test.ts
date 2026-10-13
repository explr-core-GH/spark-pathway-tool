import { describe, expect, it } from "vitest";
import data from "@/data/ohio-careers.json";
import {
  careersForInterest,
  careersInCluster,
  educationShort,
  growthLabel,
  kidCareersFor,
  matchCareers,
  startingPay,
  type OhioCareersData,
} from "./ohio-careers";

const d = data as unknown as OhioCareersData;

describe("ohio careers data", () => {
  it("has every cluster, interest group, and hundreds of Ohio jobs with interest profiles", () => {
    expect(d.clusters).toHaveLength(16);
    expect(d.interests).toHaveLength(8);
    expect(d.occupations.length).toBeGreaterThan(500);
    expect(d.occupations.every((o) => o.riasec && o.wageAnnual > 0 && o.cluster)).toBe(true);
  });
  it("matches a social-investigative code to health and education careers", () => {
    const top = matchCareers(d, { code: "SIA" }, { limit: 10 });
    expect(top.length).toBe(10);
    expect(top[0].fit).toBeGreaterThan(0.8);
    const clusters = new Set(top.map((m) => m.career.cluster));
    expect(
      [...clusters].some((c) =>
        ["health_science", "education_training", "human_services"].includes(c),
      ),
    ).toBe(true);
  });
  it("prefers realistic jobs for a Doer profile", () => {
    const top = matchCareers(
      d,
      { scores: { R: 4.8, I: 2.1, A: 1.5, S: 1.8, E: 2.0, C: 2.9 } },
      { limit: 5 },
    );
    expect(top.every((m) => m.career.riasec!.code.includes("R"))).toBe(true);
  });
  it("filters by cluster and interest group", () => {
    expect(careersInCluster(d, "health_science").every((c) => c.cluster === "health_science")).toBe(
      true,
    );
    const helping = careersForInterest(d, "helping_people");
    expect(helping.length).toBeGreaterThan(50);
  });
  it("returns kid cards ranked for a code", () => {
    const kids = kidCareersFor(d, { code: "IRC" }, 6);
    expect(kids).toHaveLength(6);
  });
  it("formats plain-language labels", () => {
    expect(startingPay(60000)).toBe(42000);
    expect(growthLabel(12).tone).toBe("up");
    expect(growthLabel(-5).tone).toBe("down");
    expect(educationShort("Associate's degree")).toBe("Associate's (2 yr)");
  });
});
