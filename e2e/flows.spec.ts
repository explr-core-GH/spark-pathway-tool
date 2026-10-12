import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import {
  LIVE_BASE,
  SERVER_BASE,
  TARGET_BASE,
  forgetSession,
  go,
  openAs,
  signInAs,
  type Session,
} from "./helpers/session";
import {
  deleteStoragePrefix,
  deleteTestRows,
  findTestRows,
  listStoragePrefix,
  pngBuffer,
  resetTestCheckpointTasks,
} from "./helpers/data";

/**
 * Functional walkthrough of every user-facing flow, as each demo role.
 *
 *   LIVE_BASE=https://explrpathways.org TARGET_BASE=http://localhost:5173 PW_PORT=5173 \
 *     npx playwright test e2e/flows.spec.ts --workers=1 --reporter=list
 *
 * Skipped unless LIVE_BASE is set: the demo accounts only exist where the
 * server has the service-role key. Sessions are obtained on the live /demo
 * page and replayed on TARGET_BASE (the code under test). Flows that call a
 * service-role server function (picture sign-in, passport-card QR, family
 * codes, stamp links, sign-in cards) run on SERVER_BASE instead, which
 * defaults to the live site — the data behind them is the same project.
 *
 * Every record the walkthrough creates is prefixed "E2E-TEST" and removed in
 * the same test or in the role's afterAll; nothing seeded is touched.
 */

test.skip(!LIVE_BASE, "LIVE_BASE not set");
test.setTimeout(180_000);

const T = (p: string) => `${TARGET_BASE}${p}`;
const S = (p: string) => `${SERVER_BASE}${p}`;
const E2E = "E2E-TEST";
const SUPERVISOR_EMAIL = "e2e-supervisor@example.org";
const SLOW = { timeout: 20_000 };

async function roleContext(browser: Browser) {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.on("dialog", (d) => d.accept());
  return { context, page };
}

function note(message: string) {
  test.info().annotations.push({ type: "note", description: message });
}

/** Wait for the passport sheet (the slow data load behind /student). */
async function sheet(page: Page) {
  const article = page.locator("main article").first();
  await expect(article).toBeVisible(SLOW);
  return article;
}

/** Fill the "add an experience" form; exposure types have no supervisor fields. */
async function addExperience(
  page: Page,
  session: Session,
  o: {
    type: string;
    title: string;
    org?: string;
    hours: string;
    supervisor?: { name: string; email: string };
  },
) {
  await openAs(page, TARGET_BASE, session, "/student/experiences/new");
  await expect(page.locator("#exp-type")).toBeVisible(SLOW);
  await page.locator("#exp-type").selectOption(o.type);
  await page.locator("#exp-title").fill(o.title);
  if (o.org) await page.locator("#exp-org").fill(o.org);
  await page.locator("#exp-start").fill("2026-09-01");
  await page.locator("#exp-end").fill("2026-09-01");
  await page.locator("#exp-hours").fill(o.hours);
  if (o.supervisor) {
    await page.locator("#exp-sup-name").fill(o.supervisor.name);
    await page.locator("#exp-sup-email").fill(o.supervisor.email);
  }
  await page.getByRole("button", { name: /Add sticker|Add to my passport/ }).click();
  await page.waitForURL(/\/student$/, SLOW);
}

/** Remove an experience row through the list UI (confirm() is auto-accepted). */
async function removeExperience(page: Page, session: Session, title: string) {
  await openAs(page, TARGET_BASE, session, "/student/experiences");
  const row = page.locator("li", { hasText: title });
  await expect(row).toBeVisible(SLOW);
  await row.getByRole("button", { name: `Remove ${title}` }).click();
  await expect(row).toHaveCount(0, SLOW);
}

// ───────────────────────────── Public / sign-in ─────────────────────────────

