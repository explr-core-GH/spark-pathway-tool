import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) {
      const { error: studErr } = await supabase
        .from("students")
        .insert({ id: data.user.id, first_name: firstName, grade });
      if (studErr) { setError(studErr.message); setLoading(false); return; }
    }
    setLoading(false);
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link to="/" className="eyebrow mb-12 inline-block">← EXPLR</Link>
      <h1 className="text-3xl font-light">Create your account</h1>
      <p className="mt-2 text-sm text-charcoal-500">For students grades 5–12.</p>
      <form onSubmit={submit} className="mt-10 space-y-5">
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div>
            <label className="label" htmlFor="su-first">First name</label>
            <input id="su-first" className="field" required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="su-grade">Grade</label>
            <select id="su-grade" className="field" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
              {[5,6,7,8,9,10,11,12].map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="su-email">Email</label>
          <input id="su-email" className="field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="su-password">Password</label>
          <input id="su-password" className="field" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <button type="submit" disabled={loading} className="btn-ink w-full justify-center">
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-charcoal-500">
        Already have one? <Link to="/sign-in" className="ink-link">Sign in</Link>
      </p>
    </div>
  );
}
