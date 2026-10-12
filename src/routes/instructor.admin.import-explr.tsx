import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { syncExplrMore, setExplrCampEducator } from "@/lib/explr-sync.functions";

export const Route = createFileRoute("/instructor/admin/import-explr")({
  head: () => ({ meta: [{ title: "Import from ExplrMore — Admin" }] }),
  component: ImportExplrPage,
});

type ExplrCamp = {
  id: string;
  title: string;
  date: string | null;
  end_date: string | null;
  location: string | null;
  capacity: number | null;
  category: string | null;
  linked_camp_slug: string | null;
  imported_at: string;
};

type Educator = { id: string; full_name: string; email: string };
type Assignment = { explr_camp_id: string; educator_id: string };
type RegCount = { camp_id: string };
type SyncRun = {
  finished_at: string | null;
  started_at: string;
  ok: boolean;
  worksites_synced: number | null;
  students_synced: number | null;
  error: string | null;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "just now";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function ImportExplrPage() {
  const sync = useServerFn(syncExplrMore);
  const setEducator = useServerFn(setExplrCampEducator);

  const [camps, setCamps] = useState<ExplrCamp[]>([]);
  const [regCounts, setRegCounts] = useState<Record<string, number>>({});
  const [educators, setEducators] = useState<Educator[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<SyncRun | null | undefined>(undefined);

  async function load() {
    const [{ data: c }, { data: r }, { data: educs }, { data: assigns }] = await Promise.all([
      supabase
        .from("explr_camps")
        .select("id,title,date,end_date,location,capacity,category,linked_camp_slug,imported_at")
        .order("date", { ascending: false, nullsFirst: false }),
      supabase.from("explr_registrations").select("camp_id"),
      supabase
        .from("educators")
        .select("id,full_name,email")
        .eq("approved", true)
        .order("full_name"),
      // explr_camp_educators is added in migration 20260518061032 — Database
      // type regen happens after that's applied. Cast for the meantime.
      (supabase.from as (n: string) => ReturnType<typeof supabase.from>)(
        "explr_camp_educators",
      ).select("explr_camp_id, educator_id"),
    ]);
    setCamps((c ?? []) as ExplrCamp[]);
    const counts: Record<string, number> = {};
    for (const row of (r ?? []) as RegCount[]) {
      counts[row.camp_id] = (counts[row.camp_id] ?? 0) + 1;
    }
    setRegCounts(counts);
    setEducators((educs ?? []) as Educator[]);
    setAssignments((assigns ?? []) as unknown as Assignment[]);

    // sync_runs is newer than the generated types — untyped cast.
    const { data: run } = await (supabase.from as unknown as (n: string) => any)("sync_runs")
      .select("finished_at, started_at, ok, worksites_synced, students_synced, error")
      .eq("kind", "explr_roster")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLastSync((run as SyncRun) ?? null);
  }
  useEffect(() => {
    load();
  }, []);

  const assignedByCamp = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const a of assignments) {
      if (!m.has(a.explr_camp_id)) m.set(a.explr_camp_id, new Set());
      m.get(a.explr_camp_id)!.add(a.educator_id);
    }
    return m;
  }, [assignments]);

  async function runSync() {
    setSyncing(true);
    setErr(null);
    setMsg(null);
    setDebugInfo(null);
    try {
      const res = await sync({});
      const orphanedNote =
        res.registrationsOrphaned > 0
          ? ` · ${res.registrationsOrphaned} skipped (no matching camp_id)`
          : "";
      const removedNote =
        res.registrationsRemoved > 0
          ? ` · ${res.registrationsRemoved} removed (no longer on the ExplrMore roster)`
          : "";
      setMsg(
        `Camps: ${res.campsImported} imported. Registrations: ${res.registrationsImported} imported of ${res.registrationsFetched} fetched from ExplrMore${removedNote}${orphanedNote}.`,
      );
      setDebugInfo(
        res.rosterErrors.length > 0
          ? JSON.stringify({ rosterErrors: res.rosterErrors }, null, 2)
          : null,
      );
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function toggleEducator(explrCampId: string, educatorId: string, on: boolean) {
    try {
      await setEducator({ data: { explrCampId, educatorId, on } });
      setAssignments((prev) =>
        on
          ? [...prev, { explr_camp_id: explrCampId, educator_id: educatorId }]
          : prev.filter((a) => !(a.explr_camp_id === explrCampId && a.educator_id === educatorId)),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Assignment failed");
    }
  }

  return (
    <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Import from ExplrMore</h1>
      <p className="lead mt-3 max-w-2xl">
        Pull camps and family registrations from the ExplrMore registration system, link each
        instance and assign EXPLR instructors. Instructors never touch ExplrMore. Parents and
        students never see this site.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={runSync}
          disabled={syncing}
          className="btn-ink disabled:opacity-60"
        >
          {syncing ? "Syncing…" : "Sync now"}
        </button>
        {msg && <span className="text-sm text-green-deep">{msg}</span>}
        {err && <span className="text-sm text-red-700">{err}</span>}
      </div>

      <p className="mt-3 text-sm text-ink-700">
        {lastSync === undefined
          ? "Checking last sync…"
          : lastSync === null
            ? "Never synced yet."
            : `Last synced ${timeAgo(lastSync.finished_at ?? lastSync.started_at)} · ${lastSync.worksites_synced ?? 0} camps · ${lastSync.students_synced ?? 0} registrations${lastSync.ok ? "" : " · last run had errors"}`}
      </p>
      <p className="mt-1 text-xs text-ink-500">
        Updates automatically each day once the <code className="font-mono">sync-explr</code> daily
        schedule is enabled in Supabase (see setup). You can also Sync now anytime.
      </p>

      {debugInfo && (
        <details className="mt-4 rounded-[var(--radius-control)] border border-line bg-paper-sunken p-3 text-xs">
          <summary className="cursor-pointer font-medium text-ink-900">Roster sync errors</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-ink-700">{debugInfo}</pre>
        </details>
      )}

      <p className="mt-4 text-sm text-ink-500">
        A student missing from a roster? Open the camp&apos;s row — Roster health shows whether they
        came over from ExplrMore and whether their login has been generated yet.
      </p>

      <div className="mt-8 overflow-x-auto rounded-[var(--radius-card)] border border-line">
        <table className="w-full text-sm">
          <thead className="bg-paper-sunken text-left font-mono text-[11px] uppercase tracking-[0.08em] text-ink-500">
            <tr>
              <th className="py-3 pl-4 pr-1 font-medium" />
              <th className="px-3 py-3 font-medium">Camp</th>
              <th className="px-3 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Roster</th>
              <th className="px-3 py-3 font-medium">Instructors</th>
            </tr>
          </thead>
          <tbody className="bg-paper-raised">
            {camps.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-500">
                  No camps imported yet.
                </td>
              </tr>
            ) : (
              camps.map((c) => {
                const isOpen = expandedId === c.id;
                const rosterCount = regCounts[c.id] ?? 0;
                const assignedSet = assignedByCamp.get(c.id) ?? new Set<string>();
                return (
                  <Fragment key={c.id}>
                    <tr className="border-t border-line">
                      <td className="py-2 pl-3 pr-1 align-top">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isOpen ? null : c.id)}
                          className="grid h-9 w-9 place-items-center rounded-[var(--radius-control)] text-ink-500 hover:bg-paper-sunken hover:text-ink-900"
                          aria-label={isOpen ? "Collapse" : "Expand"}
                          aria-expanded={isOpen}
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                            aria-hidden
                          />
                        </button>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="font-medium text-ink-900">{c.title}</div>
                        <div className="text-xs text-ink-500">{c.location ?? "—"}</div>
                      </td>
                      <td className="px-3 py-3 align-top text-ink-700">
                        {c.date ?? "—"}
                        {c.end_date ? ` → ${c.end_date}` : ""}
                      </td>
                      <td className="px-3 py-3 align-top text-ink-700 tabular-nums">
                        {rosterCount}
                      </td>
                      <td className="px-3 py-3 align-top text-ink-700">
                        {assignedSet.size === 0 ? (
                          <span className="text-ink-500">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {[...assignedSet].map((eid) => {
                              const e = educators.find((x) => x.id === eid);
                              return (
                                <span
                                  key={eid}
                                  className="inline-block rounded-full bg-mint-tint px-2 py-0.5 text-[11px] font-medium text-green-deep"
                                >
                                  {e?.full_name ?? eid.slice(0, 6)}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="border-t border-line bg-paper-sunken">
                        <td className="px-4 py-5" colSpan={5}>
                          {/* Roster health — ExplrMore registrations vs generated
                              logins, so a missing kid is diagnosable at a glance. */}
                          <section className="mb-6">
                            <p className="eyebrow">Roster health</p>
                            <RosterHealth campId={c.id} />
                          </section>
                          <div className="grid gap-6 md:grid-cols-2">
                            {/* Educator assignment */}
                            <section>
                              <p className="eyebrow">Assigned instructors</p>
                              <p className="mt-1 text-xs text-ink-500">
                                Pick every EXPLR instructor who&apos;s running this instance —
                                co-teaches, sub-instructors, all of them. They each get this camp on
                                their dashboard.
                              </p>
                              {educators.length === 0 ? (
                                <p className="mt-3 text-xs text-ink-500">
                                  No approved instructors yet. Approve someone first.
                                </p>
                              ) : (
                                <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-[var(--radius-control)] border border-line bg-paper-raised p-2">
                                  {educators.map((e) => {
                                    const on = assignedSet.has(e.id);
                                    return (
                                      <li
                                        key={e.id}
                                        className="flex min-h-[40px] items-center gap-2 px-2 py-1"
                                      >
                                        <input
                                          type="checkbox"
                                          className="h-4 w-4 accent-green"
                                          checked={on}
                                          onChange={() => toggleEducator(c.id, e.id, !on)}
                                        />
                                        <span className="text-sm text-ink-900">{e.full_name}</span>
                                        <span className="text-xs text-ink-500">{e.email}</span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </section>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

/**
 * RosterHealth — compares this camp's imported ExplrMore registrations
 * against the generated logins, and names the mismatches in both directions:
 * registered kids with no login yet (needs Generate on Camp logins), and
 * logins that aren't on the ExplrMore roster (walk-ins, or kids removed /
 * moved to another session at the source).
 */
type HealthReg = { id: string; child_name: string };
type HealthLogin = { id: string; child_name: string; explr_registration_id: string | null };

function RosterHealth({ campId }: { campId: string }) {
  const [regs, setRegs] = useState<HealthReg[] | null>(null);
  const [logins, setLogins] = useState<HealthLogin[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: r }, { data: l }] = await Promise.all([
        supabase.from("explr_registrations").select("id, child_name").eq("camp_id", campId),
        supabase
          .from("camp_student_logins")
          .select("id, child_name, explr_registration_id")
          .eq("explr_camp_id", campId),
      ]);
      if (cancelled) return;
      setRegs((r ?? []) as HealthReg[]);
      setLogins((l ?? []) as HealthLogin[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [campId]);

  if (!regs || !logins) {
    return <p className="mt-2 text-xs text-ink-500">Checking roster health…</p>;
  }

  const regIds = new Set(regs.map((r) => r.id));
  const withLogin = new Set(
    logins.map((l) => l.explr_registration_id).filter((x): x is string => !!x),
  );
  const needLogin = regs.filter((r) => !withLogin.has(r.id));
  const notOnRoster = logins.filter(
    (l) => !l.explr_registration_id || !regIds.has(l.explr_registration_id),
  );
  const healthy = needLogin.length === 0 && notOnRoster.length === 0;

  return (
    <div className="mt-2 text-sm">
      <p className="text-xs text-ink-500">
        {regs.length} on the ExplrMore roster · {logins.length} logins generated
        {healthy && <span className="ml-2 text-green-deep">✓ in sync</span>}
      </p>

      {needLogin.length > 0 && (
        <div className="mt-2 rounded-[var(--radius-control)] border border-gold bg-gold-tint px-3 py-2">
          <p className="text-xs font-medium text-ink-900">
            On the ExplrMore roster, no login yet ({needLogin.length}) — run &ldquo;Generate&rdquo;
            on the Camp logins page:
          </p>
          <p className="mt-1 text-xs text-ink-700">
            {needLogin.map((r) => r.child_name).join(", ")}
          </p>
        </div>
      )}

      {notOnRoster.length > 0 && (
        <div className="mt-2 rounded-[var(--radius-control)] border border-line bg-paper-raised px-3 py-2">
          <p className="text-xs font-medium text-ink-700">
            Has a login here but isn&apos;t on the ExplrMore roster ({notOnRoster.length}) —
            walk-ins, or removed / moved to another session in ExplrMore:
          </p>
          <p className="mt-1 text-xs text-ink-700">
            {notOnRoster.map((l) => l.child_name).join(", ")}
          </p>
        </div>
      )}

      <p className="mt-2 text-xs text-ink-500">
        Someone missing from both lists? They didn&apos;t come over from ExplrMore — run Sync now
        and check the roster sync errors above.
      </p>
    </div>
  );
}
