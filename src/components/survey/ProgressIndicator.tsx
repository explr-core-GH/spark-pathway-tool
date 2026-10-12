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
      <div className="flex items-baseline justify-between font-mono text-xs text-ink-500">
        <span>
          Step {current} of {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-paper-sunken">
        <div className="h-full rounded-full bg-green transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
