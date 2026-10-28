import { createServerFn } from "@tanstack/react-start";
import { randomBytes, randomUUID } from "node:crypto";
import {
  exploreSecretHash,
  exploreTokenHash,
  familyCodeHash as familyCodeHashRaw,
} from "./server/hash.server";
import { rateLimit } from "./server/rate-limit.server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { schoolYear } from "./checkpoints";
import { DEMO, DEMO_DOMAIN, DEMO_ROLES } from "./demo";

/**
 * Demo accounts and fake data for walkthroughs.
 *
 * One click on /demo opens the site as a grade 4-8 student, a grade 9-12
 * student, a family member, a partner organization, or an instructor —
 * no passwords. Accounts live under a reserved email domain and carry
 * `user_metadata.demo = true`; `demoLogin` refuses anything else. Seeding
 * is admin-only and idempotent; `reset` wipes and recreates everything.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabaseAdmin.from as unknown as (n: string) => any)(table);

// Same hash formulas as explore-logins.functions.ts and family.functions.ts
// (shared in ./server/hash.server).
const hashSecret = exploreSecretHash;
const normalizeFamilyCode = (code: string) =>
  code
    .toUpperCase()
    .replace(/^EXPLR[-\s]*/, "")
    .replace(/[^A-Z0-9]/g, "");
const familyCodeHash = (code: string) => familyCodeHashRaw(normalizeFamilyCode(code));

export { DEMO, DEMO_DOMAIN, DEMO_ROLES, type DemoRole } from "./demo";

type DemoUser = { id: string; email: string };

async function listDemoUsers(): Promise<DemoUser[]> {
  const out: DemoUser[] = [];
  for (let page = 1; page < 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    for (const u of data.users) {
      if (u.email?.endsWith(DEMO_DOMAIN) && u.user_metadata?.demo === true)
        out.push({ id: u.id, email: u.email });
    }
    if (data.users.length < 1000) break;
  }
  return out;
}

async function requireAdmin(userId: string) {
  const { data } = await sb("admins").select("id").eq("id", userId).maybeSingle();
  if (!data) throw new Error("Admin access required");
}

async function ensureUser(email: string, meta: Record<string, unknown>): Promise<string> {
  const existing = (await listDemoUsers()).find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: randomBytes(24).toString("base64url"),
    email_confirm: true,
    user_metadata: { demo: true, generated: true, ...meta },
  });
  if (error || !data.user) throw new Error(error?.message ?? "createUser failed");
  return data.user.id;
}

