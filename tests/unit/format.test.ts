import { describe, expect, it } from "vitest";

import { formatDateTime } from "@/components/dashboard/date-time-text";
import { formatMoney } from "@/components/dashboard/money-text";

describe("formatMoney", () => {
  it("shows integer pence as pounds", () => {
    expect(formatMoney(13417)).toBe("£134.17");
    expect(formatMoney(0)).toBe("£0.00");
    expect(formatMoney(100000)).toBe("£1,000.00");
  });

  it("puts the minus sign before the pound sign", () => {
    expect(formatMoney(-1250)).toBe("-£12.50");
  });
});

describe("formatDateTime (Europe/London)", () => {
  it("shows British summer time", () => {
    expect(formatDateTime("2026-10-06T08:30:00Z")).toBe("6 October 2026 at 09:30");
  });

  it("shows GMT in winter", () => {
    expect(formatDateTime("2026-12-01T08:30:00Z")).toBe("1 December 2026 at 08:30");
  });

  it("moves late UTC evenings to the next London day", () => {
    expect(formatDateTime("2026-10-06T23:30:00Z", "date")).toBe("7 October 2026");
  });

  it("has short and time styles", () => {
    expect(formatDateTime("2026-10-06T08:30:00Z", "short")).toBe("6 Oct 2026, 09:30");
    expect(formatDateTime("2026-10-06T08:30:00Z", "time")).toBe("09:30");
  });
});
