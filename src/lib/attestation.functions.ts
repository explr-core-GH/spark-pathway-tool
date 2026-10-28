import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "node:crypto";
import { attestationTokenHash } from "./server/hash.server";
import { getPublicOrigin } from "./server/origin.server";
import { rateLimit } from "./server/rate-limit.server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { OMJ_SKILLS, COMPETENCIES } from "@/lib/competencies";

/**
 * Supervisor attestation (the stamp).
 *
 * Handshake pattern: the student names the supervisor, the system emails
 * one link, the supervisor confirms hours and duties and rates the skills
 * they watched on the four-level scale. No account, one form. On submit the
 * experience becomes `verified` and freezes; the student can't edit the
 * verification fields (database trigger), and editing the substance clears
 * the stamp until it's re-attested.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabaseAdmin.from as unknown as (n: string) => any)(table);

const hashToken = attestationTokenHash;
const MAX_REQUESTS_PER_DAY = 5;

const skillToCompetency = new Map<string, string>();
for (const c of COMPETENCIES) for (const s of c.omjSkills) skillToCompetency.set(s, c.key);

type ExperienceRow = {
  id: string;
  student_id: string;
  title: string;
  organization: string | null;
  role_title: string | null;
  experience_type: string;
  stage: string;
  start_date: string | null;
  end_date: string | null;
  hours: number | null;
  duties: string | null;
  status: string;
  supervisor_name: string | null;
  supervisor_email: string | null;
};

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ sent: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, error: "Email is not configured (RESEND_API_KEY)" };
  const from = process.env.RESEND_FROM ?? "EXPLR Pathways <noreply@explrpathways.org>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok)
      return { sent: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** Student: ask the named supervisor to stamp an experience. The link only goes out by email. */
export const requestAttestation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        experienceId: z.string().uuid(),
        supervisorName: z.string().trim().min(1).max(120),
        supervisorEmail: z.string().trim().email().max(160),
        // Ignored: links are built from the server's own host. Kept so old callers don't break.
        origin: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true; sent: boolean; error?: string }> => {
    await rateLimit("requestAttestation", 10, 600);
    const claimsEmail = (context.claims as { email?: string } | undefined)?.email;
    const ownEmail =
      claimsEmail ?? (await supabaseAdmin.auth.admin.getUserById(context.userId)).data.user?.email;
    if (ownEmail && ownEmail.trim().toLowerCase() === data.supervisorEmail.toLowerCase())
      throw new Error(
        "That's your own email. Enter the email of the supervisor who saw your work.",
      );
    const { count: recent } = await sb("attestation_requests")
      .select("id", { count: "exact", head: true })
      .eq("student_id", context.userId)
      .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString());
    if ((recent ?? 0) >= MAX_REQUESTS_PER_DAY)
      throw new Error("You've sent the most requests allowed today. Try again tomorrow.");
    const { data: exp } = await sb("experiences")
      .select("*")
      .eq("id", data.experienceId)
      .eq("student_id", context.userId)
      .maybeSingle();
    const e = exp as ExperienceRow | null;
    if (!e) throw new Error("Experience not found");
    if (e.status === "verified") throw new Error("This experience is already stamped");
    if (e.stage === "awareness" || e.stage === "exploration")
      throw new Error("Exposure items don't get stamped; they're stickers");
    const { data: student } = await sb("students")
      .select("first_name")
      .eq("id", context.userId)
      .maybeSingle();
    const firstName = (student as { first_name: string | null } | null)?.first_name ?? "A student";

    // One live request per experience: expire older pending ones.
    await sb("attestation_requests")
      .update({ status: "expired" })
      .eq("experience_id", e.id)
      .eq("status", "pending");

    const token = randomBytes(24).toString("base64url");
    const { data: req, error } = await sb("attestation_requests")
      .insert({
        experience_id: e.id,
        student_id: context.userId,
        token_hash: hashToken(token),
        supervisor_name: data.supervisorName,
        supervisor_email: data.supervisorEmail,
      })
      .select("id")
      .single();
    if (error || !req) throw new Error(error?.message ?? "Could not create request");
    await sb("experiences")
      .update({
        status: "pending_supervisor",
        supervisor_name: data.supervisorName,
        supervisor_email: data.supervisorEmail,
      })
      .eq("id", e.id);

    const link = `${getPublicOrigin()}/stamp/${token}`;
    const subject = `${firstName} asked you to verify an experience on EXPLR Pathways`;
    const html = `
      <p>Hi ${escapeHtml(data.supervisorName)},</p>
      <p>${escapeHtml(firstName)} listed <strong>${escapeHtml(e.title)}</strong>${e.organization ? ` at ${escapeHtml(e.organization)}` : ""} on their EXPLR Pathways passport and named you as the supervisor who saw the work.</p>
      <p>It takes about three minutes: confirm the hours and duties, then rate the skills you watched on a four-level scale. No account needed.</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#19201F;color:#fff;border-radius:10px;text-decoration:none">Review and stamp</a></p>
      <p style="color:#646E6A;font-size:13px">Or paste this link: ${link}<br>This link expires in 30 days. If you didn't supervise this student, you can decline on the same page.</p>
      <p style="color:#646E6A;font-size:13px">EXPLR Pathways · From Classrooms to Careers – Pathways Start Here</p>`;
    const mail = await sendEmail(data.supervisorEmail, subject, html);
    await sb("attestation_requests")
      .update({
        sent_at: mail.sent ? new Date().toISOString() : null,
        email_error: mail.error ?? null,
      })
      .eq("id", (req as { id: string }).id);
    return mail.error ? { ok: true, sent: mail.sent, error: mail.error } : { ok: true, sent: mail.sent };
  });

