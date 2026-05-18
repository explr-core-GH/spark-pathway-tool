import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PROGRAM_TYPES, PROGRAM_META, type ProgramType } from "@/lib/educator";

/**
 * ProgramTypeTagPills — inline tag toggles for the seven program types.
 *
 * Reusable across the curriculum (camps) admin and the internships admin.
 * The kind prop picks the backing table and column; everything else is the
 * same UX: pill row, click to toggle, optimistic local state + immediate
 * write to Supabase. Read the current set from outside and pass it in via
 * `tags` so the parent stays the source of truth.
 */
export function ProgramTypeTagPills({
  kind,
  slug,
  tags,
  onChange,
  size = "sm",
}: {
  kind: "curriculum" | "internship";
  slug: string;
  tags: ProgramType[];
  onChange: (next: ProgramType[]) => void;
  size?: "sm" | "xs";
}) {
  const [busy, setBusy] = useState<ProgramType | null>(null);
  const table = kind === "curriculum" ? "curriculum_tags" : "internship_tags";
  const slugColumn = kind === "curriculum" ? "camp_slug" : "internship_slug";

  async function toggle(pt: ProgramType) {
    const has = tags.includes(pt);
    setBusy(pt);
    if (has) {
      onChange(tags.filter((t) => t !== pt));
      const { error } = await supabase
        .from(table as never)
        .delete()
        .eq(slugColumn, slug)
        .eq("program_type", pt);
      if (error) onChange([...tags]); // revert on failure
    } else {
      onChange([...tags, pt]);
      const { error } = await supabase.from(table as never).insert({
        [slugColumn]: slug,
        program_type: pt,
      } as never);
      if (error) onChange(tags.filter((t) => t !== pt));
    }
    setBusy(null);
  }

  const padding = size === "sm" ? "px-2 py-0.5" : "px-1.5 py-0.5 text-[10px]";

  return (
    <div className="flex flex-wrap gap-1">
      {PROGRAM_TYPES.map((pt) => {
        const on = tags.includes(pt);
        const m = PROGRAM_META[pt];
        return (
          <button
            key={pt}
            type="button"
            aria-pressed={on}
            disabled={busy === pt}
            onClick={() => toggle(pt)}
            className={
              on
                ? `inline-flex items-center gap-1 border border-ink bg-ink ${padding} text-xs font-semibold text-white disabled:opacity-60`
                : `inline-flex items-center gap-1 border border-charcoal-200 bg-white ${padding} text-xs font-medium text-charcoal-600 hover:border-ink disabled:opacity-60`
            }
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: m.accent }}
              aria-hidden
            />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