test.describe("Public pages and sign-in forms", () => {
  test.describe.configure({ mode: "serial" });
  let context: BrowserContext;
  let page: Page;
  test.beforeAll(async ({ browser }) => ({ context, page } = await roleContext(browser)));
  test.afterAll(async () => context?.close());

  test("/family: EXPLR-FAM246 opens Amara's read-only view (live)", async () => {
    await go(page, S("/family"));
    await page.locator("#family-code").fill("EXPLR-FAM246");
    await page.getByRole("button", { name: "Open the passport" }).click();
    await page.waitForURL(/\/family\/view/, { timeout: 45_000 });
    await expect(page.getByRole("heading", { name: "Amara's passport" })).toBeVisible(SLOW);
    await expect(page.getByText("Supply Chain & Pharmacy Operations Intern")).toBeVisible();
    await expect(page.getByText("Sign-offs:")).toBeVisible();
    // The guardian sign-off exists; signing it cannot be undone, so it stays unsigned.
    await expect(page.locator("#ack-name")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "I reviewed this plan with my student" }),
    ).toBeVisible();
  });

  for (const [path, user, pw] of [
    ["/sign-in", "#signin-username", "#signin-password"],
    ["/instructor/sign-in", "#edu-signin-email", "#edu-signin-password"],
    ["/org/sign-in", "#org-email", "#org-password"],
  ] as const) {
    test(`${path}: wrong credentials show an inline error`, async () => {
      await go(page, T(path));
      await page.locator(user).fill("e2e-nobody@example.org");
      await page.locator(pw).fill("definitely-not-the-password");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page.getByRole("alert")).toBeVisible(SLOW);
      expect(new URL(page.url()).pathname).toBe(path);
    });
  }

  test("/forgot-password: submit shows the sent state", async () => {
    await go(page, T("/forgot-password"));
    await page.locator("#fp-email").fill("e2e-nobody@example.org");
    await page.getByRole("button", { name: "Send reset link" }).click();
    const sent = page.getByRole("status");
    const alert = page.getByRole("alert");
    await expect(sent.or(alert)).toBeVisible(SLOW);
    if (await alert.isVisible()) {
      const text = await alert.innerText();
      // Supabase's email rate limit is not an app bug; anything else is.
      expect(text, "unexpected reset error").toMatch(/rate limit|security purposes|too many/i);
      note(`forgot-password hit the auth rate limit: ${text}`);
    } else {
      await expect(sent).toContainText("Check your email");
    }
  });

  for (const [path, fill] of [
    [
      "/sign-up",
      { "#su-first": "E2E Test", "#su-email": "e2e-nobody@example.org", "#su-password": "x" },
    ],
    [
      "/instructor/sign-up",
      {
        "#edu-fullname": "E2E Test",
        "#edu-email": "e2e-nobody@example.org",
        "#edu-password": "x",
      },
    ],
    [
      "/org/sign-up",
      { "#org-name": "E2E Test Org", "#org-email": "e2e-nobody@example.org", "#org-password": "x" },
    ],
  ] as const) {
    test(`${path}: empty submit is blocked by validation (never submitted)`, async () => {
      await go(page, T(path));
      const form = page.locator("form").first();
      await expect(form).toBeVisible(SLOW);
      await form.getByRole("button", { name: /sign up|create|request|register/i }).click();
      // Native required-field validation stops the submit: same URL, invalid form.
      expect(new URL(page.url()).pathname).toBe(path);
      await expect(page.locator("form:invalid")).toHaveCount(1);
      // Fill the fields to prove they take input, then leave without submitting.
      for (const [sel, value] of Object.entries(fill)) await page.locator(sel).fill(value);
      await expect(page.locator(Object.keys(fill)[0])).toHaveValue(Object.values(fill)[0]);
      expect(new URL(page.url()).pathname).toBe(path);
    });
  }
});

// ───────────────────────────────── Amara ─────────────────────────────────

