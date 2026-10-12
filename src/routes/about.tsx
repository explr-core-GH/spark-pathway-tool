import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, Stamp } from "@/components/passport";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "For Ohio districts and partners — EXPLR Pathways" },
      {
        name: "description",
        content:
          "EXPLR Pathways is a work-based and career-connected learning platform built for Ohio: career advising checkpoints, verified WBL hours, Readiness Seal evidence, and Student Success Plan exports.",
      },
      { property: "og:title", content: "For Ohio districts and partners — EXPLR Pathways" },
      {
        property: "og:description",
        content:
          "One passport that satisfies Ohio's career advising, work-based learning, and Readiness Seal requirements.",
      },
    ],
  }),
  component: AboutPage,
});

const OHIO = [
  {
    law: "ORC 3313.6020 · Career advising",
    need: "Every district needs a grades 6-12 career advising plan, documented for each student, with Student Success Plans and an online planning tool.",
    us: "Pathways runs two advising checkpoints a year in every grade, mirrors the Model Student Success Plan field for field, and exports it as a PDF a counselor can file without re-keying anything.",
  },
  {
    law: "ORC 3313.618 · 250-hour work-based learning option",
    need: "Students can meet a graduation requirement with 250 verified hours of formal work-based learning and a positive employer evaluation.",
    us: "Only Ohio's formal WBL types accrue hours, only from grade 9, and only after a supervisor stamps the experience through one emailed link. The log exports in an EMIS-ready layout.",
  },
  {
    law: "ORC 3313.6112 · OhioMeansJobs-Readiness Seal",
    need: "Fifteen professional skills validated by at least three mentors across school, work, and community.",
    us: "Every supervisor stamp carries competency ratings on the state's four-level scale, tagged with setting and rater, so the seal validation form fills itself.",
  },
  {
    law: "Perkins V · Career-connected learning",
    need: "Awareness, exploration, preparation, and participation, with exposure logged separately from WBL.",
    us: "Every experience carries a stage and a type from the Ohio taxonomy. Exposure shows up as stickers; verified work shows up as stamps. Nothing self-reported is ever displayed as verified.",
  },
  {
    law: "ORC 3319.325 · Student data (SB 29)",
    need: "District-owned records, no commercial use, return or destroy at contract end, breach notice within 72 hours.",
    us: "Contract-scoped records, minimal PII, student-owned exports so the record stays portable when the district relationship ends.",
  },
];

