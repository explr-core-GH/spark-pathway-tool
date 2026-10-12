import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OrgGuard } from "@/components/OrgGuard";
import { PortalHeader, type PortalLink } from "@/components/passport";
import { Briefcase, ChevronRight, Plus, Users } from "lucide-react";
import { useOrg } from "@/lib/auth";
import { oppTypeMeta, STATUS_LABEL, type Opportunity } from "@/lib/opportunities";

const PARTNER_LINKS: PortalLink[] = [
  { label: "Overview", to: "/org" },
  { label: "New opportunity", to: "/org/new" },
  { label: "Applicants", to: "/org/applicants" },
];

export const Route = createFileRoute("/org/")({
  head: () => ({ meta: [{ title: "Partner portal — EXPLR" }] }),
  component: () => (
    <OrgGuard>{(org) => <OrgHome orgName={org.name} logo={org.logo_url} />}</OrgGuard>
  ),
});

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

const STATUS_STYLE: Record<Opportunity["status"], string> = {
  draft: "bg-paper-sunken text-ink-700",
  submitted: "bg-gold-tint text-gold-deep",
  approved: "bg-mint-tint text-green-deep",
  rejected: "bg-red-50 text-red-700",
};

type Reg = {
  id: string;
  opportunity_id: string;
  contact_name: string | null;
  contact_email: string | null;
  application_id: string | null;
  created_at: string;
};

function OrgHome({ orgName, logo }: { orgName: string; logo: string | null }) {
  const { user } = useOrg();
  const [opps, setOpps] = useState<Opportunity[] | null>(null);
  const [regs, setRegs] = useState<Reg[] | null>(null);

  useEffect(() => {
    if (!user) return;
    sb("opportunities")
      .select("*")
      .eq("org_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }: { data: Opportunity[] | null }) => setOpps((data as Opportunity[]) ?? []));
    sb("opportunity_registrations")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }: { data: Reg[] | null }) => setRegs((data as Reg[]) ?? []));
  }, [user]);

  const oppName = (id: string) => opps?.find((o) => o.id === id)?.name || "Opportunity";

  return (
    <div className="bg-paper text-ink-900">
      <PortalHeader role="Partner" links={PARTNER_LINKS} signedIn />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {logo ? (
              <img
                src={logo}
                alt=""
                className="h-14 w-14 shrink-0 rounded-[var(--radius-control)] border border-line object-cover"
              />
            ) : (
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[var(--radius-control)] border border-mint-soft bg-mint-tint font-display text-lg font-bold text-green-deep">
                {orgName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="eyebrow text-green">Partner portal</p>
              <h1 className="mt-1 font-display text-3xl font-bold leading-tight">{orgName}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/org/applicants" className="btn-ghost">
              Applicants
            </Link>
            <Link to="/org/new" className="btn-ink">
              <Plus className="h-4 w-4" aria-hidden /> New opportunity
            </Link>
          </div>
        </div>

        <section className="mt-10 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
              <Briefcase className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
            </span>
            <h2 className="font-display text-xl font-semibold">Your opportunities</h2>
          </div>
          {opps === null ? (
            <p role="status" className="mt-4 text-sm text-ink-500">
              Loading…
            </p>
          ) : opps.length === 0 ? (
            <div className="mt-4 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-paper px-6 py-12 text-center">
              <p className="text-sm text-ink-700">
                No opportunities yet. Build your first one — it takes a few minutes.
              </p>
              <Link to="/org/new" className="btn-ink mt-4">
                <Plus className="h-4 w-4" aria-hidden /> New opportunity
              </Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {opps.map((o) => (
                <li key={o.id}>
                  <Link
                    to="/org/new"
                    search={{ id: o.id }}
                    className="-mx-2 flex min-h-[44px] items-center gap-4 rounded-[var(--radius-control)] px-2 py-3 hover:bg-mint-tint/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{o.name || "Untitled opportunity"}</p>
                      <p className="truncate text-xs text-ink-700">
                        {oppTypeMeta(o.type).label}
                        {o.start_date ? ` · ${o.start_date}` : ""}
                        {o.review_notes && o.status === "rejected" ? ` · ${o.review_notes}` : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] ${STATUS_STYLE[o.status]}`}
                    >
                      {STATUS_LABEL[o.status]}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
              <Users className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
            </span>
            <h2 className="font-display text-xl font-semibold">Registrations &amp; applicants</h2>
          </div>
          {regs === null ? (
            <p role="status" className="mt-4 text-sm text-ink-500">
              Loading…
            </p>
          ) : regs.length === 0 ? (
            <p className="mt-4 text-sm text-ink-700">No one has registered or applied yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {regs.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{r.contact_name || "Student"}</span>
                    <span className="ml-2 text-xs text-ink-700">{oppName(r.opportunity_id)}</span>
                    {r.contact_email && (
                      <span className="ml-2 text-xs text-ink-500">· {r.contact_email}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-ink-500">
                    {r.application_id ? "Applied" : "Registered"} ·{" "}
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