test.describe("Amara (grade 11)", () => {
  test.describe.configure({ mode: "serial" });
  let context: BrowserContext;
  let page: Page;
  let amara: Session;
  let aboutOriginal: string | null = null;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000); // the live demo login can be slow on a cold server
    amara = await signInAs(browser, "amara");
    ({ context, page } = await roleContext(browser));
  });

  test.afterAll(async () => {
    // Belt and braces: anything a failed test left behind.
    const left: string[] = [];
    for (const [table, col] of [
      ["experiences", "title"],
      ["credentials", "title"],
      ["portfolio_pieces", "title"],
    ] as const) {
      try {
        for (const id of await deleteTestRows(amara, table, col)) left.push(`${table}:${id}`);
      } catch (e) {
        left.push(`${table}: ${(e as Error).message}`);
      }
    }
    try {
      await resetTestCheckpointTasks(amara);
    } catch (e) {
      left.push(`checkpoint_tasks: ${(e as Error).message}`);
    }
    try {
      if (amara.userId) await deleteStoragePrefix(amara, "student-photos", `${amara.userId}/`);
    } catch (e) {
      left.push(`student-photos: ${(e as Error).message}`);
    }
    if (left.length) note(`Could not clean up: ${left.join(", ")}`);
    await context?.close();
  });

  test("/student: sheet renders; edit About me and restore it", async () => {
    await openAs(page, TARGET_BASE, amara, "/student");
    const article = await sheet(page);
    await expect(article.getByRole("heading", { level: 1 })).toHaveText("Amara");
    await expect(article.getByText(/^About me/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Families" })).toBeVisible();

    await article.getByRole("button", { name: "Edit", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "About me" });
    await expect(dialog).toBeVisible();
    const textarea = dialog.getByRole("textbox");
    aboutOriginal = await textarea.inputValue();
    const changed = `${E2E} about me: I like figuring out how systems work.`;
    await textarea.fill(changed);
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden(SLOW);
    await expect(article.getByText(changed)).toBeVisible(SLOW);

    await article.getByRole("button", { name: "Edit", exact: true }).click();
    await dialog.getByRole("textbox").fill(aboutOriginal);
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden(SLOW);
    if (aboutOriginal.trim()) await expect(article.getByText(aboutOriginal)).toBeVisible(SLOW);
    await expect(article.getByText(changed)).toHaveCount(0);
  });

  test("/student: picture — emoji, photo upload, remove (storage object cleaned)", async () => {
    await openAs(page, TARGET_BASE, amara, "/student");
    const article = await sheet(page);
    const header = article.locator("header").first();
    const dialog = page.getByRole("dialog", { name: "Your picture" });

    await header.getByRole("button", { name: /Add picture|Change picture/ }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Use 🦊" }).click();
    await expect(dialog).toBeHidden(SLOW);
    await expect(header.getByText("🦊")).toBeVisible(SLOW);

    await header.getByRole("button", { name: "Change picture" }).click();
    await expect(dialog).toBeVisible();
    await dialog.locator("#passport-photo").setInputFiles({
      name: "e2e-test.png",
      mimeType: "image/png",
      buffer: pngBuffer(),
    });
    await expect(dialog).toBeHidden({ timeout: 30_000 });
    const img = header.locator('img[alt="Amara\'s photo"]');
    await expect(img).toBeVisible(SLOW);
    const src = await img.getAttribute("src");
    expect(src).toContain("/student-photos/");
    const stored = await listStoragePrefix(amara, "student-photos", `${amara.userId}/`);
    expect(stored.length, "uploaded photo should exist in storage").toBeGreaterThan(0);

    await header.getByRole("button", { name: "Change picture" }).click();
    await dialog.getByRole("button", { name: "Remove picture" }).click();
    await expect(dialog).toBeHidden(SLOW);
    await expect(img).toHaveCount(0, SLOW);
    await expect(header.getByText("A", { exact: true })).toBeVisible();
    // Removing the picture must also delete the uploaded object, not just the URL.
    await expect
      .poll(() => listStoragePrefix(amara, "student-photos", `${amara.userId}/`), SLOW)
      .toEqual([]);
  });

  test("/student/experiences: add an exposure item and a work item; remove the exposure item", async () => {
    await addExperience(page, amara, {
      type: "job_shadow",
      title: `${E2E} shadow`,
      org: "E2E Clinic",
      hours: "4",
    });
    await addExperience(page, amara, {
      type: "internship_offsite_placement",
      title: `${E2E} internship`,
      org: "E2E Clinic",
      hours: "4",
      supervisor: { name: "E2E Supervisor", email: SUPERVISOR_EMAIL },
    });
    await openAs(page, TARGET_BASE, amara, "/student/experiences");
    const shadow = page.locator("li", { hasText: `${E2E} shadow` });
    const work = page.locator("li", { hasText: `${E2E} internship` });
    await expect(shadow).toBeVisible(SLOW);
    await expect(shadow).toContainText("Sticker");
    await expect(work).toContainText("Self-reported");
    await expect(work.getByRole("button", { name: /Ask for a stamp/ })).toBeVisible();
    await expect(shadow.getByRole("button", { name: /Ask for a stamp/ })).toHaveCount(0);
    await removeExperience(page, amara, `${E2E} shadow`);
  });

  test("stamp flow: ask for a stamp (live) → supervisor link → VERIFIED on the list", async ({
    browser,
  }) => {
    await openAs(page, SERVER_BASE, amara, "/student/experiences");
    const work = page.locator("li", { hasText: `${E2E} internship` });
    await expect(work).toBeVisible(SLOW);
    await work.getByRole("button", { name: /Ask for a stamp/ }).click();
    await work.getByLabel("Supervisor's name").fill("E2E Supervisor");
    await work.getByLabel("Their email").fill(SUPERVISOR_EMAIL);
    await work.getByRole("button", { name: "Send the link" }).click();
    const status = work.getByRole("status");
    await expect(status).toBeVisible({ timeout: 45_000 });
    const link = (await status.locator("code").innerText()).trim();
    expect(link).toMatch(/\/stamp\/[A-Za-z0-9_-]{16,}$/);
    if ((await status.innerText()).includes("Email didn't go out"))
      note("Stamp email not sent (no Resend key); the link was still issued.");
    await expect(work).toContainText("Waiting for stamp");

    // The supervisor needs no account: open the link in a fresh context.
    const sup = await browser.newContext();
    const sp = await sup.newPage();
    try {
      await go(sp, link);
      await expect(sp.getByRole("heading", { name: "Did Amara do this?" })).toBeVisible({
        timeout: 45_000,
      });
      await sp.locator("#st-hours").fill("4");
      await sp.getByRole("checkbox").first().check(); // duties are accurate
      await sp
        .getByRole("group", { name: "Career Management rating" })
        .getByRole("button", { name: "3 Proficient" })
        .click();
      await sp
        .getByRole("group", { name: "Oral and Written Communications rating" })
        .getByRole("button", { name: "4 Expert" })
        .click();
      await sp.locator("#st-name").fill("E2E Supervisor");
      await sp.locator("#st-title").fill("E2E lead");
      await sp.getByRole("checkbox").last().check(); // the statement
      await sp.getByRole("button", { name: "Stamp this experience" }).click();
      await expect(sp.getByRole("status")).toContainText("Stamped.", { timeout: 45_000 });
    } finally {
      await sup.close();
    }

    await openAs(page, TARGET_BASE, amara, "/student/experiences");
    await expect(work).toBeVisible(SLOW);
    await expect(work).toContainText("Verified");
    await expect(work).toContainText("4 verified");
    await expect(work.getByRole("button", { name: /^Remove/ })).toHaveCount(0);
    await openAs(page, TARGET_BASE, amara, "/student");
    const article = await sheet(page);
    await expect(article.getByText(`${E2E} internship`)).toBeVisible();
    await expect(article.getByText("Stamped by E2E Supervisor")).toBeVisible();

    // A verified row has no Remove button by design; the owner can still delete it (RLS).
    const left = await deleteTestRows(amara, "experiences", "title");
    expect(left, "verified E2E experience could not be deleted").toEqual([]);
    await page.reload();
    await expect((await sheet(page)).getByText(`${E2E} internship`)).toHaveCount(0);
  });

  test("/student/credentials: add and remove", async () => {
    await openAs(page, TARGET_BASE, amara, "/student/credentials");
    await page.locator("#cred-title").fill(`${E2E} credential`);
    await page.locator("#cred-issuer").fill("E2E Issuer");
    await page.locator("#cred-url").fill("https://example.org/e2e-proof");
    await page.getByRole("button", { name: "Add credential" }).click();
    const row = page.locator("li", { hasText: `${E2E} credential` });
    await expect(row).toBeVisible(SLOW);
    await expect(page.locator("#cred-title")).toHaveValue("");
    await row.getByRole("button", { name: `Remove ${E2E} credential` }).click();
    await expect(row).toHaveCount(0, SLOW);
  });

  test("/student/pieces: add and remove", async () => {
    await openAs(page, TARGET_BASE, amara, "/student/pieces");
    await page.locator("#pc-title").fill(`${E2E} piece`);
    await page.locator("#pc-url").fill("https://example.org/e2e-piece");
    await page.getByRole("button", { name: "Teamwork" }).click();
    await page.getByRole("button", { name: "Add to my gallery" }).click();
    const row = page.locator("li", { hasText: `${E2E} piece` });
    await expect(row).toBeVisible(SLOW);
    await expect(page.locator("#pc-title")).toHaveValue("");
    await row.getByRole("button", { name: `Remove ${E2E} piece` }).click();
    await expect(row).toHaveCount(0, SLOW);
  });

  test("/student/skills: rated skills render", async () => {
    await openAs(page, TARGET_BASE, amara, "/student/skills");
    await expect(page.getByRole("heading", { name: "What supervisors have seen." })).toBeVisible();
    await expect(page.getByText(/of 15 skills at Proficient/)).toBeVisible(SLOW);
    await expect(page.getByText("Teamwork/Collaboration")).toBeVisible();
    await expect(page.getByText(/Proficient · \d+ rater/).first()).toBeVisible(SLOW);
  });

  test("/student/checkpoints: save a form task, it shows done, then restore", async () => {
    await openAs(page, TARGET_BASE, amara, "/student/checkpoints");
    await expect(page.getByText("Fall · grade 11")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Spring · grade 11")).toBeVisible();
    const spring = page.locator("section", { hasText: "Spring · grade 11" }).first();
    const first = spring.locator("li", { has: page.locator("textarea[id^='task-']") }).first();
    await expect(first.locator("textarea[id^='task-']")).toBeVisible(SLOW);
    // Pin the task by id: once it saves and closes, "first open task" is the next one.
    const taskId = await first.locator("textarea[id^='task-']").getAttribute("id");
    const textarea = page.locator(`#${taskId}`);
    const label = (
      await spring
        .locator("li", { has: page.locator(`#${taskId}`) })
        .first()
        .locator("p.font-medium")
        .first()
        .innerText()
    ).trim();
    // After saving, the textarea unmounts, so address the task by its label from here on.
    const item = spring
      .locator("li")
      .filter({ has: page.locator("p.font-medium", { hasText: label }) })
      .first();
    await textarea.fill(`${E2E} answer for ${label}`);
    await item.getByRole("button", { name: "Save" }).click();
    await expect(textarea).toBeHidden(SLOW);
    await expect(item.getByRole("button", { name: `Edit ${label}` })).toBeVisible(SLOW);
    await page.reload();
    await expect(page.getByText("Spring · grade 11")).toBeVisible({ timeout: 30_000 });
    const after = page
      .locator("section", { hasText: "Spring · grade 11" })
      .first()
      .locator("li")
      .filter({ has: page.locator("p.font-medium", { hasText: label }) })
      .first();
    await expect(after.getByRole("button", { name: `Edit ${label}` })).toBeVisible(SLOW);
    expect(await resetTestCheckpointTasks(amara)).toBe(1);
  });

  test("/student/profile: edit a field, reload, restore", async () => {
    await openAs(page, TARGET_BASE, amara, "/student/profile");
    const major = page.locator("#pf-major");
    await expect(major).toBeVisible(SLOW);
    const original = await major.inputValue();
    await major.fill(`${E2E} major`);
    await page.getByRole("button", { name: "Save and continue" }).click();
    await page.waitForURL(/\/student\/apply/, SLOW);
    await openAs(page, TARGET_BASE, amara, "/student/profile");
    await expect(major).toHaveValue(`${E2E} major`, SLOW);
    await major.fill(original);
    await page.getByRole("button", { name: "Save and continue" }).click();
    await page.waitForURL(/\/student\/apply/, SLOW);
    await openAs(page, TARGET_BASE, amara, "/student/profile");
    await expect(major).toHaveValue(original, SLOW);
  });

  test("/student/apply: the demo internship is listed as Requested", async () => {
    await openAs(page, TARGET_BASE, amara, "/student/apply");
    const row = page.locator("li", { hasText: "Supply Chain & Pharmacy Operations Intern" });
    await expect(row.first()).toBeVisible(SLOW);
    await expect(page.getByText("Requested", { exact: true }).first()).toBeVisible();
  });

  test("/student/pathway: tabs work; family code create + revoke (live)", async () => {
    await openAs(page, TARGET_BASE, amara, "/student/pathway");
    await expect(page.getByRole("tab", { name: "My pathway" })).toHaveAttribute(
      "aria-selected",
      "true",
      SLOW,
    );
    await page.getByRole("tab", { name: "For families" }).click();
    await expect(page.getByRole("tab", { name: "For families" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("heading", { name: "Family code" })).toBeVisible();
    await page.getByRole("tab", { name: "My pathway" }).click();
    await expect(page.getByRole("heading", { name: "Family code" })).toHaveCount(0);

    await openAs(page, SERVER_BASE, amara, "/student/pathway?tab=families");
    await expect(page.getByRole("heading", { name: "Family code" })).toBeVisible(SLOW);
    await page.locator("#family-code-label").fill(E2E);
    await page.getByRole("button", { name: "Make a code" }).click();
    const fresh = page.getByRole("status").filter({ hasText: "Your new code" });
    await expect(fresh).toBeVisible({ timeout: 45_000 });
    await expect(fresh.locator("p").last()).toHaveText(/^EXPLR-[A-Z0-9]{4,}$/);
    const row = page.locator("li", { hasText: E2E });
    await expect(row).toBeVisible(SLOW);
    await row.getByRole("button", { name: `Turn off code for ${E2E}` }).click();
    await expect(row).toHaveCount(0, { timeout: 45_000 });
  });

  test("/student: every export downloads a file", async () => {
    await openAs(page, TARGET_BASE, amara, "/student");
    const article = await sheet(page);
    const buttons: Array<[string, RegExp]> = [
      ["250-hour log (PDF)", /^explr-wbl-hours-amara\.pdf$/],
      ["250-hour log (CSV)", /^explr-wbl-hours-amara\.csv$/],
      ["Readiness Seal evidence", /^explr-readiness-seal-amara\.pdf$/],
      ["Resume (PDF)", /^explr-resume-amara\.pdf$/],
      ["Resume (text for OhioMeansJobs)", /^explr-resume-amara\.txt$/],
      ["Open Badges (draft JSON)", /^explr-open-badges-amara\.json$/],
    ];
    for (const [name, filename] of buttons) {
      const [download] = await Promise.all([
        page.waitForEvent("download", SLOW),
        article.getByRole("button", { name, exact: true }).click(),
      ]);
      expect(download.suggestedFilename(), name).toMatch(filename);
    }
  });
});

// ────────────────────────────────── Mia ──────────────────────────────────

test.describe("Mia (grade 6, explore)", () => {
  test.describe.configure({ mode: "serial" });
  let context: BrowserContext;
  let page: Page;
  let mia: Session;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000); // the live demo login can be slow on a cold server
    mia = await signInAs(browser, "mia");
    ({ context, page } = await roleContext(browser));
  });

  test.afterAll(async () => {
    try {
      const left = await deleteTestRows(mia, "experiences", "title");
      if (left.length) note(`Could not clean up experiences: ${left.join(", ")}`);
    } catch (e) {
      note(`cleanup: ${(e as Error).message}`);
    }
    await context?.close();
  });

  test("/student: explore density, stamps and stickers; emoji picture pick + remove", async () => {
    await openAs(page, TARGET_BASE, mia, "/student");
    const article = await sheet(page);
    await expect(page.locator("[data-density='explore']").first()).toBeVisible();
    await expect(article.getByRole("heading", { level: 1 })).toHaveText("Hi, Mia!");
    await expect(article.getByText("Stamps I've collected")).toBeVisible();
    await expect(article.getByText("EXPLR Robotics Camp", { exact: true })).toBeVisible();
    await expect(article.getByText("My stickers.")).toBeVisible();
    // No photo upload or ratings for grades 4-8.
    const header = article.locator("header").first();
    const dialog = page.getByRole("dialog", { name: "Your picture" });
    await header.getByRole("button", { name: /Add picture|Change picture/ }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("#passport-photo")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Use 🐢" }).click();
    await expect(dialog).toBeHidden(SLOW);
    await expect(header.getByText("🐢")).toBeVisible(SLOW);
    await header.getByRole("button", { name: "Change picture" }).click();
    await dialog.getByRole("button", { name: "Remove picture" }).click();
    await expect(dialog).toBeHidden(SLOW);
    await expect(header.getByText("M", { exact: true })).toBeVisible(SLOW);
  });

  test("/student/experiences/new: add a sticker, see it, remove it", async () => {
    await addExperience(page, mia, {
      type: "career_day_speaker_fair",
      title: `${E2E} zoo day`,
      hours: "2",
    });
    const article = await sheet(page);
    await expect(article.getByText(`${E2E} zoo day`)).toBeVisible(SLOW);
    await removeExperience(page, mia, `${E2E} zoo day`);
  });

  test("/student/checkpoints renders fall and spring", async () => {
    await openAs(page, TARGET_BASE, mia, "/student/checkpoints");
    await expect(page.getByText("Fall · grade 6")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Spring · grade 6")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Little goals on your path." })).toBeVisible();
  });

  test("/go/<card token> opens Mia's passport (live)", async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    try {
      await p.goto(S("/go/demo-mia-passport-card"));
      await p.waitForURL(/\/student$/, { timeout: 45_000 });
      await expect(p.getByRole("heading", { name: "Hi, Mia!" })).toBeVisible({ timeout: 30_000 });
    } finally {
      await ctx.close();
    }
  });

  test("/explore: class code → picture → shapes → passport, then sign out (live)", async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    try {
      await go(p, S("/explore"));
      await p.locator("#class-code").fill("DEMO-46");
      await p.getByRole("button", { name: "Find my class" }).click();
      await p.waitForURL(/\/explore\/DEMO-46/);
      const tile = p.getByRole("button", { name: /^Mia/ });
      await expect(tile).toBeVisible({ timeout: 45_000 });
      await tile.click();
      await expect(p.getByRole("heading", { name: "Hi, Mia!" })).toBeVisible();
      for (const shape of ["star", "leaf", "sun"])
        await p.getByRole("button", { name: shape, exact: true }).click();
      await p.waitForURL(/\/student$/, { timeout: 45_000 });
      await expect(p.locator("[data-density='explore']").first()).toBeVisible({ timeout: 30_000 });
      await expect(p.getByRole("heading", { name: "Hi, Mia!" })).toBeVisible({ timeout: 30_000 });

      await p.goto(S("/sign-out"));
      await p.waitForURL((u) => u.pathname === "/", { timeout: 30_000 });
      const authKeys = await p.evaluate(() =>
        Object.keys(localStorage).filter((k) => /^sb-.*-auth-token$/.test(k)),
      );
      expect(authKeys).toEqual([]);
    } finally {
      await ctx.close();
      forgetSession("mia"); // a global sign-out revoked the cached refresh token
    }
  });
});

