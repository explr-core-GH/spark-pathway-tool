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
  notFoundComponent: () => <div className="mx-auto max-w-md px-6 py-24 text-center text-sm text-charcoal-500">Curriculum not found. <Link to="/educator/curriculum" className="ink-link">Back</Link></div>,
});

function CurriculumDetail() {
  const { slug } = Route.useParams();
  const { educator } = useEducator();
  const camp = getCamp(slug);
  const [dayIdx, setDayIdx] = useState(0);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!educator) return;
    if (educator.role === "admin") { setAllowed(true); return; }
    if (!educator.program_type) { setAllowed(false); return; }
    supabase.from("curriculum_tags")
      .select("program_type")
      .eq("camp_slug", slug)
      .eq("program_type", educator.program_type)
      .maybeSingle()
      .then(({ data }) => setAllowed(!!data));
  }, [educator, slug]);

  if (!camp) throw notFound();
  if (allowed === null) return <main className="mx-auto max-w-6xl px-6 py-16 text-sm text-charcoal-400">Loading…</main>;
  if (!allowed) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="eyebrow">Not available</p>
        <h1 className="mt-3 text-2xl font-light">This curriculum isn't approved for your program</h1>
        <p className="mt-3 text-sm text-charcoal-500">Contact your EXPLR admin if you think this is a mistake.</p>
        <Link to="/educator/curriculum" className="btn-ink mt-6 inline-block">Back to curriculum</Link>
      </main>
    );
  }

  const currentFile = camp.days.length > 0 ? camp.days[dayIdx]?.file : camp.slides;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <Link to="/educator/curriculum" className="ink-link text-sm">← Curriculum</Link>
      <div className="mt-6 flex items-baseline gap-3">
        <span className="text-3xl">{camp.emoji}</span>
        <h1 className="text-4xl font-light">{camp.name}</h1>
      </div>
      <p className="lead mt-3 max-w-2xl">{camp.tagline}</p>
      <div className="mt-2 text-xs text-charcoal-400">{camp.duration} · {camp.ageRange}</div>
      <p className="mt-6 max-w-2xl text-sm text-charcoal-600">{camp.overview}</p>

      {camp.days.length > 0 && (
        <div className="mt-12">
          <div className="flex flex-wrap gap-1 border-b border-charcoal-100">
            {camp.days.map((d, i) => (
              <button key={d.day} onClick={() => setDayIdx(i)}
                className="border-b-2 px-4 py-2 text-sm transition-colors"
                style={{ borderColor: dayIdx === i ? "var(--ink)" : "transparent", color: dayIdx === i ? "var(--ink)" : "var(--color-charcoal-400)" }}>
                Day {d.day}
              </button>
            ))}
          </div>
          <h3 className="mt-6 text-lg font-medium">{camp.days[dayIdx].title}</h3>
        </div>
      )}

      {currentFile && <div className="mt-6"><SlideViewer slug={camp.slug} file={currentFile} /></div>}

      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400">Resources</h2>
        <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
          {camp.resources.map((r) => (
            <li key={r.file} className="flex items-baseline justify-between py-3">
              <a href={fileUrl(camp.slug, r.file)} className="ink-link text-sm">{r.label}</a>
              <span className="text-xs uppercase tracking-wider text-charcoal-400">{RESOURCE_LABELS[r.type]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400 mb-4">Roster</h2>
        <RosterPanel unitType="camp" unitSlug={camp.slug} />
      </section>
    </main>
  );
}
