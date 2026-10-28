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
  let data: unknown;
  let error: { message: string } | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Call rpc as a method on the client so `this` stays bound.
    const res = await (
      supabaseAdmin as unknown as {
        rpc: (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      }
    ).rpc("check_rate_limit", {
      _key: `${name}:${clientIp()}`,
      _max: max,
      _window_seconds: windowSeconds,
    });
    data = res.data;
    error = res.error;
  } catch (e) {
    // Fail open on ANY unexpected exception so a limiter bug can never take sign-in down.
    console.error("rate limit check failed", e);
    return;
  }
  if (error) {
    // Fail open on infrastructure errors so a broken limiter can't lock everyone out.
    console.error("rate limit check failed", error.message);
    return;
  }
  if (data === false) throw new Error(RATE_LIMIT_MESSAGE);
}
