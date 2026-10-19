import { expect, test, type Page } from "@playwright/test";

import { credentials, expectAccessible, londonDate, sharedPage } from "./support";

/** The bookings calendar: month and week views, navigation, keyboard and the booking Sheet. */

test.describe.configure({ mode: "serial" });

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await sharedPage(browser, "owner");
});

test.afterAll(async () => {
  await page.context().close();
});

function monthLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

function nextMonth(date: string): string {
  const d = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

test("month view: navigation and today's booking", async () => {
  const today = londonDate();
  await page.goto("/bookings/calendar");
  const title = page.getByTestId("calendar-title");
  await expect(title).toHaveText(monthLabel(today));
  const grid = page.getByTestId("calendar-grid");
  await expect(grid.getByTestId("calendar-chip").first()).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("button", { name: "Next month" }).click();
  await expect(title).toHaveText(monthLabel(nextMonth(today)));
  await expect(page).toHaveURL(/date=/);
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(title).toHaveText(monthLabel(today));
  await page.getByRole("button", { name: "Next month" }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(title).toHaveText(monthLabel(today));
});

test("chip opens a Sheet with the booking summary and quick actions", async () => {
  const ref = credentials().bookings.today_paid;
  await page.goto("/bookings/calendar");
  await page.getByTestId("calendar-chip").filter({ hasText: ref }).click();
  const sheet = page.getByTestId("calendar-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("heading", { name: ref })).toBeVisible();
  await expect(sheet).toContainText("Alice Turner");
  await expect(sheet.getByLabel("Assign engineer")).toBeVisible();
  await expectAccessible(page);
  await sheet.getByRole("link", { name: "Open the booking" }).click();
  await expect(page.getByRole("heading", { level: 1, name: ref })).toBeVisible();
});

test("week view, filters and keyboard navigation", async () => {
  const today = londonDate();
  await page.goto("/bookings/calendar");
  await page.getByRole("group", { name: "View" }).getByRole("button", { name: "Week" }).click();
  await expect(page).toHaveURL(/view=week/);
  await expect(page.getByTestId("calendar-title")).toHaveText(/^Week of /);
  await expectAccessible(page);

  // Arrow keys move between days; leaving the week moves the view.
  const cell = page.locator(`[data-date="${today}"]`);
  await cell.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(`[data-date="${londonDate(1)}"]`)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(cell).toBeFocused();
  for (let i = 1; i <= 7; i++) {
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(`[data-date="${londonDate(i)}"]`)).toBeFocused();
  }

  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page.getByLabel("Engineer").selectOption({ label: "Priya Patel" });
  await expect(page).toHaveURL(/engineer=/);
  const chips = page.getByTestId("calendar-chip");
  await expect(chips.filter({ hasText: credentials().bookings.today_paid })).toHaveCount(0);
});
