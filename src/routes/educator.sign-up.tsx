import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SchoolSearch, type SchoolPick } from "@/components/SchoolSearch";
import { GradeLevelPicker } from "@/components/GradeLevelPicker";

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
  const [school, setSchool] = useState<SchoolPick | null>(null);
  const [studentCount, setStudentCount] = useState<string>("");
  const [gradeLevels, setGradeLevels] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Sign up + ensure we have an authenticated session before the educators insert
    // (RLS: educators self insert requires auth.uid() = id).
    const { data, error: suErr } = await supabase.auth.signUp({
      email, password, options: { emailRedirectTo: window.location.origin },
    });
    if (suErr) { setError(suErr.message); setLoading(false); return; }
    let session = data.session;
    if (!session) {
      const { data: signIn, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
      if (siErr) { setError(siErr.message); setLoading(false); return; }
      session = signIn.session;
    }
    const uid = data.user?.id ?? session?.user.id;
    if (!uid || !session) { setError("Could not create account."); setLoading(false); return; }

    // If an unaccepted invite exists for this email, auto-approve and apply its program_type/org.
    const { data: invite } = await supabase
      .from("educator_invites")
      .select("id, program_type, organization")
      .eq("email", email)
      .is("accepted_at", null)
      .maybeSingle();

    const sc = studentCount.trim() === "" ? null : Math.max(0, parseInt(studentCount, 10) || 0);
    const { error: eErr } = await supabase.from("educators").insert({
      id: uid,
      full_name: fullName,
      email,
      organization: invite?.organization ?? (organization || null),
      program_type: invite?.program_type ?? null,
      approved: !!invite,
      school_irn: school?.irn ?? null,
      school_name: school?.name ?? null,
      student_count: sc,
      grade_levels: gradeLevels.length > 0 ? gradeLevels : null,
    });

    if (eErr) { setError(eErr.message); setLoading(false); return; }

    if (invite) {
      await supabase.from("educator_invites")
        .update({ accepted_at: new Date().toISOString(), accepted_by: uid })
        .eq("id", invite.id);
    }

    setLoading(false);
    navigate({ to: "/educator/dashboard" });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link to="/" className="eyebrow mb-12 inline-block">← EXPLR</Link>
      <h1 className="text-3xl font-light">Request educator access</h1>
      <p className="mt-2 text-sm text-charcoal-500">
        For teachers, coaches, camp instructors, and internship supervisors.
        An EXPLR admin reviews new accounts and assigns your program type. If
        you have an invite link, use that instead — it activates instantly.
      </p>
      <p className="mt-3 text-xs text-charcoal-400">
        EXPLR admin? You don&apos;t need an educator account — admins are invited
        separately and sign in at{" "}
        <Link to="/admin/sign-in" className="ink-link">/admin/sign-in</Link>.
      </p>
      <form onSubmit={submit} className="mt-10 space-y-5">
        <div>
          <label className="label">Full name</label>
          <input className="field" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">Organization</label>
          <input className="field" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="School or program (optional)" />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Passphrase</label>
          <input className="field" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="label">Your school <span className="text-charcoal-400">(optional)</span></label>
          <SchoolSearch
            initial={school}
            onSelect={(s) => setSchool(s.irn ? s : null)}
            placeholder="Search Ohio schools…"
          />
        </div>
        <div>
          <label className="label">Number of students you teach <span className="text-charcoal-400">(optional)</span></label>
          <input
            type="number"
            min={0}
            className="field"
            value={studentCount}
            onChange={(e) => setStudentCount(e.target.value)}
            placeholder="e.g. 28"
          />
          <p className="mt-1 text-xs text-charcoal-400">
            Used to weight aggregate demographics for EXPLR&apos;s admin dashboard.
          </p>
        </div>
        <div>
          <label className="label">Grade levels you teach <span className="text-charcoal-400">(optional)</span></label>
          <GradeLevelPicker value={gradeLevels} onChange={setGradeLevels} className="mt-1" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={loading} className="btn-ink w-full justify-center">
          {loading ? "Submitting…" : "Request access"}
        </button>
      </form>
      <p className="mt-6 text-sm text-charcoal-500">
        Have an account? <Link to="/educator/sign-in" className="ink-link">Sign in</Link>
      </p>
    </div>
  );
}
