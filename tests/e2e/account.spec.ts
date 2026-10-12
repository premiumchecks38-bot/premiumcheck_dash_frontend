import { expect, test } from "@playwright/test";

import { credentials, expectAccessible, fillLogin, loginAs, totpAt } from "./support";

test("profile name can be changed", async ({ page }) => {
  await loginAs(page, credentials().manager.email);
  await page.goto("/account");
  await expectAccessible(page);
  await expect(page.getByText(credentials().manager.email)).toBeVisible();
  const name = page.getByLabel("Full name");
  await name.fill("E2E Manager Renamed");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Your name has been updated.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Account menu for E2E Manager Renamed" }),
  ).toBeVisible();
  await name.fill("E2E Manager");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("button", { name: "Account menu for E2E Manager" })).toBeVisible();
});

test("security: change password, then set up and turn off two factor sign in", async ({ page }) => {
  const { reset, password } = credentials();
  await loginAs(page, reset.email);
  await page.goto("/account/security");
  await expectAccessible(page);

  // A wrong current password is reported on the field.
  const newPassword = `Changed-E2e-${String(Date.now())}`;
  await page.getByLabel("Current password").fill("Not-My-Password-2026");
  await page.locator("#change-new-password").fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Your current password is not right.")).toBeVisible();
  await page.getByLabel("Current password").fill(password);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText(/Password changed/)).toBeVisible();
  // This session survives the change.
  await page.reload();
  await expect(page).toHaveURL("/account/security");

  // Two factor: QR code, manual key, verify, backup codes once.
  await expect(page.getByTestId("two-factor-status")).toContainText("Off");
  await page.getByTestId("start-two-factor").click();
  await expect(page.getByTestId("two-factor-qr")).toBeVisible();
  await expect(page.getByTestId("two-factor-secret")).not.toHaveText("Loading...");
  const secret = (await page.getByTestId("two-factor-secret").innerText()).replace(/\s+/g, "");
  const window = Math.floor(Date.now() / 30_000);
  await page
    .getByRole("group", { name: "6 digit code from your app" })
    .getByRole("textbox")
    .first()
    .fill(totpAt(secret, window));
  await expect(page.getByTestId("backup-code")).toHaveCount(8);
  await expect(page.getByTestId("backup-codes-done")).toBeDisabled();
  await page.getByTestId("download-backup-codes").click();
  await page.getByTestId("backup-codes-done").click();
  await expect(page.getByTestId("two-factor-status")).toContainText("On");

  // Turn it off with the password and a different code (the first one cannot be reused).
  await page.getByRole("button", { name: "Turn off", exact: true }).click();
  await page.getByLabel("Your password").fill(newPassword);
  await page
    .getByRole("group", { name: "6 digit code from your app" })
    .getByRole("textbox")
    .first()
    .fill(totpAt(secret, window + 1));
  await page.getByTestId("disable-two-factor").click();
  await expect(page.getByTestId("two-factor-status")).toContainText("Off");

  // The new password works for the next sign in.
  await page.getByTestId("logout-all").click();
  await page.getByRole("button", { name: "Log out everywhere" }).click();
  await expect(page).toHaveURL(/\/login/);
  await fillLogin(page, reset.email, newPassword);
  await expect(page).not.toHaveURL(/\/login/);
});
