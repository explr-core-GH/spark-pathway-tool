import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PortalHeader, type PortalLink } from "@/components/passport";
import { Check, Plus, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  OPP_TYPES,
  oppTypeMeta,
  RIASEC_ACTIVITIES,
  RIASEC_INTRO,
  REQUIREMENT_PRESETS,
  CERT_PREFIX,
  WEEKDAYS,
  codeFromWeights,
  composeSchedule,
  emptyRiasecWeights,
  type AppLink,
  type FieldConfig,
  type OpportunityForm,
  type OppType,
} from "@/lib/opportunities";
import { WblStep } from "./WblStep";
import {
  EMPTY_WBL,
  defaultTaxonomy,
  hydrateWbl,
  validateWbl,
  type WblDetail,
} from "@/lib/wbl-gate";
import type { Stage } from "@/lib/wbl-taxonomy";

const PARTNER_LINKS: PortalLink[] = [
  { label: "Overview", to: "/org" },
  { label: "New opportunity", to: "/org/new" },
  { label: "Applicants", to: "/org/applicants" },
];

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
  stage: Stage;
  experience_type: string;
  wbl: WblDetail;
  target_competencies: string[];
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
  stage: "exploration",
  experience_type: "camp_or_program",
  wbl: EMPTY_WBL,
  target_competencies: [],
};

type StepId =
  | "basics"
  | "when"
  | "where"
  | "who"
  | "interests"
  | "worksite"
  | "wbl"
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

