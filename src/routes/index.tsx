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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="text-base font-medium tracking-tight">EXPLR</Link>
        <nav className="flex items-center gap-7 text-sm">
          <Link to="/about" className="text-charcoal-500 hover:text-ink">About</Link>
          <Link to="/educator" className="text-charcoal-500 hover:text-ink">Educators</Link>
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
          <Link to="/educator" className="hover:text-ink">Educators</Link>
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

        {/* Pathways */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <p className="eyebrow">Get started</p>
          <h3 className="mt-3 text-2xl font-light">Pick your pathway.</h3>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="r-md border border-charcoal-100 p-8">
              <p className="eyebrow">For students</p>
              <h4 className="mt-3 text-xl font-light text-charcoal-700">A starting point you actually own.</h4>
              <p className="mt-3 text-sm text-charcoal-500">
                Take the survey. See your Holland code. Use it to ask better questions about
                what comes after high school.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/sign-up" className="btn-ink">Create student account</Link>
                <Link to="/sign-in" className="btn-ghost">Sign in</Link>
              </div>
            </div>
            <div className="r-md border border-charcoal-100 p-8">
              <p className="eyebrow">For educators</p>
              <h4 className="mt-3 text-xl font-light text-charcoal-700">Curriculum and rosters in one place.</h4>
              <p className="mt-3 text-sm text-charcoal-500">
                STEM, CS, robotics coaches (FLL/FTC/FRC), camp instructors, and internship
                supervisors — manage assignments and student lists per program.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/educator/sign-up" className="btn-ink">Request educator access</Link>
                <Link to="/educator/sign-in" className="btn-ghost">Sign in</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