async function must(p: PromiseLike<{ error: { message: string } | null }>, what: string) {
  const { error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
}

/** Wipe every demo account and the rows that hang off them. */
async function wipe() {
  const users = await listDemoUsers();
  const ids = users.map((u) => u.id);
  if (ids.length === 0) return;
  // Rows not covered by ON DELETE CASCADE from auth.users.
  await sb("opportunities").delete().in("org_id", ids);
  await sb("classes").delete().in("educator_id", ids);
  await sb("organizations").delete().in("id", ids);
  await supabaseAdmin.from("guardians").delete().in("id", ids);
  await sb("educators").delete().in("id", ids);
  await sb("students").delete().in("id", ids);
  for (const id of ids) await supabaseAdmin.auth.admin.deleteUser(id);
}

const WBL_INTERNSHIP = {
  mentor: {
    name: "Marisol Rivera",
    title: "Supply Chain Supervisor",
    email: "m.rivera@example.org",
    phone: "216-555-0142",
    guidanceAck: true,
  },
  work: {
    positionDescription:
      "Support the pharmacy supply chain team: receive and log shipments, track inventory levels in the hospital system, and help prepare daily restock lists for three units.",
    duties: [
      "Receive and check in deliveries against purchase orders",
      "Update inventory counts in the ERP system",
      "Prepare restock carts with a pharmacy technician",
      "Shadow a buyer during weekly vendor calls",
    ],
    noDisplacementAttestation: true,
  },
  learning: {
    objectives: [
      "Explain how a hospital keeps medications in stock safely",
      "Use spreadsheet and ERP tools to track inventory",
      "Communicate clearly with clinical and non-clinical staff",
    ],
    technicalSkills: "Inventory tracking, spreadsheets, barcode scanning, basic ERP navigation",
    professionalSkills: "Punctuality, teamwork, professional communication, attention to detail",
  },
  schedule: { totalHours: "80", weeklyHours: "18", modality: "in_person" },
  compensation: {
    type: "paid",
    hourlyRate: "15.00",
    w2: true,
    primaryBeneficiaryAttestation: true,
    reimbursement: ["Transit pass"],
  },
  legal: {
    minAge: "16",
    hoursWithinLimits: true,
    hazardous: [],
    workersComp: true,
    liabilityInsurance: true,
    safetyTrainingPlan: "Day-one safety orientation, PPE walkthrough, and a weekly check-in.",
  },
  site: {
    dressCode: "Business casual; closed-toed shoes",
    vaccinations: "Flu shot (provided on site)",
    safetyEquipment: "Gloves and safety glasses provided",
    transportationNotes: "Transit pass provided; parking available for drivers.",
    accessibilityNotes: "Fully accessible building; adjustable-height workstation on request.",
    inclusiveRecruitment: true,
    other: "",
  },
  commitments: { evaluation: true, hoursConfirmation: true },
};

const GATE_PASS = {
  socCode: "29-2052 Pharmacy Technicians",
  demandCitation: "Ohio Top Jobs List 2026 · Northeast Ohio regional demand analysis",
  entryWage: "$19.40/hr",
  wageSource: "OhioMeansJobs wage data, 2026",
  progressionExample:
    "Pharmacy technician → certified technician → pharmacy buyer / supply chain lead",
  realWorkReviewed: true,
  note: "Reviewed by EXPLR staff for the demo.",
};

/** Admin: create (or recreate) the demo accounts and their fake data. */
export const seedDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ reset: z.boolean().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    if (data.reset) await wipe();

    const now = new Date();
    const iso = (d: Date) => d.toISOString();
    const daysAgo = (n: number) => iso(new Date(now.getTime() - n * 86400000));
    const sy = schoolYear(now);

    // ── accounts ────────────────────────────────────────────────────────
    const instructorId = await ensureUser(DEMO.instructor.email, { role: "instructor" });
    const partnerId = await ensureUser(DEMO.partner.email, { role: "partner" });
    const studentId = await ensureUser(DEMO.student.email, {
      role: "student",
      child_name: DEMO.student.firstName,
    });
    const explorerId = await ensureUser(DEMO.explorer.email, {
      role: "explorer",
      child_name: DEMO.explorer.firstName,
    });

    await must(
      sb("educators").upsert({
        id: instructorId,
        full_name: DEMO.instructor.name,
        email: DEMO.instructor.email,
        organization: "Lakeshore City Schools",
        program_type: "camp",
        approved: true,
        school_name: "Lakeshore High School",
        student_count: 2,
        grade_levels: [6, 11],
      }),
      "educators",
    );
    await must(
      sb("organizations").upsert({
        id: partnerId,
        name: DEMO.partner.org,
        contact_name: "Marisol Rivera",
        contact_email: DEMO.partner.email,
        website: "https://example.org/lakeshore-health",
      }),
      "organizations",
    );
    await must(
      sb("students").upsert([
        {
          id: studentId,
          first_name: DEMO.student.firstName,
          grade: DEMO.student.grade,
          date_of_birth: DEMO.student.dob,
          headline: "Future pharmacist · hospital supply chain intern",
          about_me:
            "I like figuring out how systems work and helping people get what they need. This summer I learned how a hospital keeps medications in stock, and I want to study pharmacy.",
        },
        {
          id: explorerId,
          first_name: DEMO.explorer.firstName,
          grade: DEMO.explorer.grade,
          date_of_birth: DEMO.explorer.dob,
          headline: "Robot builder and animal expert",
          about_me:
            "I love animals and building things. At robotics camp my team built a rover that could carry a water bottle!",
        },
      ]),
      "students",
    );

    // ── classes + picture login ─────────────────────────────────────────
    const classes = [
      {
        name: "Pathways Explorers · Grade 6",
        grade: 6,
        period: "Period 2",
        join_code: DEMO.classCodes.explorer,
        student: explorerId,
      },
      {
        name: "Career Pathways · Grade 11",
        grade: 11,
        period: "Period 5",
        join_code: DEMO.classCodes.student,
        student: studentId,
      },
    ];
    for (const c of classes) {
      const { data: existing } = await sb("classes")
        .select("id")
        .eq("join_code", c.join_code)
        .maybeSingle();
      let classId = (existing as { id: string } | null)?.id;
      if (!classId) {
        const { data: ins, error } = await sb("classes")
          .insert({
            name: c.name,
            educator_id: instructorId,
            grade: c.grade,
            period: c.period,
            created_by: instructorId,
            join_code: c.join_code,
          })
          .select("id")
          .single();
        if (error || !ins) throw new Error(`classes: ${error?.message}`);
        classId = (ins as { id: string }).id;
      }
      await sb("class_students").delete().eq("class_id", classId).eq("student_id", c.student);
      await must(
        sb("class_students").insert({ class_id: classId, student_id: c.student }),
        "class_students",
      );
    }
    {
      const { data: prior } = await sb("explore_logins")
        .select("id")
        .eq("student_id", explorerId)
        .maybeSingle();
      let loginId = (prior as { id: string } | null)?.id;
      if (!loginId) {
        const { data: ins, error } = await sb("explore_logins")
          .insert({
            student_id: explorerId,
            avatar_shape: "star",
            avatar_color: "mint",
            secret_hash: "pending",
            token_hash: exploreTokenHash(DEMO.exploreCardToken),
            created_by: context.userId,
          })
          .select("id")
          .single();
        if (error || !ins) throw new Error(`explore_logins: ${error?.message}`);
        loginId = (ins as { id: string }).id;
      }
      await must(
        sb("explore_logins")
          .update({
            avatar_shape: "star",
            avatar_color: "mint",
            secret_hash: hashSecret(loginId, DEMO.exploreSecret),
            token_hash: exploreTokenHash(DEMO.exploreCardToken),
            failed_attempts: 0,
            locked_until: null,
          })
          .eq("id", loginId),
        "explore_logins",
      );
    }

    // ── family codes ────────────────────────────────────────────────────
    for (const [sid, code] of [
      [studentId, DEMO.familyCodes.student],
      [explorerId, DEMO.familyCodes.explorer],
    ] as const) {
      await sb("family_links").delete().eq("student_id", sid);
      await must(
        sb("family_links").insert({
          student_id: sid,
          code_hash: familyCodeHash(code),
          label: "Demo family",
          expires_at: iso(new Date(now.getTime() + 365 * 86400000)),
        }),
        "family_links",
      );
    }

    // ── guardian account (one account, two children) ────────────────────
    const guardianId = await ensureUser(DEMO.family.email, { full_name: DEMO.family.name });
    await must(
      supabaseAdmin.from("guardians").upsert({
        id: guardianId,
        full_name: DEMO.family.name,
        email: DEMO.family.email,
      }),
      "guardians",
    );
    for (const sid of [studentId, explorerId]) {
      await must(
        supabaseAdmin.from("guardian_students").upsert({
          guardian_id: guardianId,
          student_id: sid,
          relationship: "parent",
          revoked_at: null,
          revoked_by: null,
        }),
        "guardian_students",
      );
      await supabaseAdmin
        .from("guardian_consents")
        .delete()
        .eq("guardian_id", guardianId)
        .eq("student_id", sid);
      await must(
        supabaseAdmin.from("guardian_consents").insert({
          guardian_id: guardianId,
          student_id: sid,
          text_version: "2026-10",
        }),
        "guardian_consents",
      );
    }

    // ── partner opportunities ───────────────────────────────────────────
    await sb("opportunities").delete().eq("org_id", partnerId);
    const internshipId = randomUUID();
    const campId = randomUUID();
    await must(
      sb("opportunities").insert([
        {
          id: internshipId,
          org_id: partnerId,
          org_name: DEMO.partner.org,
          type: "internship",
          name: "Supply Chain & Pharmacy Operations Intern",
          description:
            "Spend eight weeks with the hospital supply chain team learning how medications and supplies get to every unit on time. Interns rotate between receiving, inventory, and the pharmacy restock crew.",
          start_date: `${now.getFullYear() + 1}-06-14`,
          end_date: `${now.getFullYear() + 1}-08-06`,
          schedule: "Mon, Wed, Fri · 9:00 AM–3:00 PM",
          schedule_json: { days: ["Mon", "Wed", "Fri"], start: "09:00", end: "15:00" },
          grade_min: 10,
          grade_max: 12,
          is_free: true,
          capacity: 4,
          location: "Lakeshore Health Partners · Cleveland, OH",
          registration_mode: "internal",
          riasec_code: "ICS",
          riasec_weights: {
            building: 5,
            investigating: 35,
            designing: 5,
            helping: 20,
            leading: 5,
            organizing: 30,
          },
          requirements: [
            "Closed-toed shoes required",
            "Background check required",
            "Transportation provided",
          ],
          application_links: [],
          custom: { demo: true },
          stage: "participation",
          experience_type: "internship_offsite_placement",
          wbl: WBL_INTERNSHIP,
          target_competencies: [
            "Teamwork/Collaboration",
            "Oral and Written Communications",
            "Digital Technology",
          ],
          gate_status: "pass",
          gate_evidence: GATE_PASS,
          status: "approved",
          submitted_at: daysAgo(40),
          decided_at: daysAgo(35),
        },
        {
          id: campId,
          org_id: partnerId,
          org_name: DEMO.partner.org,
          type: "camp",
          name: "BioMed Explorers Camp",
          description:
            "A one-week summer camp for grades 4-8: suture practice on models, a tour of the lab, and a design challenge with real hospital engineers.",
          start_date: `${now.getFullYear() + 1}-06-22`,
          end_date: `${now.getFullYear() + 1}-06-26`,
          schedule: "Mon–Fri · 9:00 AM–1:00 PM",
          schedule_json: {
            days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            start: "09:00",
            end: "13:00",
          },
          grade_min: 4,
          grade_max: 8,
          is_free: true,
          capacity: 24,
          location: "Lakeshore Health Partners · Cleveland, OH",
          registration_mode: "internal",
          riasec_code: "IRS",
          riasec_weights: {
            building: 30,
            investigating: 40,
            designing: 10,
            helping: 20,
            leading: 0,
            organizing: 0,
          },
          requirements: ["Lunch provided", "Closed-toed shoes required"],
          application_links: [],
          custom: { demo: true },
          stage: "exploration",
          experience_type: "camp_or_program",
          wbl: {
            site: {
              transportationNotes: "Drop-off at the main lobby; bus line 22 stops outside.",
              dressCode: "Camp t-shirt (provided)",
            },
            schedule: { modality: "in_person", totalHours: "20" },
          },
          target_competencies: ["Critical Thinking/Problem-Solving", "Teamwork/Collaboration"],
          gate_status: "pass",
          gate_evidence: { ...GATE_PASS, note: "Exploration-stage camp." },
          status: "approved",
          submitted_at: daysAgo(60),
          decided_at: daysAgo(58),
        },
        {
          id: randomUUID(),
          org_id: partnerId,
          org_name: DEMO.partner.org,
          type: "workshop",
          name: "Hospital Career Day",
          description:
            "A half-day of speakers and hands-on stations: nursing, imaging, pharmacy, facilities, and IT. Open to any grade.",
          start_date: `${now.getFullYear() + 1}-03-12`,
          end_date: `${now.getFullYear() + 1}-03-12`,
          schedule: "Thu · 9:00 AM–12:30 PM",
          schedule_json: { days: ["Thu"], start: "09:00", end: "12:30" },
          grade_min: 6,
          grade_max: 12,
          is_free: true,
          capacity: 120,
          location: "Lakeshore Health Partners · Cleveland, OH",
          registration_mode: "internal",
          riasec_code: "SIR",
          riasec_weights: {
            building: 15,
            investigating: 30,
            designing: 5,
            helping: 40,
            leading: 5,
            organizing: 5,
          },
          requirements: ["Casual dress"],
          application_links: [],
          custom: { demo: true },
          stage: "awareness",
          experience_type: "career_day_speaker_fair",
          wbl: { site: { transportationNotes: "School buses welcome; drop-off at Door C." } },
          target_competencies: [],
          gate_status: "pending",
          gate_evidence: null,
          status: "submitted",
          submitted_at: daysAgo(2),
          decided_at: null,
        },
      ]),
      "opportunities",
    );
    await sb("opportunity_registrations").delete().eq("opportunity_id", campId);
    await must(
      sb("opportunity_registrations").insert({
        opportunity_id: campId,
        student_id: explorerId,
        contact_name: "Jordan Lee",
        contact_email: "family@example.org",
        note: "Mia is excited about the lab tour!",
      }),
      "opportunity_registrations",
    );

    // ── RIASEC assessments ──────────────────────────────────────────────
    await sb("assessment_sessions").delete().in("student_id", [studentId, explorerId]);
    await must(
      sb("assessment_sessions").insert([
        {
          student_id: studentId,
          form_version: "HS",
          grade_at_session: 11,
          started_at: daysAgo(120),
          completed_at: daysAgo(120),
          item_sequence: [],
          current_index: 32,
          items_answered: 32,
          scale_scores: { R: 2.1, I: 4.4, A: 2.8, S: 3.9, E: 2.5, C: 3.7 },
          holland_code: "ISC",
        },
        {
          student_id: explorerId,
          form_version: "MS",
          grade_at_session: 6,
          started_at: daysAgo(30),
          completed_at: daysAgo(30),
          item_sequence: [],
          current_index: 32,
          items_answered: 32,
          scale_scores: { R: 3.8, I: 3.9, A: 3.4, S: 2.6, E: 2.0, C: 2.2 },
          holland_code: "IRA",
        },
      ]),
      "assessment_sessions",
    );

    // ── experiences, ratings, credentials, pieces ───────────────────────
    await sb("experiences").delete().in("student_id", [studentId, explorerId]);
    const internshipExpId = randomUUID();
    const campExpId = randomUUID();
    await must(
      // Multi-row inserts through PostgREST send null for any key missing on a
      // row, which skips column defaults — so every row carries its own id.
      sb("experiences").insert([
        {
          id: internshipExpId,
          student_id: studentId,
          source: "library",
          opportunity_id: internshipId,
          title: "Supply Chain & Pharmacy Operations Intern",
          organization: DEMO.partner.org,
          role_title: "Intern",
          stage: "participation",
          experience_type: "internship_offsite_placement",
          career_cluster: "health",
          riasec_module: "C",
          start_date: `${now.getFullYear()}-06-15`,
          end_date: `${now.getFullYear()}-08-07`,
          hours: 80,
          compensation_type: "paid",
          duties:
            "Checked in deliveries, updated inventory counts in the ERP system, prepared restock carts with the pharmacy technicians, and shadowed the buyer on vendor calls.",
          reflection:
            "I didn't expect to like the inventory work this much. Seeing how one missed count can affect a whole floor made me careful and curious. I want to study pharmacy and maybe health administration.",
          supervisor_name: "Marisol Rivera",
          supervisor_email: "m.rivera@example.org",
          status: "verified",
          verified_at: daysAgo(50),
          verified_hours: 78,
          attestation: {
            name: "Marisol Rivera",
            title: "Supply Chain Supervisor",
            email: "m.rivera@example.org",
            timestamp: daysAgo(50),
            method: "unique_link_email",
            terms_accepted: true,
            comment:
              "Amara was dependable, asked great questions, and caught two inventory errors that would have been missed.",
            setting: "work",
          },
        },
        {
          id: randomUUID(),
          student_id: studentId,
          source: "external",
          title: "Pharmacy job shadow",
          organization: "Lakeshore Health Partners",
          role_title: "Job shadow",
          stage: "exploration",
          experience_type: "job_shadow",
          career_cluster: "health",
          riasec_module: "I",
          start_date: `${now.getFullYear()}-03-20`,
          end_date: `${now.getFullYear()}-03-20`,
          hours: 6,
          compensation_type: "unpaid",
          duties:
            "Followed a pharmacist through a morning shift, including order verification and counseling.",
          reflection: "I liked how much problem-solving happens behind the counter.",
          supervisor_name: "Dr. Chen",
          supervisor_email: "chen@example.org",
          status: "pending_supervisor",
        },
        {
          id: randomUUID(),
          student_id: studentId,
          source: "external",
          title: "Hospital Career Day",
          organization: "Lakeshore Health Partners",
          stage: "awareness",
          experience_type: "career_day_speaker_fair",
          career_cluster: "health",
          start_date: `${now.getFullYear() - 1}-03-14`,
          end_date: `${now.getFullYear() - 1}-03-14`,
          hours: 3,
          compensation_type: "unpaid",
          duties: "Visited stations for nursing, imaging, pharmacy, and IT.",
          status: "self_reported",
        },
        {
          id: campExpId,
          student_id: explorerId,
          source: "library",
          opportunity_id: campId,
          title: "EXPLR Robotics Camp",
          organization: "EXPLR",
          stage: "exploration",
          experience_type: "camp_or_program",
          career_cluster: "manufacturing",
          riasec_module: "R",
          start_date: `${now.getFullYear()}-07-13`,
          end_date: `${now.getFullYear()}-07-17`,
          hours: 25,
          compensation_type: "unpaid",
          duties: "Built and programmed a rover with a team of four; presented it on the last day.",
          reflection:
            "My favorite part was when our rover finally carried the water bottle across the room.",
          supervisor_name: DEMO.instructor.name,
          supervisor_email: DEMO.instructor.email,
          status: "verified",
          verified_at: daysAgo(80),
          verified_hours: 25,
          attestation: {
            name: DEMO.instructor.name,
            title: "Camp instructor",
            email: DEMO.instructor.email,
            timestamp: daysAgo(80),
            method: "instructor",
            terms_accepted: true,
            comment: "Mia led her team's build and helped two classmates debug their code.",
            setting: "school",
          },
        },
        {
          id: randomUUID(),
          student_id: explorerId,
          source: "external",
          title: "Interview with a veterinarian",
          organization: "Lakeshore Animal Clinic",
          stage: "exploration",
          experience_type: "informational_interview",
          career_cluster: "agriculture",
          riasec_module: "I",
          start_date: `${now.getFullYear()}-10-02`,
          end_date: `${now.getFullYear()}-10-02`,
          hours: 1,
          compensation_type: "unpaid",
          duties: "Asked Dr. Patel ten questions about her job and what she studied.",
          reflection: "Vets need a lot of science classes. I want to take more science.",
          status: "self_reported",
        },
        {
          id: randomUUID(),
          student_id: explorerId,
          source: "external",
          title: "Zoo career day",
          organization: "Cleveland Metroparks Zoo",
          stage: "awareness",
          experience_type: "career_day_speaker_fair",
          career_cluster: "agriculture",
          start_date: `${now.getFullYear()}-04-18`,
          end_date: `${now.getFullYear()}-04-18`,
          hours: 2,
          compensation_type: "unpaid",
          duties: "Met zookeepers and a wildlife vet; saw how they weigh a tortoise.",
          status: "self_reported",
        },
      ]),
      "experiences",
    );
    await must(
      sb("experience_ratings").insert(
        [
          ["teamwork", "Teamwork/Collaboration", 4, "Worked smoothly with technicians and buyers."],
          ["communication", "Oral and Written Communications", 3, "Clear daily hand-off notes."],
          [
            "critical_thinking",
            "Critical Thinking/Problem-Solving",
            4,
            "Caught two inventory errors on her own.",
          ],
          ["technology", "Digital Technology", 3, "Picked up the ERP system in a week."],
          ["professionalism", "Professionalism/Work Ethic", 4, "Never late; always prepared."],
          ["career_management", "Career Management", 3, null],
        ].map(([competency, omj_skill, rating_final, comment]) => ({
          experience_id: internshipExpId,
          competency,
          omj_skill,
          rating_baseline: 2,
          rating_final,
          setting: "work",
          rater_name: "Marisol Rivera",
          rater_email: "m.rivera@example.org",
          comment,
          rated_at: daysAgo(50),
        })),
      ),
      "experience_ratings",
    );
    await must(
      sb("experience_ratings").insert([
        {
          experience_id: campExpId,
          competency: "teamwork",
          omj_skill: "Teamwork/Collaboration",
          rating_final: 3,
          setting: "school",
          rater_name: DEMO.instructor.name,
          rater_email: DEMO.instructor.email,
          comment: "Led her team's build.",
          rated_at: daysAgo(80),
        },
        {
          experience_id: campExpId,
          competency: "critical_thinking",
          omj_skill: "Critical Thinking/Problem-Solving",
          rating_final: 3,
          setting: "school",
          rater_name: DEMO.instructor.name,
          rater_email: DEMO.instructor.email,
          comment: null,
          rated_at: daysAgo(80),
        },
      ]),
      "experience_ratings",
    );
    await sb("credentials").delete().in("student_id", [studentId, explorerId]);
    await must(
      sb("credentials").insert([
        {
          student_id: studentId,
          type: "industry_recognized_credential",
          title: "OSHA 10-Hour General Industry",
          issuer: "OSHA",
          issued_at: `${now.getFullYear()}-06-20`,
          evidence_url: "https://example.org/osha-10-card/amara",
          verification_method: "self_reported",
        },
        {
          student_id: studentId,
          type: "dual_credit_ccp",
          title: "Introduction to Health Careers (CCP)",
          issuer: "Cuyahoga Community College",
          issued_at: `${now.getFullYear()}-05-30`,
          credits: 3,
          evidence_url: "https://example.org/tri-c-transcript/amara",
          verification_method: "self_reported",
        },
        {
          student_id: explorerId,
          type: "badge",
          title: "Scratch Coding Sticker",
          issuer: "EXPLR Robotics Camp",
          issued_at: `${now.getFullYear()}-07-17`,
          evidence_url: "https://example.org/explr-camp-badges/mia",
          verification_method: "self_reported",
        },
      ]),
      "credentials",
    );
    await sb("portfolio_pieces").delete().in("student_id", [studentId, explorerId]);
    await must(
      sb("portfolio_pieces").insert([
        {
          student_id: studentId,
          title: "Inventory tracking dashboard",
          context: "Built during my internship to show daily stock levels for three units.",
          artifact_type: "link",
          url: "https://example.org/amara-dashboard",
          media_consent: true,
          competency_tags: ["technology", "critical_thinking"],
          reflection: "I learned that a simple chart can save a nurse ten minutes a day.",
          experience_id: internshipExpId,
          visibility: "family",
        },
        {
          student_id: explorerId,
          title: "Our rover design",
          context: "Team sketch and final photo from robotics camp.",
          artifact_type: "link",
          url: "https://example.org/mia-rover",
          media_consent: true,
          competency_tags: ["teamwork"],
          reflection: "We changed the wheels twice before it worked.",
          experience_id: campExpId,
          visibility: "family",
        },
      ]),
      "portfolio_pieces",
    );

    // ── career goals, checkpoints, approvals ────────────────────────────
    await sb("career_goals").delete().in("student_id", [studentId, explorerId]);
    await must(
      sb("career_goals").insert([
        {
          student_id: studentId,
          grade: 11,
          primary_goal: "Pharmacist",
          secondary_goal: "Health systems analyst",
          cluster: "health",
          post_hs_plan: "four_year",
          changed_since_last: false,
          why: "My internship showed me how pharmacy connects science with helping people directly.",
        },
        {
          student_id: explorerId,
          grade: 6,
          primary_goal: "Veterinarian",
          secondary_goal: "Robotics engineer",
          cluster: "agriculture",
          post_hs_plan: "undecided",
          changed_since_last: true,
          why: "I like animals and building things, so maybe both!",
        },
      ]),
      "career_goals",
    );
    await sb("checkpoints").delete().in("student_id", [studentId, explorerId]);
    const { data: cps, error: cpErr } = await sb("checkpoints")
      .insert([
        {
          student_id: studentId,
          school_year: sy,
          term: "fall",
          grade: 11,
          status: "submitted",
          submitted_at: daysAgo(3),
        },
        {
          student_id: studentId,
          school_year: sy,
          term: "spring",
          grade: 11,
          status: "open",
          submitted_at: null,
        },
        {
          student_id: explorerId,
          school_year: sy,
          term: "fall",
          grade: 6,
          status: "open",
          submitted_at: null,
        },
        {
          student_id: explorerId,
          school_year: sy,
          term: "spring",
          grade: 6,
          status: "open",
          submitted_at: null,
        },
      ])
      .select("id, student_id, term");
    if (cpErr) throw new Error(`checkpoints: ${cpErr.message}`);
    const fall11 = (cps as Array<{ id: string; student_id: string; term: string }>).find(
      (c) => c.student_id === studentId && c.term === "fall",
    );
    if (fall11) {
      await must(
        sb("checkpoint_tasks").insert(
          ["career_profile", "work_values", "career_goal", "exploration_log", "resume_update"].map(
            (task_key) => ({
              checkpoint_id: fall11.id,
              task_key,
              required: true,
              status: "done",
              completed_at: daysAgo(4),
            }),
          ),
        ),
        "checkpoint_tasks",
      );
    }
    await sb("plan_approvals").delete().in("student_id", [studentId, explorerId]);
    await must(
      sb("plan_approvals").insert({
        student_id: studentId,
        school_year: sy,
        student_ack_at: daysAgo(3),
        method: "demo",
      }),
      "plan_approvals",
    );

    // ── internship application (matching tool + partner applicants) ─────
    await must(
      sb("internship_profiles").upsert({
        student_id: studentId,
        high_school: "Lakeshore High School",
        grad_year: now.getFullYear() + 2,
        career_aspiration: "Pharmacist or health systems analyst",
        intended_major: "Pharmaceutical sciences",
        intended_college: "Ohio State or Cleveland State",
        likes: "Organized work, solving problems, helping people get what they need",
        dislikes: "Standing around with nothing to do",
        coursework: [
          { subject: "Science", course: "Chemistry", grade_level: 10, relevance: "medications" },
          {
            subject: "Math",
            course: "Algebra II",
            grade_level: 11,
            relevance: "inventory math and dosing",
          },
        ],
        availability: {
          summer: true,
          school_year: false,
          days: ["Mon", "Tue", "Wed", "Fri"],
          earliest: "08:00",
          latest: "16:00",
        },
        transportation: "transit",
        work_authorization: true,
        demographics: {},
      }),
      "internship_profiles",
    );
    await sb("internship_selections").delete().eq("student_id", studentId);
    await must(
      sb("internship_selections").insert({
        student_id: studentId,
        internship_ref: `opp:${internshipId}`,
        opportunity_id: internshipId,
        status: "submitted",
        submitted_at: daysAgo(5),
        rank: 1,
        acknowledgments: [
          "Closed-toed shoes required",
          "Background check required",
          "Transportation provided",
        ],
        answers: { why: "I already spent a summer with this team and want to go deeper." },
      }),
      "internship_selections",
    );

    const { ensureApplicationDemo } = await import("./demo-application.server");
    await ensureApplicationDemo();

    return {
      ok: true,
      ids: { instructorId, partnerId, studentId, explorerId, internshipId, campId },
    };
  });

