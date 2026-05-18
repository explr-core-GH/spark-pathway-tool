import { createFileRoute, Link } from "@tanstack/react-router";
import { PROGRAM_META, PROGRAM_TYPES } from "@/lib/educator";

export const Route = createFileRoute("/educator/")({
  head: () => ({
    meta: [
      { title: "Educator portal — EXPLR" },
      { name: "description", content: "Curriculum, rosters, and assessment assignments for Cleveland K-12 educators." },
      { property: "og:title", content: "Educator portal — EXPLR" },
      { property: "og:description", content: "Curriculum, rosters, and assessment assignments." },
    ],
  }),
  component: EducatorLanding,
});

function EducatorLanding() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-24">
      <p className="eyebrow">Educator portal</p>
      <h1 className="display mt-4 max-w-3xl">Built around your program.</h1>
      <p className="lead mt-6 max-w-xl">
        Whether you teach science, coach a robotics team, run a summer camp, or
        supervise an internship — EXPLR fits the shape of your work.
      </p>
      <div className="mt-12 flex gap-3">
        <Link to="/educator/sign-up" className="btn-ink">Create educator account</Link>
        <Link to="/educator/sign-in" className="btn-ghost">Sign in</Link>
      </div>

      <section className="mt-32">
        <p className="eyebrow">Program types</p>
        <h2 className="mt-3 text-3xl font-light">Seven shapes of work.</h2>
        <div className="mt-10 grid gap-px bg-charcoal-100 sm:grid-cols-2 lg:grid-cols-3">
          {PROGRAM_TYPES.map((pt) => {
            const m = PROGRAM_META[pt];
            return (
              <div key={pt} className="bg-paper p-6">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: m.accent }} />
                  <p className="text-xs uppercase tracking-wider text-charcoal-400">{m.band}</p>
                </div>
                <h3 className="mt-3 text-lg font-medium">{m.label}</h3>
                <p className="mt-2 text-sm text-charcoal-500">{m.blurb}</p>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
