import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Public lookup of an invite by token. Uses service role since the
// educator_invites table is not publicly readable. The token itself is
// the secret — knowing it is the proof you were invited.
export const getInviteByToken = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().min(8).max(128) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite, error } = await supabaseAdmin
      .from("educator_invites")
      .select("id, email, program_type, organization, role, expires_at, accepted_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite) throw new Error("Invite not found");
    return invite as unknown as {
      id: string;
      email: string;
      program_type: string | null;
      organization: string | null;
      role: "educator" | "admin";
      expires_at: string;
      accepted_at: string | null;
    };
  });

// Mark an invite as accepted. Validates token + user id server-side.
export const markInviteAccepted = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().min(8).max(128),
        acceptedBy: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("educator_invites")
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: data.acceptedBy,
      })
      .eq("token", data.token)
      .is("accepted_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Accept an invite as the signed-in user. Replaces the old browser-side
 * inserts into `admins` / `educators` (those RLS policies are closed now).
 * Checks: invite exists, not used, not expired, and its email matches the
 * signed-in user's email.
 */
export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ token: z.string().min(8).max(128), fullName: z.string().trim().min(1).max(120) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv, error } = await supabaseAdmin
      .from("educator_invites")
      .select("id, email, organization, role, expires_at, accepted_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const invite = inv as unknown as {
      id: string;
      email: string;
      organization: string | null;
      role: "educator" | "admin";
      expires_at: string;
      accepted_at: string | null;
    } | null;
    if (!invite) throw new Error("Invite not found");
    if (invite.accepted_at) throw new Error("This invite has already been used");
    if (new Date(invite.expires_at) < new Date()) throw new Error("This invite has expired");

    const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const userEmail = u.user?.email?.toLowerCase();
    if (!userEmail || userEmail !== invite.email.toLowerCase()) {
      throw new Error("Sign in with the email address this invite was sent to");
    }

    if (invite.role === "admin") {
      const { error: aErr } = await supabaseAdmin
        .from("admins")
        .upsert({ id: context.userId, full_name: data.fullName, email: invite.email } as never);
      if (aErr) throw new Error(aErr.message);
    } else {
      const { error: eErr } = await supabaseAdmin.from("educators").upsert({
        id: context.userId,
        full_name: data.fullName,
        email: invite.email,
        organization: invite.organization,
        program_type: null,
        role: "educator",
        approved: true,
      } as never);
      if (eErr) throw new Error(eErr.message);
    }
    await supabaseAdmin
      .from("educator_invites")
      .update({ accepted_at: new Date().toISOString(), accepted_by: context.userId })
      .eq("id", invite.id);
    return { role: invite.role };
  });
