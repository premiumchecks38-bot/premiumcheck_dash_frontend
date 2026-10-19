import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import {
  chooseOpenWindow,
  credentials,
  emailCount,
  expectAccessible,
  latestEmail,
  openBooking,
  sharedPage,
} from "./support";

/**
 * Booking lists and the booking detail page, signed in as the owner. The tests run in order on
 * one page: the list tests read the seeded bookings before the detail tests change them.
 */

test.describe.configure({ mode: "serial" });

let page: Page;
const refs = () => credentials().bookings;

test.beforeAll(async ({ browser }) => {
  page = await sharedPage(browser, "owner");
});

test.afterAll(async () => {
  await page.context().close();
});

function table() {
  return page.getByTestId("bookings-table");
}

async function shownReferences(): Promise<string[]> {
  await expect(table().getByTestId("skeleton-row")).toHaveCount(0);
  return table().getByRole("link", { name: /^PPC-/ }).allTextContents();
}

test("upcoming bookings: quick chips filter and stay in the URL", async () => {
  const r = refs();
  await page.goto("/bookings/upcoming");
  await expect(page.getByRole("heading", { level: 1, name: "Upcoming bookings" })).toBeVisible();
  const all = await shownReferences();
  for (const ref of [r.today_paid, r.pay_later, r.pending, r.attention, r.big_paid]) {
    expect(all).toContain(ref);
  }
  // Past bookings are not upcoming.
  expect(all).not.toContain(r.completed_soon);
  await expectAccessible(page);

  const chips = page.getByRole("group", { name: "Quick filters" });
  await chips.getByRole("button", { name: "Today" }).click();
  await expect(page).toHaveURL(/preset=today/);
  await expect.poll(shownReferences).toEqual([r.today_paid]);
  await chips.getByRole("button", { name: "Today" }).click();

  await chips.getByRole("button", { name: "Needs attention" }).click();
  await expect(page).toHaveURL(/attention=1/);
  await expect
    .poll(async () => (await shownReferences()).sort())
    .toEqual([r.attention, r.disputed].sort());
  await chips.getByRole("button", { name: "Needs attention" }).click();

  await chips.getByRole("button", { name: "Payment due" }).click();
  await expect(page).toHaveURL(/payment=payment_due/);
  await expect.poll(shownReferences).toEqual([r.pay_later]);
  await chips.getByRole("button", { name: "Payment due" }).click();

  await chips.getByRole("button", { name: "Unassigned" }).click();
  await expect(page).toHaveURL(/unassigned=1/);
  // Engineers are assigned to the today and attention bookings, not to big_paid.
  await expect
    .poll(async () => {
      const shown = await shownReferences();
      return (
        shown.includes(r.big_paid) && !shown.includes(r.today_paid) && !shown.includes(r.attention)
      );
    })
    .toBe(true);
  const unassigned = await shownReferences();

  // The URL alone restores the filters.
  await page.reload();
  await expect(chips.getByRole("button", { name: "Unassigned" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect.poll(async () => (await shownReferences()).sort()).toEqual([...unassigned].sort());
});

test("upcoming bookings: status, search and window filters", async () => {
  const r = refs();
  await page.goto("/bookings/upcoming");
  await page.getByTestId("status-filter").click();
  // The checkbox reflects the URL, so it ticks once the address has changed.
  const pending = page.getByRole("checkbox", { name: "Pending payment" });
  await pending.click();
  await expect(page).toHaveURL(/status=pending_payment/);
  await expect(pending).toBeChecked();
  await page.keyboard.press("Escape");
  await expect.poll(shownReferences).toEqual([r.pending]);

  await page.goto(`/bookings/upcoming?q=${r.offline}`);
  await expect(page.getByRole("searchbox", { name: "Search", exact: true })).toHaveValue(r.offline);
  await expect.poll(shownReferences).toEqual([r.offline]);

  await page.goto("/bookings/upcoming");
  await page.getByRole("searchbox", { name: "Search", exact: true }).fill("Hannah");
  await expect(page).toHaveURL(/q=Hannah/);
  await expect.poll(shownReferences).toEqual([r.big_paid]);

  await page.goto("/bookings/upcoming?window=AM");
  const am = await shownReferences();
  expect(am).toContain(r.pending);
  expect(am).not.toContain(r.today_paid);
});

test("upcoming bookings: bulk assign an engineer and export the selection", async () => {
  const r = refs();
  await page.goto("/bookings/upcoming");
  await page.getByRole("checkbox", { name: `Select ${r.pay_later}` }).check();
  await page.getByRole("checkbox", { name: `Select ${r.big_paid}` }).check();
  const bulk = page.getByTestId("bulk-actions");
  await expect(bulk).toContainText("2 selected");

  const download = page.waitForEvent("download");
  await bulk.getByRole("button", { name: "Export selected" }).click();
  const file = await download;
  const csv = readFileSync(await file.path(), "utf8");
  expect(csv).toContain(r.pay_later);
  expect(csv).toContain(r.big_paid);
  expect(csv).not.toContain(r.today_paid);

  await bulk.getByLabel("Engineer").selectOption({ label: "Sam Sparks" });
  await bulk.getByRole("button", { name: "Assign engineer" }).click();
  await expect(page.getByText("Engineer assigned to 2 bookings.")).toBeVisible();
  await page.goto("/bookings/upcoming?unassigned=1");
  const unassigned = await shownReferences();
  expect(unassigned).not.toContain(r.pay_later);
  expect(unassigned).not.toContain(r.big_paid);
});

test("past bookings: certificate filters, CSV export and renewals", async () => {
  const r = refs();
  await page.goto("/bookings/past");
  await expect(page.getByRole("heading", { level: 1, name: "Past bookings" })).toBeVisible();
  const all = await shownReferences();
  expect(all).toEqual(
    expect.arrayContaining([r.completed_soon, r.completed_later, r.cancelled, r.no_show]),
  );
  expect(all).not.toContain(r.today_paid);
  await expectAccessible(page);

  await page.getByLabel("Certificate expiring").selectOption({ label: "Within 30 days" });
  await expect(page).toHaveURL(/expiring=30/);
  await expect.poll(shownReferences).toEqual([r.completed_soon]);

  await page.goto("/bookings/past?cert=no");
  const without = await shownReferences();
  expect(without).toContain(r.no_show);
  expect(without).not.toContain(r.completed_soon);

  // The export is built by the backend from the same filters.
  const href = (await page.getByTestId("export-csv").getAttribute("href")) ?? "";
  expect(href).toContain("has_certificate=false");
  const response = await page.request.get(href);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");
  const csv = await response.text();
  expect(csv).toContain(r.no_show);
  expect(csv).not.toContain(r.completed_soon);

  await page.goto("/bookings/past");
  await page.getByRole("tab", { name: "Renewals" }).click();
  await expect(page).toHaveURL(/tab=renewals/);
  const renewals = page.getByTestId("renewals-table");
  await expect(renewals).toContainText("Grace Hall");
  await expect(renewals).not.toContainText("Ivan Jones");
  await page.getByLabel("Expiring within").selectOption("60");
  await expect(renewals).toContainText("Ivan Jones");
  await expectAccessible(page);

  await renewals
    .getByRole("row", { name: /Grace Hall/ })
    .getByRole("link", { name: "Create renewal booking" })
    .click();
  await expect(page).toHaveURL(/\/bookings\/new\?/);
  // Grace Hall has booked before, so the form picks her customer record.
  await expect(page.getByRole("radio", { name: /Grace Hall/ })).toBeChecked();
  await expect(page.getByLabel("Internal notes")).toHaveValue(
    new RegExp(`Renewal of ${r.completed_soon}`),
  );
});

test("booking detail: header, panels and the needs attention banner", async () => {
  const r = refs();
  await openBooking(page, r.attention, "upcoming");
  const banner = page.getByTestId("attention-banner");
  await expect(banner).toBeVisible();
  await expect(page.getByTestId("assigned-engineer")).toContainText("Priya Patel");
  await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
  await expectAccessible(page);

  await banner.getByRole("button", { name: "Resolve" }).click();
  const resolve = page.getByRole("dialog", { name: "Resolve the attention flag" });
  await resolve.getByRole("textbox").fill("Customer called, all sorted");
  await resolve.getByRole("button", { name: "Mark resolved" }).click();
  await expect(page.getByText("Marked as resolved.")).toBeVisible();
  await expect(banner).toHaveCount(0);
});

test("booking detail: assign an engineer and reschedule", async () => {
  const r = refs();
  await openBooking(page, r.offline, "upcoming");
  await expect(page.getByTestId("assigned-engineer")).toContainText("Not assigned");

  await page.getByTestId("booking-actions").click();
  await page.getByRole("menuitem", { name: "Assign engineers" }).click();
  const engineerDialog = page.getByRole("dialog", { name: "Assign engineers" });
  await engineerDialog.getByLabel("Priya Patel").check();
  await expectAccessible(page);
  await engineerDialog.getByTestId("assign-engineer-save").click();
  await expect(page.getByText("Assigned: Priya Patel.")).toBeVisible();
  await expect(page.getByTestId("assigned-engineer")).toContainText("Priya Patel");

  await page.getByTestId("booking-actions").click();
  await page.getByRole("menuitem", { name: "Reschedule" }).click();
  const dialog = page.getByRole("dialog", { name: `Reschedule ${r.offline}` });
  await expect(dialog).toBeVisible();
  // The current window is shown but cannot be chosen again.
  await expect(dialog.getByText("Current appointment")).toBeVisible();
  await chooseOpenWindow(page, "reschedule", 1);
  await expectAccessible(page);
  await dialog.getByTestId("reschedule-save").click();
  await expect(page.getByText(/^Moved to .* on \d{4}-\d{2}-\d{2}\.$/)).toBeVisible();
  await expect(dialog).toHaveCount(0);
});

test("booking detail: a refused status change names the allowed statuses", async () => {
  const r = refs();
  await openBooking(page, r.today_paid, "upcoming");
  await page.getByTestId("booking-actions").click();
  await page.getByRole("menuitem", { name: "Change status" }).click();
  const dialog = page.getByRole("dialog", { name: "Change status" });
  await dialog.getByLabel("New status").selectOption("completed");
  await dialog.getByTestId("status-save").click();
  const error = dialog.getByTestId("status-error");
  await expect(error).toContainText("can only be changed to");
  await expect(error).toContainText("cancelled");
  await expectAccessible(page);
  await dialog.getByRole("button", { name: "Cancel" }).click();
});

test("booking detail: resend the confirmation email", async () => {
  const r = refs();
  const to = "alice.turner@example.com";
  const before = emailCount(to);
  await openBooking(page, r.today_paid, "upcoming");
  await page.getByTestId("booking-actions").click();
  await page.getByRole("menuitem", { name: "Resend confirmation email" }).click();
  await page.getByRole("button", { name: "Resend email" }).click();
  await expect(page.getByText(`Confirmation email sent again to ${to}.`)).toBeVisible();
  await expect.poll(() => emailCount(to), { timeout: 30_000 }).toBeGreaterThan(before);
  expect((await latestEmail(to)).text).toContain(r.today_paid);
});

test("booking detail: mark a pay later booking as paid offline", async () => {
  const r = refs();
  await openBooking(page, r.pay_later, "upcoming");
  const panel = page.getByTestId("payment-panel");
  await expect(panel).toContainText("Payment due upon inspection");
  await panel.getByTestId("mark-paid").click();
  const dialog = page.getByRole("dialog", { name: "Mark as paid offline" });
  await dialog.getByLabel("Method").selectOption({ label: "Cash" });
  await dialog.getByLabel("Reference").fill("Cash on the day");
  await expectAccessible(page);
  await dialog.getByTestId("mark-paid-submit").click();
  await expect(page.getByText("Payment recorded.")).toBeVisible();
  await expect(panel).toContainText("paid offline (Cash)");
  await expect(panel).toContainText("ref Cash on the day");
  await expect(panel.getByTestId("mark-paid")).toHaveCount(0);
});

test("booking detail: upload a certificate (Cloudinary mocked)", async () => {
  const r = refs();
  let uploads = 0;
  await page.route("https://api.cloudinary.com/**", async (route) => {
    uploads += 1;
    const body = route.request().postDataBuffer()?.toString("latin1") ?? "";
    const publicId = /name="public_id"\r\n\r\n([^\r]+)/.exec(body)?.[1] ?? "certificate";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ public_id: publicId, format: "pdf", bytes: 48000 }),
    });
  });
  await openBooking(page, r.completed_later, "past");
  const panel = page.getByTestId("certificates-panel");
  const before = await panel.getByRole("listitem").count();
  await panel.getByTestId("upload-certificate").click();
  const dialog = page.getByRole("dialog", { name: "Upload a certificate" });
  await dialog.locator("#certificate-file").setInputFiles({
    name: "eicr-renewal.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%e2e\n"),
  });
  await expect(dialog.getByTestId("chosen-file")).toHaveText("eicr-renewal.pdf");
  await expectAccessible(page);
  await dialog.getByTestId("certificate-submit").click();
  await expect(page.getByText(/^Certificate uploaded/)).toBeVisible();
  expect(uploads).toBe(1);
  await expect(panel.getByRole("listitem")).toHaveCount(before + 1);
  await page.unroute("https://api.cloudinary.com/**");
});

test("booking detail: cancel a booking", async () => {
  const r = refs();
  await openBooking(page, r.pending, "upcoming");
  await page.getByTestId("booking-actions").click();
  await page.getByRole("menuitem", { name: "Cancel booking" }).click();
  const dialog = page.getByRole("dialog", { name: `Cancel ${r.pending}?` });
  await dialog.getByTestId("cancel-confirm").click();
  await expect(dialog.getByText("Give a reason for cancelling.")).toBeVisible();
  await dialog.getByLabel("Reason").fill("Customer booked by mistake");
  await expectAccessible(page);
  await dialog.getByTestId("cancel-confirm").click();
  await expect(page.getByText("Booking cancelled.")).toBeVisible();
  await expect(page.getByRole("main")).toContainText("Cancelled");
  await page.goto(`/bookings/upcoming?q=${r.pending}`);
  await expect.poll(shownReferences).toEqual([]);
});
