import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * usePresenceHeartbeat — for any signed-in user, upsert a presence row
 * (current path + friendly area label + last_seen) so the admin roster
 * Live Monitor can show who's online and where. Fires on mount, on every
 * route change, and on a ~25s interval so an idle-but-open tab keeps
 * reading as online (the monitor treats <60s as online).
 *
 * No-op when signed out. Cheap: a single upsert keyed on the user id.
 */

const HEARTBEAT_MS = 25_000;

// Map a pathname to a short human label for the monitor.
function labelFor(path: string): string {
  if (path === "/assessment" || /^\/assessment\/[^/]+$/.test(path)) {
    return "Interest assessment";
  }
  if (/\/results$/.test(path)) return "Viewing results";
  if (path.startsWith("/assessment/internship-interest")) return "Internship interest";
  if (path.startsWith("/survey/")) return "STEM survey";
  if (path.startsWith("/demo/aptitude")) return "Aptitude battery";
  if (path === "/student") return "Dashboard";
  if (path === "/" || path === "/start") return "Home";
  if (path.startsWith("/sign-in") || path.startsWith("/sign-up")) return "Signing in";
  return path;
}

export function usePresenceHeartbeat() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const userIdRef = useRef<string | null>(null);

  // Track the signed-in user id.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) userIdRef.current = data.session?.user.id ?? null;
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      userIdRef.current = session?.user.id ?? null;
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let stopped = false;

    async function beat() {
      const uid = userIdRef.current;
      if (!uid || stopped) return;
      // student_presence isn't in the generated Database type — loosen.
      await (supabase.from as unknown as (n: string) => {
        upsert: (row: unknown) => Promise<unknown>;
      })("student_presence").upsert({
        student_id: uid,
        path,
        label: labelFor(path),
        last_seen_at: new Date().toISOString(),
      });
    }

    // Beat now (covers mount + every route change) then on an interval.
    beat();
    const t = setInterval(beat, HEARTBEAT_MS);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [path]);
}
