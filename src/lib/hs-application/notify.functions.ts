import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DEMO_DOMAIN } from "@/lib/demo";
import { APP_STATUS_LABEL, REQUIREMENT_BY_KEY } from "./content";
import { buildStatusMessage, type StatusContext } from "./notify-messages";
import { hydrateBuilder } from "./types";

/**
 * Application status changes and the notifications they send.
 *
 * Every status update goes to the student by email (and text, once an SMS
 * provider is connected and they said it's OK) and the same message goes to
 * the parent or guardian. Students can only trigger "received" on their own
 * application; every other status is staff-only.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabaseAdmin.from as unknown as (n: string) => any)(table);

const STATUSES = [
  "received",
  "under_review",
  "missing",
  "placed",
  "waitlisted",
  "not_placed",
] as const;

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await sb("admins").select("id").eq("id", userId).maybeSingle();
  return !!data;
}

type Delivery = { to: string; sent: boolean; skipped?: string; error?: string; preview?: string };

async function sendEmail(to: string, subject: string, html: string): Promise<Delivery> {
  if (to.endsWith(DEMO_DOMAIN) || to.endsWith("@example.org") || to.endsWith("@example.com"))
    return { to, sent: false, skipped: "demo address" };
  const key = process.env.RESEND_API_KEY;
  if (!key) return { to, sent: false, error: "Email is not configured (RESEND_API_KEY)" };
  const from = process.env.RESEND_FROM ?? "EXPLR Pathways <noreply@explrpathways.org>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) return { to, sent: false, error: `Resend ${res.status}` };
    return { to, sent: true };
  } catch (e) {
    return { to, sent: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * SMS hook. No provider is connected yet, so this records that a text would
 * have gone out. Swap the body for a provider call (e.g. Twilio) later.
 */
async function sendSms(to: string, body: string): Promise<Delivery> {
  return { to, sent: false, skipped: "No SMS provider connected", preview: body.slice(0, 160) };
}

