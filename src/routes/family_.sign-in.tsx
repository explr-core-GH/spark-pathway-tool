import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/passport/AuthShell";
import { MicrosoftSignIn, OrDivider } from "@/components/passport/MicrosoftSignIn";

export const Route = createFileRoute("/family_/sign-in")({
  head: () => ({
    meta: [
      { title: "Family sign in — EXPLR Pathways" },
      { name: "description", content: "Parents and guardians: sign in to your family account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FamilySignIn,
});

function FamilySignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFamily, setNotFamily] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
    if (siErr || !data.user) {
      setLoading(false);
      setError(siErr?.message ?? "Could not sign in.");
      return;
    }
    const { data: g } = await supabase
      .from("guardians")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();
    const meta = data.user.user_metadata as Record<string, unknown>;
    if (!g && meta.account === "guardian" && typeof meta.full_name === "string") {
      // Finish a sign-up that had to wait for email confirmation.
      const { error: gErr } = await supabase.from("guardians").insert({
        id: data.user.id,
        full_name: meta.full_name,
        email: data.user.email ?? email.trim(),
        phone: typeof meta.phone === "string" ? meta.phone : null,
      });
      setLoading(false);
      if (gErr) {
        setError(gErr.message);
        return;
      }
      navigate({ to: "/family/home" });
      return;
    }
    setLoading(false);
    if (!g) {
      setNotFamily(true);
      return;
    }
    navigate({ to: "/family/home" });
  }

  async function finishMicrosoft() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      setError("Could not confirm your Microsoft account. Please try again.");
      return;
    }
    const { data: g } = await supabase
      .from("guardians")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();
    if (g) {
      navigate({ to: "/family/home" });
      return;
    }
    // Finish a family sign-up that had to wait for email confirmation. The
    // Microsoft path normally has no pending sign-up; the metadata check
    // keeps behavior identical to the password flow above.
    const meta = data.user.user_metadata as Record<string, unknown>;
    if (meta.account === "guardian" && typeof meta.full_name === "string") {
      const { error: gErr } = await supabase.from("guardians").insert({
        id: data.user.id,
        full_name: meta.full_name,
        email: data.user.email ?? "",
        phone: typeof meta.phone === "string" ? meta.phone : null,
      });
      if (gErr) {
        setError(gErr.message);
        return;
      }
      navigate({ to: "/family/home" });
      return;
    }
    setNotFamily(true);
  }

  return (
    <AuthShell
      eyebrow="Families"
      title={notFamily ? "This area is for families" : "Family sign in"}
      intro={
        notFamily
          ? "You're signed in, but this account isn't a family account. Head to your own dashboard, or sign out and use your family account."
          : "Sign in to see every child linked to your account."
      }
      illustration={{ src: "/passport/families.webp" }}
      role="Family"
      links={[
        { label: "Home", to: "/" },
        { label: "Use a code instead", to: "/family", secondary: true },
      ]}
      footer={
        <p>
          New here?{" "}
          <Link to="/family/sign-up" className="ink-link">
            Create a family account
          </Link>
          <span className="mx-2 text-ink-500">·</span>
          <Link to="/forgot-password" className="ink-link">
            Forgot password?
          </Link>
        </p>
      }
    >
      {notFamily ? (
        <div className="flex flex-wrap gap-3">
          <Link to="/start" className="btn-ink">
            Go to my dashboard
          </Link>
          <Link to="/sign-out" className="btn-ghost">
            Sign out
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="label" htmlFor="fs-email">
              Email
            </label>
            <input
              id="fs-email"
              className="field"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="fs-password">
              Password
            </label>
            <div className="relative">
              <input
                id="fs-password"
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
                aria-label={show ? "Hide password" : "Show password"}
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
      )}
      {notFamily ? null : (
        <>
          <OrDivider />
          <MicrosoftSignIn onError={setError} onSignedIn={finishMicrosoft} />
        </>
      )}
    </AuthShell>
  );
}
