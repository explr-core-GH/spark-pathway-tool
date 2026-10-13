import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter } from "@/components/SiteFooter";
import { CareersLoading, CodeChips, GrowthChip } from "@/components/careers/CareerBits";
import { CareersHeader, useViewer } from "@/components/careers/CareersHeader";
import { usePassport } from "@/lib/passport";
import { schoolYear } from "@/lib/checkpoints";
import { oppTypeMeta } from "@/lib/opportunities";
import {
  careerBySoc,
  clusterName,
  codeLetters,
  DATA_CLUSTER_TO_PATHWAYS,
  educationShort,
  formatGrowth,
  formatOpenings,
  formatPay,
  jobZoneLabel,
  kidCareerFor,
  matchCareers,
  startingPay,
  trainingTime,
  TRAITS,
  useOhioCareers,
} from "@/lib/ohio-careers";

/**
 * /careers/$soc — one Ohio job: what it pays here, whether it is growing,
 * how you get there (CSU and Tri-C programs), whether it fits the signed-in
 * student's code, the kid card when one exists, and opportunities on this
 * site that lead toward it.
 */
export const Route = createFileRoute("/careers/$soc")({
  head: () => ({ meta: [{ title: "Career — EXPLR Pathways" }] }),
  component: CareerDetail,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

type OppLite = {
  id: string;
  name: string | null;
  org_name: string | null;
  type: string;
  riasec_code: string | null;
  created_at: string;
};

function CareerDetail() {
  const { soc } = Route.useParams();
  const data = useOhioCareers();
  const { user, isStudent } = useViewer();
  const { data: passport } = usePassport(isStudent && user ? user.id : null);
  const [opps, setOpps] = useState<OppLite[] | null>(null);
  const [goalState, setGoalState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [goalError, setGoalError] = useState<string | null>(null);

  const career = data ? careerBySoc(data, soc) : undefined;
  const kid = data && career ? kidCareerFor(data, career) : undefined;
  const jobLetters = codeLetters(career?.riasec?.code);

  // Set the tab title once we know the job.
  useEffect(() => {
    if (career) document.title = `${career.title} — Careers in Ohio — EXPLR Pathways`;
  }, [career]);

  // Opportunities on this site that share the job's lead interest letter,
  // newest first. The opportunities table has no career-cluster column, so
  // the link is made through riasec_code.
  useEffect(() => {
    if (!career?.riasec) {
      setOpps([]);
      return;
    }
    let active = true;
    sb("opportunities")
      .select("id, name, org_name, type, riasec_code, created_at")
      .eq("status", "approved")
      .not("riasec_code", "is", null)
      .order("created_at", { ascending: false })
      .limit(80)
      .then(({ data: rows }: { data: OppLite[] | null }) => {
        if (!active) return;
        const primary = career.riasec!.primary;
        const want = new Set(jobLetters);
        const list = (rows ?? [])
          .map((o) => {
            const letters = codeLetters(o.riasec_code);
            const shared = letters.filter((l) => want.has(l)).length;
            const lead = letters[0] === primary ? 1 : 0;
            return { o, score: shared * 2 + lead };
          })
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((x) => x.o);
        setOpps(list);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [career?.soc]);

  // Fit for the signed-in student: cosine fit and the letters they share.
  const fit = useMemo(() => {
    if (!data || !career || !passport?.hollandCode) return null;
    const m = matchCareers(
      data,
      { code: passport.hollandCode },
      { limit: data.occupations.length, minFit: 0 },
    ).find((x) => x.career.soc === career.soc);
    return m ? { pct: Math.round(m.fit * 100), shared: m.shared } : null;
  }, [data, career, passport?.hollandCode]);

  async function setGoal() {
    if (!user || !career) return;
    setGoalState("saving");
    setGoalError(null);
    try {
      const sy = schoolYear();
      const { data: cps } = await sb("checkpoints")
        .select("id, term, status")
        .eq("student_id", user.id)
        .eq("school_year", sy);
      const rows = (cps ?? []) as Array<{ id: string; term: string; status: string }>;
      const cp =
        rows.find((c) => c.term === "fall" && c.status === "open") ??
        rows.find((c) => c.status === "open") ??
        rows.find((c) => c.term === "fall") ??
        rows[0] ??
        null;
      const patch = {
        student_id: user.id,
        checkpoint_id: cp?.id ?? null,
        grade: passport?.grade ?? null,
        primary_goal: career.title,
        cluster: DATA_CLUSTER_TO_PATHWAYS[career.cluster] ?? null,
      };
      let q = sb("career_goals").select("id").eq("student_id", user.id);
      q = cp ? q.eq("checkpoint_id", cp.id) : q.is("checkpoint_id", null);
      const { data: existing } = await q.order("created_at", { ascending: false }).limit(1);
      const row = (existing ?? [])[0] as { id: string } | undefined;
      const { error } = row
        ? await sb("career_goals").update(patch).eq("id", row.id)
        : await sb("career_goals").insert(patch);
      if (error) throw new Error(error.message);
      setGoalState("saved");
    } catch (e) {
      setGoalError(e instanceof Error ? e.message : String(e));
      setGoalState("error");
    }
  }

  const explore = passport?.band === "explore";
  const shell = (children: React.ReactNode) => (
    <div
      className="min-h-screen bg-paper text-ink-900"
      data-density={explore ? "explore" : undefined}
    >
      <CareersHeader signedIn={!!user} isStudent={isStudent} />
      <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
        <Link
          to="/careers"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
        >
          ← All Ohio careers
        </Link>
        {children}
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );

  if (!data) {
    return shell(
      <>
        <h1 className="sr-only">Career</h1>
        <CareersLoading className="mt-6" />
      </>,
    );
  }
  if (!career) {
    return shell(
      <>
        <h1 className="mt-6 font-display text-3xl font-bold">We don't have that job.</h1>
        <p className="mt-2 text-ink-700">
          Try the{" "}
          <Link to="/careers" className="ink-link">
            full list of Ohio careers
          </Link>
          .
        </p>
      </>,
    );
  }

  const start = startingPay(career.wageAnnual);
  const names = jobLetters.map((l) => `${TRAITS[l].name}s`);
  const traitsLine =
    names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];

  return shell(
    <>
      {/* Title */}
      <p className="eyebrow mt-6 text-green">{clusterName(data, career.cluster)}</p>
      <h1 className="display mt-1">{career.title}</h1>
      <p className="lead mt-4 max-w-2xl">{career.desc}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <GrowthChip pct={career.changePct} />
        <CodeChips code={career.riasec?.code} withNames size="lg" highlight={fit?.shared ?? []} />
      </div>

      {/* Stats */}
      <dl className="mt-8 grid grid-cols-2 gap-x-4 gap-y-5 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card sm:grid-cols-3 lg:grid-cols-4">
        <Stat
          label={career.wageScope === "ohio" ? "Ohio typical pay" : "Typical pay (national)"}
          value={`${formatPay(career.wageAnnual)}/yr`}
          note={career.wageScope === "ohio" ? "Ohio median" : "Ohio figure not published"}
          big
        />
        <Stat label="Starts around" value={`${formatPay(start)}/yr`} note="estimate" />
        <Stat
          label="Growth 2022-2032"
          value={formatGrowth(career.changePct)}
          note={career.changePct == null ? "No projection" : "Ohio projection"}
        />
        <Stat label="Openings" value={formatOpenings(career.openings)} note="Ohio, all causes" />
        <Stat
          label="Working in Ohio"
          value={career.employment != null ? career.employment.toLocaleString("en-US") : "—"}
          note="people"
        />
        <Stat label="Education" value={educationShort(career.education)} />
        <Stat label="Preparation" value={jobZoneLabel(career.jobZone)} note="O*NET job zone" />
        {career.ai && (
          <Stat
            label="AI outlook"
            value={
              career.ai === "boost"
                ? "AI helps this work"
                : career.ai === "mixed"
                  ? "Mixed"
                  : "Exposed to automation"
            }
            note="EXPLR research rating"
          />
        )}
      </dl>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {/* How you get there */}
        <section aria-labelledby="path-h">
          <p className="eyebrow text-green">How you get there</p>
          <h2 id="path-h" className="mt-1 font-display text-2xl font-bold">
            {trainingTime(career.education)}.
          </h2>
          {career.programs.length === 0 ? (
            <p className="mt-3 text-sm text-ink-700">
              No matching CSU or Tri-C program is listed for this job. Ask an Instructor about
              apprenticeships, certificates, or on-the-job training.
            </p>
          ) : (
            <>
              <p className="mt-3 text-sm text-ink-700">Programs nearby:</p>
              <ul className="mt-2 flex flex-col gap-2">
                {career.programs.map((pr, i) => (
                  <li
                    key={`${pr.institution}-${pr.name}-${i}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-[var(--radius-control)] border border-line bg-paper px-4 py-3 text-sm"
                  >
                    <span className="font-medium">{pr.name}</span>
                    <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
                      {pr.institution} · {pr.credential}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Does it fit you? */}
        <section aria-labelledby="fit-h">
          <p className="eyebrow text-green">Does it fit you?</p>
          {isStudent && passport?.hollandCode && fit ? (
            <>
              <h2 id="fit-h" className="mt-1 font-display text-2xl font-bold">
                {fit.pct}% fit with your code {passport.hollandCode}.
              </h2>
              <p className="mt-3 text-sm text-ink-700">
                {fit.shared.length
                  ? `You share ${fit.shared.map((l) => TRAITS[l].name).join(" and ")} with this job. Highlighted letters are the ones you have in common.`
                  : "This job leans on interests that are not in your top three. That's fine — codes are a starting point, not a verdict."}
              </p>
              <div className="mt-3">
                <CodeChips code={career.riasec?.code} withNames size="lg" highlight={fit.shared} />
              </div>
            </>
          ) : (
            <>
              <h2 id="fit-h" className="mt-1 font-display text-2xl font-bold">
                {traitsLine ? `For ${traitsLine}.` : "Any interest type."}
              </h2>
              <p className="mt-3 text-sm text-ink-700">
                {jobLetters.length
                  ? `People in this job tend to like to ${jobLetters
                      .map((l) => TRAITS[l].verb)
                      .join(", ")}.`
                  : ""}{" "}
                Take the ten-minute interest assessment to see your own code and how well it
                matches.
              </p>
              <Link to="/assessment" className="btn-ghost mt-4">
                Take the RIASEC assessment
              </Link>
            </>
          )}

          {isStudent && user && (
            <div className="mt-5 border-t border-line pt-4">
              {goalState === "saved" ? (
                <p
                  role="status"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-control)] bg-mint-tint px-4 text-sm font-semibold text-green-deep"
                >
                  <Check className="h-4 w-4" aria-hidden /> Saved to your checkpoints
                </p>
              ) : (
                <button
                  type="button"
                  onClick={setGoal}
                  disabled={goalState === "saving"}
                  className="btn-ink"
                >
                  <Flag className="h-4 w-4" aria-hidden />
                  {goalState === "saving" ? "Saving…" : "Set as my career goal"}
                </button>
              )}
              {goalState === "error" && (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {goalError ?? "We couldn't save that."}
                </p>
              )}
              <p className="mt-2 text-xs text-ink-500">
                Goes on this year's checkpoint as your career goal. You can change it any time.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Kid card */}
      {kid && (
        <section className="mt-12 border-t border-line pt-8" aria-labelledby="kid-h">
          <p className="eyebrow text-green">
            <span aria-hidden>{kid.emoji} </span>
            {kid.name}
          </p>
          <h2 id="kid-h" className="mt-1 font-display text-2xl font-bold">
            {kid.tagline}
          </h2>
          <div className="mt-5 grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="font-display text-lg font-semibold">A day in the life</h3>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ink-700">
                {kid.dailyWork.map((d) => (
                  <li key={d} className="flex items-start gap-2">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-green" aria-hidden />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Subjects that help</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {kid.subjects.map((s) => (
                  <li
                    key={s}
                    className="rounded-full bg-paper-sunken px-3 py-1.5 text-sm text-ink-700"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">The path</h3>
              <ol className="mt-2 flex flex-col gap-1.5 text-sm text-ink-700">
                {kid.pathways.map((p, i) => (
                  <li key={p} className="flex items-start gap-2">
                    <span className="font-mono text-[11px] font-semibold leading-6 text-green">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {p}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* Experiences that lead here */}
      <section className="mt-12 border-t border-line pt-8" aria-labelledby="exp-h">
        <p className="eyebrow text-green">On this site</p>
        <h2 id="exp-h" className="mt-1 font-display text-2xl font-bold">
          Experiences that lead here.
        </h2>
        {opps === null ? (
          <p role="status" className="mt-3 text-sm text-ink-500">
            Loading opportunities…
          </p>
        ) : opps.length === 0 ? (
          <p className="mt-3 text-sm text-ink-700">
            No open opportunity matches this job's interests right now.{" "}
            <Link to="/opportunities" className="ink-link">
              Browse all opportunities
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {opps.map((o) => (
              <li key={o.id}>
                <Link
                  to="/opportunity/$id"
                  params={{ id: o.id }}
                  className="flex h-full min-h-[44px] flex-col gap-1 rounded-[var(--radius-card)] border border-line bg-paper-raised p-4 shadow-card hover:border-emerald focus-visible:border-emerald"
                >
                  <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-green">
                    {oppTypeMeta(o.type as never).label}
                    {o.riasec_code ? ` · ${o.riasec_code}` : ""}
                  </span>
                  <span className="font-display text-lg font-semibold leading-tight">
                    {o.name ?? "Opportunity"}
                  </span>
                  <span className="text-sm text-ink-700">{o.org_name ?? ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-12 text-xs text-ink-500">
        Sources: {data.meta.ohioProjections}; Ohio wages {data.meta.wageYear}
        {career.wageScope === "national" ? ` (national wage from ${data.meta.nationalSource})` : ""}
        ; interest profile from {data.meta.riasecSource}; programs from {data.meta.programsSource}.
        Starting pay is an estimate (about 70% of the median).
      </p>
    </>,
  );
}

function Stat({
  label,
  value,
  note,
  big,
}: {
  label: string;
  value: string;
  note?: string;
  big?: boolean;
}) {
  return (
    <div>
      <dt className="label mb-0">{label}</dt>
      <dd
        className={`mt-0.5 font-display font-semibold leading-tight ${big ? "text-2xl" : "text-lg"}`}
      >
        {value}
      </dd>
      {note && <dd className="text-xs text-ink-500">{note}</dd>}
    </div>
  );
}
