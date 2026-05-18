import { Link } from "@tanstack/react-router";
import { useEducator } from "@/lib/auth";

type Props = { children: React.ReactNode };

/**
 * EducatorGate — guards educator surfaces. Admins are let through
 * because they have legitimate reasons to preview the educator UI even
 * though they don't carry an educators row themselves (post admins-split).
 *
 * The decision points:
 *   loading            → "Loading…"
 *   !user              → "Sign in required" (Request access)
 *   admin              → render children  (no educators row needed)
 *   !educator          → "Finish your sign-up"
 *   educator.approved  → render children
 *   !educator.approved → "Awaiting admin approval"
 *
 * We deliberately do NOT require educator.program_type anymore. Teacher
 * tagging by program type (STEM / FTC / etc.) was removed — an educator
 * is just an educator now.
 */
export function EducatorGate({ children }: Props) {
  const { user, educator, isAdmin, loading } = useEducator();

  if (loading) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-sm text-charcoal-400">
        Loading…
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="eyebrow">Educator</p>
        <h1 className="mt-3 text-2xl font-light">Sign in required</h1>
        <p className="mt-3 text-sm text-charcoal-500">
          You need an approved educator account to view this area.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/educator/sign-in" className="btn-ink">Sign in</Link>
          <Link to="/educator/sign-up" className="btn-ghost">Request access</Link>
        </div>
      </main>
    );
  }

  // Admins are signed in but won't have an educators row. Let them through
  // so they can preview / support the educator experience.
  if (isAdmin) return <>{children}</>;

  if (!educator) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="eyebrow">Educator</p>
        <h1 className="mt-3 text-2xl font-light">Finish your sign-up</h1>
        <p className="mt-3 text-sm text-charcoal-500">
          No educator profile is linked to {user.email}.
        </p>
        <Link to="/educator/sign-up" className="btn-ink mt-6 inline-block">
          Complete sign-up
        </Link>
      </main>
    );
  }

  if (!educator.approved) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="eyebrow">Pending review</p>
        <h1 className="mt-3 text-2xl font-light">Awaiting admin approval</h1>
        <p className="mt-4 text-sm text-charcoal-500">
          Thanks, {educator.full_name.split(" ")[0]}. An EXPLR admin will
          review your request and approve your account.
        </p>
        <p className="mt-6 text-xs text-charcoal-400">
          Signed in as {educator.email}
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
