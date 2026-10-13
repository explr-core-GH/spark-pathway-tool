import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { GrowthChip } from "@/components/careers/CareerBits";
import {
  codeLetters,
  formatPay,
  matchCareers,
  startingPay,
  trainingTime,
  useOhioCareers,
} from "@/lib/ohio-careers";

/**
 * "Where this could lead" — the family-language block: for a student's
 * Holland code, the five best-fitting Ohio jobs with what they pay, where
 * they start, how long to train, and how many nearby programs lead there.
 * `compact` drops the eyebrow/heading so it can sit inside a results tab.
 */
export function FamilyCareers({
  code,
  firstName,
  compact = false,
  headingLevel = "h2",
}: {
  code: string;
  firstName?: string;
  compact?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const data = useOhioCareers();
  const letters = codeLetters(code);
  const Heading = headingLevel;
  const who = firstName ? `${firstName}'s` : "your student's";
  const top = data ? matchCareers(data, { code }, { limit: 5 }) : [];

  return (
    <section
      className={
        compact
          ? "mt-6 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card"
          : "mt-8 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card"
      }
      aria-labelledby={compact ? "family-careers-compact-h" : "family-careers-h"}
    >
      <p className="eyebrow text-green">Where this could lead</p>
      <Heading
        id={compact ? "family-careers-compact-h" : "family-careers-h"}
        className="mt-1 font-display text-2xl font-bold"
      >
        Ohio jobs that fit {who} code, {code}.
      </Heading>
      <p className="mt-2 max-w-2xl text-sm text-ink-700">
        What it pays, how long to train, and where to train nearby. These are real Ohio numbers, and
        a starting point for a conversation, not a plan.
      </p>
      {!data ? (
        <p role="status" className="mt-4 text-sm text-ink-500">
          Loading Ohio job data…
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {top.map(({ career: c }) => (
            <li key={c.soc}>
              <Link
                to="/careers/$soc"
                params={{ soc: c.soc }}
                className="flex min-h-[44px] flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-control)] border border-line bg-paper px-4 py-3 hover:border-emerald focus-visible:border-emerald"
              >
                <span className="flex min-w-0 flex-1 basis-[220px] flex-col">
                  <span className="font-display text-[17px] font-semibold leading-tight">
                    {c.title}
                  </span>
                  <span className="text-sm text-ink-700">
                    {trainingTime(c.education)}
                    {c.programs.length
                      ? ` · ${c.programs.length} nearby program${c.programs.length === 1 ? "" : "s"}`
                      : ""}
                  </span>
                </span>
                <span className="flex flex-col text-sm text-ink-700">
                  <span>
                    <span className="font-semibold text-ink-900">{formatPay(c.wageAnnual)}</span>
                    /yr typical
                  </span>
                  <span>starts around {formatPay(startingPay(c.wageAnnual))}/yr</span>
                </span>
                <GrowthChip pct={c.changePct} className="hidden sm:inline-flex" />
                <ChevronRight className="h-[18px] w-[18px] shrink-0 text-ink-500" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/careers"
        search={letters.length ? { traits: letters.join(",") } : {}}
        className="btn-ghost mt-4"
      >
        See all Ohio careers for {code}
      </Link>
    </section>
  );
}
