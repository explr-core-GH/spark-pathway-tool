import { getRequest } from "@tanstack/react-start/server";

export const RATE_LIMIT_MESSAGE = "Too many attempts. Please wait a few minutes and try again.";

export function clientIp(): string {
  try {
    const h = getRequest().headers;
    return (
      h.get("cf-connecting-ip")?.trim() ||
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

/** Throws when this IP has used up `max` calls to `name` in the window. */
export async function rateLimit(name: string, max: number, windowSeconds: number): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpc = supabaseAdmin.rpc as unknown as (fn: string, args: object) => Promise<any>;
  const { data, error } = await rpc("check_rate_limit", {
    _key: `${name}:${clientIp()}`,
    _max: max,
    _window_seconds: windowSeconds,
  });
  if (error) {
    // Fail open on infrastructure errors so a broken limiter can't lock everyone out.
    console.error("rate limit check failed", error.message);
    return;
  }
  if (data === false) throw new Error(RATE_LIMIT_MESSAGE);
}
