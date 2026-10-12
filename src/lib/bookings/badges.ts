/**
 * How a booking's payment is described on every booking screen. One function, so the list, the
 * detail page, the calendar and the customer page always agree.
 */

export type PaymentState =
  "paid" | "payment_due" | "pending_payment" | "expired" | "refunded" | "none";

export interface PaymentStateInput {
  status: string;
  payment_due: boolean;
  payment_expired: boolean;
}

export function paymentState(booking: PaymentStateInput): PaymentState {
  if (booking.status === "refunded") return "refunded";
  if (booking.status === "pending_payment")
    return booking.payment_expired ? "expired" : "pending_payment";
  if (booking.payment_due) return "payment_due";
  if (booking.status === "cancelled" || booking.status === "no_show") return "none";
  return "paid";
}

export const PAYMENT_STATE_LABELS: Record<PaymentState, string> = {
  paid: "Paid",
  payment_due: "Payment due upon inspection",
  pending_payment: "Pending payment",
  expired: "Payment window expired",
  refunded: "Refunded",
  none: "No payment",
};

/** The StatusBadge "payment" status that gives each state its colour. */
export const PAYMENT_STATE_TONE: Record<PaymentState, string> = {
  paid: "succeeded",
  payment_due: "due",
  pending_payment: "pending",
  expired: "failed",
  refunded: "refunded",
  none: "canceled",
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending payment",
  confirmed: "Confirmed",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  no_show: "No show",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  succeeded: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  disputed: "Disputed",
};

/** "confirmed, scheduled or in progress" style list for state machine messages. */
export function statusList(statuses: readonly string[]): string {
  const labels = statuses.map((s) => (BOOKING_STATUS_LABELS[s] ?? s).toLowerCase());
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} or ${labels.at(-1) ?? ""}`;
}
