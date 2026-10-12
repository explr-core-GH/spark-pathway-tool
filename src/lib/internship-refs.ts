// Partner internships, resolved from the opportunities table. Every internship
// in the system is an approved partner opportunity of type "internship"; the
// apply pipeline, placements, and matching tools refer to one by its
// synthetic `opp:<id>` ref (see oppSlug in ./opportunities).

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  isOppSlug,
  oppIdFromSlug,
  oppSlug,
  oppToCatalogInternship,
  type Internship,
  type Opportunity,
} from "./opportunities";

const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

export type InternshipRef = {
  /** `opp:<id>` */
  ref: string;
  id: string;
  name: string;
  orgName: string | null;
  status: Opportunity["status"];
};

/**
 * Load partner internships keyed by ref. Approved only by default; staff
 * screens can pass `includeUnapproved` to also label drafts/rejected rows
 * (RLS limits what non-staff can see anyway).
 */
export async function loadInternshipRefs(opts?: {
  includeUnapproved?: boolean;
}): Promise<Map<string, InternshipRef>> {
  let q = sb("opportunities").select("id, name, org_name, status").eq("type", "internship");
  if (!opts?.includeUnapproved) q = q.eq("status", "approved");
  const { data } = await q;
  const out = new Map<string, InternshipRef>();
  for (const o of (data ?? []) as Array<{
    id: string;
    name: string | null;
    org_name: string | null;
    status: Opportunity["status"];
  }>) {
    out.set(oppSlug(o.id), {
      ref: oppSlug(o.id),
      id: o.id,
      name: o.name ?? "Internship",
      orgName: o.org_name,
      status: o.status,
    });
  }
  return out;
}

/** Approved partner internships in the card shape the apply picker uses. */
export async function fetchInternshipCatalog(): Promise<{
  cards: Internship[];
  rows: Opportunity[];
}> {
  const { data } = await sb("opportunities")
    .select("*")
    .eq("type", "internship")
    .eq("status", "approved")
    .order("name");
  const rows = ((data ?? []) as Opportunity[]).filter((o) => !!o.id);
  return { cards: rows.map(oppToCatalogInternship), rows };
}

/** Display name for any internship ref; falls back to the raw ref. */
export function internshipNameFor(
  refs: Map<string, InternshipRef> | Record<string, string>,
  ref: string,
): string {
  if (refs instanceof Map) return refs.get(ref)?.name ?? (isOppSlug(ref) ? "Internship" : ref);
  return refs[ref] ?? (isOppSlug(ref) ? "Internship" : ref);
}

/** React hook: resolve internship names for staff and student screens. */
export function useInternshipRefs(opts?: { includeUnapproved?: boolean }) {
  const [refs, setRefs] = useState<Map<string, InternshipRef>>(new Map());
  const [loading, setLoading] = useState(true);
  const include = !!opts?.includeUnapproved;
  useEffect(() => {
    let cancelled = false;
    loadInternshipRefs({ includeUnapproved: include })
      .then((m) => {
        if (!cancelled) setRefs(m);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [include]);
  return {
    refs,
    loading,
    nameFor: (ref: string) => internshipNameFor(refs, ref),
    idFor: (ref: string) => (isOppSlug(ref) ? oppIdFromSlug(ref) : null),
  };
}
