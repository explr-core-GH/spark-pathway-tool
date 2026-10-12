import { Link } from "@tanstack/react-router";
import { useOrg, type OrgRow } from "@/lib/auth";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * OrgGuard — gates the organization portal. Renders its children (a function
 * receiving the resolved org row) only for a signed-in user that has an
 * organizations row. Otherwise points them at sign-in / registration.
 */
export function OrgGuard({ children }: { children: (org: OrgRow) => React.ReactNode }) {
  const { user, org, loading } = useOrg();

  if (loading) {
    return <main className="mx-auto max-w-md px-6 py-24 text-sm text-charcoal-400">Loading…</main>;
  }

  if (!user) {
    return (
      <Mismatch
        eyebrow="Partners & organizations"
        title="Sign in to the partner portal"
        body="Manage the camps, workshops, internships, and ongoing opportunities your organization or company offers."
        primary={{ to: "/org/sign-in", label: "Partner sign in" }}
        secondary={{ to: "/org/sign-up", label: "Register as a partner" }}
      />
    );
  }

  if (!org) {
    return (
      <Mismatch
        eyebrow="Finish setup"
        title="This account isn't an organization yet"
        body="You're signed in, but there's no organization on file for this account. Register as a partner to start building opportunities."
        primary={{ to: "/org/sign-up", label: "Register as a partner" }}
        secondary={{ to: "/", label: "Back to home" }}
      />
    );
  }

  return (
    <>
      {children(org)}
      <SiteFooter />
    </>
  );
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
