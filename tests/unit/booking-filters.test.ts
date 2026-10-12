import { describe, expect, it } from "vitest";

import { queryString } from "@/lib/client/api";
import {
  activeFilterCount,
  EMPTY_FILTERS,
  filtersToParams,
  filtersToQuery,
  parseFilters,
  presetRange,
  type BookingFilters,
} from "@/lib/bookings/filters";

const ENGINEER = "0b7e1c3a-1234-4abc-9def-0123456789ab";
const SERVICE = "1c2d3e4f-5678-4abc-9def-0123456789ab";

describe("booking filters and the URL", () => {
  it("round trips every filter through the URL", () => {
    const filters: BookingFilters = {
      ...EMPTY_FILTERS,
      q: "PPC-24001",
      statuses: ["confirmed", "scheduled"],
      service: SERVICE,
      engineer: ENGINEER,
      payment: "payment_due",
      window: "AM",
      from: "2026-10-01",
      to: "2026-10-31",
      attention: true,
      unassigned: true,
      hasCertificate: "yes",
      expiringWithin: "30",
      sort: "-appointment",
      page: 3,
    };
    const params = filtersToParams(filters);
    expect(parseFilters(new URLSearchParams(params.toString()))).toEqual(filters);
  });

  it("leaves defaults out of the URL", () => {
    expect(filtersToParams(EMPTY_FILTERS).toString()).toBe("");
    expect(parseFilters(new URLSearchParams())).toEqual(EMPTY_FILTERS);
  });

  it("keeps a preset instead of its dates", () => {
    const params = filtersToParams({ ...EMPTY_FILTERS, preset: "today", from: "2026-01-01" });
    expect(params.get("preset")).toBe("today");
    expect(params.has("from")).toBe(false);
  });

  it("ignores malformed values from a hand edited URL", () => {
    const filters = parseFilters(
      new URLSearchParams(
        "status=confirmed,bogus,confirmed&engineer=not-a-uuid&payment=free&from=2026-13-45&page=-2&window=A1&expiring=abcd&sort=name",
      ),
    );
    expect(filters.statuses).toEqual(["confirmed"]);
    expect(filters.engineer).toBe("");
    expect(filters.payment).toBe("");
    expect(filters.from).toBe("");
    expect(filters.page).toBe(1);
    expect(filters.window).toBe("");
    expect(filters.expiringWithin).toBe("");
    expect(filters.sort).toBe("");
  });

  it("turns filters into the backend query, repeating statuses", () => {
    const query = filtersToQuery(
      {
        ...EMPTY_FILTERS,
        statuses: ["confirmed", "scheduled"],
        preset: "next_7_days",
        attention: true,
        hasCertificate: "no",
        expiringWithin: "60",
      },
      25,
      "2026-10-11",
    );
    expect(query).toEqual({
      page: 1,
      page_size: 25,
      status: ["confirmed", "scheduled"],
      date_from: "2026-10-11",
      date_to: "2026-10-17",
      needs_attention: true,
      has_certificate: false,
      certificate_expiring_within_days: 60,
    });
    expect(queryString(query)).toContain("status=confirmed&status=scheduled");
  });

  it("counts the active filters", () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(
      activeFilterCount({
        ...EMPTY_FILTERS,
        q: " x ",
        statuses: ["completed"],
        from: "2026-10-01",
      }),
    ).toBe(3);
  });
});

describe("date presets (London dates)", () => {
  it("covers today, tomorrow, this week and this month", () => {
    // Sunday 11 October 2026.
    expect(presetRange("today", "2026-10-11")).toEqual({ from: "2026-10-11", to: "2026-10-11" });
    expect(presetRange("tomorrow", "2026-10-31")).toEqual({
      from: "2026-11-01",
      to: "2026-11-01",
    });
    expect(presetRange("this_week", "2026-10-07")).toEqual({
      from: "2026-10-07",
      to: "2026-10-11",
    });
    expect(presetRange("this_month", "2026-02-10")).toEqual({
      from: "2026-02-10",
      to: "2026-02-28",
    });
  });
});
