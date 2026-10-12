import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATE_LABELS,
  PAYMENT_STATE_TONE,
  PAYMENT_STATUS_LABELS,
  paymentState,
  type PaymentStateInput,
} from "@/lib/bookings/badges";

export function BookingStatusBadge({ status }: { status: string }) {
  return <StatusBadge kind="booking" status={status} label={BOOKING_STATUS_LABELS[status]} />;
}

/** Paid, Payment due upon inspection, Pending payment (or expired, refunded). */
export function BookingPaymentBadge({ booking }: { booking: PaymentStateInput }) {
  const state = paymentState(booking);
  return (
    <StatusBadge
      kind="payment"
      status={PAYMENT_STATE_TONE[state]}
      label={PAYMENT_STATE_LABELS[state]}
    />
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return <StatusBadge kind="payment" status={status} label={PAYMENT_STATUS_LABELS[status]} />;
}
