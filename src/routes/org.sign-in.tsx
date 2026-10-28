import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/passport/AuthShell";
import { MicrosoftSignIn, OrDivider } from "@/components/passport/MicrosoftSignIn";

export const Route = createFileRoute("/org/sign-in")({
  head: () => ({ meta: [{ title: "Partner sign in — EXPLR" }] }),
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
    <AuthShell
      eyebrow="Partners & organizations"
      title="Partner sign in"
      intro="Employers, nonprofits, and programs that offer camps, workshops, internships, and events. Sign in to manage your opportunities and see who registered."
      illustration={{ src: "/passport/organizations.webp" }}
      role="Partner"
      links={[
        { label: "Home", to: "/" },
        { label: "About", to: "/about", secondary: true },
      ]}
      footer={
        <p>
          New partner?{" "}
          <Link to="/org/sign-up" className="ink-link">
            Register your organization or company
          </Link>
          <span className="mx-2 text-ink-500">·</span>
          <Link to="/forgot-password" className="ink-link">
            Forgot password?
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label" htmlFor="org-email">
            Email
          </label>
          <input
            id="org-email"
            className="field"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="org-password">
            Passphrase
          </label>
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
              aria-pressed={show}
              aria-label={show ? "Hide passphrase" : "Show passphrase"}
              className="absolute right-1 top-1/2 inline-flex min-h-[44px] -translate-y-1/2 items-center rounded-[var(--radius-control)] px-3 text-xs font-semibold text-ink-500 hover:text-ink-900"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
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
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <OrDivider />
      <MicrosoftSignIn onError={setError} onSignedIn={() => navigate({ to: "/org" })} />
    </AuthShell>
  );
}
