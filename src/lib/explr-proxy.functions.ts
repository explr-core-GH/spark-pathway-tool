import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const EXPLR_ENDPOINT =
  "https://ovmmlbpaaadzgxxrbmdl.supabase.co/functions/v1/external-data";

const ALLOWED_ACTIONS = ["camps", "roster", "waitlist", "all_rosters"] as const;
type Action = (typeof ALLOWED_ACTIONS)[number];

const inputSchema = z.object({
  action: z.enum(ALLOWED_ACTIONS),
  camp_id: z.string().min(1).max(200).optional(),
});

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("educators")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`Role lookup failed: ${error.message}`);
  if (!data || data.role !== "admin") throw new Error("Admin access required");
}

async function callExplr(action: Action, campId?: string) {
  const apiKey = process.env.EXPLR_API_KEY;
  if (!apiKey) throw new Error("EXPLR_API_KEY is not configured");

  const url = new URL(EXPLR_ENDPOINT);
  url.searchParams.set("action", action);
  if (campId) url.searchParams.set("camp_id", campId);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`EXPLR ${action} failed [${res.status}]: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export const explrProxy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Rosters and waitlists carry PII / medical info — admin-gate them.
    // Camp listings are admin-only here too since this is an admin tool;
    // relax this if you ever want educator-level access to bare camp lists.
    await assertAdmin(context.userId);

    if ((data.action === "roster" || data.action === "waitlist") && !data.camp_id) {
      throw new Error(`camp_id is required for action="${data.action}"`);
    }

    const payload = await callExplr(data.action, data.camp_id);
    return { ok: true, action: data.action, data: payload };
  });
