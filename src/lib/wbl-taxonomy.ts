/**
 * Work-based learning taxonomy (from the EXPLR WBL spec, section 3).
 *
 * Every experience carries a `stage` and an `experience_type`. Only Ohio's
 * formal WBL types accrue hours toward the 250-hour graduation option, and
 * only from grade 9, and only once a supervisor has verified them.
 */

export type Stage = "awareness" | "exploration" | "preparation" | "participation";

export const STAGES: Record<Stage, { label: string; hint: string }> = {
  awareness: { label: "Awareness", hint: "Learning about work" },
  exploration: { label: "Exploration", hint: "Learning about work, firsthand" },
  preparation: { label: "Preparation", hint: "Learning through work" },
  participation: { label: "Participation", hint: "Learning for work" },
};

export type ExperienceType = {
  key: string;
  label: string;
  stage: Stage;
  minGrade: number;
  /** One of Ohio's six formal WBL categories (can count toward 250 hours). */
  ohioFormalWbl: boolean;
  /** Short help text for the add-experience form. */
  hint?: string;
};

export const EXPERIENCE_TYPES: ExperienceType[] = [
  {
    key: "career_day_speaker_fair",
    label: "Career day, speaker, or fair",
    stage: "awareness",
    minGrade: 4,
    ohioFormalWbl: false,
    hint: "30 to 60 minutes",
  },
  {
    key: "worksite_tour",
    label: "Worksite tour",
    stage: "awareness",
    minGrade: 5,
    ohioFormalWbl: false,
  },
  {
    key: "camp_or_program",
    label: "Camp or after-school program",
    stage: "exploration",
    minGrade: 4,
    ohioFormalWbl: false,
  },
  {
    key: "informational_interview",
    label: "Informational interview",
    stage: "exploration",
    minGrade: 6,
    ohioFormalWbl: false,
  },
  {
    key: "job_shadow",
    label: "Job shadow",
    stage: "exploration",
    minGrade: 7,
    ohioFormalWbl: false,
  },
  {
    key: "career_mentoring",
    label: "Career mentoring",
    stage: "exploration",
    minGrade: 6,
    ohioFormalWbl: false,
    hint: "About 15 hours a semester",
  },
  {
    key: "industry_design_challenge",
    label: "Industry design challenge",
    stage: "exploration",
    minGrade: 6,
    ohioFormalWbl: false,
    hint: "Robotics, hackathons, maker projects with professional judges",
  },
  {
    key: "ctso_competition",
    label: "CTSO competition",
    stage: "exploration",
    minGrade: 7,
    ohioFormalWbl: false,
  },
  {
    key: "service_learning",
    label: "Service learning",
    stage: "preparation",
    minGrade: 6,
    ohioFormalWbl: false,
  },
  {
    key: "outside_job",
    label: "Outside job",
    stage: "preparation",
    minGrade: 8,
    ohioFormalWbl: false,
    hint: "A job you found on your own",
  },
  {
    key: "school_based_enterprise",
    label: "School-based enterprise",
    stage: "preparation",
    minGrade: 9,
    ohioFormalWbl: true,
  },
  {
    key: "simulated_workplace",
    label: "Simulated workplace",
    stage: "preparation",
    minGrade: 9,
    ohioFormalWbl: true,
  },
  {
    key: "entrepreneurship",
    label: "Entrepreneurship",
    stage: "preparation",
    minGrade: 9,
    ohioFormalWbl: true,
    hint: "Under a learning agreement",
  },
  {
    key: "remote_virtual_placement",
    label: "Remote or virtual placement",
    stage: "participation",
    minGrade: 9,
    ohioFormalWbl: true,
  },
  {
    key: "internship_offsite_placement",
    label: "Internship (off-site placement)",
    stage: "participation",
    minGrade: 10,
    ohioFormalWbl: true,
  },
  {
    key: "cooperative_education",
    label: "Cooperative education",
    stage: "participation",
    minGrade: 11,
    ohioFormalWbl: true,
  },
  {
    key: "clinical_experience",
    label: "Clinical experience",
    stage: "participation",
    minGrade: 11,
    ohioFormalWbl: true,
  },
  {
    key: "pre_apprenticeship",
    label: "Pre-apprenticeship",
    stage: "participation",
    minGrade: 10,
    ohioFormalWbl: true,
  },
  {
    key: "youth_apprenticeship",
    label: "Youth apprenticeship",
    stage: "participation",
    minGrade: 11,
    ohioFormalWbl: true,
    hint: "Must be 16 or older",
  },
];