// Type-appropriate label for the name field (the seed uses a generic
// "Event name" for every type, which reads wrong for an internship or camp).
const NAME_LABEL: Record<OppType, string> = {
  camp: "Camp name",
  workshop: "Workshop name",
  internship: "Internship name",
  ongoing: "Program name",
};

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
  // The type whose field config is currently loaded — gates step rendering so
  // we never flash a step before its config arrives.
  const [configFor, setConfigFor] = useState<OppType | null>(null);
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
    setConfigFor(t);
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
        stage: data.stage ?? defaultTaxonomy(data.type).stage,
        experience_type: data.experience_type ?? defaultTaxonomy(data.type).experienceType,
        wbl: hydrateWbl(data.wbl),
        target_competencies: data.target_competencies ?? [],
      });
      setHydrating(false);
    })();
  }, [opportunityId, loadConfig]);

  async function pickType(t: OppType) {
    const meta = oppTypeMeta(t);
    setType(t);
    setConfigFor(null);
    setOppId(crypto.randomUUID());
    setForm((f) => ({
      ...f,
      grade_min: meta.gradeMin != null ? String(meta.gradeMin) : "",
      grade_max: meta.gradeMax != null ? String(meta.gradeMax) : "",
      registration_mode: meta.registrationLocked ? "internal" : f.registration_mode,
      stage: defaultTaxonomy(t).stage,
      experience_type: defaultTaxonomy(t).experienceType,
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
  // Name label: use the admin's custom label if they set one, otherwise a
  // type-appropriate default (treats the generic seeded "Event name" as unset).
  const nameLabel = () => {
    const configured = cfg.get("name")?.label;
    if (configured && configured !== "Event name") return configured;
    return type ? NAME_LABEL[type] : "Name";
  };
  const customFields = useMemo(() => config.filter((c) => !c.is_core), [config]);

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
    // Requirements / links / forms apply to every opportunity type.
    const mediaIdx = out.findIndex((s) => s.id === "media");
    const wbl = { id: "wbl" as StepId, title: "Work-based learning" };
    const ws = { id: "worksite" as StepId, title: "Requirements & forms" };
    if (mediaIdx >= 0) out.splice(mediaIdx, 0, wbl, ws);
    else out.push(wbl, ws);
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
      stage: form.stage,
      experience_type: form.experience_type,
      wbl: form.wbl,
      target_competencies: form.target_competencies,
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
    if (id === "wbl") {
      const issues = validateWbl(
        form.wbl,
        form.stage,
        form.experience_type,
        form.grade_min ? Number(form.grade_min) : null,
      );
      if (issues.length) return issues[0].message;
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
    return (
      <div className="bg-paper text-ink-900">
        <PortalHeader role="Partner" links={PARTNER_LINKS} signedIn />
        <main role="status" className="mx-auto max-w-3xl px-4 py-16 text-sm text-ink-500 sm:px-6">
          Loading…
        </main>
      </div>
    );
  }
  if (!type) {
    return (
      <div className="bg-paper text-ink-900">
        <PortalHeader role="Partner" links={PARTNER_LINKS} signedIn />
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <p className="eyebrow text-green">New opportunity · step 1</p>
          <h1 className="display mt-1">What kind of opportunity is this?</h1>
          <p className="lead mt-3">This sets the grade range and which questions come next.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {OPP_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => pickType(t.key)}
                className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 text-left shadow-card transition-colors hover:border-emerald"
              >
                <p className="font-display text-lg font-semibold">{t.label}</p>
                <p className="mt-1 text-sm text-ink-700">{t.blurb}</p>
              </button>
            ))}
          </div>
          <p className="mt-8 text-sm">
            <button
              type="button"
              onClick={() => navigate({ to: "/org" })}
              className="inline-flex min-h-[44px] items-center font-medium text-green-deep hover:underline"
            >
              ← Back to your opportunities
            </button>
          </p>
        </main>
      </div>
    );
  }

  // Don't render any step until this type's field config has loaded — otherwise
  // the step list is momentarily empty and flashes the wrong slide.
  if (configFor !== type) {
    return (
      <div className="bg-paper text-ink-900">
        <PortalHeader role="Partner" links={PARTNER_LINKS} signedIn />
        <main role="status" className="mx-auto max-w-3xl px-4 py-16 text-sm text-ink-500 sm:px-6">
          Loading…
        </main>
      </div>
    );
  }

  const current = steps[step];

  return (
    <div className="bg-paper text-ink-900">
      <PortalHeader role="Partner" links={PARTNER_LINKS} signedIn />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <style>{`@keyframes oppSlide{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}.opp-slide{animation:oppSlide .26s ease}`}</style>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow text-green">{meta!.label}</p>
            <h1 className="mt-1 font-display text-3xl font-bold leading-tight">
              {form.name || "New opportunity"}
            </h1>
          </div>
          {!opportunityId && (
            <button
              type="button"
              onClick={() => setType(null)}
              className="inline-flex min-h-[44px] items-center text-sm text-ink-500 hover:text-ink-900"
            >
              Change type
            </button>
          )}
        </div>

        {/* Step rail */}
        <p className="sr-only" aria-live="polite">
          Step {step + 1} of {steps.length}: {current.title}
        </p>
        <ol className="mt-6 flex flex-wrap items-center gap-2" aria-label="Steps">
          {steps.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              <span
                aria-current={i === step ? "step" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] ${
                  i === step
                    ? "bg-ink-900 text-paper"
                    : i < step
                      ? "bg-mint-tint text-green-deep"
                      : "bg-paper-sunken text-ink-700"
                }`}
              >
                {i < step ? <Check className="h-3 w-3" aria-hidden /> : `${i + 1}.`} {s.title}
              </span>
            </li>
          ))}
        </ol>

        <div
          key={step}
          className="opp-slide mt-8 min-h-[260px] rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card sm:p-6"
        >
          {current.id === "basics" && (
            <Section title="The basics">
              {enabled("name") && (
                <Field
                  id="opp-name"
                  label={nameLabel()}
                  help={helpOf("name")}
                  required={cfg.get("name")?.required}
                >
                  <input
                    id="opp-name"
                    className="field"
                    required={cfg.get("name")?.required}
                    autoComplete="off"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </Field>
              )}
              {enabled("description") && (
                <Field
                  id="opp-description"
                  label={labelOf("description", "Description")}
                  help={helpOf("description")}
                  required={cfg.get("description")?.required}
                >
                  <textarea
                    id="opp-description"
                    className="field"
                    rows={5}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </Field>
              )}
            </Section>
          )}

          {current.id === "when" && (
            <Section title="When">
              {enabled("dates") && (
                <Field
                  group
                  label={labelOf("dates", "Dates")}
                  help={helpOf("dates")}
                  required={cfg.get("dates")?.required}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="date"
                      aria-label="Start date"
                      className="field w-44"
                      value={form.start_date}
                      onChange={(e) => set("start_date", e.target.value)}
                    />
                    {!meta!.oneTime && (
                      <>
                        <span className="text-sm text-ink-500">to</span>
                        <input
                          type="date"
                          aria-label="End date"
                          className="field w-44"
                          value={form.end_date}
                          onChange={(e) => set("end_date", e.target.value)}
                        />
                      </>
                    )}
                  </div>
                </Field>
              )}
              {enabled("schedule") && (
                <Field group label={labelOf("schedule", "Days & times")} help={helpOf("schedule")}>
                  <WeekdayPicker days={form.days} onChange={(v) => set("days", v)} />
                  <div className="mt-3 flex flex-wrap items-end gap-4">
                    <label className="text-xs text-ink-500">
                      Start time
                      <input
                        type="time"
                        className="field mt-1 w-36"
                        value={form.start_time}
                        onChange={(e) => set("start_time", e.target.value)}
                      />
                    </label>
                    <label className="text-xs text-ink-500">
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
                    <p className="mt-2 text-xs text-ink-500">
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
                  id="opp-location"
                  label={labelOf("location", "Location")}
                  help={
                    helpOf("location") ??
                    "Start typing, then pick an address — it drops a map pin students will see."
                  }
                  required={cfg.get("location")?.required}
                >
                  <AddressAutocomplete
                    id="opp-location"
                    value={form.location}
                    onPick={(addr, lat, lng) => {
                      set("location", addr);
                      set("lat", lat);
                      set("lng", lng);
                    }}
                  />
                  {form.lat != null && form.lng != null && (
                    <p
                      role="status"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-green-deep"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden /> Pinned on the map
                    </p>
                  )}
                </Field>
              )}
              <Field
                group
                label={labelOf("registration", "How students register")}
                help={helpOf("registration")}
              >
                {meta!.registrationLocked ? (
                  <p className="text-sm text-ink-500">
                    Internships are completed entirely in-system — students apply and are placed
                    through EXPLR.
                  </p>
                ) : (
                  <div>
                    <div className="inline-flex flex-wrap gap-2">
                      {(["internal", "external"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => set("registration_mode", m)}
                          aria-pressed={form.registration_mode === m}
                          className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium transition-colors ${
                            form.registration_mode === m
                              ? "border-ink-900 bg-ink-900 text-paper"
                              : "border-line-strong bg-paper-raised text-ink-700 hover:border-ink-900"
                          }`}
                        >
                          {m === "internal" ? "Register in EXPLR" : "Register on our own site"}
                        </button>
                      ))}
                    </div>
                    {form.registration_mode === "external" && (
                      <input
                        type="url"
                        className="field mt-3"
                        aria-label="External registration link"
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
                <Field group label={labelOf("grades", "Grade range")} help={helpOf("grades")}>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={12}
                      aria-label="Minimum grade"
                      className="field w-24"
                      value={form.grade_min}
                      onChange={(e) => set("grade_min", e.target.value)}
                      placeholder="min"
                    />
                    <span className="text-sm text-ink-500">to</span>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      aria-label="Maximum grade"
                      className="field w-24"
                      value={form.grade_max}
                      onChange={(e) => set("grade_max", e.target.value)}
                      placeholder="max"
                    />
                  </div>
                </Field>
              )}
              {enabled("capacity") && (
                <Field
                  id="opp-capacity"
                  label={labelOf("capacity", "Students accepted")}
                  help={helpOf("capacity")}
                >
                  <input
                    id="opp-capacity"
                    type="number"
                    min={0}
                    className="field w-32"
                    value={form.capacity}
                    onChange={(e) => set("capacity", e.target.value)}
                  />
                </Field>
              )}
              {enabled("cost") && (
                <Field group label={labelOf("cost", "Cost")} help={helpOf("cost")}>
                  <label className="flex min-h-[44px] items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-green-deep"
                      checked={form.is_free}
                      onChange={(e) => set("is_free", e.target.checked)}
                    />
                    This opportunity is free
                  </label>
                  {!form.is_free && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-ink-500">$</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          aria-label="Cost in dollars"
                          className="field w-32"
                          value={form.cost}
                          onChange={(e) => set("cost", e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      {(type === "camp" || type === "workshop") && (
                        <p className="mt-3 rounded-[var(--radius-control)] bg-gold-tint px-3 py-2 text-xs text-ink-900">
                          Heads up: camps &amp; workshops with a cost attached may not be accepted
                          into the portal. EXPLR focuses on opportunity and access for all students
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
              <p className="text-sm leading-relaxed text-ink-700">{RIASEC_INTRO}</p>
              <div className="mt-6 space-y-4">
                {RIASEC_ACTIVITIES.map((a) => (
                  <div
                    key={a.key}
                    className="rounded-[var(--radius-card)] border border-line bg-paper p-4"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium">
                        {a.label}
                        <span className="ml-2 text-xs font-normal text-ink-500">
                          {a.holland} · {a.letter}
                        </span>
                      </p>
                      <span className="tabular-nums text-sm text-ink-700">
                        {form.weights[a.key] ?? 0}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-500">{a.blurb}</p>
                    <p className="mt-0.5 text-xs text-ink-500">e.g. {a.examples}</p>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      aria-label={`${a.label} share of time`}
                      aria-valuetext={`${form.weights[a.key] ?? 0}%`}
                      value={form.weights[a.key] ?? 0}
                      onChange={(e) =>
                        set("weights", { ...form.weights, [a.key]: Number(e.target.value) })
                      }
                      className="mt-3 w-full"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
                <span
                  aria-live="polite"
                  className={weightTotal === 100 ? "text-green-deep" : "text-gold-deep"}
                >
                  Total {weightTotal}%
                  {weightTotal !== 100 ? " — aim for about 100% (we normalize either way)" : ""}
                </span>
                <span>
                  This opportunity&apos;s interest code:{" "}
                  <span className="font-mono font-medium tracking-wider">{code || "—"}</span>
                </span>
              </div>
              <p className="mt-3 text-xs text-ink-500">
                The code is the top one to three activity types by time. A student whose interest
                assessment shares those letters sees this as a match. Leave any slider at 0 if it
                doesn&apos;t apply.
              </p>
            </Section>
          )}

          {current.id === "worksite" && (
            <Section title="Requirements & forms">
              <p className="-mt-2 text-sm text-ink-500">
                All optional — check what applies and leave the rest blank if there&apos;s nothing
                extra to require.
              </p>
              <Field
                group
                label="Requirements"
                help="Dress code, lunch, transportation, field trips — check whatever students or families should know."
              >
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {REQUIREMENT_PRESETS.map((r) => (
                    <label key={r} className="flex min-h-[44px] items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0 accent-green-deep"
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
                <div className="mt-3">
                  <label className="label" htmlFor="opp-certs">
                    Certifications included (optional)
                  </label>
                  <input
                    id="opp-certs"
                    className="field mt-1"
                    placeholder="e.g. OSHA 10, Forklift, First Aid — leave blank if none"
                    value={(form.requirements.find((r) => r.startsWith(CERT_PREFIX)) ?? "").slice(
                      CERT_PREFIX.length,
                    )}
                    onChange={(e) => {
                      const others = form.requirements.filter((r) => !r.startsWith(CERT_PREFIX));
                      set(
                        "requirements",
                        e.target.value.trim() ? [...others, CERT_PREFIX + e.target.value] : others,
                      );
                    }}
                  />
                </div>
                <CustomReqAdder
                  requirements={form.requirements}
                  onAdd={(v) => set("requirements", [...form.requirements, v])}
                  onRemove={(v) =>
                    set(
                      "requirements",
                      form.requirements.filter((x) => x !== v),
                    )
                  }
                />
              </Field>

              <Field
                group
                label="Links to complete"
                help="Links students open / complete (waivers, surveys, registration forms). Leave empty if there are none."
              >
                <LinksEditor
                  links={form.application_links}
                  onChange={(v) => set("application_links", v)}
                />
              </Field>

              <Field
                group
                label="Forms / paperwork"
                help="Upload blank forms students download, fill out, and/or sign. Leave empty if there are none."
              >
                <FormsEditor forms={forms} onAdd={addForm} onDelete={deleteForm} />
              </Field>
            </Section>
          )}

          {current.id === "wbl" && type && (
            <WblStep
              type={type}
              stage={form.stage}
              experienceType={form.experience_type}
              wbl={form.wbl}
              competencies={form.target_competencies}
              gradeMin={form.grade_min ? Number(form.grade_min) : null}
              onStage={(v) => set("stage", v)}
              onExperienceType={(v) => set("experience_type", v)}
              onWbl={(v) => set("wbl", v)}
              onCompetencies={(v) => set("target_competencies", v)}
            />
          )}
          {current.id === "media" && (
            <Section title="Photo & logo">
              {enabled("image") && (
                <Field group label={labelOf("image", "Photo")} help={helpOf("image")}>
                  <Uploader
                    label={labelOf("image", "Photo")}
                    current={form.image_url}
                    onFile={onImage}
                  />
                </Field>
              )}
              <Field group label="Organization logo" help="Shown on every opportunity you post.">
                <Uploader label="Organization logo" current={orgLogo} onFile={onLogo} rounded />
              </Field>
            </Section>
          )}

          {current.id === "custom" && (
            <Section title="More details">
              {customFields.map((f) => (
                <Field
                  key={f.id}
                  id={`custom-${f.field_key}`}
                  group={f.field_type === "checkbox"}
                  label={f.label}
                  help={f.help_text}
                  required={f.required}
                >
                  <CustomInput
                    id={`custom-${f.field_key}`}
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
              <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper px-4 text-sm">
                <Row label="Type" value={meta!.label} />
                <Row label="Name" value={form.name || "—"} />
                <Row
                  label="Dates"
                  value={[form.start_date, form.end_date].filter(Boolean).join(" – ") || "—"}
                />
                <Row label="Location" value={form.location || "—"} />
                <Row
                  label="Grades"
                  value={[form.grade_min, form.grade_max].filter(Boolean).join("–") || "—"}
                />
                <Row label="Capacity" value={form.capacity || "—"} />
                <Row label="Cost" value={form.is_free ? "Free" : `$${form.cost || "0"}`} />
                <Row
                  label="Registration"
                  value={
                    meta!.registrationLocked
                      ? "In-system"
                      : form.registration_mode === "external"
                        ? "External link"
                        : "In EXPLR"
                  }
                />
                <Row label="Interest code" value={code || "—"} />
              </ul>
              <p className="mt-4 text-xs text-ink-500">
                When you submit, an EXPLR admin reviews this before it goes live.
              </p>
            </Section>
          )}
        </div>

        {err && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {err}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="btn-ghost disabled:opacity-40"
          >
            ← Back
          </button>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => persist("draft")}
              disabled={busy}
              className="btn-ghost"
            >
              Save draft
            </button>
            {current.id === "review" ? (
              <button
                type="button"
                onClick={() => persist("submitted")}
                disabled={busy}
                className="btn-ink"
              >
                {busy ? "Submitting…" : "Submit for review"}
              </button>
            ) : (
              <button type="button" onClick={next} className="btn-ink">
                Next →
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  );
}

function Field({
  id,
  group,
  label,
  help,
  required,
  children,
}: {
  /** id of the single control this label describes (WCAG 1.3.1 / 4.1.2). */
  id?: string;
  /** Render as fieldset/legend when the field holds several controls. */
  group?: boolean;
  label: string;
  help?: string | null;
  required?: boolean;
  children: React.ReactNode;
}) {
  const text = (
    <>
      {label}
      {required && (
        <>
          <span className="ml-1 text-red-700" aria-hidden="true">
            *
          </span>
          <span className="sr-only"> (required)</span>
        </>
      )}
    </>
  );
  if (group) {
    return (
      <fieldset>
        <legend className="label">{text}</legend>
        {help && <p className="mb-1 text-xs text-ink-500">{help}</p>}
        <div className="mt-1">{children}</div>
      </fieldset>
    );
  }
  return (
    <div>
      <label className="label" htmlFor={id}>
        {text}
      </label>
      {help && (
        <p id={id ? `${id}-help` : undefined} className="mb-1 text-xs text-ink-500">
          {help}
        </p>
      )}
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 py-2">
      <span className="text-ink-700">{label}</span>
      <span className="font-medium">{value}</span>
    </li>
  );
}

function Uploader({
  label,
  current,
  onFile,
  rounded,
}: {
  /** What is being uploaded, for the file input's accessible name. */
  label: string;
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
          className={`h-16 w-16 border border-line object-cover ${rounded ? "rounded-full" : "rounded-[var(--radius-control)]"}`}
        />
      )}
      <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-line-strong bg-paper-raised px-4 text-sm text-ink-700 hover:border-ink-900 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2">
        <Upload className="h-4 w-4 text-ink-500" aria-hidden />
        {current ? "Replace" : "Upload"}
        <input
          type="file"
          accept="image/*"
          aria-label={`${current ? "Replace" : "Upload"} ${label.toLowerCase()}`}
          className="sr-only"
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
  id,
  field,
  value,
  onChange,
}: {
  id: string;
  field: FieldConfig;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const v = value ?? "";
  switch (field.field_type) {
    case "textarea":
      return (
        <textarea
          id={id}
          className="field"
          rows={4}
          value={String(v)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "number":
      return (
        <input
          id={id}
          type="number"
          className="field w-40"
          value={String(v)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "date":
      return (
        <input
          id={id}
          type="date"
          className="field w-48"
          value={String(v)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "checkbox":
      return (
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input
            id={id}
            type="checkbox"
            className="h-5 w-5 accent-green-deep"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
          Yes
        </label>
      );
    case "select":
      return (
        <select
          id={id}
          className="field"
          value={String(v)}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Choose…</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    default:
      return (
        <input
          id={id}
          className="field"
          value={String(v)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
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
  const custom = requirements.filter(
    (r) => !REQUIREMENT_PRESETS.includes(r) && !r.startsWith(CERT_PREFIX),
  );
  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input
          className="field"
          aria-label="Add another requirement"
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
              className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-paper-raised py-1 pl-3 pr-1.5 text-xs"
            >
              {r}
              <button
                type="button"
                onClick={() => onRemove(r)}
                className="grid h-7 w-7 place-items-center rounded-full text-ink-500 hover:bg-paper-sunken hover:text-red-700"
                aria-label={`Remove requirement: ${r}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function LinksEditor({ links, onChange }: { links: AppLink[]; onChange: (v: AppLink[]) => void }) {
  return (
    <div className="space-y-2">
      {links.map((l, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="field w-40"
            aria-label={`Link ${i + 1} label`}
            placeholder="Label"
            value={l.label}
            onChange={(e) =>
              onChange(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
            }
          />
          <input
            type="url"
            className="field flex-1"
            aria-label={`Link ${i + 1} URL`}
            placeholder="https://"
            value={l.url}
            onChange={(e) =>
              onChange(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
            }
          />
          <button
            type="button"
            onClick={() => onChange(links.filter((_, j) => j !== i))}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-ink-500 hover:bg-paper-sunken hover:text-ink-900"
            aria-label={`Remove link ${i + 1}${l.label ? ` (${l.label})` : ""}`}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...links, { label: "", url: "" }])}
        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-green-deep hover:underline"
      >
        <Plus className="h-4 w-4" aria-hidden /> Add link
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
        <ul className="mb-3 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper px-3">
          {forms.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <span className="flex-1">
                {f.name}
                {f.requires_signature && (
                  <span className="ml-2 text-xs text-ink-500">· signature</span>
                )}
              </span>
              {f.file_url && (
                <a
                  href={f.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
                >
                  View<span className="sr-only"> {f.name} (opens in a new tab)</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => onDelete(f.id)}
                className="inline-flex min-h-[44px] items-center text-sm text-red-700 hover:underline"
              >
                Delete<span className="sr-only"> {f.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="field w-48"
          aria-label="Form name"
          placeholder="Form name (e.g. Waiver)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="flex min-h-[44px] items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            className="h-5 w-5 accent-green-deep"
            checked={sig}
            onChange={(e) => setSig(e.target.checked)}
          />
          Needs signature
        </label>
        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-line-strong bg-paper-raised px-3 text-sm hover:border-ink-900 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2">
          <Upload className="h-4 w-4 text-ink-500" aria-hidden />
          Upload form
          <input
            type="file"
            aria-label="Upload form file"
            className="sr-only"
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
    <div className="flex flex-wrap gap-2" role="group" aria-label="Days of the week">
      {WEEKDAYS.map((d) => {
        const on = days.includes(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? days.filter((x) => x !== d) : [...days, d])}
            className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium transition-colors ${
              on
                ? "border-ink-900 bg-ink-900 text-paper"
                : "border-line-strong bg-paper-raised text-ink-700 hover:border-ink-900"
            }`}
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
  id,
  value,
  onPick,
}: {
  id?: string;
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
        id={id}
        className="field"
        value={q}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && results.length > 0}
        aria-controls={id ? `${id}-options` : undefined}
        autoComplete="off"
        placeholder="Start typing an address…"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          onPick(e.target.value, null, null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && results.length > 0 && (
        <ul
          id={id ? `${id}-options` : undefined}
          aria-label="Address suggestions"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-[var(--radius-control)] border border-line-strong bg-paper-raised text-sm shadow-card"
        >
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                className="block min-h-[44px] w-full px-3 py-2 text-left hover:bg-mint-tint"
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
