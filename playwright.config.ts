import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { defineConfig, devices } from "@playwright/test";

/**
 * End to end tests against a real, isolated backend: its own database (premiumchecks_dash_e2e),
 * Redis database 3, console emails and a one minute access token, so the token refresh is
 * exercised for real. The development database and its owner are never touched.
 *
 * Connection details and the proxy secret are read from the backend's .env at run time and
 * passed to the two servers as environment variables; nothing secret is written to disk.
 */

const BACKEND_DIR = resolve(import.meta.dirname, "../premiumcheck_backend");
const BACKEND_PORT = 8100;
const DASHBOARD_PORT = 3101;
const DASHBOARD_URL = `http://localhost:${String(DASHBOARD_PORT)}`;
const BACKEND_URL = `http://localhost:${String(BACKEND_PORT)}/api/v1`;

function backendEnv(): Record<string, string> {
  const file = resolve(BACKEND_DIR, ".env");
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match?.[1]) out[match[1]] = (match[2] ?? "").replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = backendEnv();
const databaseUrl = (process.env.E2E_DATABASE_URL ?? env.DATABASE_URL ?? "").replace(
  /\/[^/?]+(\?|$)/,
  "/premiumchecks_dash_e2e$1",
);
const redisUrl = (process.env.E2E_REDIS_URL ?? env.REDIS_URL ?? "redis://localhost:6379/0").replace(
  /\/\d+$/,
  "/3",
);
const proxySecret = process.env.TRUSTED_PROXY_SECRET ?? env.TRUSTED_PROXY_SECRET ?? "";

// uv may not be on PATH on Windows (installed per user).
const windowsUv = resolve(process.env.APPDATA ?? "", "Python/Python313/Scripts/uv.exe");
const uv =
  process.env.UV ??
  (process.platform === "win32" && existsSync(windowsUv) ? `"${windowsUv}"` : "uv");

export default defineConfig({
  testDir: "./tests/e2e",
  // One worker: the tests share accounts, and 2FA codes cannot be reused.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: DASHBOARD_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
    locale: "en-GB",
    timezoneId: "Europe/London",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    {
      command: `${uv} run python -m scripts.dev_e2e_dashboard --serve --port ${String(BACKEND_PORT)}`,
      cwd: BACKEND_DIR,
      url: `${BACKEND_URL}/health`,
      timeout: 240_000,
      reuseExistingServer: process.env.E2E_REUSE === "1",
      stdout: "ignore",
      stderr: "pipe",
      env: {
        ENVIRONMENT: "development",
        DATABASE_URL: databaseUrl,
        REDIS_URL: redisUrl,
        EMAIL_PROVIDER: "console",
        EMAIL_CONSOLE_DIR: "var/emails-dash-e2e",
        REQUIRE_2FA_FOR_ADMINS: "true",
        ACCESS_TOKEN_EXPIRE_MINUTES: "1",
        DASHBOARD_URL,
        TRUSTED_PROXY_SECRET: proxySecret,
        TURNSTILE_SECRET_KEY: "",
        WEBSITE_REVALIDATE_URL: "",
        COOKIE_SECURE: "false",
        // Managers can refund up to 50 pounds; Stripe and Cloudinary are faked by scripts.e2e_app.
        REFUND_APPROVAL_LIMIT_PENCE: "5000",
        STRIPE_SECRET_KEY: "sk_test_e2e_not_a_real_key",
      },
    },
    {
      command: `npm run build && npx next start -p ${String(DASHBOARD_PORT)}`,
      url: `${DASHBOARD_URL}/login`,
      timeout: 300_000,
      reuseExistingServer: process.env.E2E_REUSE === "1",
      stdout: "ignore",
      stderr: "pipe",
      env: {
        API_URL: BACKEND_URL,
        DASHBOARD_URL,
        BACKEND_PROXY_SECRET: proxySecret,
        NEXT_PUBLIC_WEBSITE_URL: "http://localhost:3000",
      },
    },
  ],
});
