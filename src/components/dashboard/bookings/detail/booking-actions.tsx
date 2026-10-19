"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  FileDown,
  RefreshCcw,
  Send,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { selectClass } from "@/components/dashboard/field-styles";
import { MoneyText } from "@/components/dashboard/money-text";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/dashboard/primitives";
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
import { Textarea } from "@/components/ui/textarea";
import type { BookingDetail } from "@/lib/api/schemas";
import { BOOKING_STATUS_LABELS } from "@/lib/bookings/badges";
import { bookingErrorMessage } from "@/lib/bookings/errors";
import { timeOf } from "@/lib/bookings/reschedule";
import { admin } from "@/lib/client/api";
import { londonToday } from "@/lib/dates";
import {
  penceToPounds,
  poundsToPence,
  REFUND_REASON_LABELS,
  REFUND_REASONS,
} from "@/lib/payments/refund";

import { useBookingOptions } from "../use-booking-options";
import { WindowPicker } from "../window-picker";

type OpenDialog = "engineer" | "reschedule" | "status" | "cancel" | "resend" | "complete" | null;

function useBookingUpdate(booking: BookingDetail) {
  const queryClient = useQueryClient();
  return async (updated: BookingDetail) => {
    queryClient.setQueryData(["booking", booking.id], updated);
    await queryClient.invalidateQueries({ queryKey: ["bookings"] });
    await queryClient.invalidateQueries({ queryKey: ["calendar"] });
  };
}

export function BookingActions({
  booking,
  canEditPayments,
}: {
  booking: BookingDetail;
  canEditPayments: boolean;
}) {
  const [open, setOpen] = React.useState<OpenDialog>(null);
  const apply = useBookingUpdate(booking);
  const active = !["cancelled", "refunded", "completed", "no_show"].includes(booking.status);
  const canComplete = booking.allowed_transitions.includes("completed");
  const canCancel = booking.allowed_transitions.includes("cancelled");

  const resend = async () => {
    try {
      await admin(`/bookings/${booking.id}/resend-confirmation`, { method: "POST" });
      toast.success(`Confirmation email sent again to ${booking.customer.email}.`);
    } catch (error) {
      toast.error(bookingErrorMessage(error));
    }
  };

  const complete = async () => {
    try {
      const updated = await admin<BookingDetail>(`/bookings/${booking.id}/status`, {
        json: { to_status: "completed", note: "Marked completed" },
      });
      await apply(updated);
      toast.success("Booking marked as completed.");
    } catch (error) {
      toast.error(bookingErrorMessage(error, booking.allowed_transitions));
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canComplete ? (
          <Button
            variant="accent"
            size="sm"
            onClick={() => setOpen("complete")}
            data-testid="mark-completed"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Mark completed
          </Button>
        ) : null}
        <Menu>
          <MenuTrigger asChild>
            <Button variant="outline" size="sm" data-testid="booking-actions">
              Actions <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </Button>
          </MenuTrigger>
          <MenuContent align="end">
            {active ? (
              <>
                <MenuItem onSelect={() => setOpen("engineer")}>
                  <UserCog className="h-4 w-4" aria-hidden="true" /> Assign engineers
                </MenuItem>
                <MenuItem onSelect={() => setOpen("reschedule")}>
                  <CalendarClock className="h-4 w-4" aria-hidden="true" /> Reschedule
                </MenuItem>
              </>
            ) : null}
            {booking.allowed_transitions.length ? (
              <MenuItem onSelect={() => setOpen("status")}>
                <RefreshCcw className="h-4 w-4" aria-hidden="true" /> Change status
              </MenuItem>
            ) : null}
            <MenuItem onSelect={() => setOpen("resend")}>
              <Send className="h-4 w-4" aria-hidden="true" /> Resend confirmation email
            </MenuItem>
            <MenuItem asChild>
              <a href={`/api/admin/bookings/${booking.id}/invoice.pdf`} download>
                <FileDown className="h-4 w-4" aria-hidden="true" /> Download invoice (PDF)
              </a>
            </MenuItem>
            {canCancel ? (
              <>
                <MenuSeparator />
                <MenuItem className="text-error-text" onSelect={() => setOpen("cancel")}>
                  <Ban className="h-4 w-4" aria-hidden="true" /> Cancel booking
                </MenuItem>
              </>
            ) : null}
          </MenuContent>
        </Menu>
      </div>

      {open === "engineer" ? (
        // Mounted only while open, so it always starts from the booking's current engineers.
        <EngineerDialog booking={booking} open onClose={() => setOpen(null)} />
      ) : null}
      <RescheduleDialog
        booking={booking}
        open={open === "reschedule"}
        onClose={() => setOpen(null)}
      />
      <StatusDialog booking={booking} open={open === "status"} onClose={() => setOpen(null)} />
      <CancelDialog
        booking={booking}
        open={open === "cancel"}
        onClose={() => setOpen(null)}
        canRefund={canEditPayments}
      />
      <ConfirmDialog
        open={open === "resend"}
        onOpenChange={(next) => !next && setOpen(null)}
        title="Resend the confirmation email?"
        description={`The booking confirmation goes to ${booking.customer.email} again.`}
        confirmLabel="Resend email"
        onConfirm={resend}
      />
      <ConfirmDialog
        open={open === "complete"}
        onOpenChange={(next) => !next && setOpen(null)}
        title="Mark this booking as completed?"
        description="Do this once the inspection is done. Certificates can still be uploaded afterwards."
        confirmLabel="Mark completed"
        onConfirm={complete}
      />
    </>
  );
}

