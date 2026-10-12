import { cn } from "@/lib/utils/cn";

/**
 * One colour mapping for every status in the dashboard. Tones come from the semantic status
 * tokens (tokens.dashboard.css): positive, negative, pending, info and neutral.
 */
export type StatusKind =
  | "booking"
  | "payment"
  | "refund"
  | "dispute"
  | "payout"
  | "lead"
  | "user"
  | "content"
  | "email";
type Tone = "positive" | "negative" | "pending" | "info" | "neutral";

const TONES: Record<StatusKind, Record<string, Tone>> = {
  booking: {
    pending_payment: "pending",
    confirmed: "info",
    scheduled: "info",
    in_progress: "pending",
    completed: "positive",
    cancelled: "neutral",
    no_show: "negative",
    refunded: "neutral",
  },
  payment: {
    pending: "pending",
    processing: "pending",
    succeeded: "positive",
    paid: "positive",
    failed: "negative",
    canceled: "neutral",
    refunded: "neutral",
    partially_refunded: "pending",
    disputed: "negative",
    due: "pending",
  },
  refund: { pending: "pending", succeeded: "positive", failed: "negative", canceled: "neutral" },
  dispute: {
    warning_needs_response: "negative",
    needs_response: "negative",
    under_review: "pending",
    warning_under_review: "pending",
    won: "positive",
    lost: "negative",
    warning_closed: "neutral",
  },
  payout: {
    pending: "pending",
    in_transit: "info",
    paid: "positive",
    failed: "negative",
    canceled: "neutral",
  },
  lead: {
    new: "info",
    contacted: "pending",
    quoted: "pending",
    won: "positive",
    lost: "neutral",
    converted: "positive",
  },
  user: { active: "positive", invited: "info", deactivated: "neutral" },
  content: {
    draft: "neutral",
    scheduled: "info",
    published: "positive",
    active: "positive",
    inactive: "neutral",
    deleted: "negative",
    missing: "negative",
    unread: "info",
  },
  email: { queued: "pending", sent: "positive", failed: "negative" },
};

const TONE_CLASSES: Record<Tone, string> = {
  positive: "bg-status-positive-bg text-status-positive-text",
  negative: "bg-status-negative-bg text-status-negative-text",
  pending: "bg-status-pending-bg text-status-pending-text",
  info: "bg-status-info-bg text-status-info-text",
  neutral: "bg-status-neutral-bg text-status-neutral-text",
};

export function statusTone(kind: StatusKind, status: string): Tone {
  return TONES[kind][status] ?? "neutral";
}

/** Background and text classes of a status, for chips that are not badges (calendar). */
export function statusClasses(kind: StatusKind, status: string): string {
  return TONE_CLASSES[statusTone(kind, status)];
}

/** "pending_payment" to "Pending payment". */
export function statusLabel(status: string): string {
  const text = status.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function StatusBadge({
  kind,
  status,
  label,
  className,
}: {
  kind: StatusKind;
  status: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-body text-caption font-semibold whitespace-nowrap",
        TONE_CLASSES[statusTone(kind, status)],
        className,
      )}
      data-status={status}
    >
      {label ?? statusLabel(status)}
    </span>
  );
}
