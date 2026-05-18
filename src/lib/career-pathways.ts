// Shared types + loaders for the career pathways snapshot.

import { supabase } from "@/integrations/supabase/client";

export type Cluster = {
  id: string;
  label: string;
  description: string;
  sort_order: number;
};

export type Occupation = {
  id: string;
  cluster_id: string;
  soc_code: string | null;
  title: string;
  median_wage: number | null;
  growth_pct: number | null;
  annual_openings: number | null;
  education: string | null;
  description: string;
  sort_order: number;
};

export type OccupationProgram = {
  id: string;
  occupation_id: string;
  school: string;
  program_name: string;
  credential: string | null;
  url: string | null;
};

export type InternshipOccupationLink = {
  internship_slug: string;
  occupation_id: string;
};

export async function loadClusters(): Promise<Cluster[]> {
  const { data } = await supabase
    .from("career_clusters")
    .select("*")
    .order("sort_order");
  return (data as Cluster[]) ?? [];
}

export async function loadOccupations(): Promise<Occupation[]> {
  const { data } = await supabase
    .from("occupations")
    .select("*")
    .order("sort_order");
  return (data as Occupation[]) ?? [];
}

export async function loadInternshipOccupations(): Promise<InternshipOccupationLink[]> {
  const { data } = await supabase
    .from("internship_occupations")
    .select("internship_slug, occupation_id");
  return (data as InternshipOccupationLink[]) ?? [];
}

export function formatWage(n: number | null) {
  if (n == null) return "—";
  return `$${n.toLocaleString()}`;
}

export function formatGrowth(n: number | null) {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}%`;
}
