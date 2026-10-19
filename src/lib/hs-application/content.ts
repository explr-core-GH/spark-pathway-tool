/**
 * High school internship application: question content and option lists.
 * Source of truth: docs/internship-application-spec.md.
 *
 * Student-facing copy targets about an 8th-grade reading level. Keys are
 * stable (stored in jsonb); labels can be reworded freely.
 */

import type { RIASECCode } from "@/lib/riasec";

// ── Ohio's 16 career fields ─────────────────────────────────────────────
export const CAREER_FIELDS = [
  { key: "ag_env", label: "Agricultural and Environmental Systems" },
  { key: "arts_comm", label: "Arts and Communication" },
  { key: "business_admin", label: "Business and Administrative Services" },
  { key: "construction", label: "Construction Technologies" },
  { key: "education", label: "Education and Training" },
  { key: "engineering_science", label: "Engineering and Science Technologies" },
  { key: "finance", label: "Finance" },
  { key: "government", label: "Government and Public Administration" },
  { key: "health", label: "Health Science" },
  { key: "hospitality", label: "Hospitality and Tourism" },
  { key: "human_services", label: "Human Services" },
  { key: "it", label: "Information Technology" },
  { key: "law_safety", label: "Law and Public Safety" },
  { key: "manufacturing", label: "Manufacturing" },
  { key: "marketing", label: "Marketing" },
  { key: "transportation", label: "Transportation" },
] as const;
export type CareerField = (typeof CAREER_FIELDS)[number]["key"];
export const CAREER_FIELD_LABEL: Record<string, string> = Object.fromEntries(
  CAREER_FIELDS.map((f) => [f.key, f.label]),
);

// ── A. Core ─────────────────────────────────────────────────────────────
export const GRADE_OPTIONS = [
  { value: "9", label: "9th grade" },
  { value: "10", label: "10th grade" },
  { value: "11", label: "11th grade" },
  { value: "12", label: "12th grade" },
  { value: "graduated", label: "Graduated" },
] as const;

export const TRANSPORT_OPTIONS = [
  { key: "transit", label: "Bus or train" },
  { key: "driven", label: "Someone drives me" },
  { key: "drive_self", label: "I drive myself" },
  { key: "walk_bike", label: "Walk or bike" },
  { key: "not_sure", label: "Not sure yet" },
] as const;

export const WORK_PERMIT_OPTIONS = [
  { key: "yes", label: "Yes" },
  { key: "no", label: "No" },
  { key: "not_sure", label: "Not sure" },
] as const;

export const POST_HS_PLANS = [
  { key: "four_year", label: "4-year college" },
  { key: "two_year", label: "2-year or community college" },
  { key: "apprenticeship", label: "Apprenticeship or trade program" },
  { key: "career_tech_cert", label: "Career-tech certificate" },
  { key: "military", label: "Military" },
  { key: "work", label: "Start working full time" },
  { key: "business", label: "Start a business" },
  { key: "gap_year", label: "Gap year" },
  { key: "not_sure", label: "Not sure yet" },
] as const;

export const CREDENTIAL_OPTIONS = [
  "CompTIA (A+, IT Fundamentals, etc.)",
  "OSHA-10",
  "ServSafe",
  "CPR / First Aid",
  "Adobe Certified Professional",
] as const;

export const APPLICATION_PROGRESS = [
  { key: "not_yet", label: "Not yet" },
  { key: "started", label: "Started" },
  { key: "submitted", label: "Submitted" },
  { key: "accepted", label: "Accepted" },
] as const;

export const YOU_EMAIL_HELP =
  "We use this to connect your EXPLR application with your YOU application. Use the same email so nothing gets held up.";

export const SHORT_ANSWER_MIN_WORDS = 75;
export const SHORT_ANSWER_MAX_WORDS = 150;