/** Public: is the demo seeded? */
export const demoStatus = createServerFn({ method: "POST" }).handler(async () => {
  await rateLimit("demo", 30, 600);
  try {
    const users = await listDemoUsers();
    return { seeded: users.length >= 4 };
  } catch {
    return { seeded: false };
  }
});

/**
 * Public: open the site as a demo role. Students/instructor/partner get a
 * one-time magic-link token (exchanged with verifyOtp in the browser);
 * family gets a family-session token for the demo student.
 */
export const demoLogin = createServerFn({ method: "POST" })
  .validator((input) => z.object({ role: z.enum(DEMO_ROLES) }).parse(input))
  .handler(async ({ data }) => {
    await rateLimit("demo", 30, 600);
    if (data.role === "applicant") {
      const { ensureApplicationDemo } = await import("./demo-application.server");
      await ensureApplicationDemo();
    }
    const email = DEMO[data.role].email;
    const user = (await listDemoUsers()).find((u) => u.email === email);
    if (!user) throw new Error("The demo isn't seeded yet. Ask an EXPLR admin to seed it.");
    const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (error || !linkData.properties?.hashed_token)
      throw new Error(error?.message ?? "Could not start the demo session");
    const to =
      data.role === "instructor"
        ? "/instructor/dashboard"
        : data.role === "family"
          ? "/family/home"
          : data.role === "partner"
            ? "/org"
            : data.role === "applicant"
              ? "/student/apply"
              : "/student";
    return { kind: "magic" as const, tokenHash: linkData.properties.hashed_token, to };
  });
