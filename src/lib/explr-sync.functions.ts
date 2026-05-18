import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type ExplrCamp = {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  end_date: string | null;
  time: string | null;
  location: string | null;
  age_range: string | null;
  capacity: number | null;
  image: string | null;
  category: string | null;
  updated_at: string | null;
};

type ExplrRegistration = {
  id: string;
  camp_id: string;
  child_name: string;
  child_age: number | null;
  parent_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  status: string | null;
  created_at: string | null;
};

// Fetch rosters via the EXPLR external-data proxy (admin API key). The
// previous direct PostgREST call against `registrations` failed because the
// EXPLR_SERVICE_ROLE_KEY secret is actually the anon key — rosters are not
// reachable that way. external-data with x-api-key bypasses RLS server-side.
const EXPLR_EXTERNAL_DATA =
  "https://ovmmlbpaaadzgxxrbmdl.supabase.co/functions/v1/external-data";

async function callExplrExternal(action: string, campId?: string): Promise<unknown> {
  const apiKey = process.env.EXPLR_API_KEY;
  if (!apiKey) throw new Error("EXPLR_API_KEY not configured");
  const url = new URL(EXPLR_EXTERNAL_DATA);
  url.searchParams.set("action", action);
  if (campId) url.searchParams.set("camp_id", campId);
  const res = await fetch(url.toString(), {
    headers: { "x-api-key": apiKey, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`EXPLR ${action} failed [${res.status}]: ${text.slice(0, 300)}`);
  }
  try { return JSON.parse(text); } catch { return text; }
}

function unwrapList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    for (const key of ["data", "items", "results", "rows", "roster", "registrations"]) {
      const v = p[key];
      if (Array.isArray(v)) return v as Record<string, unknown>[];
    }
  }
  return [];
}

function pickStr(row: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}
function pickNum(row: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !isNaN(Number(v))) return Number(v);
  }
  return null;
}

function mapRosterRow(row: Record<string, unknown>, campId: string): ExplrRegistration | null {
  const id = pickStr(row, "id", "registration_id", "uuid");
  const childName =
    pickStr(row, "child_name", "student_name", "name", "full_name", "first_name") ?? null;
  if (!id || !childName) return null;
  return {
    id,
    camp_id: pickStr(row, "camp_id", "campId") ?? campId,
    child_name: childName,
    child_age: pickNum(row, "child_age", "age", "student_age"),
    parent_name: pickStr(row, "parent_name", "guardian_name", "parent"),
    parent_email: pickStr(row, "parent_email", "email", "guardian_email"),
    parent_phone: pickStr(row, "parent_phone", "phone", "guardian_phone"),
    status: pickStr(row, "status", "registration_status"),
    created_at: pickStr(row, "created_at", "registered_at", "signup_date"),
  };
}

async function fetchAllFromExplr<T>(table: string, columns: string): Promise<T[]> {
  const url = process.env.EXPLR_SUPABASE_URL;
  const key = process.env.EXPLR_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ExplrMore credentials not configured");

  const results: T[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const res = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/${table}?select=${columns}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Range: `${from}-${from + pageSize - 1}`,
          "Range-Unit": "items",
        },
      },
    );
    if (!res.ok) {
      throw new Error(`ExplrMore ${table} fetch failed [${res.status}]: ${await res.text()}`);
    }
    const batch = (await res.json()) as T[];
    results.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return results;
}

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("educators")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`Role lookup failed: ${error.message}`);
  if (!data || data.role !== "admin") throw new Error("Admin access required");
}

