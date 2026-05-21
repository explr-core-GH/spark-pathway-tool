import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AssessmentAssignPanel } from "@/components/AssessmentAssignPanel";
import { SurveyAdminPanel } from "./educator.admin.surveys";

export const Route = createFileRoute("/educator/admin/assessments")({
  head: () => ({ meta: [{ title: "Assessments — Admin" }] }),
  component: AssessmentsAdmin,
});

type Tab = "assign" | "surveys" | "demos";

// The Demo navigator tiles — unchanged, just moved into a tab. Tiles open
// in a new tab so the admin keeps this page as the index during a live demo.
type Demo = {
  kind: string;
  title: string;
  blurb: string;
  href: string;
  estItems: number | null;
  estMinutes: string;
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

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "assign", label: "Assign assessments" },
  { id: "surveys", label: "STEM surveys" },
  { id: "demos", label: "Demo links" },
];

function AssessmentsAdmin() {
  const [tab, setTab] = useState<Tab>("assign");

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Assessments</h1>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-charcoal-100">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="border-b-2 px-4 py-2 text-sm transition-colors"
            style={{
              borderColor: tab === t.id ? "var(--ink)" : "transparent",
              color: tab === t.id ? "var(--ink)" : "var(--color-charcoal-400)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "assign" && <AssessmentAssignPanel />}
        {tab === "surveys" && <SurveyAdminPanel />}
        {tab === "demos" && <DemoTiles />}
      </div>
    </main>
  );
}

function DemoTiles() {
  return (
    <div>
      <p className="lead max-w-2xl">
        Every EXPLR assessment, in one place. Use this when demoing to funders,
        school leaders, or partners — open a tile in a new tab to walk through
        the student experience without leaving this navigator.
      </p>

      <ul className="mt-8 grid gap-5 md:grid-cols-2">
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
    </div>
  );
}
