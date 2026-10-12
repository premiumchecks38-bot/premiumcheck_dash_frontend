import { expect, test, type Page } from "@playwright/test";

import { credentials, expectAccessible, sharedPage } from "./support";

/**
 * Payments, payouts and disputes. Stripe is the backend's in memory fake; managers may refund
 * up to 50 pounds (REFUND_APPROVAL_LIMIT_PENCE in playwright.config.ts).
 */

test.describe.configure({ mode: "serial" });

test.describe("as the owner", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await sharedPage(browser, "owner");
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("summary cards, offline payments, the daily chart and transactions", async () => {
    await page.goto("/payments");
    const summary = page.getByTestId("payments-summary");
    for (const label of [
      "Gross volume",
      "Stripe fees",
      "Net revenue",
      "Refunds",
      "Offline payments",
    ]) {
      await expect(summary.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(summary).toContainText("£");
    await expect(page.getByTestId("stripe-not-connected")).toHaveCount(0);

    const table = page.getByTestId("payments-table");
    await expect(table).toContainText(credentials().bookings.big_paid);
    await expect(table.getByTestId("table-totals")).toContainText("£");
    await expectAccessible(page);

    await page.locator("#payments-range").selectOption("last_30_days");
    await expect(page).toHaveURL(/range=last_30_days/);
    await expect(summary).toBeVisible();

    const href = (await page.getByTestId("payments-export").getAttribute("href")) ?? "";
    const response = await page.request.get(href);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
  });

  test("needs attention and VAT report tabs", async () => {
    await page.goto("/payments");
    await page.getByRole("tab", { name: "Needs attention" }).click();
    await expect(page.getByTestId("attention-table")).toContainText(
      credentials().bookings.disputed,
    );
    await expectAccessible(page);
    await page.getByRole("tab", { name: "VAT report" }).click();
    await expect(page.getByTestId("vat-report")).toContainText("VAT");
    await expectAccessible(page);
  });

  test("payouts and disputes", async () => {
    await page.goto("/payments/payouts");
    const payouts = page.getByTestId("payouts-table");
    await expect(payouts.getByRole("row")).toHaveCount(4);
    await expect(payouts).toContainText("Failed");
    await expectAccessible(page);

    await page.goto("/payments/disputes");
    await expect(page.getByTestId("disputes-urgent")).toBeVisible();
    const disputes = page.getByTestId("disputes-table");
    await expect(disputes).toContainText(credentials().bookings.disputed);
    const respond = disputes.getByRole("link", { name: /Respond in Stripe/ });
    await expect(respond).toHaveAttribute("href", /^https:\/\/dashboard\.stripe\.com\//);
    await expect(respond).toHaveAttribute("target", "_blank");
    await expectAccessible(page);
  });
});

test.describe("as a manager with payments access", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await sharedPage(browser, credentials().payments);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("refund flow, with the approval limit explained", async () => {
    const ref = credentials().bookings.big_paid;
    await page.goto("/payments");
    await expect(page.getByRole("tab", { name: "VAT report" })).toHaveCount(0);
    await page.getByRole("button", { name: `Details of the payment for ${ref}` }).click();
    const sheet = page.getByTestId("payment-sheet");
    await expect(sheet).toBeVisible();
    await expectAccessible(page);

    await sheet.getByTestId("refund-open").click();
    const dialog = page.getByRole("dialog", { name: `Refund ${ref}` });
    const amount = dialog.getByLabel("Amount (£)");
    await amount.fill("60.00");
    await dialog.getByTestId("refund-submit").click();
    await expect(dialog.getByTestId("refund-error")).toHaveText(
      "Refunds over £50.00 need an owner or admin. Refund a smaller amount, or ask an owner or admin to do it.",
    );
    await expectAccessible(page);

    // Once the limit is known the form refuses larger amounts itself.
    await amount.fill("75.00");
    await dialog.getByTestId("refund-submit").click();
    await expect(dialog.locator("#refund-amount-error")).toHaveText(
      "Refunds over £50.00 need an owner or admin",
    );

    await amount.fill("10.00");
    await dialog.getByLabel("Reason").selectOption({ label: "Requested by the customer" });
    await dialog.getByTestId("refund-submit").click();
    await expect(page.getByText(/^Refund (sent|started)/)).toBeVisible();
    await expect(dialog).toHaveCount(0);
    await expect(sheet.getByTestId("sheet-refunds-list")).toContainText("£10.00");
  });
});
