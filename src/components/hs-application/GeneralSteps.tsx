import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { SchoolSearch } from "@/components/SchoolSearch";
import {
  ACTIVITY_ITEMS,
  ACTIVITY_SCALE,
  APPLICATION_PROGRESS,
  CAREER_FIELDS,
  CREDENTIAL_OPTIONS,
  ENVIRONMENT_DIMS,
  EXPERIENCE_ITEMS,
  FORCED_PAIRS,
  GRADE_OPTIONS,
  MAX_RANKED,
  POST_HS_PLANS,
  REACTIONS,
  SHORT_ANSWER_MAX_WORDS,
  SHORT_ANSWER_MIN_WORDS,
  TRANSPORT_OPTIONS,
  VALENCE_OPTIONS,
  WORK_PERMIT_OPTIONS,
  YOU_EMAIL_HELP,
  type Reaction,
} from "@/lib/hs-application/content";
import type { HsMatch } from "@/lib/hs-application/match";
import type { AssessmentSnapshot } from "@/lib/hs-application/data";
import type {
  CoreAnswers,
  Demographics,
  GeneralChoices,
  SurveyExtras,
} from "@/lib/hs-application/types";
import { isUnder18, type StepErrors } from "@/lib/hs-application/validate";
import {
  Choice,
  MultiChoice,
  ScaleSlider,
  Section,
  SelectField,
  TextArea,
  TextField,
  YES_NO,
} from "./fields";
import { RETURN_KEY } from "./ReturnToApplication";

type CoreProps = {
  core: CoreAnswers;
  set: (patch: Partial<CoreAnswers>) => void;
  errors: StepErrors;
};

const opts = <T extends { key: string; label: string }>(xs: readonly T[]) =>
  xs.map((x) => ({ value: x.key, label: x.label }));

// ── A1 ──────────────────────────────────────────────────────────────────
export function AboutStep({ core, set, errors }: CoreProps) {
  const [otherSchool, setOtherSchool] = useState(false);
  return (
    <Section title="About you" lead="Use your legal name, the one on your school records.">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Legal first name"
          required
          value={core.legalFirst}
          onChange={(v) => set({ legalFirst: v })}
          error={errors.legalFirst}
          autoComplete="given-name"
        />
        <TextField
          label="Legal last name"
          required
          value={core.legalLast}
          onChange={(v) => set({ legalLast: v })}
          error={errors.legalLast}
          autoComplete="family-name"
        />
      </div>
      <TextField
        label="Name you want us to use"
        value={core.preferredName}
        onChange={(v) => set({ preferredName: v })}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Email you check most"
          type="email"
          required
          value={core.email}
          onChange={(v) => set({ email: v })}
          error={errors.email}
          autoComplete="email"
          inputMode="email"
        />
        <TextField
          label="Cell phone"
          type="tel"
          required
          value={core.phone}
          onChange={(v) => set({ phone: v })}
          error={errors.phone}
          autoComplete="tel"
          inputMode="tel"
        />
      </div>
      <Choice
        legend="Is it OK to text you about your application?"
        required
        value={core.okToText}
        onChange={(v) => set({ okToText: v })}
        options={YES_NO}
        error={errors.okToText}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Date of birth"
          type="date"
          required
          value={core.dob}
          onChange={(v) => set({ dob: v })}
          error={errors.dob}
          autoComplete="bday"
        />
        <SelectField
          label="Grade this fall"
          required
          value={core.gradeFall}
          onChange={(v) => set({ gradeFall: v })}
          options={GRADE_OPTIONS}
          error={errors.gradeFall}
        />
      </div>
      <div>
        <p className="label">
          School{" "}
          <span aria-hidden="true" className="text-red-700">
            *
          </span>
        </p>
        {otherSchool ? (
          <TextField
            label="School name"
            required
            value={core.school}
            onChange={(v) => set({ school: v })}
            error={errors.school}
          />
        ) : (
          <>
            {core.school && (
              <p className="mb-2 text-sm">
                Selected: <span className="font-medium">{core.school}</span>
              </p>
            )}
            <SchoolSearch
              label="Search for your school"
              onSelect={(s) => set({ school: s.name })}
              placeholder="Start typing your school's name"
            />
            {errors.school && (
              <p role="alert" className="mt-1 text-sm text-red-700">
                {errors.school}
              </p>
            )}
          </>
        )}
        <button
          type="button"
          className="mt-2 min-h-[44px] text-sm font-medium text-green-deep underline"
          onClick={() => setOtherSchool((v) => !v)}
        >
          {otherSchool ? "Search the school list instead" : "My school isn't listed"}
        </button>
      </div>
      <TextField
        label="Home ZIP code"
        required
        value={core.zip}
        onChange={(v) => set({ zip: v.replace(/\D/g, "").slice(0, 5) })}
        error={errors.zip}
        inputMode="numeric"
        autoComplete="postal-code"
        className="sm:max-w-[200px]"
      />
      <TextField
        label="Email you used on your Youth Opportunities Unlimited application"
        type="email"
        required
        value={core.youEmail}
        onChange={(v) => set({ youEmail: v })}
        help={YOU_EMAIL_HELP}
        error={errors.youEmail}
        inputMode="email"
      />
    </Section>
  );
}

