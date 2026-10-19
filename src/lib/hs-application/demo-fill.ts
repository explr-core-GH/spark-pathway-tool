import {
  ACTIVITY_ITEMS,
  ENVIRONMENT_DIMS,
  EXPERIENCE_ITEMS,
  FORCED_PAIRS,
  REQUIREMENT_BY_KEY,
  REQUIREMENT_CATEGORIES,
  type Valence,
} from "./content";
import type {
  ApplicationBuilder,
  BuilderQuestion,
  CoreAnswers,
  GeneralChoices,
  PartnerAnswers,
  SurveyExtras,
} from "./types";

/**
 * Sample answers for demo accounts only, so a walkthrough can skip typing.
 * Every value passes the same validation real students face. Demo emails use
 * the demo domain, which never receives mail.
 */

const STORY =
  "Last spring my little brother's bike chain kept falling off, and nobody at home knew how to fix it. I watched three videos, borrowed a wrench from my neighbor, and figured out the back wheel was loose and crooked. I lined it up, tightened it, and adjusted the chain until it stopped slipping. It took two tries because I tightened it too much the first time and the wheel would not spin. Now my neighbors bring me their bikes, and I keep a notebook of what I fixed and what tools I used so I can do it faster next time.";
const HOPE =
  "I hope to find out what a real workday is like and whether I would enjoy a job where I talk with people and make things. I want to learn skills I cannot learn in a classroom, like how to ask good questions, how to work on a team with adults, and how to finish a project on a deadline. I would also like to meet people who can tell me how they got their jobs and what classes or programs helped them. Earning money for college matters to me too, and I want something to put on my resume and talk about in interviews.";

export const DEMO_CORE: CoreAnswers = {
  legalFirst: "Theo",
  legalLast: "Demo",
  preferredName: "Theo",
  email: "theo@demo.explrpathways.org",
  phone: "216-555-0199",
  okToText: true,
  dob: "2010-08-21",
  school: "Lincoln-West School of Science & Health",
  gradeFall: "10",
  zip: "44109",
  youEmail: "theo@demo.explrpathways.org",
  allWeeks: true,
  datesCant: "",
  transport: ["transit"],
  needsBusPass: true,
  workPermit: "not_sure",
  priorExplr: true,
  priorExplrWhich: "Summer STEM camp",
  madeFixed: STORY,
  hopeToGet: HOPE,
  supportNeeds: "",
  guardianName: "Jamie Demo",
  guardianPhone: "216-555-0142",
  guardianEmail: "guardian@demo.explrpathways.org",
  emergencyName: "Jamie Demo",
  emergencyPhone: "216-555-0142",
  consentStudent: true,
  consentStudentName: "Theo Demo",
  consentGuardian: true,
  consentGuardianName: "Jamie Demo",
  jobsThought: "Journalist, video editor, teacher",
  postHs: ["four_year", "not_sure"],
  planSure: 2,
  collegeCourses: false,
  collegeCoursesWhich: "",
  careerTech: false,
  careerTechWhich: "",
  credentials: ["CPR / First Aid"],
  credentialsOther: "",
  postHsApplication: "not_yet",
};

const VALENCES: Valence[] = ["did_more", "curious", "curious", "did_not", "not_interested"];

export const DEMO_EXTRAS: SurveyExtras = {
  fields: ["arts_comm", "education", "it"],
  activities: Object.fromEntries(
    ACTIVITY_ITEMS.map((a, i) => [a.id, [3, 3, 3, 2, 2, 2, 1, 1][i] ?? 2]),
  ),
  pairs: Object.fromEntries(FORCED_PAIRS.map((p, i) => [p.id, i % 2 === 0 ? "b" : "a"])) as Record<
    string,
    "a" | "b"
  >,
  environment: Object.fromEntries(ENVIRONMENT_DIMS.map((d, i) => [d.key, [4, 3, 3, 2, 4][i] ?? 3])),
  experience: Object.fromEntries(
    EXPERIENCE_ITEMS.map((e, i) => [e.key, VALENCES[i % VALENCES.length]]),
  ) as Record<string, Valence>,
};

