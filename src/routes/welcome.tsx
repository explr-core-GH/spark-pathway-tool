import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/passport/AuthShell";
import { useSession } from "@/lib/auth";
import { completeProfileFromMetadata } from "@/lib/profile-completion";

/**
 * /welcome — a signed-in user who has no profile row yet (typically a first
 * Google or Microsoft sign-in) picks what the passport needs: first name and
 * grade. Users who already have a role are sent to their own home.
 */
export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [{ title: "Welcome — EXPLR Pathways" }, { name: "robots", content: "noindex" }],
  }),
  component: Welcome,
});

type Landing = "/student" | "/instructor/dashboard" | "/org" | "/family/home" | "/instructor/admin";

async function existingLanding(userId: string): Promise<Landing | null> {
  const [admin, student, educator, org, guardian] = await Promise.all([
    supabase.from("admins").select("id").eq("id", userId).maybeSingle(),
    supabase.from("students").select("id").eq("id", userId).maybeSingle(),
    supabase.from("educators").select("id").eq("id", userId).maybeSingle(),
    supabase.from("organizations").select("id").eq("id", userId).maybeSingle(),
    supabase.from("guardians").select("id").eq("id", userId).maybeSingle(),
  ]);
  if (admin.data) return "/instructor/admin";
  if (student.data) return "/student";
  if (educator.data) return "/instructor/dashboard";
  if (org.data) return "/org";
  if (guardian.data) return "/family/home";
  return null;
}

function Welcome() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [checking, setChecking] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [grade, setGrade] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/sign-in" });
      return;
    }
    let active = true;
    (async () => {
      try {
        await completeProfileFromMetadata(user);
      } catch {
        // fall through to the form
      }
      const landing = await existingLanding(user.id);
      if (!active) return;
      if (landing) navigate({ to: landing });
      else {
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        const guess =
          (typeof meta.given_name === "string" && meta.given_name) ||
          (typeof meta.full_name === "string" && meta.full_name.split(" ")[0]) ||
          (typeof meta.name === "string" && meta.name.split(" ")[0]) ||
          "";
        setFirstName(guess);
        setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSaving(true);
    const { error: insErr } = await supabase
      .from("students")
      .insert({ id: user.id, first_name: firstName.trim() || null, grade });
    setSaving(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    navigate({ to: "/student" });
  }

  return (
    <AuthShell
      eyebrow="Students"
      title="Welcome to EXPLR Pathways"
      intro="Two quick things and your passport is ready."
      illustration={{ src: "/passport/students.webp" }}
      role="Student"
      links={[{ label: "Home", to: "/" }]}
      footer={
        <p>
          Not a student?{" "}
          <Link to="/instructor/sign-up" className="ink-link">
            Instructor access
          </Link>
          <span className="mx-2 text-ink-500">·</span>
          <Link to="/org/sign-up" className="ink-link">
            Partner registration
          </Link>
          <span className="mx-2 text-ink-500">·</span>
          <Link to="/family/sign-up" className="ink-link">
            Family account
          </Link>
        </p>
      }
    >
      {checking ? (
        <p role="status" className="text-sm text-ink-500">
          Checking your account…
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div>
              <label className="label" htmlFor="wel-first">
                First name
              </label>
              <input
                id="wel-first"
                className="field"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="wel-grade">
                Grade this fall
              </label>
              <select
                id="wel-grade"
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
          {error && (
            <p
              className="rounded-[var(--radius-control)] bg-gold-tint px-3 py-2 text-sm text-ink-900"
              role="alert"
            >
              {error}
            </p>
          )}
          <button type="submit" disabled={saving} className="btn-ink w-full justify-center">
            {saving ? "Saving…" : "Open my passport"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