export const recordApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        generalId: z.string().uuid(),
        status: z.enum(STATUSES),
        note: z.string().trim().max(1000).optional(),
        placedOpportunityId: z.string().uuid().optional(),
        origin: z.string().url().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: app } = await sb("hs_general_applications")
      .select("*")
      .eq("id", data.generalId)
      .maybeSingle();
    if (!app) throw new Error("Application not found");
    const admin = await isAdmin(context.userId);
    if (!admin) {
      // A student may only report their own submission.
      if (
        app.student_id !== context.userId ||
        data.status !== "received" ||
        app.status !== "received"
      )
        throw new Error("Only EXPLR staff can change an application's status.");
      const { data: prior } = await sb("application_status_events")
        .select("id")
        .eq("general_id", app.id)
        .eq("status", "received")
        .limit(1);
      if (prior?.length)
        return {
          ok: true,
          status: data.status,
          label: APP_STATUS_LABEL.received,
          delivery: {} as Record<string, Delivery>,
        };
    } else {
      const patch: Record<string, unknown> = { status: data.status };
      if (data.status === "missing") patch.missing_note = data.note ?? null;
      if (data.status === "placed") patch.placed_opportunity_id = data.placedOpportunityId ?? null;
      const { error } = await sb("hs_general_applications").update(patch).eq("id", app.id);
      if (error) throw new Error(error.message);
      if (data.status === "placed" && data.placedOpportunityId) {
        await sb("internship_placements").delete().eq("hs_general_id", app.id);
        const { error: pErr } = await sb("internship_placements").insert({
          hs_general_id: app.id,
          student_id: app.student_id,
          approved_internship_id: `opp:${data.placedOpportunityId}`,
          approved_by: null,
          staff_notes: data.note ?? null,
        });
        if (pErr) throw new Error(pErr.message);
      }
    }

    // Context for the message.
    const core = (app.core ?? {}) as Record<string, unknown>;
    const ctx: StatusContext = {
      firstName: String(core.preferredName || core.legalFirst || "there"),
      status: data.status,
      note: data.note ?? null,
      origin: data.origin ?? "https://explrpathways.org",
      core,
      placed: null,
      suggestions: [],
      otherOpportunities: [],
    };
    if (data.status === "placed" && data.placedOpportunityId) {
      const { data: opp } = await sb("opportunities")
        .select("id, name, org_name, location, start_date, application_version_id")
        .eq("id", data.placedOpportunityId)
        .maybeSingle();
      let cards: string[] = [];
      if (opp?.application_version_id) {
        const { data: v } = await sb("opp_application_versions")
          .select("builder")
          .eq("id", opp.application_version_id)
          .maybeSingle();
        const b = hydrateBuilder(v?.builder);
        cards = b.requirements.map((r) => {
          const def = REQUIREMENT_BY_KEY.get(r.key);
          return `${def?.label ?? r.key}${r.detail ? `: ${r.detail}` : ""}`;
        });
        if (b.profile.address) opp.location = b.profile.address;
        if (b.profile.startDate) opp.start_date = b.profile.startDate;
      }
      ctx.placed = opp
        ? {
            name: opp.name ?? "Internship",
            org: opp.org_name ?? "",
            address: opp.location ?? "",
            start: opp.start_date ?? "",
            requirements: cards,
          }
        : null;
    }
    if (data.status === "waitlisted" || data.status === "not_placed") {
      const choices = (app.choices ?? {}) as { shown?: string[]; ranked?: string[] };
      const taken = new Set(choices.ranked ?? []);
      const ids = (choices.shown ?? [])
        .filter((r) => !taken.has(r))
        .map((r) => r.replace(/^opp:/, ""));
      if (ids.length) {
        const { data: opps } = await sb("opportunities")
          .select("name")
          .in("id", ids)
          .eq("status", "approved");
        ctx.suggestions = ((opps ?? []) as Array<{ name: string | null }>).map(
          (o) => o.name ?? "Internship",
        );
      }
      if (data.status === "not_placed") {
        const { data: other } = await sb("opportunities")
          .select("name")
          .neq("type", "internship")
          .eq("status", "approved")
          .limit(4);
        ctx.otherOpportunities = ((other ?? []) as Array<{ name: string | null }>).map(
          (o) => o.name ?? "",
        );
      }
    }

    const msg = buildStatusMessage(ctx);
    const delivery: Record<string, Delivery> = {};
    const studentEmail = String(core.email ?? "");
    const guardianEmail = String(core.guardianEmail ?? "");
    if (studentEmail) delivery.studentEmail = await sendEmail(studentEmail, msg.subject, msg.html);
    if (guardianEmail && guardianEmail.toLowerCase() !== studentEmail.toLowerCase())
      delivery.guardianEmail = await sendEmail(guardianEmail, msg.subject, msg.guardianHtml);
    if (core.okToText === true && core.phone)
      delivery.studentSms = await sendSms(String(core.phone), msg.sms);
    if (core.guardianPhone)
      delivery.guardianSms = await sendSms(String(core.guardianPhone), msg.sms);

    await sb("application_status_events").insert({
      general_id: app.id,
      status: data.status,
      note: data.note ?? null,
      created_by: context.userId,
      delivery,
    });
    return { ok: true, status: data.status, label: APP_STATUS_LABEL[data.status], delivery };
  });

/** Staff: clear an "I'd need help" answer once help is arranged (restores the score). */
export const clearNeedHelp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        partnerAppId: z.string().uuid(),
        requirement: z.string().min(1).max(60),
        clear: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Admin access required");
    const { data: row } = await sb("hs_partner_applications")
      .select("cleared_help")
      .eq("id", data.partnerAppId)
      .maybeSingle();
    if (!row) throw new Error("Not found");
    const cur = new Set<string>(row.cleared_help ?? []);
    if (data.clear) cur.add(data.requirement);
    else cur.delete(data.requirement);
    const { error } = await sb("hs_partner_applications")
      .update({ cleared_help: [...cur] })
      .eq("id", data.partnerAppId);
    if (error) throw new Error(error.message);
    return { ok: true, cleared: [...cur] };
  });
