import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * /start — pathway chooser.
 *
 * The landing page's "Start" button comes here so a fresh visitor sees a
 * clear two-card pick (student vs educator) instead of being dropped
 * directly onto the assessment grade form. Signed-in users skip the pick
 * and get routed to their natural home so they don't have to re-decide.
 *
 * Routing rules:
 *   - Not signed in → render the two-card picker.
 *   - Signed in as admin (row in public.admins) → /educator/admin.
 *   - Signed in as educator (row in public.educators) → /educator/dashboard.
 *   - Signed in but no role yet (auth-only) → assume student → /assessment.
 */

export const Route = createFileRoute("/start")({
  head: () => ({ meta: [{ title: "Get started — EXPLR" }] }),
  component: Start,
});

function Start() {
  const navigate = useNavigate();
  const [resolving, setResolving] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        setAuthed(false);
        setResolving(false);
        return;
      }
      setAuthed(true);
      // Look up roles in parallel; first match wins.
      const [{ data: ad }, { data: ed }] = await Promise.all([
        // admins table — cast because the generated Database type may lag.
        (supabase.from as (n: string) => ReturnType<typeof supabase.from>)("admins")
          .select("id").eq("id", session.user.id).maybeSingle(),
        supabase.from("educators").select("id").eq("id", session.user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      if (ad) {
        navigate({ to: "/educator/admin" });
        return;
      }
      if (ed) {
        navigate({ to: "/educator/dashboard" });
        return;
      }
      // Student: if they've already taken (or started) the assessment, go
      // straight to the dashboard; otherwise to the assessment intro.
      const { data: sess } = await supabase
        .from("assessment_sessions")
        .select("session_id")
        .eq("student_id", session.user.id)
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      navigate({ to: sess ? "/student" : "/assessment" });
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  if (resolving) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-32 text-center text-sm text-charcoal-400">
        Loading…
      </main>
    );
  }

  // Only renders when the user is NOT signed in. Signed-in users get
  // navigated away in the effect above.
  if (authed) return null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <Link to="/" className="eyebrow">← EXPLR</Link>
      <h1 className="display mt-10">Get started.</h1>
      <p className="lead mt-4">Pick your pathway.</p>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {/* Student */}
        <article className="border border-charcoal-100 p-8">
          <p className="eyebrow" style={{ color: "var(--explr)" }}>For students</p>
          <h2 className="mt-3 text-xl font-light text-charcoal-700">
            A starting point you actually own.
          </h2>
          <p className="mt-3 text-sm text-charcoal-500">
            Take the survey. See your Holland code. Use it to ask better
            questions about what comes after high school.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/sign-up" className="btn-ink">Create student account</Link>
            <Link to="/sign-in" className="btn-ghost">Sign in</Link>
          </div>
        </article>

        {/* Educator */}
        <article className="border border-charcoal-100 p-8">
          <p className="eyebrow" style={{ color: "var(--explr)" }}>For educators</p>
          <h2 className="mt-3 text-xl font-light text-charcoal-700">
            Curriculum and rosters in one place.
          </h2>
          <p className="mt-3 text-sm text-charcoal-500">
            STEM, CS, robotics coaches, camp instructors, and internship
            supervisors — manage assignments and student lists per program.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/educator/sign-up" className="btn-ink">Request educator access</Link>
            <Link to="/educator/sign-in" className="btn-ghost">Sign in</Link>
          </div>
        </article>
      </div>
    </main>
  );
}
