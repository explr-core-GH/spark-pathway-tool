import type { Passport, Experience } from "@/lib/passport";
import { EXPERIENCE_TYPE_BY_KEY, isExposure } from "@/lib/wbl-taxonomy";

/**
 * Advising checkpoints (docs/ohio-career-advising-alignment.md, section 4).
 *
 * Two checkpoints per grade per school year. A task is `done` when its
 * completion rule is satisfied, not when the student clicks done: rules read
 * the passport (experiences, reflections, ratings, assessment dates) plus
 * the forms the student fills in on the checkpoint page.
 */

export type Term = "fall" | "spring";

export type TaskKind =
  /** Derived from passport data; the page shows what still needs doing. */
  | "auto"
  /** A short written form stored in the task payload. */
  | "form"
  /** The career goal form (writes a career_goals row). */
  | "goal"
  /** Ohio's planning checklist: the listed items must be checked. */
  | "checklist"
  /** The annual plan approval (student, guardian, advisor). */
  | "approval";

export type TaskTemplate = {
  key: string;
  label: string;
  kind: TaskKind;
  required?: boolean;
  /** Help text or the form prompt. */
  prompt?: string;
  /** For checklist tasks: the item numbers that must be checked. */
  items?: number[];
  /** Where the page sends the student to do an auto task. */
  link?: { to: string; label: string };
};

export const TERM_DUE: Record<Term, string> = { fall: "by November 15", spring: "by May 1" };

