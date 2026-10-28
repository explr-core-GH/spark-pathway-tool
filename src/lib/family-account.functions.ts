import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  consentInput,
  guardianIdInput,
  linkChildInput,
  studentIdInput,
  type Relationship,
} from "./family-account.schemas";

/**
 * Guardian (family) accounts. A signed-in guardian links to any number of
 * students by entering each student's family code once. Links are written
 * only here, with the service role; the family code is not consumed.
 * Everything a guardian sees is the same family view the code path shows.
 */

const INACTIVE_CODE = "That code isn't active. Ask your student for a new one.";
const BAD_CODE = "That code doesn't look right. It's EXPLR- followed by 6 letters and numbers.";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function requireGuardianRow(userId: string) {
  const db = await admin();
  const { data } = await db
    .from("guardians")
    .select("id, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (!data) throw new Error("Create a family account first, then add your child.");
  return data;
}

async function requireLinked(guardianId: string, studentId: string) {
  const { isGuardianOf } = await import("./server/family-view.server");
  if (!(await isGuardianOf(await admin(), guardianId, studentId)))
    throw new Error("You're not linked to this student.");
}

/** Guardian: link a child by entering the child's family code. */
export const linkChildWithCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => linkChildInput.parse(input))
  .handler(async ({ data, context }) => {
    const { rateLimit } = await import("./server/rate-limit.server");
    await rateLimit("linkChildWithCode", 20, 600);
    await requireGuardianRow(context.userId);
    const db = await admin();
    const since = new Date(Date.now() - 86400000).toISOString();
    const { count } = await db
      .from("guardian_students")
      .select("student_id", { count: "exact", head: true })
      .eq("guardian_id", context.userId)
      .gte("linked_at", since);
    if ((count ?? 0) >= 10)
      throw new Error("You've added the most children allowed today. Try again tomorrow.");

    const { normalize } = await import("./family.functions");
    const { familyCodeHash } = await import("./server/hash.server");
    const norm = normalize(data.code);
    if (norm.length !== 6) throw new Error(BAD_CODE);
    const { data: link } = await db
      .from("family_links")
      .select("id, student_id, expires_at, revoked_at")
      .eq("code_hash", familyCodeHash(norm))
      .maybeSingle();
    if (!link || link.revoked_at || new Date(link.expires_at) < new Date())
      throw new Error(INACTIVE_CODE);

    const nowIso = new Date().toISOString();
    const { data: existing } = await db
      .from("guardian_students")
      .select("student_id")
      .eq("guardian_id", context.userId)
      .eq("student_id", link.student_id)
      .maybeSingle();
    const row = {
      relationship: data.relationship,
      linked_at: nowIso,
      linked_via_family_link_id: link.id,
      revoked_at: null,
      revoked_by: null,
    };
    const { error } = existing
      ? await db
          .from("guardian_students")
          .update(row)
          .eq("guardian_id", context.userId)
          .eq("student_id", link.student_id)
      : await db
          .from("guardian_students")
          .insert({ ...row, guardian_id: context.userId, student_id: link.student_id });
    if (error) throw new Error(error.message);
    await db.from("family_links").update({ last_used_at: nowIso }).eq("id", link.id);
    const { data: st } = await db
      .from("students")
      .select("first_name, grade")
      .eq("id", link.student_id)
      .maybeSingle();
    return { firstName: st?.first_name ?? "Your student", grade: st?.grade ?? null };
  });

