import {
  ADDON_BANK,
  ENVIRONMENT_DIMS,
  MAX_ADDED_MINUTES,
  MAX_ADDONS,
  MAX_ANSWER_WORDS,
  MAX_CUSTOM,
  MAX_CUSTOM_WORDS,
  REQUIREMENT_BY_KEY,
} from "./content";
import type { ApplicationBuilder, BuilderQuestion } from "./types";
import { wordCount } from "./validate";

/**
 * Partner application builder guardrails (spec section D). Pure, so the same
 * checks run live in the builder and again before a version is published.
 */

export type Issue = { path: string; message: string };
export type GuardrailResult = {
  errors: Issue[];
  warnings: Issue[];
  /** Estimated minutes the partner's part adds for a student. */
  minutes: number;
};

/** Topics partners may not ask about. Matched as whole words / phrases. */
const PROTECTED: Array<{ re: RegExp; topic: string }> = [
  {
    re: /\b(race|racial|ethnicit(y|ies)|ethnic|skin colou?r|nationality|national origin)\b/i,
    topic: "race or ethnicity",
  },
  { re: /\b(religio(n|us)|church|mosque|synagogue|temple|faith|pray(er)?)\b/i, topic: "religion" },
  {
    re: /\b(disabilit(y|ies)|disabled|handicap(ped)?|diagnos(is|ed)|medical condition|medication|iep|504 plan)\b/i,
    topic: "disability or health",
  },
  {
    re: /\b(immigra(nt|tion)|citizen(ship)?|undocumented|visa|green card|daca|legal status|born in)\b/i,
    topic: "immigration status",
  },
  {
    re: /\b(income|salary of your (parents|family)|free (or reduced )?lunch|reduced lunch|poverty|food stamps|snap benefits|welfare|public assistance)\b/i,
    topic: "family income",
  },
  {
    re: /\b(gender identity|sexual orientation|pronouns?|transgender|gay|lesbian|pregnan(t|cy))\b/i,
    topic: "gender identity, orientation or pregnancy",
  },
  {
    re: /\b(married|marital|arrest(ed)?|criminal record|convict(ed|ion))\b/i,
    topic: "marital status or criminal history",
  },
];

const CUTOFFS: Array<{ re: RegExp; message: string }> = [
  { re: /\b(gpa|grade point average)\b/i, message: "No GPA cutoffs or GPA questions." },
  {
    re: /\b(test scores?|act score|sat score|state test)\b/i,
    message: "No test-score cutoffs or questions.",
  },
  { re: /\battendance\b/i, message: "No attendance cutoffs or questions." },
  {
    re: /\b(\d+\+?\s*(years?|yrs?)\s*(of)?\s*(experience|exp)|years? of experience|prior experience required)\b/i,
    message:
      'No "years of experience" requirements; use the "Which of these have you tried?" question instead.',
  },
];

const JARGON =
  /\b(synerg\w*|leverag\w*|stakeholders?|deliverables?|kpis?|bandwidth|onboard(ing)?|cross-functional|paradigm|scalab\w*|ideat\w*)\b/i;

/** Text a student will read or answer, which must pass the protected-topic check. */
function partnerText(b: ApplicationBuilder): Array<{ path: string; text: string; asks: boolean }> {
  const out: Array<{ path: string; text: string; asks: boolean }> = [];
  b.questions.forEach((q, i) => {
    if (q.custom) out.push({ path: `questions.${i}.prompt`, text: q.prompt, asks: true });
    q.options.forEach((o, j) =>
      out.push({ path: `questions.${i}.options.${j}`, text: o, asks: true }),
    );
  });
  b.profile.niceToHave.forEach((t, i) =>
    out.push({ path: `profile.niceToHave.${i}`, text: t, asks: true }),
  );
  out.push({ path: "profile.description", text: b.profile.description, asks: false });
  b.profile.weekly.forEach((t, i) =>
    out.push({ path: `profile.weekly.${i}`, text: t, asks: false }),
  );
  b.requirements.forEach((r, i) => {
    if (r.detail) out.push({ path: `requirements.${i}.detail`, text: r.detail, asks: true });
  });
  return out;
}

export function questionMinutes(q: BuilderQuestion): number {
  const bank = ADDON_BANK.find((b) => b.id === q.id);
  if (bank) return bank.minutes;
  if (q.kind === "text") return Math.max(1, Math.ceil((q.maxWords ?? 100) / 40));
  return 1;
}

export function estimateMinutes(b: ApplicationBuilder): number {
  const qs = b.questions.reduce((s, q) => s + questionMinutes(q), 0);
  const reqs = Math.ceil(b.requirements.length / 4);
  return qs + reqs;
}