// ── A2 ──────────────────────────────────────────────────────────────────
export function LogisticsStep({
  core,
  set,
  errors,
  programDates,
}: CoreProps & { programDates: string }) {
  const minor = isUnder18(core);
  return (
    <Section
      title="Getting to work"
      lead={programDates ? `This season's internships run ${programDates}.` : undefined}
    >
      <Choice
        legend="Can you work all program weeks?"
        required
        value={core.allWeeks}
        onChange={(v) => set({ allWeeks: v })}
        options={YES_NO}
        error={errors.allWeeks}
      />
      {core.allWeeks === false && (
        <TextArea
          label="Which dates can't you work?"
          required
          rows={2}
          value={core.datesCant}
          onChange={(v) => set({ datesCant: v })}
          error={errors.datesCant}
          help="For example: July 1–5, family trip."
        />
      )}
      <MultiChoice
        legend="How would you get to an internship site?"
        required
        values={core.transport}
        onChange={(v) => set({ transport: v })}
        options={opts(TRANSPORT_OPTIONS)}
        error={errors.transport}
        help="Pick all that could work."
      />
      <Choice
        legend="Would you need a bus pass?"
        required
        value={core.needsBusPass}
        onChange={(v) => set({ needsBusPass: v })}
        options={YES_NO}
        error={errors.needsBusPass}
      />
      {minor && (
        <Choice
          legend="Do you have a work permit (age and schooling certificate)?"
          required
          value={core.workPermit}
          onChange={(v) => set({ workPermit: v })}
          options={WORK_PERMIT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
          error={errors.workPermit}
          help="Ohio students under 18 need one to work. If you don't have one yet, that's OK. We'll help you get it."
        />
      )}
      <Choice
        legend="Have you done an EXPLR program before?"
        value={core.priorExplr}
        onChange={(v) => set({ priorExplr: v })}
        options={YES_NO}
      />
      {core.priorExplr && (
        <TextField
          label="Which one?"
          value={core.priorExplrWhich}
          onChange={(v) => set({ priorExplrWhich: v })}
        />
      )}
    </Section>
  );
}

// ── A3 ──────────────────────────────────────────────────────────────────
export function StoryStep({ core, set, errors }: CoreProps) {
  return (
    <Section
      title="Tell us about you"
      lead={`Write ${SHORT_ANSWER_MIN_WORDS}–${SHORT_ANSWER_MAX_WORDS} words for each. You can type or use voice-to-text on your phone.`}
    >
      <TextArea
        label="Tell us about something you made, fixed or figured out. It can be from school, home, a job or a hobby."
        required
        value={core.madeFixed}
        onChange={(v) => set({ madeFixed: v })}
        minWords={SHORT_ANSWER_MIN_WORDS}
        maxWords={SHORT_ANSWER_MAX_WORDS}
        error={errors.madeFixed}
      />
      <TextArea
        label="What do you hope to get out of a summer internship?"
        required
        value={core.hopeToGet}
        onChange={(v) => set({ hopeToGet: v })}
        minWords={SHORT_ANSWER_MIN_WORDS}
        maxWords={SHORT_ANSWER_MAX_WORDS}
        error={errors.hopeToGet}
      />
    </Section>
  );
}

// ── A5 ──────────────────────────────────────────────────────────────────
export function PlansStep({ core, set, errors }: CoreProps) {
  return (
    <Section
      title="Your plans after high school"
      lead="There are no wrong answers. Plans change, and that's fine."
    >
      <TextArea
        label="Any specific jobs you've thought about?"
        rows={2}
        value={core.jobsThought}
        onChange={(v) => set({ jobsThought: v })}
        help="For example: nurse, video editor, electrician, lawyer."
      />
      <MultiChoice
        legend="What do you think you'll do after high school?"
        required
        values={core.postHs}
        onChange={(v) => set({ postHs: v })}
        options={opts(POST_HS_PLANS)}
        error={errors.postHs}
        help="Pick all that fit."
      />
      <Choice
        legend="How sure do you feel about that plan?"
        required
        value={core.planSure}
        onChange={(v) => set({ planSure: v })}
        options={[
          { value: 1, label: "1 · Just exploring" },
          { value: 2, label: "2" },
          { value: 3, label: "3" },
          { value: 4, label: "4" },
          { value: 5, label: "5 · Very sure" },
        ]}
        error={errors.planSure}
      />
      <Choice
        legend="Have you taken any college courses, like College Credit Plus?"
        required
        value={core.collegeCourses}
        onChange={(v) => set({ collegeCourses: v })}
        options={YES_NO}
        error={errors.collegeCourses}
      />
      {core.collegeCourses && (
        <TextField
          label="Which ones, and where?"
          required
          value={core.collegeCoursesWhich}
          onChange={(v) => set({ collegeCoursesWhich: v })}
          error={errors.collegeCoursesWhich}
          placeholder="For example: English 101 at Tri-C"
        />
      )}
      <Choice
        legend="Are you in a career-tech program at school?"
        required
        value={core.careerTech}
        onChange={(v) => set({ careerTech: v })}
        options={YES_NO}
        error={errors.careerTech}
      />
      {core.careerTech && (
        <TextField
          label="Which program?"
          required
          value={core.careerTechWhich}
          onChange={(v) => set({ careerTechWhich: v })}
          error={errors.careerTechWhich}
        />
      )}
      <MultiChoice
        legend="Certifications or credentials you've earned"
        values={core.credentials}
        onChange={(v) => set({ credentials: v })}
        options={CREDENTIAL_OPTIONS.map((c) => ({ value: c, label: c }))}
      />
      <TextField
        label="Other credentials"
        value={core.credentialsOther}
        onChange={(v) => set({ credentialsOther: v })}
      />
      <Choice
        legend="Have you started a college, trade or military application?"
        value={core.postHsApplication}
        onChange={(v) => set({ postHsApplication: v })}
        options={APPLICATION_PROGRESS.map((o) => ({ value: o.key, label: o.label }))}
      />
    </Section>
  );
}

// ── A4 ──────────────────────────────────────────────────────────────────
export function SupportStep({ core, set, errors }: CoreProps) {
  const minor = isUnder18(core);
  return (
    <>
      <Section title="Support">
        <TextArea
          label="Is there anything that would help you do your best at work?"
          rows={3}
          value={core.supportNeeds}
          onChange={(v) => set({ supportNeeds: v })}
          help="For example: a schedule need, getting around a building, language, or tech. Only EXPLR staff see this."
        />
      </Section>
      <Section
        title={minor ? "Parent or guardian" : "Parent or guardian (optional)"}
        lead="We send them a copy of every update about your application."
      >
        <TextField
          label="Name"
          required={minor}
          value={core.guardianName}
          onChange={(v) => set({ guardianName: v })}
          error={errors.guardianName}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Phone"
            type="tel"
            required={minor}
            value={core.guardianPhone}
            onChange={(v) => set({ guardianPhone: v })}
            error={errors.guardianPhone}
            inputMode="tel"
          />
          <TextField
            label="Email"
            type="email"
            required={minor}
            value={core.guardianEmail}
            onChange={(v) => set({ guardianEmail: v })}
            error={errors.guardianEmail}
            inputMode="email"
          />
        </div>
      </Section>
      <Section title="Emergency contact">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Name"
            required
            value={core.emergencyName}
            onChange={(v) => set({ emergencyName: v })}
            error={errors.emergencyName}
          />
          <TextField
            label="Phone"
            type="tel"
            required
            value={core.emergencyPhone}
            onChange={(v) => set({ emergencyPhone: v })}
            error={errors.emergencyPhone}
            inputMode="tel"
          />
        </div>
      </Section>
      <Section title="Consent">
        <p className="text-sm text-ink-700">
          EXPLR uses this application to match and place you in an internship. Only EXPLR staff see
          your application. Partners only learn who was placed with them. Read our{" "}
          <Link to="/privacy" className="ink-link">
            privacy policy
          </Link>{" "}
          and{" "}
          <Link to="/terms" className="ink-link">
            terms
          </Link>
          .
        </p>
        <Signature
          checked={core.consentStudent}
          name={core.consentStudentName}
          onChecked={(v) => set({ consentStudent: v })}
          onName={(v) => set({ consentStudentName: v })}
          label="I agree, and the information I gave is true."
          nameLabel="Type your full name to sign"
          error={errors.consentStudent}
        />
        {minor && (
          <Signature
            checked={core.consentGuardian}
            name={core.consentGuardianName}
            onChecked={(v) => set({ consentGuardian: v })}
            onName={(v) => set({ consentGuardianName: v })}
            label="Parent or guardian: I agree to these terms and to EXPLR using this information."
            nameLabel="Parent or guardian, type your full name to sign"
            error={errors.consentGuardian}
          />
        )}
      </Section>
    </>
  );
}

function Signature(props: {
  checked: boolean;
  name: string;
  onChecked: (v: boolean) => void;
  onName: (v: string) => void;
  label: string;
  nameLabel: string;
  error?: string;
}) {
  return (
    <div className="rounded-[var(--radius-control)] border border-line p-4">
      <label className="flex min-h-[44px] items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 accent-green-deep"
          checked={props.checked}
          onChange={(e) => props.onChecked(e.target.checked)}
        />
        <span>{props.label}</span>
      </label>
      <TextField
        label={props.nameLabel}
        required
        value={props.name}
        onChange={props.onName}
        className="mt-3"
      />
      {props.error && (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {props.error}
        </p>
      )}
    </div>
  );
}

// ── Optional demographics (separate, funder reporting only) ─────────────
export function DemographicsStep({
  value,
  onChange,
}: {
  value: Demographics;
  onChange: (d: Demographics) => void;
}) {
  return (
    <Section
      title="Optional: for reporting only"
      lead="You can skip this page. EXPLR uses these answers only to report to funders and to check that internships reach every community. Partners never see them, and they don't affect your placement."
    >
      <SelectField
        label="Gender"
        value={value.gender ?? ""}
        onChange={(v) => onChange({ ...value, gender: v })}
        options={[
          { value: "woman", label: "Woman or girl" },
          { value: "man", label: "Man or boy" },
          { value: "nonbinary", label: "Nonbinary" },
          { value: "self", label: "I describe myself another way" },
          { value: "no_answer", label: "Prefer not to say" },
        ]}
      />
      <MultiChoice
        legend="Race"
        values={value.race ?? []}
        onChange={(v) => onChange({ ...value, race: v })}
        options={[
          { value: "american_indian", label: "American Indian or Alaska Native" },
          { value: "asian", label: "Asian" },
          { value: "black", label: "Black or African American" },
          { value: "pacific", label: "Native Hawaiian or Pacific Islander" },
          { value: "white", label: "White" },
          { value: "multi", label: "Two or more" },
          { value: "no_answer", label: "Prefer not to say" },
        ]}
      />
      <SelectField
        label="Hispanic or Latino/a/e"
        value={value.ethnicity ?? ""}
        onChange={(v) => onChange({ ...value, ethnicity: v })}
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "no_answer", label: "Prefer not to say" },
        ]}
      />
      <SelectField
        label="Would you be the first in your family to go to college?"
        value={value.firstGen ?? ""}
        onChange={(v) => onChange({ ...value, firstGen: v })}
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "not_sure", label: "Not sure" },
        ]}
      />
      <TextField
        label="Language(s) spoken at home"
        value={value.languageAtHome ?? ""}
        onChange={(v) => onChange({ ...value, languageAtHome: v })}
      />
    </Section>
  );
}