export type AttestationView = {
  studentFirstName: string;
  supervisorName: string;
  experience: Pick<
    ExperienceRow,
    | "title"
    | "organization"
    | "role_title"
    | "experience_type"
    | "start_date"
    | "end_date"
    | "hours"
    | "duties"
  >;
  skills: string[];
  status: string;
  expiresAt: string;
};

/** Supervisor: load the request behind a link. */
export const getAttestation = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().min(16).max(64) }).parse(input))
  .handler(async ({ data }): Promise<AttestationView> => {
    const { data: req } = await sb("attestation_requests")
      .select("id, status, expires_at, supervisor_name, experience_id, student_id, opened_at")
      .eq("token_hash", hashToken(data.token))
      .maybeSingle();
    const r = req as {
      id: string;
      status: string;
      expires_at: string;
      supervisor_name: string;
      experience_id: string;
      student_id: string;
      opened_at: string | null;
    } | null;
    if (!r) throw new Error("This link isn't valid. Ask the student to send a new one.");
    if (r.status === "pending" && new Date(r.expires_at) < new Date()) {
      await sb("attestation_requests").update({ status: "expired" }).eq("id", r.id);
      throw new Error("This link has expired. Ask the student to send a new one.");
    }
    if (!r.opened_at)
      await sb("attestation_requests")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", r.id);
    const [{ data: exp }, { data: student }] = await Promise.all([
      sb("experiences")
        .select(
          "title, organization, role_title, experience_type, start_date, end_date, hours, duties",
        )
        .eq("id", r.experience_id)
        .maybeSingle(),
      sb("students").select("first_name").eq("id", r.student_id).maybeSingle(),
    ]);
    if (!exp) throw new Error("The experience behind this link was removed.");
    return {
      studentFirstName:
        (student as { first_name: string | null } | null)?.first_name ?? "The student",
      supervisorName: r.supervisor_name,
      experience: {
        ...(exp as AttestationView["experience"]),
        hours: exp.hours === null ? null : Number(exp.hours),
      },
      skills: OMJ_SKILLS,
      status: r.status,
      expiresAt: r.expires_at,
    };
  });

