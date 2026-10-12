"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { usePermission } from "@/components/dashboard/session-context";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { AttentionItem, BookingDetail } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { humanise } from "@/lib/bookings/labels";
import { formatDate } from "@/lib/utils/format";

import { BookingPaymentBadge, BookingStatusBadge } from "../booking-badges";
import { BookingActions } from "./booking-actions";
import {
  AppointmentPanel,
  BillingPanel,
  CustomerPanel,
  PropertyPanel,
  ServicesPanel,
  TimelinePanel,
} from "./booking-panels";
import { CertificatesPanel } from "./certificates-panel";
import { NotesPanel } from "./notes-panel";
import { PaymentPanel } from "./payment-panel";

const ATTENTION_REASONS: Record<string, string> = {
  amount_mismatch: "The amount paid does not match the booking total",
  late_payment_slot_taken: "Paid after the hold expired and the window was taken",
  refund_failed: "A refund failed",
  dispute: "The customer disputed the card payment",
  paid_while_cancelled: "Paid while the booking was cancelled",
  payment_due_after_completion: "Payment is still due after the job was completed",
  other: "Something needs checking",
};

export function BookingDetailView({ id, initial }: { id: string; initial: BookingDetail | null }) {
  const upcoming = usePermission("bookings_upcoming");
  const payments = usePermission("payments");
  const customers = usePermission("customers");
  const [loadedAt] = React.useState(() => Date.now());

  const query = useQuery({
    queryKey: ["booking", id],
    queryFn: () => admin<BookingDetail>(`/bookings/${id}`),
    initialData: initial ?? undefined,
    initialDataUpdatedAt: loadedAt,
  });
  const booking = query.data;

  if (!booking) {
    return query.isError ? (
      <>
        <PageHeader
          title="Booking"
          breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Bookings" }]}
        />
        <Alert variant="error" title="This booking could not be loaded">
          {errorMessage(query.error)}
        </Alert>
      </>
    ) : (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const canEdit = upcoming.canEdit;
  return (
    <>
      <PageHeader
        title={booking.reference}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>
              {booking.customer.full_name}
              {booking.appointment.date
                ? `, ${formatDate(booking.appointment.date, "weekday")}`
                : ""}
              {booking.appointment.label ? `, ${booking.appointment.label}` : ""}
            </span>
            <BookingStatusBadge status={booking.status} />
            <BookingPaymentBadge booking={booking} />
          </span>
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Bookings", href: "/bookings/upcoming" },
          { label: booking.reference },
        ]}
        actions={
          canEdit ? <BookingActions booking={booking} canEditPayments={payments.canEdit} /> : null
        }
      />

      {booking.needs_attention ? (
        <AttentionBanner
          booking={booking}
          canViewPayments={payments.canView}
          canResolve={payments.canEdit}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <AppointmentPanel booking={booking} />
          <PropertyPanel booking={booking} />
          <ServicesPanel booking={booking} />
          <CertificatesPanel booking={booking} canEdit={canEdit} />
          <NotesPanel booking={booking} canEdit={canEdit} />
        </div>
        <div className="space-y-6">
          <CustomerPanel booking={booking} canOpenCustomer={customers.canView} />
          <BillingPanel booking={booking} />
          <PaymentPanel
            booking={booking}
            canViewPayments={payments.canView}
            canEditPayments={payments.canEdit}
          />
          <TimelinePanel booking={booking} />
        </div>
      </div>
    </>
  );
}

function AttentionBanner({
  booking,
  canViewPayments,
  canResolve,
}: {
  booking: BookingDetail;
  canViewPayments: boolean;
  canResolve: boolean;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const attention = useQuery({
    queryKey: ["payments-attention"],
    queryFn: () => admin<AttentionItem[]>("/payments/attention"),
    enabled: canViewPayments,
  });
  const reasons = attention.data?.find((item) => item.booking_id === booking.id)?.reasons ?? [];

  const resolve = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      await admin(`/bookings/${booking.id}/resolve-attention`, { json: { note: note.trim() } });
      toast.success("Marked as resolved.");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["booking", booking.id] });
      await queryClient.invalidateQueries({ queryKey: ["payments-attention"] });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Alert
      variant="warning"
      title="This booking needs attention"
      className="mb-6"
      data-testid="attention-banner"
    >
      <span className="flex flex-wrap items-center justify-between gap-3">
        <span>
          {reasons.length
            ? reasons.map((r) => ATTENTION_REASONS[r] ?? humanise(r)).join(". ") + "."
            : "Check the payment and the timeline below."}
        </span>
        {canResolve ? (
          <Button variant="outline" size="xs" onClick={() => setOpen(true)}>
            <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Resolve
          </Button>
        ) : null}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve the attention flag</DialogTitle>
            <DialogDescription>
              Say what was done. The note is kept in the booking history.
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="resolve-note" className="font-body text-small font-semibold">
            What was done
          </label>
          <Textarea
            id="resolve-note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="accent"
              size="sm"
              loading={busy}
              disabled={!note.trim()}
              onClick={() => void resolve()}
            >
              Mark resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Alert>
  );
}
