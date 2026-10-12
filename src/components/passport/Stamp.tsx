import { Check, Circle } from "lucide-react";

type StampProps = {
  /** "verified" = frozen supervisor attestation. "self" = self-reported, never hidden, never upgraded. */
  kind?: "verified" | "self";
  label: string;
  /** Degrees of tilt. Verified stamps default to a slight tilt like a real stamp. */
  rotate?: number;
  className?: string;
};

/** Passport stamp. The verified mark only ever appears on items with a supervisor attestation. */
export function Stamp({ kind = "verified", label, rotate, className = "" }: StampProps) {
  const verified = kind === "verified";
  const tilt = rotate ?? (verified ? -3 : 0);
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-[var(--radius-stamp)] border-2 bg-paper-raised/70 px-3 py-1.5 font-mono text-[13px] font-medium uppercase leading-none tracking-[0.06em] ${
        verified ? "border-green text-green" : "border-dashed border-stamp-self text-stamp-self"
      } ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {verified ? (
        <Check className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
      ) : (
        <Circle className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
      )}
      <span>
        <span className="sr-only">{verified ? "Verified: " : "Self-reported: "}</span>
        {label}
      </span>
    </span>
  );
}
