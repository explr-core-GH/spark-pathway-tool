import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/educator/sign-in")({
  head: () => ({ meta: [{ title: "Educator sign in — EXPLR" }] }),
  component: EducatorSignIn,
});

function EducatorSignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authErr) {
      setError(authErr.message);
      setLoading(false);
      return;
    }
    // Educators and admins live in separate tables (no overlap). Look up
    // public.admins for this user; if they're an admin, land in admin tools,
    // otherwise the educator dashboard.
    const uid = auth.user?.id;
    if (uid) {
      const { data: adminRow } = await (supabase as any)
        .from("admins")
        .select("id")
        .eq("id", uid)
        .maybeSingle();
      setLoading(false);
      navigate({ to: adminRow ? "/educator/admin" : "/educator/dashboard" });
      return;
    }
    setLoading(false);
    navigate({ to: "/educator/dashboard" });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link to="/" className="eyebrow mb-12 inline-block">← EXPLR</Link>
      <h1 className="text-3xl font-light">Sign in</h1>
      <p className="mt-2 text-sm text-charcoal-500">Educator account.</p>
      <form onSubmit={submit} className="mt-10 space-y-5">
        <div>
          <label className="label">Email</label>
          <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Passphrase</label>
          <input className="field" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={loading} className="btn-ink w-full justify-center">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-charcoal-500">
        No account? <Link to="/educator/sign-up" className="ink-link">Request access</Link>
      </p>
    </div>
  );
}
