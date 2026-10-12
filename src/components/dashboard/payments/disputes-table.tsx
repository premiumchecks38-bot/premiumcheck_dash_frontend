"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import type { ColumnDef } from "@tanstack/react-table";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink } from "lucide-react";

import { DataTable } from "@/components/dashboard/data-table";
import { DateTimeText } from "@/components/dashboard/date-time-text";
import { MoneyText } from "@/components/dashboard/money-text";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Alert } from "@/components/ui/alert";
import type { Dispute } from "@/lib/api/schemas";
import { humanise } from "@/lib/bookings/labels";
import { adminPage } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";

const OPEN = new Set([
  "needs_response",
  "warning_needs_response",
  "under_review",
  "warning_under_review",
]);
const NEEDS_RESPONSE = new Set(["needs_response", "warning_needs_response"]);
const DAY = 86_400_000;

/** Whole days until the evidence deadline (negative when it has passed). */
export function daysUntil(due: string, now: number = Date.now()): number {
  return Math.floor((new Date(due).getTime() - now) / DAY);
}

/** True when a response is due within three days (or overdue). */
export function isUrgent(
  dispute: Pick<Dispute, "status" | "evidence_due_by">,
  now: number = Date.now(),
): boolean {
  return Boolean(
    dispute.evidence_due_by &&
    NEEDS_RESPONSE.has(dispute.status) &&
    daysUntil(dispute.evidence_due_by, now) <= 3,
  );
}

function dueText(due: string): string {
  const days = daysUntil(due);
  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  return days === 1 ? "1 day left" : `${String(days)} days left`;
}

const columns: ColumnDef<Dispute>[] = [
  {
    id: "due",
    header: "Evidence due",
    enableHiding: false,
    cell: ({ row }) => {
      const d = row.original;
      if (!d.evidence_due_by) return <span className="text-text-subtle">No deadline</span>;
      const urgent = isUrgent(d);
      return (
        <span
          className={
            urgent ? "flex flex-col font-semibold text-status-negative-text" : "flex flex-col"
          }
        >
          <span className="inline-flex items-center gap-1">
            {urgent ? <AlertTriangle className="h-4 w-4" aria-hidden="true" /> : null}
            <DateTimeText value={d.evidence_due_by} style="short" />
          </span>
          {OPEN.has(d.status) ? (
            <span className="text-caption">{dueText(d.evidence_due_by)}</span>
          ) : null}
        </span>
      );
    },
  },
  {
    id: "booking",
    header: "Booking",
    cell: ({ row }) => (
      <span className="flex flex-col">
        <Link
          href={`/bookings/${row.original.booking_id}` as Route}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {row.original.booking_reference}
        </Link>
        <span className="text-caption text-text-muted">{row.original.customer_name}</span>
      </span>
    ),
  },
  {
    id: "amount",
    header: "Amount",
    cell: ({ row }) => <MoneyText pence={row.original.amount_pence} />,
  },
  {
    id: "reason",
    header: "Reason",
    cell: ({ row }) => humanise(row.original.reason ?? "not given"),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge kind="dispute" status={row.original.status} />,
  },
  {
    id: "respond",
    header: () => <span className="sr-only">Respond</span>,
    enableHiding: false,
    cell: ({ row }) =>
      row.original.stripe_dashboard_url ? (
        <a
          href={row.original.stripe_dashboard_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-touch items-center gap-1 font-semibold whitespace-nowrap text-primary underline-offset-4 hover:underline"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> Respond in Stripe
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : null,
  },
];

export function DisputesTable() {
  const [page, setPage] = React.useState(1);
  const list = useQuery({
    queryKey: ["disputes", page],
    queryFn: () => adminPage<Dispute[]>("/disputes", { query: { page, page_size: 25 } }),
    placeholderData: keepPreviousData,
  });
  const urgent = (list.data?.data ?? []).filter((d) => isUrgent(d));
  return (
    <>
      {urgent.length ? (
        <Alert
          variant="error"
          title="Evidence due soon"
          className="mb-4"
          data-testid="disputes-urgent"
        >
          {urgent.length === 1
            ? `The dispute on ${urgent[0]?.booking_reference ?? "a booking"} needs a response within 3 days.`
            : `${String(urgent.length)} disputes need a response within 3 days.`}{" "}
          Respond in Stripe, or the bank decides for the customer.
        </Alert>
      ) : null}
      <DataTable
        caption="Disputes, soonest deadline first"
        columns={columns}
        data={list.data?.data}
        isLoading={list.isPending}
        error={list.isError ? errorMessage(list.error) : null}
        onRetry={() => void list.refetch()}
        getRowId={(row) => row.id}
        serverPagination={{
          page,
          pageSize: 25,
          total: list.data?.meta.total ?? 0,
          onPageChange: setPage,
        }}
        emptyTitle="No disputes"
        emptyDescription="When a customer challenges a card payment it appears here."
        testId="disputes-table"
      />
    </>
  );
}