// ── B. Interest survey extras ───────────────────────────────────────────
/** The 8 activity items added beyond the STEM-heavy set. Rated 1-3. */
export const ACTIVITY_ITEMS: Array<{
  id: string;
  text: string;
  riasec: RIASECCode[];
  fields: CareerField[];
}> = [
  {
    id: "ACT1",
    text: "Design a poster, video or social media campaign",
    riasec: ["A"],
    fields: ["arts_comm", "marketing"],
  },
  {
    id: "ACT2",
    text: "Write, perform or record music, theater or spoken word",
    riasec: ["A"],
    fields: ["arts_comm"],
  },
  {
    id: "ACT3",
    text: "Help someone work through a problem or a hard day",
    riasec: ["S"],
    fields: ["human_services", "education"],
  },
  {
    id: "ACT4",
    text: "Take care of patients, kids or older adults",
    riasec: ["S"],
    fields: ["health", "human_services", "education"],
  },
  {
    id: "ACT5",
    text: "Plan an event and keep everyone on schedule",
    riasec: ["E"],
    fields: ["hospitality", "business_admin", "marketing"],
  },
  {
    id: "ACT6",
    text: "Sell an idea, product or cause to a group",
    riasec: ["E"],
    fields: ["marketing", "business_admin"],
  },
  {
    id: "ACT7",
    text: "Keep track of money, inventory or records",
    riasec: ["C"],
    fields: ["finance", "business_admin"],
  },
  {
    id: "ACT8",
    text: "Respond to emergencies or help keep a community safe",
    riasec: ["R", "S"],
    fields: ["law_safety", "health", "government"],
  },
];

export const ACTIVITY_SCALE = [
  { value: 3, label: "Yes!" },
  { value: 2, label: "Maybe" },
  { value: 1, label: "Not for me" },
] as const;

/**
 * Career fields each item in the 48-item RIASEC assessment points toward.
 * Used for the "activity overlap" part of matching.
 */
export const ASSESSMENT_ITEM_FIELDS: Record<string, CareerField[]> = {
  R1: ["manufacturing", "transportation"],
  R2: ["construction", "manufacturing"],
  R3: ["ag_env"],
  R4: ["construction", "transportation"],
  R5: ["engineering_science", "manufacturing"],
  R6: ["ag_env"],
  R7: ["ag_env", "hospitality"],
  R8: ["transportation", "manufacturing"],
  I1: ["engineering_science"],
  I2: ["engineering_science", "it", "finance"],
  I3: ["health"],
  I4: ["health", "engineering_science"],
  I5: ["engineering_science"],
  I6: ["it"],
  I7: ["engineering_science"],
  I8: ["ag_env", "engineering_science"],
  A1: ["arts_comm"],
  A2: ["arts_comm"],
  A3: ["arts_comm"],
  A4: ["arts_comm", "marketing"],
  A5: ["arts_comm", "marketing"],
  A6: ["arts_comm"],
  A7: ["arts_comm", "it"],
  A8: ["arts_comm", "construction"],
  S1: ["education"],
  S2: ["human_services"],
  S3: ["health"],
  S4: ["education"],
  S5: ["human_services", "government"],
  S6: ["education"],
  S7: ["human_services", "education"],
  S8: ["human_services", "marketing"],
  E1: ["business_admin"],
  E2: ["marketing"],
  E3: ["business_admin", "finance"],
  E4: ["government", "law_safety"],
  E5: ["business_admin"],
  E6: ["hospitality", "marketing"],
  E7: ["business_admin"],
  E8: ["marketing", "arts_comm"],
  C1: ["business_admin"],
  C2: ["finance"],
  C3: ["manufacturing", "health"],
  C4: ["finance", "it"],
  C5: ["business_admin", "transportation"],
  C6: ["business_admin"],
  C7: ["finance", "manufacturing"],
  C8: ["it", "finance"],
};

export const FORCED_PAIRS: Array<{
  id: string;
  a: { text: string; code: RIASECCode };
  b: { text: string; code: RIASECCode };
}> = [
  { id: "P1", a: { text: "Fix a machine", code: "R" }, b: { text: "Help a person", code: "S" } },
  {
    id: "P2",
    a: { text: "Figure out why something happened", code: "I" },
    b: { text: "Convince a group to try your idea", code: "E" },
  },
  {
    id: "P3",
    a: { text: "Make something creative", code: "A" },
    b: { text: "Get records neat and correct", code: "C" },
  },
  {
    id: "P4",
    a: { text: "Work outdoors with your hands", code: "R" },
    b: { text: "Research a question online", code: "I" },
  },
  {
    id: "P5",
    a: { text: "Teach someone a new skill", code: "S" },
    b: { text: "Design how something looks", code: "A" },
  },
  {
    id: "P6",
    a: { text: "Lead a team", code: "E" },
    b: { text: "Follow a clear plan step by step", code: "C" },
  },
];

