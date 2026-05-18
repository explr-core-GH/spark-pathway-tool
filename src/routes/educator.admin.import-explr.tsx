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
    try {
      const res = await sync({});
      // Show fetched-vs-imported so a schema mismatch is visible, not silent.
      const orphanedNote =
        res.registrationsOrphaned > 0
          ? ` · ${res.registrationsOrphaned} skipped (no matching camp_id)`
          : "";
      setMsg(
        `Camps: ${res.campsImported} imported. Registrations: ${res.registrationsImported} imported of ${res.registrationsFetched} fetched from ExplrMore${orphanedNote}.`,
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
