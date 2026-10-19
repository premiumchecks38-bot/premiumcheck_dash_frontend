import { describe, expect, it } from "vitest";

import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATE_LABELS,
  PAYMENT_STATE_TONE,
  paymentState,
  statusList,
} from "@/lib/bookings/badges";
import { BOOKING_STATUSES } from "@/lib/bookings/filters";
import { ApiError } from "@/lib/client/api";
import { bookingErrorMessage } from "@/lib/bookings/errors";

const base = { payment_due: false, payment_expired: false };

describe("paymentState", () => {
  it.each([
    [{ ...base, status: "confirmed" }, "paid"],
    [{ ...base, status: "scheduled", payment_due: true }, "payment_due"],
    [{ ...base, status: "pending_payment" }, "pending_payment"],
    [{ ...base, status: "pending_payment", payment_expired: true }, "expired"],
    [{ ...base, status: "refunded" }, "refunded"],
    [{ ...base, status: "cancelled" }, "none"],
    [{ ...base, status: "no_show" }, "none"],
    [{ ...base, status: "completed", payment_due: true }, "payment_due"],
  ])("maps %o to %s", (input, expected) => {
    expect(paymentState(input)).toBe(expected);
  });

  it("has a label and a colour for every state", () => {
    for (const state of Object.keys(PAYMENT_STATE_LABELS)) {
      expect(PAYMENT_STATE_TONE[state as keyof typeof PAYMENT_STATE_TONE]).toBeTruthy();
    }
    expect(PAYMENT_STATE_LABELS.payment_due).toBe("Payment due upon inspection");
  });
});

describe("booking status labels", () => {
  it("labels every booking status", () => {
    for (const status of BOOKING_STATUSES) expect(BOOKING_STATUS_LABELS[status]).toBeTruthy();
  });

  it("lists statuses in plain words", () => {
    expect(statusList([])).toBe("");
    expect(statusList(["completed"])).toBe("completed");
    expect(statusList(["confirmed", "scheduled", "in_progress"])).toBe(
      "confirmed, scheduled or in progress",
    );
  });
});

describe("bookingErrorMessage", () => {
  it("names the allowed statuses for a refused transition", () => {
    const error = new ApiError(409, "INVALID_STATUS_TRANSITION", "Invalid", {
      from: "completed",
      to: "scheduled",
      allowed: ["refunded"],
    });
    expect(bookingErrorMessage(error)).toBe(
      "A booking that is completed can only be changed to refunded.",
    );
  });

  it("says when nothing is allowed", () => {
    const error = new ApiError(409, "INVALID_STATUS_TRANSITION", "Invalid", {
      from: "refunded",
      allowed: [],
    });
    expect(bookingErrorMessage(error)).toBe(
      "A booking that is refunded cannot be changed any more.",
    );
  });

  it("explains a window that can no longer be booked", () => {
    const error = new ApiError(409, "SLOT_UNAVAILABLE", "Unavailable");
    expect(bookingErrorMessage(error)).toMatch(/can no longer be booked/);
    const blocked = new ApiError(400, "INVALID_SLOT", "Blocked");
    expect(bookingErrorMessage(blocked)).toMatch(/blocked/);
  });
});
