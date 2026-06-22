import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  OPP_TYPES,
  oppTypeMeta,
  RIASEC_ACTIVITIES,
  RIASEC_INTRO,
  REQUIREMENT_PRESETS,
  WEEKDAYS,
  codeFromWeights,
  composeSchedule,
  emptyRiasecWeights,
  type AppLink,
  type FieldConfig,
  type OpportunityForm,
  type OppType,
} from "@/lib/opportunities";

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

type FormState = {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  days: string[];
  start_time: string;
  end_time: string;
  location: string;
  lat: number | null;
  lng: number | null;
  registration_mode: "internal" | "external";
  external_url: string;
  grade_min: string;
  grade_max: string;
  capacity: string;
  is_free: boolean;
  cost: string;
  image_url: string;
  weights: Record<string, number>;
  requirements: string[];
  application_links: AppLink[];
  custom: Record<string, unknown>;
};

const EMPTY: FormState = {
  name: "",
  description: "",
  start_date: "",
  end_date: "",
  days: [],
  start_time: "",
  end_time: "",
  location: "",
  lat: null,
  lng: null,
  registration_mode: "internal",
  external_url: "",
  grade_min: "",
  grade_max: "",
  capacity: "",
  is_free: true,
  cost: "",
  image_url: "",
  weights: emptyRiasecWeights(),
  requirements: [],
  application_links: [],
  custom: {},
};

type StepId =
  | "basics"
  | "when"
  | "where"
  | "who"
  | "interests"
  | "worksite"
  | "media"
  | "custom"
  | "review";
const CORE_STEPS: Array<{ id: StepId; title: string; keys: string[] }> = [
  { id: "basics", title: "The basics", keys: ["name", "description"] },
  { id: "when", title: "When", keys: ["dates", "schedule"] },
  { id: "where", title: "Where & registration", keys: ["location", "registration"] },
  { id: "who", title: "Who & cost", keys: ["grades", "capacity", "cost"] },
  { id: "interests", title: "Activities", keys: ["riasec"] },
  { id: "media", title: "Photo & logo", keys: ["image"] },
];

