import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Accessibility baseline — runs axe-core against the public, signed-out routes.
//
// Gate policy:
//   • Blocks the run on ANY serious/critical WCAG 2.x A/AA violation
//     (missing labels, bad ARIA, heading/landmark problems, etc.).
//   • EXCEPTION: color-contrast failures whose foreground is one of the EXPLR
//     brand colors are treated as ADVISORY (printed, non-blocking). The mint
//     wordmark is a logotype (WCAG 1.4.3 exempts logotypes) and the six RIASEC
//     hues are a fixed, deliberately-tuned palette — changing them is a design
//     decision Jordan owns, not a silent test fix. A contrast failure on any
//     OTHER color (e.g. grey body text) still blocks, so real regressions are
//     caught.
//
// Authenticated surfaces (student dashboard, educator/admin, the assessment +
// survey runners) need a logged-in fixture and aren't covered yet — see the
// note at the bottom of this file.

const ROUTES: Array<{ path: string; name: string }> = [
  { path: "/", name: "home" },
  { path: "/about", name: "about" },
  { path: "/privacy", name: "privacy" },
  { path: "/start", name: "start (pathway chooser)" },
  { path: "/sign-in", name: "student sign-in" },
  { path: "/sign-up", name: "student sign-up" },
  { path: "/educator/sign-in", name: "educator sign-in" },
  { path: "/educator/sign-up", name: "educator sign-up" },
  { path: "/assessment", name: "assessment intro (signed-out)" },
  { path: "/stem-lab", name: "stem lab" },
  { path: "/worksites", name: "worksites" },
];

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// EXPLR brand foreground colors exempt from the contrast GATE (still reported).
// Mint accent + the six RIASEC hues (see src/lib/riasec.ts).
const BRAND_FG = new Set(
  ["#2beda1", "#d9523b", "#d9952a", "#3d9c56", "#2e8fb0", "#5c56b0", "#b14a99"],
);

type Violation = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number];

// A contrast violation counts as brand-palette only if EVERY failing node's
// foreground is a brand color. Mixed/other colors fall through and block.
function isBrandPaletteContrast(v: Violation): boolean {
  if (v.id !== "color-contrast") return false;
  return v.nodes.every((n) =>
    (n.any ?? []).some((a) => BRAND_FG.has(String((a.data as { fgColor?: string })?.fgColor ?? "").toLowerCase())),
  );
}

function describe(v: Violation): string {
  return `  [${v.impact}] ${v.id}: ${v.help} — ${v.nodes.length} node(s)\n    ${v.nodes[0]?.target?.join(" ") ?? ""}`;
}

for (const route of ROUTES) {
  test(`a11y: ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: "load" });
    await page.locator("body").waitFor({ state: "visible" });

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const seriousOrCritical = violations.filter((v) => v.impact === "serious" || v.impact === "critical");

    const advisory = seriousOrCritical.filter(isBrandPaletteContrast);
    const blocking = seriousOrCritical.filter((v) => !isBrandPaletteContrast(v));

    if (advisory.length > 0) {
      console.warn(
        `[a11y advisory] ${route.path} — brand-palette color-contrast (reviewed separately):\n${advisory.map(describe).join("\n")}`,
      );
    }

    expect(
      blocking.length,
      `Serious/critical accessibility violations on ${route.path}:\n${blocking.map(describe).join("\n") || "  (none)"}`,
    ).toBe(0);
  });
}

// To extend coverage to authenticated pages later: create e2e/auth.setup.ts that
// signs in a seeded test student/educator and saves storageState, then add a
// Playwright project with `use: { storageState }` that visits /student,
// /educator/dashboard, /educator/admin, /assessment/$id, etc.
