import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/worksites")({
  head: () => ({ meta: [{ title: "Worksites — EXPLR" }] }),
  component: WorksitesPage,
});

type Worksite = {
  id: string;
  source_id: string;
  name: string;
  category: string | null;
  description: string | null;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  capacity: number | null;
  filled: number | null;
  status: string | null;
  tags: string[] | null;
  imported_at: string;
};

type Student = {
  id: string;
  worksite_id: string;
  intern_id: string;
  first_name: string;
  last_name: string;
  dob: string | null;
  email: string | null;
  school: string | null;
  grade: string | null;
  status: string | null;
};

type SyncRun = {
  id: string;
  started_at: string;
  finished_at: string | null;
  worksites_synced: number | null;
  students_synced: number | null;
  ok: boolean;
  error: string | null;
};

function WorksitesPage() {
  return (
    // Worksite rosters contain student data — admin-only by default. Loosen
    // here if you want educators to see the same view.
    <RoleGuard requires="admin">
      <WorksitesInner />
    </RoleGuard>
  );
}

function WorksitesInner() {
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [lastRun, setLastRun] = useState<SyncRun | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function load() {
    // worksites / worksite_students / sync_runs are added in migration
    // 20260518081852_worksites_sync.sql — cast through the loose-typed
    // overload until the Database type regenerates after the migration
    // applies in Lovable Cloud.
    const looseFrom = supabase.from as (n: string) => ReturnType<typeof supabase.from>;
    const [{ data: ws }, { data: st }, { data: runs }] = await Promise.all([
      looseFrom("worksites").select("*").order("name", { ascending: true }),
      looseFrom("worksite_students")
        .select("*")
        .order("last_name", { ascending: true }),
      looseFrom("sync_runs")
        .select("*")
        .eq("kind", "worksites")
        .order("started_at", { ascending: false })
        .limit(1),
    ]);
    setWorksites(((ws ?? []) as unknown) as Worksite[]);
    setStudents(((st ?? []) as unknown) as Student[]);
    setLastRun((((runs ?? [])[0] as unknown) as SyncRun) ?? null);
  }

  useEffect(() => {
    load();
  }, []);

  async function syncNow() {
    setSyncing(true);
    setErr(null);
    setMsg(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke(
        "sync-worksites",
        { body: {} },
      );
      if (invokeErr) throw invokeErr;
      const ok = (data as { success?: boolean } | null)?.success === true;
      const ws = (data as { worksites_synced?: number } | null)?.worksites_synced ?? 0;
      const stCount = (data as { students_synced?: number } | null)?.students_synced ?? 0;
      if (ok) {
        setMsg(`Synced ${ws} worksite${ws === 1 ? "" : "s"} and ${stCount} student${stCount === 1 ? "" : "s"}.`);
      } else {
        const errMsg = (data as { error?: string } | null)?.error ?? "Sync reported failure";
        setErr(errMsg);
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sync invocation failed");
    } finally {
      setSyncing(false);
    }
  }

  // Filter: match worksite name OR any student in that worksite.
  const studentsByWorksite = useMemo(() => {
    const m = new Map<string, Student[]>();
    for (const s of students) {
      if (!m.has(s.worksite_id)) m.set(s.worksite_id, []);
      m.get(s.worksite_id)!.push(s);
    }
    return m;
  }, [students]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return worksites;
    return worksites.filter((w) => {
      if (w.name.toLowerCase().includes(needle)) return true;
      const ss = studentsByWorksite.get(w.id) ?? [];
      return ss.some(
        (s) =>
          `${s.first_name} ${s.last_name}`.toLowerCase().includes(needle) ||
          (s.school ?? "").toLowerCase().includes(needle),
      );
    });
  }, [q, worksites, studentsByWorksite]);

  const lastSyncedText = lastRun?.finished_at
    ? `Last synced ${new Date(lastRun.finished_at).toLocaleString()}`
    : lastRun?.started_at
      ? `Started ${new Date(lastRun.started_at).toLocaleString()} (no finish recorded)`
      : "Never synced";

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="eyebrow">Imports</p>
      <h1 className="display mt-2">Worksites</h1>
      <p className="lead mt-3 max-w-2xl">
        Synced from the external worksites-roster-api every hour, and on
        demand below. Each card shows a worksite&apos;s metadata plus its
        roster of assigned students.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={syncNow}
          disabled={syncing}
          className="btn-ink disabled:opacity-60"
        >
          {syncing ? "Syncing…" : "Sync now"}
        </button>
        <span className="text-sm text-charcoal-500">{lastSyncedText}</span>
        {msg && <span className="text-sm text-emerald-700">{msg}</span>}
        {err && <span className="text-sm text-red-700">{err}</span>}
      </div>

      <div className="mt-8">
        <label className="label">Search worksites or students</label>
        <input
          className="field mt-1 max-w-md"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Clinic, Maria, Lincoln HS"
        />
      </div>

      {worksites.length === 0 ? (
        <div className="mt-10 border border-dashed border-charcoal-200 p-8 text-sm text-charcoal-500">
          No worksites synced yet. Click <strong>Sync now</strong> above.
        </div>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {filtered.map((w) => {
            const roster = studentsByWorksite.get(w.id) ?? [];
            return (
              <article
                key={w.id}
                className="border border-charcoal-100 bg-white p-5"
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-medium text-ink truncate">
                      {w.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-charcoal-500">
                      {w.category ?? "—"}
                      {w.location ? ` · ${w.location}` : ""}
                      {w.status ? ` · ${w.status}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-charcoal-400 tabular-nums">
                    {(w.filled ?? roster.length)} / {w.capacity ?? "—"}
                  </span>
                </header>

                {w.description && (
                  <p className="mt-3 text-sm text-charcoal-700">{w.description}</p>
                )}

                {(w.contact_name || w.contact_email) && (
                  <p className="mt-3 text-xs text-charcoal-500">
                    Contact: {w.contact_name ?? "—"}
                    {w.contact_email ? ` · ${w.contact_email}` : ""}
                  </p>
                )}

                {w.tags && w.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {w.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-block border border-charcoal-200 px-1.5 py-0.5 text-[11px] text-charcoal-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 border-t border-charcoal-100 pt-3">
                  <p className="eyebrow">
                    Roster · {roster.length}
                  </p>
                  {roster.length === 0 ? (
                    <p className="mt-2 text-xs text-charcoal-400">
                      No students rostered to this worksite yet.
                    </p>
                  ) : (
                    <ul className="mt-2 divide-y divide-charcoal-50 text-sm">
                      {roster.map((s) => (
                        <li key={s.id} className="py-2">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-medium text-ink">
                              {s.first_name} {s.last_name}
                            </span>
                            <span className="text-xs text-charcoal-400">
                              {s.grade ? `Grade ${s.grade}` : ""}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-charcoal-500">
                            {s.dob ? `DOB ${s.dob}` : "—"}
                            {s.school ? ` · ${s.school}` : ""}
                            {s.email ? ` · ${s.email}` : ""}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && worksites.length > 0 && (
        <p className="mt-10 text-sm text-charcoal-500">
          No worksites or students match &ldquo;{q}&rdquo;.
        </p>
      )}
    </main>
  );
}
