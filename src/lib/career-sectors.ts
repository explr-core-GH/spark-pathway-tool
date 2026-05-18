// 16 National Career Clusters (federal CTE framework)
export const CAREER_SECTORS = [
  { id: "agriculture", label: "Agriculture, Food & Natural Resources" },
  { id: "architecture", label: "Architecture & Construction" },
  { id: "arts-av", label: "Arts, A/V Technology & Communications" },
  { id: "business", label: "Business Management & Administration" },
  { id: "education", label: "Education & Training" },
  { id: "finance", label: "Finance" },
  { id: "government", label: "Government & Public Administration" },
  { id: "health", label: "Health Science" },
  { id: "hospitality", label: "Hospitality & Tourism" },
  { id: "human-services", label: "Human Services" },
  { id: "it", label: "Information Technology" },
  { id: "law-public-safety", label: "Law, Public Safety, Corrections & Security" },
  { id: "manufacturing", label: "Manufacturing" },
  { id: "marketing", label: "Marketing" },
  { id: "stem", label: "Science, Technology, Engineering & Mathematics" },
  { id: "transportation", label: "Transportation, Distribution & Logistics" },
] as const;

export type CareerSectorId = (typeof CAREER_SECTORS)[number]["id"];

export const CAREER_SECTOR_LABEL: Record<string, string> = Object.fromEntries(
  CAREER_SECTORS.map((s) => [s.id, s.label]),
);
