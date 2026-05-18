import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CAMPS } from "@/lib/camp-curriculum";
import { PROGRAM_TYPES, PROGRAM_META, type ProgramType } from "@/lib/educator";

export const Route = createFileRoute("/educator/admin/curriculum-tags")({
  head: () => ({ meta: [{ title: "Curriculum tags — Admin" }] }),
  component: CurriculumTags,
});

function CurriculumTags() {
  const [tags, setTags] = useState<Set<string>>(new Set()); // key = `${slug}|${pt}`

  useEffect(() => {
    supabase.from("curriculum_tags").select("camp_slug, program_type").then(({ data }) => {
      setTags(new Set((data ?? []).map((r) => `${r.camp_slug}|${r.program_type}`)));
    });
  }, []);

  async function toggle(slug: string, pt: ProgramType) {
    const key = `${slug}|${pt}`;
    const next = new Set(tags);
    if (tags.has(key)) {
      next.delete(key); setTags(next);
      await supabase.from("curriculum_tags").delete().eq("camp_slug", slug).eq("program_type", pt);
    } else {
      next.add(key); setTags(next);
      await supabase.from("curriculum_tags").insert({ camp_slug: slug, program_type: pt });
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-3 text-4xl font-light">Curriculum tags</h1>
      <p className="lead mt-3">Tag each camp with the program types whose educators should see it.</p>
      <div className="mt-10 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-charcoal-200 text-left text-xs uppercase tracking-wider text-charcoal-400">
              <th className="py-2 pr-4">Camp</th>
              {PROGRAM_TYPES.map((pt) => <th key={pt} className="px-2 py-2 text-center">{PROGRAM_META[pt].label}</th>)}
            </tr>
          </thead>
          <tbody>
            {CAMPS.map((c) => (
              <tr key={c.slug} className="border-b border-charcoal-100">
                <td className="py-3 pr-4"><span className="mr-2">{c.emoji}</span>{c.name}</td>
                {PROGRAM_TYPES.map((pt) => {
                  const on = tags.has(`${c.slug}|${pt}`);
                  return (
                    <td key={pt} className="px-2 py-3 text-center">
                      <button onClick={() => toggle(c.slug, pt)}
                        className="h-5 w-5 border transition-colors"
                        style={{ borderColor: on ? "var(--ink)" : "var(--color-charcoal-200)", background: on ? "var(--color-explr-500)" : "transparent" }}
                        aria-label={on ? "remove tag" : "add tag"} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
