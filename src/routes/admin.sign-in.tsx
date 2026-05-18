import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/sign-in")({
  head: () => ({ meta: [{ title: "Admin sign in — EXPLR" }] }),
  component: AdminSignIn,
});

function AdminSignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error: siErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (siErr) {
      setError(siErr.message);
      setLoading(false);
      return;
    }
    // Confirm the signed-in user actually has an admins row.
    const { data: adminRow } = await supabase
      .from("admins")
      .select("id")
      .eq("id", data.user?.id ?? "")
      .maybeSingle();
    if (!adminRow) {
      await supabase.auth.signOut();
      setError(
        "This account isn't registered as an admin. If you're an educator, use the educator sign-in.",
      );
      setLoading(false);
      return;
    }
    navigate({ to: "/educator/admin" });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link to="/" className="eyebrow mb-12 inline-block">← EXPLR</Link>
      <p className="eyebrow">Admin</p>
      <h1 className="mt-3 text-3xl font-light">Admin sign in</h1>
      <p className="mt-2 text-sm text-charcoal-500">
        Admins are invited by other admins. If you&apos;re an educator, head to{" "}
        <Link to="/educator/sign-in" className="ink-link">educator sign-in</Link> instead.
      </p>
      <form onSubmit={submit} className="mt-10 space-y-5">
        <div>
          <label className="label">Email</label>
          <input
            className="field"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Passphrase</label>
          <input
            className="field"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={loading} className="btn-ink w-full justify-center">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
