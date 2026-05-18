import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Internship } from "@/lib/internships-catalog";
import type { RIASECCode } from "@/lib/riasec";

export type ScaleScores = Partial<Record<RIASECCode, number>>;

export const RIASEC_LABELS: Record<RIASECCode, string> = {
  R: "hands-on building and making",
  I: "investigating and problem-solving",
  A: "creative and expressive work",
  S: "helping and connecting with people",
  E: "leading and persuading others",
  C: "organizing details and systems",
};

export const RIASEC_NAMES: Record<RIASECCode, string> = {
  R: "Realistic", I: "Investigative", A: "Artistic",
  S: "Social", E: "Enterprising", C: "Conventional",
};

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function HollandLetter({ code }: { code: RIASECCode }) {
  const name = RIASEC_NAMES[code];
  const label = RIASEC_LABELS[code];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`${name} — ${label}`}
          className="inline-flex items-center justify-center rounded-sm border border-charcoal-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink hover:bg-charcoal-50 focus:outline-none focus:ring-1 focus:ring-ink"
          aria-label={`${name}: ${label}`}
          onClick={(e) => e.preventDefault()}
        >
          {code}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-56 text-xs">
        <p className="font-semibold text-ink">{code} — {name}</p>
        <p className="mt-1 text-charcoal-500">{label}</p>
      </PopoverContent>
    </Popover>
  );
}

export function buildWhyFits(
  i: Internship,
  interest: "yes" | "maybe" | "no" | undefined,
  scaleScores: ScaleScores,
  hollandCode: string | null,
): string | null {
  const studentLetters = new Set<string>(
    Object.keys(scaleScores).length > 0
      ? Object.entries(scaleScores)
          .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
          .slice(0, 3)
          .map(([k]) => k)
      : (hollandCode ?? "").split(""),
  );
  const matches = i.riasec.filter((c) => studentLetters.has(c));
  const interestBit =
    interest === "yes" ? "You said you're interested in this one" :
    interest === "maybe" ? "You marked this one as a maybe" : null;

  let hollandBit: string | null = null;
  if (matches.length > 0) {
    const traits = joinList(matches.map((c) => RIASEC_LABELS[c]));
    const letters = matches.map((c) => `${c} (${RIASEC_NAMES[c]})`).join(" / ");
    hollandBit = `it centers on ${traits} — a strong match for your top Holland ${matches.length > 1 ? "traits" : "trait"} ${letters}`;
  } else if (i.riasec.length > 0 && studentLetters.size > 0) {
    const traits = joinList(i.riasec.map((c) => RIASEC_LABELS[c]));
    hollandBit = `it focuses on ${traits}, which is outside your top Holland traits — a good stretch if you want to try something new`;
  }

  if (!interestBit && !hollandBit) return null;
  if (interestBit && hollandBit) return `${interestBit}, and ${hollandBit}.`;
  return `${interestBit ?? hollandBit}.`;
}