export const syncExplrMore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const camps = await fetchAllFromExplr<ExplrCamp>(
      "camps",
      "id,title,description,date,end_date,time,location,age_range,capacity,image,category,updated_at",
    );
    const regs = await fetchAllFromExplr<ExplrRegistration>(
      "registrations",
      "id,camp_id,child_name,child_age,parent_name,parent_email,parent_phone,status,created_at",
    );

    if (camps.length > 0) {
      const { error } = await supabaseAdmin.from("explr_camps").upsert(
        camps.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          date: c.date,
          end_date: c.end_date,
          time: c.time,
          location: c.location,
          age_range: c.age_range,
          capacity: c.capacity,
          image: c.image,
          category: c.category,
          imported_at: new Date().toISOString(),
          source_updated_at: c.updated_at,
        })),
        { onConflict: "id", ignoreDuplicates: false },
      );
      if (error) throw new Error(`Camp upsert failed: ${error.message}`);
    }

    // Roster filtering. The previous version silently dropped any registration
    // whose camp_id wasn't in the camps set, with no breadcrumb left behind —
    // so a schema mismatch in ExplrMore (different join key, different table)
    // looked identical to "no registrations" in the UI. Now we report both
    // the raw fetch count and the post-filter count.
    const validCampIds = new Set(camps.map((c) => c.id));
    const matchedRegs = regs.filter((r) => validCampIds.has(r.camp_id));
    const orphanedRegs = regs.length - matchedRegs.length;

    if (matchedRegs.length > 0) {
      const { error } = await supabaseAdmin.from("explr_registrations").upsert(
        matchedRegs.map((r) => ({
          id: r.id,
          camp_id: r.camp_id,
          child_name: r.child_name,
          child_age: r.child_age,
          parent_name: r.parent_name,
          parent_email: r.parent_email,
          parent_phone: r.parent_phone,
          status: r.status,
          imported_at: new Date().toISOString(),
          source_created_at: r.created_at,
        })),
        { onConflict: "id", ignoreDuplicates: false },
      );
      if (error) throw new Error(`Registration upsert failed: ${error.message}`);
    }

    return {
      ok: true,
      campsFetched: camps.length,
      campsImported: camps.length,
      registrationsFetched: regs.length,
      registrationsImported: matchedRegs.length,
      registrationsOrphaned: orphanedRegs,
      syncedAt: new Date().toISOString(),
    };
  });

// Replace the curriculum links for an ExplrMore camp with the supplied list
// of curriculum slugs (zero or more). Simple replace strategy: delete every
// existing link for this camp then insert the new set. Also keeps the legacy
// linked_camp_slug column in sync (set to the first slug, or null) for any
// older code that still reads it.
export const linkExplrCamp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { explrCampId: string; linkedCampSlugs: string[] }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // explr_camp_curriculum_links isn't in the generated Database type yet
    // (migration 20260518064003). Cast the table name to bypass.
    const links = (supabaseAdmin.from as (n: string) => ReturnType<typeof supabaseAdmin.from>)(
      "explr_camp_curriculum_links",
    );

    // Clear existing links for this camp.
    {
      const { error } = await links.delete().eq("explr_camp_id", data.explrCampId);
      if (error) throw new Error(error.message);
    }

    // Insert the new set (dedup defensively).
    const uniqueSlugs = [...new Set(data.linkedCampSlugs.filter(Boolean))];
    if (uniqueSlugs.length > 0) {
      const { error } = await links.insert(
        uniqueSlugs.map((slug) => ({
          explr_camp_id: data.explrCampId,
          camp_slug: slug,
          linked_by: context.userId,
        })),
      );
      if (error) throw new Error(error.message);
    }

    // Keep the legacy single-link column in sync for any code that still reads it.
    {
      const { error } = await supabaseAdmin
        .from("explr_camps")
        .update({ linked_camp_slug: uniqueSlugs[0] ?? null })
        .eq("id", data.explrCampId);
      if (error) throw new Error(error.message);
    }

    return { ok: true, linkedCount: uniqueSlugs.length };
  });

// Toggle an educator's assignment to an ExplrMore camp instance. Idempotent.
export const setExplrCampEducator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { explrCampId: string; educatorId: string; on: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    // explr_camp_educators is added in migration 20260518061032 — the generated
    // Database type may not include it yet on the first sync. Cast the table
    // name to bypass the typed-client lookup; regen will tidy this up.
    const ece = (supabaseAdmin.from as (n: string) => ReturnType<typeof supabaseAdmin.from>)(
      "explr_camp_educators",
    );
    if (data.on) {
      const { error } = await ece.upsert(
        {
          explr_camp_id: data.explrCampId,
          educator_id: data.educatorId,
          assigned_by: context.userId,
        },
        { onConflict: "explr_camp_id,educator_id", ignoreDuplicates: true },
      );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await ece
        .delete()
        .eq("explr_camp_id", data.explrCampId)
        .eq("educator_id", data.educatorId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// (Removed) generateExplrCampLogins — parents and students don't interact
// with this site. Camp rosters stay in ExplrMore; admins only see the
// count + linkage from /educator/admin/import-explr.
