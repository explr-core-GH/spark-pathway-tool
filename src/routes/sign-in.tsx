import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/passport/AuthShell";

export const Route = createFileRoute("/sign-in")({
  head: () => ({ meta: [{ title: "Sign in — EXPLR" }] }),
  // The home page's student card branches by grade band. Until the 4-8
  // picture/QR sign-in ships, the band only changes the copy below.
  validateSearch: (search: Record<string, unknown>): { band?: "4-8" | "9-12" } =>
    search.band === "4-8" || search.band === "9-12" ? { band: search.band } : {},
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const { band } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // Camp-generated student accounts use short usernames (e.g. "maya42")
    // rather than full email addresses. If the input has no "@", treat it
    // as a camp username and append the camp domain before authenticating.
    const v = email.trim();
    const fullEmail = v.includes("@") ? v : `${v}@camp.explr.local`;
    const { error } = await supabase.auth.signInWithPassword({
      email: fullEmail,
      password,
    });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    // Always land on the dashboard. Returning students see their results;
    // new students get a clear "Take the assessment" prompt there (and any
    // assigned assessment shows at the top) — nobody is force-redirected into
    // the RIASEC assessment.
    setLoading(false);
    navigate({ to: "/student" });
  }

  const eyebrow =
    band === "4-8"
      ? "Students · grades 4-8"
      : band === "9-12"
        ? "Students · grades 9-12"
        : "Students";
  const intro =
    band === "4-8"
      ? "You don't need a password. Enter your class code, tap your picture, then tap your three secret shapes."
      : band === "9-12"
        ? "Sign in with your email, or the username from your roster, to open your passport."
        : "Open your passport: experiences, stamps, assessments, and a resume that builds itself.";
  const illustration =
    band === "4-8"
      ? "/passport/grades-4-8.webp"
      : band === "9-12"
        ? "/passport/grades-9-12.webp"
        : "/passport/students.webp";

  return (
    <AuthShell
      eyebrow={eyebrow}
      title="Sign in"
      intro={intro}
      illustration={{ src: illustration }}
      role="Student"
      links={[
        { label: "Home", to: "/" },
        { label: "Instructors", to: "/instructor/sign-in", secondary: true },
      ]}
      explore={band === "4-8"}
      footer={
        <p>
          New here?{" "}
          <Link to="/sign-up" className="ink-link">
            Create an account
          </Link>
          <span className="mx-2 text-ink-500">·</span>
          <Link to="/forgot-password" className="ink-link">
            Forgot password?
          </Link>
        </p>
      }
    >
      {band === "4-8" && (
        <div className="mb-6 flex flex-col gap-3 rounded-[var(--radius-card)] border border-mint-soft bg-mint-tint p-4">
          <p className="text-sm text-ink-700">
            Grades 4-8 sign in with pictures and shapes, not a password.
          </p>
          <Link to="/explore" className="btn-mint justify-center">
            Go to picture sign-in
          </Link>
        </div>
      )}
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label" htmlFor="signin-username">
            Username or email
          </label>
          <input
            id="signin-username"
            className="field"
            type="text"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. maya42"
          />
          <p className="mt-1.5 text-xs text-ink-500">
            Camp kids: type the short username from your card.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="signin-password">
            Password
          </label>
          <div className="relative">
            <input
              id="signin-password"
              className="field pr-16"
              type={showPw ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-pressed={showPw}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 inline-flex min-h-[44px] -translate-y-1/2 items-center rounded-[var(--radius-control)] px-3 text-xs font-semibold text-ink-500 hover:text-ink-900"
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-ink-500">
            Tap &ldquo;Show&rdquo; to check the password if sign-in isn&apos;t working.
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
        <button type="submit" disabled={loading} className="btn-ink w-full justify-center">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
