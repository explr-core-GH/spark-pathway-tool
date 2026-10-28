import { describe, expect, it } from "vitest";
import { linkChildInput } from "./family-account.schemas";
import { resolveRole, type RoleFacts } from "./role-resolution";
import { buildFamilyView, type Db } from "./server/family-view.server";

describe("linkChildWithCode input", () => {
  it("accepts a code and a known relationship", () => {
    expect(linkChildInput.parse({ code: " EXPLR-7K4P2M ", relationship: "grandparent" })).toEqual({
      code: "EXPLR-7K4P2M",
      relationship: "grandparent",
    });
  });
  it("rejects an unknown relationship", () => {
    expect(() => linkChildInput.parse({ code: "EXPLR-7K4P2M", relationship: "uncle" })).toThrow();
  });
  it("rejects a missing or too-long code", () => {
    expect(() => linkChildInput.parse({ relationship: "parent" })).toThrow();
    expect(() => linkChildInput.parse({ code: "abc", relationship: "parent" })).toThrow();
    expect(() =>
      linkChildInput.parse({ code: "EXPLR-7K4P2M-TOO-LONG-X", relationship: "parent" }),
    ).toThrow();
  });
});

describe("resolveRole", () => {
  const base: RoleFacts = {
    signedIn: true,
    isAdmin: false,
    educator: null,
    isStudent: false,
    isGuardian: false,
    isOrg: false,
  };
  it("lets a guardian into guardian pages", () => {
    expect(resolveRole("guardian", { ...base, isGuardian: true })).toBe("allow");
  });
  it("keeps a guardian with no student row out of student pages", () => {
    expect(resolveRole("student", { ...base, isGuardian: true })).toBe("guardian-on-student");
  });
  it("keeps an organization with no student row out of student pages", () => {
    expect(resolveRole("student", { ...base, isOrg: true })).toBe("org-on-student");
  });
  it("keeps a student out of guardian pages", () => {
    expect(resolveRole("guardian", { ...base, isStudent: true })).toBe("not-guardian");
  });
  it("sends signed-out visitors to sign in", () => {
    expect(resolveRole("guardian", { ...base, signedIn: false })).toBe("signed-out");
  });
});

/** Minimal chainable mock of the query builder, returning a fixture per table. */
function mockDb(fixtures: Record<string, unknown>): Db {
  const from = (table: string) => {
    const result = { data: fixtures[table] ?? null, error: null };
    const chain: Record<string, unknown> = {};
    for (const m of ["select", "eq", "not", "order", "limit", "in", "is"])
      chain[m] = () => chain;
    chain.maybeSingle = () => Promise.resolve(result);
    chain.then = (res: (v: typeof result) => unknown) => Promise.resolve(result).then(res);
    return chain;
  };
  return { from } as unknown as Db;
}

describe("buildFamilyView parity", () => {
  it("gives the same view on the code path and the account path", async () => {
    const db = mockDb({
      students: { first_name: "Amara", grade: 11 },
      assessment_sessions: { holland_code: "RIS", scale_scores: { R: 9 }, completed_at: "x" },
      survey_responses: [{ id: "s1" }],
      checkpoints: [{ term: "fall", status: "open", submitted_at: null }],
      plan_approvals: { student_ack_at: "a", guardian_ack_at: null, advisor_ack_at: null },
      experiences: [
        { title: "Pharmacy", organization: "Lakeshore", verified_hours: "80", verified_at: "v" },
      ],
    });
    const now = new Date("2026-10-28T12:00:00Z");
    const viaCode = await buildFamilyView(db, "stu", "2026-11-27T00:00:00Z", now);
    const viaAccount = await buildFamilyView(db, "stu", null, now);
    const { expiresAt: a, ...codeRest } = viaCode;
    const { expiresAt: b, ...accountRest } = viaAccount;
    expect(codeRest).toEqual(accountRest);
    expect(a).toBe("2026-11-27T00:00:00Z");
    expect(b).toBeNull();
    expect(viaAccount.verified[0].hours).toBe(80);
    expect(viaAccount.plan.schoolYear).toBe("2026-27");
  });
});
