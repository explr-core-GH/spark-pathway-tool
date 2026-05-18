import { Link } from "@tanstack/react-router";
import { useEducator } from "@/lib/auth";

type Props = { children: React.ReactNode };

export function EducatorGate({ children }: Props) {
  const { user, educator, loading } = useEducator();

  if (loading) {
    return <main className="mx-auto max-w-md px-6 py-24 text-sm text-charcoal-400">Loading…</main>;
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
  if (!educator) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="eyebrow">Educator</p>
        <h1 className="mt-3 text-2xl font-light">Finish your sign-up</h1>
        <p className="mt-3 text-sm text-charcoal-500">
          No educator profile is linked to {user.email}.
        </p>
        <Link to="/educator/sign-up" className="btn-ink mt-6 inline-block">Complete sign-up</Link>
      </main>
    );
  }
  if (!educator.approved || !educator.program_type) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="eyebrow">Pending review</p>
        <h1 className="mt-3 text-2xl font-light">Awaiting admin approval</h1>
        <p className="mt-4 text-sm text-charcoal-500">
          Thanks, {educator.full_name.split(" ")[0]}. An EXPLR admin will review your request and assign your
          program type. You'll get access here once that's done.
        </p>
        <p className="mt-6 text-xs text-charcoal-400">Signed in as {educator.email}</p>
      </main>
    );
  }
  return <>{children}</>;
}