const EXPORTS: Array<[string, string]> = [
  [
    "Student Success Plan",
    "Ohio's forms in Ohio's order, one PDF per school year at spring approval.",
  ],
  ["250-hour WBL log", "Verified formal-WBL hours by school year, in an EMIS-ready layout."],
  [
    "Readiness Seal evidence",
    "All 15 skills with ratings, settings, and raters in the validation form's layout.",
  ],
  [
    "OhioMeansJobs resume",
    "Built from verified experiences, ready to paste into the K-12 resume builder.",
  ],
  [
    "Open Badges 3.0 and CLR",
    "Signed, portable credentials a third party can verify without calling us.",
  ],
  [
    "District monitoring",
    "Checkpoint completion and experiences by stage, disaggregated the way the Career Advising Plan Template asks.",
  ],
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-[1312px] px-4 pb-16 pt-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
            <div className="flex flex-col gap-6">
              <p className="eyebrow text-green">For Ohio districts, schools, and partners</p>
              <h1 className="display">
                Ohio asked for career-connected learning.
                <span className="block text-green">Here is the system.</span>
              </h1>
              <p className="lead max-w-[620px] text-ink-700">
                EXPLR Pathways turns Ohio's career advising, work-based learning, and Readiness Seal
                requirements into one student passport: assessed in the fall, explored all year,
                stamped by the adults who saw the work, and exported in the formats the state
                already uses.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/instructor/sign-up" className="btn-ink">
                  Bring Pathways to your school
                </Link>
                <Link to="/org/sign-in" className="btn-ghost">
                  Offer an opportunity
                </Link>
              </div>
            </div>
            <img
              src="/passport/grades-9-12.webp"
              alt="Three stepping-stone tickets leading to an open doorway beside a portfolio folder"
              width={520}
              height={520}
              className="mx-auto w-full max-w-[520px]"
            />
          </div>
        </section>

        <section className="border-y border-line bg-paper-raised">
          <div className="mx-auto max-w-[1312px] px-4 py-16 sm:px-6 lg:px-8">
            <p className="eyebrow text-green">
              What Ohio requires, and what Pathways does about it
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">
              Built to the statute, not around it.
            </h2>
            <ul className="mt-8 grid gap-6 md:grid-cols-2">
              {OHIO.map((o) => (
                <li
                  key={o.law}
                  className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-paper p-6"
                >
                  <p className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-green">
                    {o.law}
                  </p>
                  <p className="text-sm text-ink-700">
                    <strong className="text-ink-900">The requirement.</strong> {o.need}
                  </p>
                  <p className="text-sm text-ink-700">
                    <strong className="text-ink-900">In Pathways.</strong> {o.us}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-[1312px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div className="flex flex-col gap-4">
              <p className="eyebrow text-green">The verification rule</p>
              <h2 className="font-display text-3xl font-bold tracking-tight">
                Nothing displayed as verified is self-reported.
              </h2>
              <p className="text-ink-700">
                A student adds an experience and names the supervisor. The supervisor gets one
                emailed link, confirms hours and duties, and rates the skills they watched on the
                Readiness Seal scale. The record freezes with a stamp. Edit it later and the stamp
                comes off until it is re-attested.
              </p>
              <div className="flex flex-wrap gap-3">
                <Stamp label="Verified · one link" />
                <Stamp kind="self" label="Self-reported" />
              </div>
              <p className="text-sm text-ink-500">
                Employer burden is the binding constraint in every work-based learning study we
                read, so verification is one link and one short prefilled form. Most employers host
                fewer than five students a year; we don't ask them to log in.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <p className="eyebrow text-green">Who signs in</p>
              <h2 className="font-display text-3xl font-bold tracking-tight">
                One passport, four ways in.
              </h2>
              <ul className="flex flex-col gap-3 text-ink-700">
                <li>
                  <strong className="text-ink-900">Students, grades 4-8.</strong> No passwords.
                  Picture sign-in or a passport card, exposure and interest fit only, never rated on
                  workplace behavior.
                </li>
                <li>
                  <strong className="text-ink-900">Students, grades 9-12.</strong> Verified hours,
                  seal evidence, a resume that builds itself, and the internship portal.
                </li>
                <li>
                  <strong className="text-ink-900">Instructors.</strong> Teachers, camp staff,
                  worksite supervisors, and mentors. Rosters, curriculum, checkpoints to review,
                  experiences to stamp.
                </li>
                <li>
                  <strong className="text-ink-900">Partners.</strong> Employers and organizations
                  submit camps, events, and internships through a guided portal that captures what
                  students and families need to decide.
                </li>
                <li>
                  <strong className="text-ink-900">Families.</strong> A code from the student opens
                  a read-only view. No account, no app.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-ink-900 text-paper">
          <div className="mx-auto max-w-[1312px] px-4 py-14 sm:px-6 lg:px-8">
            <p className="eyebrow text-mint">Exports a district can file</p>
            <ul className="mt-4 grid gap-6 md:grid-cols-3">
              {EXPORTS.map(([t, d]) => (
                <li key={t} className="flex flex-col gap-1">
                  <span className="font-display text-xl font-semibold">{t}</span>
                  <span className="text-sm text-paper/80">{d}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-paper/70">
              The interest assessment underneath is RIASEC, the framework behind O*NET's Interest
              Profiler, with structural validity across diverse populations (Day, Rounds &amp;
              Swaney 1998) and documented stability from age 12 (Low, Yoon, Roberts &amp; Rounds
              2005).
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-[1312px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-8 text-center shadow-card">
            <p className="eyebrow text-green">Cleveland first, Ohio next</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">
              Let's map your district's plan onto a passport.
            </h2>
            <p className="mx-auto mt-3 max-w-[560px] text-ink-700">
              Bring your career advising plan and we'll show you which boxes Pathways already
              checks, which exports your counselors get, and what a pilot takes.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/instructor/sign-up" className="btn-ink">
                Request instructor access
              </Link>
              <Link to="/org/sign-up" className="btn-ghost">
                Register as a partner
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter className="mt-0" />
    </div>
  );
}
