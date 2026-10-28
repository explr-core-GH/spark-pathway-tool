import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/passport/AuthShell";

export const Route = createFileRoute("/family_/sign-up")({
  head: () => ({
    meta: [
      { title: "Create a family account — EXPLR Pathways" },
      {
        name: "description",
        content: "Parents and guardians: one account for all your children's EXPLR passports.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FamilySignUp,
});

function FamilySignUp() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    setLoading(true);
    const { data, error: suErr } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/family/home` },
    });
    if (suErr || !data.user) {
      setError(suErr?.message ?? "Could not create the account.");
      setLoading(false);
      return;
    }
    if (!data.session) {
      setLoading(false);
      setNotice("Check your email to confirm your account, then sign in to finish.");
      return;
    }
    const { error: gErr } = await supabase.from("guardians").insert({
      id: data.user.id,
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
    });
    setLoading(false);
    if (gErr) {
      setError(gErr.message);
      return;
    }
    navigate({ to: "/family/home" });
  }

  return (
    <AuthShell
      eyebrow="Families"
      title="Create a family account"
      intro="One account for all your children. After you sign up, add each child with the family code they make on their dashboard."
      illustration={{ src: "/passport/families.webp" }}
      role="Family"
      links={[
        { label: "Home", to: "/" },
        { label: "Use a code instead", to: "/family", secondary: true },
      ]}
      footer={
        <p>
          Already have one?{" "}
          <Link to="/family/sign-in" className="ink-link">
            Sign in
          </Link>
        </p>
      }
    >
      {notice ? (
        <p role="status" className="rounded-[var(--radius-control)] bg-mint-tint px-3 py-3 text-sm">
          {notice}
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="label" htmlFor="fa-name">
              Your full name
            </label>
            <input
              id="fa-name"
              className="field"
              required
              maxLength={120}
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="fa-email">
              Email
            </label>
            <input
              id="fa-email"
              className="field"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="fa-password">
              Password <span className="text-ink-500">(8 or more characters)</span>
            </label>
            <div className="relative">
              <input
                id="fa-password"
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
                aria-pressed={show}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-1 top-1/2 inline-flex min-h-[44px] -translate-y-1/2 items-center rounded-[var(--radius-control)] px-3 text-xs font-semibold text-ink-500 hover:text-ink-900"
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="fa-phone">
              Phone <span className="text-ink-500">(optional)</span>
            </label>
            <input
              id="fa-phone"
              className="field"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
