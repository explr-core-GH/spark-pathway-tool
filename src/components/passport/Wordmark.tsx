import { Link } from "@tanstack/react-router";

/**
 * EXPLR Pathways brand assets, from the real logo file:
 *   /passport/logo.png       — full lockup (mark + "EXPLR PATHWAYS")
 *   /passport/logo-mark.png  — the mint compass circle
 * The lockup is about 4.3:1; the mark is round.
 */

/** The logo mark on its own, sized by height. */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/passport/logo-mark.png"
      alt=""
      aria-hidden
      height={size}
      width={size}
      className={`block ${className}`}
      style={{ height: size, width: "auto" }}
      decoding="async"
    />
  );
}

/** Brand wordmark lockup. Links home. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center whitespace-nowrap ${className}`}
      aria-label="EXPLR Pathways home"
    >
      <img
        src="/passport/logo.png"
        alt="EXPLR Pathways"
        width={860}
        height={200}
        className="block h-8 w-auto sm:h-9"
        decoding="async"
        fetchPriority="high"
      />
    </Link>
  );
}
