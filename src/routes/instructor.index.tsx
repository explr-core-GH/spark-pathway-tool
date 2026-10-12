import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardCheck,
  FileBadge,
  Stamp as StampIcon,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Stamp } from "@/components/passport/Stamp";

export const Route = createFileRoute("/instructor/")({
  head: () => ({
    meta: [
      { title: "Instructor portal — EXPLR" },
      {
        name: "description",
        content: "Rosters, checkpoints, and work-based learning verification for Ohio instructors.",
      },
      { property: "og:title", content: "Instructor portal — EXPLR" },
      { property: "og:description", content: "Rosters, checkpoints, and verification." },
    ],
  }),
  component: EducatorLanding,
});

const FEATURES: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Users,
    title: "Rosters",
    body: "Every class, camp, and program you run in one list. Add students, print passport cards for grades 4-8, and see who has signed in.",
  },
  {
    icon: ClipboardCheck,
    title: "Checkpoints",
    body: "Two career advising checkpoints a year, grades 6-12, reviewed in minutes and exported as the Student Success Plan.",
  },
  {
    icon: StampIcon,
    title: "Verifying experiences",
    body: "Students name you as the supervisor; you confirm hours and duties and rate the skills you watched. Your stamp can't be edited by the student.",
  },
  {
    icon: FileBadge,
    title: "Recommendation letters",
    body: "Write letters against a student's verified passport, so every claim you make is backed by a stamp.",
  },
];

/**
 * Signed-out landing for the instructor portal. Renders inside the
 * /instructor layout (instructor.tsx), which already provides the
 * PortalHeader and SiteFooter.
 */
function EducatorLanding() {
  return (
    <main className="mx-auto w-full max-w-[1312px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <div className="flex flex-col gap-6">
          <p className="eyebrow text-green">Instructors</p>
          <h1 className="display">
            Rosters, checkpoints,
            <span className="block text-green">and stamps that count.</span>
          </h1>
          <p className="lead max-w-[600px] text-ink-700">
            For teachers, coaches, camp staff, and worksite supervisors. See every student you work
            with, review their advising checkpoints, verify the work you watched them do, and write
            recommendations backed by a stamped record.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/instructor/sign-up" className="btn-ink">
              Request instructor access
            </Link>
            <Link to="/instructor/sign-in" className="btn-ghost">
              Sign in
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-ink-500">
            <Stamp label="Verified · one link" />
            <span>Supervisors stamp from one emailed link. No account needed for them.</span>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <img
            src="/passport/assessments.webp"
            alt=""
            width={480}
            height={480}
            className="w-full max-w-[480px]"
            fetchPriority="high"
          />
        </div>
      </section>

      <section className="mt-14 sm:mt-20">
        <div className="flex flex-col gap-2.5">
          <p className="eyebrow text-green">What&apos;s inside</p>
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Four things the portal does for you.
          </h2>
        </div>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((f) => (
            <li
              key={f.title}
              className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 shadow-card"
            >
              <span className="grid h-12 w-12 place-items-center rounded-[14px] border border-mint-soft bg-mint-tint text-green-deep">
                <f.icon className="h-6 w-6" strokeWidth={2} aria-hidden />
              </span>
              <h3 className="font-display text-xl font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-ink-700">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 rounded-[var(--radius-card)] border border-line bg-paper-raised p-8 text-center shadow-card sm:mt-20">
        <p className="eyebrow text-green">Approved by an EXPLR admin</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">
          Request access, or use your invite link.
        </h2>
        <p className="mx-auto mt-3 max-w-[560px] text-ink-700">
          New accounts are reviewed by an EXPLR admin before rosters open. If your district or
          program sent you an invite link, it activates instantly.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/instructor/sign-up" className="btn-ink">
            Request instructor access
          </Link>
          <Link to="/about" className="btn-ghost">
            How Pathways meets Ohio&apos;s requirements
          </Link>
        </div>
      </section>
    </main>
  );
}
