import { RIASEC, RIASEC_ORDER, type RIASECCode } from "@/lib/riasec";

/**
 * FamilyPortal — the "For families" tab on the student dashboard. A deeper,
 * parent-facing explainer of what EXPLR measures, how to read the results, what
 * the data is (and isn't), and how to use it at home. Reads the student's own
 * Holland code for a personalized callout when results exist.
 */
export function FamilyPortal({
  hollandCode,
  grade,
}: {
  hollandCode: string | null;
  grade: number | null;
}) {
  const top = hollandCode
    ? (hollandCode.split("").filter((c) => RIASEC[c as RIASECCode]) as RIASECCode[]).slice(0, 3)
    : [];
  const isHS = grade !== null && grade >= 8;

  return (
    <div className="mt-8 space-y-12 pb-8">
      <section>
        <p className="eyebrow">For families</p>
        <h2 className="mt-2 text-3xl font-light">Understanding your student&rsquo;s results</h2>
        <p className="lead mt-4 max-w-2xl">
          EXPLR Pathways helps your student notice what they&rsquo;re drawn to and connect it to
          real opportunities. Everything here is a <strong>starting point for conversation</strong>,
          never a label or a prediction — interests grow a lot at this age, and that&rsquo;s the point.
        </p>
      </section>

      {/* Personalized callout when the student has results */}
      {top.length > 0 && (
        <section className="border border-charcoal-100 bg-charcoal-50 p-6">
          <p className="eyebrow">Your student&rsquo;s interest code</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {top.map((c) => (
              <span
                key={c}
                className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{ background: RIASEC[c].color }}
                aria-hidden
              >
                {c}
              </span>
            ))}
            <span className="text-3xl font-light tracking-wide">{top.join("")}</span>
          </div>
          <p className="mt-3 text-sm text-charcoal-600">
            Those are the three kinds of activities your student leaned toward most:{" "}
            {top.map((c, i) => (
              <span key={c}>
                {i > 0 ? " · " : ""}
                <span style={{ color: RIASEC[c].color }} className="font-medium">
                  {RIASEC[c].hsPlainName}
                </span>
              </span>
            ))}
            .
          </p>
        </section>
      )}

      {/* RIASEC interest assessment */}
      <section className="border-t border-charcoal-100 pt-10">
        <p className="eyebrow">The interest assessment</p>
        <h3 className="mt-2 text-xl font-medium">What it measures</h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-600">
          Students rate how much they&rsquo;d enjoy a range of everyday activities. Their answers sort
          into <strong>six interest areas</strong> (the RIASEC model). The three they lean toward
          most become their &ldquo;Holland code&rdquo; — almost everyone is a <em>blend</em>. EXPLR
          uses RIASEC because it&rsquo;s the most researched framework for this age (45+ years; it
          underlies the U.S. Department of Labor&rsquo;s O*NET career tools).
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {RIASEC_ORDER.map((c) => {
            const d = RIASEC[c];
            return (
              <li key={c} className="flex gap-3">
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: d.color }}
                  aria-hidden
                >
                  {c}
                </span>
                <div>
                  <p className="font-medium" style={{ color: d.color }}>
                    {d.hsPlainName}
                  </p>
                  <p className="text-sm text-charcoal-600">{d.hsDescription}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Internship interest survey */}
      <section className="border-t border-charcoal-100 pt-10">
        <p className="eyebrow">The internship interest survey</p>
        <h3 className="mt-2 text-xl font-medium">Matching interests to real opportunities</h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-600">
          A short (5–7 minute) survey that reads your student&rsquo;s interests, the sectors they&rsquo;re
          curious about, and how they like to work, then <strong>ranks the real EXPLR internships</strong>{" "}
          that fit them best — each with a plain-language &ldquo;why this fits you.&rdquo; Curiosity counts:
          a student who has never tried something but is interested still gets a full set of matches.
          {isHS
            ? " Your student is in the grade range that can explore and apply to internships."
            : " Internship matching opens up in grades 8–12; younger students can still explore the interests."}
        </p>
      </section>

      {/* Aptitude */}
      <section className="border-t border-charcoal-100 pt-10">
        <p className="eyebrow">The aptitude battery</p>
        <h3 className="mt-2 text-xl font-medium">A quick look at reasoning skills</h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-600">
          A short, low-stakes set of puzzle-style tasks (numeric, pattern, and verbal reasoning). It&rsquo;s
          a snapshot to spark conversation about strengths — <strong>not a test, not graded, and not used
          to gate any opportunity.</strong>
        </p>
      </section>

      {/* Privacy / what it is and isn't */}
      <section className="border-t border-charcoal-100 pt-10">
        <p className="eyebrow">What the results are — and aren&rsquo;t</p>
        <ul className="mt-4 max-w-2xl space-y-2 text-sm text-charcoal-600">
          <li>· <strong>A strength, framed positively</strong> — a lens for &ldquo;what could I try?&rdquo;, never a verdict or a limit.</li>
          <li>· <strong>Private to your student.</strong> Research surveys are never shown next to a name.</li>
          <li>· <strong>No grades, no high-stakes scoring,</strong> and no eligibility or demographic questions in the interest tools.</li>
          <li>· <strong>A moment in time.</strong> Interests shift — that&rsquo;s exactly what camps, clubs, and trying new things are for.</li>
        </ul>
      </section>

      {/* How to use at home */}
      <section className="border-t border-charcoal-100 pt-10">
        <p className="eyebrow">How to use this at home</p>
        <h3 className="mt-2 text-xl font-medium">Turn it into a conversation</h3>
        <ul className="mt-4 max-w-2xl space-y-2 text-sm text-charcoal-600">
          <li>· Ask <em>&ldquo;which activities did you enjoy, and why?&rdquo;</em> — the &ldquo;why&rdquo; matters more than the code.</li>
          <li>· Use the interest areas to pick summer programs, clubs, and things to try next.</li>
          <li>· Reframe &ldquo;what do you want to be?&rdquo; as &ldquo;what do you like to do?&rdquo; — lower pressure, more discovery.</li>
          <li>· Sign in together and explore the matching careers and EXPLR programs.</li>
        </ul>
      </section>

      <p className="border-t border-charcoal-100 pt-8 text-xs text-charcoal-400">
        Questions? Ask your camp educator or email{" "}
        <a href="mailto:support@explr.cc" className="ink-link">support@explr.cc</a>. EXPLR Pathways ·
        Cleveland State University × MAGNET.
      </p>
    </div>
  );
}
