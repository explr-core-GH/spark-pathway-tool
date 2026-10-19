import { randomBytes, randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DEMO, DEMO_DOMAIN } from "./demo";
import type { ApplicationBuilder } from "./hs-application/types";

/**
 * Internship application walkthrough for /demo.
 *
 * - Theo (grade 9 now, grade 10 this fall) is a brand-new applicant with a
 *   finished interest survey and no application, so a demo can show the
 *   general application, matches, and then partner-specific questions.
 * - Four demo internships from made-up partners already have published
 *   applications. The demo partner (Lakeshore Health) starts with none, so a
 *   partner demo builds one from scratch; once published, Theo sees it too.
 *
 * Every demo listing carries custom.demo = true: demo accounts see only demo
 * listings, and real students never see them. Reset only touches demo rows.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabaseAdmin.from as unknown as (n: string) => any)(table);

async function findDemoUser(email: string): Promise<string | null> {
  for (let page = 1; page < 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const u = data.users.find((x) => x.email === email && x.user_metadata?.demo === true);
    if (u) return u.id;
    if (data.users.length < 1000) break;
  }
  return null;
}

async function ensureDemoUser(email: string, meta: Record<string, unknown>): Promise<string> {
  if (!email.endsWith(DEMO_DOMAIN)) throw new Error("Not a demo account");
  const found = await findDemoUser(email);
  if (found) return found;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: randomBytes(24).toString("base64url"),
    email_confirm: true,
    user_metadata: { demo: true, generated: true, ...meta },
  });
  if (error || !data.user) throw new Error(error?.message ?? "createUser failed");
  return data.user.id;
}

async function must(p: Promise<{ error: { message: string } | null }>, what: string) {
  const { error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
}

const nextYear = () => new Date().getFullYear() + 1;

type DemoListing = {
  key: string;
  org: string;
  name: string;
  description: string;
  riasec_code: string;
  riasec_weights: Record<string, number>;
  location: string;
  builder: ApplicationBuilder;
};

function listings(): DemoListing[] {
  const y = nextYear();
  const start = `${y}-06-14`;
  const end = `${y}-07-23`;
  return [
    {
      key: "newsroom",
      org: "Northcoast Community News",
      name: "Neighborhood Newsroom Intern",
      description:
        "Report on your own neighborhood with our editors. You'll pitch stories, interview neighbors, take photos, and publish short pieces on our website every week.",
      riasec_code: "ASE",
      riasec_weights: { A: 45, S: 25, E: 20, I: 10 },
      location: "1801 Superior Ave, Cleveland, OH",
      builder: {
        profile: {
          title: "Neighborhood Newsroom Intern",
          description:
            "Report on your own neighborhood with our editors. You'll pitch stories, interview neighbors, take photos, and publish short pieces on our website every week of the summer.",
          weekly: [
            "Pitch a story idea at Monday's meeting",
            "Interview a neighbor or local leader",
            "Take and edit photos",
            "Publish one short story with an editor",
          ],
          learnEarn:
            "Interviewing, news writing, photo editing, and published clips for your portfolio",
          credentials: [],
          careerFields: ["arts_comm", "marketing"],
          riasec: "ASE",
          environment: { team: 4, screen: 3, structure: 4, outdoors: 3, pace: 4 },
          seats: 4,
          startDate: start,
          endDate: end,
          dailyHours: "Mon-Thu, 10:00 AM - 3:00 PM",
          address: "1801 Superior Ave, Cleveland, OH",
          busLine: "RTA HealthLine, stop at E. 18th St",
          niceToHave: ["Has written for a school paper or blog", "Likes taking photos"],
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
            id: "B-08",
            prompt:
              "Write a short headline and two sentences about something happening in your neighborhood.",
            kind: "text",
            options: [],
            maxWords: 75,
          },
          {
            id: "B-05",
            prompt: "Share something you've made (photo, link or file).",
            kind: "upload",
            options: [],
            optional: true,
          },
        ],
        requirements: [
          { key: "photo_id" },
          { key: "own_phone" },
          { key: "business_casual", whoPays: "explr" },
        ],
        age: { min: null, max: null, reason: "" },
      },
    },
    {
      key: "construction",
      org: "Forest City Builders",
      name: "Construction CAD & Site Assistant",
      description:
        "Work with our project managers on a real building project. Update drawings in AutoCAD, track materials, and walk the job site with the superintendent.",
      riasec_code: "RCI",
      riasec_weights: { R: 40, C: 30, I: 20, E: 10 },
      location: "3615 Superior Ave, Cleveland, OH",
      builder: {
        profile: {
          title: "Construction CAD & Site Assistant",
          description:
            "Work with our project managers on a real building project. You'll update drawings in AutoCAD, track materials, and walk the job site with the superintendent to see the plans become a building.",
          weekly: [
            "Update floor plans in AutoCAD",
            "Count and log material deliveries",
            "Walk the job site with the superintendent",
            "Join the weekly project meeting",
          ],
          learnEarn: "AutoCAD basics, reading blueprints, jobsite safety",
          credentials: ["OSHA-10"],
          careerFields: ["construction", "engineering_science"],
          riasec: "RCI",
          environment: { team: 3, screen: 3, structure: 2, outdoors: 4, pace: 4 },
          seats: 3,
          startDate: start,
          endDate: end,
          dailyHours: "Mon-Fri, 7:00 AM - 12:00 PM",
          address: "3615 Superior Ave, Cleveland, OH",
          busLine: "RTA #3, stop at Superior & E. 36th",
          niceToHave: ["Has used any CAD or 3D design program"],
        },
        questions: [
          {
            id: "B-02",
            prompt: "Which of these have you tried?",
            kind: "checklist_valence",
            options: [
              "AutoCAD or another CAD program",
              "A tape measure and level",
              "3D printing",
              "Reading a floor plan",
            ],
          },
          {
            id: "B-03",
            prompt: "Tell us about a time something didn't work the first time. What did you do?",
            kind: "text",
            options: [],
            maxWords: 150,
          },
        ],
        requirements: [
          { key: "steel_toe", whoPays: "partner" },
          { key: "hard_hat", whoPays: "partner" },
          { key: "safety_glasses", whoPays: "partner" },
          { key: "osha10", whoPays: "explr" },
          { key: "on_feet", essential: true },
          { key: "outdoors_weather", essential: true },
          { key: "early_start", detail: "7:00 AM" },
          { key: "pack_lunch" },
        ],
        age: { min: 17, max: null, reason: "site_safety" },
      },
    },
    {
      key: "camp",
      org: "Westside Youth Center",
      name: "Summer Camp Counselor-in-Training",
      description:
        "Help run a summer day camp for kids ages 6 to 11. Lead games, help with STEM activities, and learn what it takes to work with young people.",
      riasec_code: "SEA",
      riasec_weights: { S: 50, E: 20, A: 20, R: 10 },
      location: "4410 Lorain Ave, Cleveland, OH",
      builder: {
        profile: {
          title: "Summer Camp Counselor-in-Training",
          description:
            "Help run a summer day camp for kids ages 6 to 11. You'll lead games, help with STEM and art activities, and learn what it takes to teach and care for young people.",
          weekly: [
            "Lead a group game",
            "Help with a STEM or art activity",
            "Plan Friday's camp show with the team",
          ],
          learnEarn: "Leading groups, planning activities, CPR and First Aid",
          credentials: ["CPR / First Aid"],
          careerFields: ["education", "human_services"],
          riasec: "SEA",
          environment: { team: 5, screen: 1, structure: 3, outdoors: 4, pace: 5 },
          seats: 6,
          startDate: start,
          endDate: end,
          dailyHours: "Mon-Fri, 9:00 AM - 2:00 PM",
          address: "4410 Lorain Ave, Cleveland, OH",
          busLine: "RTA #22, stop at Lorain & W. 44th",
          niceToHave: ["Has babysat or helped with younger kids"],
        },
        questions: [
          {
            id: "B-09",
            prompt: "Have you worked with kids before (babysitting, camps, tutoring, siblings)?",
            kind: "yes_no_text",
            options: [],
          },
          {
            id: "B-07",
            prompt: "Pick the task you'd most want to do on day one.",
            kind: "choice",
            options: [
              "Lead a game",
              "Run a science activity",
              "Help with arts and crafts",
              "Plan the camp show",
            ],
          },
        ],
        requirements: [
          { key: "bci_fbi", whoPays: "explr" },
          { key: "cpr", whoPays: "explr" },
          { key: "outdoors_weather", essential: true },
          { key: "lunch_provided" },
          { key: "no_phones" },
        ],
        age: { min: 15, max: null, reason: "insurance" },
      },
    },
    {
      key: "it",
      org: "Cleveland Tech Collaborative",
      name: "IT Help Desk Intern",
      description:
        "Help teachers and staff with their technology. Set up laptops and Chromebooks, answer help tickets, and learn how a real IT team works.",
      riasec_code: "ICR",
      riasec_weights: { I: 40, C: 30, R: 20, S: 10 },
      location: "1240 Huron Rd E, Cleveland, OH",
      builder: {
        profile: {
          title: "IT Help Desk Intern",
          description:
            "Help teachers and staff with their technology. You'll set up laptops and Chromebooks, answer help tickets, and learn how a real IT team keeps a building running.",
          weekly: [
            "Set up and update laptops",
            "Answer help-desk tickets with a mentor",
            "Label and track equipment",
            "Learn one new tool each week",
          ],
          learnEarn:
            "Device setup, troubleshooting, customer service, CompTIA IT Fundamentals prep",
          credentials: ["CompTIA (A+, IT Fundamentals, etc.)"],
          careerFields: ["it"],
          riasec: "ICR",
          environment: { team: 3, screen: 5, structure: 3, outdoors: 1, pace: 3 },
          seats: 4,
          startDate: start,
          endDate: end,
          dailyHours: "Mon-Fri, 9:00 AM - 1:00 PM",
          address: "1240 Huron Rd E, Cleveland, OH",
          busLine: "RTA Red Line, Tower City station",
          niceToHave: ["Likes figuring out how computers work"],
        },
        questions: [
          {
            id: "B-02",
            prompt: "Which of these have you tried?",
            kind: "checklist_valence",
            options: [
              "Setting up a laptop or tablet",
              "Google Workspace or Microsoft 365",
              "Fixing a Wi-Fi problem",
              "Coding",
            ],
          },
          {
            id: "B-04",
            prompt: "Here's a real problem from our worksite. How would you start?",
            kind: "text",
            options: [
              "A teacher says her projector won't show her laptop screen, and class starts in 10 minutes.",
            ],
            maxWords: 150,
          },
        ],
        requirements: [{ key: "photo_id" }, { key: "confidentiality" }, { key: "ss_card" }],
        age: { min: null, max: null, reason: "" },
      },
    },
  ];
}

/** Create Theo, the listings owner, and the four demo listings if missing. Idempotent. */
export async function ensureApplicationDemo(): Promise<{ applicantId: string }> {
  const applicantId = await ensureDemoUser(DEMO.applicant.email, {
    role: "student",
    child_name: DEMO.applicant.firstName,
  });
  await must(
    sb("students").upsert({
      id: applicantId,
      first_name: DEMO.applicant.firstName,
      grade: DEMO.applicant.grade,
      date_of_birth: DEMO.applicant.dob,
      headline: "Curious about stories, people and how things work",
    }),
    "students",
  );

  // A finished interest survey this school year, so the application can reuse it.
  const y = new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const { data: sess } = await sb("assessment_sessions")
    .select("session_id")
    .eq("student_id", applicantId)
    .not("completed_at", "is", null)
    .gte("completed_at", new Date(y, 7, 1).toISOString())
    .limit(1);
  if (!sess?.length) {
    const sessionId = randomUUID();
    const now = new Date().toISOString();
    await must(
      sb("assessment_sessions").insert({
        session_id: sessionId,
        student_id: applicantId,
        form_version: "HS",
        grade_at_session: DEMO.applicant.grade,
        started_at: now,
        completed_at: now,
        item_sequence: [],
        current_index: 48,
        items_answered: 48,
        scale_scores: { R: 2.6, I: 3.5, A: 4.4, S: 4.0, E: 3.1, C: 2.4 },
        holland_code: "ASI",
      }),
      "assessment_sessions",
    );
    const liked: Record<string, number> = {
      A3: 5,
      A4: 5,
      A5: 4,
      S1: 5,
      S4: 4,
      S7: 4,
      I6: 4,
      E8: 4,
      R2: 2,
      C2: 2,
    };
    await sb("assessment_responses").insert(
      Object.entries(liked).map(([item_id, v]) => ({
        session_id: sessionId,
        student_id: applicantId,
        item_id,
        response_value: { likert: v },
        response_time_ms: 2500,
        is_practice: false,
      })),
    );
  }

  const ownerId = await ensureDemoUser(DEMO.listingsOwner.email, { role: "partner" });
  await must(
    sb("organizations").upsert({
      id: ownerId,
      name: DEMO.listingsOwner.org,
      contact_email: DEMO.listingsOwner.email,
    }),
    "organizations",
  );
  const { data: existing } = await sb("opportunities")
    .select("id, custom, application_version_id")
    .eq("org_id", ownerId);
  const byKey = new Map(
    (
      (existing ?? []) as Array<{
        id: string;
        custom: Record<string, unknown> | null;
        application_version_id: string | null;
      }>
    ).map((o) => [String(o.custom?.demo_key ?? ""), o]),
  );
  for (const l of listings()) {
    let row = byKey.get(l.key);
    if (!row) {
      const id = randomUUID();
      await must(
        sb("opportunities").insert({
          id,
          org_id: ownerId,
          org_name: l.org,
          type: "internship",
          name: l.name,
          description: l.description,
          start_date: l.builder.profile.startDate,
          end_date: l.builder.profile.endDate,
          schedule: l.builder.profile.dailyHours,
          grade_min: 9,
          grade_max: 12,
          capacity: l.builder.profile.seats,
          location: l.location,
          registration_mode: "internal",
          riasec_code: l.riasec_code,
          riasec_weights: l.riasec_weights,
          custom: { demo: true, demo_key: l.key, career_fields: l.builder.profile.careerFields },
          status: "approved",
          gate_status: "pass",
        }),
        `opportunity ${l.key}`,
      );
      row = { id, custom: { demo: true, demo_key: l.key }, application_version_id: null };
    }
    if (!row.application_version_id) await publishVersion(row.id, l.builder);
  }

  // Hide every other demo-owned listing from real students.
  const demoOwners = [ownerId];
  const partnerId = await findDemoUser(DEMO.partner.email);
  if (partnerId) demoOwners.push(partnerId);
  const { data: partnerOpps } = await sb("opportunities")
    .select("id, custom")
    .in("org_id", demoOwners);
  for (const o of (partnerOpps ?? []) as Array<{
    id: string;
    custom: Record<string, unknown> | null;
  }>) {
    if (o.custom?.demo !== true)
      await sb("opportunities")
        .update({ custom: { ...(o.custom ?? {}), demo: true } })
        .eq("id", o.id);
  }
  return { applicantId };
}