/** Work environment sliders (1 = left, 5 = right). Partners set the same five. */
export const ENVIRONMENT_DIMS = [
  { key: "team", left: "Working alone", right: "Working on a team" },
  { key: "screen", left: "Hands-on", right: "On a computer" },
  { key: "structure", left: "Clear steps", right: "Figure it out" },
  { key: "outdoors", left: "Indoors", right: "Outdoors" },
  { key: "pace", left: "Calm and quiet", right: "Busy and fast" },
] as const;
export type EnvKey = (typeof ENVIRONMENT_DIMS)[number]["key"];

export const VALENCE_OPTIONS = [
  { key: "did_more", label: "Did it, want more" },
  { key: "did_not", label: "Did it, not for me" },
  { key: "curious", label: "Never tried, curious" },
  { key: "not_interested", label: "Never tried, not interested" },
] as const;
export type Valence = (typeof VALENCE_OPTIONS)[number]["key"];

export const EXPERIENCE_ITEMS: Array<{ key: string; label: string; fields: CareerField[] }> = [
  { key: "job", label: "A job or internship", fields: [] },
  { key: "robotics", label: "Robotics", fields: ["engineering_science", "manufacturing"] },
  { key: "stem_camp", label: "A STEM camp", fields: ["engineering_science", "it"] },
  { key: "science_fair", label: "Science fair", fields: ["engineering_science", "health"] },
  { key: "coding", label: "Coding", fields: ["it"] },
  {
    key: "cad",
    label: "CAD, 3D printing or building things",
    fields: ["engineering_science", "construction", "manufacturing"],
  },
  { key: "clubs", label: "School clubs", fields: [] },
  { key: "arts", label: "Arts or performance", fields: ["arts_comm"] },
  { key: "sports", label: "Sports or coaching", fields: ["education"] },
  { key: "care", label: "Volunteering or caring for family", fields: ["human_services", "health"] },
  {
    key: "business",
    label: "A business or side hustle",
    fields: ["business_admin", "marketing", "finance"],
  },
];

// ── C. General track ────────────────────────────────────────────────────
export const REACTIONS = [
  { key: "excited", label: "Excited" },
  { key: "open", label: "Open to it" },
  { key: "not_for_me", label: "Not for me" },
] as const;
export type Reaction = (typeof REACTIONS)[number]["key"];
export const MAX_RANKED = 3;
export const TOP_MATCHES = 5;

// ── D. Partner builder ──────────────────────────────────────────────────
export type QuestionKind =
  "text" | "choice" | "checklist_valence" | "upload" | "media" | "yes_no_text" | "settings";

export type BankQuestion = {
  id: string;
  prompt: string;
  kind: QuestionKind;
  maxWords?: number;
  optional?: boolean;
  /** Partner supplies the options (tools, tasks, settings). */
  needsOptions?: boolean;
  optionsHint?: string;
  /** Minutes a typical student needs. */
  minutes: number;
  goodFor: string;
};

