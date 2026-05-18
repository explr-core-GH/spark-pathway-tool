import { useMemo } from "react";

// Stored as smallint[] in Supabase: 0 = K, 1..12 = grade 1-12.
export const GRADE_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const GRADE_LABEL: Record<number, string> = {
  0: "K", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6",
  7: "7", 8: "8", 9: "9", 10: "10", 11: "11", 12: "12",
};

type Props = {
  value: number[];
  onChange: (next: number[]) => void;
  className?: string;
};

export function GradeLevelPicker({ value, onChange, className }: Props) {
  const selected = useMemo(() => new Set(value), [value]);

  function toggle(g: number) {
    const next = new Set(selected);
    if (next.has(g)) next.delete(g);
    else next.add(g);
    onChange([...next].sort((a, b) => a - b));
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-1.5">
        {GRADE_VALUES.map((g) => {
          const on = selected.has(g);
          return (
            <button
              key={g}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(g)}
              className={
                on
                  ? "h-8 min-w-[2rem] border border-charcoal-700 bg-charcoal-700 px-2 text-sm font-semibold text-white"
                  : "h-8 min-w-[2rem] border border-charcoal-200 bg-white px-2 text-sm font-medium text-charcoal-600 hover:border-charcoal-700"
              }
            >
              {GRADE_LABEL[g]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
