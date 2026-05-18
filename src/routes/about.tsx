import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — EXPLR" },
      { name: "description", content: "EXPLR is a Cleveland career-interest assessment grounded in 45 years of vocational psychology research." },
      { property: "og:title", content: "About — EXPLR" },
      { property: "og:description", content: "How EXPLR works and the research behind it." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-base font-medium">EXPLR</Link>
          <Link to="/" className="text-sm text-charcoal-500 hover:text-ink">← Home</Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-24">
        <p className="eyebrow">About</p>
        <h1 className="display mt-4">Built for Cleveland students.</h1>
        <div className="prose mt-12 space-y-6 text-charcoal-600">
          <p className="lead">
            EXPLR is a career-interest assessment platform for Cleveland K-12 students.
            It pairs a short, well-validated interest survey with curriculum and roster
            tools for the educators in their lives.
          </p>
          <h2 className="text-xl font-medium pt-6">The framework</h2>
          <p>
            The student-facing assessment uses RIASEC — John Holland's six interest
            dimensions, the most rigorously validated framework for adolescent interest
            assessment. Structural validity is confirmed across diverse populations
            (Day, Rounds &amp; Swaney 1998); interest stability is documented from age 12
            onward (Low, Yoon, Roberts &amp; Rounds 2005). RIASEC is the framework underneath
            the O*NET Interest Profiler, the Self-Directed Search, and the Strong
            Interest Inventory.
          </p>
          <h2 className="text-xl font-medium pt-6">Who it's for</h2>
          <p>
            Two surfaces share one backend: students take the assessment; educators —
            STEM and CS teachers, FLL/FTC/FRC robotics coaches, EXPLR camp instructors,
            and internship supervisors — manage curriculum, rosters, and assignments.
          </p>
        </div>
      </main>
    </div>
  );
}
