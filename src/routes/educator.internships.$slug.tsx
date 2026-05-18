import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { INTERNSHIPS } from "@/lib/internships-catalog";
import { RosterPanel } from "@/components/RosterPanel";

export const Route = createFileRoute("/educator/internships/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Internship` }] }),
  component: InternshipDetail,
  notFoundComponent: () => <div className="mx-auto max-w-md px-6 py-24 text-center text-sm">Not found. <Link to="/educator/internships" className="ink-link">Back</Link></div>,
});

function InternshipDetail() {
  const { slug } = Route.useParams();
  const i = INTERNSHIPS.find((x) => x.slug === slug);
  if (!i) throw notFound();
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link to="/educator/internships" className="ink-link text-sm">← Internships</Link>
      <div className="mt-6 flex items-baseline gap-3">
        <span className="text-3xl">{i.emoji}</span>
        <h1 className="text-4xl font-light">{i.name}</h1>
      </div>
      <p className="lead mt-3">{i.theme}</p>
      <dl className="mt-10 grid gap-6 sm:grid-cols-2">
        <div><dt className="eyebrow">Lead</dt><dd className="mt-1">{i.lead ?? "TBD"}</dd></div>
        <div><dt className="eyebrow">Outside partners</dt><dd className="mt-1 text-sm text-charcoal-600">{i.outsidePartners}</dd></div>
        <div className="sm:col-span-2"><dt className="eyebrow">Deliverables</dt><dd className="mt-1 text-sm text-charcoal-600">{i.deliverables}</dd></div>
      </dl>
      <div className="mt-10">
        <a href={i.externalUrl} target="_blank" rel="noreferrer" className="btn-ink">Visit program site →</a>
      </div>
      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400 mb-4">Roster</h2>
        <RosterPanel unitType="internship" unitSlug={i.slug} />
      </section>
    </main>
  );
}
