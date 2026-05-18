import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CAMPS } from "@/lib/camp-curriculum";
import { useEducator } from "@/lib/auth";
import { EducatorGate } from "@/components/EducatorGate";

export const Route = createFileRoute("/educator/curriculum/")({
  head: () => ({ meta: [{ title: "Curriculum — EXPLR" }] }),
  component: () => (
    <EducatorGate>
      <CurriculumIndex />
    </EducatorGate>
  ),
});

function CurriculumIndex() {
  const { educator } = useEducator();
  const [tags, setTags] = useState<Record<string, string[]>>({});
  useEffect(() => {
    supabase.from("curriculum_tags").select("camp_slug, program_type").then(({ data }) => {
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((r) => { (map[r.camp_slug] ??= []).push(r.program_type); });
      setTags(map);
    });
  }, []);
  const visible = educator?.role === "admin"
    ? CAMPS
    : CAMPS.filter((c) => (tags[c.slug] ?? []).includes(educator?.program_type ?? ""));
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Curriculum</p>
      <h1 className="mt-3 text-4xl font-light">{visible.length} units</h1>
      {visible.length === 0 && (
        <p className="mt-6 text-sm text-charcoal-500">
          No curriculum has been approved for your program type yet. An admin will tag relevant units soon.
        </p>
      )}
      <div className="mt-10 grid gap-px bg-charcoal-100 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((c) => (
          <Link key={c.slug} to="/educator/curriculum/$slug" params={{ slug: c.slug }} className="tile">
            <div className="text-2xl">{c.emoji}</div>
            <div className="mt-3 font-medium">{c.name}</div>
            <p className="mt-2 text-sm text-charcoal-500">{c.tagline}</p>
            <div className="mt-3 text-xs text-charcoal-400">{c.duration} · {c.ageRange}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
