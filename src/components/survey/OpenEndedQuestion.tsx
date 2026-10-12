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
    <div className="border-b border-line py-5 last:border-b-0">
      <div className="flex gap-3">
        <span className="select-none text-sm font-semibold text-ink-500">{number}.</span>
        <label htmlFor={`open-${number}`} className="flex-1 text-sm leading-relaxed text-ink-900">
          {prompt}
          <span className="ml-1 text-xs text-ink-500">(optional)</span>
        </label>
      </div>
      <textarea
        id={`open-${number}`}
        className="field mt-3"
        rows={3}
        maxLength={MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer here…"
        aria-describedby={`open-${number}-count`}
      />
      <p id={`open-${number}-count`} className="mt-1 text-right text-[11px] text-ink-500">
        {value.length} / {MAX} characters
      </p>
    </div>
  );
}
