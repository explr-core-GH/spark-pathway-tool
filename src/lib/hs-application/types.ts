import type {
  AppStatus,
  EnvKey,
  QuestionKind,
  Reaction,
  StudentReqAnswer,
  Valence,
  WhoPays,
} from "./content";

/** A. Core answers, stored as `hs_general_applications.core`. */
export type CoreAnswers = {
  // A1
  legalFirst: string;
  legalLast: string;
  preferredName: string;
  email: string;
  phone: string;
  okToText: boolean | null;
  dob: string;
  school: string;
  gradeFall: string;
  zip: string;
  youEmail: string;
  // A2
  allWeeks: boolean | null;
  datesCant: string;
  transport: string[];
  needsBusPass: boolean | null;
  workPermit: string;
  priorExplr: boolean | null;
  priorExplrWhich: string;
  // A3
  madeFixed: string;
  hopeToGet: string;
  // A4
  supportNeeds: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  emergencyName: string;
  emergencyPhone: string;
  consentStudent: boolean;
  consentStudentName: string;
  consentGuardian: boolean;
  consentGuardianName: string;
  // A5
  jobsThought: string;
  postHs: string[];
  planSure: number | null;
  collegeCourses: boolean | null;
  collegeCoursesWhich: string;
  careerTech: boolean | null;
  careerTechWhich: string;
  credentials: string[];
  credentialsOther: string;
  postHsApplication: string;
};

export const EMPTY_CORE: CoreAnswers = {
  legalFirst: "",
  legalLast: "",
  preferredName: "",
  email: "",
  phone: "",
  okToText: null,
  dob: "",
  school: "",
  gradeFall: "",
  zip: "",
  youEmail: "",
  allWeeks: null,
  datesCant: "",
  transport: [],
  needsBusPass: null,
  workPermit: "",
  priorExplr: null,
  priorExplrWhich: "",
  madeFixed: "",
  hopeToGet: "",
  supportNeeds: "",
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
  emergencyName: "",
  emergencyPhone: "",
  consentStudent: false,
  consentStudentName: "",
  consentGuardian: false,
  consentGuardianName: "",
  jobsThought: "",
  postHs: [],
  planSure: null,
  collegeCourses: null,
  collegeCoursesWhich: "",
  careerTech: null,
  careerTechWhich: "",
  credentials: [],
  credentialsOther: "",
  postHsApplication: "",
};

/** B. Survey extras beyond the 48-item RIASEC assessment. */
export type SurveyExtras = {
  fields: string[];
  activities: Record<string, number>;
  pairs: Record<string, "a" | "b">;
  environment: Partial<Record<EnvKey, number>>;
  experience: Record<string, Valence>;
};
export const EMPTY_EXTRAS: SurveyExtras = {
  fields: [],
  activities: {},
  pairs: {},
  environment: {},
  experience: {},
};

/** C. General track choices. */
export type GeneralChoices = {
  shown: string[];
  reactions: Record<string, Reaction>;
  ranked: string[];
  placeAnywhere: boolean;
  addedRef: string | null;
  tryText: string;
};
export const EMPTY_CHOICES: GeneralChoices = {
  shown: [],
  reactions: {},
  ranked: [],
  placeAnywhere: false,
  addedRef: null,
  tryText: "",
};

export type Demographics = {
  gender?: string;
  race?: string[];
  ethnicity?: string;
  firstGen?: string;
  languageAtHome?: string;
  other?: string;
};

export type GeneralApplication = {
  id: string;
  student_id: string;
  season_id: string;
  status: AppStatus;
  step: number;
  core: CoreAnswers;
  extras: SurveyExtras;
  choices: GeneralChoices;
  assessment_session_id: string | null;
  submitted_at: string | null;
  placed_opportunity_id: string | null;
  missing_note: string | null;
  staff_notes: string | null;
  pseudo_id: string | null;
  updated_at: string;
};

// ── D. Partner builder ──────────────────────────────────────────────────
export type BuilderQuestion = {
  /** Bank id (B-01…) or custom-1 / custom-2. */
  id: string;
  prompt: string;
  kind: QuestionKind;
  options: string[];
  /** Short text cap in words (text kinds). */
  maxWords?: number;
  optional?: boolean;
  custom?: boolean;
};

export type BuilderRequirement = {
  key: string;
  detail?: string;
  whoPays?: WhoPays;
  /** Physical demands only: partner confirms it is essential to the job. */
  essential?: boolean;
};

export type ApplicationBuilder = {
  profile: {
    title: string;
    description: string;
    weekly: string[];
    learnEarn: string;
    credentials: string[];
    careerFields: string[];
    riasec: string;
    environment: Partial<Record<EnvKey, number>>;
    seats: number | null;
    startDate: string;
    endDate: string;
    dailyHours: string;
    address: string;
    busLine: string;
    niceToHave: string[];
  };
  questions: BuilderQuestion[];
  requirements: BuilderRequirement[];
  age: { min: number | null; max: number | null; reason: string };
};

export const EMPTY_BUILDER: ApplicationBuilder = {
  profile: {
    title: "",
    description: "",
    weekly: [],
    learnEarn: "",
    credentials: [],
    careerFields: [],
    riasec: "",
    environment: {},
    seats: null,
    startDate: "",
    endDate: "",
    dailyHours: "",
    address: "",
    busLine: "",
    niceToHave: [],
  },
  questions: [],
  requirements: [],
  age: { min: null, max: null, reason: "" },
};

export function hydrateBuilder(raw: unknown): ApplicationBuilder {
  const r = (raw ?? {}) as Partial<ApplicationBuilder>;
  return {
    profile: { ...EMPTY_BUILDER.profile, ...(r.profile ?? {}) },
    questions: Array.isArray(r.questions) ? r.questions : [],
    requirements: Array.isArray(r.requirements) ? r.requirements : [],
    age: { ...EMPTY_BUILDER.age, ...(r.age ?? {}) },
  };
}

/** A student's answers to one partner application. */
export type PartnerAnswers = {
  answers: Record<string, unknown>;
  requirements: Record<string, StudentReqAnswer>;
  questionNotes: Record<string, string>;
};
export const EMPTY_PARTNER_ANSWERS: PartnerAnswers = {
  answers: {},
  requirements: {},
  questionNotes: {},
};
