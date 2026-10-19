import { ApiError } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";

import { BOOKING_STATUS_LABELS, statusList } from "./badges";

/**
 * Booking action errors in plain words. A refused status change (409) names the statuses the
 * booking can move to; a full window says so.
 */
export function bookingErrorMessage(error: unknown, allowed: readonly string[] = []): string {
  if (error instanceof ApiError) {
    if (error.code === "INVALID_STATUS_TRANSITION") {
      const details = (error.details ?? {}) as { from?: string; to?: string; allowed?: string[] };
      const next = details.allowed ?? allowed;
      const from = details.from
        ? (BOOKING_STATUS_LABELS[details.from] ?? details.from).toLowerCase()
        : "its current status";
      return next.length
        ? `A booking that is ${from} can only be changed to ${statusList(next)}.`
        : `A booking that is ${from} cannot be changed any more.`;
    }
    if (error.code === "SLOT_UNAVAILABLE") {
      return "That window can no longer be booked. Choose another date or window.";
    }
    if (error.code === "INVALID_SLOT") {
      return "That date or window is blocked. Choose another date, or unblock it on the Availability page.";
    }
  }
  return errorMessage(error);
}
