import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/passport/Wordmark";

const LINKS: Array<{ to: string; label: string }> = [
  { to: "/about", label: "About" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/student-data", label: "Student data" },
  { to: "/accessibility", label: "WCAG 2.2 compliance" },
  { to: "/instructor/sign-in", label: "Instructors" },
  { to: "/org/sign-in", label: "Partners" },
  { to: "/demo", label: "Demo" },
];

/** Site footer — the same footer as the home page, used on every layout. */
export function SiteFooter({ className = "mt-32" }: { className?: string }) {
  return (
    <footer className={`border-t border-line bg-paper ${className}`}>
      <div className="mx-auto flex max-w-[1312px] flex-wrap justify-between gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2.5">
          <Wordmark />
          <p className="text-sm text-ink-700">From Classrooms to Careers – Pathways Start Here</p>
          <p className="text-sm text-ink-500">
            An Ohio work-based learning portfolio for grades 4 to 12. © {new Date().getFullYear()}{" "}
            EXPLR
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="-my-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-900"
        >
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to as never}
              className="inline-flex min-h-[44px] items-center hover:text-green-deep"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
