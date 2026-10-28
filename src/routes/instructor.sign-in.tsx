import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MicrosoftSignIn, OrDivider } from "@/components/passport/MicrosoftSignIn";

export const Route = createFileRoute("/instructor/sign-in")({
  head: () => ({ meta: [{ title: "Instructor sign in — EXPLR" }] }),
  component: EducatorSignIn,
});

/**
 * Renders inside the /instructor layout (instructor.tsx), which already
 * provides the PortalHeader and SiteFooter, so this page only lays out the
 * AuthShell-style two-column body: intro + illustration beside the card.
 */
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
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authErr) {
      setError(authErr.message);
      setLoading(false);
      return;
    }
    // Instructors and admins live in separate tables (no overlap). Look up
    // public.admins for this user; if they're an admin, land in admin tools,
    // otherwise the instructor dashboard.
    const uid = auth.user?.id;
    if (uid) {
      const { data: adminRow } = await (supabase as any)
        .from("admins")
        .select("id")
        .eq("id", uid)
        .maybeSingle();
      setLoading(false);
      navigate({ to: adminRow ? "/instructor/admin" : "/instructor/dashboard" });
      return;
    }
    setLoading(false);
    navigate({ to: "/instructor/dashboard" });
  }

  return (
    <main className="mx-auto w-full max-w-[1312px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-16">
        <section className="order-2 lg:order-1">
          <p className="eyebrow">Instructors</p>
          <h1 className="display mt-3">Sign in</h1>
          <p className="lead mt-4 max-w-xl">
            Teachers, coaches, camp staff, and worksite supervisors. Your rosters, checkpoints, and
            experiences to stamp are one sign-in away.
          </p>
          <img
            src="/passport/assessments.webp"
            alt=""
            className="mt-8 hidden w-full max-w-md lg:block"
            loading="lazy"
          />
        </section>
        <section className="order-1 lg:order-2">
          <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 shadow-[0_1px_0_rgba(25,32,31,0.04)] sm:p-8">
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="label" htmlFor="edu-signin-email">
                  Email
                </label>
                <input
                  id="edu-signin-email"
                  className="field"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="edu-signin-password">
                  Passphrase
                </label>
                <input
                  id="edu-signin-password"
                  className="field"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
          <p className="mt-6 text-sm text-ink-500">
            No account?{" "}
            <Link to="/instructor/sign-up" className="ink-link">
              Request access
            </Link>
            <span className="mx-2 text-ink-500">·</span>
            <Link to="/forgot-password" className="ink-link">
              Forgot password?
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
