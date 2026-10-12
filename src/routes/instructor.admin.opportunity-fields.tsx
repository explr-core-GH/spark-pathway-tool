import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OPP_TYPES, type FieldConfig, type OppType } from "@/lib/opportunities";

export const Route = createFileRoute("/instructor/admin/opportunity-fields")({
  head: () => ({ meta: [{ title: "Wizard fields — Admin" }] }),
  component: WizardFields,
});

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

const FIELD_TYPES = ["text", "textarea", "number", "select", "checkbox", "date"] as const;

function WizardFields() {
  const [type, setType] = useState<OppType>("camp");
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // add-custom form
  const [label, setLabel] = useState("");
  const [ftype, setFtype] = useState<(typeof FIELD_TYPES)[number]>("text");
  const [options, setOptions] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await sb("opportunity_form_fields")
      .select("*")
      .eq("opportunity_type", type)
      .order("sort_order");
    setFields((data as FieldConfig[]) ?? []);
    setLoading(false);
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, changes: Partial<FieldConfig>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...changes } : f)));
    const { error } = await sb("opportunity_form_fields").update(changes).eq("id", id);
    if (error) alert(error.message);
  }

  async function move(f: FieldConfig, dir: -1 | 1) {
    const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order);
    const i = sorted.findIndex((x) => x.id === f.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[i];
    const b = sorted[j];
    await Promise.all([
      sb("opportunity_form_fields").update({ sort_order: b.sort_order }).eq("id", a.id),
      sb("opportunity_form_fields").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    load();
  }

  async function remove(f: FieldConfig) {
    if (f.is_core) return;
    if (!confirm(`Delete the custom field “${f.label}”?`)) return;
    const { error } = await sb("opportunity_form_fields").delete().eq("id", f.id);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  }

  async function addCustom() {
    const key = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!key) return;
    const maxOrder = fields.reduce((m, f) => Math.max(m, f.sort_order), 0);
    const { error } = await sb("opportunity_form_fields").insert({
      opportunity_type: type,
      field_key: `custom_${key}`,
      label: label.trim(),
      field_type: ftype,
      options:
        ftype === "select"
          ? options
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
      required: false,
      enabled: true,
      sort_order: maxOrder + 10,
      is_core: false,
    });
    if (error) {
      alert(error.message);
      return;
    }
    setLabel("");
    setOptions("");
    setFtype("text");
    load();
  }

  return (
    <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Wizard fields</h1>
      <p className="lead mt-3 max-w-2xl">
        Control what the organization wizard asks for each opportunity type — toggle core steps
        on/off, rename them, mark them required, reorder, and add your own custom fields.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {OPP_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            aria-pressed={type === t.key}
            className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium ${type === t.key ? "border-ink-900 bg-ink-900 text-paper" : "border-line-strong text-ink-700 hover:border-ink-900 hover:text-ink-900"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p role="status" className="mt-8 text-sm text-ink-500">
          Loading…
        </p>
      ) : (
        <div className="mt-6 space-y-2">
          {[...fields]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((f) => (
              <div
                key={f.id}
                className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => move(f, -1)}
                      className="grid h-8 w-10 place-items-center rounded-[6px] text-ink-500 hover:bg-paper-sunken hover:text-ink-900"
                      aria-label={`Move ${f.label} up`}
                    >
                      <ChevronUp className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(f, 1)}
                      className="grid h-8 w-10 place-items-center rounded-[6px] text-ink-500 hover:bg-paper-sunken hover:text-ink-900"
                      aria-label={`Move ${f.label} down`}
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <input
                    className="field flex-1 min-w-[180px]"
                    aria-label={`Label for the ${f.field_key} field`}
                    value={f.label}
                    onChange={(e) =>
                      setFields((prev) =>
                        prev.map((x) => (x.id === f.id ? { ...x, label: e.target.value } : x)),
                      )
                    }
                    onBlur={(e) => patch(f.id, { label: e.target.value })}
                  />
                  <span className="rounded-full bg-paper-sunken px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-700">
                    {f.is_core ? "core" : "custom"} · {f.field_type}
                  </span>
                  <label className="flex min-h-[44px] items-center gap-1.5 text-xs text-ink-700">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-green"
                      checked={f.enabled}
                      onChange={(e) => patch(f.id, { enabled: e.target.checked })}
                    />
                    Shown
                  </label>
                  <label className="flex min-h-[44px] items-center gap-1.5 text-xs text-ink-700">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-green"
                      checked={f.required}
                      onChange={(e) => patch(f.id, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  {!f.is_core && (
                    <button
                      type="button"
                      onClick={() => remove(f)}
                      className="inline-flex min-h-[44px] items-center text-xs text-red-700 hover:underline"
                    >
                      Delete<span className="sr-only"> {f.label}</span>
                    </button>
                  )}
                </div>
                <input
                  className="field mt-2 text-xs"
                  aria-label={`Help text for ${f.label} (optional)`}
                  placeholder="Help text (optional)"
                  value={f.help_text ?? ""}
                  onChange={(e) =>
                    setFields((prev) =>
                      prev.map((x) => (x.id === f.id ? { ...x, help_text: e.target.value } : x)),
                    )
                  }
                  onBlur={(e) => patch(f.id, { help_text: e.target.value || null })}
                />
              </div>
            ))}
        </div>
      )}

      {/* Add custom field */}
      <section className="mt-10 rounded-[var(--radius-card)] border border-line bg-paper-raised p-6">
        <h2 className="font-display text-2xl font-bold">Add a custom field</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
          <input
            className="field"
            aria-label="New field label"
            placeholder="Field label (e.g. Bus provided?)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <select
            className="field"
            aria-label="New field type"
            value={ftype}
            onChange={(e) => setFtype(e.target.value as typeof ftype)}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addCustom}
            disabled={!label.trim()}
            className="btn-ink text-sm disabled:opacity-40"
          >
            Add field
          </button>
        </div>
        {ftype === "select" && (
          <input
            className="field mt-3"
            aria-label="Options, comma-separated"
            placeholder="Options, comma-separated (e.g. Yes, No, Maybe)"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
          />
        )}
      </section>
    </main>
  );
}
