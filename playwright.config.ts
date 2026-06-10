import { defineConfig, devices } from "@playwright/test";

// Accessibility baseline (axe-core). Drives the dev server, which the Lovable
// config pins to :8080. Unit tests stay on vitest (src/**/*.test.ts); Playwright
// only owns e2e/*.spec.ts, so the two never collide.
const PORT = 8080;
const BASE = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: BASE,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: BASE,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
