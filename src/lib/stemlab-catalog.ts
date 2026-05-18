// STEM Lab activity catalog — 45 interactive activities for grades 3-8,
// organized by category and tagged with RIASEC dimensions.
//
// RIASEC tags: editorial. Code the cognitive activity students do, not the
// nominal subject. Most STEM lab activities are R+I — hands-on or analytical.
// Some span A (creative builds) or C (data/records).

export type RiasecType = "R" | "I" | "A" | "S" | "E" | "C";

export type StemLabCategory =
  | "Physics"
  | "Chemistry"
  | "Life Science"
  | "Earth & Space"
  | "Engineering"
  | "Code & Cybersecurity"
  | "Data & AI"
  | "Digital Making"
  | "Math"
  | "Research & Presentation";

export type StemLabActivity = {
  slug: string;        // matches /t/<slug> in the deployed lab
  title: string;
  blurb: string;
  category: StemLabCategory;
  riasec: RiasecType[]; // primary first, max 3
  related_socs?: string[]; // SOC codes (for the workforce dashboard, future)
  grade_band: "3-5" | "6-8" | "3-8";
};

export const CATEGORIES: Array<{ key: StemLabCategory; subtitle: string }> = [
  { key: "Physics", subtitle: "Energy, electricity, motion, machines" },
  { key: "Chemistry", subtitle: "Matter, atoms, molecules" },
  { key: "Life Science", subtitle: "Cells, body systems, biology, ecosystems" },
  { key: "Earth & Space", subtitle: "Planets, climate, weather, geology" },
  { key: "Engineering", subtitle: "Design process, robotics, 3D" },
  { key: "Code & Cybersecurity", subtitle: "Programming, logic, ciphers" },
  { key: "Data & AI", subtitle: "Spreadsheets, charts, machine learning" },
  { key: "Digital Making", subtitle: "Pixel art, text effects, creative tech" },
  { key: "Math", subtitle: "Graphing, coordinates, calculation" },
  { key: "Research & Presentation", subtitle: "Plan, present, and share your work" },
];