const T = {
  account_setup: {
    key: "account_setup",
    label: "Set up your passport",
    kind: "auto",
    prompt: "You're signed in, so this one is done.",
  },
  learning_style_survey: {
    key: "learning_style_survey",
    label: "Learning style",
    kind: "form",
    prompt:
      "How do you learn best? Think about a time something finally clicked. Were you watching, listening, doing, or talking it through?",
  },
  interest_inventory: {
    key: "interest_inventory",
    label: "Interest inventory (RIASEC)",
    kind: "auto",
    prompt: "Complete the EXPLR interest assessment this school year.",
    link: { to: "/assessment", label: "Take the assessment" },
  },
  strengths_inventory: {
    key: "strengths_inventory",
    label: "Strengths & skills",
    kind: "form",
    prompt:
      "What are you good at, in school and out? Name three strengths and one example of each.",
  },
  work_values: {
    key: "work_values",
    label: "Work values",
    kind: "form",
    prompt:
      "What matters most to you in work: helping people, making things, independence, pay, stability, creativity, being outdoors? Rank your top three and say why.",
  },
  career_profile: {
    key: "career_profile",
    label: "Career profile",
    kind: "form",
    prompt:
      "Put your interests and your personality together. What kind of work environment fits you, and what two careers would you look into first?",
  },
  career_goal: {
    key: "career_goal",
    label: "Career pathway goal",
    kind: "goal",
    prompt: "A goal can be a job, a field, or just 'still exploring'.",
  },
  pathway_research: {
    key: "pathway_research",
    label: "Research one occupation",
    kind: "form",
    prompt:
      "Pick one occupation. What education does it need, and what does it pay in Ohio? (Try OhioMeansJobs or the EXPLR career site.)",
  },
  credential_program_review: {
    key: "credential_program_review",
    label: "Credential programs",
    kind: "form",
    prompt:
      "Which industry credential or certificate programs could you take at your school or nearby? List one or two and what they lead to.",
  },
  college_admission_research: {
    key: "college_admission_research",
    label: "College admission research",
    kind: "form",
    prompt:
      "Look up admission criteria for two colleges or programs. What do they expect for grades, tests, and courses?",
  },
  postsecondary_search: {
    key: "postsecondary_search",
    label: "Compare three options",
    kind: "form",
    prompt:
      "Compare three options after high school (college, program, apprenticeship, military, work): cost, how you get in, and what you'd come out with.",
  },
  financing_plan: {
    key: "financing_plan",
    label: "Financing plan",
    kind: "form",
    prompt:
      "How will you pay for what's next? FAFSA readiness, scholarships you'll apply for, College Credit Plus credit you've earned.",
  },
  application_tracker: {
    key: "application_tracker",
    label: "Application tracker",
    kind: "form",
    prompt:
      "List every application you're working on (college, job, military, scholarship, FAFSA) with its deadline and status.",
  },
  career_narrative: {
    key: "career_narrative",
    label: "Career narrative",
    kind: "form",
    prompt:
      "Tell the story of your pathway so far: where you started, what you tried, what you learned, where you're headed. 150 words or more.",
  },
  fit_map: {
    key: "fit_map",
    label: "Fit map",
    kind: "form",
    prompt:
      "Where do your strengths and your interests overlap? Name the overlap and one course or activity that lives there.",
  },
  test_prep_plan: {
    key: "test_prep_plan",
    label: "Test prep plan",
    kind: "form",
    prompt:
      "Which tests are ahead (PreACT, PSAT, WorkKeys, ASVAB, end-of-course) and how will you prepare?",
  },
  elective_plan: {
    key: "elective_plan",
    label: "Electives for next year",
    kind: "form",
    prompt:
      "Which electives will you take next year, and how do they connect to what you're exploring?",
  },
  course_plan: {
    key: "course_plan",
    label: "Course plan for next year",
    kind: "form",
    prompt:
      "List next year's courses by subject. Mark any that earn high-school credit, college credit, or lead to a credential.",
  },
  hs_pathway_choice: {
    key: "hs_pathway_choice",
    label: "High school pathway",
    kind: "form",
    prompt:
      "Which high school pathway will you take: a CTE program, a specialized program, or comprehensive? Why?",
  },
  exploration_log: {
    key: "exploration_log",
    label: "Exploration log",
    kind: "auto",
    prompt: "Add the experiences you took part in this school year.",
    link: { to: "/student/experiences/new", label: "Add an experience" },
  },
  reflection: {
    key: "reflection",
    label: "Reflections",
    kind: "auto",
    prompt: "Every experience you logged this year needs a reflection of 50 words or more.",
    link: { to: "/student/experiences", label: "Open my experiences" },
  },
  competency_self_rating: {
    key: "competency_self_rating",
    label: "Rate three skills",
    kind: "form",
    prompt:
      "Pick three Readiness Seal skills (reliability, teamwork, communication, problem-solving, work ethic, and so on). For each, where are you: beginner, developing, proficient, or expert? Give an example.",
  },
  competency_rating: {
    key: "competency_rating",
    label: "Supervisor ratings",
    kind: "auto",
    prompt:
      "At least one verified experience this year with supervisor ratings. Grade 11 needs ratings from two different settings.",
    link: { to: "/student/experiences", label: "Ask for a stamp" },
  },
  resume_draft: {
    key: "resume_draft",
    label: "Resume draft",
    kind: "auto",
    prompt:
      "Your resume builds itself from your passport once you have at least one work experience.",
    link: { to: "/student/experiences/new", label: "Add an experience" },
  },
  resume_update: {
    key: "resume_update",
    label: "Resume update",
    kind: "auto",
    prompt: "Add or update at least one work experience this year.",
    link: { to: "/student/experiences", label: "Open my experiences" },
  },
  resume_final: {
    key: "resume_final",
    label: "Final resume",
    kind: "auto",
    prompt: "At least one verified work experience on your passport.",
    link: { to: "/student/experiences", label: "Open my experiences" },
  },
  portfolio_compile: {
    key: "portfolio_compile",
    label: "Compile your portfolio",
    kind: "auto",
    prompt: "At least two pieces in your gallery and a career narrative.",
    link: { to: "/student/pieces", label: "Open my gallery" },
  },
  seal_evidence_export: {
    key: "seal_evidence_export",
    label: "Readiness Seal evidence",
    kind: "auto",
    required: false,
    prompt: "Available once all 15 skills are validated across two settings.",
  },
  wbl_hours_export: {
    key: "wbl_hours_export",
    label: "250-hour log",
    kind: "auto",
    required: false,
    prompt: "Available once you reach 250 verified hours.",
  },
  transition_plan: {
    key: "transition_plan",
    label: "Transition plan",
    kind: "form",
    prompt: "What did you accept for after graduation, and when does it start?",
  },
  checklist: { key: "checklist", label: "Planning checklist", kind: "checklist" },
  plan_approval: {
    key: "plan_approval",
    label: "Plan approval",
    kind: "approval",
    prompt: "Review this year's plan with a parent or guardian and your advisor.",
  },
} satisfies Record<string, TaskTemplate>;

