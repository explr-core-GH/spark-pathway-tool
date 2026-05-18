import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/educator/admin/assessments")({
  head: () => ({ meta: [{ title: "Assessments — Admin" }] }),
  component: AssessmentsAdmin,
});

// Single place to find every assessment EXPLR ships, framed as a stakeholder
// demo deck. Tiles open in a new tab so the admin keeps this page as the
// "navigator" while running a live demo. Item counts pulled from src/lib.

type Demo = {
  kind: string;             // eyebrow text
  title: string;
  blurb: string;
  href: string;             // route to open
  estItems: number | null;  // approximate item count for context
  estMinutes: string;       // hand-tuned estimate
  notes?: string;
};

const DEMOS: Demo[] = [
  {
    kind: "Interest · RIASEC",
    title: "Mini Interest Profiler",
    blurb:
      "Adapted from O*NET's Interest Profiler. Likert items scored across the six Holland dimensions; produces the Holland code that anchors the rest of EXPLR.",
    href: "/assessment",
    estItems: 32,
    estMinutes: "8–12 min",
    notes:
      "Requires sign-in. Demo while signed in as your admin account — guests watch over your shoulder.",
  },
  {
    kind: "Interest · Workforce",
    title: "Internship interest survey",
    blurb:
      "Yes/maybe/no across the Summer 2026 internship catalog. Surfaces specific program demand and partners with the placements pipeline.",
    href: "/assessment/internship-interest",
    estItems: null,
    estMinutes: "3–5 min",
  },
  {
    kind: "Aptitude · Middle school",
    title: "Aptitude battery · MS",
    blurb:
      "Numeric, pattern, and verbal subscales tuned for grades 5–8. Multiple-choice, timed-but-untimed (no hard cutoffs).",
    href: "/demo/aptitude/MS/take",
    estItems: 24,
    estMinutes: "10–15 min",
  },
  {
    kind: "Aptitude · High school",
    title: "Aptitude battery · HS",
    blurb:
      "Same three subscales, harder items, tuned for grades 9–12. Same low-pressure format as the MS form.",
    href: "/demo/aptitude/HS/take",
    estItems: null,
    estMinutes: "12–18 min",
  },
];

function AssessmentsAdmin() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Assessments</h1>
      <p className="lead mt-3 max-w-2xl">
        Every EXPLR assessment, in one place. Use this page when you&apos;re demoing
        to funders, school leaders, or partners — open a tile in a new tab to
        walk through the student experience without leaving this navigator.
      </p>

      <ul className="mt-12 grid gap-5 md:grid-cols-2">
        {DEMOS.map((d) => (
          <li key={d.href}>
            <a
              href={d.href}
              target="_blank"
              rel="noopener noreferrer"
              className="tile block h-full"
            >
              <p className="eyebrow">{d.kind}</p>
              <h2 className="mt-2 text-xl font-medium text-ink">{d.title}</h2>
              <p className="mt-2 text-sm text-charcoal-700">{d.blurb}</p>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-charcoal-100 pt-4 text-xs">
                <div>
                  <dt className="text-charcoal-400 uppercase tracking-wider">Items</dt>
                  <dd className="mt-0.5 text-charcoal-700 tabular-nums">
                    {d.estItems != null ? d.estItems : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-charcoal-400 uppercase tracking-wider">Est. time</dt>
                  <dd className="mt-0.5 text-charcoal-700">{d.estMinutes}</dd>
                </div>
              </dl>

              {d.notes && (
                <p className="mt-3 text-xs text-charcoal-500 italic">{d.notes}</p>
              )}

              <p className="mt-4 text-sm font-semibold" style={{ color: "var(--explr)" }}>
                Open demo ↗
              </p>
            </a>
          </li>
        ))}
      </ul>

      {/* Demo-running tips for stakeholders */}
      <section className="mt-16 border border-charcoal-100 p-6">
        <h2 className="text-sm font-semibold text-ink">Running a live demo</h2>
        <ul className="mt-3 space-y-2 text-sm text-charcoal-700">
          <li>
            <strong className="text-ink">Open each demo in a new tab.</strong> Keep this
            page as the index so you can jump between assessments without
            losing your place.
          </li>
          <li>
            <strong className="text-ink">Sign in as the admin account.</strong> The Mini
            Interest Profiler requires auth — your guests watch you take it.
            For aptitude demos, no sign-in is required.
          </li>
          <li>
            <strong className="text-ink">Show the report after.</strong> Once an
            interest session completes, the report at{" "}
            <code className="bg-charcoal-50 px-1 text-xs">/assessment/&lt;sessionId&gt;/results</code>{" "}
            is the centerpiece — show it after walking through the items.
          </li>
          <li>
            <strong className="text-ink">Talk through scoring on the Reference tab.</strong>{" "}
            The Program-RIASEC coder&apos;s Reference tab is the easiest way to
            explain how scores translate to recommendations.
          </li>
        </ul>
      </section>

      <p className="mt-10 text-xs text-charcoal-400">
        Item counts are approximate and pulled from{" "}
        <code className="bg-charcoal-50 px-1 text-[10px]">src/lib/assessment-items.ts</code>{" "}
        and{" "}
        <code className="bg-charcoal-50 px-1 text-[10px]">src/lib/aptitude-items.ts</code>.
      </p>
    </main>
  );
}
