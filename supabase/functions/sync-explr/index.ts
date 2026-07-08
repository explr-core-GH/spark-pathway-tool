// sync-explr
//
// Edge function (Supabase / Deno) that pulls camps + family registrations
// (rosters) from ExplrMore and mirrors them into this project's
// public.explr_camps + public.explr_registrations. Idempotent. Meant to run
// DAILY on a schedule (Supabase Dashboard schedule or pg_cron — see
// EXPLR_daily_sync_setup.sql), and is also safe to invoke on demand.
//
// Mirrors the logic in src/lib/explr-sync.functions.ts (the manual "Sync now"
// button), so the two stay in sync.
//
// Required Edge Function secrets (Dashboard → Project Settings → Edge Functions
// → Secrets) — the SAME values already set on the app server:
//   EXPLR_API_KEY            — x-api-key for ExplrMore external-data (rosters)
//   EXPLR_SUPABASE_URL       — ExplrMore project URL (for camps)
//   EXPLR_SERVICE_ROLE_KEY   — ExplrMore key used to read camps
//   SUPABASE_URL             — this project (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY — this project's service role (auto-provided)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const EXPLR_EXTERNAL_DATA =
  "https://ovmmlbpaaadzgxxrbmdl.supabase.co/functions/v1/external-data";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...CORS, ...(init.headers ?? {}) },
  });
}

type Row = Record<string, unknown>;
function pickStr(row: Row, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}
function pickNum(row: Row, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !isNaN(Number(v))) return Number(v);
  }
  return null;
}
function unwrapList(payload: unknown): Row[] {
  if (Array.isArray(payload)) return payload as Row[];
  if (payload && typeof payload === "object") {
    const p = payload as Row;
    for (const key of ["data", "items", "results", "rows", "roster", "registrations"]) {
      const v = p[key];
      if (Array.isArray(v)) return v as Row[];
    }
  }
  return [];
}
function mapRosterRow(row: Row, campId: string) {
  const id = pickStr(row, "id", "registration_id", "uuid");
  const child = (row.child && typeof row.child === "object" ? row.child : {}) as Row;
  const first = pickStr(child, "first_name") ?? pickStr(row, "first_name");
  const last = pickStr(child, "last_name") ?? pickStr(row, "last_name");
  const composed = [first, last].filter(Boolean).join(" ").trim();
  const childName = pickStr(row, "child_name", "student_name", "name", "full_name") ?? (composed || null);
  if (!id || !childName) return null;
  let age = pickNum(row, "child_age", "age", "student_age") ?? pickNum(child, "age");
  const dob = pickStr(child, "date_of_birth");
  if (age == null && dob) {
    const d = new Date(dob);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      let a = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
      age = a;
    }
  }
  return {
    id,
    camp_id: pickStr(row, "camp_id", "campId") ?? campId,
    child_name: childName,
    child_age: age,
    parent_name: pickStr(row, "parent_name", "guardian_name", "parent"),
    parent_email: pickStr(row, "parent_email", "email", "guardian_email"),
    parent_phone: pickStr(row, "parent_phone", "phone", "guardian_phone"),
    status: pickStr(row, "status", "registration_status"),
    created_at: pickStr(row, "created_at", "registered_at", "signup_date"),
  };
}

