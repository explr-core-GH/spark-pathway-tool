import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set a new password — EXPLR" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The email link drops a recovery session into the URL; the client picks it
  // up and fires PASSWORD_RECOVERY (or already has a session).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    await supabase.auth.signOut();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link to="/" className="eyebrow mb-12 inline-block">← EXPLR</Link>
      <h1 className="text-3xl font-light">Set a new password</h1>

      {done ? (
        <div className="mt-4 text-sm text-charcoal-600">
          <p>Your password has been updated. Sign in with it now.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/sign-in" className="btn-ink">Student sign in</Link>
            <Link to="/educator/sign-in" className="btn-ghost">Educator sign in</Link>
            <Link to="/org/sign-in" className="btn-ghost">Organization sign in</Link>
          </div>
        </div>
      ) : (
        <>
          {!ready && (
            <p className="mt-2 text-sm text-amber-700">
              Open this page from the reset link in your email. If you got here another way, request
              a new link from{" "}
              <Link to="/forgot-password" className="ink-link">Forgot password</Link>.
            </p>
          )}
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label className="label" htmlFor="rp-password">New password</label>
              <div className="relative">
                <input
                  id="rp-password"
                  className="field pr-16"
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
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
              <p className="mt-1 text-[11px] text-charcoal-400">At least 8 characters.</p>
            </div>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <button type="submit" disabled={loading || password.length < 8} className="btn-ink w-full justify-center">
              {loading ? "Saving…" : "Update password"}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
