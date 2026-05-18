import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RosterPanel } from "@/components/RosterPanel";
import { EducatorGate } from "@/components/EducatorGate";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/educator/internships/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Internship` }] }),
  component: () => (
    <EducatorGate>
      <InternshipDetail />
    </EducatorGate>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-6 py-24 text-center text-sm">
      Not found.{" "}
      <Link to="/educator/internships" className="ink-link">
        Back
      </Link>
    </div>
  ),
});

// Row shape from public.internships — what the admin edits.
type InternshipRow = {
  slug: string;
  name: string;
  emoji: string;
  theme: string | null;
  lead: string | null;
  outside_partners: string | null;
  deliverables: string | null;
  external_url: string | null;
  riasec: string[] | null;
  visible: boolean | null;
};

function InternshipDetail() {
  const { slug } = Route.useParams();
  // No detail-page assignment gate. EducatorGate ensures a signed-in
  // approved educator (or admin) is on this route; the dashboard +
  // internships index already filter what's visible. If someone reaches
  // this URL they have a legitimate reason to render it.
  const [internship, setInternship] = useState<InternshipRow | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from("internships")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        setInternship((data as InternshipRow) ?? null);
        setLoaded(true);
      });
  }, [slug]);

  if (!loaded) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16 text-sm text-charcoal-400">
        Loading…
      </main>
    );
  }

  if (!internship) throw notFound();

  const i = internship;
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link to="/educator/dashboard" className="ink-link text-sm">
        ← Dashboard
      </Link>
      <div className="mt-6 flex items-baseline gap-3">
        <span className="text-3xl">{i.emoji}</span>
        <h1 className="text-4xl font-light">{i.name}</h1>
      </div>
      {i.theme && <p className="lead mt-3">{i.theme}</p>}

      {i.riasec && i.riasec.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1">
          {i.riasec.map((c) => (
            <span
              key={c}
              className="inline-block border border-charcoal-200 px-1.5 py-0.5 text-[11px] uppercase tracking-wider text-charcoal-600"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <dl className="mt-10 grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="eyebrow">Lead</dt>
          <dd className="mt-1">{i.lead ?? "TBD"}</dd>
        </div>
        {i.outside_partners && (
          <div>
            <dt className="eyebrow">Outside partners</dt>
            <dd className="mt-1 text-sm text-charcoal-600">{i.outside_partners}</dd>
          </div>
        )}
        {i.deliverables && (
          <div className="sm:col-span-2">
            <dt className="eyebrow">Deliverables</dt>
            <dd className="mt-1 text-sm text-charcoal-600">{i.deliverables}</dd>
          </div>
        )}
      </dl>

      {i.external_url && (
        <div className="mt-10">
          <a href={i.external_url} target="_blank" rel="noreferrer" className="btn-ink">
            Visit program site →
          </a>
        </div>
      )}

      <section className="mt-16">
        <h2 className="mb-4 text-xs uppercase tracking-wider text-charcoal-400">
          Roster
        </h2>
        <RosterPanel unitType="internship" unitSlug={i.slug} />
      </section>
    </main>
  );
}
