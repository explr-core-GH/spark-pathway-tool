import { Link } from "@tanstack/react-router";
import { Wordmark } from "./Wordmark";

/** Public (signed-out) header. Signed-in surfaces keep their own headers. */
export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-[1312px] items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-6 sm:py-4 lg:px-8">
        <Wordmark className="shrink-0" />
        <nav
          aria-label="Primary"
          className="flex shrink-0 items-center gap-3 whitespace-nowrap text-[15px] font-medium text-ink-900 sm:gap-5 md:gap-7"
        >
          <Link
            to="/opportunities"
            className="hidden min-h-[44px] items-center hover:text-green-deep sm:inline-flex"
          >
            Opportunities
          </Link>
          <Link
            to="/careers"
            className="hidden min-h-[44px] items-center hover:text-green-deep sm:inline-flex"
          >
            Careers
          </Link>
          <Link
            to="/about"
            className="hidden min-h-[44px] items-center hover:text-green-deep sm:inline-flex"
          >
            About
          </Link>
          <Link
            to="/family"
            className="hidden min-h-[44px] items-center hover:text-green-deep md:inline-flex"
          >
            Families
          </Link>
          <Link
            to="/sign-in"
            className="inline-flex min-h-[44px] items-center hover:text-green-deep"
          >
            Sign in
          </Link>
          <Link to="/start" className="btn-mint px-3.5 sm:px-5">
            Start
          </Link>
        </nav>
      </div>
    </header>
  );
}
