import { describe, expect, it } from "vitest";

import {
  groupEvents,
  monthGrid,
  shiftAnchor,
  visibleRange,
  weekDays,
  windowOf,
} from "@/lib/calendar/grid";
import { addMonths, daysBetween, endOfMonth, londonDateOf, weekdayIndex } from "@/lib/dates";

describe("month grid", () => {
  it("covers October 2026 in whole Monday first weeks", () => {
    const weeks = monthGrid("2026-10-11");
    expect(weeks).toHaveLength(5);
    expect(weeks[0]?.[0]).toEqual({ date: "2026-09-28", inMonth: false });
    expect(weeks[0]?.[3]).toEqual({ date: "2026-10-01", inMonth: true });
    expect(weeks.at(-1)?.[6]).toEqual({ date: "2026-11-01", inMonth: false });
  });

  it("has every day exactly once across the October clock change", () => {
    // Clocks go back on Sunday 25 October 2026.
    const days = monthGrid("2026-10-01")
      .flat()
      .map((d) => d.date);
    expect(new Set(days).size).toBe(days.length);
    expect(days).toContain("2026-10-25");
    expect(days).toContain("2026-10-26");
    for (let i = 1; i < days.length; i++) {
      expect(daysBetween(days[i - 1] ?? "", days[i] ?? "")).toBe(1);
    }
  });

  it("crosses month and year boundaries", () => {
    const december = monthGrid("2026-12-15");
    expect(
      december
        .at(-1)
        ?.slice(-3)
        .map((d) => d.date),
    ).toEqual(["2027-01-01", "2027-01-02", "2027-01-03"]);
    // February 2027 starts on a Monday and ends on a Sunday: exactly four weeks.
    expect(monthGrid("2027-02-10")).toHaveLength(4);
    expect(endOfMonth("2028-02-01")).toBe("2028-02-29");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("gives the requested range for each view", () => {
    expect(visibleRange("month", "2026-10-20")).toEqual({ from: "2026-09-28", to: "2026-11-01" });
    expect(visibleRange("week", "2026-10-25")).toEqual({ from: "2026-10-19", to: "2026-10-25" });
  });
});

describe("week view", () => {
  it("runs Monday to Sunday through the clock change", () => {
    expect(weekDays("2026-10-25")).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    expect(weekdayIndex("2026-10-26")).toBe(0);
  });

  it("moves by a week or a month", () => {
    expect(shiftAnchor("week", "2026-10-22", 1)).toBe("2026-10-29");
    expect(shiftAnchor("month", "2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftAnchor("month", "2026-03-31", -1)).toBe("2026-02-01");
    expect(shiftAnchor("month", "2026-01-15", -1)).toBe("2025-12-01");
  });
});

describe("events by London date and window", () => {
  it("places events on their London day, before and after the clock change", () => {
    // 23:30 UTC on 24 October is 00:30 BST on the 25th; on 26 October it is still the 26th.
    expect(londonDateOf("2026-10-24T23:30:00Z")).toBe("2026-10-25");
    expect(londonDateOf("2026-10-26T23:30:00Z")).toBe("2026-10-26");
  });

  it("uses the window code, or the London start hour", () => {
    expect(windowOf({ start: "2026-10-26T12:30:00Z", window_code: "PM" })).toBe("PM");
    // 12:30 UTC is 13:30 BST before the change and 12:30 GMT after it.
    expect(windowOf({ start: "2026-10-23T12:30:00Z" })).toBe("PM");
    expect(windowOf({ start: "2026-10-26T12:30:00Z" })).toBe("AM");
  });

  it("groups events by day then window", () => {
    const grouped = groupEvents([
      { start: "2026-10-25T08:00:00Z", window_code: "AM" },
      { start: "2026-10-25T09:00:00Z", window_code: "AM" },
      { start: "2026-10-25T14:00:00Z", window_code: "PM" },
    ]);
    expect(grouped.get("2026-10-25")?.get("AM")).toHaveLength(2);
    expect(grouped.get("2026-10-25")?.get("PM")).toHaveLength(1);
  });
});
