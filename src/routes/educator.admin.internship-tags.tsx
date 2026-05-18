import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INTERNSHIPS } from "@/lib/internships-catalog";
import { CAREER_SECTORS, type CareerSectorId } from "@/lib/career-sectors";

export const Route = createFileRoute("/educator/admin/internship-tags")({
  head: () => ({ meta: [{ title: "Internship tags — Admin" }] }),
  component: InternshipTags,
});

function InternshipTags() {
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase
      .from("internship_career_tags")
      .select("internship_slug, career_sector")
      .then(({ data }) => {
        setTags(new Set((data ?? []).map((r) => `${r.internship_slug}|${r.career_sector}`)));
      });
    supabase
      .from("internship_visibility")
      .select("internship_slug, visible")
      .then(({ data }) => {
        setHidden(
          new Set((data ?? []).filter((r) => r.visible === false).map((r) => r.internship_slug)),
        );
      });
  }, []);

  async function toggle(slug: string, sector: CareerSectorId) {
    const key = `${slug}|${sector}`;
    const next = new Set(tags);
    if (tags.has(key)) {
      next.delete(key);
      setTags(next);
      await supabase
        .from("internship_career_tags")
        .delete()
        .eq("internship_slug", slug)
        .eq("career_sector", sector);
    } else {
      next.add(key);
      setTags(next);
      await supabase
        .from("internship_career_tags")
        .insert({ internship_slug: slug, career_sector: sector });
    }
  }

  async function toggleVisible(slug: string) {
    const isHidden = hidden.has(slug);
    const nextVisible = isHidden; // flip
    const next = new Set(hidden);
    if (nextVisible) next.delete(slug); else next.add(slug);
    setHidden(next);
    await supabase
      .from("internship_visibility")
      .upsert(
        { internship_slug: slug, visible: nextVisible, updated_at: new Date().toISOString() },
        { onConflict: "internship_slug" },
      );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-3 text-4xl font-light">Internship tags</h1>
      <p className="mt-3 max-w-2xl text-sm text-charcoal-500">
        Align each internship to one or more of the 16 federal Career Clusters. These tags drive how
        students see internship matches after their assessment.
      </p>
      <div className="mt-10 space-y-10">
        {INTERNSHIPS.map((i) => (
          <div key={i.slug} className="border-t border-charcoal-200 pt-6">
            <h2 className="text-lg font-medium">
              <span className="mr-2">{i.emoji}</span>
              {i.name}
              <span className="ml-3 text-xs uppercase tracking-wider text-charcoal-400">{i.theme}</span>
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CAREER_SECTORS.map((s) => {
                const on = tags.has(`${i.slug}|${s.id}`);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(i.slug, s.id)}
                    className="flex items-center gap-3 border px-3 py-2 text-left text-sm transition-colors"
                    style={{
                      borderColor: on ? "var(--ink)" : "var(--color-charcoal-200)",
                      background: on ? "var(--color-explr-500)" : "transparent",
                      color: on ? "var(--ink)" : "var(--color-charcoal-600)",
                    }}
                  >
                    <span
                      className="h-3 w-3 shrink-0 border"
                      style={{
                        borderColor: on ? "var(--ink)" : "var(--color-charcoal-300)",
                        background: on ? "var(--ink)" : "transparent",
                      }}
                    />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
