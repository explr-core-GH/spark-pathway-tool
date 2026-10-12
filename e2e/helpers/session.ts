import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Browser, Page } from "@playwright/test";

/**
 * Demo-role sessions for the functional walkthrough.
 *
 * The demo accounts, the magic-link exchange, family codes, the picture
 * sign-in, and stamp links all go through server functions that need the
 * service-role key — only the deployed server has it. So every role signs in
 * ONCE on `LIVE_BASE/demo`, and the resulting Supabase auth entry (which is
 * just localStorage) is copied into whichever origin a test runs on. Both
 * origins talk to the same Supabase project, so the token is valid on each.
 */

export const LIVE_BASE = process.env.LIVE_BASE?.replace(/\/$/, "") ?? "";
export const TARGET_BASE = (process.env.TARGET_BASE ?? "http://localhost:5173").replace(/\/$/, "");
/** Where flows that call service-role server functions run (defaults to the live site). */
export const SERVER_BASE = (process.env.SERVER_BASE ?? LIVE_BASE).replace(/\/$/, "");

export type Role = "mia" | "amara" | "family" | "partner" | "instructor";

export const DEMO_BUTTON: Record<Role, string> = {
  mia: "Enter as Mia",
  amara: "Enter as Amara",
  family: "Enter as Amara's family",
  partner: "Enter as Lakeshore Health Partners",
  instructor: "Enter as Dana Okafor",
};

export const FAMILY_TOKEN_KEY = "explr.family.token";
const AUTH_KEY = /^sb-.*-auth-token$/;

export type Session = {
  role: Role;
  /** localStorage entries to replay on another origin. */
  items: Record<string, string>;
  accessToken: string | null;
  userId: string | null;
  familyToken: string | null;
  obtainedAt: number;
};

const cache = new Map<Role, Session>();
/** Re-login after this long: the access token lasts an hour and we never want a refresh race between origins. */
const MAX_AGE_MS = 40 * 60 * 1000;

/** Sign in as a demo role on the live site (once per role) and return the session to replay. */
export async function signInAs(browser: Browser, role: Role): Promise<Session> {
  const hit = cache.get(role);
  if (hit && Date.now() - hit.obtainedAt < MAX_AGE_MS) return hit;
  if (!LIVE_BASE) throw new Error("LIVE_BASE is required to obtain demo sessions");

  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${LIVE_BASE}/demo`, { waitUntil: "load" });
    const button = page.getByRole("button", { name: DEMO_BUTTON[role], exact: true });
    await button.waitFor({ state: "visible", timeout: 30_000 });
    // Disabled until demoStatus() resolves.
    await page.waitForFunction(
      (name) =>
        !Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.trim() === name)
          ?.disabled,
      DEMO_BUTTON[role],
      { timeout: 30_000 },
    );
    await button.click();
    await page.waitForURL((u) => !u.pathname.startsWith("/demo"), { timeout: 45_000 });
    // The auth entry is written before the navigation; poll briefly anyway.
    await page.waitForFunction(
      ({ key, authRe }) =>
        Object.keys(localStorage).some((k) => new RegExp(authRe).test(k) || k === key),
      { key: FAMILY_TOKEN_KEY, authRe: AUTH_KEY.source },
      { timeout: 15_000 },
    );
    const items = await page.evaluate(
      ({ key, authRe }) => {
        const out: Record<string, string> = {};
        const re = new RegExp(authRe);
        for (const k of Object.keys(localStorage)) {
          if (re.test(k) || k === key) out[k] = localStorage.getItem(k) ?? "";
        }
        return out;
      },
      { key: FAMILY_TOKEN_KEY, authRe: AUTH_KEY.source },
    );
    const authKey = Object.keys(items).find((k) => AUTH_KEY.test(k));
    let accessToken: string | null = null;
    let userId: string | null = null;
    if (authKey) {
      try {
        const parsed = JSON.parse(items[authKey]) as {
          access_token?: string;
          user?: { id?: string };
        };
        accessToken = parsed.access_token ?? null;
        userId = parsed.user?.id ?? null;
      } catch {
        // leave null; tests that need it will fail loudly
      }
    }
    const session: Session = {
      role,
      items,
      accessToken,
      userId,
      familyToken: items[FAMILY_TOKEN_KEY] ?? null,
      obtainedAt: Date.now(),
    };
    cache.set(role, session);
    return session;
  } finally {
    await context.close();
  }
}

/** Forget a cached session (after a global sign-out revokes its refresh token). */
export function forgetSession(role: Role) {
  cache.delete(role);
}

/**
 * Pages are server-rendered; React hydrates afterwards and controlled inputs
 * reset to their state values when it does. Typing before that point is lost,
 * so every navigation waits until React has attached to the main element.
 */
export async function waitForHydration(page: Page) {
  await page.waitForFunction(
    () => {
      const el = document.querySelector("main") ?? document.body;
      return !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber"));
    },
    undefined,
    { timeout: 30_000 },
  );
}

/** `page.goto` that resolves only once the page is hydrated. */
export async function go(page: Page, url: string) {
  await page.goto(url, { waitUntil: "load" });
  await waitForHydration(page);
}

/**
 * Replay a session on an origin: visit a light public page there, write the
 * localStorage entries, and return. Subsequent `page.goto(base + path)` calls
 * load the app signed in.
 */
export async function seedSession(page: Page, base: string, session: Session) {
  await page.goto(`${base}/accessibility`, { waitUntil: "domcontentloaded" });
  await page.evaluate((items) => {
    for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
  }, session.items);
}

/** `page.goto` with the session seeded on that origin first (idempotent per origin). */
export async function openAs(page: Page, base: string, session: Session, path: string) {
  const origin = (() => {
    try {
      return new URL(page.url()).origin;
    } catch {
      return "";
    }
  })();
  const seeded =
    origin === new URL(base).origin
      ? await page.evaluate(
          (keys) => keys.every((k) => localStorage.getItem(k) !== null),
          Object.keys(session.items),
        )
      : false;
  if (!seeded) await seedSession(page, base, session);
  await go(page, `${base}${path}`);
}

/** Supabase URL + anon key from `.env` (no dotenv dependency). */
export function supabaseEnv(): { url: string; anonKey: string } {
  const env: Record<string, string> = {};
  for (const file of [".env", ".env.local"]) {
    try {
      const text = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    } catch {
      // optional file
    }
  }
  const url = process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
  const anonKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) throw new Error("Supabase URL / publishable key not found in .env");
  return { url, anonKey };
}
