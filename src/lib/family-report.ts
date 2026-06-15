// Family-friendly printable 1-pager for camp students.
//
// Built to fit on ONE page and to pull a parent's eye straight to two things:
// the "Log in to see your results" headline (so they actually sign in) and
// their child's RIASEC code. The login credentials + a scan-to-login QR sit
// right beneath the hero; the supporting explainer is condensed.
//
// Pure string builders — the DOM/print step (and the QR data URL) come from
// the camp-logins admin page. Camp kids are grades ~5-8, so we use the
// middle-school plain-language names + descriptions from riasec.ts.

import { RIASEC, type RIASECCode } from "./riasec";

// The career-explorer site families can use to look up RIASEC codes.
const EXPLORE_URL = "https://explrpathways.netlify.app/";

// Parent-facing, plain-language gloss of each interest. (riasec.ts's
// msDescription is written in second person to the kid — "you like…" — which
// reads oddly in a take-home letter a parent reads about their child.)
const FAMILY_DIM_BLURB: Record<RIASECCode, string> = {
  R: "Hands-on and practical — enjoys building, fixing, and working with tools, machines, or the outdoors.",
  I: "Curious and analytical — enjoys figuring out how things work, asking questions, and solving problems.",
  A: "Creative and expressive — enjoys designing, making things, and coming up with original ideas in art, music, writing, or media.",
  S: "People-centered — enjoys helping, teaching, and supporting other people.",
  E: "Persuasive and driven — enjoys leading, pitching ideas, organizing, and starting new things.",
  C: "Organized and precise — enjoys structure, planning, accuracy, and keeping things in order.",
};

export type FamilyReportArgs = {
  childName: string;
  campTitle: string;
  username: string;
  password: string;
  signInUrl: string;
  /** Holland code, e.g. "RIA". Up to 3 letters. */
  hollandCode: string;
  /** Optional data-URL QR pointing at the sign-in page ("scan to log in"). */
  loginQrDataUrl?: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full;
}

/** The three RIASEC dimensions in a Holland code, in code order. */
function codeDimensions(code: string): RIASECCode[] {
  const seen = new Set<string>();
  const out: RIASECCode[] = [];
  for (const ch of code.toUpperCase()) {
    if (RIASEC[ch as RIASECCode] && !seen.has(ch)) {
      seen.add(ch);
      out.push(ch as RIASECCode);
    }
  }
  return out.slice(0, 3);
}

/** Shared print stylesheet — one <style> for the whole multi-page doc. */
export const FAMILY_REPORT_CSS = `
  /* Page margin + the report's OWN inner padding. The inner padding matters:
     if the user's print dialog forces "None"/"Minimum" margins, @page is
     overridden and content would hug the paper edge — the .report padding
     keeps a breathing-room buffer regardless. Not a fixed height (that
     overflowed/clipped in print); min-height fills the page, content flows. */
  @page { size: letter; margin: 0.4in; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1A1D1F; }
  .report {
    width: 100%; min-height: 9.5in; margin: 0; padding: 0.3in 0.35in;
    display: flex; flex-direction: column;
    page-break-after: always; break-after: page; page-break-inside: avoid;
  }
  .report:last-child { page-break-after: auto; break-after: auto; }

  .r-head { display: flex; justify-content: space-between; align-items: baseline; }
  .r-brand { font-size: 16px; font-weight: 600; }
  .r-brand span { color: #15A36B; }
  .r-meta { font-size: 12px; color: #6E767F; }

  /* HERO — the eye magnet. */
  .r-hero { margin-top: 18px; text-align: center; border: 2px solid #1A1D1F;
    border-radius: 14px; padding: 26px 20px; }
  .r-hero h1 { margin: 0; font-size: 44px; font-weight: 800; line-height: 1.03;
    letter-spacing: -0.015em; }
  .r-hero-sub { margin: 12px 0 0; font-size: 14px; line-height: 1.45; color: #2c3033; }

  /* Login card + the big RIASEC score, side by side. */
  .r-cols { display: flex; gap: 18px; margin-top: 22px; align-items: stretch; }
  .r-login { flex: 1.15; border: 1px solid #E6E8EA; background: #F4F5F6;
    border-radius: 12px; padding: 16px 18px; }
  .r-card-title { margin: 0 0 10px; font-size: 12px; text-transform: uppercase;
    letter-spacing: 0.08em; color: #6E767F; font-weight: 700; }
  .r-qr-row { display: flex; gap: 14px; align-items: center; }
  .r-qr { width: 108px; height: 108px; flex: 0 0 108px; text-align: center; }
  .r-qr img { width: 108px; height: 108px; display: block; }
  .r-qr .r-scan { font-size: 11px; color: #6E767F; margin-top: 4px; }
  .r-login table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .r-login td { padding: 5px 0; vertical-align: middle; }
  .r-login td:first-child { color: #6E767F; width: 76px; }
  .r-login code { font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 14px; background: #fff; padding: 2px 6px; border: 1px solid #E6E8EA;
    white-space: nowrap; }

  .r-score { flex: 0.85; border: 1px solid #E6E8EA; border-radius: 12px;
    padding: 16px; text-align: center; display: flex; flex-direction: column;
    justify-content: center; }
  .r-score-label { margin: 0; font-size: 12px; text-transform: uppercase;
    letter-spacing: 0.08em; color: #6E767F; font-weight: 700; }
  .r-chips { display: flex; gap: 10px; justify-content: center; margin: 14px 0 8px; }
  .r-chip { width: 58px; height: 58px; border-radius: 50%; color: #fff;
    font-size: 28px; font-weight: 700; display: flex; align-items: center;
    justify-content: center; }
  .r-score-code { font-size: 34px; font-weight: 800; letter-spacing: 0.12em; }
  .r-score-name { font-size: 11px; color: #6E767F; margin-top: 6px; line-height: 1.35; }

  .r-section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;
    color: #6E767F; font-weight: 700; margin: 22px 0 10px; }
  .r-dims { display: flex; flex-direction: column; gap: 12px; }
  .r-dim { border-left: 4px solid; padding: 2px 0 2px 12px; }
  .r-dim-name { font-weight: 700; font-size: 14px; }
  .r-dim p { margin: 3px 0 0; font-size: 12.5px; line-height: 1.5; color: #2c3033; }
  .r-careers { color: #6E767F; }

  .r-how { font-size: 12.5px; line-height: 1.55; color: #2c3033; margin: 20px 0 0; }
  .r-explore-line { font-size: 12.5px; color: #2c3033; margin: 12px 0 0; }
  .x-url { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-weight: 600;
    color: #0FA66C; white-space: nowrap; }

  .r-foot { margin-top: auto; padding-top: 14px; border-top: 1px solid #E6E8EA;
    font-size: 10.5px; color: #9aa1a8; }
`;

