// EXPLR internship catalog. Each entry mirrors a real internship program with
// an external production site of its own. Cards in /educator/internships show
// title + link, with the rest as context on the detail page.

export type Internship = {
  slug: string;
  name: string;
  theme: string;             // discipline / format hint, e.g. "BioMed"
  lead: string | null;       // EXPLR internship lead's name; null when TBD
  outsidePartners: string;   // free-text — partner orgs, individuals
  deliverables: string;      // what students produce
  externalUrl: string;       // each internship has its own deployed site
  emoji: string;
  riasec: ("R" | "I" | "A" | "S" | "E" | "C")[]; // 1-3 dominant Holland codes for matching
};

export const INTERNSHIPS: Internship[] = [
  {
    slug: "adaptive-design",
    riasec: ["I","R"],
    name: "Adaptive Design",
    theme: "BioMed",
    lead: "Zachary Wenz",
    outsidePartners:
      "OT Professor at CSU · OTs in CMSD · Karen Thompson-Repas (Director CMSD OT)",
    deliverables:
      "3D designed adaptive tools designed for individuals and educators",
    externalUrl: "https://adaptivedesign.netlify.app/",
    emoji: "🩺",
  },
  {
    slug: "nextgen-educators",
    riasec: ["S","A"],
    name: "NextGen Educators",
    theme: "STEM CSU Camps",
    lead: "Angela Powell",
    outsidePartners: "VILSAP · CSU",
    deliverables: "Workshop lesson plans / implementation",
    externalUrl: "https://nextgeneducators.netlify.app/",
    emoji: "🎓",
  },
  {
    slug: "webdevai",
    riasec: ["I","A"],
    name: "WebDevAI",
    theme: "Two cohorts · Lead TBD",
    lead: null,
    outsidePartners: "Outside partners TBD",
    deliverables: "Published website, app, or tool",
    externalUrl: "https://webdevaicsu.netlify.app/",
    emoji: "💻",
  },
  {
    slug: "games-for-change",
    riasec: ["A","I"],
    name: "Games for Change",
    theme: "Video Game Design",
    lead: "Julien Medina",
    outsidePartners: "Endless Access",
    deliverables: "Published video game, published assets",
    externalUrl: "https://gamesforchange.netlify.app/",
    emoji: "🎮",
  },
  {
    slug: "envsci",
    riasec: ["I","R"],
    name: "EnvSci",
    theme: "Environmental Science Field Data",
    lead: "Yulisa Alvarado",
    outsidePartners: "RidAll",
    deliverables: "Published proposal with data dashboard",
    externalUrl: "https://envscicsu.netlify.app/",
    emoji: "🌿",
  },
  {
    slug: "civic-journalism",
    riasec: ["A","S"],
    name: "Civic Journalism",
    theme: "Civic Journalism",
    lead: "Sarah Spinelli",
    outsidePartners: "City of Cleveland (TBD)",
    deliverables:
      "Published website with articles, videos, and podcasts telling Cleveland stories",
    externalUrl: "https://civicjournalism.netlify.app/",
    emoji: "🎙️",
  },
];

export function getInternship(slug: string): Internship | undefined {
  return INTERNSHIPS.find((i) => i.slug === slug);
}

// Tag maps for internships (kept structurally identical to camp tag maps).
import type { ProgramType } from "./educator";

export type InternshipTagMap = Record<string, ProgramType[]>;

export function tagsForInternship(
  tagMap: InternshipTagMap,
  slug: string,
): ProgramType[] {
  return tagMap[slug] ?? [];
}

export function filterInternshipsByTag(
  tagMap: InternshipTagMap,
  pt: ProgramType,
): Internship[] {
  return INTERNSHIPS.filter((i) => (tagMap[i.slug] ?? []).includes(pt));
}
