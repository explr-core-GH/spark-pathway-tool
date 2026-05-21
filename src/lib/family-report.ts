// Family-friendly printable 1-pager for camp students.
//
// Combines the generated login, the student's RIASEC result, and a short
// plain-language explainer of how RIASEC works. Educators print one per
// camper (once they've taken the assessment) and send it home to parents.
//
// Pure string builders — the DOM/print step lives in the camp-logins
// admin page. Camp kids are grades ~5-8, so we use the middle-school
// plain-language names + descriptions from riasec.ts.

import { RIASEC, type RIASECCode } from "./riasec";

export type FamilyReportArgs = {
  childName: string;
  campTitle: string;
  username: string;
  password: string;
  signInUrl: string;
  /** Holland code, e.g. "RIA". Up to 3 letters. */
  hollandCode: string;
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
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1A1D1F; }
  .report {
    width: 7.5in; min-height: 9.7in; margin: 0 auto; padding: 0.5in 0;
    page-break-after: always; display: flex; flex-direction: column;
  }
  .report:last-child { page-break-after: auto; }
  .r-head { display: flex; justify-content: space-between; align-items: baseline;
    border-bottom: 2px solid #1A1D1F; padding-bottom: 8px; }
  .r-brand { font-size: 17px; font-weight: 600; }
  .r-brand span { color: #15A36B; }
  .r-meta { font-size: 11px; color: #6E767F; }
  h1 { font-size: 25px; font-weight: 300; margin: 18px 0 4px; }
  .r-sub { font-size: 12px; color: #6E767F; margin: 0 0 18px; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
    color: #6E767F; margin: 18px 0 8px; font-weight: 600; }
  .r-login { border: 1px solid #E6E8EA; background: #F4F5F6; padding: 12px 14px; }
  .r-login p { margin: 0 0 8px; font-size: 12px; color: #6E767F; }
  .r-login table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .r-login td { padding: 4px 0; }
  .r-login td:first-child { color: #6E767F; width: 90px; }
  .r-login code { font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 13px; background: #fff; padding: 1px 5px; border: 1px solid #E6E8EA; }
  .r-code { font-size: 13px; }
  .r-code strong { font-size: 22px; letter-spacing: 0.06em; }
  .r-dim { border-left: 3px solid; padding: 6px 0 6px 12px; margin-top: 10px; }
  .r-dim-head { display: flex; align-items: center; gap: 8px; }
  .r-chip { display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: 50%; color: #fff;
    font-size: 12px; font-weight: 600; }
  .r-dim-name { font-weight: 600; font-size: 14px; }
  .r-dim p { margin: 4px 0 0; font-size: 12px; line-height: 1.5; }
  .r-careers { color: #6E767F; }
  .r-how p { font-size: 12px; line-height: 1.6; margin: 0 0 8px; color: #2c3033; }
  .r-foot { margin-top: auto; padding-top: 14px; border-top: 1px solid #E6E8EA;
    font-size: 10px; color: #9aa1a8; }
`;

/**
 * HTML for ONE student's family 1-pager (a single .report block).
 * Compose several of these inside one body for a multi-camper print run.
 */
export function familyReportPageHtml(a: FamilyReportArgs): string {
  const fn = esc(firstName(a.childName));
  const dims = codeDimensions(a.hollandCode);

  const dimBlocks = dims
    .map((c) => {
      const d = RIASEC[c];
      return `
      <div class="r-dim" style="border-color:${d.color}">
        <div class="r-dim-head">
          <span class="r-chip" style="background:${d.color}">${d.code}</span>
          <span class="r-dim-name">${esc(d.msPlainName)}</span>
        </div>
        <p>${esc(d.msDescription)}</p>
        <p class="r-careers">Jobs that fit: ${esc(d.examples.join(", "))}</p>
      </div>`;
    })
    .join("");

  return `
  <div class="report">
    <div class="r-head">
      <div class="r-brand">EXPLR <span>Pathways</span></div>
      <div class="r-meta">${esc(a.campTitle)}</div>
    </div>

    <h1>${fn}&rsquo;s Interest Profile</h1>
    <p class="r-sub">A snapshot of what ${fn} is drawn to &mdash; and a starting point for conversations at home.</p>

    <h2>Signing in</h2>
    <div class="r-login">
      <p>${fn} explored their interests with EXPLR. They can sign back in any time to revisit their results.</p>
      <table>
        <tr><td>Website</td><td><code>${esc(a.signInUrl)}</code></td></tr>
        <tr><td>Username</td><td><code>${esc(a.username)}</code></td></tr>
        <tr><td>Password</td><td><code>${esc(a.password)}</code></td></tr>
      </table>
    </div>

    <h2>What ${fn} discovered</h2>
    <p class="r-code">${fn}&rsquo;s interest code is <strong>${esc(
      dims.join(""),
    )}</strong> &mdash; the three kinds of activities they leaned toward most:</p>
    ${dimBlocks}

    <h2>How to read this</h2>
    <div class="r-how">
      <p>EXPLR uses <strong>RIASEC</strong>, a framework researchers have used for
      45 years. It sorts interests into six kinds: Realistic (hands-on),
      Investigative (figuring things out), Artistic (creating), Social
      (helping people), Enterprising (leading), and Conventional (organizing).</p>
      <p>Almost everyone is a <em>blend</em>. ${fn}&rsquo;s top three letters make
      their &ldquo;interest code.&rdquo; It is a conversation starter &mdash; a way to ask
      &ldquo;what did you enjoy, and why?&rdquo; &mdash; not a prediction or a limit.
      Interests grow and change a lot at this age, and that is exactly what
      camps, clubs, and trying new things are for.</p>
    </div>

    <div class="r-foot">
      EXPLR Pathways &middot; Cleveland State University &times; MAGNET. Keep this
      sheet &mdash; it has ${fn}&rsquo;s sign-in. Questions? Ask your camp educator.
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
