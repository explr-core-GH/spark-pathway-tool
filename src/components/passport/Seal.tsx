type SealProps = {
  kind?: "readiness" | "credential" | "hours";
  value: string;
  caption: string;
  size?: number;
  className?: string;
};

/** Circular seal for credentials, Readiness Seal progress, and hours toward 250. Gold = seal/credential, green = hours. */
export function Seal({
  kind = "credential",
  value,
  caption,
  size = 96,
  className = "",
}: SealProps) {
  const hours = kind === "hours";
  const ring = hours ? "var(--color-green)" : "var(--color-gold)";
  return (
    <span
      className={`relative inline-flex shrink-0 flex-col items-center justify-center rounded-full bg-paper-raised ${className}`}
      style={{ width: size, height: size, border: `3px ${hours ? "solid" : "dotted"} ${ring}` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[6px] rounded-full border"
        style={{ borderColor: ring, opacity: 0.5 }}
      />
      <span
        className={`font-display text-xl font-semibold leading-none ${hours ? "text-green-deep" : "text-gold-deep"}`}
      >
        {value}
      </span>
      <span className="mt-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-700">
        {caption}
      </span>
    </span>
  );
}
