"use client";

import * as React from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Link2, Mail, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";

import { CopyButton } from "@/components/dashboard/copy-button";
import { DateTimeText } from "@/components/dashboard/date-time-text";
import { selectClass } from "@/components/dashboard/field-styles";
import { MoneyText } from "@/components/dashboard/money-text";
import { Panel } from "@/components/dashboard/panel";
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
import type { BookingDetail, PaymentDetail } from "@/lib/api/schemas";
import { paymentState } from "@/lib/bookings/badges";
import { humanise, OFFLINE_METHOD_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/bookings/labels";
import { admin } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { penceToPounds, poundsToPence } from "@/lib/payments/refund";

import { BookingPaymentBadge, PaymentStatusBadge } from "../booking-badges";

const OPEN_STATUSES = ["pending_payment", "confirmed", "scheduled", "in_progress", "completed"];

export function PaymentPanel({
  booking,
  canViewPayments,
  canEditPayments,
}: {
  booking: BookingDetail;
  canViewPayments: boolean;
  canEditPayments: boolean;
}) {
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [paidOpen, setPaidOpen] = React.useState(false);
  const state = paymentState(booking);
  const unpaid = state === "payment_due" || state === "pending_payment" || state === "expired";
  const open = OPEN_STATUSES.includes(booking.status);

  // Refunds live on each Stripe payment's detail (payments page access).
  const details = useQueries({
    queries: booking.payments
      .filter((p) => p.payment_source === "stripe")
      .map((p) => ({
        queryKey: ["payment", p.id],
        queryFn: () => admin<PaymentDetail>(`/payments/${p.id}`),
        enabled: canViewPayments,
      })),
  });
  const refunds = details.flatMap((d) => d.data?.refunds ?? []);

  return (
    <Panel title="Payment" id="payment" testId="payment-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-body text-small text-text-muted">
          {booking.payment_method
            ? (PAYMENT_METHOD_LABELS[booking.payment_method] ?? booking.payment_method)
            : "Not chosen"}
        </p>
        <BookingPaymentBadge booking={booking} />
      </div>
      <p className="mt-2 font-heading text-h3 font-bold text-primary">
        <MoneyText pence={booking.totals.total_pence} />
      </p>
      {booking.payment_expires_at && state === "pending_payment" ? (
        <p className="font-body text-caption text-text-muted">
          Unpaid booking held until{" "}
          <DateTimeText value={booking.payment_expires_at} style="short" />
        </p>
      ) : null}

      {booking.payments.length ? (
        <ul className="mt-4 divide-y-thin divide-border border-t-thin border-border">
          {booking.payments.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-start justify-between gap-2 py-3 font-body text-small"
            >
              <span className="flex flex-col">
                <span className="font-semibold">
                  <MoneyText pence={p.amount_pence} />{" "}
                  {p.payment_source === "offline"
                    ? `paid offline (${OFFLINE_METHOD_LABELS[p.payment_method_type ?? ""] ?? "other"})`
                    : "by card"}
                </span>
                <span className="text-caption text-text-muted">
                  <DateTimeText value={p.paid_at ?? p.created_at} style="short" />
                  {p.offline_reference ? `, ref ${p.offline_reference}` : ""}
                  {p.failure_reason ? `, ${p.failure_reason}` : ""}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <PaymentStatusBadge status={p.status} />
                {p.receipt_url ? (
                  <a
                    href={p.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-touch items-center gap-1 text-caption font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    <Receipt className="h-4 w-4" aria-hidden="true" /> Receipt
                  </a>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 font-body text-small text-text-muted">No payments recorded.</p>
      )}

      {refunds.length ? (
        <div className="mt-2">
          <h3 className="font-body text-small font-semibold">Refunds</h3>
          <ul className="mt-1 space-y-1 font-body text-small" data-testid="booking-refunds">
            {refunds.map((r) => (
              <li key={r.id} className="flex justify-between gap-2">
                <span>
                  <MoneyText pence={r.amount_pence} />,{" "}
                  <DateTimeText value={r.created_at} style="date" />
                </span>
                <span className="text-text-muted">{humanise(r.status)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canEditPayments && open && unpaid ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setLinkOpen(true)}
            data-testid="payment-link"
          >
            <Link2 className="h-4 w-4" aria-hidden="true" /> Send payment link
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setPaidOpen(true)}
            data-testid="mark-paid"
          >
            <Wallet className="h-4 w-4" aria-hidden="true" /> Mark as paid offline
          </Button>
        </div>
      ) : null}

      {canEditPayments ? (
        <>
          <PaymentLinkDialog booking={booking} open={linkOpen} onOpenChange={setLinkOpen} />
          <MarkPaidDialog booking={booking} open={paidOpen} onOpenChange={setPaidOpen} />
        </>
      ) : null}
    </Panel>
  );
}

function PaymentLinkDialog({
  booking,
  open,
  onOpenChange,
}: {
  booking: BookingDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [link, setLink] = React.useState<{ url: string; expires: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setFailure(null);
    try {
      const result = await admin<{ checkout_url: string; expires_at: string }>(
        `/bookings/${booking.id}/payment-link`,
        { method: "POST" },
      );
      setLink({ url: result.checkout_url, expires: result.expires_at });
      await queryClient.invalidateQueries({ queryKey: ["booking", booking.id] });
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const mail = link
    ? `mailto:${encodeURIComponent(booking.customer.email)}?subject=${encodeURIComponent(
        `Payment for your booking ${booking.reference}`,
      )}&body=${encodeURIComponent(
        `Hello ${booking.customer.full_name},\n\nYou can pay for booking ${booking.reference} securely here:\n${link.url}\n\nThank you,\nPremium Property Checks`,
      )}`
    : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setLink(null);
          setFailure(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a payment link</DialogTitle>
          <DialogDescription>
            A secure Stripe page where {booking.customer.full_name} can pay{" "}
            <MoneyText pence={booking.totals.total_pence} /> by card.
          </DialogDescription>
        </DialogHeader>
        {failure ? <Alert variant="error">{failure}</Alert> : null}
        {link ? (
          // min-w-0: a grid item otherwise grows to the full Stripe URL and pushes the
          // copy button and footer out of the dialog.
          <div className="min-w-0 space-y-3" data-testid="payment-link-result">
            <div className="flex min-w-0 items-center gap-2 overflow-hidden rounded-md border-thin border-border bg-surface p-3">
              <code className="min-w-0 flex-1 truncate font-mono text-caption" title={link.url}>
                {link.url}
              </code>
              <CopyButton value={link.url} label="Copy payment link" />
            </div>
            <p className="font-body text-caption text-text-muted">
              Works until <DateTimeText value={link.expires} style="short" />.
            </p>
          </div>
        ) : null}
        <DialogFooter>
          {link ? (
            <Button asChild variant="accent" size="sm">
              <a href={mail}>
                <Mail className="h-4 w-4" aria-hidden="true" /> Email it to the customer
              </a>
            </Button>
          ) : (
            <Button variant="accent" size="sm" loading={busy} onClick={() => void create()}>
              Create payment link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarkPaidDialog({
  booking,
  open,
  onOpenChange,
}: {
  booking: BookingDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [method, setMethod] = React.useState("bank_transfer");
  const [reference, setReference] = React.useState("");
  const [amount, setAmount] = React.useState(penceToPounds(booking.totals.total_pence));
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const amountPence = poundsToPence(amount);

  const save = async () => {
    if (amountPence === null || amountPence <= 0) {
      setFailure("Enter the amount received in pounds, like 120.00.");
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const updated = await admin<BookingDetail>(`/bookings/${booking.id}/mark-paid`, {
        json: { method, reference: reference.trim() || null, amount_pence: amountPence },
      });
      queryClient.setQueryData(["booking", booking.id], updated);
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Payment recorded.");
      onOpenChange(false);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as paid offline</DialogTitle>
          <DialogDescription>Record a payment taken outside the website.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {failure ? <Alert variant="error">{failure}</Alert> : null}
          <div>
            <Label htmlFor="paid-method">Method</Label>
            <select
              id="paid-method"
              className={`mt-1.5 ${selectClass}`}
              value={method}
              onChange={(event) => setMethod(event.target.value)}
            >
              {Object.entries(OFFLINE_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <FormField
            id="paid-reference"
            label="Reference"
            hint="For example the bank transfer reference."
          >
            <Input
              id="paid-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </FormField>
          <FormField id="paid-amount" label="Amount received (£)" required>
            <Input
              id="paid-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            loading={busy}
            onClick={() => void save()}
            data-testid="mark-paid-submit"
          >
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