async function publishVersion(opportunityId: string, builder: ApplicationBuilder) {
  await sb("opportunities").update({ application_version_id: null }).eq("id", opportunityId);
  await sb("opp_application_versions").delete().eq("opportunity_id", opportunityId);
  const { data: v, error } = await sb("opp_application_versions")
    .insert({ opportunity_id: opportunityId, version: 1, builder })
    .select("id")
    .single();
  if (error) throw new Error(`version: ${error.message}`);
  await must(
    sb("opportunities")
      .update({ application_version_id: v.id, application_builder: builder })
      .eq("id", opportunityId),
    "opportunity version",
  );
}

/**
 * Public: put the walkthrough back to the start. Theo's application is
 * deleted (partner answers and status history go with it), the four demo
 * listings get a fresh unlocked version 1, and the demo partner's own
 * internship goes back to having no application, ready to be built live.
 */
export async function resetApplicationDemo() {
  const { applicantId } = await ensureApplicationDemo();
  await sb("hs_general_applications").delete().eq("student_id", applicantId);
  const ownerId = await findDemoUser(DEMO.listingsOwner.email);
  if (ownerId) {
    const { data: opps } = await sb("opportunities").select("id, custom").eq("org_id", ownerId);
    const defs = new Map(listings().map((l) => [l.key, l]));
    for (const o of (opps ?? []) as Array<{ id: string; custom: Record<string, unknown> | null }>) {
      const def = defs.get(String(o.custom?.demo_key ?? ""));
      if (def) await publishVersion(o.id, def.builder);
    }
  }
  const partnerId = await findDemoUser(DEMO.partner.email);
  if (partnerId) {
    const { data: opps } = await sb("opportunities")
      .select("id")
      .eq("org_id", partnerId)
      .eq("type", "internship");
    for (const o of (opps ?? []) as Array<{ id: string }>) {
      await sb("opportunities")
        .update({ application_version_id: null, application_builder: null })
        .eq("id", o.id);
      await sb("opp_application_versions").delete().eq("opportunity_id", o.id);
    }
  }
  return { ok: true };
}
