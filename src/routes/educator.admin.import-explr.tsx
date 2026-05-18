import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { syncExplrMore, linkExplrCamp } from "@/lib/explr-sync.functions";

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

type RegCount = { camp_id: string; count: number };
type CampOption = { slug: string; name: string };

function ImportExplrPage() {
  const sync = useServerFn(syncExplrMore);
  const linkCamp = useServerFn(linkExplrCamp);
  const [camps, setCamps] = useState<ExplrCamp[]>([]);
  const [regCounts, setRegCounts] = useState<Record<string, number>>({});
  const [campOptions, setCampOptions] = useState<CampOption[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const [{ data: c }, { data: r }, { data: local }] = await Promise.all([
      supabase
        .from("explr_camps")
        .select("id,title,date,end_date,location,capacity,category,linked_camp_slug,imported_at")
        .order("date", { ascending: false, nullsFirst: false }),
      supabase.from("explr_registrations").select("camp_id"),
      supabase.from("camps").select("slug,name").order("name"),
    ]);
    setCamps((c ?? []) as ExplrCamp[]);
    const counts: Record<string, number> = {};
    for (const row of (r ?? []) as RegCount[]) {
      counts[row.camp_id] = (counts[row.camp_id] ?? 0) + 1;
    }
    setRegCounts(counts);
    setCampOptions((local ?? []) as CampOption[]);
  }

  useEffect(() => {
    load();
  }, []);

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

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-ink">Import from ExplrMore</h1>
      <p className="mt-2 text-sm text-charcoal-500">
        Pull camps and family registrations from the ExplrMore registration system. Educators
        cannot edit anything here or in ExplrMore — admin only.
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
              <th className="py-2 pr-3">Camp</th>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Registrations</th>
              <th className="py-2 pr-3">Linked curriculum camp</th>
            </tr>
          </thead>
          <tbody>
            {camps.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-charcoal-400">
                  No camps imported yet.
                </td>
              </tr>
            ) : (
              camps.map((c) => (
                <tr key={c.id} className="border-b border-charcoal-50">
                  <td className="py-3 pr-3">
                    <div className="font-medium text-ink">{c.title}</div>
                    <div className="text-xs text-charcoal-400">{c.location ?? "—"}</div>
                  </td>
                  <td className="py-3 pr-3 text-charcoal-600">
                    {c.date ?? "—"}
                    {c.end_date ? ` → ${c.end_date}` : ""}
                  </td>
                  <td className="py-3 pr-3 text-charcoal-600">{regCounts[c.id] ?? 0}</td>
                  <td className="py-3 pr-3">
                    <select
                      value={c.linked_camp_slug ?? ""}
                      onChange={(e) => onLinkChange(c.id, e.target.value)}
                      className="rounded border border-charcoal-200 bg-white px-2 py-1 text-sm"
                    >
                      <option value="">— not linked —</option>
                      {campOptions.map((o) => (
                        <option key={o.slug} value={o.slug}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