async function callExplrExternal(action: string, campId?: string): Promise<unknown> {
  const apiKey = Deno.env.get("EXPLR_API_KEY");
  if (!apiKey) throw new Error("EXPLR_API_KEY not configured");
  const url = new URL(EXPLR_EXTERNAL_DATA);
  url.searchParams.set("action", action);
  if (campId) url.searchParams.set("camp_id", campId);
  const res = await fetch(url.toString(), { headers: { "x-api-key": apiKey, Accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`EXPLR ${action} failed [${res.status}]: ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function fetchCamps(): Promise<Row[]> {
  const url = Deno.env.get("EXPLR_SUPABASE_URL");
  const key = Deno.env.get("EXPLR_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("ExplrMore camps credentials not configured");
  const cols = "id,title,description,date,end_date,time,location,age_range,capacity,image,category,updated_at";
  const out: Row[] = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/camps?select=${cols}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + size - 1}`, "Range-Unit": "items" },
    });
    if (!res.ok) throw new Error(`ExplrMore camps fetch failed [${res.status}]: ${(await res.text()).slice(0, 200)}`);
    const batch = (await res.json()) as Row[];
    out.push(...batch);
    if (batch.length < size) break;
    from += size;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return json({ ok: false, error: "Supabase server env missing" }, { status: 500 });
  const db = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  const { data: runRow } = await db.from("sync_runs").insert({ kind: "explr_roster" }).select("id").single();
  const runId = runRow?.id as string | undefined;
  async function finish(p: { ok: boolean; camps?: number; regs?: number; error?: string }) {
    if (!runId) return;
    await db.from("sync_runs").update({
      finished_at: new Date().toISOString(),
      ok: p.ok,
      worksites_synced: p.camps ?? 0,
      students_synced: p.regs ?? 0,
      error: p.error ?? null,
    }).eq("id", runId);
  }

  try {
    const camps = await fetchCamps();

    // Rosters: try all_rosters, fall back to per-camp.
    const regs: ReturnType<typeof mapRosterRow>[] = [];
    let ok = false;
    try {
      const all = await callExplrExternal("all_rosters");
      const campsArr: Row[] = all && typeof all === "object" && Array.isArray((all as Row).camps)
        ? ((all as Row).camps as Row[]) : [];
      let flat = 0;
      for (const c of campsArr) {
        const cid = pickStr(c, "id", "camp_id") ?? "";
        const arr = Array.isArray(c.registrations) ? (c.registrations as Row[]) : [];
        for (const row of arr) { flat++; const m = mapRosterRow(row, cid); if (m) regs.push(m); }
      }
      if (flat === 0) {
        for (const row of unwrapList(all)) {
          const cid = pickStr(row, "camp_id", "campId") ?? "";
          if (!cid) continue;
          const m = mapRosterRow(row, cid); if (m) regs.push(m);
        }
      }
      ok = regs.length > 0;
    } catch { /* fall through to per-camp */ }
    if (!ok) {
      for (const c of camps) {
        try {
          const roster = await callExplrExternal("roster", pickStr(c, "id") ?? "");
          for (const row of unwrapList(roster)) { const m = mapRosterRow(row, pickStr(c, "id") ?? ""); if (m) regs.push(m); }
        } catch { /* skip this camp */ }
      }
    }

    const nowIso = new Date().toISOString();
    if (camps.length > 0) {
      const { error } = await db.from("explr_camps").upsert(
        camps.map((c) => ({
          id: c.id, title: c.title, description: c.description, date: c.date, end_date: c.end_date,
          time: c.time, location: c.location, age_range: c.age_range, capacity: c.capacity,
          image: c.image, category: c.category, imported_at: nowIso, source_updated_at: c.updated_at,
        })),
        { onConflict: "id" },
      );
      if (error) throw new Error(`Camp upsert failed: ${error.message}`);
    }

    const validIds = new Set(camps.map((c) => c.id as string));
    const matched = regs.filter((r): r is NonNullable<typeof r> => !!r && validIds.has(r.camp_id));
    if (matched.length > 0) {
      const { error } = await db.from("explr_registrations").upsert(
        matched.map((r) => ({
          id: r.id, camp_id: r.camp_id, child_name: r.child_name, child_age: r.child_age,
          parent_name: r.parent_name, parent_email: r.parent_email, parent_phone: r.parent_phone,
          status: r.status, imported_at: nowIso, source_created_at: r.created_at,
        })),
        { onConflict: "id" },
      );
      if (error) throw new Error(`Registration upsert failed: ${error.message}`);
    }

    await finish({ ok: true, camps: camps.length, regs: matched.length });
    return json({ ok: true, campsImported: camps.length, registrationsImported: matched.length, syncedAt: nowIso });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finish({ ok: false, error: msg });
    return json({ ok: false, error: msg }, { status: 500 });
  }
});
