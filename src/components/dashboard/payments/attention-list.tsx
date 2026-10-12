"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { BookingStatusBadge } from "@/components/dashboard/bookings/booking-badges";
import { DataTable } from "@/components/dashboard/data-table";
import { DateTimeText } from "@/components/dashboard/date-time-text";
import { MoneyText } from "@/components/dashboard/money-text";
import { usePermission } from "@/components/dashboard/session-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { AttentionItem } from "@/lib/api/schemas";
import { humanise } from "@/lib/bookings/labels";
import { admin } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";

const REASONS: Record<string, string> = {
  amount_mismatch: "Amount does not match the total",
  late_payment_slot_taken: "Paid after the window was taken",
  refund_failed: "Refund failed",
  dispute: "Card payment disputed",
  paid_while_cancelled: "Paid while cancelled",
  payment_due_after_completion: "Still owed after the job",
  other: "Needs checking",
};

export function AttentionList() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("payments");
  const [resolving, setResolving] = React.useState<AttentionItem | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const list = useQuery({
    queryKey: ["payments-attention"],
    queryFn: () => admin<AttentionItem[]>("/payments/attention"),
  });

  const resolve = async () => {
    if (!resolving || !note.trim()) return;
    setBusy(true);
    try {
      await admin(`/bookings/${resolving.booking_id}/resolve-attention`, {
        json: { note: note.trim() },
      });
      toast.success(`${resolving.booking_reference} marked as resolved.`);
      setResolving(null);
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["payments-attention"] });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const columns: ColumnDef<AttentionItem>[] = [
    {
      id: "booking",
      header: "Booking",
      enableHiding: false,
      cell: ({ row }) => (
        <Link
          href={`/bookings/${row.original.booking_id}` as Route}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {row.original.booking_reference}
        </Link>
      ),
    },
    { id: "customer", header: "Customer", cell: ({ row }) => row.original.customer_name },
    {
      id: "reason",
      header: "Reason",
      cell: ({ row }) =>
        row.original.reasons.map((r) => REASONS[r] ?? humanise(r)).join(", ") || "Needs checking",
    },
    {
      id: "status",
      header: "Booking status",
      cell: ({ row }) => <BookingStatusBadge status={row.original.booking_status} />,
    },
    {
      id: "amount",
      header: "Amount",
      cell: ({ row }) =>
        row.original.amount_pence === null ? (
          "None"
        ) : (
          <MoneyText pence={row.original.amount_pence} />
        ),
    },
    {
      id: "updated",
      header: "Updated",
      cell: ({ row }) => <DateTimeText value={row.original.updated_at} style="short" />,
    },
    {
      id: "resolve",
      header: () => <span className="sr-only">Actions</span>,
      enableHiding: false,
      cell: ({ row }) =>
        canEdit ? (
          <Button variant="outline" size="xs" onClick={() => setResolving(row.original)}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Resolve
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <DataTable
        caption="Bookings that need attention"
        columns={columns}
        data={list.data}
        isLoading={list.isPending}
        error={list.isError ? errorMessage(list.error) : null}
        onRetry={() => void list.refetch()}
        getRowId={(row) => row.booking_id}
        emptyTitle="Nothing needs attention"
        emptyDescription="Payment problems and disputes appear here."
        testId="attention-table"
      />
      <Dialog open={resolving !== null} onOpenChange={(open) => !open && setResolving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve {resolving?.booking_reference}</DialogTitle>
            <DialogDescription>
              Say what was done. The note is kept in the booking history.
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="attention-note" className="font-body text-small font-semibold">
            What was done
          </label>
          <Textarea
            id="attention-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setResolving(null)} disabled={busy}>
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
    </>
  );
}
