import { expect, test } from "@playwright/test";

import { BACKEND_URL, expectAccessible, loginAsOwner } from "./support";

test("the bell receives a live notification and can mark everything read", async ({
  page,
  request,
}) => {
  await loginAsOwner(page);
  const bell = page.getByRole("button", { name: /^Notifications/ });
  await expect(bell).toBeVisible();
  // Clear anything from earlier tests so the count starts at zero.
  await page.evaluate(async () => {
    const csrf = /ppc_dash_csrf=([^;]+)/.exec(document.cookie)?.[1] ?? "";
    await fetch("/api/admin/notifications/read-all", {
      method: "POST",
      headers: { "X-CSRF-Token": csrf },
    });
  });
  await page.reload();
  await expect(page.getByTestId("notification-count")).toHaveCount(0);
  // Give the event stream a moment to connect.
  await page.waitForTimeout(1_500);

  // A visitor sends the contact form on the website.
  const subject = `E2E message ${String(Date.now())}`;
  const sent = await request.post(`${BACKEND_URL}/public/contact`, {
    data: {
      full_name: "Website Visitor",
      email: "visitor@example.com",
      subject,
      message: "Hello from the e2e test.",
    },
  });
  expect(sent.status()).toBe(202);

  // Pushed over the stream: the count and a toast appear without reloading.
  await expect(page.getByTestId("notification-count")).toHaveText("1", { timeout: 20_000 });
  await expect(page.locator("[data-sonner-toast]").first()).toBeVisible();

  await bell.click();
  const list = page.getByTestId("notification-list");
  await expect(list.getByRole("listitem")).not.toHaveCount(0);
  await expect(list.getByText("(unread)").first()).toBeAttached();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Mark all read" }).click();
  await expect(page.getByText("All notifications marked as read.")).toBeVisible();
  await expect(page.getByTestId("notification-count")).toHaveCount(0);
});
