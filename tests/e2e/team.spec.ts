import { expect, test, type Page } from "@playwright/test";

import {
  credentials,
  emailCount,
  expectAccessible,
  fillLogin,
  latestEmail,
  linkIn,
  loginAsOwner,
  sidebarLinks,
} from "./support";

function row(page: Page, text: string) {
  return page.getByTestId("team-table").getByRole("row").filter({ hasText: text });
}

async function openActions(page: Page, name: string) {
  await row(page, name).getByTestId("member-actions").click();
}

test("team list, filters and the protected owner row", async ({ page }) => {
  await loginAsOwner(page, "/team");
  await expect(page.getByRole("heading", { name: "Team", level: 1 })).toBeVisible();
  const { owner, manager, editor } = credentials();
  for (const email of [owner.email, manager.email, editor.email]) {
    await expect(row(page, email)).toHaveCount(1);
  }
  // The owner's own row has no actions, only a link to their profile.
  await expect(row(page, owner.email).getByTestId("member-actions")).toHaveCount(0);
  await expect(
    row(page, owner.email).getByRole("link", { name: "Edit your profile" }),
  ).toBeVisible();

  await page.getByLabel("Role").selectOption("editor");
  await expect(page).toHaveURL(/role=editor/);
  await expect(row(page, editor.email)).toHaveCount(1);
  await expect(row(page, manager.email)).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(row(page, manager.email)).toHaveCount(1);

  await page.getByRole("searchbox", { name: "Search", exact: true }).fill("e2e-manager");
  await expect(row(page, editor.email)).toHaveCount(0);
  await expect(row(page, manager.email)).toHaveCount(1);
  await expectAccessible(page);
});

test("invite with custom permissions: the new person sees exactly those pages", async ({
  page,
  browser,
}) => {
  const email = `invited-${String(Date.now())}@example.com`;
  await loginAsOwner(page, "/team");
  await page.getByTestId("invite-member").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill("Invited Person");
  await dialog.getByRole("textbox", { name: "Email" }).fill(email);
  await dialog.getByRole("radio", { name: "Editor" }).check();

  // Prefilled with the editor defaults, then customised.
  const matrix = dialog.getByTestId("permission-matrix");
  await expect(matrix.getByRole("radio", { name: "Blog: Edit" })).toBeChecked();
  await expect(matrix.getByRole("radio", { name: "Leads: No access" })).toBeChecked();
  await expect(matrix.getByRole("button", { name: "Reset to role defaults" })).toBeDisabled();
  await matrix.getByRole("radio", { name: "Leads: View" }).check();
  await matrix.getByRole("radio", { name: "FAQs: No access" }).check();
  await expect(matrix.getByRole("button", { name: "Reset to role defaults" })).toBeEnabled();
  await expect(matrix).toContainText("customised");
  await expectAccessible(page);
  await dialog.getByTestId("member-save").click();
  await expect(page.getByText(`Invitation sent to ${email}.`)).toBeVisible();
  await expect(row(page, email)).toContainText("Invited");

  // Resend: a new link replaces the old one.
  const before = emailCount(email);
  await openActions(page, email);
  await page.getByRole("menuitem", { name: "Resend invitation" }).click();
  await expect(page.getByText(`A new invitation is on its way to ${email}.`)).toBeVisible();
  await expect.poll(() => emailCount(email)).toBe(before + 1);

  const invite = await latestEmail(email);
  const context = await browser.newContext();
  const invited = await context.newPage();
  await invited.goto(linkIn(invite.text, "/invite?token="));
  await expectAccessible(invited);
  const password = "Invited-Person-Pass-2026";
  await invited.getByLabel("Your name").fill("Invited Person");
  await invited.locator("#new-password").fill(password);
  await expect(invited.getByText("At least 12 characters")).toBeVisible();
  await invited.getByLabel("Confirm new password").fill(password);
  await invited.getByRole("button", { name: "Create my account" }).click();
  await expect(invited).toHaveURL("/login?invited=1");
  await fillLogin(invited, email, password);
  await expect(invited).toHaveURL("/blog");
  expect(await sidebarLinks(invited)).toEqual(
    ["/blog", "/pages", "/reviews", "/media", "/seo", "/seo/redirects", "/leads"].sort(),
  );
  await invited.goto("/faqs");
  await expect(invited.getByTestId("forbidden")).toBeVisible();
  await context.close();

  // Back on the team page the person is active; deactivate and reactivate them.
  await page.reload();
  await expect(row(page, email)).toContainText("Active");
  await openActions(page, email);
  await page.getByRole("menuitem", { name: "Deactivate" }).click();
  await page.getByRole("button", { name: "Deactivate", exact: true }).click();
  await expect(row(page, email)).toContainText("Deactivated");
  await openActions(page, email);
  await page.getByRole("menuitem", { name: "Reactivate" }).click();
  await page.getByRole("button", { name: "Reactivate", exact: true }).click();
  await expect(row(page, email)).toContainText("Active");

  // Reset their password with a temporary one.
  await openActions(page, email);
  await page.getByRole("menuitem", { name: "Reset password" }).click();
  await page.getByLabel("Or set a temporary password").fill("Temporary-Pass-2026");
  await page.getByRole("button", { name: "Set temporary password" }).click();
  await expect(page.getByText(/Temporary password set/)).toBeVisible();
});

test("changing a role warns that page access is reset", async ({ page }) => {
  const { editor } = credentials();
  await loginAsOwner(page, "/team");
  await openActions(page, editor.email);
  await page.getByRole("menuitem", { name: "Edit role and access" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByTestId("role-change-warning")).toHaveCount(0);
  await dialog.getByRole("radio", { name: "Manager" }).check();
  await expect(dialog.getByTestId("role-change-warning")).toBeVisible();
  // The matrix switches to the manager defaults.
  await expect(dialog.getByRole("radio", { name: "Customers: Edit" })).toBeChecked();
  await dialog.getByRole("radio", { name: "Admin" }).check();
  await expect(dialog.getByTestId("permission-matrix")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
});
