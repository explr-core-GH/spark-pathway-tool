import type { DemographicField } from "@/lib/explr-stem";

/**
 * DemographicsScreen — the first survey screen. Collects the demographic
 * fields from items.json that aren't already known: grade is prefilled
 * from the student's account and program is derived from the assignment,
 * so those are skipped here. Conditional fields (show_if) appear only
 * when their controlling answer matches.
 *
 * Demographic answers MAY be required (unlike Likert items); the runner
 * enforces nothing here beyond what the field set implies.
 */
export type DemographicValues = Record<string, string | string[]>;

// grade + program_name are handled by the runner (prefilled), never asked.
const SKIP_FIELDS = new Set(["grade", "program_name"]);

export function DemographicsScreen({
  fields,
  values,
  onChange,
}: {
  fields: DemographicField[];
  values: DemographicValues;
  onChange: (id: string, value: string | string[]) => void;
}) {
  const visible = fields.filter((f) => {
    if (SKIP_FIELDS.has(f.id)) return false;
    if (f.show_if) {
      return values[f.show_if.field] === f.show_if.value;
    }
    return true;
  });

  return (
    <div>
      <p className="eyebrow">About you</p>
      <h2 className="mt-1 text-2xl font-light">A few quick questions</h2>
      <p className="mt-3 text-sm text-charcoal-500">
        This helps us understand who&apos;s in the program. Your answers are
        never shown next to your name.
      </p>

      <div className="mt-6 space-y-6">
        {visible.map((f) => (
          <div key={f.id}>
            <label className="label">{f.label}</label>
            <div className="mt-1.5">{renderField(f, values, onChange)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderField(
  f: DemographicField,
  values: DemographicValues,
  onChange: (id: string, value: string | string[]) => void,
) {
  const v = values[f.id];

  if (f.type === "single_select" && f.options) {
    return (
      <div className="inline-flex flex-wrap gap-2">
        {f.options.map((opt) => {
          const on = v === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(f.id, opt)}
              className="border px-3 py-2 text-sm"
              style={
                on
                  ? { background: "var(--ink)", color: "var(--bg)", borderColor: "var(--ink)" }
                  : { borderColor: "var(--color-charcoal-200)" }
              }
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (f.type === "multi_select" && f.options) {
    const selected = Array.isArray(v) ? v : [];
    return (
      <div className="inline-flex flex-wrap gap-2">
        {f.options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() =>
                onChange(
                  f.id,
                  on ? selected.filter((x) => x !== opt) : [...selected, opt],
                )
              }
              className="border px-3 py-2 text-sm"
              style={
                on
                  ? { background: "var(--ink)", color: "var(--bg)", borderColor: "var(--ink)" }
                  : { borderColor: "var(--color-charcoal-200)" }
              }
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (f.type === "text_long") {
    return (
      <textarea
        className="field"
        rows={3}
        value={typeof v === "string" ? v : ""}
        onChange={(e) => onChange(f.id, e.target.value)}
      />
    );
  }

  if (f.type === "text_list") {
    const items = Array.isArray(v) ? v : ["", "", ""];
    const max = f.max_items ?? 3;
    return (
      <div className="space-y-2">
        {Array.from({ length: max }).map((_, i) => (
          <input
            key={i}
            className="field"
            value={items[i] ?? ""}
            placeholder={`#${i + 1}`}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(f.id, next);
            }}
          />
        ))}
      </div>
    );
  }

  // default: text / integer
  return (
    <input
      className="field"
      type={f.type === "integer" ? "number" : "text"}
      min={f.min}
      max={f.max}
      value={typeof v === "string" ? v : ""}
      onChange={(e) => onChange(f.id, e.target.value)}
    />
  );
}
