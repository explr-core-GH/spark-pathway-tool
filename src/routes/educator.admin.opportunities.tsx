import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  dollars,
  oppTypeMeta,
  STATUS_LABEL,
  type Opportunity,
} from "@/lib/opportunities";

export const Route = createFileRoute("/educator/admin/opportunities")({
  head: () => ({ meta: [{ title: "Opportunity review — Admin" }] }),
  component: OpportunitiesReview,
});

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

type Filter = "submitted" | "approved" | "rejected" | "all";

function OpportunitiesReview() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [orgs, setOrgs] = useState<Record<string, { name: string; logo_url: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("submitted");
  const [open, setOpen] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await sb("opportunities")
      .select("*")
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    const list = (data as Opportunity[]) ?? [];
    setOpps(list);
    const orgIds = [...new Set(list.map((o) => o.org_id))];
    if (orgIds.length) {
      const { data: os } = await sb("organizations")
        .select("id, name, logo_url")
        .in("id", orgIds);
      const m: Record<string, { name: string; logo_url: string | null }> = {};
      for (const o of (os as Array<{ id: string; name: string; logo_url: string | null }>) ?? [])
        m[o.id] = { name: o.name, logo_url: o.logo_url };
      setOrgs(m);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const c = { submitted: 0, approved: 0, rejected: 0 };
    for (const o of opps) if (o.status in c) (c as Record<string, number>)[o.status]++;
    return c;
  }, [opps]);

  const visible = useMemo(
    () => (filter === "all" ? opps : opps.filter((o) => o.status === filter)),
    [opps, filter],
  );

  async function decide(o: Opportunity, status: "approved" | "rejected") {
    const { error } = await sb("opportunities")
      .update({
        status,
        review_notes: status === "rejected" ? notes.trim() || null : null,
        decided_at: new Date().toISOString(),
      })
      .eq("id", o.id);
    if (error) {
      alert(error.message);
      return;
    }
    setOpen(null);
    setNotes("");
    load();
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Opportunity review</h1>
      <p className="lead mt-2 max-w-2xl">
        Camps, workshops, internships, and ongoing opportunities submitted by partner
        organizations. Approve to make them live, or send back with a note.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {(
          [
            { id: "submitted", label: `In review (${counts.submitted})` },
            { id: "approved", label: `Approved (${counts.approved})` },
            { id: "rejected", label: `Needs changes (${counts.rejected})` },
            { id: "all", label: `All (${opps.length})` },
          ] as Array<{ id: Filter; label: string }>
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="rounded-full px-3 py-1.5 text-xs font-medium"
            style={{
              background: filter === f.id ? "var(--ink)" : "transparent",
              color: filter === f.id ? "white" : "var(--color-charcoal-600)",
              border: `1px solid ${filter === f.id ? "var(--ink)" : "var(--color-charcoal-200)"}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-charcoal-400">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="mt-8 text-sm text-charcoal-400">Nothing here.</p>
      ) : (
        <div className="mt-6 divide-y divide-charcoal-100 border-y border-charcoal-100">
          {visible.map((o) => {
            const isOpen = open === o.id;
            const paid = !o.is_free && (o.cost_cents ?? 0) > 0;
            const flag = paid && (o.type === "camp" || o.type === "workshop");
            return (
              <div key={o.id}>
                <button
                  onClick={() => {
                    setOpen(isOpen ? null : o.id);
                    setNotes(o.review_notes ?? "");
                  }}
                  className="flex w-full items-center gap-4 py-4 text-left hover:bg-charcoal-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {o.name || "Untitled"}
                      <span className="ml-2 text-xs font-normal text-charcoal-400">
                        {oppTypeMeta(o.type).label} · {orgs[o.org_id]?.name ?? "Organization"}
                      </span>
                    </p>
                    <p className="truncate text-xs text-charcoal-500">
                      {[o.start_date, o.location].filter(Boolean).join(" · ") || "—"}
                      {o.riasec_code ? ` · ${o.riasec_code}` : ""}
                    </p>
                  </div>
                  {flag && (
                    <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                      paid {dollars(o.cost_cents)}
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-charcoal-500">{STATUS_LABEL[o.status]}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-charcoal-100 bg-charcoal-50 px-4 py-5">
                    <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                      <div className="space-y-3 text-sm">
                        {o.image_url && (
                          <img src={o.image_url} alt="" className="max-h-48 rounded object-cover" />
                        )}
                        <p className="whitespace-pre-wrap text-charcoal-700">{o.description || "—"}</p>
                        <dl className="grid grid-cols-2 gap-2 text-xs">
                          <Detail label="Dates" value={[o.start_date, o.end_date].filter(Boolean).join(" – ") || "—"} />
                          <Detail label="Schedule" value={o.schedule || "—"} />
                          <Detail label="Grades" value={[o.grade_min, o.grade_max].filter((x) => x != null).join("–") || "—"} />
                          <Detail label="Capacity" value={o.capacity != null ? String(o.capacity) : "—"} />
                          <Detail label="Cost" value={o.is_free ? "Free" : dollars(o.cost_cents)} />
                          <Detail
                            label="Registration"
                            value={
                              o.registration_mode === "external"
                                ? `External — ${o.external_url ?? ""}`
                                : "In EXPLR"
                            }
                          />
                          <Detail label="Interest code" value={o.riasec_code || "—"} />
                        </dl>
                      </div>
                      <div>
                        <label className="label">Note (sent back on changes)</label>
                        <textarea
                          className="field mt-1"
                          rows={3}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                        <div className="mt-3 flex flex-col gap-2">
                          <button onClick={() => decide(o, "approved")} className="btn-ink text-sm">
                            Approve
                          </button>
                          <button
                            onClick={() => decide(o, "rejected")}
                            className="btn-ghost text-sm"
                          >
                            Send back
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="uppercase tracking-wider text-charcoal-400">{label}</dt>
      <dd className="mt-0.5 text-charcoal-700">{value}</dd>
    </div>
  );
}
