import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCamp, fileUrl, RESOURCE_LABELS } from "@/lib/camp-curriculum";
import { SlideViewer } from "@/components/SlideViewer";
import { RosterPanel } from "@/components/RosterPanel";
import { EducatorGate } from "@/components/EducatorGate";
import { useEducator } from "@/lib/auth";
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
  const { educator, isAdmin } = useEducator();
  const [camp, setCamp] = useState<CampRow | null>(null);
  const [campLoaded, setCampLoaded] = useState(false);
  const [dayIdx, setDayIdx] = useState(0);
  const [allowed, setAllowed] = useState<boolean | null>(null);

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

  // Access is now purely by direct assignment in camp_educators.
  // Admins see everything; educators see only camps they've been
  // explicitly assigned to via /educator/admin/assign.
  useEffect(() => {
    if (isAdmin) {
      setAllowed(true);
      return;
    }
    if (!educator) return;
    supabase
      .from("camp_educators")
      .select("camp_slug")
      .eq("camp_slug", slug)
      .eq("educator_id", educator.id)
      .maybeSingle()
      .then(({ data, error }) => {
        // Log the query result so the deny path is debuggable. RLS denials
        // come back as null data without an error — distinguishable from a
        // genuine "no row" only by inspecting the educator/slug below.
        if (error) {
          console.warn("[curriculum gate] camp_educators read failed", {
            slug,
            educatorId: educator.id,
            error,
          });
        } else if (!data) {
          console.warn("[curriculum gate] no camp_educators row", {
            slug,
            educatorId: educator.id,
          });
        }
        setAllowed(!!data);
      });
  }, [educator, isAdmin, slug]);

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

  if (allowed === null) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16 text-sm text-charcoal-400">
        Loading…
      </main>
    );
  }
  if (!allowed) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="eyebrow">Not assigned</p>
        <h1 className="mt-3 text-2xl font-light">
          This curriculum hasn&apos;t been assigned to you
        </h1>
        <p className="mt-3 text-sm text-charcoal-500">
          Ask an EXPLR admin to add you to it.
        </p>
        <Link to="/educator/dashboard" className="btn-ink mt-6 inline-block">
          Back to dashboard
        </Link>
      </main>
    );
  }

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
                <a href={fileUrl(item.slug, r.file)} className="ink-link text-sm">
                  {r.label}
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