export const STEM_LAB_ACTIVITIES: StemLabActivity[] = [
  // Physics
  { slug: "circuits", title: "Circuit Builder", blurb: "Build realistic circuits with LEDs, switches, motors.", category: "Physics", riasec: ["R", "I"], related_socs: ["49-2094", "47-2111", "17-2071"], grade_band: "3-8" },
  { slug: "gear-lab", title: "Gear Systems Lab", blurb: "Design gear trains and explore ratios.", category: "Physics", riasec: ["R", "I"], related_socs: ["49-9041", "51-4041"], grade_band: "3-8" },
  { slug: "forces-lab", title: "Forces Lab", blurb: "Push, pull, and friction with live F = ma.", category: "Physics", riasec: ["I", "R"], related_socs: ["19-2012", "17-2141"], grade_band: "3-8" },
  { slug: "simple-machines", title: "Simple Machines Lab", blurb: "Levers, pulleys, and inclined planes.", category: "Physics", riasec: ["R", "I"], related_socs: ["49-9041", "47-2111"], grade_band: "3-5" },
  { slug: "light-color", title: "Light & Color Lab", blurb: "Prisms, mirrors, shadows, color mixing.", category: "Physics", riasec: ["I", "A"], related_socs: ["27-1024", "19-2012"], grade_band: "3-8" },
  { slug: "sound-waves", title: "Sound Wave Explorer", blurb: "Frequency, amplitude, and waveforms.", category: "Physics", riasec: ["I", "A"], related_socs: ["27-4014", "19-2012"], grade_band: "3-8" },
  { slug: "magnet-lab", title: "Magnet Lab", blurb: "Magnetic fields, poles, and compasses.", category: "Physics", riasec: ["I", "R"], related_socs: ["19-2012", "17-2071"], grade_band: "3-5" },
  { slug: "solar-wind", title: "Solar & Wind Lab", blurb: "Tune panels and turbines to generate renewable power.", category: "Physics", riasec: ["R", "I"], related_socs: ["47-2231", "49-9081"], grade_band: "3-8" },

  // Chemistry
  { slug: "matter", title: "States of Matter", blurb: "Heat up particles and see phase changes.", category: "Chemistry", riasec: ["I"], related_socs: ["19-2031", "19-1042"], grade_band: "3-5" },
  { slug: "molecule-builder", title: "Molecule Builder", blurb: "Place atoms, make bonds, build molecules.", category: "Chemistry", riasec: ["I", "C"], related_socs: ["19-2031", "19-1042", "29-1228"], grade_band: "6-8" },

  // Life Science
  { slug: "cells", title: "Cell Explorer", blurb: "Click organelles to learn their jobs.", category: "Life Science", riasec: ["I"], related_socs: ["19-1042", "29-1141"], grade_band: "3-8" },
  { slug: "food-web", title: "Food Web Builder", blurb: "Build food chains and see how energy flows.", category: "Life Science", riasec: ["I"], related_socs: ["19-1023", "19-1031"], grade_band: "3-8" },
  { slug: "body-systems", title: "Body Systems Explorer", blurb: "Click through the skeletal, circulatory, and other systems.", category: "Life Science", riasec: ["I", "S"], related_socs: ["29-1141", "29-1216", "29-1228"], grade_band: "3-8" },
  { slug: "genetics", title: "Genetics Lab", blurb: "Punnett squares, dominant and recessive traits.", category: "Life Science", riasec: ["I", "C"], related_socs: ["19-1029", "29-1228"], grade_band: "6-8" },
  { slug: "disease-spread", title: "Disease Spread Lab", blurb: "Simulate outbreaks, vaccines, and quarantine.", category: "Life Science", riasec: ["I", "S"], related_socs: ["29-9011", "19-1041"], grade_band: "6-8" },
  { slug: "plant-growth", title: "Plant Growth Lab", blurb: "Water, light, nutrients — grow a healthy plant.", category: "Life Science", riasec: ["R", "I"], related_socs: ["45-2092", "19-1013"], grade_band: "3-5" },

  // Earth & Space
  { slug: "moon-phases", title: "Moon Phase Explorer", blurb: "Watch the moon change through its cycle.", category: "Earth & Space", riasec: ["I"], related_socs: ["19-2011"], grade_band: "3-5" },
  { slug: "seasons", title: "Seasons & Earth Tilt", blurb: "Discover why we get seasons as Earth orbits the sun.", category: "Earth & Space", riasec: ["I"], related_socs: ["19-2011", "19-2042"], grade_band: "3-5" },
  { slug: "solar-system", title: "Solar System Explorer", blurb: "Tour the planets — sizes, orbits, and days.", category: "Earth & Space", riasec: ["I"], related_socs: ["19-2011"], grade_band: "3-8" },
  { slug: "rocket-lab", title: "Rocket Lab", blurb: "Launch rockets and fight gravity.", category: "Earth & Space", riasec: ["R", "I"], related_socs: ["17-2011"], grade_band: "3-8" },
  { slug: "climate-sim", title: "Climate Simulator", blurb: "Adjust CO₂, sunlight, and see Earth warm.", category: "Earth & Space", riasec: ["I", "S"], related_socs: ["19-2041", "19-2042"], grade_band: "6-8" },

  // Engineering
  { slug: "engineering", title: "Engineering Design Lab", blurb: "Walk the design process with a challenge.", category: "Engineering", riasec: ["R", "I"], related_socs: ["17-2199", "17-2141"], grade_band: "3-8" },
  { slug: "robotics-strategy", title: "Robotics Strategy", blurb: "Plan and test robot moves on a field.", category: "Engineering", riasec: ["R", "I", "E"], related_socs: ["17-2199", "15-1252"], grade_band: "6-8" },

  // Code & Cybersecurity
  { slug: "code-playground", title: "Code Playground", blurb: "Write and run JS, Python, HTML, and CSS.", category: "Code & Cybersecurity", riasec: ["I", "C"], related_socs: ["15-1252", "15-1254"], grade_band: "6-8" },
  { slug: "minecraft-commands", title: "Minecraft Commands", blurb: "Build commands with block-style editing.", category: "Code & Cybersecurity", riasec: ["I", "A"], related_socs: ["15-1255", "27-1014"], grade_band: "3-8" },
  { slug: "binary-converter", title: "Binary Converter", blurb: "Translate between decimal, binary, and ASCII.", category: "Code & Cybersecurity", riasec: ["I", "C"], related_socs: ["15-1252"], grade_band: "6-8" },
  { slug: "algorithm-visualizer", title: "Algorithm Visualizer", blurb: "Watch sorts and searches step by step.", category: "Code & Cybersecurity", riasec: ["I"], related_socs: ["15-1252", "15-2031"], grade_band: "6-8" },
  { slug: "logic-gates", title: "Logic Gates & Chip Lab", blurb: "Build circuits from AND, OR, NOT — the way computers think.", category: "Code & Cybersecurity", riasec: ["I", "R"], related_socs: ["17-2061", "15-1252"], grade_band: "6-8" },
  { slug: "cipher-lab", title: "Cipher & Cybersecurity Lab", blurb: "Encrypt messages and crack codes.", category: "Code & Cybersecurity", riasec: ["I", "C"], related_socs: ["15-1212", "33-3021"], grade_band: "6-8" },

  // Data & AI
  { slug: "data-ai", title: "Teachable Classifier", blurb: "Train a simple AI with your own data.", category: "Data & AI", riasec: ["I", "C"], related_socs: ["15-2051", "15-1252"], grade_band: "6-8" },
  { slug: "data-visualizer", title: "Data Visualizer", blurb: "Turn tables of data into charts.", category: "Data & AI", riasec: ["I", "C", "A"], related_socs: ["15-2051", "13-2099"], grade_band: "3-8" },
  { slug: "spreadsheet", title: "Mini Spreadsheet", blurb: "Cells, formulas, and basic analysis.", category: "Data & AI", riasec: ["C", "I"], related_socs: ["13-2011", "15-2031"], grade_band: "3-8" },

  // Digital Making
  { slug: "pixel-art", title: "Pixel Art Studio", blurb: "Make sprite-style art on a grid.", category: "Digital Making", riasec: ["A"], related_socs: ["27-1014", "27-1024"], grade_band: "3-8" },
  { slug: "text-effects", title: "Text Effects", blurb: "Transform text with algorithms.", category: "Digital Making", riasec: ["A", "I"], related_socs: ["27-1024", "15-1255"], grade_band: "3-8" },

  // Math
  { slug: "graph-calculator", title: "Graphing Calculator", blurb: "Plot functions and explore curves.", category: "Math", riasec: ["I", "C"], related_socs: ["15-2021", "15-2031"], grade_band: "6-8" },
  { slug: "graph-paper", title: "Digital Graph Paper", blurb: "Free-form graphing and drawing.", category: "Math", riasec: ["A", "C"], related_socs: ["27-1024", "15-2021"], grade_band: "3-8" },
  { slug: "point-plotter", title: "Point Plotter", blurb: "Plot coordinates on a plane.", category: "Math", riasec: ["C", "I"], related_socs: ["15-2021"], grade_band: "3-5" },

  // Research & Presentation
  { slug: "poster-builder", title: "Poster Builder", blurb: "Build a bright, printable poster of your research.", category: "Research & Presentation", riasec: ["A", "E"], related_socs: ["27-1024", "13-1161"], grade_band: "3-8" },
  { slug: "question-helper", title: "Question Helper", blurb: "Turn a topic into a testable research question.", category: "Research & Presentation", riasec: ["I"], related_socs: ["19-3033", "25-1067"], grade_band: "3-8" },
  { slug: "observation-journal", title: "Observation Journal", blurb: "Record daily observations, photos, and notes.", category: "Research & Presentation", riasec: ["C", "I"], related_socs: ["19-1031", "19-1023"], grade_band: "3-5" },
  { slug: "mind-map", title: "Mind Map", blurb: "Brainstorm and connect ideas visually.", category: "Research & Presentation", riasec: ["A", "I"], related_socs: ["27-1024", "13-1161"], grade_band: "3-8" },
  { slug: "sources", title: "My Sources", blurb: "Keep track of where you learned things.", category: "Research & Presentation", riasec: ["C"], related_socs: ["25-4022", "13-1031"], grade_band: "3-8" },
  { slug: "slide-deck", title: "Slide Deck", blurb: "Make a simple slideshow for your presentation.", category: "Research & Presentation", riasec: ["E", "A"], related_socs: ["13-1161", "27-3031"], grade_band: "3-8" },
];

