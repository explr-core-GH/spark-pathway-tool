import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, Smartphone, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OrgGuard } from "@/components/OrgGuard";
import { PortalHeader, type PortalLink } from "@/components/passport";
import {
  Choice,
  MultiChoice,
  ScaleSlider,
  Section,
  SelectField,
  TextArea,
  TextField,
} from "@/components/hs-application/fields";
import {
  ListingProfile,
  QuestionInput,
  RequirementCards,
} from "@/components/hs-application/PartnerApplicationView";
import {
  ADDON_BANK,
  AGE_REASONS,
  CAREER_FIELDS,
  CREDENTIAL_OPTIONS,
  ENVIRONMENT_DIMS,
  MAX_ADDED_MINUTES,
  MAX_ADDONS,
  MAX_CUSTOM,
  REQUIREMENT_CATEGORIES,
  REQUIREMENTS,
  WHO_PAYS,
} from "@/lib/hs-application/content";
import { checkBuilder, studentPaysItems } from "@/lib/hs-application/guardrails";
import {
  EMPTY_BUILDER,
  EMPTY_PARTNER_ANSWERS,
  hydrateBuilder,
  type ApplicationBuilder,
  type BuilderQuestion,
  type BuilderRequirement,
} from "@/lib/hs-application/types";

const PARTNER_LINKS: PortalLink[] = [
  { label: "Overview", to: "/org" },
  { label: "New opportunity", to: "/org/new" },
  { label: "Placed with you", to: "/org/applicants" },
];

