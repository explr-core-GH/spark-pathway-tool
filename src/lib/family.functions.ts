import { createServerFn } from "@tanstack/react-start";
import { randomBytes, randomInt } from "node:crypto";
import { familyCodeHash, familySessionHash } from "./server/hash.server";
import { rateLimit } from "./server/rate-limit.server";
import { z } from "zod";
import { normalize } from "./family-code";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Tables newer than the generated Database type go through an untyped accessor.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabaseAdmin.from as unknown as (n: string) => any)(table);

/**
 * Family codes.
 *
 * A student generates a short code (EXPLR-XXXXXX) from their dashboard and
 * shares it with a caregiver. The caregiver enters it on /family, which
 * opens a read-only view of the student's completed results for 30 days,
 * no account needed. Only hashes are stored; the code is shown once.
 *
 * Codes expire after 90 days and can be revoked by the student at any time;
 * revoking a code ends every family session that came from it.
 */

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L
const CODE_LEN = 6;
const hashCode = (code: string) => familyCodeHash(normalize(code));
const hashToken = (t: string) => familySessionHash(t);

export { normalize };
function makeCode(): string {
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `EXPLR-${s}`;
}

export type FamilyCodeRow = {
  id: string;
  label: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

/** Student: create a new family code. Returned in plaintext exactly once. */
export const createFamilyCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z.object({ label: z.string().trim().max(40).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: student } = await sb("students")
      .select("id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!student) throw new Error("Only students can create family codes");
    for (let i = 0; i < 10; i++) {
      const code = makeCode();
      const { error } = await sb("family_links").insert({
        student_id: context.userId,
        code_hash: hashCode(code),
        label: data.label || null,
      });
      if (!error) return { code };
      if (!/duplicate|unique/i.test(error.message)) throw new Error(error.message);
    }
    throw new Error("Could not create a code");
  });

/** Student: list my codes (never the codes themselves). */
export const listFamilyCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await sb("family_links")
      .select("id, label, created_at, expires_at, revoked_at, last_used_at")
      .eq("student_id", context.userId)
      .order("created_at", { ascending: false });
    return (
      (data ?? []) as {
        id: string;
        label: string | null;
        created_at: string;
        expires_at: string;
        revoked_at: string | null;
        last_used_at: string | null;
      }[]
    ).map<FamilyCodeRow>((r) => ({
      id: r.id,
      label: r.label,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      revokedAt: r.revoked_at,
      lastUsedAt: r.last_used_at,
    }));
  });

/** Student: revoke a code and every session that came from it. */
export const revokeFamilyCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await sb("family_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("student_id", context.userId);
    if (error) throw new Error(error.message);
    await sb("family_sessions").delete().eq("family_link_id", data.id);
    return { ok: true };
  });

/** Caregiver: exchange a code for a 30-day family session token. */
export const redeemFamilyCode = createServerFn({ method: "POST" })
  .validator((input) => z.object({ code: z.string().min(4).max(20) }).parse(input))
  .handler(async ({ data }) => {
    await rateLimit("redeemFamilyCode", 20, 600);
    if (normalize(data.code).length !== CODE_LEN)
      throw new Error(
        "That code doesn't look right. It's EXPLR- followed by 6 letters and numbers.",
      );
    const { data: row } = await sb("family_links")
      .select("id, student_id, expires_at, revoked_at")
      .eq("code_hash", hashCode(data.code))
      .maybeSingle();
    const link = row as {
      id: string;
      student_id: string;
      expires_at: string;
      revoked_at: string | null;
    } | null;
    if (!link || link.revoked_at || new Date(link.expires_at) < new Date()) {
      throw new Error("That code isn't active. Ask your student for a new one.");
    }
    const token = randomBytes(32).toString("base64url");
    const { error } = await sb("family_sessions").insert({
      family_link_id: link.id,
      token_hash: hashToken(token),
    });
    if (error) throw new Error(error.message);
    await sb("family_links").update({ last_used_at: new Date().toISOString() }).eq("id", link.id);
    return { token };
  });

export type { FamilyView } from "./server/family-view.server";

async function sessionFor(token: string) {
  const { data: sess } = await sb("family_sessions")
    .select(
      "id, expires_at, family_link_id, family_links!inner(student_id, revoked_at, expires_at)",
    )
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  const s = sess as unknown as {
    id: string;
    expires_at: string;
    family_links: { student_id: string; revoked_at: string | null; expires_at: string };
  } | null;
  if (!s || new Date(s.expires_at) < new Date() || s.family_links.revoked_at) {
    throw new Error("This family link has expired. Ask your student for a new code.");
  }
  return s;
}

/** Caregiver: sign off on this year's plan (Ohio's guardian signature on the Student Success Plan). */
export const guardianAckPlan = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({ token: z.string().min(16).max(128), name: z.string().trim().min(1).max(120) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const s = await sessionFor(data.token);
    const { currentSchoolYear } = await import("./server/family-view.server");
    const sy = currentSchoolYear();
    const { error } = await sb("plan_approvals").upsert(
      {
        student_id: s.family_links.student_id,
        school_year: sy,
        guardian_ack_at: new Date().toISOString(),
        method: `family_code:${data.name}`,
      },
      { onConflict: "student_id,school_year" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Caregiver: the student's completed results for a valid family session. */
export const getFamilyView = createServerFn({ method: "POST" })
  .validator((input) => z.object({ token: z.string().min(16).max(128) }).parse(input))
  .handler(async ({ data }) => {
    const s = await sessionFor(data.token);
    const { buildFamilyView } = await import("./server/family-view.server");
    const view = await buildFamilyView(supabaseAdmin, s.family_links.student_id, s.expires_at);
    await sb("family_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", s.id);
    return view;
  });

/** Caregiver: end this device's family session (the code itself keeps working). */
export const endFamilySession = createServerFn({ method: "POST" })
  .validator((input) => z.object({ token: z.string().min(16).max(128) }).parse(input))
  .handler(async ({ data }) => {
    await sb("family_sessions").delete().eq("token_hash", hashToken(data.token));
    return { ok: true };
  });