export function OpportunityWizard({
  orgId,
  orgName,
  logo,
  opportunityId,
}: {
  orgId: string;
  orgName: string;
  logo: string | null;
  opportunityId?: string;
}) {
  const navigate = useNavigate();
  const [type, setType] = useState<OppType | null>(null);
  const [oppId, setOppId] = useState<string>("");
  const [config, setConfig] = useState<FieldConfig[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [orgLogo, setOrgLogo] = useState<string | null>(logo);
  const [forms, setForms] = useState<OpportunityForm[]>([]);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(!!opportunityId);

  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  // Load config for a type.
  const loadConfig = useCallback(async (t: OppType) => {
    const { data } = await sb("opportunity_form_fields")
      .select("*")
      .eq("opportunity_type", t)
      .eq("enabled", true)
      .order("sort_order");
    setConfig((data as FieldConfig[]) ?? []);
  }, []);

  // Editing: hydrate from the existing row.
  useEffect(() => {
    if (!opportunityId) return;
    (async () => {
      const { data } = await sb("opportunities").select("*").eq("id", opportunityId).maybeSingle();
      if (!data) {
        setHydrating(false);
        return;
      }
      setOppId(data.id);
      setType(data.type);
      await loadConfig(data.type);
      setForm({
        name: data.name ?? "",
        description: data.description ?? "",
        start_date: data.start_date ?? "",
        end_date: data.end_date ?? "",
        days: data.schedule_json?.days ?? [],
        start_time: data.schedule_json?.start ?? "",
        end_time: data.schedule_json?.end ?? "",
        location: data.location ?? "",
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        registration_mode: data.registration_mode ?? "internal",
        external_url: data.external_url ?? "",
        grade_min: data.grade_min != null ? String(data.grade_min) : "",
        grade_max: data.grade_max != null ? String(data.grade_max) : "",
        capacity: data.capacity != null ? String(data.capacity) : "",
        is_free: data.is_free ?? true,
        cost: data.cost_cents ? String(data.cost_cents / 100) : "",
        image_url: data.image_url ?? "",
        weights: data.riasec_weights ?? emptyRiasecWeights(),
        requirements: data.requirements ?? [],
        application_links: data.application_links ?? [],
        custom: data.custom ?? {},
      });
      setHydrating(false);
    })();
  }, [opportunityId, loadConfig]);

  async function pickType(t: OppType) {
    const meta = oppTypeMeta(t);
    setType(t);
    setOppId(crypto.randomUUID());
    setForm((f) => ({
      ...f,
      grade_min: meta.gradeMin != null ? String(meta.gradeMin) : "",
      grade_max: meta.gradeMax != null ? String(meta.gradeMax) : "",
      registration_mode: meta.registrationLocked ? "internal" : f.registration_mode,
    }));
    await loadConfig(t);
    setStep(0);
  }

  const cfg = useMemo(() => {
    const m = new Map<string, FieldConfig>();
    for (const c of config) m.set(c.field_key, c);
    return m;
  }, [config]);
  const enabled = (key: string) => cfg.has(key);
  const labelOf = (key: string, fallback: string) => cfg.get(key)?.label ?? fallback;
  const helpOf = (key: string) => cfg.get(key)?.help_text ?? null;
  const customFields = useMemo(
    () => config.filter((c) => !c.is_core),
    [config],
  );

  // Build the active step list for this type.
  const steps = useMemo(() => {
    const out: Array<{ id: StepId; title: string }> = [];
    for (const s of CORE_STEPS) {
      if (s.id === "media") {
        out.push(s); // always present (org logo lives here too)
        continue;
      }
      if (s.keys.some((k) => enabled(k))) out.push({ id: s.id, title: s.title });
    }
    if (type === "internship") {
      const i = out.findIndex((s) => s.id === "media");
      const ws = { id: "worksite" as StepId, title: "Worksite & forms" };
      if (i >= 0) out.splice(i, 0, ws);
      else out.push(ws);
    }
    if (customFields.length > 0) out.push({ id: "custom", title: "More details" });
    out.push({ id: "review", title: "Review" });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, type]);

  const meta = type ? oppTypeMeta(type) : null;
  const code = codeFromWeights(form.weights);
  const weightTotal = Object.values(form.weights).reduce((a, b) => a + b, 0);

  async function uploadTo(path: string, file: File): Promise<string | null> {
    const { error } = await supabase.storage
      .from("org-media")
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (error) {
      setErr(error.message);
      return null;
    }
    return supabase.storage.from("org-media").getPublicUrl(path).data.publicUrl;
  }

  async function onImage(file: File) {
    const url = await uploadTo(`opportunity/${oppId}/${Date.now()}-${file.name}`, file);
    if (url) set("image_url", url);
  }
  async function onLogo(file: File) {
    const url = await uploadTo(`org/${orgId}/logo-${Date.now()}-${file.name}`, file);
    if (!url) return;
    await sb("organizations").update({ logo_url: url }).eq("id", orgId);
    setOrgLogo(url);
  }

  const loadForms = useCallback(async () => {
    if (!oppId) {
      setForms([]);
      return;
    }
    const { data } = await sb("opportunity_forms")
      .select("*")
      .eq("opportunity_id", oppId)
      .order("sort_order");
    setForms((data as OpportunityForm[]) ?? []);
  }, [oppId]);
  useEffect(() => {
    loadForms();
  }, [loadForms]);

  // Shared payload builder. status=null upserts without touching status/
  // submitted_at (used to materialize a draft row before attaching forms).
  function payloadFor(status: "draft" | "submitted" | null): Record<string, unknown> {
    const p: Record<string, unknown> = {
      id: oppId,
      org_id: orgId,
      org_name: orgName,
      org_logo_url: orgLogo,
      type,
      name: form.name.trim() || null,
      description: form.description.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      schedule: composeSchedule(form.days, form.start_time, form.end_time) || null,
      schedule_json: { days: form.days, start: form.start_time, end: form.end_time },
      location: form.location.trim() || null,
      lat: form.lat,
      lng: form.lng,
      registration_mode: meta?.registrationLocked ? "internal" : form.registration_mode,
      external_url: form.registration_mode === "external" ? form.external_url.trim() || null : null,
      grade_min: form.grade_min ? Number(form.grade_min) : null,
      grade_max: form.grade_max ? Number(form.grade_max) : null,
      capacity: form.capacity ? Number(form.capacity) : null,
      is_free: form.is_free,
      cost_cents: form.is_free ? null : Math.round((Number(form.cost) || 0) * 100),
      image_url: form.image_url || null,
      riasec_weights: form.weights,
      riasec_code: code || null,
      requirements: form.requirements,
      application_links: form.application_links,
      custom: form.custom,
      updated_at: new Date().toISOString(),
    };
    if (status) p.status = status;
    if (status === "submitted") p.submitted_at = new Date().toISOString();
    return p;
  }

  async function ensureRow(): Promise<boolean> {
    const { error } = await sb("opportunities").upsert(payloadFor(null));
    if (error) {
      setErr(error.message);
      return false;
    }
    return true;
  }

  async function addForm(file: File, name: string, requiresSig: boolean) {
    if (!(await ensureRow())) return;
    const url = await uploadTo(`opportunity/${oppId}/forms/${Date.now()}-${file.name}`, file);
    if (!url) return;
    const { error } = await sb("opportunity_forms").insert({
      opportunity_id: oppId,
      name: name.trim() || file.name,
      file_url: url,
      requires_signature: requiresSig,
      sort_order: forms.length * 10,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    loadForms();
  }

  async function deleteForm(id: string) {
    const { error } = await sb("opportunity_forms").delete().eq("id", id);
    if (error) {
      setErr(error.message);
      return;
    }
    loadForms();
  }

  function validateStep(id: StepId): string | null {
    const req = (key: string) => cfg.get(key)?.required;
    if (id === "basics") {
      if (req("name") && !form.name.trim()) return "Add an event name.";
      if (req("description") && !form.description.trim()) return "Add a description.";
    }
    if (id === "when" && req("dates") && !form.start_date) return "Add a start date.";
    if (id === "where") {
      if (req("location") && !form.location.trim()) return "Add a location.";
      if (form.registration_mode === "external" && !form.external_url.trim())
        return "Add the external registration link.";
    }
    if (id === "custom") {
      for (const f of customFields) {
        if (f.required && !String(form.custom[f.field_key] ?? "").trim())
          return `“${f.label}” is required.`;
      }
    }
    return null;
  }

  function next() {
    const cur = steps[step];
    const v = validateStep(cur.id);
    if (v) {
      setErr(v);
      return;
    }
    setErr(null);
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }
  function back() {
    setErr(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function persist(status: "draft" | "submitted") {
    if (!type) return;
    setBusy(true);
    setErr(null);
    const { error } = await sb("opportunities").upsert(payloadFor(status));
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    navigate({ to: "/org" });
  }

  // ── Path select ────────────────────────────────────────────────────────────
  if (hydrating) {
    return <main className="mx-auto max-w-3xl px-6 py-16 text-sm text-charcoal-400">Loading…</main>;
  }
  if (!type) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="eyebrow">New opportunity · step 1</p>
        <h1 className="mt-2 text-3xl font-light">What kind of opportunity is this?</h1>
        <p className="mt-2 text-sm text-charcoal-500">
          This sets the grade range and which questions come next.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {OPP_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => pickType(t.key)}
              className="border border-charcoal-100 bg-white p-5 text-left transition-colors hover:border-charcoal-400"
            >
              <p className="text-base font-medium">{t.label}</p>
              <p className="mt-1 text-sm text-charcoal-500">{t.blurb}</p>
            </button>
          ))}
        </div>
        <p className="mt-8 text-sm">
          <button onClick={() => navigate({ to: "/org" })} className="text-charcoal-500 hover:text-ink">
            ← Back to your opportunities
          </button>
        </p>
      </main>
    );
  }

  const current = steps[step];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <style>{`@keyframes oppSlide{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}.opp-slide{animation:oppSlide .26s ease}`}</style>

      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">{meta!.label}</p>
          <h1 className="mt-1 text-2xl font-light">{form.name || "New opportunity"}</h1>
        </div>
        {!opportunityId && (
          <button onClick={() => setType(null)} className="text-xs text-charcoal-500 hover:text-ink">
            Change type
          </button>
        )}
      </div>

      {/* Step rail */}
      <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
        {steps.map((s, i) => (
          <span key={s.id} className="flex items-center gap-2">
            <span className={i === step ? "font-medium text-ink" : i < step ? "text-explr-600" : "text-charcoal-400"}>
              {i + 1}. {s.title}
            </span>
            {i < steps.length - 1 && <span className="text-charcoal-300">·</span>}
          </span>
        ))}
      </div>

      <div key={step} className="opp-slide mt-8 min-h-[260px]">
        {current.id === "basics" && (
          <Section title="The basics">
            {enabled("name") && (
              <Field label={labelOf("name", "Event name")} help={helpOf("name")} required={cfg.get("name")?.required}>
                <input className="field" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
            )}
            {enabled("description") && (
              <Field label={labelOf("description", "Description")} help={helpOf("description")} required={cfg.get("description")?.required}>
                <textarea className="field" rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} />
              </Field>
            )}
          </Section>
        )}

        {current.id === "when" && (
          <Section title="When">
            {enabled("dates") && (
              <Field label={labelOf("dates", "Dates")} help={helpOf("dates")} required={cfg.get("dates")?.required}>
                <div className="flex flex-wrap items-center gap-3">
                  <input type="date" className="field w-44" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
                  {!meta!.oneTime && (
                    <>
                      <span className="text-sm text-charcoal-400">to</span>
                      <input type="date" className="field w-44" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
                    </>
                  )}
                </div>
              </Field>
            )}
            {enabled("schedule") && (
              <Field label={labelOf("schedule", "Days & times")} help={helpOf("schedule")}>
                <WeekdayPicker days={form.days} onChange={(v) => set("days", v)} />
                <div className="mt-3 flex flex-wrap items-end gap-4">
                  <label className="text-xs text-charcoal-500">
                    Start time
                    <input
                      type="time"
                      className="field mt-1 w-36"
                      value={form.start_time}
                      onChange={(e) => set("start_time", e.target.value)}
                    />
                  </label>
                  <label className="text-xs text-charcoal-500">
                    End time
                    <input
                      type="time"
                      className="field mt-1 w-36"
                      value={form.end_time}
                      onChange={(e) => set("end_time", e.target.value)}
                    />
                  </label>
                </div>
                {composeSchedule(form.days, form.start_time, form.end_time) && (
                  <p className="mt-2 text-xs text-charcoal-500">
                    {composeSchedule(form.days, form.start_time, form.end_time)}
                  </p>
                )}
              </Field>
            )}
          </Section>
        )}

        {current.id === "where" && (
          <Section title="Where & registration">
            {enabled("location") && (
              <Field
                label={labelOf("location", "Location")}
                help={helpOf("location") ?? "Start typing, then pick an address — it drops a map pin students will see."}
                required={cfg.get("location")?.required}
              >
                <AddressAutocomplete
                  value={form.location}
                  onPick={(addr, lat, lng) => {
                    set("location", addr);
                    set("lat", lat);
                    set("lng", lng);
                  }}
                />
                {form.lat != null && form.lng != null && (
                  <p className="mt-1 text-xs text-emerald-700">✓ Pinned on the map</p>
                )}
              </Field>
            )}
            <Field label={labelOf("registration", "How students register")} help={helpOf("registration")}>
              {meta!.registrationLocked ? (
                <p className="text-sm text-charcoal-500">
                  Internships are completed entirely in-system — students apply and are placed
                  through EXPLR.
                </p>
              ) : (
                <div>
                  <div className="inline-flex border border-charcoal-200">
                    {(["internal", "external"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => set("registration_mode", m)}
                        className="px-3 py-1.5 text-xs"
                        style={{
                          background: form.registration_mode === m ? "var(--ink)" : "white",
                          color: form.registration_mode === m ? "white" : "var(--color-charcoal-500)",
                        }}
                      >
                        {m === "internal" ? "Register in EXPLR" : "Register on our own site"}
                      </button>
                    ))}
                  </div>
                  {form.registration_mode === "external" && (
                    <input
                      className="field mt-3"
                      value={form.external_url}
                      onChange={(e) => set("external_url", e.target.value)}
                      placeholder="https://your-registration-link"
                    />
                  )}
                </div>
              )}
            </Field>
          </Section>
        )}

        {current.id === "who" && (
          <Section title="Who & cost">
            {enabled("grades") && (
              <Field label={labelOf("grades", "Grade range")} help={helpOf("grades")}>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={12} className="field w-24" value={form.grade_min} onChange={(e) => set("grade_min", e.target.value)} placeholder="min" />
                  <span className="text-sm text-charcoal-400">to</span>
                  <input type="number" min={0} max={12} className="field w-24" value={form.grade_max} onChange={(e) => set("grade_max", e.target.value)} placeholder="max" />
                </div>
              </Field>
            )}
            {enabled("capacity") && (
              <Field label={labelOf("capacity", "Students accepted")} help={helpOf("capacity")}>
                <input type="number" min={0} className="field w-32" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
              </Field>
            )}
            {enabled("cost") && (
              <Field label={labelOf("cost", "Cost")} help={helpOf("cost")}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_free} onChange={(e) => set("is_free", e.target.checked)} />
                  This opportunity is free
                </label>
                {!form.is_free && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-charcoal-400">$</span>
                      <input type="number" min={0} step="0.01" className="field w-32" value={form.cost} onChange={(e) => set("cost", e.target.value)} placeholder="0.00" />
                    </div>
                    {(type === "camp" || type === "workshop") && (
                      <p className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Heads up: camps &amp; workshops with a cost attached may not be accepted into
                        the portal. EXPLR focuses on opportunity and access for all students
                        regardless of income.
                      </p>
                    )}
                  </div>
                )}
              </Field>
            )}
          </Section>
        )}

        {current.id === "interests" && (
          <Section title="Activities — auto-codes a RIASEC interest profile">
            <p className="text-sm leading-relaxed text-charcoal-600">{RIASEC_INTRO}</p>
            <div className="mt-6 space-y-4">
              {RIASEC_ACTIVITIES.map((a) => (
                <div key={a.key} className="border border-charcoal-100 p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium">
                      {a.label}
                      <span className="ml-2 text-xs font-normal text-charcoal-400">
                        {a.holland} · {a.letter}
                      </span>
                    </p>
                    <span className="tabular-nums text-sm text-charcoal-600">
                      {form.weights[a.key] ?? 0}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-charcoal-500">{a.blurb}</p>
                  <p className="mt-0.5 text-xs text-charcoal-400">e.g. {a.examples}</p>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={form.weights[a.key] ?? 0}
                    onChange={(e) =>
                      set("weights", { ...form.weights, [a.key]: Number(e.target.value) })
                    }
                    className="mt-3 w-full"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-charcoal-100 pt-4 text-sm">
              <span className={weightTotal === 100 ? "text-charcoal-500" : "text-amber-700"}>
                Total {weightTotal}%
                {weightTotal !== 100 ? " — aim for about 100% (we normalize either way)" : ""}
              </span>
              <span>
                This opportunity&apos;s interest code:{" "}
                <span className="font-mono font-medium tracking-wider">{code || "—"}</span>
              </span>
            </div>
            <p className="mt-3 text-xs text-charcoal-400">
              The code is the top one to three activity types by time. A student whose interest
              assessment shares those letters sees this as a match. Leave any slider at 0 if it
              doesn&apos;t apply.
            </p>
          </Section>
        )}

        {current.id === "worksite" && (
          <Section title="Worksite requirements & forms">
            <Field
              label="Worksite requirements"
              help="Dress code and anything interns must know before day one."
            >
              <div className="space-y-1.5">
                {REQUIREMENT_PRESETS.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.requirements.includes(r)}
                      onChange={(e) =>
                        set(
                          "requirements",
                          e.target.checked
                            ? [...form.requirements, r]
                            : form.requirements.filter((x) => x !== r),
                        )
                      }
                    />
                    {r}
                  </label>
                ))}
              </div>
              <CustomReqAdder
                requirements={form.requirements}
                onAdd={(v) => set("requirements", [...form.requirements, v])}
                onRemove={(v) => set("requirements", form.requirements.filter((x) => x !== v))}
              />
            </Field>

            <Field
              label="Links to complete"
              help="Students open / complete these as part of applying (waivers, surveys, external forms)."
            >
              <LinksEditor
                links={form.application_links}
                onChange={(v) => set("application_links", v)}
              />
            </Field>

            <Field
              label="Forms for interns"
              help="Upload blank forms; students download, fill out, and/or sign them."
            >
              <FormsEditor forms={forms} onAdd={addForm} onDelete={deleteForm} />
            </Field>
          </Section>
        )}

        {current.id === "media" && (
          <Section title="Photo & logo">
            {enabled("image") && (
              <Field label={labelOf("image", "Photo")} help={helpOf("image")}>
                <Uploader current={form.image_url} onFile={onImage} />
              </Field>
            )}
            <Field label="Organization logo" help="Shown on every opportunity you post.">
              <Uploader current={orgLogo} onFile={onLogo} rounded />
            </Field>
          </Section>
        )}

        {current.id === "custom" && (
          <Section title="More details">
            {customFields.map((f) => (
              <Field key={f.id} label={f.label} help={f.help_text} required={f.required}>
                <CustomInput
                  field={f}
                  value={form.custom[f.field_key]}
                  onChange={(v) => set("custom", { ...form.custom, [f.field_key]: v })}
                />
              </Field>
            ))}
          </Section>
        )}

        {current.id === "review" && (
          <Section title="Review & submit">
            <ul className="divide-y divide-charcoal-100 border-y border-charcoal-100 text-sm">
              <Row label="Type" value={meta!.label} />
              <Row label="Name" value={form.name || "—"} />
              <Row label="Dates" value={[form.start_date, form.end_date].filter(Boolean).join(" – ") || "—"} />
              <Row label="Location" value={form.location || "—"} />
              <Row label="Grades" value={[form.grade_min, form.grade_max].filter(Boolean).join("–") || "—"} />
              <Row label="Capacity" value={form.capacity || "—"} />
              <Row label="Cost" value={form.is_free ? "Free" : `$${form.cost || "0"}`} />
              <Row
                label="Registration"
                value={meta!.registrationLocked ? "In-system" : form.registration_mode === "external" ? "External link" : "In EXPLR"}
              />
              <Row label="Interest code" value={code || "—"} />
            </ul>
            <p className="mt-4 text-xs text-charcoal-500">
              When you submit, an EXPLR admin reviews this before it goes live.
            </p>
          </Section>
        )}
      </div>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

      <div className="mt-8 flex items-center justify-between border-t border-charcoal-100 pt-5">
        <button onClick={back} disabled={step === 0} className="btn-ghost disabled:opacity-40">
          ← Back
        </button>
        <div className="flex gap-3">
          <button onClick={() => persist("draft")} disabled={busy} className="btn-ghost text-sm">
            Save draft
          </button>
          {current.id === "review" ? (
            <button onClick={() => persist("submitted")} disabled={busy} className="btn-ink">
              {busy ? "Submitting…" : "Submit for review"}
            </button>
          ) : (
            <button onClick={next} className="btn-ink">
              Next →
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  help,
  required,
  children,
}: {
  label: string;
  help?: string | null;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {help && <p className="mb-1 text-xs text-charcoal-400">{help}</p>}
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between py-2">
      <span className="text-charcoal-500">{label}</span>
      <span className="font-medium">{value}</span>
    </li>
  );
}

