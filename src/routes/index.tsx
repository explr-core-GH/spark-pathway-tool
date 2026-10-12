import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, GraduationCap, House, UserCheck } from "lucide-react";
import { DoorCard, SiteHeader, Stamp, Wordmark } from "@/components/passport";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EXPLR Pathways — From Classrooms to Careers" },
      {
        name: "description",
        content:
          "Ohio's work-based and career-connected learning passport for grades 4 to 12. Career advising checkpoints, verified WBL hours, Readiness Seal evidence, and a resume that builds itself.",
      },
      { property: "og:title", content: "EXPLR Pathways — From Classrooms to Careers" },
      {
        property: "og:description",
        content:
          "From Classrooms to Careers – Pathways Start Here. A work-based learning passport for grades 4 to 12.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    n: "01",
    image: "/passport/portfolio.webp",
    title: "Add an experience",
    body: "Import one from the library of opportunities you took part in, or add an outside job, camp, or College Credit Plus course.",
  },
  {
    n: "02",
    image: "/passport/organizations.webp",
    title: "Your supervisor stamps it",
    body: "One emailed link. They confirm hours and duties and rate your skills on the Readiness Seal scale. A stamp can't be edited by the student.",
    stamp: "Stamped · one link",
  },
  {
    n: "03",
    image: "/passport/grades-9-12.webp",
    title: "Carry it anywhere",
    body: "Export a 250-hour log, OhioMeansJobs Readiness Seal evidence, a resume, and badges that verify without calling us.",
  },
];

