import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

type Camp = {
  slug: string;
  name: string;
  emoji: string;
  tagline: string | null;
  duration: string | null;
  age_range: string | null;
  visible: boolean | null;
};

function CurriculumIndex() {
  const { educator, isAdmin } = useEducator();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [tags, setTags] = useState<Record<string, string[]>>({});

  useEffect(() => {
    // Source of truth is the Supabase `camps` table, not the static
    // catalog in src/lib (which is just the original seed list). Admins
    // who add curriculum via /educator/admin/camps land rows here.
    supabase
      .from("camps")
      .select("slug,name,emoji,tagline,duration,age_range,visible")
      .eq("visible", true)
      .order("sort_order")
      .order("name")
      .then(({ data }) => setCamps((data ?? []) as Camp[]));

    supabase
      .from("curriculum_tags")
      .select("camp_slug, program_type")
      .then(({ data }) => {
        const map: Record<string, string[]> = {};
        (data ?? []).forEach((r) => {
          (map[r.camp_slug] ??= []).push(r.program_type);
        });
        setTags(map);
      });
  }, []);

  const visible = isAdmin
    ? camps
    : camps.filter((c) =>
        (tags[c.slug] ?? []).includes(educator?.program_type ?? ""),
      );

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Curriculum</p>
      <h1 className="mt-3 text-4xl font-light">{visible.length} units</h1>
      {visible.length === 0 && (
        <p className="mt-6 text-sm text-charcoal-500">
          No curriculum has been approved for your program type yet. An admin
          will tag relevant units soon.
        </p>
      )}
      <div className="mt-10 grid gap-px bg-charcoal-100 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((c) => (
          <Link
            key={c.slug}
            to="/educator/curriculum/$slug"
            params={{ slug: c.slug }}
            className="tile"
          >
            <div className="text-2xl">{c.emoji}</div>
            <div className="mt-3 font-medium">{c.name}</div>
            {c.tagline && (
              <p className="mt-2 text-sm text-charcoal-500">{c.tagline}</p>
            )}
            <div className="mt-3 text-xs text-charcoal-400">
              {c.duration ?? "—"}
              {c.age_range ? ` · ${c.age_range}` : ""}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