const Rating = z.object({
  skill: z.string().refine((s) => OMJ_SKILLS.includes(s), "Unknown skill"),
  final: z.number().int().min(1).max(4),
  baseline: z.number().int().min(1).max(4).nullable().optional(),
  comment: z.string().trim().max(600).optional(),
});

/** Supervisor: stamp it. Writes ratings, freezes the experience as verified. */
export const submitAttestation = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().min(16).max(64),
        hours: z.number().min(0).max(5000),
        dutiesConfirmed: z.literal(true),
        setting: z.enum(["school", "work", "community"]),
        ratings: z.array(Rating).min(1).max(15),
        comment: z.string().trim().max(1000).optional(),
        name: z.string().trim().min(1).max(120),
        title: z.string().trim().max(120).optional(),
        termsAccepted: z.literal(true),
      })
      .superRefine((v, ctx) => {
        for (const r of v.ratings) {
          if (r.final <= 2 && !(r.comment && r.comment.length >= 10)) {
            ctx.addIssue({
              code: "custom",
              message: `Add a short comment for ${r.skill} (ratings of 1 or 2 need one)`,
            });
          }
        }
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: req } = await sb("attestation_requests")
      .select("id, status, expires_at, supervisor_email, experience_id")
      .eq("token_hash", hashToken(data.token))
      .maybeSingle();
    const r = req as {
      id: string;
      status: string;
      expires_at: string;
      supervisor_email: string;
      experience_id: string;
    } | null;
    if (!r) throw new Error("This link isn't valid.");
    if (r.status !== "pending") throw new Error("This request was already answered.");
    if (new Date(r.expires_at) < new Date()) throw new Error("This link has expired.");

    const now = new Date().toISOString();
    const rows = data.ratings.map((rt) => ({
      experience_id: r.experience_id,
      competency: skillToCompetency.get(rt.skill) ?? "professionalism",
      omj_skill: rt.skill,
      rating_baseline: rt.baseline ?? null,
      rating_final: rt.final,
      setting: data.setting,
      rater_name: data.name,
      rater_email: r.supervisor_email,
      comment: rt.comment || null,
      rated_at: now,
    }));
    // Replace any prior ratings for this experience (a re-attestation).
    await sb("experience_ratings").delete().eq("experience_id", r.experience_id);
    const { error: rErr } = await sb("experience_ratings").insert(rows);
    if (rErr) throw new Error(rErr.message);
    const { error: eErr } = await sb("experiences")
      .update({
        status: "verified",
        verified_at: now,
        verified_hours: data.hours,
        attestation: {
          name: data.name,
          title: data.title ?? null,
          email: r.supervisor_email,
          timestamp: now,
          method: "unique_link_email",
          terms_accepted: true,
          comment: data.comment ?? null,
          setting: data.setting,
        },
      })
      .eq("id", r.experience_id);
    if (eErr) throw new Error(eErr.message);
    await sb("attestation_requests")
      .update({ status: "completed", completed_at: now })
      .eq("id", r.id);
    return { ok: true };
  });

/** Supervisor: I didn't supervise this, or it's not accurate. */
export const declineAttestation = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ token: z.string().min(16).max(64), reason: z.string().trim().min(3).max(600) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: req } = await sb("attestation_requests")
      .select("id, status, experience_id, supervisor_email")
      .eq("token_hash", hashToken(data.token))
      .maybeSingle();
    const r = req as {
      id: string;
      status: string;
      experience_id: string;
      supervisor_email: string;
    } | null;
    if (!r || r.status !== "pending") throw new Error("This link isn't valid.");
    const now = new Date().toISOString();
    await sb("attestation_requests")
      .update({ status: "declined", completed_at: now })
      .eq("id", r.id);
    await sb("experiences")
      .update({
        status: "disputed",
        attestation: {
          declined: true,
          reason: data.reason,
          email: r.supervisor_email,
          timestamp: now,
        },
      })
      .eq("id", r.experience_id);
    return { ok: true };
  });
