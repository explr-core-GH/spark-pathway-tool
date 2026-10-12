import { RIASEC, type RIASECCode } from "@/lib/riasec";

/**
 * Exposure sticker (awareness / exploration stage). Colored by RIASEC module,
 * the one place outside assessment results where the six hues appear.
 * Never carries a verified mark or a competency rating.
 */
export function Sticker({
  module,
  label,
  className = "",
}: {
  module: RIASECCode;
  label: string;
  className?: string;
}) {
  const d = RIASEC[module];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[12px] font-medium uppercase leading-none tracking-[0.08em] ${className}`}
      style={{ background: d.colorSoft, borderColor: `${d.color}59`, color: d.ink }}
    >
      <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
      {label}
    </span>
  );
}