interface DialogProps {
  booking: BookingDetail;
  open: boolean;
  onClose: () => void;
}

function EngineerDialog({ booking, open, onClose }: DialogProps) {
  const options = useBookingOptions();
  const apply = useBookingUpdate(booking);
  const assigned = booking.engineers.map((e) => e.id);
  const [chosen, setChosen] = React.useState<string[]>(assigned);
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  // Active engineers, plus any already on the booking who have since been deactivated.
  const choices = [
    ...(options.data?.engineers ?? []),
    ...booking.engineers.filter((e) => !options.data?.engineers.some((o) => o.id === e.id)),
  ];
  const unchanged =
    chosen.length === assigned.length && chosen.every((id) => assigned.includes(id));

  const toggle = (id: string, on: boolean) =>
    setChosen((current) => (on ? [...current, id] : current.filter((c) => c !== id)));

  const save = async () => {
    setBusy(true);
    setFailure(null);
    try {
      const updated = await admin<BookingDetail>(`/bookings/${booking.id}/engineers`, {
        method: "PUT",
        json: { engineer_ids: chosen },
      });
      await apply(updated);
      toast.success(
        updated.engineers.length
          ? `Assigned: ${updated.engineers.map((e) => e.name).join(", ")}.`
          : "Engineers removed.",
      );
      onClose();
    } catch (error) {
      setFailure(bookingErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign engineers</DialogTitle>
          <DialogDescription>
            Who carries out {booking.reference}. Choose one or more.
          </DialogDescription>
        </DialogHeader>
        {failure ? <Alert variant="error">{failure}</Alert> : null}
        <fieldset className="max-h-72 space-y-1 overflow-y-auto" data-testid="assign-engineers">
          <legend className="sr-only">Engineers</legend>
          {choices.length === 0 ? (
            <p className="font-body text-small text-text-muted">
              No active engineers. Add them on the Engineers page.
            </p>
          ) : (
            choices.map((e) => (
              <label
                key={e.id}
                className="flex min-h-touch cursor-pointer items-center gap-3 rounded-md px-2 font-body text-small hover:bg-surface"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={chosen.includes(e.id)}
                  onChange={(event) => toggle(e.id, event.target.checked)}
                />
                {e.name}
              </label>
            ))
          )}
        </fieldset>
        <DialogFooter>
          <Button variant="outline" size="sm" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            loading={busy}
            disabled={unchanged || (chosen.length === 0 && booking.status !== "scheduled")}
            onClick={() => void save()}
            data-testid="assign-engineer-save"
          >
            {chosen.length === 0 && assigned.length ? "Remove engineers" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RescheduleDialog({ booking, open, onClose }: DialogProps) {
  const apply = useBookingUpdate(booking);
  const current = booking.appointment.date
    ? { date: booking.appointment.date, code: booking.appointment.window_code ?? "" }
    : null;
  const [date, setDate] = React.useState(
    booking.appointment.date && booking.appointment.date >= londonToday()
      ? booking.appointment.date
      : londonToday(),
  );
  const [code, setCode] = React.useState<string | null>(null);
  const [start, setStart] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const serviceIds = booking.items
    .map((i) => i.service_id)
    .filter((id): id is string => Boolean(id));

  const save = async () => {
    if (!code || !start) return;
    setBusy(true);
    setFailure(null);
    try {
      const updated = await admin<BookingDetail>(`/bookings/${booking.id}/reschedule`, {
        json: {
          date,
          start: timeOf(start),
          note: note.trim() || null,
        },
      });
      await apply(updated);
      toast.success(
        `Moved to ${updated.appointment.label ?? "the new window"} on ${updated.appointment.date ?? date}.`,
      );
      onClose();
    } catch (error) {
      setFailure(bookingErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-dvh max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule {booking.reference}</DialogTitle>
          <DialogDescription>
            Now {booking.appointment.label ?? "not set"}
            {booking.appointment.date ? ` on ${booking.appointment.date}` : ""}. The customer is
            emailed the new time.
          </DialogDescription>
        </DialogHeader>
        {failure ? <Alert variant="error">{failure}</Alert> : null}
        <WindowPicker
          idPrefix="reschedule"
          date={date}
          onDateChange={setDate}
          code={code}
          onCodeChange={(next, nextStart) => {
            setCode(next);
            setStart(nextStart);
          }}
          serviceIds={serviceIds}
          current={current}
        />
        <FormField id="reschedule-note" label="Note (optional)">
          <Input
            id="reschedule-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </FormField>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            loading={busy}
            disabled={!code}
            onClick={() => void save()}
            data-testid="reschedule-save"
          >
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Status changes the menu offers: every status, so a refused one explains what is allowed. */
const STATUS_CHOICES = ["confirmed", "scheduled", "in_progress", "completed", "no_show"] as const;

function StatusDialog({ booking, open, onClose }: DialogProps) {
  const apply = useBookingUpdate(booking);
  const choices = STATUS_CHOICES.filter((s) => s !== booking.status);
  const [status, setStatus] = React.useState<string>(
    booking.allowed_transitions.find((s) => s !== "cancelled") ?? choices[0] ?? "",
  );
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setFailure(null);
    try {
      const updated = await admin<BookingDetail>(`/bookings/${booking.id}/status`, {
        json: { to_status: status, note: note.trim() || null },
      });
      await apply(updated);
      toast.success(`Status changed to ${BOOKING_STATUS_LABELS[status] ?? status}.`);
      onClose();
    } catch (error) {
      setFailure(bookingErrorMessage(error, booking.allowed_transitions));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change status</DialogTitle>
          <DialogDescription>
            Now {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}. Allowed next:{" "}
            {booking.allowed_transitions.map((s) => BOOKING_STATUS_LABELS[s] ?? s).join(", ") ||
              "none"}
            .
          </DialogDescription>
        </DialogHeader>
        {failure ? (
          <Alert variant="error" data-testid="status-error">
            {failure}
          </Alert>
        ) : null}
        <div>
          <Label htmlFor="status-to">New status</Label>
          <select
            id="status-to"
            className={`mt-1.5 ${selectClass}`}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {choices.map((s) => (
              <option key={s} value={s}>
                {BOOKING_STATUS_LABELS[s]}
                {booking.allowed_transitions.includes(s) ? "" : " (not allowed now)"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="status-note">Note (optional)</Label>
          <Textarea
            id="status-note"
            rows={2}
            className="mt-1.5"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            loading={busy}
            onClick={() => void save()}
            data-testid="status-save"
          >
            Change status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({ booking, open, onClose, canRefund }: DialogProps & { canRefund: boolean }) {
  const apply = useBookingUpdate(booking);
  const paid = booking.payments
    .filter(
      (p) =>
        p.payment_source === "stripe" && ["succeeded", "partially_refunded"].includes(p.status),
    )
    .reduce((sum, p) => sum + p.amount_pence, 0);
  const [reason, setReason] = React.useState("");
  const [refund, setRefund] = React.useState(false);
  const [amount, setAmount] = React.useState(penceToPounds(paid));
  const [refundReason, setRefundReason] = React.useState<string>("requested_by_customer");
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);

  const save = async () => {
    if (!reason.trim()) {
      setFailure("Give a reason for cancelling.");
      return;
    }
    const pence = poundsToPence(amount);
    if (refund && (pence === null || pence <= 0 || pence > paid)) {
      setFailure(`Enter a refund between £0.01 and £${penceToPounds(paid)}.`);
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const updated = await admin<BookingDetail>(`/bookings/${booking.id}/cancel`, {
        json: {
          reason: reason.trim(),
          refund: refund ? { amount_pence: pence, reason: refundReason } : null,
        },
      });
      await apply(updated);
      toast.success(refund ? "Booking cancelled and the refund started." : "Booking cancelled.");
      onClose();
    } catch (error) {
      setFailure(bookingErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel {booking.reference}?</DialogTitle>
          <DialogDescription>
            The customer is told by email and the window is freed for others.
          </DialogDescription>
        </DialogHeader>
        {failure ? <Alert variant="error">{failure}</Alert> : null}
        <div>
          <Label htmlFor="cancel-reason" required>
            Reason
          </Label>
          <Textarea
            id="cancel-reason"
            rows={2}
            className="mt-1.5"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        {paid > 0 && canRefund ? (
          <fieldset className="space-y-3 rounded-md border-thin border-border p-3">
            <legend className="px-1 font-body text-small font-semibold">Refund</legend>
            <label className="flex min-h-touch cursor-pointer items-center gap-3 font-body text-small">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={refund}
                onChange={(event) => setRefund(event.target.checked)}
              />
              Refund the card payment (<MoneyText pence={paid} /> paid)
            </label>
            {refund ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="cancel-refund-amount" label="Amount (£)">
                  <Input
                    id="cancel-refund-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </FormField>
                <div>
                  <Label htmlFor="cancel-refund-reason">Reason</Label>
                  <select
                    id="cancel-refund-reason"
                    className={`mt-1.5 ${selectClass}`}
                    value={refundReason}
                    onChange={(event) => setRefundReason(event.target.value)}
                  >
                    {REFUND_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {REFUND_REASON_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}
          </fieldset>
        ) : paid > 0 ? (
          <p className="font-body text-caption text-text-muted">
            Refunds need edit access to the Payments page. Ask a colleague to refund from there.
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Keep the booking
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="bg-error-text hover:bg-error-text"
            loading={busy}
            onClick={() => void save()}
            data-testid="cancel-confirm"
          >
            Cancel booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
