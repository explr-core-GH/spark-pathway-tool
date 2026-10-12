/**
 * Competency taxonomy (spec section 5). One tag set: the eight NACE
 * competencies plus a durable-skills addition, with Ohio's 15
 * OhioMeansJobs-Readiness Seal skills nested under them for grades 9-12.
 * Ohio names are kept exactly so the seal export matches the state form.
 */

export type Competency = {
  key: string;
  label: string;
  /** Exact OMJ-Readiness Seal skill names nested under this competency. */
  omjSkills: string[];
};

export const COMPETENCIES: Competency[] = [
  {
    key: "career_self_development",
    label: "Career & self-development",
    omjSkills: ["Career Management", "Learning Agility"],
  },
  { key: "communication", label: "Communication", omjSkills: ["Oral and Written Communications"] },
  {
    key: "critical_thinking",
    label: "Critical thinking",
    omjSkills: ["Critical Thinking/Problem-Solving", "Creativity/Innovation"],
  },
  {
    key: "equity_inclusion",
    label: "Equity & inclusion",
    omjSkills: ["Global/Intercultural Fluency"],
  },
  { key: "leadership", label: "Leadership", omjSkills: ["Leadership"] },
  {
    key: "professionalism",
    label: "Professionalism",
    omjSkills: [
      "Drug Free",
      "Reliability",
      "Work Ethic",
      "Punctuality",
      "Discipline",
      "Professionalism",
    ],
  },
  { key: "teamwork", label: "Teamwork", omjSkills: ["Teamwork/Collaboration"] },
  { key: "technology", label: "Technology", omjSkills: ["Digital Technology"] },
  { key: "growth_mindset_metacognition", label: "Growth mindset & metacognition", omjSkills: [] },
];

export const OMJ_SKILLS: string[] = COMPETENCIES.flatMap((c) => c.omjSkills);

/** Four-level scale (matches the Ohio 4-H Readiness Seal evaluation tool). Level 3 is the proficiency bar. */
export const RATING_LEVELS = ["Beginner", "Developing", "Proficient", "Expert"] as const;
export const PROFICIENT = 3;

export type SkillProgress = {
  skill: string;
  /** Highest final rating across experiences, or null if never rated. */
  best: number | null;
  settings: Set<string>;
  raters: Set<string>;
  /** Shown in 2 of 3 settings and rated by 3+ distinct mentors at Proficient or above. */
  sealReady: boolean;
};

type RatingLike = {
  omj_skill: string | null;
  rating_final: number;
  setting: string;
  rater_email: string | null;
  rater_name: string;
};

/** Fold supervisor ratings into per-skill seal progress. Only verified ratings should be passed in. */
export function sealProgress(ratings: RatingLike[]): SkillProgress[] {
  return OMJ_SKILLS.map((skill) => {
    const mine = ratings.filter((r) => r.omj_skill === skill);
    const proficient = mine.filter((r) => r.rating_final >= PROFICIENT);
    const settings = new Set(proficient.map((r) => r.setting));
    const raters = new Set(proficient.map((r) => (r.rater_email ?? r.rater_name).toLowerCase()));
    const best = mine.length ? Math.max(...mine.map((r) => r.rating_final)) : null;
    return { skill, best, settings, raters, sealReady: settings.size >= 2 && raters.size >= 3 };
  });
}
