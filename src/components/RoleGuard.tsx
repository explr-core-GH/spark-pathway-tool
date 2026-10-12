import { Link, useLocation } from "@tanstack/react-router";
import { Clock, GraduationCap, Lock, ShieldCheck, UserCheck, type LucideIcon } from "lucide-react";
import { useEducator } from "@/lib/auth";
import { PortalHeader } from "@/components/passport/PortalHeader";
import { SiteFooter } from "@/components/SiteFooter";

type Role = "student" | "educator" | "admin";

type Props = {
  requires: Role;
  children: React.ReactNode;
};

/**
 * Friendly role guard. Renders children only when the signed-in user matches
 * the required role. Otherwise shows a small explainer with a link back to
 * the appropriate dashboard / sign-in page for their actual role.
 *
 * Role resolution (post admins-split):
 *  - admin    → row in public.admins (independent of educators)
 *  - educator → row in public.educators
 *  - student  → signed-in user that is NEITHER an admin nor an educator
 *               (admins are allowed through so they can preview)
 */
export function RoleGuard({ requires, children }: Props) {
  const { user, educator, isAdmin, loading } = useEducator();

  if (loading) {
    return (
      <Frame>
        <p role="status" className="py-14 text-center text-sm text-ink-500">
          Loading…
        </p>
      </Frame>
    );
  }

  // Not signed in at all
  if (!user) {
    return (
      <Mismatch
        icon={Lock}
        eyebrow={requires === "student" ? "Students" : "Instructors"}
        title={requires === "student" ? "Sign in to take the assessment" : "Sign in required"}
        body={
          requires === "student"
            ? "You need a student account to take the assessment and apply for internships."
            : "You need an approved instructor account to view this area."
        }
        primary={
          requires === "student"
            ? { to: "/sign-in", label: "Student sign in" }
            : { to: "/instructor/sign-in", label: "Instructor sign in" }
        }
        secondary={
          requires === "student"
            ? { to: "/sign-up", label: "Create student account" }
            : { to: "/instructor/sign-up", label: "Request access" }
        }
      />
    );
  }

  const isEducator = !!educator;
  // An instructor is approved once an admin sets approved=true. Program-type
  // tagging (STEM / FTC / etc.) was removed — we no longer require it.
  const isApprovedEducator = !!educator && educator.approved;

  // Student-only pages — admins allowed (view-as-student); plain instructors not.
  if (requires === "student" && isEducator && !isAdmin) {
    return (
      <Mismatch
        icon={UserCheck}
        eyebrow="Instructors"
        title="This area is for students"
        body="Your account is registered as an instructor. Head to your instructor dashboard for rosters, checkpoints, and experiences to review."
        primary={{ to: "/instructor/dashboard", label: "Go to instructor dashboard" }}
        secondary={{ to: "/", label: "Back to home" }}
      />
    );
  }

  // Instructor pages — admins are allowed through for preview; otherwise
  // require an approved educator row.
  if (requires === "educator" && !isEducator && !isAdmin) {
    return (
      <Mismatch
        icon={GraduationCap}
        eyebrow="Students"
        title="This area is for instructors"
        body="Your account isn't registered as an instructor. Request instructor access, or head back to your student experience."
        primary={{ to: "/assessment", label: "Back to assessment" }}
        secondary={{ to: "/instructor/sign-up", label: "Request instructor access" }}
      />
    );
  }
  if (requires === "educator" && !isAdmin && !isApprovedEducator) {
    return (
      <Mismatch
        icon={Clock}
        eyebrow="Pending approval"
        title="Awaiting admin approval"
        body={`Thanks, ${educator!.full_name.split(" ")[0]}. An EXPLR admin will review your request and assign your program type.`}
        primary={{ to: "/", label: "Back to home" }}
      />
    );
  }

  // Admin pages
  if (requires === "admin" && !isAdmin) {
    return (
      <Mismatch
        icon={ShieldCheck}
        eyebrow="Admin"
        title="You don't have admin access"
        body="This area is reserved for EXPLR admins."
        primary={
          isApprovedEducator
            ? { to: "/instructor/dashboard", label: "Back to instructor dashboard" }
            : { to: "/", label: "Back to home" }
        }
      />
    );
  }

  return <>{children}</>;
}

/**
 * Pages under /instructor already sit inside the instructor layout (header +
 * footer), so the guard only adds the passport chrome everywhere else
 * (student, assessment, survey routes have no layout route of their own).
 */
function Frame({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const inLayout = pathname.startsWith("/instructor");
  const main = (
    <main className="mx-auto w-full max-w-[1312px] flex-1 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      {children}
    </main>
  );
  if (inLayout) return main;
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink-900">
      <PortalHeader links={[{ label: "Home", to: "/" }]} />
      {main}
      <SiteFooter className="mt-10" />
    </div>
  );
}

type LinkOpt = { to: string; label: string };

function Mismatch({
  icon: Icon,
  eyebrow,
  title,
  body,
  primary,
  secondary,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  primary: LinkOpt;
  secondary?: LinkOpt;
}) {
  return (
    <Frame>
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-8 text-center shadow-card">
        <span className="grid h-12 w-12 place-items-center rounded-[14px] border border-mint-soft bg-mint-tint text-green-deep">
          <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
        </span>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-ink-700">{body}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link to={primary.to as never} className="btn-ink">
            {primary.label}
          </Link>
          {secondary && (
            <Link to={secondary.to as never} className="btn-ghost">
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </Frame>
  );
}
