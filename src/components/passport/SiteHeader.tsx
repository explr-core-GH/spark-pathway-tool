import { Link } from "@tanstack/react-router";
import { Wordmark } from "./Wordmark";

/** Public (signed-out) header. Signed-in surfaces keep their own headers. */
export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-[1312px] items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Wordmark />
        <nav
          aria-label="Primary"
          className="flex items-center gap-4 text-[15px] font-medium text-ink-900 sm:gap-7"
        >
          <Link to="/opportunities" className="hidden hover:text-green-deep sm:inline">
            Opportunities
          </Link>
          <Link to="/about" className="hidden hover:text-green-deep sm:inline">
            About
          </Link>
          <Link to="/family" className="hidden hover:text-green-deep md:inline">
            Families
          </Link>
          <Link to="/sign-in" className="hover:text-green-deep">
            Sign in
          </Link>
          <Link to="/start" className="btn-mint">
            Start
          </Link>
        </nav>
      </div>
    </header>
  );
}
