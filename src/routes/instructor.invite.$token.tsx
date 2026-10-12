import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { acceptInvite, getInviteByToken } from "@/lib/invites.functions";

export const Route = createFileRoute("/instructor/invite/$token")({
  head: () => ({ meta: [{ title: "Activate instructor account — EXPLR" }] }),
  component: InviteAccept,
});

type Invite = {
  id: string;
  email: string;
  program_type: string | null;
  organization: string | null;
  role: "educator" | "admin";
  expires_at: string;
  accepted_at: string | null;
};

/**
 * Renders inside the /instructor layout (instructor.tsx), which already
 * provides the PortalHeader and SiteFooter, so this page only lays out the
 * AuthShell-style two-column body: intro + illustration beside the card.
 */
function InviteAccept() {
  const { token } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getInviteByToken({ data: { token } })
      .then((data) => setInvite(data as Invite))
      .catch((e: Error) => setError(e.message));
  }, [token]);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setBusy(true);
    setError(null);
    if (!user) {
      // Create the auth account first; the invite is accepted server-side below.
      const { data, error: sErr } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (sErr) {
        setError(sErr.message);
        setBusy(false);
        return;
      }
      if (!data.session) {
        const { error: siErr } = await supabase.auth.signInWithPassword({
          email: invite.email,
          password,
        });
        if (siErr) {
          setError(siErr.message);
          setBusy(false);
          return;
        }
      }
    }
    try {
      await acceptInvite({ data: { token, fullName } });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
      return;
    }

    setBusy(false);
    // Admins land on admin tools; instructors land on their dashboard.
    navigate({
      to: invite.role === "admin" ? "/instructor/admin" : "/instructor/dashboard",
    });
  }

  const isAdmin = invite?.role === "admin";
  const eyebrow = isAdmin ? "Admin" : "Instructors";

  let card: React.ReactNode;
  if (error && !invite) {
    card = (
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-bold">This invite didn&apos;t work.</h2>
        <p className="rounded-[var(--radius-control)] bg-gold-tint px-3 py-2 text-sm text-ink-900">
          {error}
        </p>
        <p className="text-sm text-ink-500">
          Ask the admin who invited you for a fresh link, or{" "}
          <Link to="/instructor/sign-in" className="ink-link">
            sign in
          </Link>{" "}
          if you already have an account.
        </p>
      </div>
    );
  } else if (!invite) {
    card = (
      <p className="text-sm text-ink-500" aria-live="polite">
        Loading invite…
      </p>
    );
  } else if (invite.accepted_at) {
    card = (
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-bold">This invite has already been used.</h2>
        <p className="text-sm text-ink-700">
          Your account is active. Sign in with the email the invite was sent to.
        </p>
        <Link to="/instructor/sign-in" className="btn-ink justify-center">
          Sign in
        </Link>
      </div>
    );
  } else {
    card = (
      <form onSubmit={accept} className="space-y-5">
        <div>
          <label className="label" htmlFor="inv-fullname">
            Full name
          </label>
          <input
            id="inv-fullname"
            className="field"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        {!user && (
          <div>
            <label className="label" htmlFor="inv-password">
              Choose a passphrase
            </label>
            <input
              id="inv-password"
              className="field"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-ink-500">At least 8 characters.</p>
          </div>
        )}
        {error && (
          <p
            className="rounded-[var(--radius-control)] bg-gold-tint px-3 py-2 text-sm text-ink-900"
            role="alert"
          >
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn-ink w-full justify-center">
          {busy ? "Activating…" : "Activate"}
        </button>
      </form>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1312px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-16">
        <section className="order-2 lg:order-1">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display mt-3">Activate your account</h1>
          <p className="lead mt-4 max-w-xl">
            {invite
              ? `This invitation is for ${invite.email}${isAdmin ? " and carries admin access" : ""}. Set your name${user ? "" : " and a passphrase"} and you're in.`
              : "Your invite link activates instantly, no admin review needed."}
          </p>
          <img
            src="/passport/assessments.webp"
            alt=""
            className="mt-8 hidden w-full max-w-md lg:block"
            loading="lazy"
          />
        </section>
        <section className="order-1 lg:order-2">
          <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 shadow-[0_1px_0_rgba(25,32,31,0.04)] sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-[14px] border border-mint-soft bg-mint-tint text-green-deep">
                <KeyRound className="h-6 w-6" strokeWidth={2} aria-hidden />
              </span>
              <span className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-green">
                {isAdmin ? "Admin invitation" : "Instructor invitation"}
              </span>
            </div>
            {card}
          </div>
          {invite && !invite.accepted_at && (
            <p className="mt-6 text-sm text-ink-500">
              For {invite.email}
              {isAdmin ? " · Admin" : ""}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
