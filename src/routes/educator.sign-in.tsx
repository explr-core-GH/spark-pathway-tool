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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else navigate({ to: "/educator/dashboard" });
  }

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <p className="eyebrow">Educator</p>
      <h1 className="mt-3 text-3xl font-light">Sign in</h1>
      <form onSubmit={submit} className="mt-10 space-y-5">
        <div><label className="label">Email</label><input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label">Passphrase</label><input className="field" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={loading} className="btn-ink w-full justify-center">{loading ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="mt-6 text-sm text-charcoal-500">No account? <Link to="/educator/sign-up" className="ink-link">Sign up</Link></p>
    </main>
  );
}
