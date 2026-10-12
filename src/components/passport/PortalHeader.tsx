import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Wordmark } from "./Wordmark";

export type PortalLink = {
  label: string;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
  /** Hide on small screens (still reachable from the Menu disclosure). */
  secondary?: boolean;
};

type Props = {
  /** Short role label shown as a chip beside the wordmark, e.g. "Instructor". */
  role?: string;
  links?: PortalLink[];
  /** Extra content on the right (progress counters, buttons). */
  right?: ReactNode;
  /** Shows "Sign out" (true) or "Sign in" (false); omit for neither. */
  signedIn?: boolean;
  signInTo?: string;
  /** Second row rendered under the main bar (admin "view as", progress bars). */
  subbar?: ReactNode;
  className?: string;
};

/**
 * PortalHeader — the one header every signed-in surface (and the simple
 * public pages) uses so the inside of the site matches the home page: the
 * wordmark, a role chip, text links at 44px tap targets, and a Menu
 * disclosure on phones for the links that don't fit.
 */
export function PortalHeader({
  role,
  links = [],
  right,
  signedIn,
  signInTo = "/sign-in",
  subbar,
  className = "",
}: Props) {
  const primary = links.filter((l) => !l.secondary);
  const secondary = links.filter((l) => l.secondary);
  const showMenu = secondary.length > 0;

  return (
    <header className={`border-b border-line bg-paper ${className}`}>
      <div className="mx-auto flex max-w-[1312px] items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Wordmark className="shrink-0" />
          {role && (
            <span className="hidden shrink-0 rounded-full border border-line bg-paper-raised px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-700 sm:inline-flex">
              {role}
            </span>
          )}
        </div>
        <nav
          aria-label="Portal"
          className="flex shrink-0 items-center gap-3 whitespace-nowrap text-[15px] font-medium text-ink-900 sm:gap-5 md:gap-6"
        >
          {primary.map((l) => (
            <Link
              key={l.label}
              to={l.to as never}
              params={l.params as never}
              search={l.search as never}
              className="inline-flex min-h-[44px] items-center hover:text-green-deep"
              activeProps={{ className: "inline-flex min-h-[44px] items-center text-green-deep" }}
            >
              {l.label}
            </Link>
          ))}
          {secondary.map((l) => (
            <Link
              key={l.label}
              to={l.to as never}
              params={l.params as never}
              search={l.search as never}
              className="hidden min-h-[44px] items-center hover:text-green-deep md:inline-flex"
              activeProps={{
                className: "hidden min-h-[44px] items-center text-green-deep md:inline-flex",
              }}
            >
              {l.label}
            </Link>
          ))}
          {right}
          {signedIn === true && (
            <Link
              to="/sign-out"
              className="inline-flex min-h-[44px] items-center text-ink-500 hover:text-ink-900"
            >
              Sign out
            </Link>
          )}
          {signedIn === false && (
            <Link to={signInTo as never} className="btn-mint px-3.5 sm:px-5">
              Sign in
            </Link>
          )}
          {showMenu && (
            <details className="relative md:hidden">
              <summary className="inline-flex min-h-[44px] cursor-pointer list-none items-center gap-1 rounded-[var(--radius-control)] border border-line px-3 text-sm marker:hidden">
                Menu
              </summary>
              <ul className="absolute right-0 z-20 mt-2 min-w-[12rem] rounded-[var(--radius-card)] border border-line bg-paper-raised p-2 shadow-lg">
                {secondary.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to as never}
                      params={l.params as never}
                      search={l.search as never}
                      className="flex min-h-[44px] items-center rounded-[var(--radius-control)] px-3 text-[15px] hover:bg-mint-tint"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </nav>
      </div>
      {subbar}
    </header>
  );
}
