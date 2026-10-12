import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/passport";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * /family — the families entry point. Family codes (a system-generated code a student
 * shares so a caregiver can view their passport without an account) ship in
 * the sign-in phase of the rebuild. Until then this page explains what
 * families can see today and how.
 */
export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "Families — EXPLR Pathways" },
      {
        name: "description",
        content: "How families see a student's EXPLR passport: results, hours, and opportunities.",
      },
    ],
  }),
  component: Family,
});

function Family() {
  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <SiteHeader />
      <main className="mx-auto max-w-[1312px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-6">
            <p className="eyebrow text-green">For families</p>
            <h1 className="display">Your student's passport, in your hands.</h1>
            <p className="lead max-w-[600px] text-ink-700">
              Families can see completed interest results, internship matches, and what a student
              has explored. You don't need to interpret a chart; the passport explains itself.
            </p>
            <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 shadow-card">
              <h2 className="font-display text-xl font-semibold">How to see it today</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink-700">
                <li>Sit with your student and have them sign in.</li>
                <li>
                  On their dashboard, open the <strong>For families</strong> tab.
                </li>
                <li>Everything there is written for you: results, matches, and next steps.</li>
              </ol>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/sign-in" className="btn-ink">
                  Student sign in
                </Link>
                <Link to="/student-data" className="btn-ghost">
                  How student data is protected
                </Link>
              </div>
            </div>
            <div className="rounded-[var(--radius-card)] bg-gold-tint p-5">
              <p className="eyebrow text-gold-deep">Coming next</p>
              <p className="mt-1 text-sm text-ink-700">
                Family codes. Your student will be able to share a short code so you can open their
                passport from your own phone, no account needed.
              </p>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <img
              src="/passport/families.webp"
              alt="Two caregivers and a student looking at a large unfolded exploration map"
              width={520}
              height={520}
              className="w-full max-w-[520px]"
            />
          </div>
        </div>
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );
}
