import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public lookup of an invite by token. Uses service role since the
// educator_invites table is not publicly readable. The token itself is
// the secret — knowing it is the proof you were invited.
export const getInviteByToken = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ token: z.string().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: invite, error } = await supabaseAdmin
      .from("educator_invites")
      .select(
        "id, email, program_type, organization, role, expires_at, accepted_at",
      )
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite) throw new Error("Invite not found");
    return invite as {
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
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
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
