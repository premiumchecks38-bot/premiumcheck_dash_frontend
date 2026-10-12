"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Receipt, RefreshCw, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { PaymentStatusBadge } from "@/components/dashboard/bookings/booking-badges";
import { DateTimeText } from "@/components/dashboard/date-time-text";
import { selectClass } from "@/components/dashboard/field-styles";
import { MoneyText } from "@/components/dashboard/money-text";
import { Facts } from "@/components/dashboard/panel";
import { usePermission } from "@/components/dashboard/session-context";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { PaymentDetail, RefundResult } from "@/lib/api/schemas";
import { humanise, OFFLINE_METHOD_LABELS } from "@/lib/bookings/labels";
import { admin, ApiError } from "@/lib/client/api";
import { applyFieldErrors, errorMessage } from "@/lib/client/errors";
import {
  penceToPounds,
  poundsToPence,
  REFUND_REASON_LABELS,
  REFUND_REASONS,
  refundSchema,
  type RefundValues,
} from "@/lib/payments/refund";

export function PaymentSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("payments");
  const [refundOpen, setRefundOpen] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const query = useQuery({
    queryKey: ["payment", id],
    queryFn: () => admin<PaymentDetail>(`/payments/${id ?? ""}`),
    enabled: Boolean(id),
  });
  const p = query.data;

  const sync = async () => {
    if (!p) return;
    setSyncing(true);
    try {
      const updated = await admin<PaymentDetail>(`/payments/${p.id}/sync`, { method: "POST" });
      queryClient.setQueryData(["payment", p.id], updated);
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Updated from Stripe.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Sheet open={Boolean(id)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto" data-testid="payment-sheet">
        <SheetHeader>
          <SheetTitle>{p ? <MoneyText pence={p.amount_pence} /> : "Payment"}</SheetTitle>
          <SheetDescription>
            {p ? `${p.booking.customer_name}, booking ${p.booking.reference}` : "Loading..."}
          </SheetDescription>
        </SheetHeader>
        {!p ? (
          query.isError ? (
            <Alert variant="error">{errorMessage(query.error)}</Alert>
          ) : (
            <Skeleton className="mt-4 h-48 w-full" />
          )
        ) : (
          <div className="mt-4 space-y-6 font-body text-small">
            <div className="flex flex-wrap items-center gap-2">
              <PaymentStatusBadge status={p.status} />
              {p.booking.needs_attention ? (
                <StatusBadge kind="payment" status="failed" label="Needs attention" />
              ) : null}
            </div>

            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                {p.remaining_refundable_pence > 0 ? (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => setRefundOpen(true)}
                    data-testid="refund-open"
                  >
                    <Undo2 className="h-4 w-4" aria-hidden="true" /> Refund
                  </Button>
                ) : null}
                {p.payment_source === "stripe" ? (
                  <Button variant="outline" size="sm" loading={syncing} onClick={() => void sync()}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> Sync from Stripe
                  </Button>
                ) : null}
              </div>
            ) : null}

            <Facts
              items={[
                { label: "Amount", value: <MoneyText pence={p.amount_pence} /> },
                {
                  label: "Fee",
                  value: p.fee_pence === null ? "None" : <MoneyText pence={p.fee_pence} />,
                },
                {
                  label: "Net",
                  value: p.net_pence === null ? "Not known yet" : <MoneyText pence={p.net_pence} />,
                },
                { label: "Refunded", value: <MoneyText pence={p.amount_refunded_pence} /> },
                {
                  label: "Left to refund",
                  value: <MoneyText pence={p.remaining_refundable_pence} />,
                },
                {
                  label: "Method",
                  value:
                    p.payment_source === "offline"
                      ? `Offline, ${OFFLINE_METHOD_LABELS[p.payment_method_type ?? ""] ?? "other"}${p.offline_reference ? ` (${p.offline_reference})` : ""}`
                      : humanise(p.payment_method_type ?? "card"),
                },
                { label: "Paid", value: <DateTimeText value={p.paid_at} fallback="Not paid" /> },
                {
                  label: "Last synced",
                  value: <DateTimeText value={p.last_synced_at} fallback="Never" />,
                },
                {
                  label: "Booking",
                  value: (
                    <Link
                      href={`/bookings/${p.booking.id}` as Route}
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {p.booking.reference}
                    </Link>
                  ),
                },
              ]}
            />

            {p.payment_source === "stripe" ? (
              <div className="space-y-1 rounded-md bg-surface p-3 font-mono text-caption break-all">
                {p.stripe_payment_intent_id ? (
                  <p>Payment intent: {p.stripe_payment_intent_id}</p>
                ) : null}
                {p.stripe_charge_id ? <p>Charge: {p.stripe_charge_id}</p> : null}
                {p.stripe_checkout_session_id ? (
                  <p>Checkout session: {p.stripe_checkout_session_id}</p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {p.payment_source === "stripe" && p.stripe_dashboard_url ? (
                <a
                  href={p.stripe_dashboard_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-touch items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" /> View in Stripe
                </a>
              ) : null}
              {p.receipt_url ? (
                <a
                  href={p.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-touch items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
                >
                  <Receipt className="h-4 w-4" aria-hidden="true" /> Receipt
                </a>
              ) : null}
            </div>

            <section aria-labelledby="sheet-refunds">
              <h3 id="sheet-refunds" className="text-h5 font-heading font-bold text-primary">
                Refunds
              </h3>
              {p.refunds.length === 0 ? (
                <p className="mt-1 text-text-muted">No refunds.</p>
              ) : (
                <ul className="mt-2 divide-y-thin divide-border" data-testid="sheet-refunds-list">
                  {p.refunds.map((r) => (
                    <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                      <span>
                        <MoneyText pence={r.amount_pence} className="font-semibold" />,{" "}
                        {refundReasonLabel(r.reason)}
                        {r.note ? (
                          <span className="block text-caption text-text-muted">{r.note}</span>
                        ) : null}
                      </span>
                      <span className="text-right text-caption text-text-muted">
                        {humanise(r.status)}
                        <br />
                        <DateTimeText value={r.created_at} style="short" />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {p.disputes.length ? (
              <section aria-labelledby="sheet-disputes">
                <h3 id="sheet-disputes" className="text-h5 font-heading font-bold text-primary">
                  Disputes
                </h3>
                <ul className="mt-2 space-y-2">
                  {p.disputes.map((d) => (
                    <li key={d.id} className="flex flex-wrap justify-between gap-2">
                      <span>
                        <MoneyText pence={d.amount_pence} />,{" "}
                        {humanise(d.reason ?? "unknown reason")}
                      </span>
                      <StatusBadge kind="dispute" status={d.status} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section aria-labelledby="sheet-timeline">
              <h3 id="sheet-timeline" className="text-h5 font-heading font-bold text-primary">
                Timeline
              </h3>
              <ol className="mt-2 space-y-3">
                {[...p.timeline].reverse().map((entry, index) => (
                  <li
                    key={`${entry.at}-${String(index)}`}
                    className="border-l-thick border-border pl-3"
                  >
                    <p className="text-caption text-text-muted">
                      <DateTimeText value={entry.at} style="short" />
                    </p>
                    <p className="font-semibold">{entry.title}</p>
                    {entry.detail ? (
                      <p className="text-caption text-text-muted">{entry.detail}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
        {p && canEdit ? (
          <RefundDialog payment={p} open={refundOpen} onOpenChange={setRefundOpen} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function RefundDialog({
  payment,
  open,
  onOpenChange,
}: {
  payment: PaymentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const limit = React.useRef<number | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [rules] = React.useState(() => ({
    remainingPence: payment.remaining_refundable_pence,
    get limitPence() {
      return limit.current;
    },
  }));
  const form = useForm<RefundValues>({
    resolver: zodResolver(refundSchema(rules)),
    defaultValues: {
      amount: penceToPounds(payment.remaining_refundable_pence),
      reason: "requested_by_customer",
      note: "",
      cancelBooking: false,
    },
  });
  const { errors, isSubmitting } = form.formState;
  const amount = useWatch({ control: form.control, name: "amount" });
  const pence = poundsToPence(amount);

  const submit = async (values: RefundValues) => {
    setFailure(null);
    try {
      const result = await admin<RefundResult>(`/payments/${payment.id}/refunds`, {
        json: {
          amount_pence: poundsToPence(values.amount),
          reason: values.reason,
          note: values.note.trim() || null,
          cancel_booking: values.cancelBooking,
        },
      });
      toast.success(
        result.refund.status === "succeeded"
          ? "Refund sent. The customer usually sees it in 5 to 10 days."
          : "Refund started. Stripe will confirm it shortly.",
      );
      await queryClient.invalidateQueries({ queryKey: ["payment", payment.id] });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      await queryClient.invalidateQueries({ queryKey: ["payments-summary"] });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.code === "REFUND_LIMIT_EXCEEDED") {
        const details = (error.details ?? {}) as { limit_pence?: number };
        const limitPence = details.limit_pence ?? null;
        limit.current = limitPence;
        const text = limitPence !== null ? `£${penceToPounds(limitPence)}` : "the approval limit";
        setFailure(
          `Refunds over ${text} need an owner or admin. Refund a smaller amount, or ask an owner or admin to do it.`,
        );
        return;
      }
      if (!applyFieldErrors(error, form.setError, { amount_pence: "amount" }))
        setFailure(errorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          noValidate
          onSubmit={(event) => void form.handleSubmit(submit)(event)}
          className="space-y-4"
          aria-label="Refund"
        >
          <DialogHeader>
            <DialogTitle>Refund {payment.booking.reference}</DialogTitle>
            <DialogDescription>
              Up to <MoneyText pence={payment.remaining_refundable_pence} /> can be refunded
              {payment.payment_source === "stripe"
                ? " to the customer's card."
                : ". Offline payments are recorded as refunded; pay the money back yourself."}
            </DialogDescription>
          </DialogHeader>
          {failure ? (
            <Alert variant="error" data-testid="refund-error">
              {failure}
            </Alert>
          ) : null}
          <FormField
            id="refund-amount"
            label="Amount (£)"
            required
            error={errors.amount?.message ?? null}
          >
            <Input
              id="refund-amount"
              inputMode="decimal"
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? "refund-amount-error" : undefined}
              {...form.register("amount")}
            />
          </FormField>
          {pence !== null && pence > 0 && pence <= payment.remaining_refundable_pence ? (
            <p className="font-body text-caption text-text-muted">
              {pence === payment.remaining_refundable_pence ? (
                "Full refund of what is left."
              ) : (
                <>
                  Partial refund. <MoneyText pence={payment.remaining_refundable_pence - pence} />{" "}
                  would be left.
                </>
              )}
            </p>
          ) : null}
          <div>
            <Label htmlFor="refund-reason">Reason</Label>
            <select
              id="refund-reason"
              className={`mt-1.5 ${selectClass}`}
              {...form.register("reason")}
            >
              {REFUND_REASONS.map((r) => (
                <option key={r} value={r}>
                  {REFUND_REASON_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="refund-note">Note (optional)</Label>
            <Textarea id="refund-note" rows={2} className="mt-1.5" {...form.register("note")} />
            {errors.note ? (
              <p className="mt-1 font-body text-caption text-error-text">{errors.note.message}</p>
            ) : null}
          </div>
          <label className="flex min-h-touch cursor-pointer items-center gap-3 font-body text-small">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              {...form.register("cancelBooking")}
            />
            Also cancel the booking
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="sm"
              loading={isSubmitting}
              data-testid="refund-submit"
            >
              Refund
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function refundReasonLabel(reason: string | null): string {
  if (!reason) return "Other";
  return reason in REFUND_REASON_LABELS
    ? REFUND_REASON_LABELS[reason as keyof typeof REFUND_REASON_LABELS]
    : humanise(reason);
}
