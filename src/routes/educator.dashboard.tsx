import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useEducator } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CAMPS } from "@/lib/camp-curriculum";
import { INTERNSHIPS } from "@/lib/internships-catalog";
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

function Dashboard() {
  const { user, educator, loading } = useEducator();
  const [campTags, setCampTags] = useState<Record<string, string[]>>({});
  const [internTags, setInternTags] = useState<Record<string, string[]>>({});
  const [assignments, setAssignments] = useState<Array<{ id: string; assessment_kind: string; due_at: string | null; notes: string | null }>>([]);

  useEffect(() => {
    if (!educator) return;
    supabase.from("curriculum_tags").select("camp_slug, program_type").then(({ data }) => {
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((r) => { (map[r.camp_slug] ??= []).push(r.program_type); });
      setCampTags(map);
    });
    supabase.from("internship_tags").select("internship_slug, program_type").then(({ data }) => {
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((r) => { (map[r.internship_slug] ??= []).push(r.program_type); });
      setInternTags(map);
    });
    supabase.from("assessment_assignments").select("id, assessment_kind, due_at, notes").then(({ data }) => {
      setAssignments((data as never) ?? []);
    });
  }, [educator]);

  if (loading || !educator) return <main className="mx-auto max-w-6xl px-6 py-24 text-sm text-charcoal-400">Loading…</main>;

  const programType = educator.program_type as string;
  const visibleCamps = CAMPS.filter((c) => (campTags[c.slug] ?? []).includes(programType));
  const visibleInternships = INTERNSHIPS.filter((i) => (internTags[i.slug] ?? []).includes(programType));
  const meta = PROGRAM_META[programType as keyof typeof PROGRAM_META];


  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Dashboard</p>
      <h1 className="mt-3 text-4xl font-light">Welcome, {educator.full_name.split(" ")[0]}.</h1>
      <p className="mt-2 text-sm text-charcoal-500">
        <span className="inline-block h-2 w-2 rounded-full align-middle" style={{ background: meta.accent }} /> {meta.full}
      </p>

      {/* Assignments */}
      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400">Assignments</h2>
        <div className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
          {assignments.length === 0 && <p className="py-6 text-sm text-charcoal-400">No assignments yet.</p>}
          {assignments.map((a) => {
            const am = ASSESSMENT_META[a.assessment_kind as keyof typeof ASSESSMENT_META];
            return (
              <div key={a.id} className="flex items-baseline justify-between py-4">
                <div>
                  <div className="font-medium">{am?.label ?? a.assessment_kind}</div>
                  <div className="text-xs text-charcoal-400">{am?.band}{a.notes ? ` · ${a.notes}` : ""}</div>
                </div>
                {a.due_at && <span className="text-xs text-charcoal-500">Due {new Date(a.due_at).toLocaleDateString()}</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Curriculum tiles */}
      <section className="mt-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-wider text-charcoal-400">Curriculum</h2>
          <Link to="/educator/curriculum" className="ink-link text-sm">Browse all →</Link>
        </div>
        {visibleCamps.length === 0 ? (
          <p className="mt-4 py-6 text-sm text-charcoal-400">No curriculum tagged for your program type yet.</p>
        ) : (
          <div className="mt-4 grid gap-px bg-charcoal-100 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCamps.map((c) => (
              <Link key={c.slug} to="/educator/curriculum/$slug" params={{ slug: c.slug }} className="tile">
                <div className="text-2xl">{c.emoji}</div>
                <div className="mt-3 font-medium">{c.name}</div>
                <div className="mt-1 text-xs text-charcoal-400">{c.duration} · {c.ageRange}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Internship tiles */}
      <section className="mt-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-wider text-charcoal-400">Internships</h2>
          <Link to="/educator/internships" className="ink-link text-sm">Browse all →</Link>
        </div>
        {visibleInternships.length === 0 ? (
          <p className="mt-4 py-6 text-sm text-charcoal-400">No internships tagged for your program type yet.</p>
        ) : (
          <div className="mt-4 grid gap-px bg-charcoal-100 sm:grid-cols-2 lg:grid-cols-3">
            {visibleInternships.map((i) => (
              <Link key={i.slug} to="/educator/internships/$slug" params={{ slug: i.slug }} className="tile">
                <div className="text-2xl">{i.emoji}</div>
                <div className="mt-3 font-medium">{i.name}</div>
                <div className="mt-1 text-xs text-charcoal-400">{i.theme}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* School panel */}
      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400">School</h2>
        <div className="mt-4">
          <EducatorSchoolEditor educatorId={educator.id} initialIrn={educator.school_irn} initialName={educator.school_name} />
        </div>
      </section>
    </main>
  );
}