export function demoChoices(shown: string[], current: GeneralChoices): GeneralChoices {
  const reactions = Object.fromEntries(
    shown.map((r, i) => [r, i < 2 ? "excited" : i === 2 ? "open" : "not_for_me"]),
  ) as GeneralChoices["reactions"];
  return {
    ...current,
    shown,
    reactions,
    ranked: shown.slice(0, Math.min(2, shown.length)),
    placeAnywhere: shown.length === 0,
    tryText: "Making short videos about my neighborhood.",
  };
}

function sampleAnswer(q: BuilderQuestion): unknown {
  const opts = q.options.filter(Boolean);
  switch (q.kind) {
    case "text":
      return "I like learning by doing, and this internship would let me try real work with people who can teach me. I want to build skills I can use in school and in a future job.";
    case "choice":
      return opts[0] ?? "";
    case "checklist_valence":
      return Object.fromEntries(opts.map((o, i) => [o, i === 0 ? "did_more" : "curious"]));
    case "settings":
      return Object.fromEntries(opts.map((o) => [o, "yes"]));
    case "yes_no_text":
      return { yes: true, text: "I babysit my cousins most weekends." };
    case "upload":
    case "media":
      return "";
  }
}

/** Partner-specific answers. The first cost item gets "I'd need help" so staff views show that flag. */
export function demoPartnerAnswers(b: ApplicationBuilder): PartnerAnswers {
  const requirements: PartnerAnswers["requirements"] = {};
  let helped = false;
  for (const r of b.requirements) {
    const def = REQUIREMENT_BY_KEY.get(r.key);
    const ackOnly = REQUIREMENT_CATEGORIES.find((c) => c.key === def?.category)?.ackOnly;
    if (ackOnly) requirements[r.key] = "ack";
    else if (!helped && def?.cost && r.whoPays === "student") {
      requirements[r.key] = "help";
      helped = true;
    } else requirements[r.key] = "can";
  }
  return {
    answers: Object.fromEntries(b.questions.map((q) => [q.id, sampleAnswer(q)])),
    requirements,
    questionNotes: {},
  };
}

/** A finished application for the demo partner's internship (Lakeshore Health). */
export function demoPartnerBuilder(
  start: string,
  end: string,
  address: string,
): ApplicationBuilder {
  return {
    profile: {
      title: "Supply Chain & Pharmacy Operations Intern",
      description:
        "Spend the summer with our hospital supply team learning how medicine and supplies reach every unit on time. You'll check in deliveries, count inventory, and help the pharmacy team restock.",
      weekly: [
        "Check in deliveries and match them to orders",
        "Count and update inventory on the computer",
        "Restock carts with a pharmacy technician",
        "Sit in on a weekly call with a supplier",
      ],
      learnEarn: "Inventory tracking, spreadsheets, barcode scanning, how a hospital runs",
      credentials: ["CPR / First Aid"],
      careerFields: ["health", "business_admin", "transportation"],
      riasec: "ICS",
      environment: { team: 4, screen: 3, structure: 2, outdoors: 1, pace: 4 },
      seats: 4,
      startDate: start,
      endDate: end,
      dailyHours: "Mon, Wed, Fri, 9:00 AM - 3:00 PM",
      address,
      busLine: "RTA HealthLine, stop at E. 100th St",
      niceToHave: ["Likes keeping things organized", "Has used a spreadsheet"],
    },
    questions: [
      {
        id: "B-01",
        prompt: "What made you interested in this internship?",
        kind: "text",
        options: [],
        maxWords: 100,
      },
      {
        id: "B-02",
        prompt: "Which of these have you tried?",
        kind: "checklist_valence",
        options: [
          "Spreadsheets",
          "Counting or organizing supplies",
          "A job where you helped customers",
        ],
      },
      {
        id: "B-07",
        prompt: "Pick the task you'd most want to do on day one.",
        kind: "choice",
        options: ["Check in a delivery", "Restock a cart", "Shadow a pharmacy buyer"],
      },
    ],
    requirements: [
      { key: "flu", whoPays: "partner" },
      { key: "tb", whoPays: "partner" },
      { key: "closed_toe", whoPays: "student" },
      { key: "business_casual", whoPays: "explr" },
      { key: "hipaa" },
      { key: "on_feet", essential: true },
      { key: "confidentiality" },
      { key: "pack_lunch" },
    ],
    age: { min: 16, max: null, reason: "site_safety" },
  };
}