// ───────────────────────────────── Family ─────────────────────────────────

test.describe("Family (code holder)", () => {
  test.describe.configure({ mode: "serial" });
  test("/family/view shows results, verified experiences, and plan sign-offs (live)", async ({
    browser,
  }) => {
    const family = await signInAs(browser, "family");
    expect(family.familyToken, "family token from the demo login").toBeTruthy();
    const { context, page } = await roleContext(browser);
    try {
      await go(page, S(`/family/view?t=${family.familyToken}`));
      await expect(page.getByRole("heading", { name: "Amara's passport" })).toBeVisible({
        timeout: 45_000,
      });
      await expect(page.getByText("This year's plan")).toBeVisible();
      await expect(page.getByText(/Fall checkpoint: submitted/)).toBeVisible();
      await expect(page.getByText("Stamped experiences")).toBeVisible();
      await expect(page.getByText("Supply Chain & Pharmacy Operations Intern")).toBeVisible();
      await expect(page.getByText("Sign-offs:")).toBeVisible();
      await expect(page.getByText("student signed")).toBeAttached();
      await expect(page.getByText("family not yet signed")).toBeAttached();
      await expect(page.getByText(/Holland code/i).first()).toBeVisible();
    } finally {
      await context.close();
    }
  });
});

// ──────────────────────────────── Partner ────────────────────────────────

