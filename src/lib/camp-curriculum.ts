// Camp / curriculum catalog. Files served from public/curriculum/<slug>/<filename>.
// Originally migrated from the camp-instructor-hub site.
//
// Note: tags-by-program-type are NOT in this file. Tags are owned by admins
// and persisted in supabase (table: curriculum_tags). Use `getCurriculumTags`
// from supabase to fetch them, then filter with `filterCampsByTags`.

import type { ProgramType } from "./educator";

export type CurriculumResourceType =
  | "guide"
  | "workbook"
  | "slides"
  | "pdf"
  | "data"
  | "image"
  | "archive"
  | "other";

export type CurriculumResource = {
  label: string;
  file: string;            // basename — joined with /curriculum/<slug>/
  type: CurriculumResourceType;
};

export type CurriculumDay = {
  day: number;
  title: string;
  file: string;            // basename of the slide deck (pptx)
};

export type CampCurriculum = {
  slug: string;
  name: string;
  emoji: string;
  tagline: string;
  duration: string;
  ageRange: string;
  overview: string;
  days: CurriculumDay[];
  // For camps without a per-day breakdown, a single slide deck file.
  slides: string | null;
  resources: CurriculumResource[];
};

export const RESOURCE_LABELS: Record<CurriculumResourceType, string> = {
  guide: "Teacher Guide",
  workbook: "Student Workbook",
  slides: "Slide Deck",
  pdf: "PDF",
  data: "Data / Spreadsheet",
  image: "Image",
  archive: "ZIP / Archive",
  other: "Other",
};

