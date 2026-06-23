import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Admin-only manual password reset. Sets a chosen password for any account
 * (student, educator, organization, or admin) by email or user id. Runs with
 * the service role, gated to admins — the auth admin API can't be called from
 * the client.
 */

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("admins")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (!data) throw new Error("Admin access required");
}

/** Find an auth user id by email, paging through the admin list. */
async function findUserIdByEmail(email: string): Promise<string | null> {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (found) return found.id;
    if (data.users.length < 200) break; // last page
  }
  return null;
}

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { email?: string; userId?: string; newPassword: string }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    if (!data.newPassword || data.newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    let uid = data.userId ?? null;
    let resolved = data.email?.trim() ?? "";
    if (!uid) {
      if (!resolved) throw new Error("Provide an email or user.");
      // Camp students use a short username (no @) — append the camp domain.
      const full = resolved.includes("@") ? resolved : `${resolved}@camp.explr.local`;
      uid = await findUserIdByEmail(full);
      if (!uid) throw new Error(`No account found for “${full}”.`);
      resolved = full;
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);

    // If this is a camp login, keep the printable credentials sheet in sync.
    await supabaseAdmin
      .from("camp_student_logins")
      .update({ password_plain: data.newPassword } as never)
      .eq("student_id", uid);

    return { ok: true, email: resolved || null };
  });
