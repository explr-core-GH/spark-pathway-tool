import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { CareerCard, CareersLoading } from "@/components/careers/CareerBits";
import { CareersHeader, useViewer } from "@/components/careers/CareersHeader";
import { type RIASECCode } from "@/lib/riasec";
import {
  codeLetters,
  educationBucket,
  matchCareers,
  RIASEC_LETTERS,
  TRAITS,
  useOhioCareers,
  type EducationBucket,
  type OhioCareer,
} from "@/lib/ohio-careers";

/**
 * /careers — Ohio careers for families and students. Two ways in: "What are
 * you like?" (RIASEC traits as toggle pills) and "Pick a career area" (the
 * eight family interest groups, then the sixteen clusters). Everything is
 * deep-linkable: /careers?traits=S,I&interest=helping_people&q=nurse.
 */

type Sort = "fit" | "pay" | "growth" | "openings";
type Search = {
  traits?: string;
  interest?: string;
  cluster?: string;
  q?: string;
};

const PAGE = 60;

export const Route = createFileRoute("/careers/")({
  head: () => ({
    meta: [
      { title: "Careers in Ohio — EXPLR Pathways" },
      {
        name: "description",
        content:
          "667 Ohio jobs with typical pay, growth, openings, and the training it takes. Match them to how you're wired or browse by career area.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => {
    const out: Search = {};
    if (typeof s.traits === "string" && s.traits) out.traits = s.traits;
    if (typeof s.interest === "string" && s.interest) out.interest = s.interest;
    if (typeof s.cluster === "string" && s.cluster) out.cluster = s.cluster;
    if (typeof s.q === "string" && s.q) out.q = s.q;
    return out;
  },
  component: CareersPage,
});

const PILL_ON = "border-ink-900 bg-ink-900 text-paper";
const PILL_OFF = "border-line-strong bg-paper-raised text-ink-700 hover:border-ink-900";

function CareersPage() {
  const data = useOhioCareers();
  const { user, isStudent } = useViewer();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const traits = useMemo(
    () => codeLetters((search.traits ?? "").replace(/,/g, "")),
    [search.traits],
  );
  const [education, setEducation] = useState<EducationBucket | "any">("any");
  const [aboveMedian, setAboveMedian] = useState(false);
  const [sort, setSort] = useState<Sort | "auto">("auto");
  const [shown, setShown] = useState(PAGE);

  function setSearch(patch: Partial<Search>) {
    setShown(PAGE);
    navigate({
      search: (prev: Search) => {
        const next: Search = { ...prev, ...patch };
        for (const k of Object.keys(next) as Array<keyof Search>) if (!next[k]) delete next[k];
        return next;
      },
      replace: true,
    });
  }

  function toggleTrait(l: RIASECCode) {
    const next = traits.includes(l) ? traits.filter((t) => t !== l) : [...traits, l].slice(-3);
    setSearch({ traits: next.join(",") });
  }

  const effectiveSort: Sort = sort === "auto" ? (traits.length ? "fit" : "openings") : sort;

  const results = useMemo(() => {
    if (!data) return [];
    const group = search.interest
      ? data.interests.find((g) => g.id === search.interest)
      : undefined;
    const q = (search.q ?? "").trim().toLowerCase();

    // Base list: ranked by fit when traits are picked, else every job.
    let rows: Array<{ career: OhioCareer; fit?: number }> = traits.length
      ? matchCareers(data, { letters: traits }, { limit: data.occupations.length, minFit: 0 })
      : data.occupations.map((career) => ({ career }));

    rows = rows.filter(({ career: c }) => {
      if (search.cluster && c.cluster !== search.cluster) return false;
      if (group && !group.clusters.includes(c.cluster)) return false;
      if (education !== "any" && educationBucket(c.education) !== education) return false;
      if (aboveMedian && c.wageAnnual < data.meta.ohioMedianWageAnnual) return false;
      if (q && !c.title.toLowerCase().includes(q) && !c.desc.toLowerCase().includes(q))
        return false;
      return true;
    });

    const by: Record<Sort, (a: OhioCareer, b: OhioCareer) => number> = {
      fit: () => 0, // already ranked by matchCareers
      pay: (a, b) => b.wageAnnual - a.wageAnnual,
      growth: (a, b) => (b.changePct ?? -999) - (a.changePct ?? -999),
      openings: (a, b) => (b.openings ?? 0) - (a.openings ?? 0),
    };
    if (effectiveSort !== "fit")
      rows = [...rows].sort((a, b) => by[effectiveSort](a.career, b.career));
    return rows;
  }, [
    data,
    traits,
    search.interest,
    search.cluster,
    search.q,
    education,
    aboveMedian,
    effectiveSort,
  ]);

  const visible = results.slice(0, shown);
  const updated = data?.meta.generatedAt ?? "";

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <CareersHeader signedIn={!!user} isStudent={isStudent} />
      <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow text-green">
              Ohio job data{updated ? ` · updated ${updated}` : ""}
            </p>
            <h1 className="display mt-1">Careers in Ohio.</h1>
            <p className="lead mt-3">
              What each job pays here, whether it is growing, how many openings there are each year,
              and how long it takes to train. Start with what you are like, or pick a career area.
            </p>
          </div>
          <img
            src="/passport/grades-9-12.webp"
            alt=""
            width={220}
            height={130}
            className="hidden h-[130px] w-auto object-contain md:block"
            loading="lazy"
          />
        </div>

        {/* Way in 1: traits */}
        <section className="mt-10" aria-labelledby="traits-h">
          <p className="eyebrow text-green">Way in 1</p>
          <h2 id="traits-h" className="mt-1 font-display text-2xl font-bold">
            What are you like?
          </h2>
          <p className="mt-1 text-sm text-ink-700">
            Pick one to three. Jobs that fit how you're wired rise to the top.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {RIASEC_LETTERS.map((l) => {
              const on = traits.includes(l);
              return (
                <li key={l}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleTrait(l)}
                    className={`flex min-h-[44px] w-full flex-col items-start gap-0.5 rounded-[var(--radius-card)] border px-4 py-3 text-left transition-colors ${
                      on ? PILL_ON : PILL_OFF
                    }`}
                  >
                    <span className="font-display text-lg font-semibold leading-tight">
                      {TRAITS[l].name}
                    </span>
                    <span className={`text-sm ${on ? "text-paper" : "text-ink-700"}`}>
                      I like to {TRAITS[l].verb}.
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Way in 2: career areas */}
        <section className="mt-10" aria-labelledby="areas-h">
          <p className="eyebrow text-green">Way in 2</p>
          <h2 id="areas-h" className="mt-1 font-display text-2xl font-bold">
            Pick a career area.
          </h2>
          {!data ? (
            <CareersLoading className="mt-4" />
          ) : (
            <>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.interests.map((g) => {
                  const on = search.interest === g.id;
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setSearch({ interest: on ? "" : g.id, cluster: "" })}
                        className={`flex h-full min-h-[44px] w-full flex-col gap-1 rounded-[var(--radius-card)] border p-4 text-left shadow-card transition-colors ${
                          on
                            ? "border-emerald bg-mint-tint"
                            : "border-line bg-paper-raised hover:border-emerald"
                        }`}
                      >
                        <span className="font-display text-lg font-semibold leading-tight">
                          {g.name}
                        </span>
                        <span className="text-sm text-ink-700">{g.blurb}</span>
                        <span className="mt-auto font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-green">
                          {g.examples}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-5 text-sm text-ink-700">Or one of Ohio's sixteen career clusters:</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {data.clusters.map((c) => {
                  const on = search.cluster === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setSearch({ cluster: on ? "" : c.id, interest: "" })}
                        className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium transition-colors ${
                          on ? PILL_ON : PILL_OFF
                        }`}
                      >
                        {c.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {/* Results */}
        <section className="mt-12 border-t border-line pt-8" aria-labelledby="results-h">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-green">
                {data ? `${results.length.toLocaleString("en-US")} jobs` : "Jobs"}
              </p>
              <h2 id="results-h" className="mt-1 font-display text-2xl font-bold">
                {traits.length
                  ? `Jobs that fit ${traits.map((l) => TRAITS[l].name).join(" + ")}.`
                  : search.interest && data
                    ? `${data.interests.find((g) => g.id === search.interest)?.name ?? ""} jobs.`
                    : search.cluster && data
                      ? `${data.clusters.find((c) => c.id === search.cluster)?.name ?? ""}.`
                      : "Every Ohio job."}
              </h2>
            </div>
          </div>

          <form
            className="mt-5 grid gap-3 rounded-[var(--radius-card)] border border-line bg-paper-raised p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto]"
            onSubmit={(e) => e.preventDefault()}
          >
            <div>
              <label className="label" htmlFor="careers-q">
                Search by title
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
                  aria-hidden
                />
                <input
                  id="careers-q"
                  type="search"
                  className="field min-h-[44px] pl-9"
                  placeholder="Nurse, welder, designer…"
                  value={search.q ?? ""}
                  onChange={(e) => setSearch({ q: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="careers-edu">
                Education
              </label>
              <select
                id="careers-edu"
                className="field min-h-[44px]"
                value={education}
                onChange={(e) => {
                  setEducation(e.target.value as EducationBucket | "any");
                  setShown(PAGE);
                }}
              >
                <option value="any">Any level</option>
                <option value="two_year_or_less">Two-year degree or less</option>
                <option value="four_year">Four-year degree</option>
                <option value="graduate">Graduate degree</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="careers-sort">
                Sort by
              </label>
              <select
                id="careers-sort"
                className="field min-h-[44px]"
                value={effectiveSort}
                onChange={(e) => {
                  setSort(e.target.value as Sort);
                  setShown(PAGE);
                }}
              >
                {traits.length > 0 && <option value="fit">Best fit</option>}
                <option value="pay">Pay</option>
                <option value="growth">Growth</option>
                <option value="openings">Openings</option>
              </select>
            </div>
            <label className="flex min-h-[44px] items-center gap-2 self-end text-sm text-ink-700">
              <input
                type="checkbox"
                className="h-5 w-5 accent-green-deep"
                checked={aboveMedian}
                onChange={(e) => {
                  setAboveMedian(e.target.checked);
                  setShown(PAGE);
                }}
              />
              Pays above Ohio median
            </label>
          </form>

          {!data ? (
            <CareersLoading className="mt-6" />
          ) : results.length === 0 ? (
            <p className="mt-6 rounded-[var(--radius-control)] border border-dashed border-line-strong p-5 text-sm text-ink-700">
              No jobs match all of that. Try fewer filters or a different search.
            </p>
          ) : (
            <>
              <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visible.map(({ career, fit }) => (
                  <CareerCard
                    key={career.soc}
                    career={career}
                    data={data}
                    fit={fit}
                    highlight={traits}
                  />
                ))}
              </ul>
              {results.length > shown && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setShown((n) => n + PAGE)}
                    className="btn-ghost"
                  >
                    Show more ({results.length - shown} left)
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {data && (
          <p className="mt-12 text-xs text-ink-500">
            Sources: {data.meta.ohioProjections}; Ohio wages {data.meta.wageYear}; interest profiles
            from {data.meta.riasecSource}. Starting pay is an estimate (about 70% of the median).
          </p>
        )}
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );
}
