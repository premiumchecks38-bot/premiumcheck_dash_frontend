import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Browser, type Page } from "@playwright/test";

/** Shared helpers for the end to end tests (see playwright.config.ts for the servers). */

export const BACKEND_URL = "http://localhost:8100/api/v1";

const BACKEND_DIR = resolve(import.meta.dirname, "../../../premiumcheck_backend");
const CREDENTIALS = join(BACKEND_DIR, "var", "e2e-dashboard.json");
// Outside test-results, which Playwright empties at the start of every run.
const USED_CODES = join(tmpdir(), "ppc-dashboard-e2e-used-codes.json");

type BookingRole =
  | "today_paid"
  | "pay_later"
  | "pending"
  | "attention"
  | "offline"
  | "disputed"
  | "big_paid"
  | "completed_soon"
  | "completed_later"
  | "cancelled"
  | "no_show";

interface Credentials {
  password: string;
  owner: { email: string; totp_secret: string; backup_codes: string[] };
  admin: { email: string };
  manager: { email: string };
  editor: { email: string };
  reset: { email: string };
  payments: { email: string };
  manager_pages: string[];
  /** Seeded booking references by role (see seed_bookings in the backend script). */
  bookings: Record<BookingRole, string>;
  email_dir: string;
}

/** Written by the backend e2e script when its server starts, so read lazily. */
export function credentials(): Credentials {
  return JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Credentials;
}

// One time codes: the backend refuses a code that was used in the last 90 seconds, so the
// tests remember which time windows and backup codes they have spent (across worker restarts).

interface Spent {
  secret: string;
  windows: number[];
  backup: string[];
}

function spent(secret: string): Spent {
  try {
    const data = JSON.parse(readFileSync(USED_CODES, "utf8")) as Spent;
    if (data.secret === secret) return data;
  } catch {
    // First use.
  }
  return { secret, windows: [], backup: [] };
}

function save(data: Spent): void {
  mkdirSync(resolve(USED_CODES, ".."), { recursive: true });
  writeFileSync(USED_CODES, JSON.stringify(data));
}

function base32(secret: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  }
  const bytes = bits.match(/.{8}/g) ?? [];
  return Buffer.from(bytes.map((b) => parseInt(b, 2)));
}

/** RFC 6238 code for one 30 second window. */
export function totpAt(secret: string, window: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(window));
  const hmac = createHmac("sha1", base32(secret)).update(counter).digest();
  const offset = (hmac[hmac.length - 1] ?? 0) & 0xf;
  const value = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return value.toString().padStart(6, "0");
}

/**
 * A code the backend will accept now: the current or next window (it allows one either side)
 * that has not been used yet, or null when both are spent.
 */
export function freshTotp(secret: string): string | null {
  const data = spent(secret);
  const now = Math.floor(Date.now() / 30_000);
  // Avoid the last two seconds of a window: the code could expire on the way.
  const candidates = Date.now() % 30_000 > 28_000 ? [now + 1] : [now, now + 1];
  const window = candidates.find((w) => !data.windows.includes(w));
  if (window === undefined) return null;
  data.windows = [...data.windows.filter((w) => w >= now - 2), window];
  save(data);
  return totpAt(secret, window);
}

/** An unused backup code for the owner. */
export function freshBackupCode(): string {
  const { owner } = credentials();
  const data = spent(owner.totp_secret);
  const code = owner.backup_codes.find((c) => !data.backup.includes(c));
  if (!code) throw new Error("Every owner backup code has been used.");
  data.backup.push(code);
  save(data);
  return code;
}

export async function fillLogin(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel("Email address").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function enterTotp(page: Page, code: string): Promise<void> {
  await page.getByRole("group", { name: "6 digit code" }).getByRole("textbox").first().fill(code);
}

/** Sign in as the owner, with an authenticator code when one is free, else a backup code. */
export async function loginAsOwner(page: Page, next?: string): Promise<void> {
  const { owner, password } = credentials();
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await fillLogin(page, owner.email, password);
  await expect(page).toHaveURL(/\/login\/2fa/);
  const code = freshTotp(owner.totp_secret);
  if (code) {
    await enterTotp(page, code);
    // A code spent outside this run (for example a manual sign in) is refused: fall back.
    const refused = page.getByTestId("two-factor-error");
    for (let i = 0; i < 60; i++) {
      if (!new URL(page.url()).pathname.startsWith("/login")) return;
      if (await refused.isVisible()) break;
      await page.waitForTimeout(250);
    }
  }
  await page.getByRole("button", { name: "Use a backup code" }).click();
  await page.getByLabel("Backup code").fill(freshBackupCode());
  await page.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Sign in as an account without two factor authentication. */
export async function loginAs(
  page: Page,
  email: string,
  password = credentials().password,
): Promise<void> {
  await page.goto("/login");
  await fillLogin(page, email, password);
  await expect(page).not.toHaveURL(/\/login/);
}

export function sidebar(page: Page) {
  return page.getByTestId("sidebar-nav");
}

export async function sidebarLinks(page: Page): Promise<string[]> {
  const links = sidebar(page).getByRole("link");
  return (await links.evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""))).sort();
}