export function activitiesByCategory(): Map<StemLabCategory, StemLabActivity[]> {
  const out = new Map<StemLabCategory, StemLabActivity[]>();
  for (const c of CATEGORIES) out.set(c.key, []);
  for (const a of STEM_LAB_ACTIVITIES) {
    out.get(a.category)?.push(a);
  }
  return out;
}

export function activitiesForRiasec(top: RiasecType[]): StemLabActivity[] {
  // Return activities whose primary RIASEC tag is in the top list,
  // ordered by how strongly they match (primary match first, then secondary).
  const out: StemLabActivity[] = [];
  for (const a of STEM_LAB_ACTIVITIES) {
    if (top.includes(a.riasec[0])) out.push(a);
  }
  for (const a of STEM_LAB_ACTIVITIES) {
    if (out.includes(a)) continue;
    if (a.riasec.some((r) => top.includes(r))) out.push(a);
  }
  return out;
}

// Deep-link helpers. The STEM Lab is hosted as a static SPA under /lab/
// (React Router basename="/lab"). To point at an externally-hosted lab,
// set VITE_STEM_LAB_URL in your env.
export const STEM_LAB_BASE =
  (import.meta.env?.VITE_STEM_LAB_URL as string | undefined) ?? "/lab";

export function stemLabHome(): string {
  return STEM_LAB_BASE;
}

export function stemLabActivityLink(slug: string): string {
  return `${STEM_LAB_BASE}/t/${slug}`;
}

export function stemLabCategoryLink(slug: string): string {
  return `${STEM_LAB_BASE}/topic/${slug}`;
}