// ── B. Interest survey ──────────────────────────────────────────────────
export function SurveyStep(props: {
  extras: SurveyExtras;
  setExtras: (x: SurveyExtras) => void;
  assessment: AssessmentSnapshot | null;
  errors: StepErrors;
}) {
  const { extras: x, setExtras } = props;
  const goSurvey = () => {
    try {
      sessionStorage.setItem(RETURN_KEY, "1");
    } catch {
      /* ignore */
    }
  };
  return (
    <>
      <Section title="Part 1 · Your interest survey">
        {props.assessment ? (
          <div className="rounded-[var(--radius-control)] border border-mint-soft bg-mint-tint p-4">
            <p className="text-sm text-ink-900">
              You took the interest survey on{" "}
              {new Date(props.assessment.completed_at).toLocaleDateString()}. Your Holland code is{" "}
              <span className="font-display text-lg font-bold">
                {props.assessment.holland_code}
              </span>
              . We'll use these results.
            </p>
            <Link to="/assessment" onClick={goSurvey} className="btn-ghost mt-3">
              Retake the survey
            </Link>
          </div>
        ) : (
          <div className="rounded-[var(--radius-control)] border border-line bg-gold-tint p-4">
            <p className="text-sm text-ink-900">
              Take the interest survey first. It's 48 quick questions about things you might like to
              do, about 10 minutes. When you finish, you'll come right back here.
            </p>
            <Link to="/assessment" onClick={goSurvey} className="btn-ink mt-3">
              Take the interest survey →
            </Link>
            {props.errors.assessment && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {props.errors.assessment}
              </p>
            )}
          </div>
        )}
      </Section>

      <Section
        title="Part 2 · Career fields"
        lead="Tap any that interest you. You can pick as many as you like."
      >
        <MultiChoice
          legend="Career fields that interest you"
          required
          values={x.fields}
          onChange={(v) => setExtras({ ...x, fields: v })}
          options={CAREER_FIELDS.map((f) => ({ value: f.key, label: f.label }))}
          error={props.errors.fields}
        />
      </Section>

      <Section title="Part 3 · Would you like to…">
        {ACTIVITY_ITEMS.map((a) => (
          <Choice
            key={a.id}
            legend={a.text}
            required
            value={x.activities[a.id]}
            onChange={(v) => setExtras({ ...x, activities: { ...x.activities, [a.id]: v } })}
            options={ACTIVITY_SCALE}
          />
        ))}
        {props.errors.activities && (
          <p role="alert" className="text-sm text-red-700">
            {props.errors.activities}
          </p>
        )}
      </Section>

      <Section title="Part 4 · Pick one from each pair" lead="Go with your gut.">
        {FORCED_PAIRS.map((p, i) => (
          <Choice
            key={p.id}
            legend={`Pair ${i + 1}`}
            required
            value={x.pairs[p.id]}
            onChange={(v) => setExtras({ ...x, pairs: { ...x.pairs, [p.id]: v } })}
            options={[
              { value: "a" as const, label: p.a.text },
              { value: "b" as const, label: p.b.text },
            ]}
          />
        ))}
        {props.errors.pairs && (
          <p role="alert" className="text-sm text-red-700">
            {props.errors.pairs}
          </p>
        )}
      </Section>

      <Section
        title="Part 5 · How you like to work"
        lead="Tap the box closer to the side that sounds more like you."
      >
        {ENVIRONMENT_DIMS.map((d) => (
          <ScaleSlider
            key={d.key}
            left={d.left}
            right={d.right}
            value={x.environment[d.key]}
            onChange={(v) => setExtras({ ...x, environment: { ...x.environment, [d.key]: v } })}
          />
        ))}
        {props.errors.environment && (
          <p role="alert" className="text-sm text-red-700">
            {props.errors.environment}
          </p>
        )}
      </Section>

      <Section
        title="Part 6 · Things you've done (or haven't)"
        lead="Never tried something but curious? That counts almost as much as having done it."
      >
        {EXPERIENCE_ITEMS.map((e) => (
          <Choice
            key={e.key}
            legend={e.label}
            required
            value={x.experience[e.key]}
            onChange={(v) => setExtras({ ...x, experience: { ...x.experience, [e.key]: v } })}
            options={VALENCE_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
          />
        ))}
        {props.errors.experience && (
          <p role="alert" className="text-sm text-red-700">
            {props.errors.experience}
          </p>
        )}
      </Section>
    </>
  );
}

