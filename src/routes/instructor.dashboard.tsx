import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useEducator } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { EducatorGate } from "@/components/EducatorGate";
import { MySessionsPanel } from "@/components/MySessionsPanel";

export const Route = createFileRoute("/instructor/dashboard")({
  head: () => ({ meta: [{ title: "Instructor dashboard — EXPLR" }] }),
  component: () => (
    <EducatorGate>
      <Dashboard />
    </EducatorGate>
  ),
});

function Dashboard() {
  const { educator, isAdmin, loading } = useEducator();
  const [myPrograms, setMyPrograms] = useState<
    Array<{
      id: string;
      name: string;
      program_type: string;
      grade_band: string | null;
      description: string | null;
    }>
  >([]);

  useEffect(() => {
    if (!educator) return;
    supabase
      .from("program_educators")
      .select("program_id, programs(id, name, program_type, grade_band, description)")
      .eq("educator_id", educator.id)
      .then(({ data }) => {
        const rows = (data ?? [])
          .map(
            (r: { programs: unknown }) =>
              r.programs as {
                id: string;
                name: string;
                program_type: string;
                grade_band: string | null;
                description: string | null;
              } | null,
          )
          .filter((p): p is NonNullable<typeof p> => !!p);
        setMyPrograms(rows);
      });
  }, [educator]);

  if (loading)
    return <main className="mx-auto max-w-6xl px-6 py-24 text-sm text-ink-500">Loading…</main>;

  // Admins land here via the educator nav for preview/support. They have no
  // educators row, so we show them a short pointer instead of trying to
  // render educator-specific content with null data.
  if (!educator) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="eyebrow">Admin</p>
        <h1 className="mt-3 text-2xl font-light">You&apos;re signed in as an admin.</h1>
        <p className="mt-3 text-sm text-ink-500">
          Use the admin tools to manage sessions, partners, and instructors.
        </p>
        <Link to="/instructor/admin" className="btn-ink mt-6 inline-block">
          Open admin tools
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Dashboard</p>
      <h1 className="mt-3 text-4xl font-light">Welcome, {educator.full_name.split(" ")[0]}.</h1>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/instructor/checkpoints" className="btn-ink text-sm">
          Checkpoints to review
        </Link>
        <Link to="/instructor/login-display" className="btn-ghost text-sm">
          How students sign in
        </Link>
      </div>

      {/* My programs — redesigned card with program-type accent stripe */}
      <section className="mt-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-wider text-ink-500">My programs</h2>
          <Link to="/instructor/students" className="ink-link text-sm">
            View students →
          </Link>
        </div>
        {myPrograms.length === 0 ? (
          <p className="mt-4 py-6 text-sm text-ink-500">
            You haven&apos;t been added to any program cohorts yet. Ask an admin to assign you.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myPrograms.map((p) => {
              return (
                <article
                  key={p.id}
                  className="border border-line bg-paper-raised p-5 transition-colors hover:border-ink-900 rounded-[var(--radius-card)]"
                >
                  {p.grade_band && (
                    <p className="text-[10px] uppercase tracking-wider text-ink-500">
                      {p.grade_band}
                    </p>
                  )}
                  <p className="mt-2 text-base font-medium leading-tight text-ink">{p.name}</p>
                  {p.description && (
                    <p className="mt-2 pl-1 text-xs leading-relaxed text-ink-500 line-clamp-3">
                      {p.description}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* My camp sessions — replaces the old camp-slug curriculum tiles.
          Each card is one explr_camps row (a specific week/offering); its
          linked curricula + roster live on the session detail page. */}
      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-wider text-ink-500">My camp sessions</h2>
        <div className="mt-4">
          <MySessionsPanel educatorId={educator.id} />
        </div>
      </section>

      {/* Work-based learning */}
      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-wider text-ink-500">Work-based learning</h2>
        <p className="mt-4 max-w-2xl text-sm text-ink-500">
          Students you work with log experiences and ask you to verify them. Review checkpoints,
          stamp verified hours, and rate OhioMeansJobs readiness skills from one place.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/instructor/checkpoints" className="btn-ghost text-sm">
            Review checkpoints
          </Link>
          <Link to="/opportunities" className="btn-ghost text-sm">
            Browse partner opportunities
          </Link>
        </div>
      </section>
    </main>
  );
}
