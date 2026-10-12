import { OMJ_SKILLS } from "@/lib/competencies";
import { EXPERIENCE_TYPES, EXPERIENCE_TYPE_BY_KEY, STAGES, type Stage } from "@/lib/wbl-taxonomy";
import {
  HAZARDOUS_ORDERS,
  MODALITIES,
  REIMBURSEMENTS,
  validateWbl,
  type WblDetail,
} from "@/lib/wbl-gate";
import type { OppType } from "@/lib/opportunities";

type Props = {
  type: OppType;
  stage: Stage;
  experienceType: string;
  wbl: WblDetail;
  competencies: string[];
  gradeMin: number | null;
  onStage: (s: Stage) => void;
  onExperienceType: (k: string) => void;
  onWbl: (w: WblDetail) => void;
  onCompetencies: (c: string[]) => void;
};

/**
 * The work-based learning step of the partner wizard. Awareness and
 * exploration listings answer a short version; preparation and participation
 * listings (internships, placements, apprenticeships) answer the full
 * gold-standard set: mentor, real work, learning objectives, schedule, pay,
 * minor-labor checks, site needs, and the one-link evaluation commitment.
 */
export function WblStep(p: Props) {
  const deep = p.stage === "preparation" || p.stage === "participation";
  const issues = validateWbl(p.wbl, p.stage, p.experienceType, p.gradeMin);
  const w = p.wbl;
  const set = <K extends keyof WblDetail>(k: K, patch: Partial<WblDetail[K]>) =>
    p.onWbl({ ...w, [k]: { ...w[k], ...patch } });
  const list = (s: string) =>
    s
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

  return (
    <div className="space-y-8">
      <p className="text-sm text-ink-500">
        Ohio defines work-based learning in stages. Tell us where this fits so students, families,
        and schools know what it counts for. Items marked with a stamp can count toward a student's
        250 verified hours once a mentor stamps them.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="wbl-stage">
            Stage
          </label>
          <select
            id="wbl-stage"
            className="field"
            value={p.stage}
            onChange={(e) => {
              const s = e.target.value as Stage;
              p.onStage(s);
              const first = EXPERIENCE_TYPES.find((t) => t.stage === s);
              if (first && EXPERIENCE_TYPE_BY_KEY[p.experienceType]?.stage !== s)
                p.onExperienceType(first.key);
            }}
          >
            {(Object.keys(STAGES) as Stage[]).map((s) => (
              <option key={s} value={s}>
                {STAGES[s].label} · {STAGES[s].hint}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="wbl-type">
            Experience type
          </label>
          <select
            id="wbl-type"
            className="field"
            value={p.experienceType}
            onChange={(e) => p.onExperienceType(e.target.value)}
          >
            {EXPERIENCE_TYPES.filter((t) => t.stage === p.stage).map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
                {t.ohioFormalWbl ? " · counts toward 250 hours" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="label">Skills students will practice (Ohio Readiness Seal)</legend>
        <p className="mb-2 text-xs text-ink-500">
          Pick the ones a mentor could honestly rate. These prefill the evaluation.
        </p>
        <div className="flex flex-wrap gap-2">
          {OMJ_SKILLS.map((s) => {
            const on = p.competencies.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  p.onCompetencies(
                    on ? p.competencies.filter((x) => x !== s) : [...p.competencies, s],
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-xs ${on ? "border-green bg-mint-tint text-green-deep" : "border-line-strong text-ink-700"}`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </fieldset>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Getting there and what to bring</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="wbl-transport"
            label="Transportation"
            hint="Ohio's top barrier. Bus line, parking, pickup, provided ride?"
            value={w.site.transportationNotes}
            onChange={(v) => set("site", { transportationNotes: v })}
            textarea
          />
          <Field
            id="wbl-access"
            label="Accessibility"
            hint="Stairs, lifts, noise, breaks, accommodations you can make."
            value={w.site.accessibilityNotes}
            onChange={(v) => set("site", { accessibilityNotes: v })}
            textarea
          />
          <Field
            id="wbl-dress"
            label="Dress code"
            value={w.site.dressCode}
            onChange={(v) => set("site", { dressCode: v })}
          />
          <Field
            id="wbl-vax"
            label="Vaccinations or health requirements"
            value={w.site.vaccinations}
            onChange={(v) => set("site", { vaccinations: v })}
          />
          <Field
            id="wbl-ppe"
            label="Safety equipment"
            hint="What you provide, what the student brings."
            value={w.site.safetyEquipment}
            onChange={(v) => set("site", { safetyEquipment: v })}
          />
          <Field
            id="wbl-other"
            label="Anything else a family should know"
            value={w.site.other}
            onChange={(v) => set("site", { other: v })}
            textarea
          />
        </div>
        <Check
          label="We recruit inclusively and welcome students who have not had this kind of access before."
          checked={w.site.inclusiveRecruitment}
          onChange={(v) => set("site", { inclusiveRecruitment: v })}
        />
      </section>

      {deep && (
        <>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">The mentor</h3>
            <p className="text-xs text-ink-500">
              The one adult who supervises day to day. They'll get a single emailed link to confirm
              hours and rate skills; no account.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="wbl-mentor-name"
                label="Name"
                value={w.mentor.name}
                onChange={(v) => set("mentor", { name: v })}
                required
              />
              <Field
                id="wbl-mentor-title"
                label="Title"
                value={w.mentor.title}
                onChange={(v) => set("mentor", { title: v })}
              />
              <Field
                id="wbl-mentor-email"
                label="Email"
                type="email"
                value={w.mentor.email}
                onChange={(v) => set("mentor", { email: v })}
                required
              />
              <Field
                id="wbl-mentor-phone"
                label="Phone"
                type="tel"
                value={w.mentor.phone}
                onChange={(v) => set("mentor", { phone: v })}
              />
            </div>
            <Check
              label="The mentor will give the student regular feedback and complete the baseline and final skill ratings."
              checked={w.mentor.guidanceAck}
              onChange={(v) => set("mentor", { guidanceAck: v })}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">The work</h3>
            <Field
              id="wbl-pos"
              label="Position description"
              hint="What the student will do or observe. Real tasks of the occupation, not generic help."
              value={w.work.positionDescription}
              onChange={(v) => set("work", { positionDescription: v })}
              textarea
              required
            />
            <Field
              id="wbl-duties"
              label="Duties, one per line"
              value={w.work.duties.join("\n")}
              onChange={(v) => set("work", { duties: list(v) })}
              textarea
            />
            <Check
              label="The student complements paid staff and does not displace anyone (FLSA factor 6)."
              checked={w.work.noDisplacementAttestation}
              onChange={(v) => set("work", { noDisplacementAttestation: v })}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">What they'll learn</h3>
            <Field
              id="wbl-obj"
              label="Learning objectives, one per line"
              value={w.learning.objectives.join("\n")}
              onChange={(v) => set("learning", { objectives: list(v) })}
              textarea
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="wbl-tech"
                label="Technical skills"
                value={w.learning.technicalSkills}
                onChange={(v) => set("learning", { technicalSkills: v })}
                textarea
              />
              <Field
                id="wbl-prof"
                label="Professional skills"
                value={w.learning.professionalSkills}
                onChange={(v) => set("learning", { professionalSkills: v })}
                textarea
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Schedule and pay</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                id="wbl-hours"
                label="Total hours"
                type="number"
                value={w.schedule.totalHours}
                onChange={(v) => set("schedule", { totalHours: v })}
                required
              />
              <Field
                id="wbl-weekly"
                label="Hours per week"
                type="number"
                value={w.schedule.weeklyHours}
                onChange={(v) => set("schedule", { weeklyHours: v })}
              />
              <div>
                <label className="label" htmlFor="wbl-modality">
                  Modality
                </label>
                <select
                  id="wbl-modality"
                  className="field"
                  value={w.schedule.modality}
                  onChange={(e) =>
                    set("schedule", {
                      modality: e.target.value as WblDetail["schedule"]["modality"],
                    })
                  }
                >
                  <option value="">Choose…</option>
                  {MODALITIES.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="wbl-pay">
                  Compensation
                </label>
                <select
                  id="wbl-pay"
                  className="field"
                  value={w.compensation.type}
                  onChange={(e) =>
                    set("compensation", {
                      type: e.target.value as WblDetail["compensation"]["type"],
                    })
                  }
                >
                  <option value="">Choose…</option>
                  <option value="paid">Paid (W-2 or 1099)</option>
                  <option value="stipend">Stipend</option>
                  <option value="credit">School credit</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
              {w.compensation.type === "paid" && (
                <Field
                  id="wbl-rate"
                  label="Hourly rate ($)"
                  type="number"
                  value={w.compensation.hourlyRate}
                  onChange={(v) => set("compensation", { hourlyRate: v })}
                  required
                />
              )}
            </div>
            {w.compensation.type === "paid" && (
              <Check
                label="Paid on a W-2 (needed for Ohio's High School Tech Internship reimbursement)."
                checked={w.compensation.w2}
                onChange={(v) => set("compensation", { w2: v })}
              />
            )}
            {w.compensation.type === "unpaid" && (
              <Check
                label="Primary-beneficiary attestation: no expectation of pay, educational training tied to coursework, fits the academic calendar, limited duration, complements rather than displaces staff, no promise of a job (DOL Fact Sheet 71)."
                checked={w.compensation.primaryBeneficiaryAttestation}
                onChange={(v) => set("compensation", { primaryBeneficiaryAttestation: v })}
              />
            )}
            <fieldset>
              <legend className="label">Reimbursement you may be eligible for</legend>
              {REIMBURSEMENTS.map((r) => (
                <Check
                  key={r.key}
                  label={r.label}
                  checked={w.compensation.reimbursement.includes(r.key)}
                  onChange={(v) =>
                    set("compensation", {
                      reimbursement: v
                        ? [...w.compensation.reimbursement, r.key]
                        : w.compensation.reimbursement.filter((x) => x !== r.key),
                    })
                  }
                />
              ))}
            </fieldset>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Minor labor and safety</h3>
            <p className="text-xs text-ink-500">
              We run these checks at submission so nobody has to know the rules by heart.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="wbl-minage"
                label="Minimum age"
                type="number"
                value={w.legal.minAge}
                onChange={(v) => set("legal", { minAge: v })}
              />
              <Field
                id="wbl-safety"
                label="Safety training plan"
                hint="What orientation the student gets before day one."
                value={w.legal.safetyTrainingPlan}
                onChange={(v) => set("legal", { safetyTrainingPlan: v })}
                textarea
              />
            </div>
            <Check
              label="For students under 16: outside school hours only, at most 3 hours on a school day and 18 in a school week, between 7 a.m. and 7 p.m. (9 p.m. in summer)."
              checked={w.legal.hoursWithinLimits}
              onChange={(v) => set("legal", { hoursWithinLimits: v })}
            />
            <Check
              label="Workers' compensation covers the student."
              checked={w.legal.workersComp}
              onChange={(v) => set("legal", { workersComp: v })}
            />
            <Check
              label="Liability insurance covers the placement."
              checked={w.legal.liabilityInsurance}
              onChange={(v) => set("legal", { liabilityInsurance: v })}
            />
            <details className="rounded border border-line bg-paper-raised p-3">
              <summary className="cursor-pointer text-sm">
                Does the work touch any federal Hazardous Occupations Order? (
                {w.legal.hazardous.length} selected)
              </summary>
              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                {HAZARDOUS_ORDERS.map((h) => (
                  <Check
                    key={h}
                    small
                    label={h}
                    checked={w.legal.hazardous.includes(h)}
                    onChange={(v) =>
                      set("legal", {
                        hazardous: v
                          ? [...w.legal.hazardous, h]
                          : w.legal.hazardous.filter((x) => x !== h),
                      })
                    }
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-500">
                16- and 17-year-olds are barred from these; enrolled student-learners in approved
                programs may get limited exemptions under a written agreement. We'll flag, not
                block.
              </p>
            </details>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Your commitments</h3>
            <Check
              label="The mentor will complete a baseline and final skill rating through the emailed link."
              checked={w.commitments.evaluation}
              onChange={(v) => set("commitments", { evaluation: v })}
            />
            <Check
              label="The mentor will confirm the student's hours through the same link."
              checked={w.commitments.hoursConfirmation}
              onChange={(v) => set("commitments", { hoursConfirmation: v })}
            />
          </section>
        </>
      )}

      {issues.length > 0 && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">Before this can be submitted:</p>
          <ul className="mt-1 list-disc pl-5">
            {issues.map((i) => (
              <li key={i.field}>{i.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  textarea,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </label>
      {textarea ? (
        <textarea
          id={id}
          className="field min-h-[80px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          className="field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
  small,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  small?: boolean;
}) {
  return (
    <label className={`flex items-start gap-2 ${small ? "text-xs" : "text-sm"} text-ink-700`}>
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