const c = (key: keyof typeof T, items?: number[]): TaskTemplate =>
  items ? { ...T[key], items } : T[key];

/** Checkpoint templates by grade and term (doc section 4). Grades 4-5 get a light exploration-only pair. */
export const TEMPLATES: Record<number, Record<Term, TaskTemplate[]>> = {
  4: {
    fall: [c("account_setup"), c("interest_inventory"), c("career_goal")],
    spring: [c("exploration_log"), c("reflection"), c("checklist", [2, 5])],
  },
  5: {
    fall: [c("account_setup"), c("interest_inventory"), c("career_goal")],
    spring: [c("exploration_log"), c("reflection"), c("checklist", [2, 4, 5])],
  },
  6: {
    fall: [
      c("account_setup"),
      c("learning_style_survey"),
      c("interest_inventory"),
      c("career_goal"),
    ],
    spring: [
      c("exploration_log"),
      c("reflection"),
      c("elective_plan"),
      c("checklist", [2, 4, 5]),
      c("plan_approval"),
    ],
  },
  7: {
    fall: [c("interest_inventory"), c("career_goal"), c("pathway_research")],
    spring: [
      c("exploration_log"),
      c("reflection"),
      c("elective_plan"),
      c("course_plan"),
      c("checklist", [2, 4, 5, 6]),
      c("plan_approval"),
    ],
  },
  8: {
    fall: [c("interest_inventory"), c("strengths_inventory"), c("career_goal"), c("fit_map")],
    spring: [
      c("exploration_log"),
      c("reflection"),
      c("hs_pathway_choice"),
      c("course_plan"),
      c("checklist", [2, 3, 4, 5, 6, 7, 8]),
      c("plan_approval"),
    ],
  },
  9: {
    fall: [
      c("learning_style_survey"),
      c("interest_inventory"),
      c("strengths_inventory"),
      c("career_goal"),
      c("credential_program_review"),
    ],
    spring: [
      c("exploration_log"),
      c("reflection"),
      c("competency_self_rating"),
      c("course_plan"),
      c("test_prep_plan"),
      c("checklist", [2, 3, 4, 5, 6, 7, 8, 9]),
      c("plan_approval"),
    ],
  },
  10: {
    fall: [c("career_profile"), c("career_goal"), c("college_admission_research")],
    spring: [
      c("exploration_log"),
      c("resume_draft"),
      c("competency_rating"),
      c("course_plan"),
      c("checklist", [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
      c("plan_approval"),
    ],
  },
  11: {
    fall: [
      c("career_profile"),
      c("work_values"),
      c("fit_map"),
      c("career_goal"),
      c("postsecondary_search"),
    ],
    spring: [
      c("exploration_log"),
      c("resume_update"),
      c("competency_rating"),
      c("financing_plan"),
      c("course_plan"),
      c("checklist", [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]),
      c("plan_approval"),
    ],
  },
  12: {
    fall: [
      c("learning_style_survey"),
      c("career_profile"),
      c("work_values"),
      c("career_goal"),
      c("application_tracker"),
      c("career_narrative"),
    ],
    spring: [
      c("exploration_log"),
      c("resume_final"),
      c("portfolio_compile"),
      c("seal_evidence_export"),
      c("wbl_hours_export"),
      c("transition_plan"),
      c("checklist", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
      c("plan_approval"),
    ],
  },
};

/** Ohio's 15 planning checklist statements. `auto` ones are checked from data. */
export const CHECKLIST: Array<{ no: number; text: string; auto: boolean }> = [
  { no: 1, text: "I have updated my Student Success Plan this year.", auto: true },
  { no: 2, text: "I know and can describe my interests and work traits.", auto: true },
  { no: 3, text: "I know and can describe my academic strengths.", auto: true },
  { no: 4, text: "I know how to locate and use career information resources.", auto: false },
  { no: 5, text: "I understand Ohio's 16 career clusters.", auto: true },
  { no: 6, text: "I can describe the educational options available to me.", auto: false },
  { no: 7, text: "I know the high school graduation requirements.", auto: true },
  { no: 8, text: "I know the educational requirements for my chosen career goal.", auto: false },
  { no: 9, text: "I understand labor market trends for my chosen goals.", auto: false },
  {
    no: 10,
    text: "I have discussed my educational plans and career goals with a parent or guardian and a counselor or teacher.",
    auto: true,
  },
  { no: 11, text: "I can locate and identify local job opportunities.", auto: false },
  { no: 12, text: "I can identify nontraditional career options.", auto: false },
  { no: 13, text: "I know how to navigate and complete applications.", auto: false },
  {
    no: 14,
    text: "I have discussed my plans for after high school with a parent or guardian and a counselor or teacher.",
    auto: true,
  },
  { no: 15, text: "I have taken action on my plans for after high school.", auto: true },
];

/** School years run August to July: '2026-27'. */
export function schoolYear(d = new Date()): string {
  const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${String(y + 1).slice(2)}`;
}
export function schoolYearBounds(sy: string): { start: Date; end: Date } {
  const y = Number(sy.slice(0, 4));
  return { start: new Date(y, 7, 1), end: new Date(y + 1, 6, 31, 23, 59, 59) };
}

export type RuleContext = {
  passport: Passport;
  schoolYear: string;
  /** completed_at of the latest RIASEC session, if any */
  assessmentCompletedAt: string | null;
  payloads: Record<string, unknown>;
  careerGoal: { primary_goal: string } | null;
  checked: Set<number>;
  approval: {
    student_ack_at: string | null;
    guardian_ack_at: string | null;
    advisor_ack_at: string | null;
  } | null;
  /** Any checkpoint submitted this school year */
  submittedThisYear: boolean;
  /** Any transition form (grade 12) submitted */
  transitionDone: boolean;
};

function inYear(e: Experience, sy: string): boolean {
  const { start, end } = schoolYearBounds(sy);
  const d = new Date(e.start_date ?? e.created_at);
  return d >= start && d <= end;
}
const words = (s: string | null | undefined) =>
  (s ?? "").trim().split(/\s+/).filter(Boolean).length;

/** Experiences that count for this year's exploration log, and whether the grade's floor is met. */
export function explorationStatus(ctx: RuleContext): {
  counted: Experience[];
  ok: boolean;
  why: string;
} {
  const g = ctx.passport.grade ?? 0;
  const counted = ctx.passport.experiences.filter((e) => inYear(e, ctx.schoolYear));
  const min = g <= 5 ? 1 : 2;
  let cond = true;
  let why = `${counted.length} of ${min} logged`;
  if (g === 7 && !counted.some((e) => e.stage === "exploration")) {
    cond = false;
    why += " · needs one interview or shadow";
  }
  if (g === 8 && !counted.some((e) => e.experience_type === "job_shadow")) {
    cond = false;
    why += " · needs one job shadow";
  }
  if (g === 10 && !counted.some((e) => e.stage === "participation" || (e.hours ?? 0) >= 20)) {
    cond = false;
    why += " · needs one 20+ hour or participation experience";
  }
  if (
    g === 11 &&
    !counted.some((e) => e.status === "verified" && (e.verified_hours ?? e.hours ?? 0) >= 40)
  ) {
    cond = false;
    why += " · needs one verified 40+ hour experience";
  }
  return { counted, ok: counted.length >= min && cond, why };
}

/** Evaluate one task. Returns done/not and a short status line. */
export function evaluate(t: TaskTemplate, ctx: RuleContext): { done: boolean; note: string } {
  const p = ctx.passport;
  const { start, end } = schoolYearBounds(ctx.schoolYear);
  switch (t.key) {
    case "account_setup":
      return { done: true, note: "Done" };
    case "interest_inventory": {
      const ok =
        !!ctx.assessmentCompletedAt &&
        new Date(ctx.assessmentCompletedAt) >= start &&
        new Date(ctx.assessmentCompletedAt) <= end;
      return {
        done: ok,
        note: ok
          ? `Holland code ${p.hollandCode}`
          : p.hollandCode
            ? "Retake or confirm this year"
            : "Not taken yet",
      };
    }
    case "exploration_log": {
      const s = explorationStatus(ctx);
      return { done: s.ok, note: s.why };
    }
    case "reflection": {
      const s = explorationStatus(ctx);
      const missing = s.counted.filter((e) => words(e.reflection) < 50);
      return {
        done: s.counted.length > 0 && missing.length === 0,
        note:
          s.counted.length === 0
            ? "Log an experience first"
            : missing.length
              ? `${missing.length} still need 50+ words`
              : "All reflected",
      };
    }
    case "competency_rating": {
      const ids = new Set(
        p.experiences
          .filter((e) => e.status === "verified" && inYear(e, ctx.schoolYear))
          .map((e) => e.id),
      );
      const rts = p.ratings.filter((r) => ids.has(r.experience_id));
      const settings = new Set(rts.map((r) => r.setting));
      const need2 = (p.grade ?? 0) === 11;
      const ok = rts.length > 0 && (!need2 || settings.size >= 2);
      return {
        done: ok,
        note: rts.length
          ? `${rts.length} ratings · ${settings.size} setting${settings.size === 1 ? "" : "s"}`
          : "No verified ratings this year",
      };
    }
    case "resume_draft":
      return {
        done: p.work.length > 0,
        note: p.work.length
          ? `${p.work.length} work experience${p.work.length === 1 ? "" : "s"}`
          : "Add a work experience",
      };
    case "resume_update": {
      const n = p.work.filter((e) => inYear(e, ctx.schoolYear)).length;
      return { done: n > 0, note: n ? `${n} added this year` : "Nothing added this year" };
    }
    case "resume_final": {
      const n = p.work.filter((e) => e.status === "verified").length;
      return { done: n > 0, note: n ? `${n} verified` : "No verified experience yet" };
    }
    case "portfolio_compile": {
      const ok = p.pieces.length >= 2 && !!ctx.payloads.career_narrative;
      return {
        done: ok,
        note: `${p.pieces.length} pieces · narrative ${ctx.payloads.career_narrative ? "done" : "missing"}`,
      };
    }
    case "seal_evidence_export":
      return { done: p.sealReadyCount >= 15, note: `${p.sealReadyCount} of 15 skills seal-ready` };
    case "wbl_hours_export":
      return { done: p.verifiedHours >= 250, note: `${Math.round(p.verifiedHours)} of 250 hours` };
    case "career_goal":
      return {
        done: !!ctx.careerGoal?.primary_goal,
        note: ctx.careerGoal?.primary_goal ? ctx.careerGoal.primary_goal : "Not set",
      };
    case "checklist": {
      const need = t.items ?? [];
      const missing = need.filter((n) => !ctx.checked.has(n));
      return {
        done: missing.length === 0,
        note: missing.length
          ? `${need.length - missing.length} of ${need.length} checked`
          : "Complete",
      };
    }
    case "plan_approval": {
      const a = ctx.approval;
      const n = [a?.student_ack_at, a?.guardian_ack_at, a?.advisor_ack_at].filter(Boolean).length;
      return { done: n === 3, note: `${n} of 3 signatures` };
    }
    default:
      return { done: !!ctx.payloads[t.key], note: ctx.payloads[t.key] ? "Submitted" : "Not yet" };
  }
}

/** Which checklist statements are auto-checked from data this year. */
export function autoChecklist(ctx: RuleContext): Set<number> {
  const p = ctx.passport;
  const s = new Set<number>();
  if (ctx.submittedThisYear) s.add(1);
  if (p.hollandCode) {
    s.add(2);
    s.add(5);
  }
  if (ctx.payloads.strengths_inventory) s.add(3);
  if ((p.grade ?? 0) >= 8 && ctx.payloads.course_plan) s.add(7);
  if (ctx.approval?.guardian_ack_at && ctx.approval?.advisor_ack_at) {
    s.add(10);
    s.add(14);
  }
  if (ctx.transitionDone) s.add(15);
  return s;
}

export const POST_HS_PLANS = [
  { key: "four_year", label: "Four-year college" },
  { key: "two_year", label: "Two-year college" },
  { key: "credential", label: "Credential or certificate program" },
  { key: "apprenticeship", label: "Apprenticeship" },
  { key: "military", label: "Military" },
  { key: "work", label: "Work" },
  { key: "undecided", label: "Still deciding" },
] as const;

export { isExposure, EXPERIENCE_TYPE_BY_KEY };
