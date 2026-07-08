import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  syncExplrMore,
  linkExplrCamp,
  setExplrCampEducator,
} from "@/lib/explr-sync.functions";

export const Route = createFileRoute("/educator/admin/import-explr")({
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

type CampOption = { slug: string; name: string; emoji: string };
type Educator = { id: string; full_name: string; email: string };
type Assignment = { explr_camp_id: string; educator_id: string };
type CurriculumLink = { explr_camp_id: string; camp_slug: string };
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
  const linkCamp = useServerFn(linkExplrCamp);
  const setEducator = useServerFn(setExplrCampEducator);

  const [camps, setCamps] = useState<ExplrCamp[]>([]);
  const [regCounts, setRegCounts] = useState<Record<string, number>>({});
  const [campOptions, setCampOptions] = useState<CampOption[]>([]);
  const [educators, setEducators] = useState<Educator[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [curriculumLinks, setCurriculumLinks] = useState<CurriculumLink[]>([]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<SyncRun | null | undefined>(undefined);

  async function load() {
    const [
      { data: c },
      { data: r },
      { data: local },
      { data: educs },
      { data: assigns },
      { data: links },
    ] = await Promise.all([
      supabase
        .from("explr_camps")
        .select("id,title,date,end_date,location,capacity,category,linked_camp_slug,imported_at")
        .order("date", { ascending: false, nullsFirst: false }),
      supabase.from("explr_registrations").select("camp_id"),
      supabase.from("camps").select("slug,name,emoji").order("name"),
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
      // explr_camp_curriculum_links is added in migration 20260518064003.
      (supabase.from as (n: string) => ReturnType<typeof supabase.from>)(
        "explr_camp_curriculum_links",
      ).select("explr_camp_id, camp_slug"),
    ]);
    setCamps((c ?? []) as ExplrCamp[]);
    const counts: Record<string, number> = {};
    for (const row of (r ?? []) as RegCount[]) {
      counts[row.camp_id] = (counts[row.camp_id] ?? 0) + 1;
    }
    setRegCounts(counts);
    setCampOptions((local ?? []) as CampOption[]);
    setEducators((educs ?? []) as Educator[]);
    setAssignments(((assigns ?? []) as unknown) as Assignment[]);
    setCurriculumLinks(((links ?? []) as unknown) as CurriculumLink[]);

    // sync_runs is newer than the generated types — untyped cast.
    const { data: run } = await (supabase.from as unknown as (n: string) => any)("sync_runs")
      .select("finished_at, started_at, ok, worksites_synced, students_synced, error")
      .eq("kind", "explr_roster")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLastSync((run as SyncRun) ?? null);
  }
  useEffect(() => { load(); }, []);

  const assignedByCamp = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const a of assignments) {
      if (!m.has(a.explr_camp_id)) m.set(a.explr_camp_id, new Set());
      m.get(a.explr_camp_id)!.add(a.educator_id);
    }
    return m;
  }, [assignments]);

  const curriculumByCamp = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of curriculumLinks) {
      if (!m.has(l.explr_camp_id)) m.set(l.explr_camp_id, new Set());
      m.get(l.explr_camp_id)!.add(l.camp_slug);
    }
    return m;
  }, [curriculumLinks]);

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

  async function toggleCurriculumLink(explrCampId: string, slug: string) {
    const current = curriculumByCamp.get(explrCampId) ?? new Set<string>();
    const next = new Set(current);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    const linkedCampSlugs = [...next];
    try {
      await linkCamp({ data: { explrCampId, linkedCampSlugs } });
      // Replace this camp's links in local state.
      setCurriculumLinks((prev) => [
        ...prev.filter((l) => l.explr_camp_id !== explrCampId),
        ...linkedCampSlugs.map((s) => ({ explr_camp_id: explrCampId, camp_slug: s })),
      ]);
      setCamps((prev) =>
        prev.map((c) =>
          c.id === explrCampId ? { ...c, linked_camp_slug: linkedCampSlugs[0] ?? null } : c,
        ),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Link failed");
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
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-ink">Import from ExplrMore</h1>
      <p className="mt-2 text-sm text-charcoal-500">
        Pull camps and family registrations from the ExplrMore registration system, link
        each instance to its curriculum, and assign EXPLR educators. Educators never touch
        ExplrMore. Parents and students never see this site.
      </p>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={runSync}
          disabled={syncing}
          className="btn-ink disabled:opacity-60"
        >
          {syncing ? "Syncing…" : "Sync now"}
        </button>
        {msg && <span className="text-sm text-emerald-700">{msg}</span>}
        {err && <span className="text-sm text-red-700">{err}</span>}
      </div>

      <p className="mt-3 text-sm text-charcoal-500">
        {lastSync === undefined
          ? "Checking last sync…"
          : lastSync === null
            ? "Never synced yet."
            : `Last synced ${timeAgo(lastSync.finished_at ?? lastSync.started_at)} · ${lastSync.worksites_synced ?? 0} camps · ${lastSync.students_synced ?? 0} registrations${lastSync.ok ? "" : " · last run had errors"}`}
      </p>
      <p className="mt-1 text-xs text-charcoal-400">
        Updates automatically each day once the <code className="font-mono">sync-explr</code> daily
        schedule is enabled in Supabase (see setup). You can also Sync now anytime.
      </p>

      {debugInfo && (
        <details className="mt-4 rounded border border-charcoal-200 bg-charcoal-50 p-3 text-xs">
          <summary className="cursor-pointer font-medium text-ink">Roster sync errors</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-charcoal-700">{debugInfo}</pre>
        </details>
      )}

      <p className="mt-4 text-xs text-charcoal-500">
        A student missing from a roster? Open the camp&apos;s row — Roster health shows whether
        they came over from ExplrMore and whether their login has been generated yet.
      </p>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-charcoal-100 text-left text-xs uppercase tracking-wider text-charcoal-400">
              <th className="py-2 pr-3" />
              <th className="py-2 pr-3">Camp</th>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Roster</th>
              <th className="py-2 pr-3">Educators</th>
              <th className="py-2 pr-3">Curriculum</th>
            </tr>
          </thead>
          <tbody>
            {camps.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-charcoal-400">
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
                    <tr className="border-b border-charcoal-50">
                      <td className="py-3 pr-3 align-top">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isOpen ? null : c.id)}
                          className="text-charcoal-400 hover:text-ink"
                          aria-label={isOpen ? "Collapse" : "Expand"}
                        >
                          {isOpen ? "▾" : "▸"}
                        </button>
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <div className="font-medium text-ink">{c.title}</div>
                        <div className="text-xs text-charcoal-400">{c.location ?? "—"}</div>
                      </td>
                      <td className="py-3 pr-3 align-top text-charcoal-600">
                        {c.date ?? "—"}
                        {c.end_date ? ` → ${c.end_date}` : ""}
                      </td>
                      <td className="py-3 pr-3 align-top text-charcoal-600 tabular-nums">
                        {rosterCount}
                      </td>
                      <td className="py-3 pr-3 align-top text-charcoal-600">
                        {assignedSet.size === 0 ? (
                          <span className="text-charcoal-300">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {[...assignedSet].map((eid) => {
                              const e = educators.find((x) => x.id === eid);
                              return (
                                <span
                                  key={eid}
                                  className="inline-block border border-charcoal-200 bg-white px-1.5 py-0.5 text-[11px] text-ink"
                                >
                                  {e?.full_name ?? eid.slice(0, 6)}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-3 align-top text-charcoal-600">
                        {(() => {
                          const slugs = [...(curriculumByCamp.get(c.id) ?? [])];
                          if (slugs.length === 0)
                            return <span className="text-charcoal-300">—</span>;
                          return (
                            <div className="flex flex-wrap gap-1">
                              {slugs.map((slug) => {
                                const o = campOptions.find((x) => x.slug === slug);
                                return (
                                  <span
                                    key={slug}
                                    className="inline-block border border-charcoal-200 bg-white px-1.5 py-0.5 text-[11px] text-ink"
                                  >
                                    <span aria-hidden className="mr-1">
                                      {o?.emoji ?? "📄"}
                                    </span>
                                    {o?.name ?? slug}
                                  </span>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="border-b border-charcoal-100 bg-charcoal-50/40">
                        <td className="py-5 pl-3 pr-3" colSpan={6}>
                          {/* Roster health — ExplrMore registrations vs generated
                              logins, so a missing kid is diagnosable at a glance. */}
                          <section className="mb-6">
                            <p className="eyebrow">Roster health</p>
                            <RosterHealth campId={c.id} />
                          </section>
                          <div className="grid gap-6 md:grid-cols-2">
                            {/* Educator assignment */}
                            <section>
                              <p className="eyebrow">Assigned educators</p>
                              <p className="mt-1 text-xs text-charcoal-500">
                                Pick every EXPLR educator who&apos;s running this instance —
                                co-teaches, sub-instructors, all of them. They each get this
                                camp on their dashboard.
                              </p>
                              {educators.length === 0 ? (
                                <p className="mt-3 text-xs text-charcoal-400">
                                  No approved educators yet. Approve someone first.
                                </p>
                              ) : (
                                <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto border border-charcoal-100 bg-white p-2">
                                  {educators.map((e) => {
                                    const on = assignedSet.has(e.id);
                                    return (
                                      <li key={e.id} className="flex items-center gap-2 px-2 py-1">
                                        <input
                                          type="checkbox"
                                          checked={on}
                                          onChange={() => toggleEducator(c.id, e.id, !on)}
                                        />
                                        <span className="text-sm text-ink">{e.full_name}</span>
                                        <span className="text-xs text-charcoal-400">{e.email}</span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </section>

                            {/* Curriculum (multi-select) */}
                            <section>
                              <p className="eyebrow">Linked curriculum</p>
                              <p className="mt-1 text-xs text-charcoal-500">
                                Connect this camp instance to one or more curriculum items.
                                Pick everything that fits.
                              </p>
                              {campOptions.length === 0 ? (
                                <p className="mt-3 text-xs text-charcoal-400">
                                  No curriculum items yet. Add one under Catalog → Curriculum.
                                </p>
                              ) : (
                                <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto border border-charcoal-100 bg-white p-2">
                                  {campOptions.map((o) => {
                                    const linked = curriculumByCamp.get(c.id)?.has(o.slug) ?? false;
                                    return (
                                      <li key={o.slug} className="flex items-center gap-2 px-2 py-1">
                                        <input
                                          type="checkbox"
                                          checked={linked}
                                          onChange={() => toggleCurriculumLink(c.id, o.slug)}
                                        />
                                        <span aria-hidden>{o.emoji}</span>
                                        <span className="text-sm text-ink">{o.name}</span>
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
    </div>
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
    return <p className="mt-2 text-xs text-charcoal-400">Checking roster health…</p>;
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
      <p className="text-xs text-charcoal-500">
        {regs.length} on the ExplrMore roster · {logins.length} logins generated
        {healthy && <span className="ml-2 text-explr-600">✓ in sync</span>}
      </p>

      {needLogin.length > 0 && (
        <div className="mt-2 border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-medium text-amber-900">
            On the ExplrMore roster, no login yet ({needLogin.length}) — run
            &ldquo;Generate&rdquo; on the Camp logins page:
          </p>
          <p className="mt-1 text-xs text-amber-800">
            {needLogin.map((r) => r.child_name).join(", ")}
          </p>
        </div>
      )}

      {notOnRoster.length > 0 && (
        <div className="mt-2 border border-charcoal-200 bg-charcoal-50 px-3 py-2">
          <p className="text-xs font-medium text-charcoal-700">
            Has a login here but isn&apos;t on the ExplrMore roster ({notOnRoster.length}) —
            walk-ins, or removed / moved to another session in ExplrMore:
          </p>
          <p className="mt-1 text-xs text-charcoal-600">
            {notOnRoster.map((l) => l.child_name).join(", ")}
          </p>
        </div>
      )}

      <p className="mt-2 text-[11px] text-charcoal-400">
        Someone missing from both lists? They didn&apos;t come over from ExplrMore — run Sync
        now and check the roster sync errors above.
      </p>
    </div>
  );
}
