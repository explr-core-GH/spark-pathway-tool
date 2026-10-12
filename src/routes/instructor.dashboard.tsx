import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, LayoutGrid, School, Tent } from "lucide-react";
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

  const [myClasses, setMyClasses] = useState<
    Array<{
      id: string;
      name: string;
      grade: number | null;
      period: string | null;
      join_code: string | null;
      students: number;
    }>
  >([]);

  useEffect(() => {
    if (!educator) return;
    // Classes this instructor teaches, with roster counts.
    (async () => {
      const { data: cls } = await supabase
        .from("classes")
        .select("id, name, grade, period, join_code")
        .eq("educator_id", educator.id)
        .order("name");
      const rows = (cls ?? []) as Array<{
        id: string;
        name: string;
        grade: number | null;
        period: string | null;
        join_code: string | null;
      }>;
      if (rows.length === 0) {
        setMyClasses([]);
        return;
      }
      const { data: members } = await supabase
        .from("class_students")
        .select("class_id")
        .in(
          "class_id",
          rows.map((c) => c.id),
        );
      const counts = new Map<string, number>();
      for (const m of (members ?? []) as Array<{ class_id: string }>)
        counts.set(m.class_id, (counts.get(m.class_id) ?? 0) + 1);
      setMyClasses(rows.map((c) => ({ ...c, students: counts.get(c.id) ?? 0 })));
    })();
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
    return (
      <main
        role="status"
        className="mx-auto max-w-[1312px] px-4 py-24 text-sm text-ink-500 sm:px-6 lg:px-8"
      >
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
        <h1 className="mt-2 font-display text-2xl font-bold">You&apos;re signed in as an admin.</h1>
        <p className="mt-3 text-sm text-ink-700">
          Use the admin tools to manage sessions, partners, and instructors.
        </p>
        <Link to="/instructor/admin" className="btn-ink mt-6 inline-block">
          Open admin tools
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
      <p className="eyebrow">Dashboard</p>
      <h1 className="display mt-2">Welcome, {educator.full_name.split(" ")[0]}.</h1>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/instructor/checkpoints" className="btn-ink text-sm">
          Checkpoints to review
        </Link>
        <Link to="/instructor/login-display" className="btn-ghost text-sm">
          How students sign in
        </Link>
      </div>

      {/* My classes — rosters the instructor teaches directly */}
      <section className="mt-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[12px] border border-mint-soft bg-mint-tint text-green-deep">
              <School className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
            <h2 className="font-display text-2xl font-bold">My classes</h2>
          </div>
          <Link
            to="/instructor/students"
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
          >
            View students →
          </Link>
        </div>
        {myClasses.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">
            No classes yet. An EXPLR admin can create one for you under Admin → Classes.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myClasses.map((c) => (
              <li
                key={c.id}
                className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card"
              >
                <p className="eyebrow text-green">
                  {c.grade != null ? `Grade ${c.grade}` : "Class"}
                  {c.period ? ` · ${c.period}` : ""}
                </p>
                <h3 className="mt-1 font-display text-lg font-bold leading-snug">{c.name}</h3>
                <p className="mt-1 text-sm text-ink-700">
                  {c.students} student{c.students === 1 ? "" : "s"}
                  {c.join_code ? (
                    <>
                      {" "}
                      · class code{" "}
                      <span className="rounded-[var(--radius-control)] border border-line-strong bg-paper px-1.5 py-0.5 font-mono text-xs">
                        {c.join_code}
                      </span>
                    </>
                  ) : null}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {c.grade != null && c.grade <= 8 && (
                    <Link
                      to="/instructor/explore-cards/$kind/$id"
                      params={{ kind: "class", id: c.id }}
                      className="inline-flex min-h-[44px] items-center text-green-deep hover:underline"
                    >
                      Picture sign-in cards
                    </Link>
                  )}
                  <Link
                    to="/instructor/checkpoints"
                    className="inline-flex min-h-[44px] items-center text-green-deep hover:underline"
                  >
                    Checkpoints
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* My programs — redesigned card with program-type accent stripe */}
      <section className="mt-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[12px] border border-mint-soft bg-mint-tint text-green-deep">
              <LayoutGrid className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
            <h2 className="font-display text-2xl font-bold">My programs</h2>
          </div>
          <Link
            to="/instructor/students"
            className="ink-link inline-flex min-h-[44px] items-center text-sm"
          >
            View students →
          </Link>
        </div>
        {myPrograms.length === 0 ? (
          <p className="mt-4 rounded-[var(--radius-card)] border border-line bg-paper-raised px-5 py-6 text-sm text-ink-700">
            You haven&apos;t been added to any program cohorts yet. Ask an admin to assign you.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myPrograms.map((p) => {
              return (
                <article
                  key={p.id}
                  className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card transition-colors hover:border-emerald"
                >
                  {p.grade_band && <p className="eyebrow">{p.grade_band}</p>}
                  <p className="mt-2 font-display text-lg font-semibold leading-tight text-ink-900">
                    {p.name}
                  </p>
                  {p.description && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-700">
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
      <section className="mt-14">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[12px] border border-mint-soft bg-mint-tint text-green-deep">
            <Tent className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <h2 className="font-display text-2xl font-bold">My camp sessions</h2>
        </div>
        <div className="mt-4">
          <MySessionsPanel educatorId={educator.id} />
        </div>
      </section>

      {/* Work-based learning */}
      <section className="mt-14 rounded-[var(--radius-card)] border border-line bg-paper-raised p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[12px] border border-mint-soft bg-mint-tint text-green-deep">
            <Briefcase className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <h2 className="font-display text-2xl font-bold">Work-based learning</h2>
        </div>
        <p className="mt-4 max-w-2xl text-sm text-ink-700">
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
