import { useId, type ReactNode } from "react";
import { wordCount } from "@/lib/hs-application/validate";

/**
 * Small, accessible form controls for the internship application.
 * Every control: a visible label, 44px tap targets, errors announced and
 * tied to the control with aria-describedby.
 */

function Help({ id, help, error }: { id: string; help?: ReactNode; error?: string }) {
  return (
    <>
      {help && (
        <p id={`${id}-help`} className="mt-1 text-xs text-ink-700">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </>
  );
}

const describedBy = (id: string, help?: unknown, error?: string) =>
  [help ? `${id}-help` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;

function LabelText({ label, required }: { label: ReactNode; required?: boolean }) {
  return (
    <>
      {label}
      {required ? (
        <span aria-hidden="true" className="text-red-700">
          {" "}
          *
        </span>
      ) : (
        <span className="ml-1 normal-case tracking-normal text-ink-500">(optional)</span>
      )}
    </>
  );
}

export function TextField(props: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: "text" | "email" | "tel" | "date" | "number";
  help?: ReactNode;
  error?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={props.className}>
      <label className="label" htmlFor={id}>
        <LabelText label={props.label} required={props.required} />
      </label>
      <input
        id={id}
        className="field min-h-[44px]"
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        aria-invalid={!!props.error || undefined}
        aria-required={props.required || undefined}
        aria-describedby={describedBy(id, props.help, props.error)}
        autoComplete={props.autoComplete}
        inputMode={props.inputMode}
        placeholder={props.placeholder}
      />
      <Help id={id} help={props.help} error={props.error} />
    </div>
  );
}

export function TextArea(props: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  help?: ReactNode;
  error?: string;
  minWords?: number;
  maxWords?: number;
  rows?: number;
  className?: string;
}) {
  const id = useId();
  const n = wordCount(props.value);
  const over = props.maxWords !== undefined && n > props.maxWords;
  return (
    <div className={props.className}>
      <label className="label" htmlFor={id}>
        <LabelText label={props.label} required={props.required} />
      </label>
      <textarea
        id={id}
        className="field"
        rows={props.rows ?? 5}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        aria-invalid={!!props.error || undefined}
        aria-describedby={[describedBy(id, props.help, props.error), `${id}-count`]
          .filter(Boolean)
          .join(" ")}
      />
      {(props.minWords || props.maxWords) && (
        <p
          id={`${id}-count`}
          aria-live="polite"
          className={`mt-1 text-xs ${over ? "text-red-700" : "text-ink-500"}`}
        >
          {n} words
          {props.minWords && props.maxWords
            ? ` · aim for ${props.minWords}–${props.maxWords}`
            : props.maxWords
              ? ` · up to ${props.maxWords}`
              : ""}
        </p>
      )}
      <Help id={id} help={props.help} error={props.error} />
    </div>
  );
}

export function SelectField(props: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  required?: boolean;
  error?: string;
  help?: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={props.className}>
      <label className="label" htmlFor={id}>
        <LabelText label={props.label} required={props.required} />
      </label>
      <select
        id={id}
        className="field min-h-[44px]"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        aria-invalid={!!props.error || undefined}
        aria-describedby={describedBy(id, props.help, props.error)}
      >
        <option value="">Choose…</option>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Help id={id} help={props.help} error={props.error} />
    </div>
  );
}

/** One-choice pill buttons (radio group). */
export function Choice<T extends string | number | boolean>(props: {
  legend: ReactNode;
  value: T | null | undefined;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  required?: boolean;
  error?: string;
  help?: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <fieldset
      className={props.className}
      aria-describedby={describedBy(id, props.help, props.error)}
      aria-invalid={!!props.error || undefined}
    >
      <legend className="label">
        <LabelText label={props.legend} required={props.required} />
      </legend>
      <div className="flex flex-wrap gap-2">
        {props.options.map((o) => {
          const on = props.value === o.value;
          return (
            <label
              key={String(o.value)}
              className={`flex min-h-[44px] cursor-pointer items-center rounded-[var(--radius-control)] border px-4 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-green-deep ${
                on
                  ? "border-ink-900 bg-ink-900 text-paper"
                  : "border-line bg-paper-raised text-ink-900 hover:border-ink-900"
              }`}
            >
              <input
                type="radio"
                name={id}
                className="sr-only"
                checked={on}
                onChange={() => props.onChange(o.value)}
              />
              {o.label}
            </label>
          );
        })}
      </div>
      <Help id={id} help={props.help} error={props.error} />
    </fieldset>
  );
}

export const YES_NO = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
] as const;

/** Multi-select pills (checkbox group). */
export function MultiChoice(props: {
  legend: ReactNode;
  values: string[];
  onChange: (v: string[]) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  required?: boolean;
  error?: string;
  help?: ReactNode;
  max?: number;
  className?: string;
}) {
  const id = useId();
  const toggle = (v: string) => {
    if (props.values.includes(v)) props.onChange(props.values.filter((x) => x !== v));
    else if (!props.max || props.values.length < props.max) props.onChange([...props.values, v]);
  };
  return (
    <fieldset
      className={props.className}
      aria-describedby={describedBy(id, props.help, props.error)}
    >
      <legend className="label">
        <LabelText label={props.legend} required={props.required} />
      </legend>
      <div className="flex flex-wrap gap-2">
        {props.options.map((o) => {
          const on = props.values.includes(o.value);
          return (
            <label
              key={o.value}
              className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border px-4 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-green-deep ${
                on
                  ? "border-green-deep bg-mint-tint text-green-deep"
                  : "border-line bg-paper-raised text-ink-900 hover:border-ink-900"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={() => toggle(o.value)}
              />
              <span aria-hidden="true">{on ? "✓" : "+"}</span>
              {o.label}
            </label>
          );
        })}
      </div>
      <Help id={id} help={props.help} error={props.error} />
    </fieldset>
  );
}

/** A 1-5 scale between two labelled ends. */
export function ScaleSlider(props: {
  left: string;
  right: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <fieldset>
      <legend className="sr-only">
        {props.left} or {props.right}
      </legend>
      <div className="flex items-center justify-between gap-3 text-sm font-medium">
        <span>{props.left}</span>
        <span className="text-right">{props.right}</span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = props.value === n;
          const label =
            n === 1
              ? `Strongly ${props.left}`
              : n === 2
                ? `Leaning ${props.left}`
                : n === 3
                  ? "In the middle"
                  : n === 4
                    ? `Leaning ${props.right}`
                    : `Strongly ${props.right}`;
          return (
            <label
              key={n}
              className={`grid min-h-[44px] cursor-pointer place-items-center rounded-[var(--radius-control)] border text-sm transition-colors focus-within:ring-2 focus-within:ring-green-deep ${
                on
                  ? "border-ink-900 bg-ink-900 text-paper"
                  : "border-line bg-paper-raised hover:border-ink-900"
              }`}
            >
              <input
                type="radio"
                name={id}
                className="sr-only"
                checked={on}
                onChange={() => props.onChange(n)}
                aria-label={label}
              />
              <span aria-hidden="true">{n === 3 ? "•" : n < 3 ? "←" : "→"}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Section(props: { title: ReactNode; children: ReactNode; lead?: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card sm:p-6">
      <h2 className="font-display text-xl font-semibold">{props.title}</h2>
      {props.lead && <p className="mt-1 text-sm text-ink-700">{props.lead}</p>}
      <div className="mt-5 grid gap-5">{props.children}</div>
    </section>
  );
}
