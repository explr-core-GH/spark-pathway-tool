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

async function assertAdmin(supabase: ReturnType<typeof supabaseAdmin.from> extends never ? never : any, userId: string) {
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
    await assertAdmin(null, context.userId);

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

    if (regs.length > 0) {
      const validCampIds = new Set(camps.map((c) => c.id));
      const filteredRegs = regs.filter((r) => validCampIds.has(r.camp_id));
      const { error } = await supabaseAdmin.from("explr_registrations").upsert(
        filteredRegs.map((r) => ({
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
      campsImported: camps.length,
      registrationsImported: regs.length,
      syncedAt: new Date().toISOString(),
    };
  });

export const linkExplrCamp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { explrCampId: string; linkedCampSlug: string | null }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(null, context.userId);
    const { error } = await supabaseAdmin
      .from("explr_camps")
      .update({ linked_camp_slug: data.linkedCampSlug })
      .eq("id", data.explrCampId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