test.describe("Partner (Lakeshore Health Partners)", () => {
  test.describe.configure({ mode: "serial" });
  let context: BrowserContext;
  let page: Page;
  let partner: Session;
  let draftId: string | null = null;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000); // the live demo login can be slow on a cold server
    partner = await signInAs(browser, "partner");
    ({ context, page } = await roleContext(browser));
  });

  test.afterAll(async () => {
    const left: string[] = [];
    try {
      for (const id of await deleteTestRows(partner, "opportunities", "name"))
        left.push(`opportunities:${id}`);
    } catch (e) {
      left.push(`opportunities: ${(e as Error).message}`);
    }
    if (draftId) {
      try {
        await deleteStoragePrefix(partner, "org-media", `opportunity/${draftId}/`);
      } catch (e) {
        left.push(`org-media: ${(e as Error).message}`);
      }
    }
    if (left.length) note(`Could not clean up: ${left.join(", ")}`);
    await context?.close();
  });

  test("/org lists the three demo opportunities with statuses and the camp registration", async () => {
    await openAs(page, TARGET_BASE, partner, "/org");
    await expect(page.getByRole("heading", { name: "Lakeshore Health Partners" })).toBeVisible(
      SLOW,
    );
    for (const [name, status] of [
      ["Supply Chain & Pharmacy Operations Intern", "Approved"],
      ["BioMed Explorers Camp", "Approved"],
      ["Hospital Career Day", "In review"],
    ]) {
      const row = page.locator("li", { hasText: name }).first();
      await expect(row).toBeVisible(SLOW);
      await expect(row).toContainText(status);
    }
    await expect(page.getByText("Jordan Lee")).toBeVisible(SLOW);
  });

  test("/org/applicants renders", async () => {
    await openAs(page, TARGET_BASE, partner, "/org/applicants");
    await expect(page.getByRole("heading", { name: "Applicants." })).toBeVisible(SLOW);
    await expect(page.getByRole("status")).toBeHidden({ timeout: 30_000 });
    const body = await page.locator("main").innerText();
    if (!/Amara/.test(body))
      note(
        "Amara's internship request is status 'requested'; /org/applicants lists only 'submitted' applications, so it is not shown there (it shows under /org registrations once submitted).",
      );
  });

  test("/org/new wizard: workshop draft with a photo, saved, reopened, deleted", async () => {
    await openAs(page, TARGET_BASE, partner, "/org/new");
    await page.getByRole("button", { name: /^Workshop/ }).click();
    const current = page.locator("[aria-current='step']");
    await expect(current).toBeVisible(SLOW);
    const name = `${E2E} workshop`;
    let uploaded = false;

    for (let i = 0; i < 12; i++) {
      // textContent, not innerText: the rail is CSS-uppercased.
      const title = ((await current.textContent()) ?? "").replace(/^\d+\.\s*/, "").trim();
      if (title === "The basics") {
        await page.locator("#opp-name").fill(name);
        await page.locator("#opp-description").fill(`${E2E} description of a half-day workshop.`);
      } else if (title === "When") {
        await page.getByLabel("Start date").fill("2027-03-01");
        // One-time types (workshop) have no end date input.
        const end = page.getByLabel("End date");
        if (await end.count()) await end.fill("2027-03-01");
      } else if (title === "Where & registration") {
        await page.locator("#opp-location").fill(`${E2E} site · Cleveland, OH`);
      } else if (title === "Who & cost") {
        await page.locator("#opp-capacity").fill("20");
      } else if (title === "Work-based learning") {
        await page.locator("#wbl-transport").fill(`${E2E}: bus line 22 stops outside.`);
      } else if (title === "Photo & logo") {
        await page.getByLabel("Upload photo").setInputFiles({
          name: "e2e-test.png",
          mimeType: "image/png",
          buffer: pngBuffer(64, [247, 201, 72]),
        });
        const img = page.locator("img[src*='/org-media/opportunity/']");
        await expect(img).toBeVisible({ timeout: 30_000 });
        // Track the row id now, so afterAll can clean the photo even if a later step fails.
        draftId =
          (await img.getAttribute("src"))?.match(/\/org-media\/opportunity\/([^/]+)\//)?.[1] ??
          null;
        uploaded = true;
      } else if (title === "More details") {
        for (const el of await page.locator("[id^='custom-']").all()) {
          const tag = await el.evaluate((n) => n.tagName.toLowerCase());
          if (tag === "select") await el.selectOption({ index: 1 });
          else if (tag !== "input" || (await el.getAttribute("type")) !== "checkbox")
            await el.fill(E2E);
        }
      } else if (title === "Review") {
        break;
      }
      await page.getByRole("button", { name: "Next →" }).click();
      const alert = page.getByRole("alert");
      if (await alert.isVisible())
        throw new Error(`Wizard step "${title}" refused: ${await alert.innerText()}`);
    }
    expect(uploaded, "photo & logo step reached").toBe(true);
    await expect(page.getByText("Review & submit")).toBeVisible();

    await page.getByRole("button", { name: "Save draft" }).click();
    await page.waitForURL(/\/org$/, SLOW);
    const row = page.locator("li", { hasText: name }).first();
    await expect(row).toBeVisible(SLOW);
    await expect(row).toContainText("Draft");
    await row.getByRole("link").click();
    await page.waitForURL(/\/org\/new\?id=/, SLOW);
    expect(new URL(page.url()).searchParams.get("id")).toBe(draftId);
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible(SLOW);
    expect(await listStoragePrefix(partner, "org-media", `opportunity/${draftId}/`)).toHaveLength(
      1,
    );

    await page.getByRole("button", { name: "Delete draft" }).click();
    await page.waitForURL(/\/org$/, SLOW);
    await expect(page.getByRole("heading", { name: "Lakeshore Health Partners" })).toBeVisible(
      SLOW,
    );
    await expect(page.locator("li", { hasText: name })).toHaveCount(0, SLOW);
    expect(await findTestRows(partner, "opportunities", "name")).toEqual([]);
    // Deleting the draft also removes its uploaded photo.
    await expect
      .poll(() => listStoragePrefix(partner, "org-media", `opportunity/${draftId}/`), SLOW)
      .toEqual([]);
  });
});

