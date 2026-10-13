import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Briefcase, Compass, Flag, Import, Map, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { SiteFooter } from "@/components/SiteFooter";
import { Wordmark } from "@/components/passport";
import { RailCard } from "@/components/passport/RailCard";
import { PassportSheet } from "@/components/passport/PassportSheet";
import { PictureDialog } from "@/components/passport/PictureDialog";
import { draftAboutMe, usePassport, SEAL_TOTAL } from "@/lib/passport";

/**
 * /student — the resume center. A scrolling passport sheet in the middle,
 * rail cards left and right that open each resume element. Grades 4-8 get
 * the Explore density (bigger tiles, no ratings); 9-12 and up get Pro.
 * The older dashboard (assessments, surveys, internship application) lives
 * on at /student/pathway behind the Assessments card.
 */
export const Route = createFileRoute("/student")({
  head: () => ({ meta: [{ title: "My passport — EXPLR Pathways" }] }),
  component: () => (
    <RoleGuard requires="student">
      <ResumeCenter />
    </RoleGuard>
  ),
});

function ResumeCenter() {
  const { user, loading: authLoading } = useSession();
  const { data: p, loading, error, refresh } = usePassport(user?.id ?? null);
  const [editing, setEditing] = useState(false);
  const [picEditing, setPicEditing] = useState(false);
  const [aboutDraft, setAboutDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const aboutRef = useRef<HTMLTextAreaElement>(null);

  // "About me" dialog focus management (WCAG 2.4.3 / 2.1.2): focus moves into
  // the textarea when it opens and back to the opener when it closes.
  useEffect(() => {
    if (!editing) return;
    const opener = document.activeElement as HTMLElement | null;
    aboutRef.current?.focus();
    return () => opener?.focus?.();
  }, [editing]);

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-sm text-ink-500">
        Opening your passport…
      </main>
    );
  }
  if (error || !p) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24">
        <p className="font-display text-2xl font-bold">We couldn't open your passport.</p>
        <p className="mt-2 text-sm text-ink-700">{error ?? "Try again in a moment."}</p>
        <p className="mt-4 text-sm text-ink-500">
          Your assessments and surveys are still at{" "}
          <Link to="/student/pathway" className="ink-link">
            your pathway page
          </Link>
          .
        </p>
      </main>
    );
  }

  const explore = p.band === "explore";

  async function saveAbout() {
    if (!user) return;
    setSaving(true);
    await supabase
      .from("students")
      .update({ about_me: aboutDraft.trim() || null } as never)
      .eq("id", user.id);
    setSaving(false);
    setEditing(false);
    refresh();
  }

  const rails = {
    assessments: (
      <RailCard
        title="Assessments"
        hint={explore ? "Find out what you like." : "RIASEC · STEM efficacy · Internship interest"}
        meta={p.hollandCode ? `Holland code ${p.hollandCode}` : "Not started"}
        icon={Compass}
        to="/student/pathway"
        big={explore}
        image="/passport/assessments.webp"
      />
    ),
    checkpoints: (
      <RailCard
        title="Checkpoints"
        hint={explore ? "Little goals on your path." : "Milestones along your pathway"}
        meta="Coming soon"
        icon={Flag}
        to="/student/checkpoints"
        big={explore}
        image="/passport/grades-4-8.webp"
      />
    ),
    experience: (
      <RailCard
        title="Experience"
        hint={explore ? "Add something you did." : "Import from the library or add your own"}
        meta={`${p.work.filter((e) => e.status === "verified").length} stamped · ${p.experiences.length} total`}
        icon={Briefcase}
        to="/student/experiences"
        big={explore}
        image="/passport/portfolio.webp"
      />
    ),
    skills: (
      <RailCard
        title="Skills"
        hint="Competencies your supervisors have rated"
        meta={`${p.skillsProficient} of ${SEAL_TOTAL} proficient`}
        icon={Sparkles}
        to="/student/skills"
      />
    ),
    opportunities: (
      <RailCard
        title="Opportunities"
        hint={explore ? "Camps and field trips for you." : "Only ones you qualify for"}
        meta="Browse"
        icon={Search}
        to="/opportunities"
        big={explore}
        image="/passport/organizations.webp"
      />
    ),
    careers: (
      <RailCard
        title="Careers in Ohio"
        hint={
          explore ? "What jobs are like, and what they pay." : "Pay, growth, and how to get there"
        }
        meta={p.hollandCode ? `Matched to ${p.hollandCode}` : "667 Ohio jobs"}
        icon={Map}
        to="/careers"
        search={p.hollandCode ? { traits: p.hollandCode.split("").join(",") } : undefined}
        big={explore}
        image="/passport/grades-9-12.webp"
      />
    ),
    import: (
      <RailCard
        title="Import"
        hint="Pick an experience you took part in"
        meta="Library"
        icon={Import}
        to="/student/experiences/new"
        search={{ mode: "library" }}
      />
    ),
  };

  return (
    <div
      className="min-h-screen bg-paper text-ink-900"
      data-density={explore ? "explore" : undefined}
    >
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1312px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Wordmark />
          <nav className="flex items-center gap-5 text-[15px] font-medium">
            <Link to="/student/pathway" className="hidden hover:text-green-deep sm:inline">
              My pathway
            </Link>
            <Link to="/opportunities" className="hidden hover:text-green-deep sm:inline">
              Opportunities
            </Link>
            <Link to="/careers" className="hidden hover:text-green-deep sm:inline">
              Careers
            </Link>
            <Link
              to="/student/pathway"
              search={{ tab: "families" }}
              className="hover:text-green-deep"
            >
              Families
            </Link>
            <Link to="/sign-out" className="text-ink-500 hover:text-ink-900">
              Sign out
            </Link>
          </nav>
        </div>
      </header>

      {/* The sheet is the point: it gets the width of a letter-size page. Rails
          stack in one column beside it from lg, and split to both sides only on
          very wide screens where the page still keeps its width. */}
      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] xl:gap-8 2xl:grid-cols-[272px_minmax(0,1fr)_272px] 2xl:grid-rows-1">
          <aside
            aria-label="Assessments and checkpoints"
            className="order-2 flex flex-col gap-4 lg:order-1 lg:col-start-1 lg:row-start-1"
          >
            {!explore && <p className="eyebrow">Build your passport</p>}
            {rails.assessments}
            {rails.checkpoints}
            {!explore && rails.experience}
          </aside>

          <div className="order-1 lg:order-2 lg:col-start-2 lg:row-span-2 2xl:row-span-1">
            <PassportSheet
              p={p}
              onEditAbout={() => {
                setAboutDraft(p.aboutMe ?? draftAboutMe(p));
                setEditing(true);
              }}
              onEditPicture={() => setPicEditing(true)}
            />
          </div>

          <aside
            aria-label="Experience, skills, and opportunities"
            className="order-3 flex flex-col gap-4 lg:col-start-1 lg:row-start-2 2xl:col-start-3 2xl:row-start-1"
          >
            {!explore && <p className="eyebrow">Grow it</p>}
            {explore ? rails.experience : rails.skills}
            {rails.opportunities}
            {rails.careers}
            {!explore && rails.import}
            {!explore && (
              <div className="rounded-[var(--radius-card)] bg-gold-tint p-4">
                <p className="eyebrow text-gold-deep">Next stamp</p>
                <p className="mt-1 text-sm text-ink-700">
                  {p.work.some((e) => e.status === "self_reported")
                    ? "Ask a supervisor to stamp a self-reported experience. That's what unlocks hours and seal evidence."
                    : "Add an experience, then ask the person who saw you do it to stamp it."}
                </p>
              </div>
            )}
          </aside>
        </div>

        {explore && (
          <p className="mt-10 text-center text-ink-500">
            No grades here. Your passport is about what you explored and what you liked.
          </p>
        )}
      </main>

      {picEditing && user && p && (
        <PictureDialog
          studentId={user.id}
          explore={explore}
          emoji={p.avatarEmoji}
          photoUrl={p.photoUrl}
          onClose={() => setPicEditing(false)}
          onSaved={refresh}
        />
      )}

      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-title"
          aria-describedby="about-hint"
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
          className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveAbout();
            }}
            className="w-full max-w-lg rounded-[var(--radius-card)] bg-paper-raised p-6 shadow-lift"
          >
            <h2 id="about-title" className="font-display text-2xl font-bold">
              About me
            </h2>
            <p id="about-hint" className="mt-1 text-sm text-ink-700">
              In your own words. Leave it blank to use the draft your passport writes for you.
            </p>
            <textarea
              ref={aboutRef}
              aria-labelledby="about-title"
              aria-describedby="about-hint"
              className="field mt-4 min-h-[140px]"
              value={aboutDraft}
              maxLength={600}
              onChange={(e) => setAboutDraft(e.target.value)}
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="submit" disabled={saving} className="btn-ink">
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <SiteFooter className="mt-16" />
    </div>
  );
}
