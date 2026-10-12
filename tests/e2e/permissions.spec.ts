import { expect, test } from "@playwright/test";

import { credentials, expectAccessible, loginAs, loginAsOwner, sidebarLinks } from "./support";

const EVERY_ITEM = [
  "/",
  "/bookings/upcoming",
  "/bookings/past",
  "/bookings/calendar",
  "/customers",
  "/payments",
  "/payments/payouts",
  "/payments/disputes",
  "/services",
  "/prices",
  "/areas",
  "/availability",
  "/blog",
  "/pages",
  "/faqs",
  "/reviews",
  "/media",
  "/seo",
  "/seo/redirects",
  "/leads",
  "/team",
  "/settings",
  "/audit-log",
  "/email-log",
].sort();

/** Sidebar links each grantable page unlocks. */
const PAGE_LINKS: Record<string, string[]> = {
  overview: ["/"],
  bookings_upcoming: ["/bookings/upcoming", "/bookings/calendar"],
  bookings_past: ["/bookings/past"],
  customers: ["/customers"],
  payments: ["/payments", "/payments/payouts", "/payments/disputes"],
  services: ["/services"],
  prices: ["/prices"],
  areas: ["/areas"],
  availability: ["/availability"],
  blogs: ["/blog"],
  pages: ["/pages"],
  faqs: ["/faqs"],
  reviews: ["/reviews"],
  media: ["/media"],
  seo: ["/seo", "/seo/redirects"],
  leads: ["/leads"],
};

test("owner sees every sidebar item and the money on the overview", async ({ page }) => {
  await loginAsOwner(page);
  expect(await sidebarLinks(page)).toEqual(EVERY_ITEM);
  await expect(page.getByTestId("overview-bookings")).toBeVisible();
  await expect(page.getByTestId("overview-revenue")).toBeVisible();
  await expect(page.getByTestId("revenue-chart").locator("canvas")).toBeVisible();
  await page.getByText("Show the figures as a table").click();
  await expect(page.getByTestId("revenue-table").getByRole("row")).toHaveCount(31);
  await expectAccessible(page);
});

test("manager without payments sees only granted pages and no money", async ({ page }) => {
  const { manager, manager_pages } = credentials();
  await loginAs(page, manager.email);
  const expected = manager_pages.flatMap((p) => PAGE_LINKS[p] ?? []).sort();
  expect(await sidebarLinks(page)).toEqual(expected);
  expect(expected).not.toContain("/payments");
  await expect(page.getByTestId("overview-bookings")).toBeVisible();
  await expect(page.getByTestId("needs-attention")).toBeVisible();
  await expect(page.getByTestId("overview-revenue")).toHaveCount(0);
  await expect(page.getByText("£")).toHaveCount(0);

  // Typing a forbidden address shows the 403 page from the server.
  await page.goto("/payments/payouts");
  await expect(page.getByTestId("forbidden")).toBeVisible();
  await page.goto("/team");
  await expect(page.getByTestId("forbidden")).toBeVisible();
  await expectAccessible(page);
});

test("editor visiting payments gets the 403 page", async ({ page }) => {
  await loginAs(page, credentials().editor.email);
  // No overview access: the home page sends the editor to their first page.
  await expect(page).toHaveURL("/blog");
  expect(await sidebarLinks(page)).toEqual(
    ["/blog", "/pages", "/faqs", "/reviews", "/media", "/seo", "/seo/redirects"].sort(),
  );
  const response = await page.goto("/payments");
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByTestId("forbidden")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("You do not have access");
  await expectAccessible(page);

  // The API refuses too, whatever the UI shows.
  const api = await page.evaluate(async () => (await fetch("/api/admin/payments")).status);
  expect(api).toBe(403);
});

test("placeholder sections are permission checked and accessible", async ({ page }) => {
  await loginAs(page, credentials().editor.email);
  for (const path of ["/blog", "/seo/redirects", "/media"]) {
    await page.goto(path);
    await expect(page.getByText("This section is being built")).toBeVisible();
    await expectAccessible(page);
  }
});

test("the design system page does not exist in production", async ({ page }) => {
  await loginAs(page, credentials().editor.email);
  const response = await page.goto("/design-system");
  expect(response?.status()).toBe(404);
});
