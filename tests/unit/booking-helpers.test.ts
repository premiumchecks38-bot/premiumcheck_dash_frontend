import { describe, expect, it } from "vitest";

import { isUrgent, daysUntil } from "@/components/dashboard/payments/disputes-table";
import { readPrefill } from "@/lib/bookings/prefill";
import { toCsv } from "@/lib/csv";
import { parsePreset, rangeFor } from "@/lib/payments/ranges";

const OPTION = "1c2d3e4f-5678-4abc-9def-0123456789ab";

describe("toCsv", () => {
  it("quotes commas, quotes and new lines", () => {
    expect(toCsv(["a", "b"], [["x, y", 'say "hi"']])).toBe('a,b\r\n"x, y","say ""hi"""\r\n');
  });

  it("defuses spreadsheet formulas", () => {
    expect(toCsv(["a"], [["=SUM(A1)"], ["+44 7700"], ["@x"]])).toBe(
      "a\r\n'=SUM(A1)\r\n'+44 7700\r\n'@x\r\n",
    );
  });

  it("leaves empty cells empty", () => {
    expect(toCsv(["a", "b"], [[null, undefined]])).toBe("a,b\r\n,\r\n");
  });
});

describe("readPrefill", () => {
  it("reads a renewal link", () => {
    const prefill = readPrefill(
      new URLSearchParams({
        email: "jo@example.com",
        name: "Jo Bloggs",
        address: "10 Oak Avenue, St Albans, al1 3ab",
        items: `${OPTION}:2,not-an-id`,
        certificate_type: "eicr",
        renewal: "PPC-24008",
      }),
    );
    expect(prefill).toMatchObject({
      email: "jo@example.com",
      name: "Jo Bloggs",
      addressLine1: "10 Oak Avenue",
      city: "St Albans",
      postcode: "AL1 3AB",
      items: [{ optionId: OPTION, quantity: 2 }],
      certificateType: "eicr",
      notes: "Renewal of PPC-24008.",
    });
  });

  it("keeps quantities sensible", () => {
    const prefill = readPrefill(new URLSearchParams({ items: `${OPTION}:999` }));
    expect(prefill.items[0]?.quantity).toBe(50);
  });
});

describe("payment ranges", () => {
  it("gives this month, last month, the last 30 days and this year", () => {
    expect(rangeFor("this_month", { from: "", to: "" }, "2026-10-11")).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(rangeFor("last_month", { from: "", to: "" }, "2026-03-15")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(rangeFor("last_30_days", { from: "", to: "" }, "2026-10-11")).toEqual({
      from: "2026-09-12",
      to: "2026-10-11",
    });
    expect(rangeFor("this_year", { from: "", to: "" }, "2026-10-11")).toEqual({
      from: "2026-01-01",
      to: "2026-10-11",
    });
  });

  it("repairs a custom range that ends before it starts", () => {
    expect(rangeFor("custom", { from: "2026-10-05", to: "2026-10-01" }, "2026-10-11")).toEqual({
      from: "2026-10-05",
      to: "2026-10-11",
    });
    expect(parsePreset("nonsense")).toBe("this_month");
  });
});

describe("dispute deadlines", () => {
  const now = Date.parse("2026-10-11T12:00:00Z");

  it("warns when evidence is due within three days", () => {
    expect(
      isUrgent({ status: "needs_response", evidence_due_by: "2026-10-13T12:00:00Z" }, now),
    ).toBe(true);
    expect(
      isUrgent({ status: "needs_response", evidence_due_by: "2026-10-20T12:00:00Z" }, now),
    ).toBe(false);
    expect(isUrgent({ status: "won", evidence_due_by: "2026-10-12T12:00:00Z" }, now)).toBe(false);
    expect(isUrgent({ status: "needs_response", evidence_due_by: null }, now)).toBe(false);
    expect(daysUntil("2026-10-14T13:00:00Z", now)).toBe(3);
  });
});
