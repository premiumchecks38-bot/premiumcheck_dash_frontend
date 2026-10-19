import { expect, test, type Page } from "@playwright/test";

import { chooseOpenWindow, expectAccessible, sharedPage } from "./support";

/** A phone booking taken in the dashboard, with the live quote from the backend. */

test.describe.configure({ mode: "serial" });

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await sharedPage(browser, "owner");
});

test.afterAll(async () => {
  await page.context().close();
});

test("new phone booking with a live quote", async () => {
  await page.goto("/bookings/new");
  await expect(page.getByRole("heading", { level: 1, name: "New booking" })).toBeVisible();
  await expectAccessible(page);

  // Submitting empty explains what is missing.
  await page.getByTestId("create-booking").click();
  await expect(page.getByTestId("new-booking-error")).toHaveText("Some details need correcting.");
  await expect(page.getByText("Enter the customer's name")).toBeVisible();

  await page.getByRole("radio", { name: "New customer" }).check();
  await page.getByRole("textbox", { name: "Full name", exact: true }).fill("Phoebe Quinn");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("phoebe.quinn@example.com");
  await page.getByRole("textbox", { name: "Phone", exact: true }).fill("07911 123456");
  await page.getByRole("textbox", { name: "Address line 1", exact: true }).fill("4 Mill Lane");
  await page.getByRole("textbox", { name: "Town or city", exact: true }).fill("St Albans");
  await page.getByRole("textbox", { name: "Postcode", exact: true }).fill("AL3 5AB");

  const quote = page.getByTestId("live-quote");
  await page.getByTestId("add-service").click();
  await expect(page.getByTestId("quote-total")).toHaveText(/^£\d[\d,]*\.\d{2}$/);
  const first = (await page.getByTestId("quote-total").textContent()) ?? "";

  // A second service is priced by the backend straight away.
  await page.getByTestId("add-service").click();
  await expect(page.getByTestId("booking-lines").getByLabel(/^Service \d$/)).toHaveCount(2);
  await expect(page.getByTestId("quote-total")).not.toHaveText(first);
  await expect(quote).toContainText("VAT");

  await chooseOpenWindow(page, "new-booking", 3);
  await expect(page.getByRole("radio", { name: /^Pay on inspection/ })).toBeChecked();
  await page.getByLabel("Internal notes").fill("Booked by phone in the e2e test");
  await expectAccessible(page);

  await page.getByTestId("create-booking").click();
  await expect(page).toHaveURL(/\/bookings\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: /^PPC-/ })).toBeVisible();
  await expect(page.getByText(/^Booking PPC-\d+ created\.$/)).toBeVisible();
  await expect(page.getByRole("main")).toContainText("Phoebe Quinn");
  await expect(page.getByTestId("payment-panel")).toContainText("Payment due upon inspection");
});

test("new booking prefilled from the address bar", async () => {
  await page.goto(
    "/bookings/new?email=ruth.stone%40example.com&name=Ruth%20Stone&phone=07911654321&address=22%20Elm%20Road%2C%20Harpenden%2C%20AL5%202AB&notes=Called%20about%20a%20quote",
  );
  await expect(page.getByRole("textbox", { name: "Full name", exact: true })).toHaveValue(
    "Ruth Stone",
  );
  await expect(page.getByRole("textbox", { name: "Email", exact: true })).toHaveValue(
    "ruth.stone@example.com",
  );
  await expect(page.getByRole("textbox", { name: "Address line 1", exact: true })).toHaveValue(
    "22 Elm Road",
  );
  await expect(page.getByRole("textbox", { name: "Town or city", exact: true })).toHaveValue(
    "Harpenden",
  );
  await expect(page.getByRole("textbox", { name: "Postcode", exact: true })).toHaveValue("AL5 2AB");
  await expect(page.getByLabel("Internal notes")).toHaveValue("Called about a quote");
});
