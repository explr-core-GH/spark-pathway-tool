import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INTERNSHIPS } from "@/lib/internships-catalog";
import { PROGRAM_TYPES, PROGRAM_META, type ProgramType } from "@/lib/educator";

export const Route = createFileRoute("/educator/admin/internship-tags")({
  head: () => ({ meta: [{ title: "Internship tags — Admin" }] }),
  component: InternshipTags,
});

function InternshipTags() {
  const [tags, setTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from("internship_tags").select("internship_slug, program_type").then(({ data }) => {
      setTags(new Set((data ?? []).map((r) => `${r.internship_slug}|${r.program_type}`)));
    });
  }, []);

  async function toggle(slug: string, pt: ProgramType) {
    const key = `${slug}|${pt}`;
    const next = new Set(tags);
    if (tags.has(key)) {
      next.delete(key); setTags(next);
      await supabase.from("internship_tags").delete().eq("internship_slug", slug).eq("program_type", pt);
    } else {
      next.add(key); setTags(next);
      await supabase.from("internship_tags").insert({ internship_slug: slug, program_type: pt });
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-3 text-4xl font-light">Internship tags</h1>
      <div className="mt-10 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-charcoal-200 text-left text-xs uppercase tracking-wider text-charcoal-400">
              <th className="py-2 pr-4">Internship</th>
              {PROGRAM_TYPES.map((pt) => <th key={pt} className="px-2 py-2 text-center">{PROGRAM_META[pt].label}</th>)}
            </tr>
          </thead>
          <tbody>
            {INTERNSHIPS.map((i) => (
              <tr key={i.slug} className="border-b border-charcoal-100">
                <td className="py-3 pr-4"><span className="mr-2">{i.emoji}</span>{i.name}</td>
                {PROGRAM_TYPES.map((pt) => {
                  const on = tags.has(`${i.slug}|${pt}`);
                  return (
                    <td key={pt} className="px-2 py-3 text-center">
                      <button onClick={() => toggle(i.slug, pt)}
                        className="h-5 w-5 border"
                        style={{ borderColor: on ? "var(--ink)" : "var(--color-charcoal-200)", background: on ? "var(--color-explr-500)" : "transparent" }} />
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
