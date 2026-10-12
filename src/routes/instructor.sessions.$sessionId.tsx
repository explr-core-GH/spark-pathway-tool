import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EducatorGate } from "@/components/EducatorGate";
import { supabase } from "@/integrations/supabase/client";

/**
 * /educator/sessions/$sessionId — detail page for one camp session
 * (a single explr_camps row).
 *
 * Renders:
 *   - Title + date range + location + capacity (the session header).
 *     for the actual slide-deck viewer + materials.
 *   - "Roster" — explr_registrations for this session. Pulled live from
 *     the ExplrMore sync that the worksites/import flow keeps fresh.
 *
 * Access: EducatorGate ensures the viewer is signed in + approved. RLS
 * on explr_registrations + explr_camps allows any educator to read; if
 * we ever want to lock down rosters to assigned educators only, that's
 * a one-policy change (where exists in explr_camp_educators).
 */

type Session = {
  id: string;
  title: string;
  date: string | null;
  end_date: string | null;
  location: string | null;
  capacity: number | null;
  description: string | null;
  age_range: string | null;
};

type Registration = {
  id: string;
  child_name: string;
  child_age: number | null;
  status: string | null;
};

export const Route = createFileRoute("/instructor/sessions/$sessionId")({
  head: ({ params }) => ({
    meta: [{ title: `Session ${params.sessionId} — EXPLR` }],
  }),
  component: () => (
    <EducatorGate>
      <SessionDetail />
    </EducatorGate>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-6 py-24 text-center text-sm text-ink-500">
      Session not found.{" "}
      <Link to="/instructor/dashboard" className="ink-link">
        Back to dashboard
      </Link>
    </div>
  ),
});

function fmtRange(date: string | null, end: string | null): string {
  if (!date) return "Dates TBD";
  const d = new Date(date);
  if (!end || end === date) return d.toLocaleDateString();
  const e = new Date(end);
  if (d.getFullYear() === e.getFullYear() && d.getMonth() === e.getMonth()) {
    return `${d.toLocaleString(undefined, { month: "short", day: "numeric" })}–${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${d.toLocaleDateString()} – ${e.toLocaleDateString()}`;
}

function SessionDetail() {
  const { sessionId } = Route.useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. The session row itself.
      const { data: sess } = await (supabase as any)
        .from("explr_camps")
        .select("id, title, date, end_date, location, capacity, description, age_range")
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      setSession((sess as Session) ?? null);

      // 3. Roster for this session.
      const { data: regs } = await supabase
        .from("explr_registrations")
        .select("id, child_name, child_age, status")
        .eq("camp_id", sessionId)
        .order("child_name");

      if (cancelled) return;
      setRegistrations((regs ?? []) as Registration[]);

      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!loaded) {
    return <main className="mx-auto max-w-6xl px-6 py-16 text-sm text-ink-500">Loading…</main>;
  }
  if (!session) throw notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <Link to="/instructor/dashboard" className="ink-link text-sm">
        ← Dashboard
      </Link>

      {/* Header */}
      <div className="mt-6">
        <p className="text-xs uppercase tracking-wider text-ink-500">
          {fmtRange(session.date, session.end_date)}
        </p>
        <h1 className="mt-2 text-4xl font-light">{session.title}</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-ink-500">
          {session.location && <span>{session.location}</span>}
          {session.age_range && <span>· {session.age_range}</span>}
          {session.capacity != null && (
            <span>
              · {registrations.length}/{session.capacity} registered
            </span>
          )}
        </div>
        {session.description && <p className="lead mt-4 max-w-2xl">{session.description}</p>}
      </div>

      {/* Roster */}
      <section className="mt-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-wider text-ink-500">
            Roster · {registrations.length} student
            {registrations.length === 1 ? "" : "s"}
          </h2>
        </div>
        {registrations.length === 0 ? (
          <p className="mt-4 py-6 text-sm text-ink-500">
            No registrations synced for this session yet. Run an ExplrMore sync (Admin → Tools →
            Import from ExplrMore) or wait for the next scheduled sync.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y border-line text-left text-xs uppercase tracking-wider text-ink-500">
                  <th className="py-2 pr-4 font-normal">Student</th>
                  <th className="py-2 pr-4 font-normal">Age</th>
                  <th className="py-2 pr-4 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {registrations.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-4 font-medium">{r.child_name}</td>
                    <td className="py-2 pr-4 text-ink-500">{r.child_age ?? "—"}</td>
                    <td className="py-2 pr-4 text-ink-500">{r.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