/** Guardian: confirm they are the parent/legal guardian and consent to participation. */
export const recordGuardianConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => consentInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireLinked(context.userId, data.studentId);
    const { clientIp } = await import("./server/rate-limit.server");
    const ip = clientIp();
    const { error } = await (await admin()).from("guardian_consents").insert({
      guardian_id: context.userId,
      student_id: data.studentId,
      text_version: data.textVersion,
      ip: ip === "unknown" ? null : ip,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type GuardianChild = {
  studentId: string;
  firstName: string;
  grade: number | null;
  relationship: Relationship;
  linkedAt: string;
  consented: boolean;
  verifiedHours: number;
  stampCount: number;
  openCheckpoints: number;
};

/** Guardian: profile plus linked (unrevoked) children, newest first. */
export const getGuardianHome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    const { data: guardian } = await db
      .from("guardians")
      .select("full_name, email, phone")
      .eq("id", context.userId)
      .maybeSingle();
    if (!guardian) throw new Error("This area is for families.");
    const { data: links } = await db
      .from("guardian_students")
      .select("student_id, relationship, linked_at")
      .eq("guardian_id", context.userId)
      .is("revoked_at", null)
      .order("linked_at", { ascending: false });
    const ids = (links ?? []).map((l) => l.student_id);
    if (ids.length === 0) return { guardian, children: [] as GuardianChild[] };
    const [{ data: students }, { data: consents }, { data: exps }, { data: cps }] =
      await Promise.all([
        db.from("students").select("id, first_name, grade").in("id", ids),
        db
          .from("guardian_consents")
          .select("student_id")
          .eq("guardian_id", context.userId)
          .in("student_id", ids),
        db
          .from("experiences")
          .select("student_id, verified_hours")
          .in("student_id", ids)
          .eq("status", "verified"),
        db.from("checkpoints").select("student_id").in("student_id", ids).eq("status", "open"),
      ]);
    const children: GuardianChild[] = (links ?? []).map((l) => {
      const st = (students ?? []).find((s) => s.id === l.student_id);
      const mine = (exps ?? []).filter((e) => e.student_id === l.student_id);
      return {
        studentId: l.student_id,
        firstName: st?.first_name ?? "Your student",
        grade: st?.grade ?? null,
        relationship: l.relationship as Relationship,
        linkedAt: l.linked_at,
        consented: (consents ?? []).some((c) => c.student_id === l.student_id),
        verifiedHours: mine.reduce((n, e) => n + Number(e.verified_hours ?? 0), 0),
        stampCount: mine.length,
        openCheckpoints: (cps ?? []).filter((c) => c.student_id === l.student_id).length,
      };
    });
    return { guardian, children };
  });

/** Guardian: the same family view the code path shows, for a linked child. */
export const getGuardianStudentView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => studentIdInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireLinked(context.userId, data.studentId);
    const { buildFamilyView } = await import("./server/family-view.server");
    return buildFamilyView(context.supabase, data.studentId, null);
  });

/** Guardian: sign off on this year's plan; records who signed. */
export const guardianAckPlanForStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => studentIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const g = await requireGuardianRow(context.userId);
    await requireLinked(context.userId, data.studentId);
    const { currentSchoolYear } = await import("./server/family-view.server");
    const { error } = await (await admin()).from("plan_approvals").upsert(
      {
        student_id: data.studentId,
        school_year: currentSchoolYear(),
        guardian_ack_at: new Date().toISOString(),
        guardian_id: context.userId,
        method: `guardian_account:${g.full_name}`,
      },
      { onConflict: "student_id,school_year" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Guardian: remove their own link to a child. */
export const unlinkChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => studentIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await (await admin())
      .from("guardian_students")
      .update({ revoked_at: new Date().toISOString(), revoked_by: "guardian" })
      .eq("guardian_id", context.userId)
      .eq("student_id", data.studentId)
      .is("revoked_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type ConnectedGuardian = {
  guardianId: string;
  fullName: string;
  relationship: Relationship;
  linkedAt: string;
};

/** Student: who is connected to my passport (guardian name only). */
export const listMyGuardians = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: links } = await context.supabase
      .from("guardian_students")
      .select("guardian_id, relationship, linked_at")
      .eq("student_id", context.userId)
      .is("revoked_at", null)
      .order("linked_at", { ascending: false });
    const ids = (links ?? []).map((l) => l.guardian_id);
    if (ids.length === 0) return [] as ConnectedGuardian[];
    const { data: names } = await (await admin())
      .from("guardians")
      .select("id, full_name")
      .in("id", ids);
    return (links ?? []).map<ConnectedGuardian>((l) => ({
      guardianId: l.guardian_id,
      fullName: (names ?? []).find((n) => n.id === l.guardian_id)?.full_name ?? "A family member",
      relationship: l.relationship as Relationship,
      linkedAt: l.linked_at,
    }));
  });

/** Student: remove a guardian's access (RLS: student may update only their own rows). */
export const removeMyGuardian = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => guardianIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("guardian_students")
      .update({ revoked_at: new Date().toISOString(), revoked_by: "student" })
      .eq("student_id", context.userId)
      .eq("guardian_id", data.guardianId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
