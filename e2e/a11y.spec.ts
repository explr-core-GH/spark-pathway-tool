import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Accessibility gate (axe-core, WCAG 2.2 AA). Every public route is scanned
// and ANY violation fails the run — no impact threshold and no brand-color
// exemption; the passport palette has text-safe greens for small type.
//
// Signed-in surfaces are covered by the code audit and by running the same
// scan against the deployed site with the /demo accounts. To add them here:
// create e2e/auth.setup.ts that signs in a seeded demo user and saves
// storageState, then a project with `use: { storageState }`.

const ROUTES: Array<{ path: string; name: string }> = [
  { path: "/", name: "home" },
  { path: "/family", name: "families" },
  { path: "/explore", name: "explore sign-in (4-8)" },
  { path: "/explore/scan", name: "explore scan" },
  { path: "/about", name: "about" },
  { path: "/accessibility", name: "accessibility statement" },
  { path: "/privacy", name: "privacy" },
  { path: "/terms", name: "terms" },
  { path: "/student-data", name: "student data" },
  { path: "/start", name: "start (pathway chooser)" },
  { path: "/sign-in", name: "student sign-in" },
  { path: "/sign-up", name: "student sign-up" },
  { path: "/forgot-password", name: "forgot password" },
  { path: "/reset-password", name: "reset password" },
  { path: "/instructor", name: "instructor landing" },
  { path: "/instructor/sign-in", name: "instructor sign-in" },
  { path: "/instructor/sign-up", name: "instructor sign-up" },
  { path: "/org/sign-in", name: "partner sign-in" },
  { path: "/org/sign-up", name: "partner sign-up" },
  { path: "/demo", name: "demo" },
  { path: "/opportunities", name: "opportunities" },
  { path: "/try-riasec", name: "RIASEC demo" },
  { path: "/assessment", name: "assessment intro (signed-out)" },
];

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

type Violation = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number];

function describe(v: Violation): string {
  const targets = v.nodes
    .slice(0, 3)
    .map((n) => n.target.join(" "))
    .join(" | ");
  return `  [${v.impact}] ${v.id}: ${v.help} — ${v.nodes.length} node(s): ${targets}`;
}

for (const route of ROUTES) {
  test(`a11y: ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: "load" });
    await page.locator("body").waitFor({ state: "visible" });
    // Let client-side loaders settle (role checks, data) before scanning.
    await page.waitForTimeout(800);

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const lines = violations.map(describe).join("\n");
    expect(violations.length, `Accessibility violations on ${route.path}:\n${lines}`).toBe(0);
  });
}
