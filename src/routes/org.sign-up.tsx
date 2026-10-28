import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/passport/AuthShell";
import { CONFIRM_EMAIL_NOTICE } from "@/lib/profile-completion";

export const Route = createFileRoute("/org/sign-up")({
  head: () => ({ meta: [{ title: "Register as a partner — EXPLR" }] }),
  component: OrgSignUp,
});

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

function OrgSignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: suErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/org/sign-in`,
        // Saved so the organizations row can be created on first sign-in when
        // email confirmation is on.
        data: {
          account: "organization",
          name: name.trim(),
          contact_name: contactName.trim() || null,
          website: website.trim() || null,
        },
      },
    });
    if (suErr) {
      setError(suErr.message);
      setLoading(false);
      return;
    }
    if (!data.session || !data.user) {
      setLoading(false);
      setNotice(CONFIRM_EMAIL_NOTICE);
      return;
    }
    const uid = data.user.id;
    const { error: oErr } = await sb("organizations").insert({
      id: uid,
      name: name.trim(),
      contact_name: contactName.trim() || null,
      contact_email: email,
      website: website.trim() || null,
    });
    if (oErr) {
      setError(oErr.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    navigate({ to: "/org" });
  }

  return (
    <AuthShell
      eyebrow="Partners & organizations"
      title="Register as a partner"
      intro="For partners offering camps, workshops, internships, and clubs. Build an opportunity in a few minutes; an EXPLR admin reviews it before it goes live."
      illustration={{ src: "/passport/organizations.webp" }}
      role="Partner"
      links={[
        { label: "Home", to: "/" },
        { label: "About", to: "/about", secondary: true },
      ]}
      footer={
        <p>
          Already registered?{" "}
          <Link to="/org/sign-in" className="ink-link">
            Sign in
          </Link>
        </p>
      }
    >
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-[var(--radius-control)] bg-mint-tint px-3 py-3 text-sm"
        >
          {notice}
        </p>
      )}
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label" htmlFor="org-name">
            Organization name
          </label>
          <input
            id="org-name"
            className="field"
            required
            autoComplete="organization"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="org-contact">
            Contact name
          </label>
          <input
            id="org-contact"
            className="field"
            autoComplete="name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
        </div>
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
          <label className="label" htmlFor="org-website">
            Website <span className="text-ink-500">(optional)</span>
          </label>
          <input
            id="org-website"
            className="field"
            type="url"
            autoComplete="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://"
          />
        </div>
        <div>
          <label className="label" htmlFor="org-password">
            Passphrase
          </label>
          <input
            id="org-password"
            className="field"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            aria-describedby="org-password-hint"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p id="org-password-hint" className="mt-1.5 text-xs text-ink-500">
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
          {loading ? "Creating…" : "Create partner account"}
        </button>
      </form>
    </AuthShell>
  );
}
