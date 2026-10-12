import { expect, test } from "@playwright/test";

import {
  credentials,
  enterTotp,
  expectAccessible,
  fillLogin,
  freshBackupCode,
  freshTotp,
  latestEmail,
  linkIn,
  loginAs,
  loginAsOwner,
  totpAt,
} from "./support";

test.describe("sign in", () => {
  test("login page is accessible and private", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expectAccessible(page);
    const robots = await page.request.get("/robots.txt");
    expect(await robots.text()).toMatch(/Disallow: \//);
  });

  test("wrong password shows a clear message", async ({ page }) => {
    await page.goto("/login");
    await fillLogin(page, credentials().manager.email, "Not-The-Password-123");
    await expect(page.getByTestId("login-error")).toHaveText("The email or password is not right.");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("too many attempts shows the wait time from the backend", async ({ page }) => {
    await page.goto("/login");
    const email = "rate-limit-e2e@example.com";
    for (let attempt = 0; attempt < 5; attempt++) {
      await fillLogin(page, email, `Wrong-Password-${String(attempt)}0000`);
      await expect(page.getByTestId("login-error")).toHaveText(
        "The email or password is not right.",
      );
    }
    await fillLogin(page, email, "Wrong-Password-final0000");
    await expect(page.getByTestId("login-error")).toHaveText(
      /^Too many attempts\. Try again in \d+ minutes\.$/,
    );
  });

  test("owner signs in with an authenticator code", async ({ page }) => {
    const { owner, password } = credentials();
    await page.goto("/login");
    await fillLogin(page, owner.email, password);
    await expect(page).toHaveURL(/\/login\/2fa$/);
    await expectAccessible(page);
    // A wrong code is refused without ending the step.
    const now = Math.floor(Date.now() / 30_000);
    const wrong = totpAt(owner.totp_secret, now + 5) === "000000" ? "111111" : "000000";
    await enterTotp(page, wrong);
    await expect(page.getByTestId("two-factor-error")).toBeVisible();
    let code = freshTotp(owner.totp_secret);
    if (code === null) {
      // Both usable windows were spent by an earlier test: wait for the next one.
      await page.waitForTimeout(30_000 - (Date.now() % 30_000) + 500);
      code = freshTotp(owner.totp_secret);
    }
    expect(code).not.toBeNull();
    await enterTotp(page, code ?? "");
    await expect(page).toHaveURL("/");
    await page.getByRole("button", { name: /Account menu for/ }).click();
    await expect(page.getByTestId("user-role")).toHaveText("Owner");
  });

  test("owner signs in with a backup code", async ({ page }) => {
    const { owner, password } = credentials();
    await page.goto("/login");
    await fillLogin(page, owner.email, password);
    await page.getByRole("button", { name: "Use a backup code" }).click();
    await page.getByLabel("Backup code").fill(freshBackupCode());
    await page.getByRole("button", { name: "Verify and sign in" }).click();
    await expect(page).toHaveURL("/");
  });

  test("an admin without 2FA must set it up before anything else", async ({ page }) => {
    await loginAs(page, credentials().admin.email);
    await expect(page).toHaveURL("/account/security/setup");
    await page.goto("/team");
    await expect(page).toHaveURL("/account/security/setup");
    await expect(page.getByTestId("sidebar-nav").getByRole("link")).toHaveCount(0);

    await expect(page.getByTestId("two-factor-qr")).toBeVisible();
    await expect(page.getByTestId("two-factor-secret")).not.toHaveText("Loading...");
    const secret = (await page.getByTestId("two-factor-secret").innerText()).replace(/\s+/g, "");
    expect(secret).toMatch(/^[A-Z2-7]{16,}$/);
    await expectAccessible(page);
    await page
      .getByRole("group", { name: "6 digit code from your app" })
      .getByRole("textbox")
      .first()
      .fill(totpAt(secret, Math.floor(Date.now() / 30_000)));
    await expect(page.getByTestId("backup-codes")).toBeVisible();
    await expect(page.getByTestId("backup-code")).toHaveCount(8);
    const download = page.waitForEvent("download");
    await page.getByTestId("download-backup-codes").click();
    expect((await download).suggestedFilename()).toBe("premiumchecks-backup-codes.txt");
    await page.getByTestId("backup-codes-done").click();
    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("sidebar-nav").getByRole("link", { name: "Team" })).toBeVisible();
  });
});

test.describe("passwords", () => {
  test("forgot and reset password with the emailed link", async ({ page }) => {
    const { reset } = credentials();
    await page.goto("/login");
    await page.getByRole("link", { name: /Forgot/ }).click();
    await expect(page).toHaveURL("/forgot-password");
    await expectAccessible(page);
    await page.getByLabel("Email address").fill(reset.email);
    await page.getByRole("button", { name: /reset link/i }).click();
    await expect(page.getByTestId("reset-sent")).toBeVisible();

    const email = await latestEmail(reset.email);
    await page.goto(linkIn(email.text, "/reset-password?token="));
    await expectAccessible(page);
    const newPassword = `Reset-E2e-${String(Date.now())}`;
    await page.locator("#new-password").fill(newPassword);
    await page.getByLabel("Confirm new password").fill(newPassword);
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page).toHaveURL("/login?reset=1");
    await expect(page.getByTestId("login-notice")).toContainText("Your password has been changed");

    await fillLogin(page, reset.email, newPassword);
    await expect(page).not.toHaveURL(/\/login/);
  });
});

