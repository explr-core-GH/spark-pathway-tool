import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INTERNSHIPS } from "@/lib/internships-catalog";
import { useEducator } from "@/lib/auth";

export const Route = createFileRoute("/educator/internships/")({
  head: () => ({ meta: [{ title: "Internships — EXPLR" }] }),
  component: InternshipsIndex,
});

function InternshipsIndex() {
  const { educator } = useEducator();
  const [tags, setTags] = useState<Record<string, string[]>>({});
  useEffect(() => {
    supabase.from("internship_tags").select("internship_slug, program_type").then(({ data }) => {
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((r) => { (map[r.internship_slug] ??= []).push(r.program_type); });
      setTags(map);
    });
  }, []);
  const visible = educator?.program_type
    ? INTERNSHIPS.filter((i) => (tags[i.slug] ?? []).includes(educator.program_type as string))
    : INTERNSHIPS;
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Internships</p>
      <h1 className="mt-3 text-4xl font-light">{visible.length} programs</h1>
      <div className="mt-10 grid gap-px bg-charcoal-100 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((i) => (
          <Link key={i.slug} to="/educator/internships/$slug" params={{ slug: i.slug }} className="tile">
            <div className="text-2xl">{i.emoji}</div>
            <div className="mt-3 font-medium">{i.name}</div>
            <p className="mt-2 text-sm text-charcoal-500">{i.theme}</p>
            <div className="mt-3 text-xs text-charcoal-400">{i.lead ?? "Lead TBD"}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
