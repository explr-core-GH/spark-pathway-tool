import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/passport/AuthShell";

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
    <AuthShell
      eyebrow="Account help"
      title="Reset your password"
      intro="Works for students, instructors, partners, and admins. Enter the email on your account and we'll send a link to set a new password."
      illustration={{ src: "/passport/portfolio.webp" }}
      links={[
        { label: "Home", to: "/" },
        { label: "Sign in", to: "/sign-in", secondary: true },
      ]}
      footer={
        sent ? undefined : (
          <>
            <p>
              Camp students sign in with a printed username and have no email. Ask your instructor
              or an EXPLR admin to reset it for you.
            </p>
            <p className="mt-3">
              Remembered it?{" "}
              <Link to="/sign-in" className="ink-link">
                Sign in
              </Link>
            </p>
          </>
        )
      }
    >
      {sent ? (
        <div className="flex flex-col gap-4 text-ink-700" role="status">
          <span className="grid h-12 w-12 place-items-center rounded-[14px] border border-mint-soft bg-mint-tint text-green-deep">
            <MailCheck className="h-6 w-6" strokeWidth={2} aria-hidden />
          </span>
          <h2 className="font-display text-2xl font-bold text-ink-900">Check your email</h2>
          <p>
            If an account exists for{" "}
            <span className="font-medium text-ink-900">{email.trim()}</span>, we&apos;ve sent a
            reset link. Open it on this device and you&apos;ll be able to set a new password.
          </p>
          <p>
            <Link to="/sign-in" className="ink-link">
              Back to sign in
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="label" htmlFor="fp-email">
              Email
            </label>
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
          {error && (
            <p
              className="rounded-[var(--radius-control)] bg-gold-tint px-3 py-2 text-sm text-ink-900"
              role="alert"
            >
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-ink w-full justify-center">
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
