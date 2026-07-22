import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useEducator } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ASSESSMENT_META } from "@/lib/educator";
import { EducatorGate } from "@/components/EducatorGate";
import { MySessionsPanel } from "@/components/MySessionsPanel";

export const Route = createFileRoute("/educator/dashboard")({
  head: () => ({ meta: [{ title: "Educator dashboard — EXPLR" }] }),
  component: () => (
    <EducatorGate>
      <Dashboard />
    </EducatorGate>
  ),
});

type Internship = {
  slug: string;
  name: string;
  emoji: string;
  theme: string | null;
  lead: string | null;
  visible: boolean | null;
};

function Dashboard() {
  const { educator, isAdmin, loading } = useEducator();
  const [internships, setInternships] = useState<Internship[]>([]);
  // Direct internship assignments still happen at the slug level — internships
  // aren't multi-week like camps. Camps moved to sessions (explr_camps) and
  // are surfaced by <MySessionsPanel /> below.
  const [assignedInternshipSlugs, setAssignedInternshipSlugs] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<
    Array<{ id: string; assessment_kind: string; due_at: string | null; notes: string | null }>
  >([]);
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
    // Camp content is now session-based — see <MySessionsPanel />. Only
    // internships still go by slug.
    supabase
      .from("internships")
      .select("slug,name,emoji,theme,lead,visible")
      .eq("visible", true)
      .order("sort_order")
      .order("name")
      .then(({ data }) => setInternships((data ?? []) as Internship[]));

    supabase
      .from("assessment_assignments")
      .select("id, assessment_kind, due_at, notes")
      .then(({ data }) => {
        setAssignments((data as never) ?? []);
      });
    supabase
      .from("internship_educators")
      .select("internship_slug")
      .eq("educator_id", educator.id)
      .then(({ data }) => {
        setAssignedInternshipSlugs(
          new Set((data ?? []).map((r) => r.internship_slug)),
        );
      });
    supabase
      .from("program_educators")
      .select("program_id, programs(id, name, program_type, grade_band, description)")
      .eq("educator_id", educator.id)
      .then(({ data }) => {
        const rows = (data ?? [])
          .map(
            (r: { programs: unknown }) =>
              r.programs as
                | {
                    id: string;
                    name: string;
                    program_type: string;
                    grade_band: string | null;
                    description: string | null;
                  }
                | null,
          )
          .filter((p): p is NonNullable<typeof p> => !!p);
        setMyPrograms(rows);
      });
  }, [educator]);

  if (loading)
    return (
      <main className="mx-auto max-w-6xl px-6 py-24 text-sm text-charcoal-400">
        Loading…
      </main>
    );

  // Admins land here via the educator nav for preview/support. They have no
  // educators row, so we show them a short pointer instead of trying to
  // render educator-specific content with null data.
  if (!educator) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="eyebrow">Admin</p>
        <h1 className="mt-3 text-2xl font-light">
          You&apos;re signed in as an admin.
        </h1>
        <p className="mt-3 text-sm text-charcoal-500">
          Use the admin tools to manage sessions, curriculum, and educators.
        </p>
        <Link to="/educator/admin" className="btn-ink mt-6 inline-block">
          Open admin tools
        </Link>
      </main>
    );
  }

  const visibleInternships = internships.filter((i) =>
    assignedInternshipSlugs.has(i.slug),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Dashboard</p>
      <h1 className="mt-3 text-4xl font-light">
        Welcome, {educator.full_name.split(" ")[0]}.
      </h1>

      {/* Assignments */}
      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400">Assignments</h2>
        <div className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
          {assignments.length === 0 && (
            <p className="py-6 text-sm text-charcoal-400">No assignments yet.</p>
          )}
          {assignments.map((a) => {
            const am = ASSESSMENT_META[a.assessment_kind as keyof typeof ASSESSMENT_META];
            return (
              <div key={a.id} className="flex items-baseline justify-between py-4">
                <div>
                  <div className="font-medium">{am?.label ?? a.assessment_kind}</div>
                  <div className="text-xs text-charcoal-400">
                    {am?.band}
                    {a.notes ? ` · ${a.notes}` : ""}
                  </div>
                </div>
                {a.due_at && (
                  <span className="text-xs text-charcoal-500">
                    Due {new Date(a.due_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* My programs — redesigned card with program-type accent stripe */}
      <section className="mt-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-wider text-charcoal-400">My programs</h2>
          <Link to="/educator/students" className="ink-link text-sm">
            View students →
          </Link>
        </div>
        {myPrograms.length === 0 ? (
          <p className="mt-4 py-6 text-sm text-charcoal-400">
            You haven&apos;t been added to any program cohorts yet. Ask an admin to assign you.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myPrograms.map((p) => {
              return (
                <article
                  key={p.id}
                  className="border border-charcoal-100 bg-white p-5 transition-colors hover:border-ink"
                >
                  {p.grade_band && (
                    <p className="text-[10px] uppercase tracking-wider text-charcoal-400">
                      {p.grade_band}
                    </p>
                  )}
                  <p className="mt-2 text-base font-medium leading-tight text-ink">
                    {p.name}
                  </p>
                  {p.description && (
                    <p className="mt-2 pl-1 text-xs leading-relaxed text-charcoal-500 line-clamp-3">
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
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400">
          My camp sessions
        </h2>
        <div className="mt-4">
          <MySessionsPanel educatorId={educator.id} />
        </div>
      </section>

      {/* Internship tiles */}
      <section className="mt-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-wider text-charcoal-400">Internships</h2>
          {visibleInternships.length > 0 && (
            <Link to="/educator/worksite" className="text-sm text-explr-600 hover:underline">
              Rate your interns →
            </Link>
          )}
        </div>
        {visibleInternships.length === 0 ? (
          <p className="mt-4 py-6 text-sm text-charcoal-400">
            No internships assigned to you yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-px bg-charcoal-100 sm:grid-cols-2 lg:grid-cols-3">
            {visibleInternships.map((i) => (
              <Link
                key={i.slug}
                to="/educator/internships/$slug"
                params={{ slug: i.slug }}
                className="tile"
              >
                <div className="text-2xl">{i.emoji}</div>
                <div className="mt-3 font-medium">{i.name}</div>
                <div className="mt-1 text-xs text-charcoal-400">
                  {i.theme ?? ""}
                  {i.lead ? ` · ${i.lead}` : ""}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

    </main>
  );
}
