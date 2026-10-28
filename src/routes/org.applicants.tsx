import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OrgGuard } from "@/components/OrgGuard";
import { PortalHeader, type PortalLink } from "@/components/passport";
import { UserCheck } from "lucide-react";

const PARTNER_LINKS: PortalLink[] = [
  { label: "Overview", to: "/org" },
  { label: "New opportunity", to: "/org/new" },
  { label: "Placed with you", to: "/org/applicants" },
];

/**
 * Partners don't see student applications: EXPLR staff review every one and
 * place students. This page lists only the students placed with this partner.
 */
export const Route = createFileRoute("/org/applicants")({
  head: () => ({ meta: [{ title: "Placed with you — EXPLR" }] }),
  component: () => <OrgGuard>{() => <PlacedWithYou />}</OrgGuard>,
});

type Placed = {
  placement_id: string;
  student_name: string | null;
  internship_name: string | null;
  opportunity_id: string;
  start_date: string | null;
  placed_at: string;
};

function PlacedWithYou() {
  const [rows, setRows] = useState<Placed[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Call rpc as a method on the client so `this` stays bound.
    (
      supabase as unknown as {
        rpc: (
          fn: string,
        ) => Promise<{ data: Placed[] | null; error: { message: string } | null }>;
      }
    )
      .rpc("org_placed_students")
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        setRows(data ?? []);
      });
  }, []);

  const byInternship = new Map<string, Placed[]>();
  for (const r of rows ?? []) {
    const k = r.opportunity_id;
    byInternship.set(k, [...(byInternship.get(k) ?? []), r]);
  }

  return (
    <div className="bg-paper text-ink-900">
      <PortalHeader role="Partner" links={PARTNER_LINKS} signedIn />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link
          to="/org"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
        >
          ← Partner portal
        </Link>
        <p className="eyebrow text-green">Internships</p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight">Placed with you</h1>
        <p className="lead mt-3 max-w-2xl">
          EXPLR staff review every student's application and make placements. When a student is
          placed with you, they show up here with their start date. EXPLR will connect you before
          day one.
        </p>
        {error && (
          <p role="alert" className="mt-6 text-sm text-red-700">
            {error}
          </p>
        )}
        {rows === null ? (
          <p role="status" className="mt-8 text-sm text-ink-500">
            Loading…
          </p>
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-paper-raised px-6 py-12 text-center">
            <p className="text-sm text-ink-700">
              No students placed with you yet. Placements are made after applications close.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6">
            {[...byInternship.entries()].map(([id, list]) => (
              <section
                key={id}
                className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
                    <UserCheck className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-semibold">
                      {list[0].internship_name || "Internship"}
                    </h2>
                    <p className="text-sm text-ink-700">
                      {list.length} student{list.length === 1 ? "" : "s"}
                      {list[0].start_date
                        ? ` · starts ${new Date(`${list[0].start_date}T12:00:00`).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                </div>
                <ul className="mt-4 divide-y divide-line">
                  {list.map((r) => (
                    <li
                      key={r.placement_id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                    >
                      <span className="font-medium">{r.student_name || "Student"}</span>
                      <span className="text-xs text-ink-500">
                        Placed {new Date(r.placed_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
