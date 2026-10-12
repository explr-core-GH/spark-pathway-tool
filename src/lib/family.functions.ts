import { createServerFn } from "@tanstack/react-start";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { z } from "zod";
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
const pepper = () =>
  process.env.FAMILY_CODE_PEPPER ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "explr";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const hashCode = (code: string) => sha(`family-code:${normalize(code)}:${pepper()}`);
const hashToken = (t: string) => sha(`family-session:${t}:${pepper()}`);

export function normalize(code: string): string {
  return code
    .toUpperCase()
    .replace(/^EXPLR[-\s]*/, "")
    .replace(/[^A-Z0-9]/g, "");
}
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
  .inputValidator((input) =>
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
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
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
  .inputValidator((input) => z.object({ code: z.string().min(4).max(20) }).parse(input))
  .handler(async ({ data }) => {
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

export type FamilyView = {
  firstName: string;
  grade: number | null;
  riasec: { hollandCode: string; scaleScores: Record<string, number> } | null;
  stemDone: boolean;
  expiresAt: string;
  /** This school year's advising plan: checkpoint statuses and the three sign-offs. */
  plan: {
    schoolYear: string;
    checkpoints: Array<{ term: string; status: string; submittedAt: string | null }>;
    studentAckAt: string | null;
    guardianAckAt: string | null;
    advisorAckAt: string | null;
  };
  /** Verified work experiences, for the family to see what was stamped. */
  verified: Array<{
    title: string;
    organization: string | null;
    hours: number | null;
    verifiedAt: string | null;
  }>;
};

function currentSchoolYear(d = new Date()): string {
  const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${String(y + 1).slice(2)}`;
}

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
  .inputValidator((input) =>
    z
      .object({ token: z.string().min(16).max(128), name: z.string().trim().min(1).max(120) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const s = await sessionFor(data.token);
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
  .inputValidator((input) => z.object({ token: z.string().min(16).max(128) }).parse(input))
  .handler(async ({ data }) => {
    const s = await sessionFor(data.token);
    const studentId = s.family_links.student_id;
    const sy = currentSchoolYear();
    const [
      { data: student },
      { data: session },
      { data: stem },
      { data: cps },
      { data: appr },
      { data: ver },
    ] = await Promise.all([
      sb("students").select("first_name, grade").eq("id", studentId).maybeSingle(),
      sb("assessment_sessions")
        .select("holland_code, scale_scores, completed_at")
        .eq("student_id", studentId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb("survey_responses")
        .select("id")
        .eq("student_id", studentId)
        .not("completed_at", "is", null)
        .limit(1),
      sb("checkpoints")
        .select("term, status, submitted_at")
        .eq("student_id", studentId)
        .eq("school_year", sy),
      sb("plan_approvals")
        .select("student_ack_at, guardian_ack_at, advisor_ack_at")
        .eq("student_id", studentId)
        .eq("school_year", sy)
        .maybeSingle(),
      sb("experiences")
        .select("title, organization, verified_hours, verified_at")
        .eq("student_id", studentId)
        .eq("status", "verified")
        .order("verified_at", { ascending: false }),
    ]);
    const approval = appr as {
      student_ack_at: string | null;
      guardian_ack_at: string | null;
      advisor_ack_at: string | null;
    } | null;
    await sb("family_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", s.id);
    const st = student as { first_name: string | null; grade: number | null } | null;
    const view: FamilyView = {
      firstName: st?.first_name ?? "Your student",
      grade: st?.grade ?? null,
      riasec: session?.holland_code
        ? {
            hollandCode: session.holland_code,
            scaleScores: (session.scale_scores as Record<string, number>) ?? {},
          }
        : null,
      stemDone: ((stem ?? []) as unknown[]).length > 0,
      expiresAt: s.expires_at,
      plan: {
        schoolYear: sy,
        checkpoints: (
          (cps ?? []) as { term: string; status: string; submitted_at: string | null }[]
        ).map((c) => ({ term: c.term, status: c.status, submittedAt: c.submitted_at })),
        studentAckAt: approval?.student_ack_at ?? null,
        guardianAckAt: approval?.guardian_ack_at ?? null,
        advisorAckAt: approval?.advisor_ack_at ?? null,
      },
      verified: (
        (ver ?? []) as {
          title: string;
          organization: string | null;
          verified_hours: number | string | null;
          verified_at: string | null;
        }[]
      ).map((v) => ({
        title: v.title,
        organization: v.organization,
        hours: v.verified_hours === null ? null : Number(v.verified_hours),
        verifiedAt: v.verified_at,
      })),
    };
    return view;
  });
