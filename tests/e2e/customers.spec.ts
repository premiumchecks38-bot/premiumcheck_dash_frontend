import { expect, test, type Page } from "@playwright/test";

import { expectAccessible, sharedPage } from "./support";

/** Customers: the list with filters and CSV, and the customer page. */

test.describe.configure({ mode: "serial" });

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await sharedPage(browser, "owner");
});

test.afterAll(async () => {
  await page.context().close();
});

test("customers list: search, filters and CSV export", async () => {
  await page.goto("/customers");
  const table = page.getByTestId("customers-table");
  await expect(table.getByRole("link", { name: "Grace Hall" })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("searchbox", { name: "Search", exact: true }).fill("grace.hall");
  await expect(page).toHaveURL(/q=grace\.hall/);
  await expect(table.getByRole("link")).toHaveText(["Grace Hall"]);

  await page.goto("/customers?type=landlord");
  await expect(table.getByRole("link", { name: "Ben Carter" })).toBeVisible();
  await expect(table.getByRole("link", { name: "Alice Turner" })).toHaveCount(0);

  const href = (await page.getByTestId("customers-export").getAttribute("href")) ?? "";
  expect(href).toContain("customer_type=landlord");
  const response = await page.request.get(href);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");
  const csv = await response.text();
  expect(csv).toContain("ben.carter@example.com");
  expect(csv).not.toContain("alice.turner@example.com");
});

test("customer detail: profile, bookings, certificates and a new booking", async () => {
  await page.goto("/customers?q=grace.hall");
  await page.getByTestId("customers-table").getByRole("link", { name: "Grace Hall" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Grace Hall" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Bookings" })).toContainText("PPC-");
  await expect(page.getByTestId("customer-certificates")).toContainText(/EICR|Electrical|Gas/i);
  await expect(page.getByText("Total spent")).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("textbox", { name: "Phone", exact: true }).fill("+447911123456");
  await page.getByRole("textbox", { name: "Company", exact: true }).fill("Hall Lettings");
  await expectAccessible(page);
  await page.getByTestId("customer-save").click();
  await expect(page.getByText("Customer details saved.")).toBeVisible();
  await expect(page.getByRole("main")).toContainText("+447911123456");
  await expect(page.getByRole("main")).toContainText("Hall Lettings");

  const newBooking = page.getByTestId("customer-new-booking");
  await expect(newBooking).toHaveAttribute("href", /\/bookings\/new\?.*email=grace\.hall/);
  await newBooking.click();
  await expect(page).toHaveURL(/\/bookings\/new/);
  await expect(page.getByRole("radio", { name: /Grace Hall/ })).toBeChecked();
});
