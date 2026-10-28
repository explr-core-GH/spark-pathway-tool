import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only walkthrough reset; its implementation stays server-only. */
export const resetApplicationDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { rateLimit } = await import("./server/rate-limit.server");
    await rateLimit("resetApplicationDemo", 30, 600);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: admin } = await supabaseAdmin
      .from("admins")
      .select("id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!admin) throw new Error("Admin access required");
    const { resetApplicationDemo: reset } = await import("./demo-application.server");
    return reset();
  });