test.describe("session", () => {
  test("an expired access token is refreshed without the person noticing", async ({
    page,
    context,
  }) => {
    test.setTimeout(150_000);
    await loginAs(page, credentials().manager.email);
    await expect(page).toHaveURL("/");
    // The e2e backend issues one minute access tokens; the cookie expires with the token.
    await page.waitForTimeout(65_000);
    const access = (await context.cookies()).find((c) => c.name === "ppc_dash_access");
    expect(access).toBeUndefined();

    // A data request through the BFF proxy refreshes and succeeds.
    const status = await page.evaluate(async () => (await fetch("/api/admin/overview")).status);
    expect(status).toBe(200);

    // A page load without an access cookie refreshes through the redirect flow.
    await context.clearCookies({ name: "ppc_dash_access" });
    await page.goto("/customers");
    await expect(page).toHaveURL("/customers");
    await expect(page.getByRole("heading", { name: "Customers", level: 1 })).toBeVisible();
  });

  test("log out ends the session", async ({ page }) => {
    await loginAs(page, credentials().manager.email);
    await page.getByRole("button", { name: /Account menu for/ }).click();
    await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/customers");
    await expect(page).toHaveURL("/login?next=%2Fcustomers");
  });

  test("log out of all devices ends every session and returns there after signing in", async ({
    browser,
  }) => {
    const { manager } = credentials();
    const first = await browser.newContext();
    const second = await browser.newContext();
    const pageA = await first.newPage();
    const pageB = await second.newPage();
    await loginAs(pageA, manager.email);
    await loginAs(pageB, manager.email);

    await pageA.getByRole("button", { name: /Account menu for/ }).click();
    await pageA.getByRole("menuitem", { name: "Log out of all devices" }).click();
    await pageA.getByRole("button", { name: "Log out everywhere" }).click();
    await expect(pageA).toHaveURL(/\/login/);

    // The other browser's access token runs out (stateless, at most a minute); its refresh
    // token is already revoked, so it is sent to sign in and then back to the same page.
    await second.clearCookies({ name: "ppc_dash_access" });
    await pageB.goto("/customers");
    await expect(pageB).toHaveURL("/login?expired=1&next=%2Fcustomers");
    await expect(pageB.getByTestId("login-notice")).toHaveText(
      "Your session has ended. Please sign in again.",
    );
    await fillLogin(pageB, manager.email, credentials().password);
    await expect(pageB).toHaveURL("/customers");
    await first.close();
    await second.close();
  });

  test("owner returns to the page they asked for", async ({ page }) => {
    await page.goto("/team?status=active");
    await expect(page).toHaveURL("/login?next=%2Fteam%3Fstatus%3Dactive");
    await loginAsOwner(page, "/team?status=active");
    await expect(page).toHaveURL("/team?status=active");
  });

  test("an unsafe return address is ignored", async ({ page }) => {
    await page.goto("/login?next=https%3A%2F%2Fevil.example%2F");
    await fillLogin(page, credentials().manager.email, credentials().password);
    await expect(page).toHaveURL("/");
  });
});
