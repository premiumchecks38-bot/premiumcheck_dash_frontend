"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/dashboard/data-table";
import { DateTimeText } from "@/components/dashboard/date-time-text";
import { MoneyText } from "@/components/dashboard/money-text";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { Payout } from "@/lib/api/schemas";
import { humanise } from "@/lib/bookings/labels";
import { adminPage } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";

const columns: ColumnDef<Payout>[] = [
  {
    id: "amount",
    header: "Amount",
    enableHiding: false,
    cell: ({ row }) => <MoneyText pence={row.original.amount_pence} className="font-semibold" />,
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge kind="payout" status={row.original.status} />,
  },
  {
    id: "arrival",
    header: "Arrival date",
    cell: ({ row }) => (
      <DateTimeText value={row.original.arrival_date} style="date" fallback="Not known" />
    ),
  },
  {
    id: "method",
    header: "Method",
    cell: ({ row }) =>
      humanise(row.original.method ?? "standard") + (row.original.automatic ? "" : ", manual"),
  },
  {
    id: "failure",
    header: "Problem",
    cell: ({ row }) =>
      row.original.failure_message ?? <span className="text-text-subtle">None</span>,
  },
  {
    id: "id",
    header: "Stripe id",
    cell: ({ row }) => (
      <span className="font-mono text-caption">{row.original.stripe_payout_id}</span>
    ),
  },
];

export function PayoutsTable() {
  const [page, setPage] = React.useState(1);
  const list = useQuery({
    queryKey: ["payouts", page],
    queryFn: () => adminPage<Payout[]>("/payouts", { query: { page, page_size: 25 } }),
    placeholderData: keepPreviousData,
  });
  return (
    <DataTable
      caption="Payouts"
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
      emptyTitle="No payouts yet"
      emptyDescription="Stripe payouts appear here once card payments are connected."
      testId="payouts-table"
    />
  );
}
