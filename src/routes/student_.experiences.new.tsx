import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { PortalHeader, type PortalLink } from "@/components/passport";
import { SiteFooter } from "@/components/SiteFooter";
import { loadInternshipRefs } from "@/lib/internship-refs";
import { RIASEC_ORDER, RIASEC, type RIASECCode } from "@/lib/riasec";
import {
  CAREER_CLUSTERS,
  COMPENSATION_TYPES,
  EXPERIENCE_TYPES,
  EXPERIENCE_TYPE_BY_KEY,
  STAGES,
  isExposure,
  type Stage,
} from "@/lib/wbl-taxonomy";

/**
 * /student/experiences/new — add an experience.
 *
 * Two ways in: import something from the student's own library (camps they
 * were on the roster for, internships they were placed in, opportunities
 * they registered for), or add an outside experience by hand. Either way the
 * row starts self-reported; a supervisor stamp comes later.
 */
const STUDENT_LINKS: PortalLink[] = [
  { label: "My passport", to: "/student" },
  { label: "Opportunities", to: "/opportunities" },
  { label: "Families", to: "/student/pathway", search: { tab: "families" } },
];

export const Route = createFileRoute("/student_/experiences/new")({
  head: () => ({ meta: [{ title: "Add an experience — EXPLR Pathways" }] }),
  validateSearch: (
    s: Record<string, unknown>,
  ): { mode?: "library" | "external"; stage?: Stage } => ({
    ...(s.mode === "library" || s.mode === "external" ? { mode: s.mode } : {}),
    ...(typeof s.stage === "string" && s.stage in STAGES ? { stage: s.stage as Stage } : {}),
  }),
  component: () => (
    <RoleGuard requires="student">
      <NewExperience />
    </RoleGuard>
  ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

type LibraryItem = {
  key: string;
  title: string;
  organization: string | null;
  typeKey: string;
  start: string | null;
  end: string | null;
  ref: { opportunity_id?: string; internship_slug?: string; explr_camp_id?: string };
};

function NewExperience() {
  const { user } = useSession();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [grade, setGrade] = useState<number | null>(null);
  const [mode, setMode] = useState<"library" | "external">(search.mode ?? "external");
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [libLoading, setLibLoading] = useState(false);

  const [typeKey, setTypeKey] = useState<string>(
    search.stage
      ? (EXPERIENCE_TYPES.find((t) => t.stage === search.stage)?.key ?? "job_shadow")
      : "job_shadow",
  );
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [hours, setHours] = useState("");
  const [compensation, setCompensation] = useState("");
  const [cluster, setCluster] = useState("");
  const [module, setModule] = useState<RIASECCode | "">("");
  const [duties, setDuties] = useState("");
  const [reflection, setReflection] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorEmail, setSupervisorEmail] = useState("");
  const [ref, setRef] = useState<LibraryItem["ref"]>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const type = EXPERIENCE_TYPE_BY_KEY[typeKey];
  const exposure = type ? isExposure(type.stage) : false;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("students")
      .select("grade")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setGrade(data?.grade ?? null));
  }, [user]);

  // The student's own library: camps (roster links), internship placements, opportunity registrations.
  useEffect(() => {
    if (!user || mode !== "library") return;
    let active = true;
    setLibLoading(true);
    (async () => {
      const [{ data: camps }, { data: placements }, { data: regs }, internshipRefs] =
        await Promise.all([
          sb("student_camp_links")
            .select("explr_camp_id, explr_camps(id, title, date, end_date, location)")
            .eq("student_id", user.id),
          sb("internship_placements")
            .select("approved_internship_id, approved_at")
            .eq("student_id", user.id),
          sb("opportunity_registrations")
            .select("opportunity_id, opportunities(id, name, type, start_date, end_date, org_name)")
            .eq("student_id", user.id),
          loadInternshipRefs(),
        ]);
      if (!active) return;
      const items: LibraryItem[] = [];
      for (const c of (camps ?? []) as Array<{
        explr_camp_id: string;
        explr_camps: { title: string; date: string | null; end_date: string | null } | null;
      }>) {
        items.push({
          key: `camp:${c.explr_camp_id}`,
          title: c.explr_camps?.title ?? "EXPLR camp",
          organization: "EXPLR",
          typeKey: "camp_or_program",
          start: c.explr_camps?.date ?? null,
          end: c.explr_camps?.end_date ?? null,
          ref: { explr_camp_id: c.explr_camp_id },
        });
      }
      for (const pl of (placements ?? []) as Array<{
        approved_internship_id: string;
        approved_at: string;
      }>) {
        const i = internshipRefs.get(pl.approved_internship_id);
        items.push({
          key: `internship:${pl.approved_internship_id}`,
          title: i?.name ?? "Internship",
          organization: i?.orgName ?? "Partner internship",
          typeKey: "internship_offsite_placement",
          start: pl.approved_at.slice(0, 10),
          end: null,
          ref: { internship_slug: pl.approved_internship_id },
        });
      }
      for (const r of (regs ?? []) as Array<{
        opportunity_id: string;
        opportunities: {
          name: string | null;
          type: string;
          start_date: string | null;
          end_date: string | null;
          org_name: string | null;
        } | null;
      }>) {
        const o = r.opportunities;
        items.push({
          key: `opp:${r.opportunity_id}`,
          title: o?.name ?? "Opportunity",
          organization: o?.org_name ?? null,
          typeKey:
            o?.type === "internship"
              ? "internship_offsite_placement"
              : o?.type === "workshop"
                ? "industry_design_challenge"
                : "camp_or_program",
          start: o?.start_date ?? null,
          end: o?.end_date ?? null,
          ref: { opportunity_id: r.opportunity_id },
        });
      }
      setLibrary(items);
      setLibLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user, mode]);

  function pickLibrary(item: LibraryItem) {
    setTitle(item.title);
    setOrganization(item.organization ?? "");
    setTypeKey(item.typeKey);
    setStart(item.start ?? "");
    setEnd(item.end ?? "");
    setRef(item.ref);
    setMode("external"); // continue in the form with the fields prefilled
  }

  const allowedTypes = useMemo(
    () =>
      EXPERIENCE_TYPES.filter((t) => grade === null || t.minGrade <= grade || t.key === typeKey),
    [grade, typeKey],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !type) return;
    setBusy(true);
    setError(null);
    const row = {
      student_id: user.id,
      source: Object.keys(ref).length ? "library" : "external",
      opportunity_id: ref.opportunity_id ?? null,
      internship_slug: ref.internship_slug ?? null,
      explr_camp_id: ref.explr_camp_id ?? null,
      title: title.trim(),
      organization: organization.trim() || null,
      role_title: roleTitle.trim() || null,
      stage: type.stage,
      experience_type: type.key,
      career_cluster: cluster || null,
      riasec_module: module || null,
      start_date: start || null,
      end_date: end || null,
      hours: hours.trim() === "" ? null : Number(hours),
      compensation_type: exposure ? null : compensation || null,
      duties: duties.trim() || null,
      reflection: reflection.trim() || null,
      supervisor_name: exposure ? null : supervisorName.trim() || null,
      supervisor_email: exposure ? null : supervisorEmail.trim() || null,
      status: "self_reported",
    };
    const { error: err } = await sb("experiences").insert(row);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate({ to: "/student" });
  }

  return (
    <div
      className="min-h-screen bg-paper text-ink-900"
      data-density={grade !== null && grade <= 8 ? "explore" : undefined}
    >
      <PortalHeader role="Student" links={STUDENT_LINKS} signedIn />
      <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
        <Link
          to="/student"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
        >
          ← My passport
        </Link>
        <p className="eyebrow text-green">Add an experience</p>
        <h1 className="display mt-1">{exposure ? "Where did you go?" : "What did you do?"}</h1>

        <div className="mt-6 flex gap-2" role="group" aria-label="How to add">
          <button
            type="button"
            onClick={() => setMode("library")}
            aria-pressed={mode === "library"}
            className={mode === "library" ? "btn-ink" : "btn-ghost"}
          >
            From my library
          </button>
          <button
            type="button"
            onClick={() => setMode("external")}
            aria-pressed={mode === "external"}
            className={mode === "external" ? "btn-ink" : "btn-ghost"}
          >
            Something else
          </button>
        </div>

        {mode === "library" && (
          <section className="mt-6">
            <p className="text-ink-700">
              Camps, internships, and opportunities EXPLR already knows you were part of. Pick one
              and we'll fill in the details.
            </p>
            {libLoading && (
              <p role="status" className="mt-4 text-ink-500">
                Looking…
              </p>
            )}
            {!libLoading && library.length === 0 && (
              <p className="mt-4 rounded-[var(--radius-control)] border border-dashed border-line-strong p-4 text-sm text-ink-700">
                Nothing in your library yet. When you're on a camp roster, placed in an internship,
                or registered for an opportunity, it shows up here.
              </p>
            )}
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {library.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => pickLibrary(item)}
                    className="flex w-full flex-col items-start gap-1 rounded-[var(--radius-card)] border border-line bg-paper-raised p-4 text-left hover:border-emerald"
                  >
                    <span className="eyebrow">{EXPERIENCE_TYPE_BY_KEY[item.typeKey]?.label}</span>
                    <span className="font-display text-lg font-semibold">{item.title}</span>
                    <span className="text-sm text-ink-700">
                      {[item.organization, item.start].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {mode === "external" && (
          <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
            <p className="text-sm text-ink-700">
              Fields marked <span aria-hidden="true">*</span>
              <span className="sr-only">with an asterisk</span> are required.
            </p>
            <div>
              <label className="label" htmlFor="exp-type">
                What kind of experience?
              </label>
              <select
                id="exp-type"
                className="field"
                value={typeKey}
                onChange={(e) => setTypeKey(e.target.value)}
                aria-describedby={type?.hint ? "exp-type-hint" : undefined}
              >
                {(["awareness", "exploration", "preparation", "participation"] as Stage[]).map(
                  (stage) => (
                    <optgroup key={stage} label={`${STAGES[stage].label} · ${STAGES[stage].hint}`}>
                      {allowedTypes
                        .filter((t) => t.stage === stage)
                        .map((t) => (
                          <option key={t.key} value={t.key}>
                            {t.label}
                            {t.ohioFormalWbl ? " (counts toward 250 hours once stamped)" : ""}
                          </option>
                        ))}
                    </optgroup>
                  ),
                )}
              </select>
              {type?.hint && (
                <p id="exp-type-hint" className="mt-1 text-xs text-ink-500">
                  {type.hint}
                </p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="exp-title">
                  {exposure ? "What was it?" : "Title"} <span aria-hidden="true">*</span>
                </label>
                <input
                  id="exp-title"
                  className="field"
                  required
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={exposure ? "Career talk with a nurse" : "Supply chain intern"}
                />
              </div>
              <div>
                <label className="label" htmlFor="exp-org">
                  Where / who with
                </label>
                <input
                  id="exp-org"
                  className="field"
                  maxLength={120}
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Cleveland Clinic"
                />
              </div>
            </div>

            {!exposure && (
              <div>
                <label className="label" htmlFor="exp-role">
                  Your role
                </label>
                <input
                  id="exp-role"
                  className="field"
                  maxLength={80}
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="Intern, crew member, build lead…"
                />
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="exp-start">
                  Start
                </label>
                <input
                  id="exp-start"
                  type="date"
                  className="field"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="exp-end">
                  End
                </label>
                <input
                  id="exp-end"
                  type="date"
                  className="field"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="exp-hours">
                  Hours {exposure ? "(optional)" : ""}
                </label>
                <input
                  id="exp-hours"
                  type="number"
                  min={0}
                  step={0.5}
                  className="field"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="exp-cluster">
                  Career area (for your stamp)
                </label>
                <select
                  id="exp-cluster"
                  className="field"
                  value={cluster}
                  onChange={(e) => setCluster(e.target.value)}
                >
                  <option value="">Not sure</option>
                  {CAREER_CLUSTERS.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="exp-module">
                  Interest it connects to
                </label>
                <select
                  id="exp-module"
                  className="field"
                  value={module}
                  onChange={(e) => setModule(e.target.value as RIASECCode | "")}
                >
                  <option value="">Not sure</option>
                  {RIASEC_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {c} · {RIASEC[c].name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!exposure && (
              <div>
                <label className="label" htmlFor="exp-pay">
                  Pay
                </label>
                <select
                  id="exp-pay"
                  className="field"
                  value={compensation}
                  onChange={(e) => setCompensation(e.target.value)}
                >
                  <option value="">Choose…</option>
                  {COMPENSATION_TYPES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label" htmlFor="exp-duties">
                {exposure ? "What happened?" : "What did you actually do?"}
              </label>
              <textarea
                id="exp-duties"
                className="field min-h-[100px]"
                maxLength={800}
                value={duties}
                onChange={(e) => setDuties(e.target.value)}
                placeholder={
                  exposure
                    ? "We toured the ER and asked a nurse about her day."
                    : "Tracked surgical supply inventory and built a reorder sheet the unit still uses."
                }
              />
            </div>
            <div>
              <label className="label" htmlFor="exp-reflection">
                What did you learn about yourself?
              </label>
              <textarea
                id="exp-reflection"
                className="field min-h-[80px]"
                maxLength={800}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
              />
            </div>

            {!exposure && (
              <fieldset className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-4">
                <legend className="eyebrow px-1 text-green">Who can stamp this?</legend>
                <p className="mb-3 text-sm text-ink-700">
                  Your supervisor, instructor, or the adult who watched you do the work. We'll email
                  them one link when stamping opens.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="exp-sup-name">
                      Name
                    </label>
                    <input
                      id="exp-sup-name"
                      className="field"
                      autoComplete="off"
                      maxLength={80}
                      value={supervisorName}
                      onChange={(e) => setSupervisorName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="exp-sup-email">
                      Email
                    </label>
                    <input
                      id="exp-sup-email"
                      type="email"
                      className="field"
                      maxLength={120}
                      value={supervisorEmail}
                      onChange={(e) => setSupervisorEmail(e.target.value)}
                    />
                  </div>
                </div>
              </fieldset>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={busy} className="btn-ink">
                {busy ? "Saving…" : exposure ? "Add sticker" : "Add to my passport"}
              </button>
              <Link to="/student" className="btn-ghost">
                Cancel
              </Link>
            </div>
            <p className="text-xs text-ink-500">
              Everything you add starts as self-reported. Only a supervisor's stamp makes it
              verified, and verified is what counts toward hours and seals.
            </p>
          </form>
        )}
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );
}
