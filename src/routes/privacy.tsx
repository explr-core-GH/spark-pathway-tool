import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — EXPLR" },
      { name: "description", content: "How EXPLR handles student data: minimal collection, scheduled deletion, no third-party sharing." },
      { property: "og:title", content: "Privacy — EXPLR" },
      { property: "og:description", content: "How EXPLR handles student data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-base font-medium">EXPLR</Link>
          <Link to="/" className="text-sm text-charcoal-500 hover:text-ink">← Home</Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-24">
        <p className="eyebrow">Privacy</p>
        <h1 className="display mt-4">Student data, handled carefully.</h1>
        <div className="prose mt-12 space-y-6 text-charcoal-600">
          <p className="lead">
            We collect the minimum needed to produce a useful interest profile,
            scheduled for deletion 24 months after creation.
          </p>
          <h2 className="text-xl font-medium pt-6">What we collect</h2>
          <p>
            A first name, current grade level, assessment responses, and the
            computed Holland code. Email addresses for student accounts.
          </p>
          <h2 className="text-xl font-medium pt-6">What we don't do</h2>
          <p>
            Sell data. Share with advertisers. Use responses for anything other
            than producing the student's career-interest report and aggregate
            program-level analytics shown to their educators.
          </p>
          <h2 className="text-xl font-medium pt-6">Deletion</h2>
          <p>
            Student records are scheduled for deletion 24 months after creation.
            Students or their school may request earlier deletion at any time.
          </p>
        </div>
      </main>
    </div>
  );
}