export const ADDON_BANK: BankQuestion[] = [
  {
    id: "B-01",
    prompt: "What made you interested in this internship?",
    kind: "text",
    maxWords: 100,
    minutes: 3,
    goodFor: "Any",
  },
  {
    id: "B-02",
    prompt: "Which of these have you tried?",
    kind: "checklist_valence",
    needsOptions: true,
    optionsHint: "Tools or skills, one per line",
    minutes: 2,
    goodFor: "Tech, CAD, lab",
  },
  {
    id: "B-03",
    prompt: "Tell us about a time something didn't work the first time. What did you do?",
    kind: "text",
    maxWords: 150,
    minutes: 4,
    goodFor: "Engineering, automation, IT",
  },
  {
    id: "B-04",
    prompt: "Here's a real problem from our worksite. How would you start?",
    kind: "text",
    maxWords: 150,
    needsOptions: true,
    optionsHint: "Describe the problem in 1-3 sentences",
    minutes: 4,
    goodFor: "Any",
  },
  {
    id: "B-05",
    prompt: "Share something you've made (photo, link or file).",
    kind: "upload",
    optional: true,
    minutes: 2,
    goodFor: "Design, fabrication, web, media",
  },
  {
    id: "B-06",
    prompt: "Tell us in a 60-second video or voice note why you want this.",
    kind: "media",
    optional: true,
    minutes: 3,
    goodFor: "Any",
  },
  {
    id: "B-07",
    prompt: "Pick the task you'd most want to do on day one.",
    kind: "choice",
    needsOptions: true,
    optionsHint: "Tasks, one per line",
    minutes: 1,
    goodFor: "Any",
  },
  {
    id: "B-08",
    prompt:
      "Write a short headline and two sentences about something happening in your neighborhood.",
    kind: "text",
    maxWords: 75,
    minutes: 3,
    goodFor: "Civic journalism, media",
  },
  {
    id: "B-09",
    prompt: "Have you worked with kids before (babysitting, camps, tutoring, siblings)?",
    kind: "yes_no_text",
    minutes: 2,
    goodFor: "Education, camps",
  },
  {
    id: "B-10",
    prompt: "Are you comfortable in settings like these?",
    kind: "settings",
    needsOptions: true,
    optionsHint: "Settings, one per line (outdoors, labs, construction sites, clinical)",
    minutes: 1,
    goodFor: "Field, health, construction",
  },
  {
    id: "B-11",
    prompt: "Is there a schedule detail we should know for this site?",
    kind: "text",
    maxWords: 75,
    optional: true,
    minutes: 1,
    goodFor: "Sites with fixed hours",
  },
];
export const MAX_ADDONS = 5;
export const MAX_CUSTOM = 2;
export const MAX_CUSTOM_WORDS = 30;
export const MAX_ANSWER_WORDS = 150;
export const MAX_ADDED_MINUTES = 10;

export const SETTINGS_ANSWERS = [
  { key: "yes", label: "Yes" },
  { key: "with_support", label: "With support" },
  { key: "no", label: "No" },
] as const;

// ── D3. Site requirements ───────────────────────────────────────────────
export type RequirementCategory =
  | "health"
  | "screening"
  | "gear"
  | "dress"
  | "meals"
  | "physical"
  | "training"
  | "documents"
  | "schedule"
  | "rules";

export const REQUIREMENT_CATEGORIES: Array<{
  key: RequirementCategory;
  label: string;
  ackOnly?: boolean;
}> = [
  { key: "health", label: "Health and immunizations" },
  { key: "screening", label: "Background checks and screening" },
  { key: "gear", label: "Safety gear" },
  { key: "dress", label: "Dress code" },
  { key: "meals", label: "Meals", ackOnly: true },
  { key: "physical", label: "Physical demands" },
  { key: "training", label: "Training before you start" },
  { key: "documents", label: "Documents and tech" },
  { key: "schedule", label: "Schedule and travel" },
  { key: "rules", label: "Rules at work", ackOnly: true },
];

export type RequirementDef = {
  key: string;
  category: RequirementCategory;
  label: string;
  /** Costs money: partner must say who pays. */
  cost?: boolean;
  /** Partner adds a detail (weight, date, item). */
  detailHint?: string;
};

