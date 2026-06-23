import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/org/sign-in")({
  head: () => ({ meta: [{ title: "Organization sign in — EXPLR" }] }),
  component: OrgSignIn,
});

function OrgSignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (siErr) {
      setError(siErr.message);
      return;
    }
    navigate({ to: "/org" });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link to="/" className="eyebrow mb-12 inline-block">
        ← EXPLR
      </Link>
      <h1 className="text-3xl font-light">Organization sign in</h1>
      <form onSubmit={submit} className="mt-10 space-y-5">
        <div>
          <label className="label" htmlFor="org-email">Email</label>
          <input id="org-email" className="field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="org-password">Passphrase</label>
          <div className="relative">
            <input
              id="org-password"
              className="field pr-16"
              type={show ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute inset-y-0 right-2 my-auto text-xs text-charcoal-500 hover:text-ink"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <button type="submit" disabled={loading} className="btn-ink w-full justify-center">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-charcoal-500">
        New partner? <Link to="/org/sign-up" className="ink-link">Register your organization</Link>
        <span className="mx-2 text-charcoal-300">·</span>
        <Link to="/forgot-password" className="ink-link">Forgot password?</Link>
      </p>
    </main>
  );
}
