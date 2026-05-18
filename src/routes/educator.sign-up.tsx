import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/educator/sign-up")({
  head: () => ({ meta: [{ title: "Educator sign up — EXPLR" }] }),
  component: EducatorSignUp,
});

function EducatorSignUp() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Sign up + ensure we have an authenticated session before the educators insert
    // (RLS: educators self insert requires auth.uid() = id).
    const { data, error: suErr } = await supabase.auth.signUp({
      email, password, options: { emailRedirectTo: window.location.origin },
    });
    if (suErr) { setError(suErr.message); setLoading(false); return; }
    let session = data.session;
    if (!session) {
      const { data: signIn, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
      if (siErr) { setError(siErr.message); setLoading(false); return; }
      session = signIn.session;
    }
    const uid = data.user?.id ?? session?.user.id;
    if (!uid || !session) { setError("Could not create account."); setLoading(false); return; }

    // If an unaccepted invite exists for this email, auto-approve and apply its program_type/org.
    const { data: invite } = await supabase
      .from("educator_invites")
      .select("id, program_type, organization")
      .eq("email", email)
      .is("accepted_at", null)
      .maybeSingle();

    const { error: eErr } = await supabase.from("educators").insert({
      id: uid,
      full_name: fullName,
      email,
      organization: invite?.organization ?? (organization || null),
      program_type: invite?.program_type ?? null,
      approved: !!invite,
    });

    if (eErr) { setError(eErr.message); setLoading(false); return; }

    if (invite) {
      await supabase.from("educator_invites")
        .update({ accepted_at: new Date().toISOString(), accepted_by: uid })
        .eq("id", invite.id);
    }

    setLoading(false);
    navigate({ to: "/educator/dashboard" });
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <p className="eyebrow">Educator</p>
      <h1 className="mt-3 text-3xl font-light">Request access</h1>
      <p className="mt-3 text-sm text-charcoal-500">
        New accounts are reviewed by an EXPLR admin before activation. An admin will assign your program type
        (STEM/CS, FLL/FTC/FRC, EXPLR camp, or internship). If you received an invite link, use that instead — it
        activates instantly.
      </p>
      <form onSubmit={submit} className="mt-10 space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label">Full name</label>
            <input className="field" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">Organization</label>
            <input className="field" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="School or program (optional)" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Passphrase</label>
            <input className="field" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={loading} className="btn-ink">{loading ? "Submitting…" : "Request access"}</button>
      </form>
      <p className="mt-6 text-sm text-charcoal-500">
        Have an account? <Link to="/educator/sign-in" className="ink-link">Sign in</Link>
      </p>
    </main>
  );
}
