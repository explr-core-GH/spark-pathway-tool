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

// The career-explorer site families can use to look up RIASEC codes and
// see matching careers.
const EXPLORE_URL = "https://explrpathways.netlify.app/";

// Pre-generated QR code for EXPLORE_URL (static — the URL never changes,
// so we embed the SVG rather than pulling in a QR library or hitting an
// external generator at print time). 29-module QR + 4-module quiet zone,
// viewBox 0 0 37 37; CSS sizes it. Verified to decode to EXPLORE_URL.
const EXPLORE_QR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 37 37" shape-rendering="crispEdges"><rect width="37" height="37" fill="#fff"/><path d="M4 4h7v1h-7zM14 4h3v1h-3zM18 4h1v1h-1zM21 4h3v1h-3zM26 4h7v1h-7zM4 5h1v1h-1zM10 5h1v1h-1zM14 5h3v1h-3zM20 5h1v1h-1zM22 5h1v1h-1zM26 5h1v1h-1zM32 5h1v1h-1zM4 6h1v1h-1zM6 6h3v1h-3zM10 6h1v1h-1zM18 6h2v1h-2zM21 6h4v1h-4zM26 6h1v1h-1zM28 6h3v1h-3zM32 6h1v1h-1zM4 7h1v1h-1zM6 7h3v1h-3zM10 7h1v1h-1zM14 7h1v1h-1zM16 7h2v1h-2zM22 7h1v1h-1zM26 7h1v1h-1zM28 7h3v1h-3zM32 7h1v1h-1zM4 8h1v1h-1zM6 8h3v1h-3zM10 8h1v1h-1zM14 8h1v1h-1zM16 8h1v1h-1zM22 8h1v1h-1zM24 8h1v1h-1zM26 8h1v1h-1zM28 8h3v1h-3zM32 8h1v1h-1zM4 9h1v1h-1zM10 9h1v1h-1zM12 9h1v1h-1zM19 9h1v1h-1zM22 9h2v1h-2zM26 9h1v1h-1zM32 9h1v1h-1zM4 10h7v1h-7zM12 10h1v1h-1zM14 10h1v1h-1zM16 10h1v1h-1zM18 10h1v1h-1zM20 10h1v1h-1zM22 10h1v1h-1zM24 10h1v1h-1zM26 10h7v1h-7zM13 11h1v1h-1zM15 11h1v1h-1zM17 11h1v1h-1zM19 11h5v1h-5zM4 12h1v1h-1zM7 12h1v1h-1zM9 12h2v1h-2zM12 12h2v1h-2zM18 12h1v1h-1zM20 12h1v1h-1zM24 12h2v1h-2zM27 12h1v1h-1zM4 13h6v1h-6zM12 13h1v1h-1zM14 13h1v1h-1zM16 13h2v1h-2zM19 13h1v1h-1zM21 13h2v1h-2zM24 13h1v1h-1zM26 13h1v1h-1zM29 13h1v1h-1zM32 13h1v1h-1zM4 14h1v1h-1zM7 14h5v1h-5zM13 14h1v1h-1zM15 14h4v1h-4zM20 14h1v1h-1zM23 14h1v1h-1zM28 14h4v1h-4zM5 15h2v1h-2zM8 15h2v1h-2zM13 15h1v1h-1zM16 15h2v1h-2zM20 15h1v1h-1zM23 15h6v1h-6zM30 15h2v1h-2zM6 16h1v1h-1zM10 16h2v1h-2zM13 16h4v1h-4zM18 16h4v1h-4zM23 16h1v1h-1zM25 16h2v1h-2zM29 16h1v1h-1zM31 16h2v1h-2zM4 17h1v1h-1zM6 17h1v1h-1zM13 17h1v1h-1zM15 17h1v1h-1zM17 17h2v1h-2zM20 17h1v1h-1zM23 17h2v1h-2zM7 18h1v1h-1zM10 18h2v1h-2zM13 18h6v1h-6zM20 18h2v1h-2zM24 18h1v1h-1zM26 18h7v1h-7zM4 19h2v1h-2zM7 19h2v1h-2zM13 19h3v1h-3zM19 19h1v1h-1zM21 19h1v1h-1zM23 19h1v1h-1zM25 19h1v1h-1zM27 19h1v1h-1zM29 19h1v1h-1zM31 19h1v1h-1zM5 20h2v1h-2zM8 20h4v1h-4zM13 20h3v1h-3zM17 20h1v1h-1zM20 20h2v1h-2zM23 20h3v1h-3zM27 20h1v1h-1zM31 20h1v1h-1zM5 21h1v1h-1zM7 21h1v1h-1zM9 21h1v1h-1zM11 21h1v1h-1zM13 21h1v1h-1zM17 21h2v1h-2zM20 21h2v1h-2zM25 21h3v1h-3zM29 21h1v1h-1zM32 21h1v1h-1zM4 22h1v1h-1zM8 22h1v1h-1zM10 22h2v1h-2zM14 22h3v1h-3zM18 22h1v1h-1zM20 22h1v1h-1zM22 22h1v1h-1zM26 22h1v1h-1zM28 22h1v1h-1zM31 22h2v1h-2zM6 23h1v1h-1zM9 23h1v1h-1zM11 23h1v1h-1zM13 23h1v1h-1zM15 23h2v1h-2zM18 23h7v1h-7zM26 23h3v1h-3zM31 23h2v1h-2zM4 24h1v1h-1zM6 24h7v1h-7zM14 24h1v1h-1zM16 24h1v1h-1zM24 24h5v1h-5zM30 24h1v1h-1zM12 25h3v1h-3zM16 25h1v1h-1zM18 25h1v1h-1zM20 25h2v1h-2zM24 25h1v1h-1zM28 25h1v1h-1zM30 25h3v1h-3zM4 26h7v1h-7zM16 26h1v1h-1zM20 26h2v1h-2zM24 26h1v1h-1zM26 26h1v1h-1zM28 26h1v1h-1zM31 26h1v1h-1zM4 27h1v1h-1zM10 27h1v1h-1zM12 27h1v1h-1zM15 27h2v1h-2zM18 27h2v1h-2zM24 27h1v1h-1zM28 27h5v1h-5zM4 28h1v1h-1zM6 28h3v1h-3zM10 28h1v1h-1zM14 28h3v1h-3zM20 28h2v1h-2zM24 28h5v1h-5zM32 28h1v1h-1zM4 29h1v1h-1zM6 29h3v1h-3zM10 29h1v1h-1zM12 29h1v1h-1zM15 29h3v1h-3zM22 29h1v1h-1zM26 29h1v1h-1zM28 29h4v1h-4zM4 30h1v1h-1zM6 30h3v1h-3zM10 30h1v1h-1zM14 30h1v1h-1zM17 30h1v1h-1zM20 30h3v1h-3zM24 30h2v1h-2zM28 30h3v1h-3zM32 30h1v1h-1zM4 31h1v1h-1zM10 31h1v1h-1zM14 31h1v1h-1zM16 31h1v1h-1zM20 31h5v1h-5zM31 31h1v1h-1zM4 32h7v1h-7zM12 32h1v1h-1zM15 32h5v1h-5zM21 32h2v1h-2zM24 32h1v1h-1zM27 32h3v1h-3zM31 32h1v1h-1z" fill="#1A1D1F"/></svg>';

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
  .r-explore { display: flex; gap: 14px; align-items: center;
    border: 1px solid #E6E8EA; background: #F4F5F6; padding: 12px 14px;
    margin-top: 6px; }
  .r-explore .qr { width: 92px; height: 92px; flex: 0 0 92px; }
  .r-explore .qr svg { width: 100%; height: 100%; display: block; }
  .r-explore .x-body { flex: 1; }
  .r-explore .x-body p { margin: 0 0 4px; font-size: 12px; line-height: 1.5;
    color: #2c3033; }
  .r-explore .x-url { font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 12px; font-weight: 600; color: #0FA66C; word-break: break-all; }
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

    <h2>Explore careers together</h2>
    <div class="r-explore">
      <div class="qr">${EXPLORE_QR_SVG}</div>
      <div class="x-body">
        <p>Scan the code or visit the link below to look up ${fn}&rsquo;s
        interest code &mdash; <strong>${esc(dims.join(""))}</strong> &mdash; and
        explore careers that match what they enjoy.</p>
        <p class="x-url">${esc(EXPLORE_URL)}</p>
      </div>
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