// ── C. Matches ──────────────────────────────────────────────────────────
export type MatchCard = {
  ref: string;
  name: string;
  org: string;
  blurb: string;
  match: HsMatch;
  questionCount: number;
};

export function MatchesStep(props: {
  cards: MatchCard[];
  allCards: MatchCard[];
  choices: GeneralChoices;
  setChoices: (c: GeneralChoices) => void;
  errors: StepErrors;
}) {
  const { choices: c, setChoices } = props;
  const [showAll, setShowAll] = useState(!!c.addedRef);
  const react = (ref: string, r: Reaction) => {
    const reactions = { ...c.reactions, [ref]: r };
    const ranked = r === "not_for_me" ? c.ranked.filter((x) => x !== ref) : c.ranked;
    setChoices({ ...c, reactions, ranked });
  };
  const toggleRank = (ref: string) => {
    if (c.ranked.includes(ref)) setChoices({ ...c, ranked: c.ranked.filter((x) => x !== ref) });
    else if (c.ranked.length < MAX_RANKED) setChoices({ ...c, ranked: [...c.ranked, ref] });
  };
  const nameOf = (ref: string) => props.allCards.find((x) => x.ref === ref)?.name ?? "Internship";
  const rankable = [
    ...props.cards.filter((m) => c.reactions[m.ref] && c.reactions[m.ref] !== "not_for_me"),
    ...props.allCards.filter(
      (m) => m.ref === c.addedRef && !props.cards.some((x) => x.ref === m.ref),
    ),
  ];
  const others = props.allCards.filter((m) => !props.cards.some((x) => x.ref === m.ref));
  return (
    <>
      <Section
        title="Your top matches"
        lead="Based on your survey. Tell us how each one sounds. This doesn't lock you in: EXPLR staff look at everything before placing you."
      >
        {props.cards.length === 0 && (
          <p className="text-sm text-ink-700">
            No internships are open yet. Check “Place me where I'll fit best” and we'll match you
            when they open.
          </p>
        )}
        <ol className="grid gap-4">
          {props.cards.map((m, i) => (
            <li
              key={m.ref}
              className="rounded-[var(--radius-card)] border border-line bg-paper p-4"
            >
              <p className="eyebrow">Match {i + 1}</p>
              <p className="mt-1 font-display text-lg font-semibold">{m.name}</p>
              {m.org && <p className="text-sm text-ink-700">{m.org}</p>}
              <p className="mt-2 text-sm text-ink-700">{m.blurb}</p>
              <p className="mt-2 text-sm font-medium text-green-deep">
                Why this matched: {m.match.why}
              </p>
              <div className="mt-3">
                <Choice
                  legend={`How does ${m.name} sound?`}
                  required
                  value={c.reactions[m.ref]}
                  onChange={(r) => react(m.ref, r)}
                  options={REACTIONS.map((r) => ({ value: r.key, label: r.label }))}
                />
              </div>
            </li>
          ))}
        </ol>
        {props.errors.reactions && (
          <p role="alert" className="text-sm text-red-700">
            {props.errors.reactions}
          </p>
        )}
      </Section>

      <Section
        title="See all internships"
        lead="Something else catch your eye? You can add one internship that wasn't in your matches."
      >
        <button
          type="button"
          className="btn-ghost w-fit"
          aria-expanded={showAll}
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Hide the full list" : `See all ${props.allCards.length} internships`}
        </button>
        {showAll && (
          <ul className="grid gap-2">
            {others.length === 0 && (
              <li className="text-sm text-ink-700">
                Every open internship is already in your matches.
              </li>
            )}
            {others.map((m) => {
              const on = c.addedRef === m.ref;
              return (
                <li
                  key={m.ref}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] border border-line bg-paper p-3"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{m.name}</span>
                    {m.org && <span className="ml-2 text-xs text-ink-700">{m.org}</span>}
                  </span>
                  {m.match.blockedLabel ? (
                    <span className="rounded-full bg-paper-sunken px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-700">
                      {m.match.blockedLabel}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={on ? "btn-ink" : "btn-ghost"}
                      aria-pressed={on}
                      onClick={() =>
                        setChoices({
                          ...c,
                          addedRef: on ? null : m.ref,
                          ranked: on ? c.ranked.filter((x) => x !== m.ref) : c.ranked,
                        })
                      }
                    >
                      {on ? "Added ✓" : "Add"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section
        title={`Rank up to ${MAX_RANKED}`}
        lead="Tap in order: your first tap is your #1 choice."
      >
        {rankable.length === 0 ? (
          <p className="text-sm text-ink-700">
            Mark matches as “Excited” or “Open to it” to rank them.
          </p>
        ) : (
          <ul className="grid gap-2">
            {rankable.map((m) => {
              const pos = c.ranked.indexOf(m.ref);
              return (
                <li key={m.ref}>
                  <button
                    type="button"
                    aria-pressed={pos >= 0}
                    onClick={() => toggleRank(m.ref)}
                    className={`flex min-h-[44px] w-full items-center gap-3 rounded-[var(--radius-control)] border px-3 text-left text-sm ${pos >= 0 ? "border-ink-900 bg-mint-tint" : "border-line bg-paper hover:border-ink-900"}`}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-900 font-mono text-xs text-paper">
                      {pos >= 0 ? pos + 1 : "–"}
                    </span>
                    <span className="font-medium">{m.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {c.ranked.length > 0 && (
          <p className="text-sm text-ink-700">
            Your order: {c.ranked.map((r, i) => `#${i + 1} ${nameOf(r)}`).join(" · ")}
          </p>
        )}
        <label className="flex min-h-[44px] items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-5 w-5 accent-green-deep"
            checked={c.placeAnywhere}
            onChange={(e) => setChoices({ ...c, placeAnywhere: e.target.checked })}
          />
          <span>Place me where I'll fit best</span>
        </label>
        {props.errors.ranked && (
          <p role="alert" className="text-sm text-red-700">
            {props.errors.ranked}
          </p>
        )}
      </Section>

      <Section title="One last question">
        <TextArea
          label="Is there a kind of work you've always wanted to try that we didn't ask about?"
          rows={3}
          value={c.tryText}
          onChange={(v) => setChoices({ ...c, tryText: v })}
        />
      </Section>
    </>
  );
}

export function validateMatches(c: GeneralChoices, shown: string[]): StepErrors {
  const e: StepErrors = {};
  if (shown.some((r) => !c.reactions[r])) e.reactions = "Tell us how each match sounds.";
  if (c.ranked.length === 0 && !c.placeAnywhere)
    e.ranked = "Rank at least one internship, or check “Place me where I'll fit best.”";
  return e;
}