export const REQUIREMENTS: RequirementDef[] = [
  { key: "flu", category: "health", label: "Flu shot", cost: true },
  { key: "tb", category: "health", label: "TB test", cost: true },
  { key: "mmr_hepb", category: "health", label: "MMR or Hep B records" },
  { key: "physical_exam", category: "health", label: "Physical exam", cost: true },
  {
    key: "vaccine_policy",
    category: "health",
    label: "Site vaccine policy",
    detailHint: "Which vaccines",
  },
  {
    key: "bci_fbi",
    category: "screening",
    label: "BCI/FBI fingerprint background check",
    cost: true,
  },
  { key: "drug_screen", category: "screening", label: "Drug screen", cost: true },
  { key: "steel_toe", category: "gear", label: "Steel-toed boots", cost: true },
  { key: "hard_hat", category: "gear", label: "Hard hat", cost: true },
  { key: "safety_glasses", category: "gear", label: "Safety glasses", cost: true },
  { key: "gloves", category: "gear", label: "Gloves", cost: true },
  { key: "closed_toe", category: "gear", label: "Closed-toe shoes", cost: true },
  { key: "business_casual", category: "dress", label: "Business casual", cost: true },
  { key: "scrubs", category: "dress", label: "Scrubs", cost: true },
  { key: "uniform", category: "dress", label: "Uniform", cost: true },
  { key: "no_loose", category: "dress", label: "No loose clothing or jewelry in the shop" },
  { key: "hair_back", category: "dress", label: "Hair tied back" },
  { key: "pack_lunch", category: "meals", label: "Pack a lunch" },
  { key: "no_microwave", category: "meals", label: "No microwave on site" },
  { key: "lunch_provided", category: "meals", label: "Lunch provided" },
  { key: "no_food_lab", category: "meals", label: "No food in the lab" },
  { key: "on_feet", category: "physical", label: "On your feet most of the day" },
  { key: "lifting", category: "physical", label: "Lifting", detailHint: "Up to how many pounds" },
  { key: "outdoors_weather", category: "physical", label: "Outdoors in heat or rain" },
  { key: "heights", category: "physical", label: "Ladders or heights" },
  { key: "osha10", category: "training", label: "OSHA-10", cost: true },
  { key: "hipaa", category: "training", label: "HIPAA training" },
  { key: "cpr", category: "training", label: "CPR / First Aid", cost: true },
  { key: "orientation", category: "training", label: "Site orientation", detailHint: "Date" },
  { key: "photo_id", category: "documents", label: "Photo ID" },
  { key: "ss_card", category: "documents", label: "Social Security card for payroll" },
  { key: "drivers_license", category: "documents", label: "Driver's license" },
  { key: "own_phone", category: "documents", label: "Your own phone for sign-in codes" },
  { key: "early_start", category: "schedule", label: "Early start", detailHint: "Start time" },
  { key: "weekends", category: "schedule", label: "Weekend events" },
  { key: "multi_site", category: "schedule", label: "Travel between sites" },
  { key: "confidentiality", category: "rules", label: "Confidentiality or HIPAA agreement" },
  { key: "no_phones", category: "rules", label: "No phones on the floor" },
];
export const REQUIREMENT_BY_KEY = new Map(REQUIREMENTS.map((r) => [r.key, r]));

export const WHO_PAYS = [
  { key: "partner", label: "We provide it" },
  { key: "explr", label: "EXPLR covers it" },
  { key: "student", label: "Student pays" },
] as const;
export type WhoPays = (typeof WHO_PAYS)[number]["key"];

export const AGE_REASONS = [
  { key: "child_labor_law", label: "State or federal child labor law" },
  { key: "insurance", label: "Insurance" },
  { key: "site_safety", label: "Site safety" },
  { key: "funding_rule", label: "Funding rule" },
] as const;

export const STUDENT_REQ_ANSWERS = [
  { key: "can", label: "I can meet this by the start date" },
  { key: "help", label: "I'd need help" },
  { key: "question", label: "I have a question" },
] as const;
export type StudentReqAnswer = (typeof STUDENT_REQ_ANSWERS)[number]["key"] | "ack";

// ── Statuses ────────────────────────────────────────────────────────────
export const APP_STATUSES = [
  { key: "draft", label: "Not submitted" },
  { key: "received", label: "Received" },
  { key: "under_review", label: "Under review" },
  { key: "missing", label: "Missing something" },
  { key: "placed", label: "Placed" },
  { key: "waitlisted", label: "Waitlisted" },
  { key: "not_placed", label: "Not placed this season" },
] as const;
export type AppStatus = (typeof APP_STATUSES)[number]["key"];
export const APP_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  APP_STATUSES.map((s) => [s.key, s.label]),
);
