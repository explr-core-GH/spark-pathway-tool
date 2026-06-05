import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Camp-student account generation.
 *
 * Camp kids have no email, so for each ExplrMore registration we mint an
 * auth account with a throwaway username + a simple, readable password
 * the educator prints and hands out. The generated student is linked to
 * its camp session (student_camp_links) so educator-targeted assessments
 * cascade to them.
 *
 * Service-role only — creating auth.users requires the admin API.
 */

// Untyped table access for tables not in the generated Database type.
const sba = (table: string) =>
  (supabaseAdmin.from as (n: string) => ReturnType<typeof supabaseAdmin.from>)(
    table,
  );

// Admin check against public.admins (the post-split admin table).
async function assertAdmin(userId: string) {
  const { data } = await sba("admins")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (!data) throw new Error("Admin access required");
}

// ── Credential generators ───────────────────────────────────────────────────

const ADJECTIVES = [
  "brave", "bright", "calm", "clever", "cosmic", "eager", "fair", "gentle",
  "happy", "jolly", "keen", "kind", "lucky", "merry", "noble", "proud",
  "quick", "smart", "sunny", "swift", "warm", "wise",
];
const ANIMALS = [
  "otter", "falcon", "panda", "tiger", "robin", "lynx", "moose", "heron",
  "koala", "gecko", "raven", "puma", "bison", "crane", "finch", "shark",
  "wolf", "hawk", "seal", "fox",
];

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randSuffix(len = 4): string {
  // no ambiguous chars (0/o/1/l) — these get read off a printed sheet.
  const chars = "23456789abcdefghjkmnpqrstuvwxyz";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function slugName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 14) || "camper";
}

/** A simple, readable password kids can type: "brave-otter-7". */
function makePassword(): string {
  return `${randItem(ADJECTIVES)}-${randItem(ANIMALS)}-${
    Math.floor(Math.random() * 9) + 1
  }`;
}

/** ExplrMore stores age; the students table wants a grade 5-12. Clamp. */
function ageToGrade(age: number | null): number {
  if (age == null || Number.isNaN(age)) return 6;
  return Math.min(12, Math.max(5, age - 5));
}

type RegistrationRow = {
  id: string;
  child_name: string;
  child_age: number | null;
};

export const generateCampLogins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { explrCampId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { explrCampId } = data;

    // 1. Registrations for this camp session.
    const { data: regs, error: regErr } = await sba("explr_registrations")
      .select("id, child_name, child_age")
      .eq("camp_id", explrCampId);
    if (regErr) throw new Error(`Roster lookup failed: ${regErr.message}`);
    const registrations = (regs ?? []) as RegistrationRow[];

    // 2. Pre-flight: confirm the auxiliary tables are reachable BEFORE we
    // start minting auth accounts. Previously a missing table aborted the
    // function mid-loop, after dozens of orphan auth.users rows had already
    // been created. Bail clean if either probe errors.
    {
      const linkProbe = await sba("student_camp_links")
        .select("student_id")
        .limit(1);
      if (linkProbe.error) {
        throw new Error(
          `student_camp_links unreachable — ${linkProbe.error.message}. ` +
            `Apply the camp-logins migration first.`,
        );
      }
      const logProbe = await sba("camp_student_logins")
        .select("id")
        .limit(1);
      if (logProbe.error) {
        throw new Error(
          `camp_student_logins unreachable — ${logProbe.error.message}. ` +
            `Apply the camp-logins migration first.`,
        );
      }
    }

    // Already-generated logins — skip those (idempotent re-run).
    const { data: existing } = await sba("camp_student_logins")
      .select("explr_registration_id")
      .eq("explr_camp_id", explrCampId);
    const done = new Set(
      ((existing ?? []) as Array<{ explr_registration_id: string | null }>)
        .map((r) => r.explr_registration_id)
        .filter((x): x is string => !!x),
    );

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Rollback helper — best-effort delete of an auth.users row we just
    // created when a subsequent step fails, so we don't leave a dangling
    // account with no recoverable password.
    async function rollback(uid: string): Promise<string> {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
      return error ? ` (rollback failed: ${error.message})` : "";
    }

    for (const reg of registrations) {
      if (done.has(reg.id)) {
        skipped++;
        continue;
      }
      try {
        const parts = reg.child_name.trim().split(/\s+/);
        const first = slugName(parts[0] ?? "camper");
        const last = slugName(parts[parts.length - 1] ?? "");
        const username = `${first}${last ? "-" + last : ""}-${randSuffix()}@camp.explr.local`;
        const password = makePassword();

        // 2a. Create the auth account.
        const { data: createdUser, error: cuErr } =
          await supabaseAdmin.auth.admin.createUser({
            email: username,
            password,
            email_confirm: true,
            user_metadata: {
              generated: true,
              source: "camp_login",
              child_name: reg.child_name,
            },
          });
        if (cuErr || !createdUser.user) {
          errors.push(`${reg.child_name}: ${cuErr?.message ?? "createUser failed"}`);
          continue;
        }
        const uid = createdUser.user.id;

        // 2b. students row.
        const { error: stuErr } = await supabaseAdmin
          .from("students")
          .upsert({
            id: uid,
            first_name: (parts[0] ?? reg.child_name).slice(0, 60),
            grade: ageToGrade(reg.child_age),
          });
        if (stuErr) {
          const rb = await rollback(uid);
          errors.push(`${reg.child_name}: students row — ${stuErr.message}${rb}`);
          continue;
        }

        // 2c. Link student → camp session (powers the educator cascade).
        // Now error-checked; previously this silently swallowed failures.
        const linkRes = await sba("student_camp_links").upsert({
          student_id: uid,
          explr_camp_id: explrCampId,
        } as never);
        if (linkRes.error) {
          const rb = await rollback(uid);
          errors.push(`${reg.child_name}: link row — ${linkRes.error.message}${rb}`);
          continue;
        }

        // 2d. Store the credentials for the printable sheet.
        const { error: logErr } = await sba("camp_student_logins").insert({
          explr_camp_id: explrCampId,
          explr_registration_id: reg.id,
          student_id: uid,
          child_name: reg.child_name,
          username,
          password_plain: password,
          generated_by: context.userId,
        } as never);
        if (logErr) {
          const rb = await rollback(uid);
          errors.push(`${reg.child_name}: credentials row — ${logErr.message}${rb}`);
          continue;
        }
        created++;
      } catch (e) {
        errors.push(
          `${reg.child_name}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return {
      ok: errors.length === 0,
      total: registrations.length,
      created,
      skipped,
      failed: errors.length,
      errors: errors.slice(0, 20),
    };
  });
