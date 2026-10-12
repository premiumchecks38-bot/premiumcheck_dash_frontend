import { expect, test, type Page } from "@playwright/test";

import { credentials, expectAccessible, sharedPage } from "./support";

/** Editors have no bookings, customers or payments access: every screen and API call is 403. */

test.describe.configure({ mode: "serial" });

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await sharedPage(browser, credentials().editor);
});

test.afterAll(async () => {
  await page.context().close();
});

const SOME_ID = "00000000-0000-4000-8000-000000000000";

const SCREENS = [
  "/bookings/upcoming",
  "/bookings/past",
  "/bookings/past?tab=renewals",
  "/bookings/calendar",
  "/bookings/new",
  `/bookings/${SOME_ID}`,
  "/customers",
  `/customers/${SOME_ID}`,
  "/payments",
  "/payments/payouts",
  "/payments/disputes",
];

const API = [
  "/api/admin/bookings/upcoming",
  "/api/admin/bookings/past",
  "/api/admin/bookings/options",
  "/api/admin/bookings/calendar?from=2026-10-01&to=2026-10-31",
  `/api/admin/bookings/${SOME_ID}`,
  "/api/admin/customers",
  "/api/admin/customers/export.csv",
  "/api/admin/payments",
  "/api/admin/payments/summary",
  "/api/admin/payments/vat-report",
  "/api/admin/payouts",
  "/api/admin/disputes",
];

test("an editor sees the 403 page on every bookings, customers and payments screen", async () => {
  for (const path of SCREENS) {
    await page.goto(path);
    await expect(page.getByTestId("forbidden"), path).toBeVisible();
  }
  await expectAccessible(page);
});

test("the backend refuses an editor on every endpoint behind those screens", async () => {
  for (const path of API) {
    const response = await page.request.get(path);
    expect(response.status(), path).toBe(403);
  }
});
