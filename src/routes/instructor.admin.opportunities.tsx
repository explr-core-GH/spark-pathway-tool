import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dollars, oppTypeMeta, STATUS_LABEL, type Opportunity } from "@/lib/opportunities";
import { GateBadge, GatePanel } from "@/components/WblReview";

export const Route = createFileRoute("/instructor/admin/opportunities")({
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
      const { data: os } = await sb("organizations").select("id, name, logo_url").in("id", orgIds);
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
    <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Opportunity review</h1>
      <p className="lead mt-3 max-w-2xl">
        Camps, workshops, internships, and ongoing opportunities submitted by partner organizations.
        Approve to make them live, or send back with a note.
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
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium ${filter === f.id ? "border-ink-900 bg-ink-900 text-paper" : "border-line-strong text-ink-700 hover:border-ink-900 hover:text-ink-900"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p role="status" className="mt-8 text-sm text-ink-500">
          Loading…
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-8 text-sm text-ink-500">Nothing here.</p>
      ) : (
        <div className="mt-6 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper-raised">
          {visible.map((o) => {
            const isOpen = open === o.id;
            const paid = !o.is_free && (o.cost_cents ?? 0) > 0;
            const flag = paid && (o.type === "camp" || o.type === "workshop");
            return (
              <div key={o.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(isOpen ? null : o.id);
                    setNotes(o.review_notes ?? "");
                  }}
                  aria-expanded={isOpen}
                  aria-controls={`opp-review-${o.id}`}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 text-left hover:bg-paper-sunken"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {o.name || "Untitled"}
                      <span className="ml-2 text-xs font-normal text-ink-500">
                        {oppTypeMeta(o.type).label} · {orgs[o.org_id]?.name ?? "Organization"}
                      </span>
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {[o.start_date, o.location].filter(Boolean).join(" · ") || "—"}
                      {o.riasec_code ? ` · ${o.riasec_code}` : ""}
                    </p>
                  </div>
                  {flag && (
                    <span className="shrink-0 rounded-full bg-gold-tint px-2.5 py-0.5 text-[11px] font-medium text-gold-deep">
                      paid {dollars(o.cost_cents)}
                    </span>
                  )}
                  <GateBadge o={o} />
                  <span className="shrink-0 rounded-full bg-paper-sunken px-2.5 py-0.5 text-xs font-medium text-ink-700">
                    {STATUS_LABEL[o.status]}
                  </span>
                </button>

                {isOpen && (
                  <div
                    id={`opp-review-${o.id}`}
                    className="border-t border-line bg-paper-sunken px-4 py-5"
                  >
                    <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                      <div className="space-y-3 text-sm">
                        {o.image_url && (
                          <img
                            src={o.image_url}
                            alt=""
                            className="max-h-48 rounded-[var(--radius-control)] object-cover"
                          />
                        )}
                        <p className="whitespace-pre-wrap text-ink-700">{o.description || "—"}</p>
                        <dl className="grid grid-cols-2 gap-2 text-xs">
                          <Detail
                            label="Dates"
                            value={[o.start_date, o.end_date].filter(Boolean).join(" – ") || "—"}
                          />
                          <Detail label="Schedule" value={o.schedule || "—"} />
                          <Detail
                            label="Grades"
                            value={
                              [o.grade_min, o.grade_max].filter((x) => x != null).join("–") || "—"
                            }
                          />
                          <Detail
                            label="Capacity"
                            value={o.capacity != null ? String(o.capacity) : "—"}
                          />
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
                        <GatePanel o={o} onDone={load} />
                      </div>
                      <div>
                        <label className="label" htmlFor={`opp-note-${o.id}`}>
                          Note (sent back on changes)
                        </label>
                        <textarea
                          id={`opp-note-${o.id}`}
                          className="field mt-1"
                          rows={3}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                        <div className="mt-3 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => decide(o, "approved")}
                            className="btn-ink text-sm"
                          >
                            Approve<span className="sr-only"> {o.name || "this opportunity"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => decide(o, "rejected")}
                            className="btn-ghost text-sm"
                          >
                            Send back
                            <span className="sr-only"> {o.name || "this opportunity"}</span>
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
      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-ink-700">{value}</dd>
    </div>
  );
}
