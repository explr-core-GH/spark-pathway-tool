// Shared auth + role helpers. Client-safe.
//
// Educators and admins are SEPARATE accounts — no overlap. An auth.users
// row maps to either an educators row (role='educator') or an admins row,
// never both. isAdmin is derived purely from existence in public.admins.

import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export type EducatorRow = {
  id: string;
  full_name: string;
  email: string;
  organization: string | null;
  program_type: string | null;
  role: "educator" | "admin"; // kept for back-compat; admin status now comes from public.admins
  approved: boolean;
  school_irn: string | null;
  school_name: string | null;
};

export type AdminRow = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let resolved = false;
    let currentId: string | null = null;
    // Only set user when the actual user id changes. Supabase fires a
    // fresh User object on TOKEN_REFRESHED — same person, different
    // reference. If we set state on every event, useEducator's effect
    // re-fires, refetches, and EducatorGate flickers through
    // "Loading…" / "Request access" panels for users whose session is
    // alive and well. Same goes for tab-visibility wakeups.
    const apply = (u: User | null) => {
      const nextId = u?.id ?? null;
      if (nextId !== currentId) {
        currentId = nextId;
        setUser(u);
      }
      if (!resolved) {
        resolved = true;
        setLoading(false);
      }
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // SIGNED_OUT: clear immediately, regardless of session.user value.
      if (event === "SIGNED_OUT") {
        apply(null);
        return;
      }
      // Skip TOKEN_REFRESHED when session is null (refresh failed but
      // the user wasn't actively signed out). Letting that through would
      // briefly wipe `user` and bounce people to the sign-in gate.
      if (event === "TOKEN_REFRESHED" && !session) return;
      apply(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      apply(data.session?.user ?? null);
    }).catch(() => {
      apply(null);
    });
    // Hard timeout — never leave the UI spinning forever.
    const t = setTimeout(() => apply(null), 4000);
    return () => {
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

export function useEducator() {
  const { user, loading: authLoading } = useSession();
  const [educator, setEducator] = useState<EducatorRow | null>(null);
  const [admin, setAdmin] = useState<AdminRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Re-run only when the actual user id changes. If we depended on the
  // `user` object directly we'd refetch every token refresh — and the
  // gate would flash through "Loading…" between identical results.
  const userId = user?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      // Genuinely signed out — clear cached role state.
      setEducator(null);
      setAdmin(null);
      setLoading(authLoading);
      return;
    }
    setLoading(true);
    // Look up both tables in parallel — but the user should only ever be
    // in one. If they're in admins, they're an admin; otherwise check for
    // an educators row. We DO NOT clear educator/admin before the new
    // result arrives — keeping the stale value avoids a flicker through
    // EducatorGate's "Request access" / "Finish your sign-up" panels.
    Promise.all([
      supabase.from("educators").select("*").eq("id", userId).maybeSingle(),
      // public.admins is added in migration 20260518053900. Cast for typings
      // until the Database type regenerates.
      (supabase.from as (n: string) => ReturnType<typeof supabase.from>)("admins")
        .select("*")
        .eq("id", userId)
        .maybeSingle(),
    ]).then(([ed, ad]) => {
      if (cancelled) return;
      setEducator((ed.data as EducatorRow) ?? null);
      setAdmin(((ad.data as unknown) as AdminRow) ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  const isAdmin = !!admin;

  return { user, educator, admin, isAdmin, loading };
}