// Figures come from the research spec; each carries its citation so the
// copy never claims more than the source does.
const EVIDENCE = [
  {
    value: "48.5%",
    body: "lower odds of being underemployed a year after graduating, from a single internship.",
    cite: "Strada / Burning Glass, 2024",
  },
  {
    value: "+$3,096",
    body: "higher first-year wages after a paid internship. Unpaid internships show no gain.",
    cite: "Strada, 2022",
  },
  {
    value: "0.8%",
    body: "of Ohio graduates earned the Readiness Seal with 250+ work-based learning hours. That's the gap this passport closes.",
    cite: "ExcelinEd / Ohio Excels, 2024",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-[1312px] px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
            <div className="flex flex-col gap-6">
              <p className="eyebrow text-green">
                Ohio work-based & career-connected learning · grades 4-12
              </p>
              <h1 className="display">
                From Classrooms to Careers –
                <span className="block text-green">Pathways Start Here</span>
              </h1>
              <p className="lead max-w-[600px] text-ink-700">
                A living passport for Ohio students. Add real experiences, get them stamped by the
                people who watched you do the work, and carry verified work-based learning hours,
                Readiness Seal evidence, and a resume wherever you go next.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#doors" className="btn-ink">
                  Get started
                </a>
                <a href="#how" className="btn-ghost">
                  How the passport works
                </a>
              </div>
              <p className="text-sm text-ink-500">
                Just here for the interest survey?{" "}
                <Link to="/assessment" className="ink-link">
                  Take the RIASEC assessment
                </Link>
                .
              </p>
            </div>
            <div className="flex justify-center lg:justify-end">
              <img
                src="/passport/students.webp"
                alt="An open passport with a compass cover, three stamped pages, and a pencil"
                width={560}
                height={560}
                className="w-full max-w-[560px]"
                fetchPriority="high"
              />
            </div>
          </div>
        </section>

        {/* Ohio */}
        <section className="border-y border-line bg-paper-raised">
          <div className="mx-auto grid max-w-[1312px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-8">
            <div className="flex flex-col gap-3">
              <p className="eyebrow text-green">Built for Ohio</p>
              <h2 className="font-display text-3xl font-bold tracking-tight">
                Career-connected learning the way Ohio defines it.
              </h2>
              <p className="text-ink-700">
                Ohio asks every district for grades 6-12 career advising, lets students graduate on
                250 verified work-based learning hours, and awards the OhioMeansJobs-Readiness Seal
                for fifteen validated skills. Pathways is one system that documents all three.
              </p>
              <Link to="/about" className="ink-link mt-2 inline-block">
                See how Pathways meets Ohio's requirements
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-3">
              {[
                [
                  "Career advising",
                  "Two checkpoints a year, grades 6-12, exported as the Student Success Plan.",
                ],
                [
                  "Work-based learning",
                  "Only Ohio's formal WBL types count, only once a supervisor stamps them.",
                ],
                [
                  "Readiness Seal",
                  "Every stamp rates skills on the state's four-level scale, by setting and rater.",
                ],
              ].map(([t, d]) => (
                <li
                  key={t}
                  className="rounded-[var(--radius-card)] border border-line bg-paper p-5"
                >
                  <p className="font-display text-lg font-semibold">{t}</p>
                  <p className="mt-1 text-sm text-ink-700">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Doors */}
        <section
          id="doors"
          className="mx-auto max-w-[1312px] scroll-mt-8 px-4 py-16 sm:px-6 lg:px-8"
        >
          <div className="flex flex-col gap-2.5">
            <p className="eyebrow text-green">Pathways start here</p>
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-[44px]">
              Who are you?
            </h2>
            <p className="text-ink-700">
              Four ways in, one passport. Admins can sign in from any of them.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <DoorCard
              eyebrow="Students"
              icon={GraduationCap}
              image="/passport/students.webp"
              title="I'm a student"
              body="Build your passport of experiences, take the RIASEC, and find opportunities you qualify for."
              cta="Choose your grade band"
              to="/start"
              pills={[
                { label: "Grades 4-8", to: "/explore" },
                { label: "Grades 9-12", to: "/sign-in", search: { band: "9-12" } },
              ]}
            />
            <DoorCard
              eyebrow="Instructors"
              icon={UserCheck}
              image="/passport/assessments.webp"
              title="I'm an instructor"
              body="Teachers, worksite supervisors, camp and program staff. Review experiences, stamp them, recommend."
              cta="Sign up as an instructor"
              to="/instructor/sign-up"
            />
            <DoorCard
              eyebrow="Partners & orgs"
              icon={Building2}
              image="/passport/organizations.webp"
              title="I'm a partner or org"
              body="Submit events, camps, and internships through a guided portal so students and families can decide."
              cta="Open the partner portal"
              to="/org/sign-in"
            />
            <DoorCard
              eyebrow="Families"
              icon={House}
              image="/passport/families.webp"
              title="I'm a family member"
              body="See your student's passport, hours, and upcoming opportunities."
              cta="See how families connect"
              to="/family"
            />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-8 border-y border-line bg-paper-raised">
          <div className="mx-auto max-w-[1312px] px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2.5">
              <p className="eyebrow text-green">How the passport works</p>
              <h2 className="font-display text-3xl font-bold tracking-tight">
                Three stamps from classroom to career.
              </h2>
            </div>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="flex flex-col gap-4">
                  <img
                    src={s.image}
                    alt=""
                    width={220}
                    height={220}
                    loading="lazy"
                    className="h-[220px] w-[220px] object-contain"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="eyebrow text-green">Step {s.n}</span>
                    {s.stamp && <Stamp label={s.stamp} />}
                  </div>
                  <h3 className="font-display text-xl font-semibold">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-700">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Evidence */}
        <section className="bg-ink-900-900 text-paper">
          <div className="mx-auto grid max-w-[1312px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
            {EVIDENCE.map((e) => (
              <div key={e.value} className="flex flex-col gap-2.5">
                <p className="font-display text-[44px] font-bold leading-none tracking-tight text-mint">
                  {e.value}
                </p>
                <p className="text-paper">{e.body}</p>
                <p className="eyebrow text-mint">{e.cite}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1312px] flex-wrap justify-between gap-8 px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2.5">
            <Wordmark />
            <p className="text-sm text-ink-700">From Classrooms to Careers – Pathways Start Here</p>
            <p className="text-sm text-ink-500">
              A Cleveland work-based learning portfolio for grades 4 to 12. ©{" "}
              {new Date().getFullYear()} EXPLR
            </p>
          </div>
          <nav
            aria-label="Footer"
            className="-my-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-900"
          >
            <Link
              to="/about"
              className="inline-flex min-h-[44px] items-center hover:text-green-deep"
            >
              About
            </Link>
            <Link
              to="/privacy"
              className="inline-flex min-h-[44px] items-center hover:text-green-deep"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="inline-flex min-h-[44px] items-center hover:text-green-deep"
            >
              Terms
            </Link>
            <Link
              to="/student-data"
              className="inline-flex min-h-[44px] items-center hover:text-green-deep"
            >
              Student data
            </Link>
            <Link
              to="/instructor/sign-in"
              className="inline-flex min-h-[44px] items-center hover:text-green-deep"
            >
              Instructors
            </Link>
            <Link
              to="/org/sign-in"
              className="inline-flex min-h-[44px] items-center hover:text-green-deep"
            >
              Partners
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
