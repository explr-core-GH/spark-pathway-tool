import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Signed-in WCAG 2.2 AA scan against a deployed site, using the /demo roles.
 *
 *   LIVE_BASE=https://explrpathways.org npx playwright test e2e/a11y-live.spec.ts
 *
 * Skipped unless LIVE_BASE is set (the demo accounts only exist where the
 * server has the service-role key). Each role signs in once through the
 * demo page, then every route for that role is scanned.
 */

const BASE = process.env.LIVE_BASE?.replace(/\/$/, "");
test.skip(!BASE, "LIVE_BASE not set");

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

type Violation = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number];
function describe(v: Violation): string {
  const targets = v.nodes
    .slice(0, 3)
    .map((n) => n.target.join(" "))
    .join(" | ");
  return `  [${v.impact}] ${v.id}: ${v.help} — ${v.nodes.length} node(s): ${targets}`;
}

const ROLES: Array<{ button: string; routes: string[] }> = [
  {
    button: "Enter as Mia",
    routes: [
      "/student",
      "/student/pathway",
      "/student/experiences",
      "/student/experiences/new",
      "/student/credentials",
      "/student/pieces",
      "/student/skills",
      "/student/checkpoints",
      "/assessment",
    ],
  },
  {
    button: "Enter as Amara",
    routes: [
      "/student",
      "/student/pathway",
      "/student/pathway?tab=families",
      "/student/experiences",
      "/student/experiences/new",
      "/student/credentials",
      "/student/pieces",
      "/student/skills",
      "/student/checkpoints",
      "/student/profile",
      "/student/apply",
      "/student/apply-complete",
      "/opportunities",
      "/assessment",
    ],
  },
  { button: "Enter as Amara's family", routes: [] }, // scans the landing page only
  { button: "Enter as Lakeshore Health Partners", routes: ["/org", "/org/new", "/org/applicants"] },
  {
    button: "Enter as Dana Okafor",
    routes: [
      "/instructor/dashboard",
      "/instructor/students",
      "/instructor/checkpoints",
      "/instructor/login-display",
    ],
  },
];

async function scan(page: Page, label: string) {
  await page.waitForTimeout(1200);
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const lines = violations.map(describe).join("\n");
  expect.soft(violations.length, `Accessibility violations on ${label}:\n${lines}`).toBe(0);
  return violations.length;
}

for (const role of ROLES) {
  test(`live a11y: ${role.button}`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(`${BASE}/demo`, { waitUntil: "load" });
    const button = page.getByRole("button", { name: role.button, exact: true });
    await expect(button).toBeEnabled({ timeout: 20_000 });
    await button.click();
    await page.waitForURL((u) => !u.pathname.startsWith("/demo"), { timeout: 30_000 });
    await scan(page, `${role.button} → ${new URL(page.url()).pathname}`);
    for (const r of role.routes) {
      await page.goto(`${BASE}${r}`, { waitUntil: "load" });
      await scan(page, r);
    }
  });
}
