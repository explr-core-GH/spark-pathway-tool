import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { lockMinutesFor } from "./explore-lockout";
import { storagePath } from "./storage-paths";
import { publicOriginFromHost } from "./server/origin.server";
import {
  attestationTokenHash,
  exploreSecretHash,
  exploreTokenHash,
  familyCodeHash,
  familySessionHash,
} from "./server/hash.server";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

describe("email link origin", () => {
  it("allows the EXPLR domains, Lovable hosts and localhost", () => {
    expect(publicOriginFromHost("explrpathways.org")).toBe("https://explrpathways.org");
    expect(publicOriginFromHost("www.explrpathways.org")).toBe("https://www.explrpathways.org");
    expect(publicOriginFromHost("pathwaysk12.lovable.app")).toBe("https://pathwaysk12.lovable.app");
    expect(publicOriginFromHost("abc.lovableproject.com")).toBe("https://abc.lovableproject.com");
    expect(publicOriginFromHost("abc.lovableproject-dev.com")).toBe(
      "https://abc.lovableproject-dev.com",
    );
    expect(publicOriginFromHost("localhost:8080")).toBe("http://localhost:8080");
  });
  it("falls back to explrpathways.org for anything else", () => {
    expect(publicOriginFromHost("evil.com")).toBe("https://explrpathways.org");
    expect(publicOriginFromHost("explrpathways.org.evil.com")).toBe("https://explrpathways.org");
    expect(publicOriginFromHost("lovable.app.evil.com")).toBe("https://explrpathways.org");
    expect(publicOriginFromHost(null)).toBe("https://explrpathways.org");
  });
});

describe("picture sign-in lock doubles", () => {
  it("locks 15, 30, 60, 120 minutes, capped at 24 hours", () => {
    expect(lockMinutesFor(5)).toBe(15);
    expect(lockMinutesFor(10)).toBe(30);
    expect(lockMinutesFor(15)).toBe(60);
    expect(lockMinutesFor(20)).toBe(120);
    expect(lockMinutesFor(500)).toBe(1440);
  });
});

describe("hash peppers", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });
  it("keeps the exact sha256 inputs", () => {
    process.env.EXPLORE_LOGIN_PEPPER = "p1";
    process.env.FAMILY_CODE_PEPPER = "p2";
    process.env.ATTESTATION_PEPPER = "p3";
    expect(exploreSecretHash("L", ["star", "leaf"])).toBe(sha("secret:L:star,leaf:p1"));
    expect(exploreTokenHash("T")).toBe(sha("token:T:p1"));
    expect(familyCodeHash("ABC123")).toBe(sha("family-code:ABC123:p2"));
    expect(familySessionHash("S")).toBe(sha("family-session:S:p2"));
    expect(attestationTokenHash("A")).toBe(sha("attest:A:p3"));
  });
  it("falls back to the service-role key", () => {
    delete process.env.ATTESTATION_PEPPER;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "srk";
    expect(attestationTokenHash("A")).toBe(sha("attest:A:srk"));
  });
  it("throws instead of using a public constant", () => {
    delete process.env.ATTESTATION_PEPPER;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => attestationTokenHash("A")).toThrow("Server is missing ATTESTATION_PEPPER");
  });
});

describe("private file paths", () => {
  it("unwraps legacy public URLs and keeps bare paths", () => {
    expect(
      storagePath("student-photos", "https://x.supabase.co/storage/v1/object/public/student-photos/u1/a.jpg"),
    ).toBe("u1/a.jpg");
    expect(storagePath("student-photos", "u1/a.jpg")).toBe("u1/a.jpg");
    expect(storagePath("student-photos", "https://elsewhere.com/a.jpg")).toBeNull();
  });
});
