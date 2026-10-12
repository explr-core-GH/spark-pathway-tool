import { Link } from "@tanstack/react-router";

/**
 * EXPLR Pathways logo mark: mint rounded square, a white path winding up
 * toward a four-point star. Vector recreation of the brand lockup so it
 * stays crisp at every size; colors are the logo's own (#2BEDA1 / #1A1D1F).
 */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      focusable="false"
      className={className}
    >
      <rect width="64" height="64" rx="14" fill="#2BEDA1" />
      {/* winding path: wide at the bottom edge, narrowing as it climbs */}
      <path
        d="M9 64 C 9 52 23 49 25 40 C 27 32 18 29 21 23 C 22 21 24 20 26 20 C 24 26 33 30 31 40 C 29 50 27 55 27 64 Z"
        fill="#FFFFFF"
      />
      {/* four-point star */}
      <path d="M33 5 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill="#FFFFFF" />
    </svg>
  );
}

/** Brand wordmark lockup. Links home. The text carries the accessible name. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-label="EXPLR Pathways home"
    >
      <LogoMark size={32} />
      <span className="font-display text-[19px] font-extrabold uppercase leading-none tracking-[0.01em] text-[#1A1D1F]">
        EXPLR <span className="text-[#2BEDA1]">Pathways</span>
      </span>
    </Link>
  );
}
