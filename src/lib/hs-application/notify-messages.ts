import { CAREER_FIELD_LABEL, POST_HS_PLANS, TRANSPORT_OPTIONS } from "./content";

/** Pure message builder for status notifications (unit-tested). */

export type StatusContext = {
  firstName: string;
  status: "received" | "under_review" | "missing" | "placed" | "waitlisted" | "not_placed";
  note: string | null;
  origin: string;
  core: Record<string, unknown>;
  placed: {
    name: string;
    org: string;
    address: string;
    start: string;
    requirements: string[];
  } | null;
  suggestions: string[];
  otherOpportunities: string[];
};

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

const list = (items: string[]) =>
  items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "";

function answersCopy(core: Record<string, unknown>): string {
  const label = (opts: ReadonlyArray<{ key: string; label: string }>, keys: unknown) =>
    (Array.isArray(keys) ? keys : [])
      .map((k) => opts.find((o) => o.key === k)?.label ?? String(k))
      .join(", ");
  const rows: Array<[string, string]> = [
    ["Name", `${core.legalFirst ?? ""} ${core.legalLast ?? ""}`.trim()],
    ["School", String(core.school ?? "")],
    ["Grade this fall", String(core.gradeFall ?? "")],
    ["YOU application email", String(core.youEmail ?? "")],
    ["Getting there", label(TRANSPORT_OPTIONS, core.transport)],
    ["After high school", label(POST_HS_PLANS, core.postHs)],
    ["Something you made, fixed or figured out", String(core.madeFixed ?? "")],
    ["What you hope to get", String(core.hopeToGet ?? "")],
  ];
  return `<table cellpadding="6" style="border-collapse:collapse">${rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="vertical-align:top;color:#555">${esc(k)}</td><td>${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;
}

export function buildStatusMessage(c: StatusContext): {
  subject: string;
  html: string;
  guardianHtml: string;
  sms: string;
} {
  const link = `${c.origin.replace(/\/$/, "")}/student/apply`;
  let subject = "";
  let body = "";
  let sms = "";
  switch (c.status) {
    case "received":
      subject = "We got your EXPLR internship application";
      body = `<p>Your general application is in. Here's a copy of what you told us.</p>${answersCopy(c.core)}<p>You can now apply to specific internships by answering just their questions.</p>`;
      sms =
        "EXPLR: We got your internship application. Next, apply to specific internships on EXPLR Pathways.";
      break;
    case "under_review":
      subject = "Your EXPLR application is under review";
      body =
        "<p>EXPLR staff are reviewing your application and matching you to internships. You don't need to do anything right now.</p>";
      sms = "EXPLR: Your internship application is under review.";
      break;
    case "missing":
      subject = "Your EXPLR application is missing something";
      body = `<p>We need one more thing before we can place you:</p><p><strong>${esc(c.note ?? "Please check your application.")}</strong></p>`;
      sms = `EXPLR: Your application is missing something: ${c.note ?? "check EXPLR Pathways"}.`;
      break;
    case "placed":
      subject = c.placed
        ? `You're placed: ${c.placed.name}`
        : "You've been placed in an internship";
      body = c.placed
        ? `<p>Congratulations! You're placed in <strong>${esc(c.placed.name)}</strong>${c.placed.org ? ` with ${esc(c.placed.org)}` : ""}.</p><p>Where: ${esc(c.placed.address || "We'll send the address soon")}<br/>Start date: ${esc(c.placed.start || "We'll confirm soon")}</p>${c.placed.requirements.length ? `<p>What to know before you start:</p>${list(c.placed.requirements)}` : ""}`
        : "<p>Congratulations! You've been placed in an internship. Check EXPLR Pathways for details.</p>";
      sms = `EXPLR: You're placed${c.placed ? ` in ${c.placed.name}` : ""}! Check your email for the details.`;
      break;
    case "waitlisted":
      subject = "You're on the EXPLR internship waitlist";
      body = `<p>You're on the waitlist. We'll tell you right away if a spot opens.</p>${c.suggestions.length ? `<p>These internships still have room, and you might like them:</p>${list(c.suggestions)}` : ""}`;
      sms =
        "EXPLR: You're on the internship waitlist. Check your email for other internships you might like.";
      break;
    case "not_placed":
      subject = "About your EXPLR internship application";
      body = `<p>We weren't able to place you this season. Thank you for applying, and please apply again next season.</p>${c.otherOpportunities.length ? `<p>Other EXPLR opportunities you can join:</p>${list(c.otherOpportunities.filter(Boolean))}` : ""}`;
      sms =
        "EXPLR: We couldn't place you this season. Check your email for other opportunities, and apply again next season.";
      break;
  }
  const wrap = (greeting: string, extra = "") =>
    `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111">${greeting}${body}${extra}<p><a href="${esc(link)}">See your application on EXPLR Pathways</a></p><p style="color:#666;font-size:13px">EXPLR · Cleveland State University and MAGNET</p></div>`;
  return {
    subject,
    html: wrap(`<p>Hi ${esc(c.firstName)},</p>`),
    guardianHtml: wrap(
      `<p>Hello,</p><p>This is an update about ${esc(c.firstName)}'s EXPLR internship application. We send families a copy of every update.</p>`,
    ),
    sms,
  };
}

/** Career fields as readable labels (used in staff and partner views). */
export const fieldLabels = (keys: string[]) => keys.map((k) => CAREER_FIELD_LABEL[k] ?? k);
