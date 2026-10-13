import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { RIASEC, type RIASECCode } from "@/lib/riasec";
import {
  clusterName,
  codeLetters,
  educationShort,
  formatOpenings,
  formatPay,
  growthLabel,
  startingPay,
  TAG_LABEL,
  TRAITS,
  type OhioCareer,
  type OhioCareersData,
} from "@/lib/ohio-careers";

/**
 * Small, shared pieces for every Ohio careers surface: the growth chip, the
 * three RIASEC letter chips, the full list card on /careers, and the compact
 * row used on the passport, results, and family views. Passport tokens only;
 * RIASEC colors come from riasec.ts.
 */

const GROWTH_TONE: Record<"up" | "flat" | "down", string> = {
  up: "bg-mint-tint text-green-deep",
  flat: "bg-paper-sunken text-ink-700",
  down: "bg-gold-tint text-gold-deep",
};

export function GrowthChip({ pct, className = "" }: { pct: number | null; className?: string }) {
  const g = growthLabel(pct);
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.06em] ${GROWTH_TONE[g.tone]} ${className}`}
    >
      {g.label}
    </span>
  );
}

/** The job's Holland code as three letter chips; `highlight` letters get a solid ring. */
export function CodeChips({
  code,
  highlight = [],
  withNames = false,
  size = "sm",
}: {
  code: string | null | undefined;
  highlight?: RIASECCode[];
  withNames?: boolean;
  size?: "sm" | "lg";
}) {
  const letters = codeLetters(code);
  if (!letters.length) return null;
  const label = letters.map((l) => `${l} ${TRAITS[l].name}`).join(", ");
  return (
    <span
      className="inline-flex flex-wrap items-center gap-1.5"
      aria-label={`Interest code ${label}`}
    >
      {letters.map((l) => {
        const hit = highlight.includes(l);
        return (
          <span
            key={l}
            aria-hidden
            className={`inline-flex items-center gap-1 rounded-full font-mono font-semibold ${
              size === "lg" ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-[11px]"
            }`}
            style={{
              background: RIASEC[l].colorSoft,
              color: RIASEC[l].ink,
              boxShadow: hit ? `inset 0 0 0 2px ${RIASEC[l].color}` : undefined,
            }}
          >
            {l}
            {withNames && <span className="font-sans font-medium">{TRAITS[l].name}</span>}
          </span>
        );
      })}
    </span>
  );
}

export function CareersLoading({ className = "" }: { className?: string }) {
  return (
    <p role="status" className={`text-sm text-ink-500 ${className}`}>
      Loading Ohio job data…
    </p>
  );
}

/** Full card on the /careers list. */
export function CareerCard({
  career,
  data,
  fit,
  highlight = [],
}: {
  career: OhioCareer;
  data: OhioCareersData;
  fit?: number;
  highlight?: RIASECCode[];
}) {
  const start = startingPay(career.wageAnnual);
  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-green">
            {clusterName(data, career.cluster)}
          </p>
          <h3 className="mt-1 font-display text-xl font-bold leading-tight">
            <Link
              to="/careers/$soc"
              params={{ soc: career.soc }}
              className="inline-flex min-h-[44px] items-center hover:text-green-deep hover:underline"
            >
              {career.title}
            </Link>
          </h3>
        </div>
        {fit != null && (
          <span className="rounded-full border border-line bg-paper px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-ink-700">
            {Math.round(fit * 100)}% fit
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="label mb-0">Ohio typical pay</dt>
          <dd className="font-display text-lg font-semibold text-ink-900">
            {formatPay(career.wageAnnual)}
            <span className="text-sm font-normal text-ink-500">/yr</span>
          </dd>
        </div>
        <div>
          <dt className="label mb-0">Starts around</dt>
          <dd className="text-ink-700">
            {formatPay(start)}
            <span className="text-ink-500">/yr</span>
          </dd>
        </div>
        <div>
          <dt className="label mb-0">Openings</dt>
          <dd className="text-ink-700">{formatOpenings(career.openings)}</dd>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <dt className="label mb-0">Education</dt>
          <dd className="text-ink-700">{educationShort(career.education)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <GrowthChip pct={career.changePct} />
        {career.tags.slice(0, 2).map((t) => (
          <span
            key={t}
            className="rounded-full border border-line bg-paper px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-ink-700"
          >
            {TAG_LABEL[t]}
          </span>
        ))}
        <span className="ml-auto">
          <CodeChips code={career.riasec?.code} highlight={highlight} />
        </span>
      </div>
    </li>
  );
}

/** Compact row: title, pay, growth. Used on the passport sheet, results, and family views. */
export function CareerRow({
  career,
  data,
  extra,
}: {
  career: OhioCareer;
  data?: OhioCareersData;
  /** One more line under the title (e.g. training time for families). */
  extra?: string;
}) {
  return (
    <li>
      <Link
        to="/careers/$soc"
        params={{ soc: career.soc }}
        className="flex min-h-[44px] items-center gap-3 rounded-[var(--radius-control)] border border-line bg-paper px-4 py-3 hover:border-emerald focus-visible:border-emerald"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-display text-[17px] font-semibold leading-tight">
            {career.title}
          </span>
          <span className="text-sm text-ink-700">
            {formatPay(career.wageAnnual)}/yr
            {data ? ` · ${clusterName(data, career.cluster)}` : ""}
            {extra ? ` · ${extra}` : ""}
          </span>
        </span>
        <GrowthChip pct={career.changePct} className="hidden sm:inline-flex" />
        <ChevronRight className="h-[18px] w-[18px] shrink-0 text-ink-500" aria-hidden />
      </Link>
    </li>
  );
}