export const EXPERIENCE_TYPE_BY_KEY: Record<string, ExperienceType> = Object.fromEntries(
  EXPERIENCE_TYPES.map((t) => [t.key, t]),
);

/** Exposure = awareness or exploration. It appears on the resume as stickers, never with a verified mark. */
export function isExposure(stage: Stage): boolean {
  return stage === "awareness" || stage === "exploration";
}

/** Do this experience's hours count toward Ohio's 250? Formal type, grade 9+, and verified. */
export function hoursCount(typeKey: string, grade: number | null, status: string): boolean {
  const t = EXPERIENCE_TYPE_BY_KEY[typeKey];
  return !!t && t.ohioFormalWbl && (grade ?? 0) >= 9 && status === "verified";
}

export const COMPENSATION_TYPES = [
  { key: "paid", label: "Paid" },
  { key: "stipend", label: "Stipend" },
  { key: "credit", label: "School credit" },
  { key: "unpaid", label: "Unpaid" },
] as const;

/** The 16 national career clusters. `slug` matches /public/passport/clusters/<slug>.webp. */
export const CAREER_CLUSTERS = [
  { slug: "agriculture", label: "Agriculture, Food & Natural Resources" },
  { slug: "construction", label: "Architecture & Construction" },
  { slug: "arts", label: "Arts, A/V Technology & Communications" },
  { slug: "business", label: "Business Management & Administration" },
  { slug: "education", label: "Education & Training" },
  { slug: "finance", label: "Finance" },
  { slug: "government", label: "Government & Public Administration" },
  { slug: "health", label: "Health Science" },
  { slug: "hospitality", label: "Hospitality & Tourism" },
  { slug: "human-services", label: "Human Services" },
  { slug: "information-technology", label: "Information Technology" },
  { slug: "manufacturing", label: "Manufacturing" },
  { slug: "marketing", label: "Marketing" },
  { slug: "public-safety", label: "Law, Public Safety, Corrections & Security" },
  { slug: "stem", label: "Science, Technology, Engineering & Mathematics" },
  { slug: "transportation", label: "Transportation, Distribution & Logistics" },
] as const;

export const CLUSTER_BY_SLUG: Record<string, { slug: string; label: string }> = Object.fromEntries(
  CAREER_CLUSTERS.map((c) => [c.slug, c]),
);

export function clusterImage(slug: string | null | undefined): string | null {
  return slug && CLUSTER_BY_SLUG[slug] ? `/passport/clusters/${slug}.webp` : null;
}

export const CREDENTIAL_TYPES = [
  { key: "industry_recognized_credential", label: "Industry-recognized credential" },
  { key: "dual_credit_ccp", label: "College Credit Plus (dual credit)" },
  { key: "diploma_seal", label: "Diploma seal" },
  { key: "micro_credential", label: "Micro-credential" },
  { key: "certificate", label: "Certificate" },
  { key: "badge", label: "Badge" },
] as const;

export const ARTIFACT_TYPES = [
  { key: "link", label: "Link" },
  { key: "image", label: "Photo" },
  { key: "video", label: "Video" },
  { key: "file", label: "File" },
  { key: "git_repo", label: "Code repository" },
  { key: "cad_model", label: "CAD model" },
  { key: "dataset", label: "Dataset" },
  { key: "writing", label: "Writing" },
  { key: "design", label: "Design" },
  { key: "build", label: "Physical build" },
  { key: "audio", label: "Audio" },
] as const;
