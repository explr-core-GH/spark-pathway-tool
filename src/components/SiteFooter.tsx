import { Link } from "@tanstack/react-router";

/** Site footer with legal links — used on public and signed-in layouts. */
export function SiteFooter({ className = "mt-32" }: { className?: string }) {
  return (
    <footer className={`rule ${className}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-4 px-6 py-10 text-sm text-charcoal-400">
        <div>© {new Date().getFullYear()} EXPLR · Cleveland</div>
        <nav aria-label="Legal" className="flex flex-wrap gap-6">
          <Link to="/about" className="hover:text-ink">About</Link>
          <Link to="/privacy" className="hover:text-ink">Privacy</Link>
          <Link to="/terms" className="hover:text-ink">Terms</Link>
          <Link to="/student-data" className="hover:text-ink">Student Data</Link>
        </nav>
      </div>
    </footer>
  );
}