/**
 * HTML for ONE student's family 1-pager (a single .report block).
 * Compose several of these inside one body for a multi-camper print run.
 */
export function familyReportPageHtml(a: FamilyReportArgs): string {
  const fn = esc(firstName(a.childName));
  const fullName = esc(a.childName.trim() || "Your child");
  const dims = codeDimensions(a.hollandCode);
  const code = esc(dims.join(""));

  const chips = dims
    .map((c) => `<span class="r-chip" style="background:${RIASEC[c].color}">${RIASEC[c].code}</span>`)
    .join("");

  const dimBlocks = dims
    .map((c) => {
      const d = RIASEC[c];
      return `
      <div class="r-dim" style="border-color:${d.color}">
        <span class="r-dim-name" style="color:${d.color}">${d.code} &middot; ${esc(d.msPlainName)}</span>
        <p>${FAMILY_DIM_BLURB[c]} <span class="r-careers">Example jobs: ${esc(d.examples.slice(0, 4).join(", "))}.</span></p>
      </div>`;
    })
    .join("");

  const loginRows = `
    <table>
      <tr><td>Website</td><td><code>${esc(a.signInUrl)}</code></td></tr>
      <tr><td>Username</td><td><code>${esc(a.username)}</code></td></tr>
      <tr><td>Password</td><td><code>${esc(a.password)}</code></td></tr>
    </table>`;

  const loginInner = a.loginQrDataUrl
    ? `<div class="r-qr-row">
         <div class="r-qr"><img src="${a.loginQrDataUrl}" alt="QR code to the sign-in page"/><div class="r-scan">Scan to log in</div></div>
         <div style="flex:1">${loginRows}</div>
       </div>`
    : loginRows;

  return `
  <div class="report">
    <div class="r-head">
      <div class="r-brand">EXPLR <span>Pathways</span></div>
      <div class="r-meta">${esc(a.campTitle)}</div>
    </div>

    <div class="r-hero">
      <h1>Log in to see your results</h1>
      <p class="r-hero-sub">${fullName} just finished the EXPLR interest assessment. Sign in together to explore what ${fn} discovered.</p>
    </div>

    <div class="r-cols">
      <div class="r-login">
        <p class="r-card-title">How to log in</p>
        ${loginInner}
      </div>
      <div class="r-score">
        <p class="r-score-label">${fn}&rsquo;s interest code</p>
        <div class="r-chips">${chips}</div>
        <div class="r-score-code">${code}</div>
        <div class="r-score-name">${dims.map((c) => esc(RIASEC[c].msPlainName)).join(" &middot; ")}</div>
      </div>
    </div>

    <p class="r-section-title">What ${fn}&rsquo;s code means</p>
    <div class="r-dims">${dimBlocks}</div>

    <p class="r-how">EXPLR uses <strong>RIASEC</strong>, a research framework used for 45 years.
    Almost everyone is a blend &mdash; ${fn}&rsquo;s top three letters are a conversation
    starter (&ldquo;what did you enjoy, and why?&rdquo;), not a prediction or a limit. Interests
    grow a lot at this age.</p>

    <p class="r-explore-line">Look up the <strong>${code}</strong> code and matching careers at
    <span class="x-url">${esc(EXPLORE_URL)}</span></p>

    <div class="r-foot">
      EXPLR Pathways &middot; Cleveland State University &times; MAGNET. Keep this sheet &mdash;
      it has ${fn}&rsquo;s sign-in. Questions? Ask your camp educator.
    </div>
  </div>`;
}

/** Wrap one or more report pages into a full printable document. */
export function familyReportDocument(pages: string[]): string {
  return `<!doctype html><html><head><meta charset="utf-8">
    <title>EXPLR family reports</title>
    <style>${FAMILY_REPORT_CSS}</style></head>
    <body>${pages.join("")}</body></html>`;
}
