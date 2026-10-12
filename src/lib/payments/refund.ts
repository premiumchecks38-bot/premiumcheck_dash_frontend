import { z } from "zod";

import "@/lib/zod-setup";

/**
 * Refund form rules. Amounts are typed in pounds and sent in pence. The backend is the real
 * check: it also refuses refunds above the approval limit for managers (REFUND_LIMIT_EXCEEDED),
 * and once that limit is known the form refuses larger amounts straight away.
 */

export const REFUND_REASONS = [
  "requested_by_customer",
  "duplicate",
  "fraudulent",
  "other",
] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

export const REFUND_REASON_LABELS: Record<RefundReason, string> = {
  requested_by_customer: "Requested by the customer",
  duplicate: "Duplicate payment",
  fraudulent: "Fraudulent payment",
  other: "Another reason",
};

/** "12.50" or "£12.50" to 1250; null when it is not a valid amount. */
export function poundsToPence(value: string): number | null {
  const clean = value.trim().replace(/^£/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const [pounds = "0", pence = ""] = clean.split(".");
  return Number(pounds) * 100 + Number(pence.padEnd(2, "0"));
}

export function penceToPounds(pence: number): string {
  return (pence / 100).toFixed(2);
}

function pounds(pence: number): string {
  return `£${penceToPounds(pence).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export interface RefundRules {
  /** What is left to refund on the payment. */
  remainingPence: number;
  /** The approval limit, when the signed in person is limited (managers). */
  limitPence?: number | null;
}

/** Rules are read when the form validates, so a limit learned later still applies. */
export function refundSchema(rules: RefundRules) {
  return z
    .object({
      amount: z.string(),
      reason: z.enum(REFUND_REASONS),
      note: z.string().trim().max(500, { error: "Keep the note under 500 characters" }),
      cancelBooking: z.boolean(),
    })
    .superRefine((values, ctx) => {
      const { remainingPence, limitPence } = rules;
      const pence = poundsToPence(values.amount);
      if (pence === null || pence <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: "Enter an amount in pounds, like 25.00",
        });
        return;
      }
      if (pence > remainingPence) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: `You can refund up to ${pounds(remainingPence)}`,
        });
        return;
      }
      if (limitPence != null && pence > limitPence) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: `Refunds over ${pounds(limitPence)} need an owner or admin`,
        });
      }
    });
}

export type RefundValues = z.infer<ReturnType<typeof refundSchema>>;
