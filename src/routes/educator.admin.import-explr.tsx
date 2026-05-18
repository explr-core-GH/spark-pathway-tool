import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  syncExplrMore,
  linkExplrCamp,
  setExplrCampEducator,
  generateExplrCampLogins,
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

type RegRow = {
  id: string;
  camp_id: string;
  child_name: string | null;
  parent_name: string | null;
  parent_email: string | null;
};

type CampOption = { slug: string; name: string };
type Educator = { id: string; full_name: string; email: string };
type Assignment = { explr_camp_id: string; educator_id: string };

type LoginResult = {
  registrationId: string;
  childName: string | null;
  parentName: string | null;
  parentEmail: string | null;
  link: string | null;
  error: string | null;
};

function ImportExplrPage() {
  const sync = useServerFn(syncExplrMore);
  const linkCamp = useServerFn(linkExplrCamp);
  const setEducator = useServerFn(setExplrCampEducator);
  const generateLogins = useServerFn(generateExplrCampLogins);

  const [camps, setCamps] = useState<ExplrCamp[]>([]);
  const [regs, setRegs] = useState<RegRow[]>([]);
  const [campOptions, setCampOptions] = useState<CampOption[]>([]);
  const [educators, setEducators] = useState<Educator[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [logins, setLogins] = useState<Record<string, LoginResult[]>>({});
  const [loginsBusy, setLoginsBusy] = useState<Record<string, boolean>>({});

  async function load() {
    const [{ data: c }, { data: r }, { data: local }, { data: educs }, { data: assigns }] =
      await Promise.all([
        supabase
          .from("explr_camps")
          .select("id,title,date,end_date,location,capacity,category,linked_camp_slug,imported_at")
          .order("date", { ascending: false, nullsFirst: false }),
        supabase
          .from("explr_registrations")
          .select("id,camp_id,child_name,parent_name,parent_email"),
        supabase.from("camps").select("slug,name").order("name"),
        supabase.from("educators").select("id,full_name,email").eq("approved", true).order("full_name"),
        // explr_camp_educators is added in migration 20260518061032 — Database
        // type regen happens after that's applied. Cast for the meantime.
        (supabase.from as (n: string) => ReturnType<typeof supabase.from>)(
          "explr_camp_educators",
        ).select("explr_camp_id, educator_id"),
      ]);
    setCamps((c ?? []) as ExplrCamp[]);
    setRegs((r ?? []) as RegRow[]);
    setCampOptions((local ?? []) as CampOption[]);
    setEducators((educs ?? []) as Educator[]);
    setAssignments(((assigns ?? []) as unknown) as Assignment[]);
  }
  useEffect(() => { load(); }, []);

  const regsByCamp = useMemo(() => {
    const m = new Map<string, RegRow[]>();
    for (const r of regs) {
      if (!m.has(r.camp_id)) m.set(r.camp_id, []);
      m.get(r.camp_id)!.push(r);
    }
    return m;
  }, [regs]);

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
    try {
      const res = await sync({});
      setMsg(`Imported ${res.campsImported} camps and ${res.registrationsImported} registrations.`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function onLinkChange(id: string, slug: string) {
    try {
      await linkCamp({ data: { explrCampId: id, linkedCampSlug: slug || null } });
      setCamps((prev) => prev.map((c) => (c.id === id ? { ...c, linked_camp_slug: slug || null } : c)));
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

  async function runGenerate(explrCampId: string) {
    setLoginsBusy((b) => ({ ...b, [explrCampId]: true }));
    try {
      const res = await generateLogins({ data: { explrCampId } });
      setLogins((m) => ({ ...m, [explrCampId]: res.results }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login generation failed");
    } finally {
      setLoginsBusy((b) => ({ ...b, [explrCampId]: false }));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-ink">Import from ExplrMore</h1>
      <p className="mt-2 text-sm text-charcoal-500">
        Pull camps and family registrations from the ExplrMore registration system, link each
        instance to its curriculum, assign EXPLR educators, and generate one-click logins for
        every roster row. Educators never touch ExplrMore.
      </p>

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={runSync}
          disabled={syncing}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
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
              <th className="py-2 pr-3">Linked curriculum</th>
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
                const rosterCount = regsByCamp.get(c.id)?.length ?? 0;
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
                      <td className="py-3 pr-3 align-top text-charcoal-600 tabular-nums">
                        {assignedSet.size}
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <select
                          value={c.linked_camp_slug ?? ""}
                          onChange={(e) => onLinkChange(c.id, e.target.value)}
                          className="rounded border border-charcoal-200 bg-white px-2 py-1 text-sm"
                        >
                          <option value="">— not linked —</option>
                          {campOptions.map((o) => (
                            <option key={o.slug} value={o.slug}>{o.name}</option>
                          ))}
                        </select>
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
                                Pick the EXPLR educator(s) running this instance. Only they get
                                this camp on their dashboard.
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

                            {/* Roster + login generation */}
                            <section>
                              <div className="flex items-center justify-between">
                                <p className="eyebrow">Roster · {rosterCount}</p>
                                <button
                                  type="button"
                                  onClick={() => runGenerate(c.id)}
                                  disabled={loginsBusy[c.id] || rosterCount === 0}
                                  className="rounded border border-charcoal-200 bg-white px-3 py-1 text-xs font-medium text-ink hover:border-ink disabled:opacity-60"
                                >
                                  {loginsBusy[c.id] ? "Generating…" : "Generate logins"}
                                </button>
                              </div>
                              <p className="mt-1 text-xs text-charcoal-500">
                                Creates a one-click magic-link login for every parent email on
                                the roster. Copy + paste into your email/SMS tool to distribute.
                              </p>

                              {logins[c.id] ? (
                                <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto border border-charcoal-100 bg-white p-2 text-xs">
                                  {logins[c.id].map((row) => (
                                    <li
                                      key={row.registrationId}
                                      className="border-b border-charcoal-50 px-1 py-2 last:border-0"
                                    >
                                      <div className="flex items-baseline justify-between gap-2">
                                        <span className="font-medium text-ink">
                                          {row.childName ?? "(no child name)"}
                                        </span>
                                        <span className="text-charcoal-400">
                                          {row.parentName ?? ""}
                                        </span>
                                      </div>
                                      <div className="mt-0.5 text-charcoal-500">
                                        {row.parentEmail ?? "—"}
                                      </div>
                                      {row.link ? (
                                        <div className="mt-1 flex items-center gap-2">
                                          <code className="flex-1 truncate font-mono text-[10px] text-charcoal-700">
                                            {row.link}
                                          </code>
                                          <button
                                            type="button"
                                            onClick={() => navigator.clipboard?.writeText(row.link!)}
                                            className="shrink-0 text-[10px] font-semibold text-emerald-700 hover:text-emerald-900"
                                          >
                                            Copy
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="mt-1 text-[10px] text-red-700">
                                          {row.error ?? "No link generated"}
                                        </div>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto border border-charcoal-100 bg-white p-2 text-xs">
                                  {(regsByCamp.get(c.id) ?? []).map((r) => (
                                    <li
                                      key={r.id}
                                      className="border-b border-charcoal-50 px-1 py-1.5 last:border-0"
                                    >
                                      <div className="flex items-baseline justify-between gap-2">
                                        <span className="font-medium text-ink">
                                          {r.child_name ?? "(no child name)"}
                                        </span>
                                        <span className="text-charcoal-400">
                                          {r.parent_name ?? ""}
                                        </span>
                                      </div>
                                      <div className="mt-0.5 text-charcoal-500">
                                        {r.parent_email ?? "—"}
                                      </div>
                                    </li>
                                  ))}
                                  {rosterCount === 0 && (
                                    <li className="px-1 py-2 text-charcoal-400">
                                      No registrations on this camp yet.
                                    </li>
                                  )}
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