function newestEmailFolder(to: string): string | null {
  const dir = credentials().email_dir;
  if (!existsSync(dir)) return null;
  const recipient = to.replace(/[^a-zA-Z0-9]+/g, "_");
  const newest = readdirSync(dir)
    .filter((name) => name.endsWith(`-${recipient}`))
    .map((name) => join(dir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
  // meta.json is written last: the email is complete once it exists.
  return newest && existsSync(join(newest, "meta.json")) ? newest : null;
}

/** The newest console email to an address, waiting for it to arrive. */
export async function latestEmail(to: string): Promise<{ text: string; subject: string }> {
  await expect
    .poll(() => newestEmailFolder(to), { timeout: 30_000, message: `email to ${to}` })
    .not.toBeNull();
  const folder = newestEmailFolder(to) ?? "";
  const meta = JSON.parse(readFileSync(join(folder, "meta.json"), "utf8")) as { subject: string };
  return { text: readFileSync(join(folder, "email.txt"), "utf8"), subject: meta.subject };
}

/** Number of console emails already sent to an address, to wait for a new one. */
export function emailCount(to: string): number {
  const dir = credentials().email_dir;
  if (!existsSync(dir)) return 0;
  const recipient = to.replace(/[^a-zA-Z0-9]+/g, "_");
  return readdirSync(dir).filter((name) => name.endsWith(`-${recipient}`)).length;
}

export function linkIn(text: string, path: string): string {
  const match = new RegExp(`https?://[^\\s]+${path.replace(/[?]/g, "\\?")}[^\\s]+`).exec(text);
  if (!match) throw new Error(`No ${path} link in email:\n${text}`);
  return match[0];
}

/** Axe on the current page: no serious or critical WCAG A or AA violations. */
export async function expectAccessible(page: Page): Promise<void> {
  // Let fades and transitions finish: a half faded button is not what people see.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    serious.map(
      (v) =>
        `${v.id}: ${v.nodes.map((n) => `${n.target.join(" ")} ${n.html} ${n.failureSummary ?? ""}`).join(", ")}`,
    ),
    `Accessibility problems on ${page.url()}`,
  ).toEqual([]);
}

/** A signed in page shared by the tests of one file (one sign in, so 2FA codes last). */
export async function sharedPage(
  browser: Browser,
  who: "owner" | { email: string },
): Promise<Page> {
  const context = await browser.newContext({
    baseURL: "http://localhost:3101",
    locale: "en-GB",
    timezoneId: "Europe/London",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  if (who === "owner") await loginAsOwner(page);
  else await loginAs(page, who.email);
  return page;
}

/** Today's date in London as YYYY-MM-DD, plus a number of days. */
export function londonDate(days = 0): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Open a booking from the upcoming or past list by its reference. */
export async function openBooking(page: Page, reference: string, scope: "upcoming" | "past") {
  await page.goto(`/bookings/${scope}?q=${reference}`);
  await page.getByTestId("bookings-table").getByRole("link", { name: reference }).click();
  await expect(page.getByRole("heading", { level: 1, name: reference })).toBeVisible();
}

/**
 * Choose the first open window in a WindowPicker, moving the date forward a day at a time
 * until one has places (weekends or closed days are skipped).
 */
export async function chooseOpenWindow(page: Page, prefix: string, fromDays = 1): Promise<void> {
  const group = page.getByRole("group", { name: "Window", exact: true });
  for (let days = fromDays; days < fromDays + 21; days++) {
    const date = page.locator(`#${prefix}-date`);
    if ((await date.inputValue()) !== londonDate(days)) {
      const answer = page.waitForResponse((r) => r.url().includes("/bookings/availability"));
      await date.fill(londonDate(days));
      await answer;
    }
    // Wait for the day's answer: window cards, or a closed or empty message.
    await expect(group.locator("label, p").first()).toBeVisible();
    const open = group.locator("input[type=radio]:not([disabled])");
    if ((await open.count()) > 0) {
      await open.first().check();
      return;
    }
  }
  throw new Error("No open window in the next three weeks.");
}
