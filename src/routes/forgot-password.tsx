import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset your password — EXPLR" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link to="/" className="eyebrow mb-12 inline-block">← EXPLR</Link>
      <h1 className="text-3xl font-light">Reset your password</h1>
      {sent ? (
        <div className="mt-4 text-sm text-charcoal-600">
          <p>
            If an account exists for <span className="font-medium">{email.trim()}</span>, we&apos;ve
            sent a reset link. Open it on this device and you&apos;ll be able to set a new password.
          </p>
          <p className="mt-4">
            <Link to="/sign-in" className="ink-link">Back to sign in</Link>
          </p>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-charcoal-500">
            Works for students, educators, organizations, and admins. Enter the email on your
            account and we&apos;ll send a link to set a new password.
          </p>
          <form onSubmit={submit} className="mt-10 space-y-5">
            <div>
              <label className="label" htmlFor="fp-email">Email</label>
              <input
                id="fp-email"
                className="field"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <button type="submit" disabled={loading} className="btn-ink w-full justify-center">
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
          <p className="mt-6 text-xs text-charcoal-400">
            Camp students sign in with a printed username and have no email — ask your educator or
            an EXPLR admin to reset it for you.
          </p>
          <p className="mt-4 text-sm text-charcoal-500">
            Remembered it? <Link to="/sign-in" className="ink-link">Sign in</Link>
          </p>
        </>
      )}
    </main>
  );
}
