import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/passport/AuthShell";

export const Route = createFileRoute("/sign-up")({
  head: () => ({ meta: [{ title: "Sign up — EXPLR" }] }),
  component: SignUp,
});

function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [grade, setGrade] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      const { error: studErr } = await supabase
        .from("students")
        .insert({ id: data.user.id, first_name: firstName, grade });
      if (studErr) {
        setError(studErr.message);
        setLoading(false);
        return;
      }
    }
    setLoading(false);
    navigate({ to: "/" });
  }

  return (
    <AuthShell
      eyebrow="Students"
      title="Create your account"
      intro="For students in grades 5-12. Start your passport, take the interest assessment, and add experiences as you go."
      illustration={{ src: "/passport/students.webp" }}
      role="Student"
      links={[
        { label: "Home", to: "/" },
        { label: "Grades 4-8", to: "/explore", secondary: true },
      ]}
      footer={
        <p>
          Already have one?{" "}
          <Link to="/sign-in" className="ink-link">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div>
            <label className="label" htmlFor="su-first">
              First name
            </label>
            <input
              id="su-first"
              className="field"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="su-grade">
              Grade this fall
            </label>
            <select
              id="su-grade"
              aria-describedby="su-grade-hint"
              className="field"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
            >
              {[5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p id="su-grade-hint" className="-mt-2 text-xs text-ink-500">
          Pick the grade you&apos;re <strong>entering this fall</strong> (after summer break).
        </p>
        <div>
          <label className="label" htmlFor="su-email">
            Email
          </label>
          <input
            id="su-email"
            className="field"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="su-password">
            Password
          </label>
          <div className="relative">
            <input
              id="su-password"
              className="field pr-16"
              type={showPw ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              aria-describedby="su-password-hint"
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
          <p id="su-password-hint" className="mt-1.5 text-xs text-ink-500">
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
        <button type="submit" disabled={loading} className="btn-ink w-full justify-center">
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
