import { createFileRoute, Link } from "@tanstack/react-router";

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
      <h1 className="display mt-4 max-w-3xl">Curriculum, rosters, and assignments.</h1>
      <p className="lead mt-6 max-w-xl">
        Approved educators see their assigned camp sessions, the linked
        curriculum, and the student roster for each one.
      </p>
      <div className="mt-12 flex gap-3">
        <Link to="/educator/sign-up" className="btn-ink">Create educator account</Link>
        <Link to="/educator/sign-in" className="btn-ghost">Sign in</Link>
      </div>
    </main>
  );
}
