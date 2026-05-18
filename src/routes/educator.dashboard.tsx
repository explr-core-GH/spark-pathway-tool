import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useEducator } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ASSESSMENT_META, PROGRAM_META } from "@/lib/educator";
import { EducatorSchoolEditor } from "@/components/EducatorSchoolEditor";
import { EducatorGate } from "@/components/EducatorGate";

export const Route = createFileRoute("/educator/dashboard")({
  head: () => ({ meta: [{ title: "Educator dashboard — EXPLR" }] }),
  component: () => (
    <EducatorGate>
      <Dashboard />
    </EducatorGate>
  ),
});

type Camp = {
  slug: string;
  name: string;
  emoji: string;
  tagline: string | null;
  duration: string | null;
  age_range: string | null;
  visible: boolean | null;
};

type Internship = {
  slug: string;
  name: string;
  emoji: string;
  theme: string | null;
  lead: string | null;
  visible: boolean | null;
};

function Dashboard() {
  const { educator, loading } = useEducator();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [campTags, setCampTags] = useState<Record<string, string[]>>({});
  const [internTags, setInternTags] = useState<Record<string, string[]>>({});
  // Direct educator-to-item assignments from camp_educators / internship_educators.
  // Surfaces a camp/internship on this educator's dashboard regardless of
  // whether it's also program-type-tagged.
  const [assignedCampSlugs, setAssignedCampSlugs] = useState<Set<string>>(new Set());
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
    // Read camps + internships from the Supabase tables, not the static
    // catalogs in src/lib. The static lists were a seed snapshot and miss
    // anything an admin added through /educator/admin/camps or /internships.
    supabase
      .from("camps")
      .select("slug,name,emoji,tagline,duration,age_range,visible")
      .eq("visible", true)
      .order("sort_order")
      .order("name")
      .then(({ data }) => setCamps((data ?? []) as Camp[]));

    supabase
      .from("internships")
      .select("slug,name,emoji,theme,lead,visible")
      .eq("visible", true)
      .order("sort_order")
      .order("name")
      .then(({ data }) => setInternships((data ?? []) as Internship[]));

    supabase.from("curriculum_tags").select("camp_slug, program_type").then(({ data }) => {
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((r) => {
        (map[r.camp_slug] ??= []).push(r.program_type);
      });
      setCampTags(map);
    });
    supabase.from("internship_tags").select("internship_slug, program_type").then(({ data }) => {
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((r) => {
        (map[r.internship_slug] ??= []).push(r.program_type);
      });
      setInternTags(map);
    });
    supabase
      .from("assessment_assignments")
      .select("id, assessment_kind, due_at, notes")
      .then(({ data }) => {
        setAssignments((data as never) ?? []);
      });
    // Direct assignments — admin picks "this educator runs that camp" from
    // /educator/admin/assign. These should show even if the camp isn't
    // tagged for the educator's program_type.
    supabase
      .from("camp_educators")
      .select("camp_slug")
      .eq("educator_id", educator.id)
      .then(({ data }) => {
        setAssignedCampSlugs(new Set((data ?? []).map((r) => r.camp_slug)));
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

  if (loading || !educator)
    return (
      <main className="mx-auto max-w-6xl px-6 py-24 text-sm text-charcoal-400">
        Loading…
      </main>
    );

  const programType = educator.program_type as string;
  // Show a camp/internship if either (a) it's tagged for the educator's
  // program_type, or (b) the admin directly assigned this educator to it
  // via /educator/admin/assign. Direct assignments win even when tagging
  // hasn't been set up yet.
  const visibleCamps = camps.filter(
    (c) =>
      (campTags[c.slug] ?? []).includes(programType) ||
      assignedCampSlugs.has(c.slug),
  );
  const visibleInternships = internships.filter(
    (i) =>
      (internTags[i.slug] ?? []).includes(programType) ||
      assignedInternshipSlugs.has(i.slug),
  );
  const meta = PROGRAM_META[programType as keyof typeof PROGRAM_META];

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Dashboard</p>
      <h1 className="mt-3 text-4xl font-light">
        Welcome, {educator.full_name.split(" ")[0]}.
      </h1>
      <p className="mt-2 text-sm text-charcoal-500">
        <span
          className="inline-block h-2 w-2 rounded-full align-middle"
          style={{ background: meta.accent }}
        />{" "}
        {meta.full}
      </p>

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
              const pmeta = PROGRAM_META[p.program_type as keyof typeof PROGRAM_META];
              const accent = pmeta?.accent ?? "var(--color-charcoal-300)";
              return (
                <article
                  key={p.id}
                  className="relative overflow-hidden border border-charcoal-100 bg-white p-5 transition-colors hover:border-ink"
                >
                  {/* Left accent stripe in the program-type brand color */}
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-full w-1"
                    style={{ background: accent }}
                  />
                  <div className="flex items-center gap-2 pl-1">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: accent }}
                      aria-hidden
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-500">
                      {pmeta?.label ?? p.program_type}
                    </span>
                    {p.grade_band && (
                      <span className="text-[10px] uppercase tracking-wider text-charcoal-400">
                        · {p.grade_band}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 pl-1 text-base font-medium leading-tight text-ink">
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

      {/* Curriculum tiles */}
      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400">Curriculum</h2>
        {visibleCamps.length === 0 ? (
          <p className="mt-4 py-6 text-sm text-charcoal-400">
            No curriculum assigned to you yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-px bg-charcoal-100 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCamps.map((c) => (
              <Link
                key={c.slug}
                to="/educator/curriculum/$slug"
                params={{ slug: c.slug }}
                className="tile"
              >
                <div className="text-2xl">{c.emoji}</div>
                <div className="mt-3 font-medium">{c.name}</div>
                <div className="mt-1 text-xs text-charcoal-400">
                  {c.duration ?? "—"}
                  {c.age_range ? ` · ${c.age_range}` : ""}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Internship tiles */}
      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400">Internships</h2>
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

      {/* School panel */}
      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400">School</h2>
        <div className="mt-4">
          <EducatorSchoolEditor
            educatorId={educator.id}
            initialIrn={educator.school_irn}
            initialName={educator.school_name}
          />
        </div>
      </section>
    </main>
  );
}
