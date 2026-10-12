import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

  if (error)
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center text-sm text-destructive">
        {error}
      </main>
    );
  if (!invite)
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center text-sm text-charcoal-400">
        Loading invite…
      </main>
    );
  if (invite.accepted_at)
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        This invite has already been used.{" "}
        <Link to="/instructor/sign-in" className="ink-link">
          Sign in
        </Link>
      </main>
    );

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <p className="eyebrow">
        {invite.role === "admin" ? "Admin invitation" : "Instructor invitation"}
      </p>
      <h1 className="mt-3 text-3xl font-light">Activate your account</h1>
      <p className="mt-3 text-sm text-charcoal-500">
        For {invite.email}
        {invite.role === "admin" ? " · Admin" : ""}
      </p>
      <form onSubmit={accept} className="mt-10 space-y-5">
        <div>
          <label className="label">Full name</label>
          <input
            className="field"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        {!user && (
          <div>
            <label className="label">Choose a passphrase</label>
            <input
              className="field"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
        <button type="submit" disabled={busy} className="btn-ink w-full justify-center">
          {busy ? "Activating…" : "Activate"}
        </button>
      </form>
    </main>
  );
}
