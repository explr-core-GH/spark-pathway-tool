// Shared auth + role helpers. Client-safe.
//
// As of the admins-split migration, admin status comes from the public.admins
// table, NOT from educators.role. An account can be an admin, an educator,
// both, or neither.

import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export type EducatorRow = {
  id: string;
  full_name: string;
  email: string;
  organization: string | null;
  program_type: string | null;
  role: "educator" | "admin"; // legacy column — admin flag now lives in public.admins
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
    // Fetch educator and admin rows in parallel — a user can be in one,
    // the other, both, or neither.
    Promise.all([
      supabase.from("educators").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("admins").select("*").eq("id", user.id).maybeSingle(),
    ]).then(([ed, ad]) => {
      if (cancelled) return;
      setEducator((ed.data as EducatorRow) ?? null);
      setAdmin((ad.data as AdminRow) ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const isAdmin = !!admin;

  return { user, educator, admin, isAdmin, loading };
}
