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
      return "That window has no places left. Choose another window, or override capacity if you are an owner or admin.";
    }
    if (error.code === "INVALID_SLOT") {
      return "That date and window cannot be booked (closed, in the past or outside opening hours).";
    }
  }
  return errorMessage(error);
}
