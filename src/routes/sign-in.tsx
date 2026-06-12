import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sign-in")({
  head: () => ({ meta: [{ title: "Sign in — EXPLR" }] }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: fullEmail,
      password,
    });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    // A student who has already taken (or started) the assessment goes
    // straight to their dashboard. A brand-new student lands on the
    // assessment intro so the first thing they do is take it.
    const uid = data.user?.id;
    let hasSession = false;
    if (uid) {
      const { data: sess } = await supabase
        .from("assessment_sessions")
        .select("session_id")
        .eq("student_id", uid)
        .limit(1)
        .maybeSingle();
      hasSession = !!sess;
    }
    setLoading(false);
    navigate({ to: hasSession ? "/student" : "/assessment" });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link to="/" className="eyebrow mb-12 inline-block">← EXPLR</Link>
      <h1 className="text-3xl font-light">Sign in</h1>
      <p className="mt-2 text-sm text-charcoal-500">Student account.</p>
      <form onSubmit={submit} className="mt-10 space-y-5">
        <div>
          <label className="label" htmlFor="signin-username">Username or email</label>
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
          <p className="mt-1 text-[11px] text-charcoal-400">
            Camp kids: type the short username from your card.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="signin-password">Password</label>
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
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-charcoal-500 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-charcoal-400">
            Tap &ldquo;Show&rdquo; to check the password if sign-in isn&apos;t working.
          </p>
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <button type="submit" disabled={loading} className="btn-ink w-full justify-center">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-charcoal-500">
        New here? <Link to="/sign-up" className="ink-link">Create an account</Link>
      </p>
    </main>
  );
}
