import { FastForward, Wand2 } from "lucide-react";

/** Shown only to demo accounts: fill with sample answers or jump ahead. */
export function DemoBar(props: {
  onFill: () => void;
  fillLabel: string;
  jumps?: Array<{ label: string; onClick: () => void }>;
}) {
  return (
    <div
      role="region"
      aria-label="Demo shortcuts"
      className="mt-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-gold bg-gold-tint px-4 py-3 text-sm"
    >
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-gold-deep">
        Demo only
      </span>
      <button type="button" className="btn-ghost bg-paper-raised py-2" onClick={props.onFill}>
        <Wand2 className="h-4 w-4" aria-hidden /> {props.fillLabel}
      </button>
      {props.jumps && props.jumps.length > 0 && (
        <>
          <span className="text-ink-700">Skip to:</span>
          {props.jumps.map((j) => (
            <button
              key={j.label}
              type="button"
              className="btn-ghost bg-paper-raised py-2"
              onClick={j.onClick}
            >
              <FastForward className="h-4 w-4" aria-hidden /> {j.label}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
