import { Link, useLocation } from "@tanstack/react-router";
import {
  Building2,
  Clock,
  GraduationCap,
  House,
  Lock,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { useAccountKinds, useEducator } from "@/lib/auth";
import { resolveRole, type RequiredRole } from "@/lib/role-resolution";
import { PortalHeader } from "@/components/passport/PortalHeader";
import { SiteFooter } from "@/components/SiteFooter";

type Role = RequiredRole;

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
  const { user, educator, isAdmin, loading: roleLoading } = useEducator();
  const kinds = useAccountKinds();
  const loading = roleLoading || kinds.loading;

  if (loading) {
    return (
      <Frame>
        <p role="status" className="py-14 text-center text-sm text-ink-500">
          Loading…
        </p>
      </Frame>
    );
  }

  const outcome = resolveRole(requires, {
    signedIn: !!user,
    isAdmin,
    educator: educator ? { approved: educator.approved } : null,
    isStudent: kinds.isStudent,
    isGuardian: kinds.isGuardian,
    isOrg: kinds.isOrg,
  });

  if (!user && requires === "guardian") {
    return (
      <Mismatch
        icon={Lock}
        eyebrow="Families"
        title="Sign in to your family account"
        body="Sign in to see the children linked to your account."
        primary={{ to: "/family/sign-in", label: "Family sign in" }}
        secondary={{ to: "/family/sign-up", label: "Create a family account" }}
      />
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
  if (outcome === "guardian-on-student") {
    return (
      <Mismatch
        icon={House}
        eyebrow="Families"
        title="This area is for students"
        body="You're signed in with a family account. Your children's passports are on your family home page."
        primary={{ to: "/family/home", label: "Go to family home" }}
        secondary={{ to: "/", label: "Back to home" }}
      />
    );
  }
  if (outcome === "org-on-student") {
    return (
      <Mismatch
        icon={Building2}
        eyebrow="Partners"
        title="This area is for students"
        body="You're signed in with a partner account. Head to your partner dashboard to manage your opportunities."
        primary={{ to: "/org", label: "Go to partner dashboard" }}
        secondary={{ to: "/", label: "Back to home" }}
      />
    );
  }
  if (outcome === "not-guardian") {
    return (
      <Mismatch
        icon={House}
        eyebrow="Families"
        title="This area is for families"
        body="Your account isn't a family account. Families can create one with their own email, then add each child with the child's family code."
        primary={{ to: "/", label: "Back to home" }}
        secondary={{ to: "/family", label: "Family options" }}
      />
    );
  }

  if (outcome === "educator-on-student") {
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
  if (outcome === "not-educator") {
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
  if (outcome === "pending-educator") {
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
  if (outcome === "not-admin") {
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

  if (outcome !== "allow") return null;
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
