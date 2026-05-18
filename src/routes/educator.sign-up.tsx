import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PROGRAM_META, PROGRAM_TYPES, type ProgramType } from "@/lib/educator";
import { SchoolSearch } from "@/components/SchoolSearch";

export const Route = createFileRoute("/educator/sign-up")({
  head: () => ({ meta: [{ title: "Educator sign up — EXPLR" }] }),
  component: EducatorSignUp,
});

function EducatorSignUp() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [programType, setProgramType] = useState<ProgramType>("stem");
  const [school, setSchool] = useState<{ irn: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { emailRedirectTo: window.location.origin },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    // Ensure an authenticated session exists before inserting (RLS requires auth.uid()=id).
    let session = data.session;
    if (!session) {
      const { data: signIn, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
      if (siErr) { setError(siErr.message); setLoading(false); return; }
      session = signIn.session;
    }
    if (data.user && session) {
      const { error: eErr } = await supabase.from("educators").insert({
        id: data.user.id,
        full_name: fullName,
        email,
        organization: organization || null,
        program_type: programType,
        school_irn: school?.irn ?? null,
        school_name: school?.name ?? null,
      });
      if (eErr) { setError(eErr.message); setLoading(false); return; }
    }
    setLoading(false);
    navigate({ to: "/educator/dashboard" });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <p className="eyebrow">Educator</p>
      <h1 className="mt-3 text-3xl font-light">Create your account</h1>
      <form onSubmit={submit} className="mt-10 space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label className="label">Full name</label><input className="field" required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div><label className="label">Organization</label><input className="field" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="School or program" /></div>
          <div><label className="label">Email</label><input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><label className="label">Passphrase</label><input className="field" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        </div>
        <div>
          <label className="label">Program type</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {PROGRAM_TYPES.map((pt) => {
              const m = PROGRAM_META[pt];
              const sel = pt === programType;
              return (
                <button key={pt} type="button" onClick={() => setProgramType(pt)}
                  className="flex items-start gap-3 border px-3 py-2.5 text-left transition-colors"
                  style={{ borderColor: sel ? "var(--ink)" : "var(--color-charcoal-100)", background: sel ? "var(--color-charcoal-50)" : "white" }}>
                  <span className="mt-1 h-2 w-2 rounded-full" style={{ background: m.accent }} />
                  <div>
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="text-xs text-charcoal-400">{m.band} · {m.blurb}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="label">School (optional)</label>
          <SchoolSearch value={school} onChange={setSchool} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={loading} className="btn-ink">{loading ? "Creating…" : "Create account"}</button>
      </form>
      <p className="mt-6 text-sm text-charcoal-500">Have an account? <Link to="/educator/sign-in" className="ink-link">Sign in</Link></p>
    </main>
  );
}
