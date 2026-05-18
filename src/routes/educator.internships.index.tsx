import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEducator } from "@/lib/auth";
import { EducatorGate } from "@/components/EducatorGate";

export const Route = createFileRoute("/educator/internships/")({
  head: () => ({ meta: [{ title: "Internships — EXPLR" }] }),
  component: () => (
    <EducatorGate>
      <InternshipsIndex />
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

function InternshipsIndex() {
  const { educator, isAdmin } = useEducator();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [tags, setTags] = useState<Record<string, string[]>>({});

  useEffect(() => {
    // Read from the Supabase `internships` table — anything added via
    // /educator/admin/internships lives there. The static catalog in
    // src/lib/internships-catalog.ts is just the original seed list.
    supabase
      .from("internships")
      .select("slug,name,emoji,theme,lead,visible")
      .eq("visible", true)
      .order("sort_order")
      .order("name")
      .then(({ data }) => setInternships((data ?? []) as Internship[]));

    supabase
      .from("internship_tags")
      .select("internship_slug, program_type")
      .then(({ data }) => {
        const map: Record<string, string[]> = {};
        (data ?? []).forEach((r) => {
          (map[r.internship_slug] ??= []).push(r.program_type);
        });
        setTags(map);
      });
  }, []);

  const visible = isAdmin
    ? internships
    : internships.filter((i) =>
        (tags[i.slug] ?? []).includes(educator?.program_type ?? ""),
      );

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Internships</p>
      <h1 className="mt-3 text-4xl font-light">{visible.length} programs</h1>
      {visible.length === 0 && (
        <p className="mt-6 text-sm text-charcoal-500">
          No internships have been approved for your program type yet.
        </p>
      )}
      <div className="mt-10 grid gap-px bg-charcoal-100 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((i) => (
          <Link
            key={i.slug}
            to="/educator/internships/$slug"
            params={{ slug: i.slug }}
            className="tile"
          >
            <div className="text-2xl">{i.emoji}</div>
            <div className="mt-3 font-medium">{i.name}</div>
            {i.theme && (
              <p className="mt-2 text-sm text-charcoal-500">{i.theme}</p>
            )}
            <div className="mt-3 text-xs text-charcoal-400">
              {i.lead ?? "Lead TBD"}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
