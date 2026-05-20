/**
 * ProgressIndicator — "Step X of Y" plus a bar. Shown on every survey
 * screen; survey length is a known drop-off driver and students perceive
 * a long survey as longer when they can't see the end.
 */
export function ProgressIndicator({
  current,
  total,
}: {
  current: number; // 1-based
  total: number;
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-charcoal-500">
        <span>
          Step {current} of {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full bg-charcoal-100">
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, background: "var(--ink)" }}
        />
      </div>
    </div>
  );
}
