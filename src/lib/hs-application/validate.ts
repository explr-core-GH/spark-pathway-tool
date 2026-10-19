import { SHORT_ANSWER_MAX_WORDS, SHORT_ANSWER_MIN_WORDS } from "./content";
import type { CoreAnswers, SurveyExtras } from "./types";

export function wordCount(s: string | null | undefined): number {
  return (s ?? "").trim().split(/\s+/).filter(Boolean).length;
}

export function isEmail(s: string | null | undefined): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((s ?? "").trim());
}

export function isPhone(s: string | null | undefined): boolean {
  return (s ?? "").replace(/\D/g, "").length >= 10;
}

/** Whole years on `on`, parsing YYYY-MM-DD as a local date. */
export function ageOn(dob: string, on: Date): number | null {
  const [y, m, d] = dob.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  let age = on.getFullYear() - y;
  if (on.getMonth() + 1 < m || (on.getMonth() + 1 === m && on.getDate() < d)) age--;
  return age;
}

export function isUnder18(core: Pick<CoreAnswers, "dob">, on: Date = new Date()): boolean {
  if (!core.dob) return true; // unknown: ask for guardian details to be safe
  const a = ageOn(core.dob, on);
  return a === null || a < 18;
}

/** The general application's steps, in order. */
export const GENERAL_STEPS = [
  { key: "about", label: "About you" },
  { key: "logistics", label: "Getting to work" },
  { key: "story", label: "Your story" },
  { key: "plans", label: "After high school" },
  { key: "support", label: "Support and consent" },
  { key: "demographics", label: "Optional: reporting" },
  { key: "survey", label: "Interest survey" },
  { key: "matches", label: "Your matches" },
  { key: "review", label: "Review and submit" },
] as const;
export type StepKey = (typeof GENERAL_STEPS)[number]["key"];

export type StepErrors = Record<string, string>;

function shortAnswer(errors: StepErrors, key: keyof CoreAnswers, text: string) {
  const n = wordCount(text);
  if (n < SHORT_ANSWER_MIN_WORDS)
    errors[key] = `Write at least ${SHORT_ANSWER_MIN_WORDS} words (you have ${n}).`;
  else if (n > SHORT_ANSWER_MAX_WORDS)
    errors[key] = `Keep it to ${SHORT_ANSWER_MAX_WORDS} words or fewer (you have ${n}).`;
}

/** Errors that block leaving a step. Optional fields never appear here. */
export function validateCoreStep(
  step: StepKey,
  c: CoreAnswers,
  now: Date = new Date(),
): StepErrors {
  const e: StepErrors = {};
  const req = (k: keyof CoreAnswers, msg: string) => {
    const v = c[k];
    if (v === null || v === undefined || (typeof v === "string" && !v.trim())) e[k] = msg;
  };
  switch (step) {
    case "about":
      req("legalFirst", "Enter your legal first name.");
      req("legalLast", "Enter your legal last name.");
      if (!isEmail(c.email)) e.email = "Enter an email you check.";
      if (!isPhone(c.phone)) e.phone = "Enter a cell number with area code.";
      if (c.okToText === null) e.okToText = "Tell us if it's OK to text you.";
      if (!c.dob) e.dob = "Enter your date of birth.";
      else {
        const a = ageOn(c.dob, now);
        if (a === null || a < 13 || a > 22) e.dob = "Check your date of birth.";
      }
      req("school", "Pick your school.");
      req("gradeFall", "Pick your grade this fall.");
      if (!/^\d{5}$/.test(c.zip.trim())) e.zip = "Enter a 5-digit ZIP code.";
      if (!isEmail(c.youEmail))
        e.youEmail = "Enter the email you used on your Youth Opportunities Unlimited application.";
      break;
    case "logistics":
      if (c.allWeeks === null) e.allWeeks = "Tell us if you can work all program weeks.";
      if (c.allWeeks === false && !c.datesCant.trim())
        e.datesCant = "List the dates you can't work.";
      if (c.transport.length === 0) e.transport = "Pick at least one way you'd get there.";
      if (c.needsBusPass === null) e.needsBusPass = "Tell us if you'd need a bus pass.";
      if (isUnder18(c, now) && !c.workPermit) e.workPermit = "Tell us about your work permit.";
      break;
    case "story":
      shortAnswer(e, "madeFixed", c.madeFixed);
      shortAnswer(e, "hopeToGet", c.hopeToGet);
      break;
    case "plans":
      if (c.postHs.length === 0) e.postHs = 'Pick at least one ("Not sure yet" is fine).';
      if (!c.planSure) e.planSure = "Tell us how sure you feel.";
      if (c.collegeCourses === null) e.collegeCourses = "Tell us if you've taken college courses.";
      if (c.collegeCourses && !c.collegeCoursesWhich.trim())
        e.collegeCoursesWhich = "Which courses, and where?";
      if (c.careerTech === null) e.careerTech = "Tell us if you're in a career-tech program.";
      if (c.careerTech && !c.careerTechWhich.trim()) e.careerTechWhich = "Which program?";
      break;
    case "support": {
      const minor = isUnder18(c, now);
      if (minor) {
        req("guardianName", "Enter a parent or guardian's name.");
        if (!isPhone(c.guardianPhone)) e.guardianPhone = "Enter their phone number.";
        if (!isEmail(c.guardianEmail)) e.guardianEmail = "Enter their email.";
      }
      req("emergencyName", "Enter an emergency contact.");
      if (!isPhone(c.emergencyPhone)) e.emergencyPhone = "Enter their phone number.";
      if (!c.consentStudent || !c.consentStudentName.trim())
        e.consentStudent = "Check the box and type your name to sign.";
      if (minor && (!c.consentGuardian || !c.consentGuardianName.trim()))
        e.consentGuardian = "A parent or guardian needs to check the box and type their name.";
      break;
    }
    default:
      break;
  }
  return e;
}

/** Survey extras are all required except experience notes. */
export function validateExtras(
  x: SurveyExtras,
  counts: {
    activities: number;
    pairs: number;
    environment: number;
    experience: number;
  },
): StepErrors {
  const e: StepErrors = {};
  if (x.fields.length === 0) e.fields = "Tap at least one career field.";
  if (Object.keys(x.activities).length < counts.activities) e.activities = "Rate every activity.";
  if (Object.keys(x.pairs).length < counts.pairs) e.pairs = "Pick one from each pair.";
  if (Object.keys(x.environment).length < counts.environment) e.environment = "Set every slider.";
  if (Object.keys(x.experience).length < counts.experience)
    e.experience = "Answer every experience.";
  return e;
}

/** Edit distance, for spotting a mistyped YOU email. */
export function editDistance(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const d: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[n];
}

/**
 * Staff flag for the YOU email: exact duplicates on another application, or
 * a near-match (1-2 characters off) that looks like a typo.
 */
export function youEmailFlags(
  mine: string,
  others: Array<{ id: string; email: string }>,
): Array<{ id: string; email: string; kind: "duplicate" | "near" }> {
  const me = mine.trim().toLowerCase();
  if (!me) return [];
  const out: Array<{ id: string; email: string; kind: "duplicate" | "near" }> = [];
  for (const o of others) {
    const e = o.email.trim().toLowerCase();
    if (!e) continue;
    if (e === me) out.push({ ...o, kind: "duplicate" });
    else if (Math.abs(e.length - me.length) <= 2 && editDistance(e, me) <= 2)
      out.push({ ...o, kind: "near" });
  }
  return out;
}
