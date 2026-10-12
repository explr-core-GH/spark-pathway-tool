import { Link } from "@tanstack/react-router";
import { Clock, Lock, UserCheck, type LucideIcon } from "lucide-react";
import { useEducator } from "@/lib/auth";

type Props = { children: React.ReactNode };

/**
 * EducatorGate — guards instructor surfaces. Admins are let through
 * because they have legitimate reasons to preview the instructor UI even
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
 * tagging by program type (STEM / FTC / etc.) was removed — an instructor
 * is just an instructor now.
 *
 * Every state renders inside the /instructor layout, which already provides
 * the PortalHeader and SiteFooter, so these screens are a single card.
 */
export function EducatorGate({ children }: Props) {
  const { user, educator, isAdmin, loading } = useEducator();

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1312px] px-4 py-24 text-center text-sm text-ink-500 sm:px-6 lg:px-8">
        Loading…
      </main>
    );
  }

  if (!user) {
    return (
      <Notice
        icon={Lock}
        eyebrow="Instructors"
        title="Sign in required"
        body="You need an approved instructor account to view this area."
      >
        <Link to="/instructor/sign-in" className="btn-ink">
          Sign in
        </Link>
        <Link to="/instructor/sign-up" className="btn-ghost">
          Request access
        </Link>
      </Notice>
    );
  }

  // Admins are signed in but won't have an educators row. Let them through
  // so they can preview / support the instructor experience.
  if (isAdmin) return <>{children}</>;

  if (!educator) {
    return (
      <Notice
        icon={UserCheck}
        eyebrow="Instructors"
        title="Finish your sign-up"
        body={`No instructor profile is linked to ${user.email}.`}
      >
        <Link to="/instructor/sign-up" className="btn-ink">
          Complete sign-up
        </Link>
      </Notice>
    );
  }

  if (!educator.approved) {
    return (
      <Notice
        icon={Clock}
        eyebrow="Pending review"
        title="Awaiting admin approval"
        body={`Thanks, ${educator.full_name.split(" ")[0]}. An EXPLR admin will review your request and approve your account.`}
        note={`Signed in as ${educator.email}`}
      />
    );
  }

  return <>{children}</>;
}

function Notice({
  icon: Icon,
  eyebrow,
  title,
  body,
  note,
  children,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  note?: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[1312px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-8 text-center shadow-card">
        <span className="grid h-12 w-12 place-items-center rounded-[14px] border border-mint-soft bg-mint-tint text-green-deep">
          <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
        </span>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-ink-700">{body}</p>
        {children && <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div>}
        {note && <p className="text-xs text-ink-500">{note}</p>}
      </div>
    </main>
  );
}
