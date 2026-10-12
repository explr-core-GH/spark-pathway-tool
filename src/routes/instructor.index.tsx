import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/instructor/")({
  head: () => ({
    meta: [
      { title: "Instructor portal — EXPLR" },
      {
        name: "description",
        content: "Rosters, checkpoints, and work-based learning verification for Ohio instructors.",
      },
      { property: "og:title", content: "Instructor portal — EXPLR" },
      { property: "og:description", content: "Curriculum, rosters, and assessment assignments." },
    ],
  }),
  component: EducatorLanding,
});

function EducatorLanding() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-24">
      <p className="eyebrow">Instructor portal</p>
      <h1 className="display mt-4 max-w-3xl">Rosters, checkpoints, and verification.</h1>
      <p className="lead mt-6 max-w-xl">
        Approved instructors see their assigned camp sessions, their rosters, and the student roster
        for each one.
      </p>
      <div className="mt-12 flex gap-3">
        <Link to="/instructor/sign-up" className="btn-ink">
          Create instructor account
        </Link>
        <Link to="/instructor/sign-in" className="btn-ghost">
          Sign in
        </Link>
      </div>
    </main>
  );
}
