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

// Admin check against public.admins (the post-split admin table).
async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("admins")
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

/**
 * Short, kid-typeable first name: lowercase, alphanumeric only, ≤8 chars.
 * Combined with 2 random digits this gives usernames like "maya42",
 * "alex07" — easy to read off a card.
 */
function slugFirst(raw: string): string {
  return slugName(raw).slice(0, 8) || "camper";
}

/** A few random digits. Used as the unique suffix on a camp username. */
function randDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += String(Math.floor(Math.random() * 10));
  return s;
}

const CAMP_DOMAIN = "@camp.explr.local";

/**
 * Mint an auth user for a camp student, retrying on username collisions.
 * Usernames are "{firstname}{2-3 digits}@camp.explr.local" — a kid types
 * just "{firstname}{digits}" at the sign-in screen; the form appends the
 * domain. We try 4 attempts at 2 digits, then 4 more at 3 digits.
 */
async function mintCampAuthUser(
  firstSlug: string,
  childName: string,
  password: string,
  source: "camp_login" | "camp_login_walkin",
): Promise<{ ok: true; uid: string; username: string } | { ok: false; error: string }> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const digits = randDigits(attempt < 4 ? 2 : 3);
    const username = `${firstSlug}${digits}${CAMP_DOMAIN}`;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: username,
      password,
      email_confirm: true,
      user_metadata: { generated: true, source, child_name: childName },
    });
    if (!error && data.user) return { ok: true, uid: data.user.id, username };
    const msg = (error?.message ?? "").toLowerCase();
    const isDuplicate =
      msg.includes("already") ||
      msg.includes("exist") ||
      msg.includes("registered") ||
      msg.includes("duplicate");
    if (!isDuplicate) return { ok: false, error: error?.message ?? "createUser failed" };
    // collision → loop with a fresh suffix
  }
  return { ok: false, error: "Could not find an unused username after several tries" };
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
    const { data: regs, error: regErr } = await supabaseAdmin
      .from("explr_registrations")
      .select("id, child_name, child_age")
      .eq("camp_id", explrCampId);
    if (regErr) throw new Error(`Roster lookup failed: ${regErr.message}`);
    const registrations = (regs ?? []) as RegistrationRow[];

    // 2. Pre-flight: confirm the auxiliary tables are reachable BEFORE we
    // start minting auth accounts. Previously a missing table aborted the
    // function mid-loop, after dozens of orphan auth.users rows had already
    // been created. Bail clean if either probe errors.
    {
      const linkProbe = await supabaseAdmin
        .from("student_camp_links")
        .select("student_id")
        .limit(1);
      if (linkProbe.error) {
        throw new Error(
          `student_camp_links unreachable — ${linkProbe.error.message}. ` +
            `Apply the camp-logins migration first.`,
        );
      }
      const logProbe = await supabaseAdmin
        .from("camp_student_logins")
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
    const { data: existing } = await supabaseAdmin
      .from("camp_student_logins")
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
        const first = slugFirst(parts[0] ?? "camper");
        const password = makePassword();

        // 2a. Create the auth account (retries on username collision).
        const mint = await mintCampAuthUser(
          first,
          reg.child_name,
          password,
          "camp_login",
        );
        if (!mint.ok) {
          errors.push(`${reg.child_name}: ${mint.error}`);
          continue;
        }
        const uid = mint.uid;
        const username = mint.username;

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
        const linkRes = await supabaseAdmin.from("student_camp_links").upsert({
          student_id: uid,
          explr_camp_id: explrCampId,
        } as never);
        if (linkRes.error) {
          const rb = await rollback(uid);
          errors.push(`${reg.child_name}: link row — ${linkRes.error.message}${rb}`);
          continue;
        }

        // 2d. Store the credentials for the printable sheet.
        const { error: logErr } = await supabaseAdmin.from("camp_student_logins").insert({
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

/**
 * Mint a single login for a walk-in / drop-in camper who isn't on the
 * ExplrMore roster yet. childName is optional — defaults to "Walk-in"
 * so an educator can grab a login the moment a kid shows up and rename
 * them later. childAge sets the student's grade; missing → default 6.
 *
 * Returns the created username + password so the educator can hand them
 * straight to the camper without re-opening the credentials sheet.
 */
export const generateWalkInCampLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      explrCampId: string;
      childName?: string;
      childAge?: number | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // Same pre-flight as the bulk fn — never mint an auth user when the
    // downstream tables are unreachable.
    {
      const linkProbe = await supabaseAdmin
        .from("student_camp_links")
        .select("student_id")
        .limit(1);
      if (linkProbe.error)
        throw new Error(
          `student_camp_links unreachable — ${linkProbe.error.message}. Apply the camp-logins migration first.`,
        );
      const logProbe = await supabaseAdmin
        .from("camp_student_logins")
        .select("id")
        .limit(1);
      if (logProbe.error)
        throw new Error(
          `camp_student_logins unreachable — ${logProbe.error.message}. Apply the camp-logins migration first.`,
        );
    }

    const name = (data.childName ?? "").trim() || "Walk-in";
    const parts = name.split(/\s+/);
    const first = slugFirst(parts[0] ?? "camper");
    const password = makePassword();

    const mint = await mintCampAuthUser(
      first,
      name,
      password,
      "camp_login_walkin",
    );
    if (!mint.ok) throw new Error(mint.error);
    const uid = mint.uid;
    const username = mint.username;

    async function rollback(): Promise<string> {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
      return error ? ` (rollback failed: ${error.message})` : "";
    }

    const { error: stuErr } = await supabaseAdmin.from("students").upsert({
      id: uid,
      first_name: (parts[0] ?? "Camper").slice(0, 60),
      grade: ageToGrade(data.childAge ?? null),
    });
    if (stuErr) throw new Error(`students row — ${stuErr.message}${await rollback()}`);

    const linkRes = await supabaseAdmin.from("student_camp_links").upsert({
      student_id: uid,
      explr_camp_id: data.explrCampId,
    } as never);
    if (linkRes.error)
      throw new Error(`link row — ${linkRes.error.message}${await rollback()}`);

    const { error: logErr } = await supabaseAdmin.from("camp_student_logins").insert({
      explr_camp_id: data.explrCampId,
      explr_registration_id: null, // walk-in: not on the ExplrMore roster
      student_id: uid,
      child_name: name,
      username,
      password_plain: password,
      generated_by: context.userId,
    } as never);
    if (logErr)
      throw new Error(`credentials row — ${logErr.message}${await rollback()}`);

    return { ok: true, username, password, childName: name };
  });

/**
 * Update a camp login's recorded name (and optionally grade). Used to
 * fill in the real name for a walk-in row that was created as "Walk-in"
 * before the kid's info was known, or to fix typos. Keeps the username
 * stable — auth identity doesn't change with the display name.
 */
export const updateCampLoginName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      loginId: string;
      childName: string;
      childAge?: number | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const trimmed = data.childName.trim();
    if (!trimmed) throw new Error("Name required");

    const { data: row, error: rowErr } = await supabaseAdmin
      .from("camp_student_logins")
      .select("student_id")
      .eq("id", data.loginId)
      .maybeSingle();
    if (rowErr) throw new Error(rowErr.message);
    if (!row) throw new Error("Login not found");
    const studentId = (row as { student_id: string | null }).student_id;

    const parts = trimmed.split(/\s+/);
    const firstName = (parts[0] ?? "Camper").slice(0, 60);

    const { error: cslErr } = await supabaseAdmin
      .from("camp_student_logins")
      .update({ child_name: trimmed } as never)
      .eq("id", data.loginId);
    if (cslErr) throw new Error(`logins update — ${cslErr.message}`);

    if (studentId) {
      const stuPatch: Record<string, unknown> = { first_name: firstName };
      if (data.childAge != null) stuPatch.grade = ageToGrade(data.childAge);
      const { error: stuErr } = await supabaseAdmin
        .from("students")
        .update(stuPatch as never)
        .eq("id", studentId);
      if (stuErr) throw new Error(`students update — ${stuErr.message}`);
    }

    return { ok: true };
  });
