import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/accept/$token")({
  head: () => ({ meta: [{ title: "Accept admin invite — EXPLR" }] }),
  component: AdminAcceptInvite,
});

type Invite = {
  id: string;
  email: string;
  expires_at: string;
  accepted_at: string | null;
};

function AdminAcceptInvite() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("admin_invites")
      .select("id, email, expires_at, accepted_at")
      .eq("token", token)
      .maybeSingle()
      .then(({ data }) => {
        const inv = data as Invite | null;
        if (!inv) {
          setInviteError("Invite not found.");
        } else if (inv.accepted_at) {
          setInviteError("This invite has already been accepted. Sign in instead.");
        } else if (new Date(inv.expires_at) < new Date()) {
          setInviteError("This invite has expired. Ask the admin who sent it for a new one.");
        } else {
          setInvite(inv);
        }
        setLoadingInvite(false);
      });
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setError(null);
    setLoading(true);

    // Sign up + ensure session before the admins insert (RLS requires auth.uid() = id).
    const { data, error: suErr } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    let session = data.session;
    let uid = data.user?.id;
    if (suErr) {
      // User may already have an auth.users entry from a previous attempt —
      // try signing them in with the supplied passphrase.
      const { data: si, error: siErr } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });
      if (siErr) {
        setError(suErr.message);
        setLoading(false);
        return;
      }
      session = si.session;
      uid = si.user?.id;
    } else if (!session) {
      const { data: si, error: siErr } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });
      if (siErr) {
        setError(siErr.message);
        setLoading(false);
        return;
      }
      session = si.session;
      uid = si.user?.id ?? uid;
    }
    if (!uid || !session) {
      setError("Could not establish a session.");
      setLoading(false);
      return;
    }

    const { error: aErr } = await supabase.from("admins").insert({
      id: uid,
      full_name: fullName,
      email: invite.email,
    });
    if (aErr && !/duplicate key/i.test(aErr.message)) {
      setError(aErr.message);
      setLoading(false);
      return;
    }

    await supabase
      .from("admin_invites")
      .update({ accepted_at: new Date().toISOString(), accepted_by: uid })
      .eq("id", invite.id);

    setLoading(false);
    navigate({ to: "/educator/admin" });
  }

  if (loadingInvite) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-sm text-charcoal-400">
        Looking up your invite…
      </main>
    );
  }

  if (inviteError || !invite) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="eyebrow">Admin invite</p>
        <h1 className="mt-3 text-2xl font-light">Invite unavailable</h1>
        <p className="mt-4 text-sm text-charcoal-500">{inviteError}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/admin/sign-in" className="btn-ink">Admin sign in</Link>
          <Link to="/" className="btn-ghost">Back to home</Link>
        </div>
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link to="/" className="eyebrow mb-12 inline-block">← EXPLR</Link>
      <p className="eyebrow">Admin invite</p>
      <h1 className="mt-3 text-3xl font-light">Activate your admin account</h1>
      <p className="mt-2 text-sm text-charcoal-500">
        You&apos;re joining as an EXPLR admin —{" "}
        <span className="font-medium text-ink">{invite.email}</span>. Admins
        manage programs, invites, catalog tags, and curriculum.
      </p>
      <form onSubmit={submit} className="mt-10 space-y-5">
        <div>
          <label className="label">Full name</label>
          <input
            className="field"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Passphrase</label>
          <input
            className="field"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1 text-xs text-charcoal-400">At least 8 characters.</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={loading} className="btn-ink w-full justify-center">
          {loading ? "Activating…" : "Activate admin account"}
        </button>
      </form>
    </div>
  );
}
