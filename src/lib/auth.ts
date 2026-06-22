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
    // Defensive policy: once we've seen a real user, we only ever clear
    // it on an explicit SIGNED_OUT event. Every other event with a null
    // session is treated as a transient blip (tab visibility, network
    // hiccup, mistimed refresh) and silently ignored.
    //
    // This is more aggressive than just filtering TOKEN_REFRESHED. The
    // browser fires INITIAL_SESSION on tab focus too, and depending on
    // cookie/storage state it can arrive with session=null even when the
    // user is fine. Ignoring those keeps EducatorGate from briefly
    // showing the "Request access" panel mid-navigation.
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
      if (event === "SIGNED_OUT") {
        apply(null);
        return;
      }
      // Only positive transitions from here on. If we somehow get a null
      // session for an event that isn't SIGNED_OUT, drop it on the floor.
      if (!session) return;
      apply(session.user ?? null);
    });

    supabase.auth.getSession().then(({ data }) => {
      // Initial bootstrap: this is the only legitimate place we may
      // transition from "unknown" → null (the page loaded and there's no
      // session). After this call, `apply` will only ever go null on a
      // genuine SIGNED_OUT event.
      apply(data.session?.user ?? null);
    }).catch(() => {
      // Network/CORS error fetching the session — only clear loading
      // if we haven't already resolved. Don't overwrite a known user.
      if (!resolved) {
        resolved = true;
        setLoading(false);
      }
    });

    // Hard timeout — never leave the UI spinning forever. Only kicks in
    // if neither the listener nor getSession() has resolved by now;
    // never clears an already-set user.
    const t = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setLoading(false);
      }
    }, 4000);
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
      supabase
        .from("admins")
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

export type OrgRow = {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  website: string | null;
  logo_url: string | null;
};

// organizations is newer than the generated Database types.
const orgTable = (): any =>
  (supabase.from as unknown as (n: string) => any)("organizations");

/**
 * useOrg — resolves the signed-in user's organization row (the org portal's
 * account type). Mirrors useEducator: returns null when the user isn't an org.
 */
export function useOrg() {
  const { user, loading: authLoading } = useSession();
  const [org, setOrg] = useState<OrgRow | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = user?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setOrg(null);
      setLoading(authLoading);
      return;
    }
    setLoading(true);
    orgTable()
      .select("*")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }: { data: OrgRow | null }) => {
        if (cancelled) return;
        setOrg((data as OrgRow) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  return { user, org, loading };
}
