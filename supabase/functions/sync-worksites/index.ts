// sync-worksites
//
// Edge function (Supabase / Deno runtime) that pulls every worksite + its
// rostered students from the external Lovable project's worksites-roster-api
// and mirrors them into this project's public.worksites + worksite_students
// tables. Idempotent — safe to invoke repeatedly. Invoked on demand from
// /worksites (UI button) and hourly via pg_cron (see migration
// 20260518081852_worksites_sync.sql).
//
// Required secrets (set via Supabase Dashboard > Project Settings > Edge
// Function Secrets):
//   WORKSITES_API_KEY        — auth header for the source API
//   SUPABASE_URL             — this project's URL (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY — service role key (auto-provided)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SOURCE_URL =
  "https://sunzvutkerzqoqihoyoe.supabase.co/functions/v1/worksites-roster-api";

type SourceStudent = {
  intern_id: string;
  first_name: string;
  last_name: string;
  dob: string;
  email: string | null;
  school: string | null;
  grade: string;
  status: string;
};

type SourceWorksite = {
  id: string;
  name: string;
  category: string;
  description: string;
  location: string;
  contact_name: string;
  contact_email: string;
  capacity: number;
  filled: number;
  status: string;
  tags: string[];
  students: SourceStudent[];
};

type SourcePayload = {
  worksites: SourceWorksite[];
  generated_at: string;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...(init.headers ?? {}),
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const apiKey = Deno.env.get("WORKSITES_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!apiKey) {
    return json(
      { success: false, error: "WORKSITES_API_KEY secret is not set" },
      { status: 500 },
    );
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      { success: false, error: "Supabase server env missing" },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Log the run from the start so failures still leave a trace.
  const { data: runRow } = await supabase
    .from("sync_runs")
    .insert({ kind: "worksites" })
    .select("id")
    .single();
  const runId = runRow?.id as string | undefined;

  async function finishRun(
    payload: {
      ok: boolean;
      worksites_synced?: number;
      students_synced?: number;
      error?: string;
    },
  ) {
    if (!runId) return;
    await supabase
      .from("sync_runs")
      .update({
        finished_at: new Date().toISOString(),
        ok: payload.ok,
        worksites_synced: payload.worksites_synced ?? 0,
        students_synced: payload.students_synced ?? 0,
        error: payload.error ?? null,
      })
      .eq("id", runId);
  }

  // Fetch from source.
  let payload: SourcePayload;
  try {
    const sourceResp = await fetch(SOURCE_URL, {
      headers: { "x-api-key": apiKey },
    });
    if (!sourceResp.ok) {
      const text = await sourceResp.text();
      await finishRun({
        ok: false,
        error: `Source returned ${sourceResp.status}: ${text.slice(0, 500)}`,
      });
      return json(
        {
          success: false,
          error: `Source returned ${sourceResp.status}`,
          detail: text.slice(0, 500),
        },
        { status: 502 },
      );
    }
    payload = (await sourceResp.json()) as SourcePayload;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finishRun({ ok: false, error: `Fetch failed: ${msg}` });
    return json({ success: false, error: `Fetch failed: ${msg}` }, { status: 502 });
  }

  if (!Array.isArray(payload?.worksites)) {
    await finishRun({ ok: false, error: "Source payload missing 'worksites' array" });
    return json(
      { success: false, error: "Source payload missing 'worksites' array" },
      { status: 502 },
    );
  }

  // Upsert each worksite + its students. Errors on individual rows are
  // collected so a single bad row doesn't abort the whole sync.
  const errors: string[] = [];
  let worksitesSynced = 0;
  let studentsSynced = 0;

  for (const w of payload.worksites) {
    const { data: ws, error: wsErr } = await supabase
      .from("worksites")
      .upsert(
        {
          source_id: w.id,
          name: w.name,
          category: w.category,
          description: w.description,
          location: w.location,
          contact_name: w.contact_name,
          contact_email: w.contact_email,
          capacity: w.capacity,
          filled: w.filled,
          status: w.status,
          tags: Array.isArray(w.tags) ? w.tags : [],
          imported_at: new Date().toISOString(),
        },
        { onConflict: "source_id" },
      )
      .select("id")
      .single();

    if (wsErr || !ws) {
      errors.push(`worksite ${w.id}: ${wsErr?.message ?? "upsert returned no id"}`);
      continue;
    }
    worksitesSynced++;

    const students = Array.isArray(w.students) ? w.students : [];
    if (students.length > 0) {
      const studentRows = students.map((s) => ({
        worksite_id: ws.id,
        intern_id: s.intern_id,
        first_name: s.first_name,
        last_name: s.last_name,
        dob: s.dob,
        email: s.email,
        school: s.school,
        grade: s.grade,
        status: s.status,
        imported_at: new Date().toISOString(),
      }));
      const { error: stErr } = await supabase
        .from("worksite_students")
        .upsert(studentRows, { onConflict: "worksite_id,intern_id" });
      if (stErr) {
        errors.push(`students for ${w.id}: ${stErr.message}`);
      } else {
        studentsSynced += studentRows.length;
      }
    }
  }

  const ok = errors.length === 0;
  await finishRun({
    ok,
    worksites_synced: worksitesSynced,
    students_synced: studentsSynced,
    error: ok ? undefined : errors.slice(0, 5).join(" | "),
  });

  return json({
    success: ok,
    worksites_synced: worksitesSynced,
    students_synced: studentsSynced,
    errors: ok ? undefined : errors,
    source_generated_at: payload.generated_at ?? null,
  });
});
