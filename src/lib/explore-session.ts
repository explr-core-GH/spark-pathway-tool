import { supabase } from "@/integrations/supabase/client";

/**
 * Finish an Explore (grades 4-8) sign-in in the browser. The server has
 * already verified the student's proof and minted a one-time magic-link
 * token; exchanging it here creates the normal Supabase session, so the
 * rest of the app (RLS, dashboards, assessments) sees an ordinary student.
 */
export async function finishExploreSignIn(tokenHash: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error) throw new Error(error.message);
}

/** Kid-readable error text; strips server prefixes. */
export function friendlyError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.replace(/^Error:\s*/, "");
}
