import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { HollandHexagon } from "@/components/HollandHexagon";
import { RIASEC, type RIASECCode } from "@/lib/riasec";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EXPLR — Find what you like." },
      { name: "description", content: "Career-interest assessment for Cleveland K-12 students. Grounded in the RIASEC framework." },
      { property: "og:title", content: "EXPLR — Find what you like." },
      { property: "og:description", content: "Career-interest assessment for Cleveland K-12 students." },
    ],
  }),
  component: Landing,
});

function SiteHeader() {
  return (
    <header className="border-b border-charcoal-100">
      {/* Brand-mark animation lives inline so Tailwind v4 can't purge it.
          Two prior attempts in styles.css (top-level + @layer components)
          got dropped by the build pipeline. A <style> tag in the JSX
          always reaches the page. */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            /* Yellow specks fall diagonally top-right → bottom-left in a quick
               shower, staggered so they read as a spray, not a single trail.
               Each speck has its own keyframe with slightly different start
               and end offsets for natural variance. */
            @keyframes explr-speck-a {
              0%, 92% { opacity: 0; transform: translate(70px, -55px); }
              93% { opacity: 1; transform: translate(45px, -30px); }
              97% { opacity: 0.7; transform: translate(-35px, 20px); }
              98%, 100% { opacity: 0; transform: translate(-65px, 45px); }
            }
            @keyframes explr-speck-b {
              0%, 93% { opacity: 0; transform: translate(80px, -40px); }
              94% { opacity: 1; transform: translate(50px, -20px); }
              98% { opacity: 0.6; transform: translate(-50px, 30px); }
              99%, 100% { opacity: 0; transform: translate(-80px, 50px); }
            }
            @keyframes explr-speck-c {
              0%, 94% { opacity: 0; transform: translate(60px, -65px); }
              95% { opacity: 1; transform: translate(35px, -35px); }
              99% { opacity: 0.5; transform: translate(-55px, 35px); }
              100% { opacity: 0; transform: translate(-70px, 55px); }
            }
            .explr-brand { position: relative; display: inline-block; isolation: isolate; }
            .explr-brand__text { position: relative; z-index: 1; }
            .explr-brand__shoot {
              position: absolute;
              top: -70px;
              right: -20px;
              bottom: -70px;
              left: -20px;
              z-index: 0;
              overflow: hidden;
              pointer-events: none;
            }
            .explr-speck {
              position: absolute;
              top: 50%;
              left: 50%;
              margin-top: -1.5px;
              margin-left: -1.5px;
              width: 3px;
              height: 3px;
              border-radius: 50%;
              background: #FACC15;
              box-shadow: 0 0 4px rgba(250, 204, 21, 0.9);
              opacity: 0;
            }
            .explr-speck--a { animation: explr-speck-a 6s linear infinite; }
            .explr-speck--b { animation: explr-speck-b 6s linear infinite; animation-delay: 80ms; }
            .explr-speck--c { animation: explr-speck-c 6s linear infinite; animation-delay: 160ms; }

            @media (prefers-reduced-motion: reduce) {
              .explr-speck { animation: none; opacity: 0; }
            }
            [data-motion="reduced"] .explr-speck {
              animation: none;
              opacity: 0;
            }
          `,
        }}
      />
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="explr-brand text-xl font-medium tracking-tight">
          <span className="explr-brand__shoot" aria-hidden>
            <span className="explr-speck explr-speck--a" />
            <span className="explr-speck explr-speck--b" />
            <span className="explr-speck explr-speck--c" />
          </span>
          <span className="explr-brand__text">
            EXPLR <span style={{ color: "var(--explr)" }}>Pathways</span>
          </span>
        </Link>
        <nav className="flex items-center gap-7 text-sm">
          <Link to="/about" className="text-charcoal-500 hover:text-ink">About</Link>
          <Link to="/sign-in" className="text-charcoal-500 hover:text-ink">Student sign in</Link>
          <Link to="/educator/sign-in" className="text-charcoal-500 hover:text-ink">Educator sign in</Link>
          <Link to="/start" className="btn-mint">Start</Link>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="rule mt-32">
      <div className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-4 px-6 py-10 text-sm text-charcoal-400">
        <div>© {new Date().getFullYear()} EXPLR · Cleveland</div>
        <div className="flex gap-6">
          <Link to="/about" className="hover:text-ink">About</Link>
          <Link to="/privacy" className="hover:text-ink">Privacy</Link>
          
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  const [active, setActive] = useState<RIASECCode>("R");
  const dim = RIASEC[active];

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-24 pb-32">
          <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="eyebrow">A career-interest assessment for Cleveland K-12</p>
              <h1 className="display mt-6">
                Find what <span style={{ color: "var(--color-explr-600)" }}>you</span> like.
              </h1>
              <p className="lead mt-6 max-w-lg">
                Six dimensions of interest. Forty-five years of research. A fifteen-minute
                survey that gives you a starting point — not a verdict.
              </p>
              <div className="mt-10 flex gap-3">
                <Link to="/start" className="btn-ink">Take the assessment</Link>
                <Link to="/about" className="btn-ghost">How it works</Link>
              </div>
            </div>
            <div className="flex justify-center">
              <HollandHexagon size={420} active={active} onSelect={setActive} />
            </div>
          </div>
        </section>

        {/* RIASEC color tour */}
        <section className="border-y border-charcoal-100 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
              <div>
                <p className="eyebrow">The framework</p>
                <h2 className="mt-3 text-3xl font-light tracking-tight">RIASEC</h2>
                <p className="mt-3 text-sm text-charcoal-500">
                  Six dimensions, arranged on a hexagon. Adjacent dimensions correlate; opposite ones contrast.
                </p>
              </div>
              <div>
                <div className="flex flex-wrap gap-2">
                  {Object.values(RIASEC).map((d) => (
                    <button
                      key={d.code}
                      onClick={() => setActive(d.code)}
                      className="flex items-center gap-2 border px-3 py-1.5 text-sm transition-colors"
                      style={{
                        borderColor: active === d.code ? d.color : "var(--color-charcoal-100)",
                        background: active === d.code ? d.colorSoft : "transparent",
                      }}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: d.color }}
                      />
                      <span className="font-medium">{d.code}</span>
                      <span className="text-charcoal-500">{d.name}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-8 border-l-2 pl-6" style={{ borderColor: dim.color }}>
                  <p className="eyebrow" style={{ color: dim.color }}>
                    {dim.code} · {dim.name}
                  </p>
                  <p className="mt-3 text-2xl font-light leading-snug">{dim.hsDescription}</p>
                  <p className="mt-4 text-sm text-charcoal-500">
                    Example careers: {dim.examples.join(" · ")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pathways — what the assessment opens up, across grade bands.
            The point: this is a discovery tool for all of K-12, not an
            internship funnel. Middle schoolers explore through camps and
            robotics; high schoolers go on to internships. */}
        <section className="border-b border-charcoal-100 bg-charcoal-50">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
              <div>
                <p className="eyebrow" style={{ color: "var(--explr)" }}>Where it leads</p>
                <h2 className="mt-3 text-3xl font-light tracking-tight">
                  Explore, don&apos;t just assess.
                </h2>
                <p className="mt-3 text-sm text-charcoal-500">
                  Your Holland code is a starting point — not a label. EXPLR
                  connects it to real ways to explore, and the right one
                  changes with your grade.
                </p>
              </div>

              <div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <article className="border border-charcoal-100 bg-white p-6">
                    <p className="eyebrow">Middle school</p>
                    <h3 className="mt-2 text-lg font-medium">Camps &amp; workshops</h3>
                    <p className="mt-2 text-sm text-charcoal-500">
                      Hands-on summer camps and short workshops — design,
                      environmental science, underwater robotics — to try
                      interests on for size before committing.
                    </p>
                  </article>
                  <article className="border border-charcoal-100 bg-white p-6">
                    <p className="eyebrow">Grades 4&ndash;12</p>
                    <h3 className="mt-2 text-lg font-medium">Robotics programs</h3>
                    <p className="mt-2 text-sm text-charcoal-500">
                      FIRST LEGO League, FTC, and FRC teams. Build, code, and
                      compete — and discover which STEM lanes click.
                    </p>
                  </article>
                  <article className="border border-charcoal-100 bg-white p-6">
                    <p className="eyebrow">High school</p>
                    <h3 className="mt-2 text-lg font-medium">Internships</h3>
                    <p className="mt-2 text-sm text-charcoal-500">
                      Real workplace internships matched to your top RIASEC
                      themes — one short application covers the catalog.
                    </p>
                  </article>
                </div>

                <p className="mt-6 text-sm text-charcoal-500">
                  A 5th grader trying a robotics camp and a junior applying for
                  a biomedical internship are on the same map — just at
                  different points on it.
                </p>

                <div className="mt-8 flex gap-3">
                  <Link to="/start" className="btn-mint">Start the assessment</Link>
                  <Link to="/about" className="btn-ghost">How it works</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* More than an assessment */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
            <div>
              <p className="eyebrow">Beyond the survey</p>
              <h2 className="mt-3 text-3xl font-light tracking-tight">More than an assessment.</h2>
              <p className="mt-3 text-sm text-charcoal-500">
                EXPLR Pathways connects students, educators, and STEM programs to the next step.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <article className="border border-charcoal-100 p-6">
                <p className="eyebrow" style={{ color: "var(--explr)" }}>Students</p>
                <h3 className="mt-3 text-lg font-medium">Discover what fits</h3>
                <p className="mt-3 text-sm text-charcoal-500">
                  From middle-school camps and robotics to high-school
                  internships — see your interests and find programs matched
                  to them, at any grade.
                </p>
                <Link to="/start" className="ink-link mt-5 inline-block text-sm">Start the assessment →</Link>
              </article>

              <article className="border border-charcoal-100 p-6">
                <p className="eyebrow" style={{ color: "var(--explr)" }}>Educators</p>
                <h3 className="mt-3 text-lg font-medium">Curricular materials</h3>
                <p className="mt-3 text-sm text-charcoal-500">
                  Approved educators access curriculum and lesson resources tied to
                  career pathways and student interest profiles.
                </p>
                <Link to="/educator/sign-up" className="ink-link mt-5 inline-block text-sm">Request educator access →</Link>
              </article>

              <article className="border border-charcoal-100 p-6">
                <p className="eyebrow" style={{ color: "var(--explr)" }}>STEM programs</p>
                <h3 className="mt-3 text-lg font-medium">Robotics &amp; STEM curriculum</h3>
                <p className="mt-3 text-sm text-charcoal-500">
                  Educators and organizations running FLL, FTC, and FRC programs can
                  access materials, curriculum, and programming resources.
                </p>
                <Link to="/educator/sign-up" className="ink-link mt-5 inline-block text-sm">Request program access →</Link>
              </article>
            </div>
          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
}