export const Route = createFileRoute("/org/application/$opportunityId")({
  head: () => ({ meta: [{ title: "Application builder — EXPLR" }] }),
  component: () => <OrgGuard>{(org) => <Builder orgName={org.name} />}</OrgGuard>,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

type Opp = {
  id: string;
  name: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  capacity: number | null;
  schedule: string | null;
  status: string;
  application_builder: unknown;
  application_version_id: string | null;
};
type Version = { id: string; version: number; locked_at: string | null; published_at: string };

function Builder({ orgName }: { orgName: string }) {
  const { opportunityId } = Route.useParams();
  const [opp, setOpp] = useState<Opp | null>(null);
  const [b, setB] = useState<ApplicationBuilder>(EMPTY_BUILDER);
  const [versions, setVersions] = useState<Version[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [showIssues, setShowIssues] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: o } = await sb("opportunities")
        .select("*")
        .eq("id", opportunityId)
        .maybeSingle();
      if (!o) return setMsg({ kind: "err", text: "We couldn't find that opportunity." });
      setOpp(o);
      const { data: vs } = await sb("opp_application_versions")
        .select("id, version, locked_at, published_at")
        .eq("opportunity_id", opportunityId)
        .order("version", { ascending: false });
      setVersions(vs ?? []);
      const draft = o.application_builder ? hydrateBuilder(o.application_builder) : null;
      setB(
        draft ?? {
          ...EMPTY_BUILDER,
          profile: {
            ...EMPTY_BUILDER.profile,
            title: o.name ?? "",
            description: o.description ?? "",
            startDate: o.start_date ?? "",
            endDate: o.end_date ?? "",
            address: o.location ?? "",
            seats: o.capacity ?? null,
            dailyHours: o.schedule ?? "",
          },
        },
      );
    })();
  }, [opportunityId]);

  const result = useMemo(() => checkBuilder(b), [b]);
  const live = versions.find((v) => v.id === opp?.application_version_id) ?? null;
  const setProfile = (patch: Partial<ApplicationBuilder["profile"]>) =>
    setB({ ...b, profile: { ...b.profile, ...patch } });
  const issuesFor = (prefix: string) =>
    result.errors.filter((e) => e.path.startsWith(prefix)).map((e) => e.message);

  async function saveDraft() {
    setBusy(true);
    const { error } = await sb("opportunities")
      .update({ application_builder: b })
      .eq("id", opportunityId);
    setBusy(false);
    setMsg(
      error
        ? { kind: "err", text: error.message }
        : { kind: "ok", text: "Draft saved. Students still see the live version." },
    );
  }

  async function publish() {
    setShowIssues(true);
    if (result.errors.length) {
      setMsg({
        kind: "err",
        text: `Fix ${result.errors.length} thing${result.errors.length === 1 ? "" : "s"} before publishing.`,
      });
      return;
    }
    setBusy(true);
    const nextVersion = (versions[0]?.version ?? 0) + 1;
    const { data: v, error } = await sb("opp_application_versions")
      .insert({ opportunity_id: opportunityId, version: nextVersion, builder: b })
      .select("id, version, locked_at, published_at")
      .single();
    if (error) {
      setBusy(false);
      return setMsg({ kind: "err", text: error.message });
    }
    const { error: oErr } = await sb("opportunities")
      .update({ application_builder: b, application_version_id: v.id })
      .eq("id", opportunityId);
    setBusy(false);
    if (oErr) return setMsg({ kind: "err", text: oErr.message });
    setVersions([v, ...versions]);
    setOpp(opp ? { ...opp, application_version_id: v.id } : opp);
    setMsg({
      kind: "ok",
      text:
        opp?.status === "approved"
          ? `Version ${v.version} is live. Students who apply from now on will see it.`
          : `Version ${v.version} is published. Students will see it once EXPLR approves this listing.`,
    });
  }

  if (!opp) {
    return (
      <main role="status" className="mx-auto max-w-3xl px-6 py-24 text-sm text-ink-500">
        {msg?.text ?? "Loading…"}
      </main>
    );
  }

  const preview = (
    <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-[32px] border-[10px] border-ink-900 bg-paper shadow-card">
      <div className="max-h-[75vh] overflow-y-auto p-4 text-[15px]">
        <ListingProfile b={b} org={orgName} />
        <div className="mt-5">
          <RequirementCards b={b} answers={EMPTY_PARTNER_ANSWERS} />
        </div>
        {b.questions.length > 0 && (
          <div className="mt-5 grid gap-4">
            <p className="font-display text-lg font-semibold">{orgName}'s questions</p>
            {b.questions.map((q) => (
              <QuestionInput key={q.id} q={q} value={undefined} onChange={() => {}} />
            ))}
          </div>
        )}
        <p className="mt-6 rounded-[var(--radius-control)] bg-paper-sunken p-3 text-xs text-ink-700">
          Students already answered EXPLR's general application, so this is all they see for your
          internship.
        </p>
      </div>
    </div>
  );

  return (
    <div className="bg-paper text-ink-900">
      <PortalHeader role="Partner" links={PARTNER_LINKS} signedIn />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link
          to="/org"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
        >
          ← Partner portal
        </Link>
        <p className="eyebrow text-green">Application builder</p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight">
          {opp.name || "Internship"}
        </h1>
        <p className="lead mt-3 max-w-3xl">
          Students fill out one EXPLR general application first. Then they answer only what you add
          here: a few questions and anything they need to know about your site. EXPLR staff review
          every application and place students; you'll see who's placed with you.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          {live ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-mint-tint px-3 py-1.5 text-green-deep">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Version {live.version} is published
              {live.locked_at && (
                <>
                  {" "}
                  · <Lock className="h-4 w-4" aria-hidden /> locked (students started it)
                </>
              )}
            </span>
          ) : (
            <span className="rounded-full bg-paper-sunken px-3 py-1.5">Not published yet</span>
          )}
          {live?.locked_at && (
            <span className="text-ink-700">
              Publishing creates a new version. Students who started keep the one they saw.
            </span>
          )}
        </div>

        <div className="mt-6 flex gap-2 lg:hidden" role="tablist" aria-label="Builder view">
          {(["edit", "preview"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              type="button"
              className={tab === t ? "btn-ink" : "btn-ghost"}
              onClick={() => setTab(t)}
            >
              {t === "edit" ? "Edit" : "Phone preview"}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className={`grid gap-6 ${tab === "preview" ? "hidden lg:grid" : ""}`}>
            {/* D1 */}
            <Section
              title="1 · About the internship"
              lead="Write for a high schooler. Plain words beat job-posting language."
            >
              <TextField
                label="Internship title"
                required
                value={b.profile.title}
                onChange={(v) => setProfile({ title: v })}
                error={showIssues ? issuesFor("profile.title")[0] : undefined}
              />
              <TextArea
                label="Describe it in a short paragraph"
                required
                rows={4}
                value={b.profile.description}
                onChange={(v) => setProfile({ description: v })}
                error={showIssues ? issuesFor("profile.description")[0] : undefined}
              />
              {result.warnings.some((w) => w.path === "profile.description") && (
                <p className="flex items-center gap-2 text-sm text-gold-deep">
                  <AlertTriangle className="h-4 w-4" aria-hidden /> Some words may be jargon for a
                  high schooler.
                </p>
              )}
              <ListEditor
                label="What interns do each week (3 to 6)"
                items={b.profile.weekly}
                max={6}
                onChange={(v) => setProfile({ weekly: v })}
                error={showIssues ? issuesFor("profile.weekly")[0] : undefined}
                placeholder="For example: Interview a neighbor for a story"
              />
              <TextField
                label="What interns will learn or earn"
                required
                value={b.profile.learnEarn}
                onChange={(v) => setProfile({ learnEarn: v })}
                error={showIssues ? issuesFor("profile.learnEarn")[0] : undefined}
              />
              <MultiChoice
                legend="Credentials interns can earn"
                values={b.profile.credentials}
                onChange={(v) => setProfile({ credentials: v })}
                options={CREDENTIAL_OPTIONS.map((c) => ({ value: c, label: c }))}
              />
              <MultiChoice
                legend="Career fields"
                required
                values={b.profile.careerFields}
                onChange={(v) => setProfile({ careerFields: v })}
                options={CAREER_FIELDS.map((f) => ({ value: f.key, label: f.label }))}
                help="Used to match students who said they're interested in these fields."
                error={showIssues ? issuesFor("profile.careerFields")[0] : undefined}
              />
              <fieldset>
                <legend className="label">
                  What the work is like{" "}
                  <span aria-hidden="true" className="text-red-700">
                    *
                  </span>
                </legend>
                <div className="grid gap-4">
                  {ENVIRONMENT_DIMS.map((d) => (
                    <ScaleSlider
                      key={d.key}
                      left={d.left}
                      right={d.right}
                      value={b.profile.environment[d.key]}
                      onChange={(v) =>
                        setProfile({ environment: { ...b.profile.environment, [d.key]: v } })
                      }
                    />
                  ))}
                </div>
                {showIssues && issuesFor("profile.environment")[0] && (
                  <p role="alert" className="mt-1 text-sm text-red-700">
                    {issuesFor("profile.environment")[0]}
                  </p>
                )}
              </fieldset>
              <div className="grid gap-5 sm:grid-cols-3">
                <TextField
                  label="Seats"
                  required
                  type="number"
                  inputMode="numeric"
                  value={b.profile.seats ? String(b.profile.seats) : ""}
                  onChange={(v) => setProfile({ seats: v ? Number(v) : null })}
                  error={showIssues ? issuesFor("profile.seats")[0] : undefined}
                />
                <TextField
                  label="Start date"
                  required
                  type="date"
                  value={b.profile.startDate}
                  onChange={(v) => setProfile({ startDate: v })}
                  error={showIssues ? issuesFor("profile.dates")[0] : undefined}
                />
                <TextField
                  label="End date"
                  required
                  type="date"
                  value={b.profile.endDate}
                  onChange={(v) => setProfile({ endDate: v })}
                />
              </div>
              <TextField
                label="Daily hours"
                required
                value={b.profile.dailyHours}
                onChange={(v) => setProfile({ dailyHours: v })}
                placeholder="Mon-Fri, 9:00 AM - 2:00 PM"
                error={showIssues ? issuesFor("profile.dailyHours")[0] : undefined}
              />
              <TextField
                label="Site address"
                required
                value={b.profile.address}
                onChange={(v) => setProfile({ address: v })}
                error={showIssues ? issuesFor("profile.address")[0] : undefined}
              />
              <TextField
                label="Nearest bus or train line"
                value={b.profile.busLine}
                onChange={(v) => setProfile({ busLine: v })}
                placeholder="RTA #22, stop at Lorain & W. 25th"
                help="Many students take the bus. This helps them plan."
              />
              <ListEditor
                label="Nice to have (shown as “helpful, not required”)"
                items={b.profile.niceToHave}
                max={5}
                onChange={(v) => setProfile({ niceToHave: v })}
                placeholder="For example: Has used a camera"
                optional
              />
            </Section>

            {/* D2 */}
            <Section
              title="2 · Your questions"
              lead={`Pick up to ${MAX_ADDONS} from the list and write up to ${MAX_CUSTOM} of your own. Students answer these on top of EXPLR's general application.`}
            >
              <ul className="grid gap-3">
                {ADDON_BANK.map((q) => {
                  const idx = b.questions.findIndex((x) => x.id === q.id);
                  const on = idx >= 0;
                  const bankCount = b.questions.filter((x) => !x.custom).length;
                  return (
                    <li
                      key={q.id}
                      className={`rounded-[var(--radius-control)] border p-4 ${on ? "border-green-deep bg-mint-tint/40" : "border-line bg-paper"}`}
                    >
                      <label className="flex min-h-[44px] items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-5 w-5 shrink-0 accent-green-deep"
                          checked={on}
                          disabled={!on && bankCount >= MAX_ADDONS}
                          onChange={() => {
                            if (on)
                              setB({ ...b, questions: b.questions.filter((x) => x.id !== q.id) });
                            else
                              setB({
                                ...b,
                                questions: [
                                  ...b.questions,
                                  {
                                    id: q.id,
                                    prompt: q.prompt,
                                    kind: q.kind,
                                    options: [],
                                    maxWords: q.maxWords,
                                    optional:
                                      q.optional || q.kind === "upload" || q.kind === "media",
                                  },
                                ],
                              });
                          }}
                        />
                        <span>
                          <span className="font-medium">{q.prompt}</span>
                          <span className="block text-xs text-ink-700">
                            {q.id} · good for {q.goodFor} · about {q.minutes} min
                            {q.optional ? " · optional for students" : ""}
                          </span>
                        </span>
                      </label>
                      {on && q.needsOptions && (
                        <TextArea
                          label={q.optionsHint ?? "Options, one per line"}
                          required
                          rows={3}
                          className="mt-3"
                          value={b.questions[idx].options.join("\n")}
                          onChange={(v) =>
                            setB({
                              ...b,
                              questions: b.questions.map((x, i) =>
                                i === idx
                                  ? { ...x, options: q.id === "B-04" ? [v] : v.split("\n") }
                                  : x,
                              ),
                            })
                          }
                          error={showIssues ? issuesFor(`questions.${idx}`)[0] : undefined}
                        />
                      )}
                      {on && showIssues && !q.needsOptions && issuesFor(`questions.${idx}`)[0] && (
                        <p role="alert" className="mt-1 text-sm text-red-700">
                          {issuesFor(`questions.${idx}`)[0]}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              <CustomQuestions b={b} setB={setB} issuesFor={issuesFor} showIssues={showIssues} />
            </Section>

            {/* D3 */}
            <Section
              title="3 · What students need to know about your site"
              lead="Check anything a student must have, do or meet. Students see these before they apply and tell us if they'd need help."
            >
              <div className="grid gap-5 sm:grid-cols-3">
                <SelectField
                  label="Minimum age"
                  value={b.age.min ? String(b.age.min) : ""}
                  onChange={(v) => setB({ ...b, age: { ...b.age, min: v ? Number(v) : null } })}
                  options={[14, 15, 16, 17, 18].map((n) => ({ value: String(n), label: `${n}+` }))}
                  error={showIssues ? issuesFor("age.min")[0] : undefined}
                />
                <SelectField
                  label="Maximum age (rare)"
                  value={b.age.max ? String(b.age.max) : ""}
                  onChange={(v) => setB({ ...b, age: { ...b.age, max: v ? Number(v) : null } })}
                  options={[16, 17, 18, 19, 20, 21].map((n) => ({
                    value: String(n),
                    label: `${n} and under`,
                  }))}
                  error={showIssues ? issuesFor("age.max")[0] : undefined}
                />
                {(b.age.min || b.age.max) && (
                  <SelectField
                    label="Why the age limit?"
                    required
                    value={b.age.reason}
                    onChange={(v) => setB({ ...b, age: { ...b.age, reason: v } })}
                    options={AGE_REASONS.map((r) => ({ value: r.key, label: r.label }))}
                    error={showIssues ? issuesFor("age.reason")[0] : undefined}
                  />
                )}
              </div>
              {REQUIREMENT_CATEGORIES.map((cat) => (
                <fieldset key={cat.key}>
                  <legend className="label">
                    {cat.label}
                    {cat.ackOnly ? " (students just acknowledge)" : ""}
                  </legend>
                  <ul className="grid gap-2">
                    {REQUIREMENTS.filter((r) => r.category === cat.key).map((def) => {
                      const idx = b.requirements.findIndex((r) => r.key === def.key);
                      const r = idx >= 0 ? b.requirements[idx] : null;
                      const setR = (patch: Partial<BuilderRequirement>) =>
                        setB({
                          ...b,
                          requirements: b.requirements.map((x, i) =>
                            i === idx ? { ...x, ...patch } : x,
                          ),
                        });
                      return (
                        <li
                          key={def.key}
                          className={`rounded-[var(--radius-control)] border px-3 py-1 ${r ? "border-green-deep" : "border-line"}`}
                        >
                          <label className="flex min-h-[44px] items-center gap-3 text-sm">
                            <input
                              type="checkbox"
                              className="h-5 w-5 accent-green-deep"
                              checked={!!r}
                              onChange={() =>
                                setB({
                                  ...b,
                                  requirements: r
                                    ? b.requirements.filter((x) => x.key !== def.key)
                                    : [...b.requirements, { key: def.key }],
                                })
                              }
                            />
                            {def.label}
                          </label>
                          {r && (
                            <div className="grid gap-3 pb-3 pl-8">
                              {def.detailHint && (
                                <TextField
                                  label={def.detailHint}
                                  value={r.detail ?? ""}
                                  onChange={(v) => setR({ detail: v })}
                                />
                              )}
                              {def.cost && (
                                <Choice
                                  legend="Who pays?"
                                  required
                                  value={r.whoPays}
                                  onChange={(v) => setR({ whoPays: v })}
                                  options={WHO_PAYS.map((w) => ({ value: w.key, label: w.label }))}
                                  error={
                                    showIssues
                                      ? issuesFor(`requirements.${idx}.whoPays`)[0]
                                      : undefined
                                  }
                                  help={
                                    r.whoPays === "student"
                                      ? "EXPLR will flag this for our student support fund so cost doesn't keep anyone out."
                                      : undefined
                                  }
                                />
                              )}
                              {cat.key === "physical" && (
                                <label className="flex min-h-[44px] items-center gap-3 text-sm">
                                  <input
                                    type="checkbox"
                                    className="h-5 w-5 accent-green-deep"
                                    checked={!!r.essential}
                                    onChange={(e) => setR({ essential: e.target.checked })}
                                  />
                                  This is essential to the job
                                </label>
                              )}
                              {showIssues &&
                                cat.key === "physical" &&
                                issuesFor(`requirements.${idx}.essential`)[0] && (
                                  <p role="alert" className="text-sm text-red-700">
                                    {issuesFor(`requirements.${idx}.essential`)[0]}
                                  </p>
                                )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              ))}
              <p className="text-sm text-ink-700">
                We never collect medical details or records. Students only tell us whether they can
                meet a health requirement.
              </p>
            </Section>
          </div>

          <aside
            className={`lg:sticky lg:top-6 lg:self-start ${tab === "edit" ? "hidden lg:block" : ""}`}
          >
            <p className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Smartphone className="h-4 w-4" aria-hidden /> What students see on a phone
            </p>
            {preview}
          </aside>
        </div>

        {/* Publish bar */}
        <div className="sticky bottom-0 z-10 mt-8 border-t border-line bg-paper py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p>
                Adds about{" "}
                <strong>
                  {result.minutes} minute{result.minutes === 1 ? "" : "s"}
                </strong>{" "}
                for students
                <span className="text-ink-700"> (limit {MAX_ADDED_MINUTES})</span>
              </p>
              {result.errors.length > 0 ? (
                <button
                  type="button"
                  className="min-h-[44px] text-red-700 underline"
                  onClick={() => setShowIssues(true)}
                >
                  {result.errors.length} thing{result.errors.length === 1 ? "" : "s"} to fix before
                  publishing
                </button>
              ) : (
                <p className="text-green-deep">Ready to publish</p>
              )}
              {studentPaysItems(b).length > 0 && (
                <p className="text-xs text-ink-700">
                  Flagged for EXPLR support: {studentPaysItems(b).join(", ")}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-ghost" onClick={saveDraft} disabled={busy}>
                Save draft
              </button>
              <button type="button" className="btn-ink" onClick={publish} disabled={busy}>
                {busy ? "Working…" : live ? "Publish a new version" : "Publish application"}
              </button>
            </div>
          </div>
          {msg && (
            <p
              role={msg.kind === "err" ? "alert" : "status"}
              className={`mt-2 text-sm ${msg.kind === "err" ? "text-red-700" : "text-green-deep"}`}
            >
              {msg.text}
            </p>
          )}
          {showIssues && result.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
              {[...new Set(result.errors.map((e) => e.message))].map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function ListEditor(props: {
  label: string;
  items: string[];
  max: number;
  onChange: (v: string[]) => void;
  error?: string;
  placeholder?: string;
  optional?: boolean;
}) {
  const items = props.items.length ? props.items : [""];
  return (
    <fieldset>
      <legend className="label">
        {props.label}
        {!props.optional && (
          <span aria-hidden="true" className="text-red-700">
            {" "}
            *
          </span>
        )}
      </legend>
      <ul className="grid gap-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <input
              className="field min-h-[44px]"
              aria-label={`${props.label}, item ${i + 1}`}
              value={it}
              placeholder={i === 0 ? props.placeholder : undefined}
              onChange={(e) => props.onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <button
              type="button"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-ink-500 hover:bg-paper-sunken"
              aria-label={`Remove item ${i + 1}`}
              onClick={() => props.onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {items.length < props.max && (
        <button
          type="button"
          className="mt-2 inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-green-deep"
          onClick={() => props.onChange([...items, ""])}
        >
          <Plus className="h-4 w-4" aria-hidden /> Add another
        </button>
      )}
      {props.error && (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {props.error}
        </p>
      )}
    </fieldset>
  );
}

function CustomQuestions(props: {
  b: ApplicationBuilder;
  setB: (b: ApplicationBuilder) => void;
  issuesFor: (p: string) => string[];
  showIssues: boolean;
}) {
  const { b, setB } = props;
  const customs = b.questions.map((q, i) => ({ q, i })).filter((x) => x.q.custom);
  const update = (i: number, patch: Partial<BuilderQuestion>) =>
    setB({ ...b, questions: b.questions.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  return (
    <div className="grid gap-4 border-t border-line pt-5">
      <p className="font-medium">Your own questions</p>
      {customs.map(({ q, i }, n) => (
        <div
          key={q.id}
          className="grid gap-3 rounded-[var(--radius-control)] border border-line p-4"
        >
          <TextField
            label={`Question ${n + 1} (under 30 words)`}
            required
            value={q.prompt}
            onChange={(v) => update(i, { prompt: v })}
            error={props.showIssues ? props.issuesFor(`questions.${i}`)[0] : undefined}
          />
          <Choice
            legend="Answer type"
            required
            value={q.kind}
            onChange={(v) => update(i, { kind: v, maxWords: v === "text" ? 100 : undefined })}
            options={[
              { value: "text" as const, label: "Short text" },
              { value: "choice" as const, label: "Multiple choice" },
            ]}
          />
          {q.kind === "choice" && (
            <TextArea
              label="Choices, one per line"
              required
              rows={3}
              value={q.options.join("\n")}
              onChange={(v) => update(i, { options: v.split("\n") })}
            />
          )}
          <button
            type="button"
            className="inline-flex min-h-[44px] w-fit items-center gap-2 text-sm text-red-700"
            onClick={() => setB({ ...b, questions: b.questions.filter((_, j) => j !== i) })}
          >
            <Trash2 className="h-4 w-4" aria-hidden /> Remove this question
          </button>
        </div>
      ))}
      {customs.length < MAX_CUSTOM && (
        <button
          type="button"
          className="btn-ghost w-fit"
          onClick={() =>
            setB({
              ...b,
              questions: [
                ...b.questions,
                {
                  id: `custom-${Date.now().toString(36)}`,
                  prompt: "",
                  kind: "text",
                  options: [],
                  maxWords: 100,
                  custom: true,
                },
              ],
            })
          }
        >
          <Plus className="h-4 w-4" aria-hidden /> Write your own question
        </button>
      )}
      <p className="text-xs text-ink-700">
        Not allowed: questions about GPA, test scores, attendance, years of experience, race,
        religion, disability or health, immigration status, family income, gender identity, or other
        protected topics. The builder checks as you type.
      </p>
    </div>
  );
}
