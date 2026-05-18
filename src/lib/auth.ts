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
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loading };
}

export function useEducator() {
  const { user, loading: authLoading } = useSession();
  const [educator, setEducator] = useState<EducatorRow | null>(null);
  const [admin, setAdmin] = useState<AdminRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setEducator(null);
      setAdmin(null);
      setLoading(authLoading);
      return;
    }
    setLoading(true);
    // Look up both tables in parallel — but the user should only ever be
    // in one. If they're in admins, they're an admin; otherwise check for
    // an educators row.
    Promise.all([
      supabase.from("educators").select("*").eq("id", user.id).maybeSingle(),
      // public.admins is added in migration 20260518053900. Cast for typings
      // until the Database type regenerates.
      (supabase.from as (n: string) => ReturnType<typeof supabase.from>)("admins")
        .select("*")
        .eq("id", user.id)
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
  }, [user, authLoading]);

  const isAdmin = !!admin;

  return { user, educator, admin, isAdmin, loading };
}
