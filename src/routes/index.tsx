import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { HollandHexagon } from "@/components/HollandHexagon";
import { RIASEC, type RIASECCode } from "@/lib/riasec";
import { INTERNSHIPS } from "@/lib/internships-catalog";

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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="text-base font-medium tracking-tight">EXPLR <span style={{ color: "var(--explr)" }}>Pathways</span></Link>
        <nav className="flex items-center gap-7 text-sm">
          <Link to="/about" className="text-charcoal-500 hover:text-ink">About</Link>
          
          <Link to="/assessment" className="btn-mint">Start</Link>
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
                <Link to="/assessment" className="btn-ink">Take the assessment</Link>
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
                <h3 className="mt-3 text-lg font-medium">Internships &amp; opportunities</h3>
                <p className="mt-3 text-sm text-charcoal-500">
                  Interested high schoolers can apply for internships and real-world
                  opportunities matched to their RIASEC interests.
                </p>
                <Link to="/assessment" className="ink-link mt-5 inline-block text-sm">Start the assessment →</Link>
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