export function checkBuilder(b: ApplicationBuilder): GuardrailResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const p = b.profile;

  // D1 profile
  if (!p.title.trim())
    errors.push({ path: "profile.title", message: "Give the internship a title." });
  if (wordCount(p.description) < 20)
    errors.push({
      path: "profile.description",
      message: "Describe the internship in a short paragraph (20+ words).",
    });
  if (JARGON.test(p.description) || JARGON.test(p.weekly.join(" ")))
    warnings.push({
      path: "profile.description",
      message: "Some words may be jargon for a high schooler. Try plain words.",
    });
  const weekly = p.weekly.filter((w) => w.trim());
  if (weekly.length < 3 || weekly.length > 6)
    errors.push({ path: "profile.weekly", message: "List 3 to 6 things interns do each week." });
  if (!p.learnEarn.trim())
    errors.push({ path: "profile.learnEarn", message: "Say what interns will learn or earn." });
  if (p.careerFields.length === 0)
    errors.push({ path: "profile.careerFields", message: "Tag at least one career field." });
  if (ENVIRONMENT_DIMS.some((d) => !p.environment[d.key]))
    errors.push({ path: "profile.environment", message: "Set all five work-environment sliders." });
  if (!p.seats || p.seats < 1)
    errors.push({ path: "profile.seats", message: "How many interns can you take?" });
  if (!p.startDate || !p.endDate)
    errors.push({ path: "profile.dates", message: "Add start and end dates." });
  else if (p.endDate < p.startDate)
    errors.push({ path: "profile.dates", message: "The end date is before the start date." });
  if (!p.dailyHours.trim())
    errors.push({ path: "profile.dailyHours", message: "Add daily hours." });
  if (!p.address.trim()) errors.push({ path: "profile.address", message: "Add the site address." });

  // D2 questions
  const bankCount = b.questions.filter((q) => !q.custom).length;
  const customs = b.questions.filter((q) => q.custom);
  if (bankCount > MAX_ADDONS)
    errors.push({
      path: "questions",
      message: `Pick up to ${MAX_ADDONS} questions from the bank.`,
    });
  if (customs.length > MAX_CUSTOM)
    errors.push({ path: "questions", message: `Write up to ${MAX_CUSTOM} questions of your own.` });
  b.questions.forEach((q, i) => {
    const path = `questions.${i}`;
    if (q.custom) {
      if (!q.prompt.trim()) errors.push({ path: `${path}.prompt`, message: "Write the question." });
      if (wordCount(q.prompt) > MAX_CUSTOM_WORDS)
        errors.push({
          path: `${path}.prompt`,
          message: `Keep your question under ${MAX_CUSTOM_WORDS} words.`,
        });
      if (q.kind !== "text" && q.kind !== "choice")
        errors.push({
          path: `${path}.kind`,
          message: "Your own questions can be short text or multiple choice.",
        });
    }
    const bank = ADDON_BANK.find((x) => x.id === q.id);
    const needsOptions = bank?.needsOptions || q.kind === "choice";
    const opts = q.options.filter((o) => o.trim());
    if (needsOptions && opts.length === 0)
      errors.push({
        path: `${path}.options`,
        message: bank?.optionsHint ?? "Add the answer options.",
      });
    if (q.kind === "choice" && opts.length === 1)
      errors.push({
        path: `${path}.options`,
        message: "Multiple choice needs at least two options.",
      });
    if ((q.maxWords ?? 0) > MAX_ANSWER_WORDS)
      errors.push({
        path: `${path}.maxWords`,
        message: `Answers are capped at ${MAX_ANSWER_WORDS} words.`,
      });
    if ((q.kind === "upload" || q.kind === "media") && !q.optional)
      errors.push({ path: `${path}.optional`, message: "Uploads and video must stay optional." });
  });

  // Protected topics in anything students answer; cutoffs anywhere students read.
  for (const { path, text, asks } of partnerText(b)) {
    if (!text) continue;
    if (asks)
      for (const t of PROTECTED)
        if (t.re.test(text)) errors.push({ path, message: `Partners can't ask about ${t.topic}.` });
    for (const c of CUTOFFS) if (c.re.test(text)) errors.push({ path, message: c.message });
  }

  // D3 requirements
  b.requirements.forEach((r, i) => {
    const def = REQUIREMENT_BY_KEY.get(r.key);
    const path = `requirements.${i}`;
    if (!def) {
      errors.push({ path, message: "Unknown requirement." });
      return;
    }
    if (def.cost && !r.whoPays)
      errors.push({ path: `${path}.whoPays`, message: `Say who pays for: ${def.label}.` });
    if (def.category === "physical" && !r.essential)
      errors.push({
        path: `${path}.essential`,
        message: `Confirm "${def.label}" is essential to the job.`,
      });
    if (def.detailHint && !r.detail?.trim())
      warnings.push({
        path: `${path}.detail`,
        message: `Add a detail for ${def.label}: ${def.detailHint.toLowerCase()}.`,
      });
  });
  const { min, max, reason } = b.age;
  if (min !== null && (min < 14 || min > 18))
    errors.push({ path: "age.min", message: "Minimum age must be 14 to 18." });
  if (max !== null && min !== null && max <= min)
    errors.push({ path: "age.max", message: "Maximum age must be above the minimum." });
  if ((min !== null || max !== null) && !reason)
    errors.push({ path: "age.reason", message: "Every age limit needs a reason." });

  const minutes = estimateMinutes(b);
  if (minutes > MAX_ADDED_MINUTES)
    errors.push({
      path: "questions",
      message: `Your questions add about ${minutes} minutes. Keep it to ${MAX_ADDED_MINUTES} or less.`,
    });

  return { errors, warnings, minutes };
}

/** Requirements that cost the student money: flagged for EXPLR's support fund. */
export function studentPaysItems(b: ApplicationBuilder): string[] {
  return b.requirements
    .filter((r) => r.whoPays === "student")
    .map((r) => REQUIREMENT_BY_KEY.get(r.key)?.label ?? r.key);
}