export const CAMPS: CampCurriculum[] = [
  {
    slug: "bike-cleveland",
    name: "Bike Cleveland — Gear Up For STEM",
    emoji: "🚲",
    tagline: "Bike-powered STEM unit in partnership with Bike Cleveland.",
    duration: "Single unit",
    ageRange: "Middle school",
    overview:
      "A standalone STEM unit exploring physics, mechanics, and engineering through bicycles. Includes a single educator guide and slide deck.",
    days: [],
    slides: "GearUpForSTEM_Slides.pptx",
    resources: [
      { label: "Educator Guide", file: "GearUpForSTEM_EducatorGuide.docx", type: "guide" },
      { label: "Slide Deck", file: "GearUpForSTEM_Slides.pptx", type: "slides" },
    ],
  },
  {
    slug: "boxcraft",
    name: "BoxCraft — Cardboard Design",
    emoji: "📦",
    tagline: "Five days of hands-on cardboard engineering and design thinking.",
    duration: "5 days",
    ageRange: "Elementary / Middle",
    overview:
      "Students design, prototype, test, and refine creations from cardboard — practicing tool use, iteration, and showcase presentation skills.",
    days: [
      { day: 1, title: "Tools & Techniques", file: "BoxCraft_Day1_ToolsTechniques.pptx" },
      { day: 2, title: "Choose & Plan", file: "BoxCraft_Day2_ChoosePlan.pptx" },
      { day: 3, title: "Build & Test", file: "BoxCraft_Day3_BuildTest.pptx" },
      { day: 4, title: "Refine & Improve", file: "BoxCraft_Day4_RefineImprove.pptx" },
      { day: 5, title: "Finish & Showcase", file: "BoxCraft_Day5_FinishShowcase.pptx" },
    ],
    slides: null,
    resources: [
      { label: "Teacher Guide", file: "BoxCraft_TeacherGuide.docx", type: "guide" },
      { label: "Student Workbook", file: "BoxCraft_StudentWorkbook.docx", type: "workbook" },
    ],
  },
  {
    slug: "fashionforge",
    name: "FashionForge — All Girls",
    emoji: "👗",
    tagline: "Fashion + tech camp paired with underwater robotics (all-girls cohort).",
    duration: "5 days",
    ageRange: "Middle school",
    overview:
      "A creative engineering camp where students design wearables and accessories, exploring textiles, 3D printing, and jewelry design — paired with an underwater robotics track.",
    days: [
      { day: 1, title: "Fashion Meets the Future", file: "Day1_FashionMeetsTheFuture.pptx" },
      { day: 2, title: "Jewelry Design Studio", file: "Day2_JewelryDesignStudio.pptx" },
      { day: 3, title: "Fabric & Filament", file: "Day3_FabricAndFilament.pptx" },
      { day: 4, title: "Accessories Lab", file: "Day4_AccessoriesLab.pptx" },
      { day: 5, title: "FashionForge Showcase", file: "Day5_FashionForgeShowcase.pptx" },
    ],
    slides: null,
    resources: [
      { label: "Teacher Guide", file: "FashionForge_TeacherGuide.docx", type: "guide" },
      { label: "Student Workbook", file: "FashionForge_StudentWorkbook.docx", type: "workbook" },
    ],
  },
  {
    slug: "fll-challenge",
    name: "FLL Challenge Camp",
    emoji: "🤖",
    tagline: "FIRST LEGO League Challenge preparation camp.",
    duration: "Camp unit",
    ageRange: "Elementary / Middle",
    overview:
      "Introduces FIRST LEGO League Challenge — robot design, missions, and team collaboration — in a single-deck format.",
    days: [],
    slides: "FLL_Camp_Slide_Deck.pptx",
    resources: [
      { label: "Teacher Guide", file: "FLL_Camp_Teacher_Guide.docx", type: "guide" },
      { label: "Student Workbook", file: "FLL_Camp_Student_Workbook.docx", type: "workbook" },
      { label: "Slide Deck", file: "FLL_Camp_Slide_Deck.pptx", type: "slides" },
    ],
  },
  {
    slug: "microclimate",
    name: "MicroClimate (Paired with Seaperch)",
    emoji: "🌱",
    tagline: "Environmental science camp paired with Seaperch underwater ROV build.",
    duration: "5 days",
    ageRange: "Middle school",
    overview:
      "Students explore microclimates, wind, sun, hydroponics, and sensor data — connecting ecological science with the Seaperch ROV track.",
    days: [
      { day: 1, title: "Launch", file: "Day1_Launch.pptx" },
      { day: 2, title: "Wind & Sun", file: "Day2_WindSun.pptx" },
      { day: 3, title: "Hydroponics", file: "Day3_Hydroponics.pptx" },
      { day: 4, title: "Sensors & Data", file: "Day4_SensorsData.pptx" },
      { day: 5, title: "Capstone", file: "Day5_Capstone.pptx" },
    ],
    slides: null,
    resources: [
      { label: "Teacher Curriculum Guide", file: "Teacher_Curriculum_Guide.docx", type: "guide" },
      { label: "Student Workbook", file: "Student_Workbook.docx", type: "workbook" },
    ],
  },
  {
    slug: "oda-workshop",
    name: "ODA Workshop",
    emoji: "🏛️",
    tagline: "CSU workshop proposal — Ohio Department on Aging partnership.",
    duration: "Workshop",
    ageRange: "See proposal",
    overview:
      "Working document — a workshop proposal in PDF form. No daily slide breakdown yet.",
    days: [],
    slides: null,
    resources: [
      { label: "Workshop Proposal (PDF)", file: "CSU Workshop Proposal_ ODA.pdf", type: "pdf" },
    ],
  },
  {
    slug: "robobattles",
    name: "RoboBattles",
    emoji: "⚔️",
    tagline: "Five days of competitive robotics design and battles.",
    duration: "5 days",
    ageRange: "Elementary / Middle",
    overview:
      "Students design, build, and compete with battle bots — culminating in head-to-head competition. Teacher guide included.",
    days: [
      { day: 1, title: "Day 1", file: "RoboBattles_Day1.pptx" },
      { day: 2, title: "Day 2", file: "RoboBattles_Day2.pptx" },
      { day: 3, title: "Day 3", file: "RoboBattles_Day3.pptx" },
      { day: 4, title: "Day 4", file: "RoboBattles_Day4.pptx" },
      { day: 5, title: "Day 5", file: "RoboBattles_Day5.pptx" },
    ],
    slides: null,
    resources: [
      { label: "Teacher Guide", file: "RoboBattles_Teacher_Guide.docx", type: "guide" },
    ],
  },
  {
    slug: "roller-coasters-drones",
    name: "Roller Coasters & Drones",
    emoji: "🎢",
    tagline: "Physics of coasters paired with drone coding.",
    duration: "5 days",
    ageRange: "Middle school",
    overview:
      "A two-track camp combining roller coaster engineering with drone programming and integration — finishing with a student showcase.",
    days: [
      { day: 1, title: "Foundations", file: "Day1_Foundations.pptx" },
      { day: 2, title: "Coaster Engineering", file: "Day2_Coaster_Engineering.pptx" },
      { day: 3, title: "Drone Coding", file: "Day3_Drone_Coding.pptx" },
      { day: 4, title: "Integration", file: "Day4_Integration.pptx" },
      { day: 5, title: "Showcase", file: "Day5_Showcase.pptx" },
    ],
    slides: null,
    resources: [
      { label: "Camp Curriculum", file: "Roller_Coasters_and_Drones_Camp_Curriculum.docx", type: "guide" },
      { label: "Teacher Guide", file: "teacher_guide.docx", type: "guide" },
      { label: "Student Workbook", file: "student_workbook.docx", type: "workbook" },
      { label: "Journey Upload (XLSX)", file: "journey_upload_rollercoasters_drones.xlsx", type: "data" },
    ],
  },
  {
    slug: "seaperch",
    name: "Seaperch",
    emoji: "🌊",
    tagline: "Underwater ROV build and competition camp.",
    duration: "5 days",
    ageRange: "Middle / High",
    overview:
      "Students build an underwater remotely operated vehicle (ROV) over five days, learning waterproofing, controls, and team engineering.",
    days: [
      { day: 1, title: "Day 1", file: "seaperch-day1-slides.pptx" },
      { day: 2, title: "Day 2", file: "seaperch-day2-slides.pptx" },
      { day: 3, title: "Day 3", file: "seaperch-day3-slides.pptx" },
      { day: 4, title: "Day 4", file: "seaperch-day4-slides.pptx" },
      { day: 5, title: "Day 5", file: "seaperch-day5-slides.pptx" },
    ],
    slides: null,
    resources: [
      { label: "Teacher Guide", file: "seaperch-teacher-guide.docx", type: "guide" },
      { label: "Student Workbook", file: "seaperch-student-workbook.docx", type: "workbook" },
    ],
  },
  {
    slug: "seamate",
    name: "SeaMate (Pufferfish ROV)",
    emoji: "🐡",
    tagline: "SeaMate Pufferfish underwater ROV curriculum.",
    duration: "Camp unit",
    ageRange: "Middle / High",
    overview:
      "Pufferfish ROV-based underwater robotics curriculum with combined slide deck, educator guide, student workbook, and standards-alignment documents.",
    days: [],
    slides: "Pufferfish_Combined_Slide_Deck.pptx",
    resources: [
      { label: "Educator Guide", file: "Pufferfish_Educator_Guide.docx", type: "guide" },
      { label: "Student Workbook", file: "Pufferfish_Student_Workbook.docx", type: "workbook" },
      { label: "Combined Slide Deck", file: "Pufferfish_Combined_Slide_Deck.pptx", type: "slides" },
      { label: "Slide Presentations (PDF)", file: "PPT Presentations.pdf", type: "pdf" },
      { label: "General Guide (PDF)", file: "PufferFish General Guide Download.pdf", type: "pdf" },
      { label: "Assessments (PDF)", file: "Assessments Pufferfish.pdf", type: "pdf" },
      { label: "Standards Alignment (PDF)", file: "Pufferfish_ROV_Standards_Alignment_logos.pdf", type: "pdf" },
    ],
  },
  {
    slug: "xrp",
    name: "XRP Robotics",
    emoji: "🚀",
    tagline: "Experiential Robotics Platform (XRP) — Orbit Odyssey & Iron Acres.",
    duration: "Camp unit",
    ageRange: "Middle / High",
    overview:
      "XRP-based robotics curriculum featuring the Orbit Odyssey and Iron Acres game challenges, 3D-printable robot kit files, and accessory model files.",
    days: [],
    slides: null,
    resources: [
      { label: "XRP Camp Guide — Orbit Odyssey", file: "XRPCampGuideOO25 (2).pdf", type: "pdf" },
      { label: "Orbit Odyssey Manual V1", file: "Orbit Odyssey Manual V1 (1).pdf", type: "pdf" },
      { label: "Playing Field Diagram", file: "XRP_Orbit_ODD_Playing_Field_FIN_MAR_17_2025 (1).jpg", type: "image" },
      { label: "2025 Orbit Odyssey Model Files (ZIP)", file: "2025-xrp-game-orbit-odyssey-model_files (2).zip", type: "archive" },
      { label: "2026 Iron Acres Model Files (ZIP)", file: "2026-xrp-game-iron-acres-model_files.zip", type: "archive" },
      { label: "XRP Robot Kit Model Files (ZIP)", file: "xrp-robot-kit-model_files.zip", type: "archive" },
      { label: "ARM XRP Alpha 100 Screwless Robotic Arm (ZIP)", file: "armxrp-alpha-100-screwless-3d-printed-robotic-arm-model_files (1).zip", type: "archive" },
      { label: "Controller Bit Holder (ZIP)", file: "holder-for-controllerbit-model_files.zip", type: "archive" },
      { label: "XRP Keychain Ornament (ZIP)", file: "keychainornament-xrp-model_files (1).zip", type: "archive" },
    ],
  },
];

