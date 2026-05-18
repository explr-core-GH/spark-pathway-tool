import { Link } from "@tanstack/react-router";
import { useEducator } from "@/lib/auth";

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
      <main className="mx-auto max-w-md px-6 py-24 text-sm text-charcoal-400">
        Loading…
      </main>
    );
  }

  // Not signed in at all
  if (!user) {
    return (
      <Mismatch
        eyebrow="Sign in required"
        title={
          requires === "student"
            ? "Sign in to take the assessment"
            : "Sign in required"
        }
        body={
          requires === "student"
            ? "You need a student account to take the assessment and apply for internships."
            : "You need an approved educator account to view this area."
        }
        primary={
          requires === "student"
            ? { to: "/sign-in", label: "Student sign in" }
            : { to: "/educator/sign-in", label: "Educator sign in" }
        }
        secondary={
          requires === "student"
            ? { to: "/sign-up", label: "Create student account" }
            : { to: "/educator/sign-up", label: "Request access" }
        }
      />
    );
  }

  const isEducator = !!educator;
  // An approved educator has both program_type and approved=true. Admins
  // are NOT auto-approved as educators — they're admins, separately.
  const isApprovedEducator =
    !!educator && educator.approved && !!educator.program_type;

  // Student-only pages — admins allowed (view-as-student); plain educators not.
  if (requires === "student" && isEducator && !isAdmin) {
    return (
      <Mismatch
        eyebrow="Educator account"
        title="This area is for students"
        body="Your account is registered as an educator. Head to your educator dashboard for curriculum, internships, and rosters."
        primary={{ to: "/educator/dashboard", label: "Go to educator dashboard" }}
        secondary={{ to: "/", label: "Back to home" }}
      />
    );
  }

  // Educator pages — admins are allowed through for preview; otherwise
  // require an approved educator row.
  if (requires === "educator" && !isEducator && !isAdmin) {
    return (
      <Mismatch
        eyebrow="Student account"
        title="This area is for educators"
        body="Your account isn't registered as an educator. Request educator access, or head back to your student experience."
        primary={{ to: "/assessment", label: "Back to assessment" }}
        secondary={{ to: "/educator/sign-up", label: "Request educator access" }}
      />
    );
  }
  if (requires === "educator" && !isAdmin && !isApprovedEducator) {
    return (
      <Mismatch
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
        eyebrow="Admin only"
        title="You don't have admin access"
        body="This area is reserved for EXPLR admins."
        primary={
          isApprovedEducator
            ? { to: "/educator/dashboard", label: "Back to educator dashboard" }
            : { to: "/", label: "Back to home" }
        }
      />
    );
  }

  return <>{children}</>;
}

type LinkOpt = { to: string; label: string };

function Mismatch({
  eyebrow,
  title,
  body,
  primary,
  secondary,
}: {
  eyebrow: string;
  title: string;
  body: string;
  primary: LinkOpt;
  secondary?: LinkOpt;
}) {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3 text-2xl font-light">{title}</h1>
      <p className="mt-4 text-sm text-charcoal-500">{body}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to={primary.to as never} className="btn-ink">{primary.label}</Link>
        {secondary && (
          <Link to={secondary.to as never} className="btn-ghost">{secondary.label}</Link>
        )}
      </div>
    </main>
  );
}
