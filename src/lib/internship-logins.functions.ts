import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Internship-student account generation. Mirrors camp-logins.functions.ts.
 * Roster comes from `internship_rosters` (imported from the SYEP worksite
 * attendance spreadsheet). For each rostered student we mint an auth
 * user + students row + credentials row so kids can sign in and take
 * surveys/assessments.
 */

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("admins")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (!data) throw new Error("Admin access required");
}

const ADJECTIVES = ["brave","bright","calm","clever","cosmic","eager","fair","gentle","happy","jolly","keen","kind","lucky","merry","noble","proud","quick","smart","sunny","swift","warm","wise"];
const ANIMALS = ["otter","falcon","panda","tiger","robin","lynx","moose","heron","koala","gecko","raven","puma","bison","crane","finch","shark","wolf","hawk","seal","fox"];
const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const randDigits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

function slugFirst(raw: string): string {
  const s = raw.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "").slice(0, 8);
  return s || "intern";
}
function makePassword(): string {
  return `${rand(ADJECTIVES)}-${rand(ANIMALS)}-${Math.floor(Math.random() * 9) + 1}`;
}

// Roster names are "Last, First" — pull first name for the username.
function pickFirstName(fullName: string): string {
  const parts = fullName.split(",").map((p) => p.trim());
  if (parts.length >= 2 && parts[1]) return parts[1].split(/\s+/)[0];
  return fullName.trim().split(/\s+/)[0] || "Intern";
}

const INTERN_DOMAIN = "@intern.explr.local";

async function mintAuthUser(firstSlug: string, childName: string, password: string) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const digits = randDigits(attempt < 4 ? 2 : 3);
    const username = `${firstSlug}${digits}${INTERN_DOMAIN}`;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: username,
      password,
      email_confirm: true,
      user_metadata: { generated: true, source: "internship_login", child_name: childName },
    });
    if (!error && data.user) return { ok: true as const, uid: data.user.id, username };
    const msg = (error?.message ?? "").toLowerCase();
    if (!msg.includes("already") && !msg.includes("exist") && !msg.includes("registered") && !msg.includes("duplicate")) {
      return { ok: false as const, error: error?.message ?? "createUser failed" };
    }
  }
  return { ok: false as const, error: "no unused username" };
}

export const generateInternshipLogins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { internshipSlug: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { internshipSlug } = data;

    const { data: roster, error: rErr } = await supabaseAdmin
      .from("internship_rosters")
      .select("id, student_name")
      .eq("internship_slug", internshipSlug);
    if (rErr) throw new Error(`Roster lookup failed: ${rErr.message}`);

    const { data: existing } = await supabaseAdmin
      .from("internship_student_logins")
      .select("roster_id")
      .eq("internship_slug", internshipSlug);
    const done = new Set(
      ((existing ?? []) as Array<{ roster_id: string | null }>)
        .map((r) => r.roster_id)
        .filter((x): x is string => !!x),
    );

    let created = 0, skipped = 0;
    const errors: string[] = [];

    async function rollback(uid: string) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
      return error ? ` (rollback failed: ${error.message})` : "";
    }

    for (const r of (roster ?? []) as Array<{ id: string; student_name: string }>) {
      if (done.has(r.id)) { skipped++; continue; }
      try {
        const first = slugFirst(pickFirstName(r.student_name));
        const password = makePassword();
        const mint = await mintAuthUser(first, r.student_name, password);
        if (!mint.ok) { errors.push(`${r.student_name}: ${mint.error}`); continue; }

        const { error: stuErr } = await supabaseAdmin.from("students").upsert({
          id: mint.uid,
          first_name: pickFirstName(r.student_name).slice(0, 60),
          grade: 10,
        });
        if (stuErr) {
          const rb = await rollback(mint.uid);
          errors.push(`${r.student_name}: students — ${stuErr.message}${rb}`);
          continue;
        }

        const { error: logErr } = await supabaseAdmin.from("internship_student_logins").insert({
          internship_slug: internshipSlug,
          roster_id: r.id,
          student_id: mint.uid,
          child_name: r.student_name,
          username: mint.username,
          password_plain: password,
          generated_by: context.userId,
        });
        if (logErr) {
          const rb = await rollback(mint.uid);
          errors.push(`${r.student_name}: credentials — ${logErr.message}${rb}`);
          continue;
        }
        created++;
      } catch (e) {
        errors.push(`${r.student_name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return {
      ok: errors.length === 0,
      total: (roster ?? []).length,
      created,
      skipped,
      failed: errors.length,
      errors: errors.slice(0, 20),
    };
  });

/** Add a new roster entry (walk-in intern) to an internship. */
export const addInternshipRosterEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { internshipSlug: string; studentName: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const name = data.studentName.trim();
    if (!name) throw new Error("Name required");
    const { error } = await supabaseAdmin.from("internship_rosters").insert({
      internship_slug: data.internshipSlug,
      student_name: name,
      imported_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