export function getCamp(slug: string): CampCurriculum | undefined {
  return CAMPS.find((c) => c.slug === slug);
}

// Tag maps: slug → list of program types the admin has tagged that camp with.
export type CampTagMap = Record<string, ProgramType[]>;

export function tagsForCamp(tagMap: CampTagMap, slug: string): ProgramType[] {
  return tagMap[slug] ?? [];
}

export function filterCampsByTag(
  tagMap: CampTagMap,
  pt: ProgramType,
): CampCurriculum[] {
  return CAMPS.filter((c) => (tagMap[c.slug] ?? []).includes(pt));
}

/**
 * Public URL for a curriculum resource file (Teacher Guide, Workbook, etc.).
 * Files live in the Supabase Storage `curriculum` bucket at
 * curriculum/<slug>/<filename>; the bucket is public-read so a plain
 * <a href={fileUrl(...)}> downloads / opens directly.
 *
 * The bucket URL pattern matches SlideViewer.tsx — keep them in sync if
 * either ever changes.
 */
export function fileUrl(slug: string, file: string): string {
  const supabaseUrl =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
    "";
  const path = `${encodeURIComponent(slug)}/${encodeURIComponent(file)}`;
  return `${supabaseUrl}/storage/v1/object/public/curriculum/${path}`;
}
