import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OrgGuard } from "@/components/OrgGuard";
import { useOrg } from "@/lib/auth";
import {
  oppTypeMeta,
  STATUS_LABEL,
  type Opportunity,
} from "@/lib/opportunities";

export const Route = createFileRoute("/org/")({
  head: () => ({ meta: [{ title: "Your organization — EXPLR" }] }),
  component: () => <OrgGuard>{(org) => <OrgHome orgName={org.name} logo={org.logo_url} />}</OrgGuard>,
});

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

const STATUS_STYLE: Record<Opportunity["status"], string> = {
  draft: "bg-charcoal-100 text-charcoal-600",
  submitted: "bg-amber-50 text-amber-700 border border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border border-rose-200",
};

function OrgHome({ orgName, logo }: { orgName: string; logo: string | null }) {
  const { user } = useOrg();
  const [opps, setOpps] = useState<Opportunity[] | null>(null);

  useEffect(() => {
    if (!user) return;
    sb("opportunities")
      .select("*")
      .eq("org_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }: { data: Opportunity[] | null }) => setOpps((data as Opportunity[]) ?? []));
  }, [user]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt="" className="h-12 w-12 rounded object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded bg-charcoal-100 text-sm font-medium text-charcoal-500">
              {orgName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="eyebrow">Organization</p>
            <h1 className="text-2xl font-light">{orgName}</h1>
          </div>
        </div>
        <Link to="/org/new" className="btn-ink">
          + New opportunity
        </Link>
      </div>

      <section className="mt-12">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400">Your opportunities</h2>
        {opps === null ? (
          <p className="mt-4 text-sm text-charcoal-400">Loading…</p>
        ) : opps.length === 0 ? (
          <div className="mt-4 border border-dashed border-charcoal-200 bg-charcoal-50 px-6 py-12 text-center">
            <p className="text-sm text-charcoal-500">
              No opportunities yet. Build your first one — it takes a few minutes.
            </p>
            <Link to="/org/new" className="btn-ink mt-4 inline-flex">
              + New opportunity
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
            {opps.map((o) => (
              <li key={o.id}>
                <Link
                  to="/org/new"
                  search={{ id: o.id }}
                  className="flex items-center gap-4 py-4 hover:bg-charcoal-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {o.name || "Untitled opportunity"}
                    </p>
                    <p className="truncate text-xs text-charcoal-500">
                      {oppTypeMeta(o.type).label}
                      {o.start_date ? ` · ${o.start_date}` : ""}
                      {o.review_notes && o.status === "rejected"
                        ? ` · ${o.review_notes}`
                        : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[o.status]}`}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
