import { createFileRoute } from "@tanstack/react-router";
import {
  CATEGORIES,
  activitiesByCategory,
  stemLabActivityLink,
  stemLabHome,
  type RiasecType,
  type StemLabActivity,
} from "@/lib/stemlab-catalog";

export const Route = createFileRoute("/stem-lab")({
  head: () => ({
    meta: [
      { title: "STEM Lab — 45 interactive activities | EXPLR" },
      {
        name: "description",
        content:
          "Browse 45 hands-on, interactive STEM activities for grades 3-8 across physics, chemistry, life science, engineering, code, data, and more.",
      },
    ],
  }),
  component: StemLabPage,
});

const RIASEC_CLASS: Record<RiasecType, string> = {
  R: "bg-riasec-r",
  I: "bg-riasec-i",
  A: "bg-riasec-a",
  S: "bg-riasec-s",
  E: "bg-riasec-e",
  C: "bg-riasec-c",
};

function ActivityCard({ a }: { a: StemLabActivity }) {
  return (
    <a
      href={stemLabActivityLink(a.slug)}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-md border border-charcoal-100 bg-white p-4 transition-colors hover:border-charcoal-700"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-medium leading-tight text-charcoal-700 group-hover:text-charcoal-900">
          {a.title}
        </h3>
        <span className="shrink-0 rounded border border-charcoal-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-charcoal-400">
          {a.grade_band}
        </span>
      </div>
      <p className="mt-2 text-sm leading-snug text-charcoal-500">{a.blurb}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {a.riasec.map((r) => (
          <span
            key={r}
            title={`RIASEC: ${r}`}
            className={`${RIASEC_CLASS[r]} inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold text-white`}
          >
            {r}
          </span>
        ))}
      </div>
    </a>
  );
}

function StemLabPage() {
  const byCat = activitiesByCategory();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="eyebrow text-explr-700">STEM Lab</p>
          <h1 className="display mt-3 text-charcoal-700">STEM Lab</h1>
          <p className="mt-3 max-w-2xl text-charcoal-500">
            45 interactive activities for grades 3-8. Open any activity to launch
            it in the lab.
          </p>
          <div className="mt-5">
            <a
              href={stemLabHome()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ink inline-block"
            >
              Open the lab →
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {CATEGORIES.map(({ key, subtitle }) => {
          const items = byCat.get(key) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={key} className="mb-14">
              <div className="flex items-baseline justify-between gap-4 border-b border-charcoal-100 pb-3">
                <div>
                  <p className="eyebrow text-explr-700">{key}</p>
                  <p className="mt-1 text-sm text-charcoal-500">{subtitle}</p>
                </div>
                <span className="text-xs text-charcoal-400">
                  {items.length} activit{items.length === 1 ? "y" : "ies"}
                </span>
              </div>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((a) => (
                  <li key={a.slug}>
                    <ActivityCard a={a} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
    </div>
  );
}
