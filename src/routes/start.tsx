import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, ChevronRight, GraduationCap, House, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DoorCard } from "@/components/passport/DoorCard";
import { PortalHeader } from "@/components/passport/PortalHeader";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * /start — pathway chooser.
 *
 * The landing page's "Start" button comes here so a fresh visitor sees a
 * clear three-card pick (student, instructor, partner) plus the families
 * link, instead of being dropped directly onto the assessment grade form.
 * Signed-in users skip the pick and get routed to their natural home so
 * they don't have to re-decide.
 *
 * Routing rules:
 *   - Not signed in → render the chooser.
 *   - Signed in as admin (row in public.admins) → /instructor/admin.
 *   - Signed in as instructor (row in public.educators) → /instructor/dashboard.
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        setAuthed(false);
        setResolving(false);
        return;
      }
      setAuthed(true);
      // Look up roles in parallel; first match wins.
      const [{ data: ad }, { data: ed }, { data: gu }, { data: st }] = await Promise.all([
        // admins table — cast because the generated Database type may lag.
        (supabase as any).from("admins").select("id").eq("id", session.user.id).maybeSingle(),
        supabase.from("educators").select("id").eq("id", session.user.id).maybeSingle(),
        supabase.from("guardians").select("id").eq("id", session.user.id).maybeSingle(),
        supabase.from("students").select("id").eq("id", session.user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      if (ad) {
        navigate({ to: "/instructor/admin" });
        return;
      }
      if (ed) {
        navigate({ to: "/instructor/dashboard" });
        return;
      }
      if (gu && !st) {
        navigate({ to: "/family/home" });
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
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (resolving) {
    return (
      <div className="flex min-h-screen flex-col bg-paper text-ink-900">
        <PortalHeader links={[{ label: "Home", to: "/" }]} />
        <main className="mx-auto w-full max-w-[1312px] flex-1 px-4 py-24 text-center sm:px-6 lg:px-8">
          <h1 className="font-display text-2xl font-bold">Getting you to the right place…</h1>
          <p className="mt-2 text-sm text-ink-500" role="status">
            Checking who you are signed in as.
          </p>
        </main>
        <SiteFooter className="mt-10" />
      </div>
    );
  }

  // Only renders when the user is NOT signed in. Signed-in users get
  // navigated away in the effect above.
  if (authed) return null;

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink-900">
      <PortalHeader
        links={[
          { label: "Home", to: "/" },
          { label: "About", to: "/about", secondary: true },
          { label: "Families", to: "/family", secondary: true },
        ]}
      />
      <main className="mx-auto w-full max-w-[1312px] flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="flex flex-col gap-2.5">
          <p className="eyebrow text-green">Pathways start here</p>
          <h1 className="display">Who are you?</h1>
          <p className="lead max-w-[600px] text-ink-700">
            Three ways in, one passport. Pick the one that fits and we&apos;ll take you to the right
            sign-in.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <DoorCard
            headingLevel="h2"
            eyebrow="Students"
            icon={GraduationCap}
            image="/passport/students.webp"
            title="I'm a student"
            body="Grades 4-8 sign in with a class code and pictures. Grades 9-12 use an email or roster username to open a passport of stamped experiences."
            cta="Create a student account"
            to="/sign-up"
            pills={[
              { label: "Grades 4-8", to: "/explore" },
              { label: "Grades 9-12", to: "/sign-in", search: { band: "9-12" } },
            ]}
          />
          <DoorCard
            headingLevel="h2"
            eyebrow="Instructors"
            icon={UserCheck}
            image="/passport/assessments.webp"
            title="I'm an instructor"
            body="Teachers, coaches, camp staff, and worksite supervisors. Rosters, checkpoints, experiences to stamp, and recommendation letters."
            cta="Sign in as an instructor"
            to="/instructor/sign-in"
            pills={[{ label: "Request access", to: "/instructor/sign-up" }]}
          />
          <DoorCard
            headingLevel="h2"
            eyebrow="Partners & organizations"
            icon={Building2}
            image="/passport/organizations.webp"
            title="I'm a partner or org"
            body="Submit camps, workshops, internships, and events through a guided portal so students and families can decide."
            cta="Open the partner portal"
            to="/org/sign-in"
            pills={[{ label: "Register your organization", to: "/org/sign-up" }]}
          />
        </div>

        <Link
          to="/family"
          className="mt-8 flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card hover:border-emerald focus-visible:border-emerald"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border border-mint-soft bg-mint-tint text-green-deep">
            <House className="h-6 w-6" strokeWidth={2} aria-hidden />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-green">
              Families
            </span>
            <span className="font-display text-xl font-semibold leading-tight">
              Here for your student&apos;s passport?
            </span>
            <span className="text-sm text-ink-700">
              Use the code your student made for you, or a family account for all your children.
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-500" strokeWidth={2.2} aria-hidden />
        </Link>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link to="/family/sign-in" className="ink-link inline-flex min-h-[44px] items-center">
            Family sign in
          </Link>
          <Link to="/family/sign-up" className="ink-link inline-flex min-h-[44px] items-center">
            Create a family account
          </Link>
        </p>
      </main>
      <SiteFooter className="mt-10" />
    </div>
  );
}
