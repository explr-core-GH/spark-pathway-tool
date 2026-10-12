import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/passport/AuthShell";

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
    <AuthShell
      eyebrow="Account help"
      title="Set a new password"
      intro="Choose a new password for your EXPLR Pathways account. At least 8 characters."
      illustration={{ src: "/passport/portfolio.webp" }}
      links={[
        { label: "Home", to: "/" },
        { label: "Sign in", to: "/sign-in", secondary: true },
      ]}
    >
      {done ? (
        <div className="flex flex-col gap-4 text-ink-700" role="status">
          <span className="grid h-12 w-12 place-items-center rounded-[14px] border border-mint-soft bg-mint-tint text-green-deep">
            <BadgeCheck className="h-6 w-6" strokeWidth={2} aria-hidden />
          </span>
          <h2 className="font-display text-2xl font-bold text-ink-900">Password updated</h2>
          <p>Your password has been updated. Sign in with it now.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/sign-in" className="btn-ink">
              Student sign in
            </Link>
            <Link to="/instructor/sign-in" className="btn-ghost">
              Instructor sign in
            </Link>
            <Link to="/org/sign-in" className="btn-ghost">
              Partner sign in
            </Link>
          </div>
        </div>
      ) : (
        <>
          {!ready && (
            <p
              role="status"
              className="mb-5 rounded-[var(--radius-control)] bg-gold-tint px-3 py-2 text-sm text-ink-900"
            >
              Open this page from the reset link in your email. If you got here another way, request
              a new link from{" "}
              <Link to="/forgot-password" className="ink-link">
                Forgot password
              </Link>
              .
            </p>
          )}
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label" htmlFor="rp-password">
                New password
              </label>
              <div className="relative">
                <input
                  id="rp-password"
                  className="field pr-16"
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  aria-describedby="rp-password-hint"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-pressed={show}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 inline-flex min-h-[44px] -translate-y-1/2 items-center rounded-[var(--radius-control)] px-3 text-xs font-semibold text-ink-500 hover:text-ink-900"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
              <p id="rp-password-hint" className="mt-1.5 text-xs text-ink-500">
                At least 8 characters.
              </p>
            </div>
            {error && (
              <p
                className="rounded-[var(--radius-control)] bg-gold-tint px-3 py-2 text-sm text-ink-900"
                role="alert"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || password.length < 8}
              className="btn-ink w-full justify-center"
            >
              {loading ? "Saving…" : "Update password"}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
