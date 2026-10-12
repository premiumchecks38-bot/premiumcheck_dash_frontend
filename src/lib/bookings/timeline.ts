import { BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "./badges";
import { humanise, OFFLINE_METHOD_LABELS } from "./labels";

/** One line on a booking's timeline: status changes, payments and emails, newest first. */
export interface TimelineItem {
  at: string;
  kind: "status" | "payment" | "email";
  title: string;
  detail: string | null;
}

interface StatusChange {
  from_status: string | null;
  to_status: string;
  note: string | null;
  changed_by: { name: string } | null;
  created_at: string;
}

interface PaymentLine {
  status: string;
  payment_source: string;
  amount_pence: number;
  payment_method_type: string | null;
  offline_reference: string | null;
  paid_at: string | null;
  created_at: string;
}

interface EmailLine {
  template: string;
  subject: string;
  to_email: string;
  status: string;
  created_at: string;
  sent_at: string | null;
}

function pounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function buildTimeline(input: {
  status_history: readonly StatusChange[];
  payments: readonly PaymentLine[];
  emails?: readonly EmailLine[];
}): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const change of input.status_history) {
    const to = BOOKING_STATUS_LABELS[change.to_status] ?? humanise(change.to_status);
    const by = change.changed_by ? `by ${change.changed_by.name}` : null;
    items.push({
      at: change.created_at,
      kind: "status",
      title: change.from_status ? `Status changed to ${to}` : `Booked (${to})`,
      detail: [by, change.note].filter(Boolean).join(". ") || null,
    });
  }
  for (const payment of input.payments) {
    const offline = payment.payment_source === "offline";
    const how = offline
      ? (OFFLINE_METHOD_LABELS[payment.payment_method_type ?? ""] ?? "Offline")
      : "Card";
    items.push({
      at: payment.paid_at ?? payment.created_at,
      kind: "payment",
      title: `${pounds(payment.amount_pence)} ${offline ? "paid offline" : "card payment"}: ${
        PAYMENT_STATUS_LABELS[payment.status] ?? humanise(payment.status)
      }`,
      detail: [how, payment.offline_reference].filter(Boolean).join(", ") || null,
    });
  }
  for (const email of input.emails ?? []) {
    items.push({
      at: email.sent_at ?? email.created_at,
      kind: "email",
      title: `Email: ${email.subject}`,
      detail: `${humanise(email.template)} to ${email.to_email} (${email.status})`,
    });
  }
  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
