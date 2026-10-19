import { describe, expect, it } from "vitest";

import {
  selectedWindow,
  timeOf,
  windowCards,
  type AvailabilityDay,
} from "@/lib/bookings/reschedule";

const day = (overrides: Partial<AvailabilityDay> = {}): AvailabilityDay => ({
  date: "2026-10-14",
  blocked: false,
  blocked_reason: null,
  slots: [
    { code: "AM", start: "2026-10-14T08:00:00+01:00", label: "8:00am to 1:00pm" },
    { code: "PM", start: "2026-10-14T13:00:00+01:00", label: "1:00pm to 6:00pm" },
  ],
  ...overrides,
});

describe("window cards", () => {
  it("offers every window of an upcoming date", () => {
    const cards = windowCards(day(), { today: "2026-10-11" });
    expect(cards.map((c) => [c.code, c.label, c.selectable, c.note])).toEqual([
      ["AM", "8:00am to 1:00pm", true, null],
      ["PM", "1:00pm to 6:00pm", true, null],
    ]);
  });

  it("has nothing to offer on a blocked date and refuses past days", () => {
    const closed = windowCards(day({ blocked: true, blocked_reason: "Bank holiday", slots: [] }), {
      today: "2026-10-11",
    });
    expect(closed).toEqual([]);
    const past = windowCards(day(), { today: "2026-10-15" });
    expect(past.every((c) => !c.selectable && c.note === "In the past")).toBe(true);
  });

  it("shows the current appointment but never offers it", () => {
    const cards = windowCards(day(), {
      today: "2026-10-11",
      current: { date: "2026-10-14", code: "AM" },
    });
    expect(cards[0]).toMatchObject({ current: true, selectable: false });
  });

  it("drops a chosen window that is no longer selectable", () => {
    const current = { date: "2026-10-14", code: "PM" };
    const open = windowCards(day(), { today: "2026-10-11", current });
    expect(selectedWindow(open, "AM")?.code).toBe("AM");
    expect(selectedWindow(open, "PM")).toBeNull();
    expect(selectedWindow(open, null)).toBeNull();
    expect(windowCards(undefined, { today: "2026-10-11" })).toEqual([]);
  });

  it("reads the local start time", () => {
    expect(timeOf("2026-10-14T13:00:00+01:00")).toBe("13:00");
    expect(timeOf("nonsense")).toBe("08:00");
  });
});
