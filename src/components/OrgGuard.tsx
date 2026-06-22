import { Link } from "@tanstack/react-router";
import { useOrg, type OrgRow } from "@/lib/auth";

/**
 * OrgGuard — gates the organization portal. Renders its children (a function
 * receiving the resolved org row) only for a signed-in user that has an
 * organizations row. Otherwise points them at sign-in / registration.
 */
export function OrgGuard({ children }: { children: (org: OrgRow) => React.ReactNode }) {
  const { user, org, loading } = useOrg();

  if (loading) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-sm text-charcoal-400">Loading…</main>
    );
  }

  if (!user) {
    return (
      <Mismatch
        eyebrow="Organizations"
        title="Sign in to your organization"
        body="Manage the camps, workshops, internships, and ongoing opportunities your organization offers."
        primary={{ to: "/org/sign-in", label: "Organization sign in" }}
        secondary={{ to: "/org/sign-up", label: "Register your organization" }}
      />
    );
  }

  if (!org) {
    return (
      <Mismatch
        eyebrow="Finish setup"
        title="This account isn't an organization yet"
        body="You're signed in, but there's no organization on file for this account. Register your organization to start building opportunities."
        primary={{ to: "/org/sign-up", label: "Register your organization" }}
        secondary={{ to: "/", label: "Back to home" }}
      />
    );
  }

  return <>{children(org)}</>;
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
        <Link to={primary.to as never} className="btn-ink">
          {primary.label}
        </Link>
        {secondary && (
          <Link to={secondary.to as never} className="btn-ghost">
            {secondary.label}
          </Link>
        )}
      </div>
    </main>
  );
}
