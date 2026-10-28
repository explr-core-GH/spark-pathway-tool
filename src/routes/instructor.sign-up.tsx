import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SchoolSearch, type SchoolPick } from "@/components/SchoolSearch";
import { GradeLevelPicker } from "@/components/GradeLevelPicker";
import { CONFIRM_EMAIL_NOTICE } from "@/lib/profile-completion";

export const Route = createFileRoute("/instructor/sign-up")({
  head: () => ({ meta: [{ title: "Instructor sign up — EXPLR" }] }),
  component: EducatorSignUp,
});

/**
 * Renders inside the /instructor layout (instructor.tsx), which already
 * provides the PortalHeader and SiteFooter, so this page only lays out the
 * AuthShell-style two-column body: intro + illustration beside the card.
 */
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
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const sc = studentCount.trim() === "" ? null : Math.max(0, parseInt(studentCount, 10) || 0);
    // Everything the educators row needs is also saved in the auth metadata,
    // so a sign-up that must wait for email confirmation can finish on first sign-in.
    const { data, error: suErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/instructor/sign-in`,
        data: {
          account: "educator",
          full_name: fullName.trim(),
          organization: organization.trim() || null,
          school_irn: school?.irn ?? null,
          school_name: school?.name ?? null,
          student_count: sc,
          grade_levels: gradeLevels.length > 0 ? gradeLevels : null,
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
    const { error: eErr } = await supabase.from("educators").insert({
      id: uid,
      full_name: fullName,
      email,
      organization: organization || null,
      program_type: null,
      approved: false, // an admin approves, or use an invite link
      school_irn: school?.irn ?? null,
      school_name: school?.name ?? null,
      student_count: sc,
      grade_levels: gradeLevels.length > 0 ? gradeLevels : null,
    });

    if (eErr) {
      setError(eErr.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate({ to: "/instructor/dashboard" });
  }

  return (
    <main className="mx-auto w-full max-w-[1312px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:gap-16">
        <section className="order-2 lg:order-1 lg:sticky lg:top-8">
          <p className="eyebrow">Instructors</p>
          <h1 className="display mt-3">Request instructor access</h1>
          <p className="lead mt-4 max-w-xl">
            For teachers, coaches, camp instructors, and internship supervisors. An EXPLR admin
            reviews new accounts and assigns your program type. If you have an invite link, use that
            instead; it activates instantly.
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
                <label className="label" htmlFor="edu-fullname">
                  Full name
                </label>
                <input
                  id="edu-fullname"
                  className="field"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="edu-org">
                  Organization
                </label>
                <input
                  id="edu-org"
                  className="field"
                  autoComplete="organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="School or program (optional)"
                />
              </div>
              <div>
                <label className="label" htmlFor="edu-email">
                  Email
                </label>
                <input
                  id="edu-email"
                  className="field"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="edu-password">
                  Passphrase
                </label>
                <input
                  id="edu-password"
                  className="field"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  aria-describedby="edu-password-hint"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p id="edu-password-hint" className="mt-1.5 text-xs text-ink-500">
                  At least 8 characters.
                </p>
              </div>
              <div>
                <span className="label">
                  Your school <span className="text-ink-500">(optional)</span>
                </span>
                <SchoolSearch
                  initial={school}
                  onSelect={(s) => setSchool(s.irn ? s : null)}
                  placeholder="Search Ohio schools…"
                  label="Search for your school"
                />
              </div>
              <div>
                <label className="label" htmlFor="edu-studentcount">
                  Number of students you teach <span className="text-ink-500">(optional)</span>
                </label>
                <input
                  id="edu-studentcount"
                  type="number"
                  min={0}
                  className="field"
                  aria-describedby="edu-studentcount-hint"
                  value={studentCount}
                  onChange={(e) => setStudentCount(e.target.value)}
                  placeholder="e.g. 28"
                />
                <p id="edu-studentcount-hint" className="mt-1.5 text-xs text-ink-500">
                  Used to weight aggregate demographics for EXPLR&apos;s admin dashboard.
                </p>
              </div>
              <div>
                <span className="label">
                  Grade levels you teach <span className="text-ink-500">(optional)</span>
                </span>
                <GradeLevelPicker value={gradeLevels} onChange={setGradeLevels} className="mt-1" />
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
                {loading ? "Submitting…" : "Request access"}
              </button>
            </form>
          </div>
          <p className="mt-6 text-sm text-ink-500">
            Have an account?{" "}
            <Link to="/instructor/sign-in" className="ink-link">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