function Uploader({
  current,
  onFile,
  rounded,
}: {
  current: string | null;
  onFile: (f: File) => void;
  rounded?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      {current && (
        <img
          src={current}
          alt=""
          className={`h-16 w-16 object-cover ${rounded ? "rounded-full" : "rounded"}`}
        />
      )}
      <label className="cursor-pointer border border-dashed border-charcoal-300 bg-white px-4 py-2 text-xs text-charcoal-600 hover:border-charcoal-500">
        {current ? "Replace" : "Upload"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

function CustomInput({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const v = value ?? "";
  switch (field.field_type) {
    case "textarea":
      return <textarea className="field" rows={4} value={String(v)} onChange={(e) => onChange(e.target.value)} />;
    case "number":
      return <input type="number" className="field w-40" value={String(v)} onChange={(e) => onChange(e.target.value)} />;
    case "date":
      return <input type="date" className="field w-48" value={String(v)} onChange={(e) => onChange(e.target.value)} />;
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          Yes
        </label>
      );
    case "select":
      return (
        <select className="field" value={String(v)} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose…</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    default:
      return <input className="field" value={String(v)} onChange={(e) => onChange(e.target.value)} />;
  }
}

function CustomReqAdder({
  requirements,
  onAdd,
  onRemove,
}: {
  requirements: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}) {
  const [val, setVal] = useState("");
  const custom = requirements.filter((r) => !REQUIREMENT_PRESETS.includes(r));
  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input
          className="field"
          placeholder="Add another requirement…"
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <button
          type="button"
          className="btn-ghost text-sm"
          onClick={() => {
            if (val.trim()) {
              onAdd(val.trim());
              setVal("");
            }
          }}
        >
          Add
        </button>
      </div>
      {custom.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {custom.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-2 border border-charcoal-200 bg-white px-2.5 py-1 text-xs"
            >
              {r}
              <button
                type="button"
                onClick={() => onRemove(r)}
                className="text-charcoal-400 hover:text-red-600"
                aria-label="Remove"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function LinksEditor({
  links,
  onChange,
}: {
  links: AppLink[];
  onChange: (v: AppLink[]) => void;
}) {
  return (
    <div className="space-y-2">
      {links.map((l, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="field w-40"
            placeholder="Label"
            value={l.label}
            onChange={(e) => onChange(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
          />
          <input
            className="field flex-1"
            placeholder="https://"
            value={l.url}
            onChange={(e) => onChange(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
          />
          <button
            type="button"
            onClick={() => onChange(links.filter((_, j) => j !== i))}
            className="px-2 text-charcoal-400 hover:text-ink"
            aria-label="Remove"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...links, { label: "", url: "" }])}
        className="text-sm text-charcoal-500 hover:text-ink"
      >
        + Add link
      </button>
    </div>
  );
}

function FormsEditor({
  forms,
  onAdd,
  onDelete,
}: {
  forms: OpportunityForm[];
  onAdd: (file: File, name: string, requiresSig: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [sig, setSig] = useState(false);
  return (
    <div>
      {forms.length > 0 && (
        <ul className="mb-3 divide-y divide-charcoal-100 border-y border-charcoal-100">
          {forms.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="flex-1">
                {f.name}
                {f.requires_signature && (
                  <span className="ml-2 text-xs text-charcoal-400">· signature</span>
                )}
              </span>
              {f.file_url && (
                <a href={f.file_url} target="_blank" rel="noreferrer" className="text-xs text-explr-600 hover:underline">
                  View
                </a>
              )}
              <button type="button" onClick={() => onDelete(f.id)} className="text-xs text-red-600 hover:underline">
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="field w-48"
          placeholder="Form name (e.g. Waiver)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="flex items-center gap-1.5 text-xs text-charcoal-600">
          <input type="checkbox" checked={sig} onChange={(e) => setSig(e.target.checked)} />
          Needs signature
        </label>
        <label className="cursor-pointer border border-dashed border-charcoal-300 bg-white px-3 py-1.5 text-xs hover:border-charcoal-500">
          Upload form
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                onAdd(f, name, sig);
                setName("");
                setSig(false);
              }
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

function WeekdayPicker({ days, onChange }: { days: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {WEEKDAYS.map((d) => {
        const on = days.includes(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(on ? days.filter((x) => x !== d) : [...days, d])}
            className="border px-3 py-1.5 text-xs"
            style={
              on
                ? { background: "var(--ink)", color: "white", borderColor: "var(--ink)" }
                : { borderColor: "var(--color-charcoal-200)" }
            }
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

type NominatimResult = { display_name: string; lat: string; lon: string };

function AddressAutocomplete({
  value,
  onPick,
}: {
  value: string;
  onPick: (addr: string, lat: number | null, lng: number | null) => void;
}) {
  const [q, setQ] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.trim().length < 4) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
        );
        if (r.ok) setResults((await r.json()) as NominatimResult[]);
      } catch {
        /* offline / blocked — free typing still works */
      }
    }, 450);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative">
      <input
        className="field"
        value={q}
        placeholder="Start typing an address…"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          onPick(e.target.value, null, null);
        }}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto border border-charcoal-200 bg-white text-sm shadow-sm">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-charcoal-50"
                onClick={() => {
                  onPick(r.display_name, Number(r.lat), Number(r.lon));
                  setQ(r.display_name);
                  setResults([]);
                  setOpen(false);
                }}
              >
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
