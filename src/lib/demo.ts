/** Public facts about the demo accounts (safe for the browser and the /demo page). */

export const DEMO_DOMAIN = "@demo.explrpathways.org";
export const DEMO_ROLES = [
  "explorer",
  "student",
  "family",
  "partner",
  "instructor",
  "applicant",
] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

export const DEMO = {
  explorer: { email: `mia${DEMO_DOMAIN}`, firstName: "Mia", grade: 6, dob: "2014-09-12" },
  student: { email: `amara${DEMO_DOMAIN}`, firstName: "Amara", grade: 11, dob: "2009-03-10" },
  instructor: { email: `instructor${DEMO_DOMAIN}`, name: "Dana Okafor" },
  partner: { email: `partner${DEMO_DOMAIN}`, org: "Lakeshore Health Partners" },
  /** A brand-new applicant for the internship application walkthrough (resettable). */
  applicant: { email: `theo${DEMO_DOMAIN}`, firstName: "Theo", grade: 9, dob: "2010-08-21" },
  /** Owner of the other demo internship listings (various partner names). */
  listingsOwner: { email: `partners${DEMO_DOMAIN}`, org: "Demo partner network" },
  /** Class codes shown on the board for the picture sign-in. */
  classCodes: { explorer: "DEMO-46", student: "DEMO-11" },
  /** Mia's three secret shapes, in order. */
  exploreSecret: ["star", "leaf", "sun"] as const,
  /** The token inside Mia's passport-card QR (so /go/<token> works in the demo). */
  exploreCardToken: "demo-mia-passport-card",
  /** Family codes a caregiver can type on /family. */
  familyCodes: { student: "EXPLR-FAM246", explorer: "EXPLR-FAM468" },
};
