import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { Wordmark } from "@/components/passport";

/** /student/checkpoints — intentionally blank for now; the content is still being decided. */
export const Route = createFileRoute("/student_/checkpoints")({
  head: () => ({ meta: [{ title: "Checkpoints — EXPLR Pathways" }] }),
  component: () => (
    <RoleGuard requires="student">
      <div className="min-h-screen bg-paper text-ink-900">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <Wordmark />
            <Link to="/student" className="text-[15px] font-medium text-green-deep hover:underline">
              ← My passport
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-[900px] px-4 py-16 sm:px-6">
          <p className="eyebrow text-green">Checkpoints</p>
          <h1 className="display mt-1">Little goals on your path.</h1>
          <p className="mt-4 max-w-xl text-ink-700">
            Checkpoints are on the way. For now, keep adding experiences and stickers to your
            passport.
          </p>
          <Link to="/student" className="btn-ink mt-8">
            Back to my passport
          </Link>
        </main>
      </div>
    </RoleGuard>
  ),
});
