import { describe, expect, it } from "vitest";
import { hoursLogRows, openBadges, resumeText } from "./exports";
import type { Passport, Experience } from "./passport";
import { sealProgress } from "./competencies";

function exp(over: Partial<Experience>): Experience {
  return {
    id: "e1",
    student_id: "s1",
    source: "external",
    title: "Supply Chain Intern",
    organization: "Cleveland Clinic",
    role_title: "Intern",
    stage: "participation",
    experience_type: "internship_offsite_placement",
    career_cluster: "health",
    riasec_module: null,
    start_date: "2026-06-15",
    end_date: "2026-08-10",
    hours: 80,
    compensation_type: "paid",
    duties: "Tracked inventory.",
    reflection: null,
    supervisor_name: "M. Rivera",
    supervisor_email: "m@example.org",
    status: "verified",
    verified_at: "2026-08-12T10:00:00Z",
    verified_hours: 78,
    created_at: "2026-06-01T00:00:00Z",
    ...over,
  };
}

function passport(over: Partial<Passport> = {}): Passport {
  const experiences = [
    exp({}),
    exp({
      id: "e2",
      title: "Shadow day",
      stage: "exploration",
      experience_type: "job_shadow",
      status: "self_reported",
      verified_at: null,
      verified_hours: null,
    }),
  ];
  const ratings = [
    {
      id: "r1",
      experience_id: "e1",
      competency: "teamwork",
      omj_skill: "Teamwork/Collaboration",
      rating_baseline: null,
      rating_final: 3,
      setting: "work" as const,
      rater_name: "M. Rivera",
      rater_email: "m@example.org",
      comment: null,
      rated_at: "2026-08-12T10:00:00Z",
    },
  ];
  const seal = sealProgress(ratings);
  return {
    firstName: "Amara",
    grade: 11,
    band: "pro",
    aboutMe: null,
    joinedAt: "2025-09-01T00:00:00Z",
    hollandCode: "ICS",
    experiences,
    ratings,
    credentials: [],
    pieces: [],
    verifiedHours: 78,
    pendingHours: 0,
    seal,
    sealReadyCount: 0,
    skillsProficient: 1,
    exposure: experiences.filter((e) => e.stage === "exploration"),
    work: experiences.filter((e) => e.stage !== "exploration"),
    ...over,
  };
}

describe("exports", () => {
  it("hours log includes only verified rows and flags what counts", () => {
    const rows = hoursLogRows(passport());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: "Supply Chain Intern",
      hours: 78,
      counts: true,
      verifiedBy: "M. Rivera",
    });
  });
  it("hours do not count before grade 9", () => {
    expect(hoursLogRows(passport({ grade: 8 }))[0].counts).toBe(false);
  });
  it("resume text leads with the name and separates verified from other experience", () => {
    const t = resumeText(passport(), {
      fullName: "Amara Okafor",
      highSchool: "John Hay",
      gradYear: 2028,
    });
    expect(t.startsWith("Amara Okafor")).toBe(true);
    expect(t).toContain("VERIFIED EXPERIENCE");
    expect(t).toContain("Verified by M. Rivera");
    expect(t).toContain("CAREER EXPLORATION");
    expect(t).toContain("Teamwork/Collaboration (Proficient, supervisor-rated)");
  });
  it("open badges are one per verified experience and marked unsigned", () => {
    const b = openBadges(passport(), "https://explrpathways.org");
    expect(b).toHaveLength(1);
    expect(b[0].type).toContain("OpenBadgeCredential");
    expect(b[0]["x-explr-unsigned"]).toMatch(/not yet signed/);
    expect(b[0].credentialSubject.result[0].achievedLevel).toBe("Proficient");
  });
});
