// Client helper for the EXPLR proxy. Calls the server function, which
// forwards to the EXPLR external-data endpoint with the server-side API key.
import { explrProxy } from "./explr-proxy.functions";

export type ExplrCamp = {
  id: string;
  title?: string;
  name?: string;
  date?: string | null;
  end_date?: string | null;
  location?: string | null;
  capacity?: number | null;
  category?: string | null;
  [k: string]: unknown;
};

export type ExplrRosterEntry = {
  id?: string;
  child_name?: string;
  child_age?: number | null;
  parent_name?: string | null;
  parent_email?: string | null;
  parent_phone?: string | null;
  medical_notes?: string | null;
  status?: string | null;
  [k: string]: unknown;
};

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    for (const key of ["data", "items", "results", "rows"]) {
      const v = p[key];
      if (Array.isArray(v)) return v as T[];
    }
  }
  return [];
}

export async function getExplrCamps(): Promise<ExplrCamp[]> {
  const res = await explrProxy({ data: { action: "camps" } });
  return unwrapList<ExplrCamp>(res.data);
}

export async function getExplrRoster(campId: string): Promise<ExplrRosterEntry[]> {
  const res = await explrProxy({ data: { action: "roster", camp_id: campId } });
  return unwrapList<ExplrRosterEntry>(res.data);
}

export async function getExplrWaitlist(campId: string): Promise<ExplrRosterEntry[]> {
  const res = await explrProxy({ data: { action: "waitlist", camp_id: campId } });
  return unwrapList<ExplrRosterEntry>(res.data);
}

export async function getAllExplrRosters(): Promise<unknown> {
  const res = await explrProxy({ data: { action: "all_rosters" } });
  return res.data;
}
