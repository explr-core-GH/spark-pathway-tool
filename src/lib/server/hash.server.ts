import { createHash } from "node:crypto";

/**
 * Peppered SHA-256 helpers shared by explore logins, family codes,
 * attestation links and the demo seeder. The hash inputs are fixed:
 * changing a template string here invalidates every stored hash.
 * The service-role key stays as a fallback so existing hashes keep working,
 * but there is no public constant fallback.
 */

function pepperFrom(name: string): string {
  const v = process.env[name] ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!v) throw new Error(`Server is missing ${name}`);
  return v;
}

export const sha256Hex = (s: string) => createHash("sha256").update(s).digest("hex");

export const explorePepper = () => pepperFrom("EXPLORE_LOGIN_PEPPER");
export const familyPepper = () => pepperFrom("FAMILY_CODE_PEPPER");
export const attestationPepper = () => pepperFrom("ATTESTATION_PEPPER");

/** Picture-login secret: `secret:<loginId>:<shapes>:<pepper>`. */
export const exploreSecretHash = (loginId: string, seq: readonly string[]) =>
  sha256Hex(`secret:${loginId}:${seq.join(",")}:${explorePepper()}`);
/** Passport-card QR token: `token:<token>:<pepper>`. */
export const exploreTokenHash = (token: string) => sha256Hex(`token:${token}:${explorePepper()}`);
/** Family code; pass the already-normalized code. */
export const familyCodeHash = (normalizedCode: string) =>
  sha256Hex(`family-code:${normalizedCode}:${familyPepper()}`);
export const familySessionHash = (t: string) => sha256Hex(`family-session:${t}:${familyPepper()}`);
/** Supervisor stamp link token. */
export const attestationTokenHash = (t: string) => sha256Hex(`attest:${t}:${attestationPepper()}`);