// ─────────────────────────────── Instructor ───────────────────────────────

test.describe("Instructor (Dana Okafor)", () => {
  test.describe.configure({ mode: "serial" });
  let context: BrowserContext;
  let page: Page;
  let instructor: Session;
  let classId: string | null = null;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000); // the live demo login can be slow on a cold server
    instructor = await signInAs(browser, "instructor");
    ({ context, page } = await roleContext(browser));
  });
  test.afterAll(async () => context?.close());

  test("/instructor/dashboard lists both classes", async () => {
    await openAs(page, TARGET_BASE, instructor, "/instructor/dashboard");
    await expect(page.getByRole("heading", { name: "Welcome, Dana." })).toBeVisible(SLOW);
    await expect(page.getByText("Pathways Explorers · Grade 6")).toBeVisible(SLOW);
    await expect(page.getByText("Career Pathways · Grade 11")).toBeVisible();
    await expect(page.getByText("DEMO-46")).toBeVisible();
    const href = await page
      .getByRole("link", { name: "Picture sign-in cards" })
      .getAttribute("href");
    classId = href?.match(/\/instructor\/explore-cards\/class\/([^/?#]+)/)?.[1] ?? null;
    expect(classId, "class id from the sign-in cards link").toBeTruthy();
  });

  test("/instructor/students shows Amara and Mia", async () => {
    await openAs(page, TARGET_BASE, instructor, "/instructor/students");
    await expect(page.getByRole("heading", { name: "Students" })).toBeVisible(SLOW);
    const table = page.locator("table");
    await expect(table.getByText("Amara")).toBeVisible(SLOW);
    await expect(table.getByText("Mia")).toBeVisible();
  });

  test("/instructor/checkpoints: add and remove an advisor note (never mark reviewed)", async () => {
    await openAs(page, TARGET_BASE, instructor, "/instructor/checkpoints");
    const row = page.locator("tr", { hasText: "Amara" });
    await expect(row).toBeVisible(SLOW);
    await expect(row).toContainText("ready to review");
    await row.getByRole("link", { name: /Review/ }).click();
    await page.waitForURL(/\/instructor\/checkpoints\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "Amara", level: 1 })).toBeVisible(SLOW);
    const fall = page.locator("article", { hasText: "Where am I headed?" });
    const notes = fall.getByLabel("Advisor notes (the student sees these)");
    await expect(notes).toBeVisible(SLOW);
    const original = await notes.inputValue();
    await notes.fill(`${E2E} note`);
    await fall.getByRole("button", { name: "Save notes" }).click();
    await expect(fall.getByRole("button", { name: "Save notes" })).toBeEnabled(SLOW);
    await page.reload();
    await expect(notes).toHaveValue(`${E2E} note`, SLOW);
    await notes.fill(original);
    await fall.getByRole("button", { name: "Save notes" }).click();
    await expect(fall.getByRole("button", { name: "Save notes" })).toBeEnabled(SLOW);
    await page.reload();
    await expect(notes).toHaveValue(original, SLOW);
    await expect(fall).toContainText("submitted");
  });

  test("/instructor/login-display renders", async () => {
    await openAs(page, TARGET_BASE, instructor, "/instructor/login-display");
    await expect(page.getByRole("heading", { name: /log in/ })).toBeVisible(SLOW);
    await expect(page.getByText(/\/sign-in$/)).toBeVisible(SLOW);
  });

  test("/instructor/explore-cards/class/<id> renders Mia's card (live)", async () => {
    expect(classId).toBeTruthy();
    await openAs(page, SERVER_BASE, instructor, `/instructor/explore-cards/class/${classId}`);
    await expect(page.getByText("DEMO-46").first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("Mia").first()).toBeVisible(SLOW);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});
