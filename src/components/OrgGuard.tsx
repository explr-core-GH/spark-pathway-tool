import { Link } from "@tanstack/react-router";
import { Building2, Lock, type LucideIcon } from "lucide-react";
import { useOrg, type OrgRow } from "@/lib/auth";
import { PortalHeader } from "@/components/passport/PortalHeader";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * OrgGuard — gates the organization portal. Renders its children (a function
 * receiving the resolved org row) only for a signed-in user that has an
 * organizations row. Otherwise points them at sign-in / registration.
 */
export function OrgGuard({ children }: { children: (org: OrgRow) => React.ReactNode }) {
  const { user, org, loading } = useOrg();

  if (loading) {
    return (
      <Frame>
        <p className="py-14 text-center text-sm text-ink-500">Loading…</p>
      </Frame>
    );
  }

  if (!user) {
    return (
      <Mismatch
        icon={Lock}
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
        icon={Building2}
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

/** Full-page passport frame for the signed-out / unfinished states (the org routes have no layout route). */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink-900">
      <PortalHeader
        role="Partner"
        links={[
          { label: "Home", to: "/" },
          { label: "About", to: "/about", secondary: true },
        ]}
      />
      <main className="mx-auto w-full max-w-[1312px] flex-1 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        {children}
      </main>
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
