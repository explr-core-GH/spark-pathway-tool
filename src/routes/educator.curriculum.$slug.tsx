import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCamp, fileUrl, RESOURCE_LABELS } from "@/lib/camp-curriculum";
import { SlideViewer } from "@/components/SlideViewer";
import { RosterPanel } from "@/components/RosterPanel";
import { EducatorGate } from "@/components/EducatorGate";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/educator/curriculum/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Curriculum` }] }),
  component: () => (
    <EducatorGate>
      <CurriculumDetail />
    </EducatorGate>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-6 py-24 text-center text-sm text-charcoal-500">
      Curriculum not found.{" "}
      <Link to="/educator/curriculum" className="ink-link">
        Back
      </Link>
    </div>
  ),
});

// Supabase row from public.camps — admin-edited subset.
type CampRow = {
  slug: string;
  name: string;
  emoji: string;
  tagline: string | null;
  duration: string | null;
  age_range: string | null;
  overview: string | null;
  slides: string | null;
  visible: boolean | null;
};

function CurriculumDetail() {
  const { slug } = Route.useParams();
  // No per-page assignment gate. EducatorGate (further up the tree)
  // ensures only signed-in approved educators or admins reach this route;
  // the dashboard + curriculum index already filter the visible set.
  const [camp, setCamp] = useState<CampRow | null>(null);
  const [campLoaded, setCampLoaded] = useState(false);
  const [dayIdx, setDayIdx] = useState(0);

  // Static-catalog enrichment for seeded camps: brings day-deck breakdowns
  // and resources for camps that originally shipped in src/lib. Admin-added
  // camps won't have a match here — they render header + slides + roster.
  const seed = getCamp(slug);

  useEffect(() => {
    supabase
      .from("camps")
      .select("slug,name,emoji,tagline,duration,age_range,overview,slides,visible")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        setCamp((data as CampRow) ?? null);
        setCampLoaded(true);
      });
  }, [slug]);

  if (!campLoaded) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16 text-sm text-charcoal-400">
        Loading…
      </main>
    );
  }

  // Prefer the Supabase row; fall back to the seed catalog if the DB
  // doesn't have a matching slug (handles old seed-only rows).
  const item: CampRow | null = camp
    ? camp
    : seed
      ? {
          slug: seed.slug,
          name: seed.name,
          emoji: seed.emoji,
          tagline: seed.tagline,
          duration: seed.duration,
          age_range: seed.ageRange,
          overview: seed.overview,
          slides: seed.slides,
          visible: true,
        }
      : null;

  if (!item) throw notFound();

  // Days + resources only exist for seeded camps. Admin-added camps render
  // with a single slides file + roster.
  const days = seed?.days ?? [];
  const resources = seed?.resources ?? [];
  const currentFile = days.length > 0 ? days[dayIdx]?.file : item.slides;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <Link to="/educator/dashboard" className="ink-link text-sm">
        ← Dashboard
      </Link>
      <div className="mt-6 flex items-baseline gap-3">
        <span className="text-3xl">{item.emoji}</span>
        <h1 className="text-4xl font-light">{item.name}</h1>
      </div>
      {item.tagline && <p className="lead mt-3 max-w-2xl">{item.tagline}</p>}
      <div className="mt-2 text-xs text-charcoal-400">
        {item.duration ?? "—"}
        {item.age_range ? ` · ${item.age_range}` : ""}
      </div>
      {item.overview && (
        <p className="mt-6 max-w-2xl text-sm text-charcoal-600">{item.overview}</p>
      )}

      {days.length > 0 && (
        <div className="mt-12">
          <div className="flex flex-wrap gap-1 border-b border-charcoal-100">
            {days.map((d, i) => (
              <button
                key={d.day}
                onClick={() => setDayIdx(i)}
                className="border-b-2 px-4 py-2 text-sm transition-colors"
                style={{
                  borderColor: dayIdx === i ? "var(--ink)" : "transparent",
                  color: dayIdx === i ? "var(--ink)" : "var(--color-charcoal-400)",
                }}
              >
                Day {d.day}
              </button>
            ))}
          </div>
          <h3 className="mt-6 text-lg font-medium">{days[dayIdx].title}</h3>
        </div>
      )}

      {currentFile && (
        <div className="mt-6">
          <SlideViewer slug={item.slug} file={currentFile} />
        </div>
      )}

      {resources.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xs uppercase tracking-wider text-charcoal-400">
            Resources
          </h2>
          <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
            {resources.map((r) => (
              <li key={r.file} className="flex items-baseline justify-between py-3">
                <a
                  href={fileUrl(item.slug, r.file)}
                  target="_blank"
                  rel="noreferrer"
                  className="ink-link text-sm"
                >
                  {r.label} ↗
                </a>
                <span className="text-xs uppercase tracking-wider text-charcoal-400">
                  {RESOURCE_LABELS[r.type]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16">
        <h2 className="mb-4 text-xs uppercase tracking-wider text-charcoal-400">
          Roster
        </h2>
        <RosterPanel unitType="camp" unitSlug={item.slug} />
      </section>
    </main>
  );
}
