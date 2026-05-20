/**
 * OpenEndedQuestion — optional free-text response with a character
 * counter. Never blocks submission; the post-survey reflection prompts
 * are valuable for qualitative analysis but optional by design.
 */
const MAX = 1000;

export function OpenEndedQuestion({
  number,
  prompt,
  value,
  onChange,
}: {
  number: number;
  prompt: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="border-b border-charcoal-100 py-5 last:border-b-0">
      <div className="flex gap-3">
        <span className="select-none text-sm font-semibold text-charcoal-400">
          {number}.
        </span>
        <label className="flex-1 text-sm leading-relaxed text-ink">
          {prompt}
          <span className="ml-1 text-xs text-charcoal-400">(optional)</span>
        </label>
      </div>
      <textarea
        className="field mt-3"
        rows={3}
        maxLength={MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer here…"
      />
      <p className="mt-1 text-right text-[11px] text-charcoal-400">
        {value.length} / {MAX}
      </p>
    </div>
  );
}
