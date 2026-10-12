"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import type { ColumnDef } from "@tanstack/react-table";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, Download, Search } from "lucide-react";

import { PaymentStatusBadge } from "@/components/dashboard/bookings/booking-badges";
import { DataTable } from "@/components/dashboard/data-table";
import { DateTimeText } from "@/components/dashboard/date-time-text";
import { selectClass } from "@/components/dashboard/field-styles";
import { MoneyText } from "@/components/dashboard/money-text";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Envelope, PaymentListItem, PaymentListTotals } from "@/lib/api/schemas";
import { PAYMENT_STATUS_LABELS } from "@/lib/bookings/badges";
import { queryString, request, type QueryParam } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { poundsToPence } from "@/lib/payments/refund";

import { PaymentSheet } from "./payment-sheet";

const PAGE_SIZE = 25;
const STATUSES = [
  "succeeded",
  "pending",
  "failed",
  "refunded",
  "partially_refunded",
  "disputed",
] as const;

function columns(open: (id: string) => void): ColumnDef<PaymentListItem>[] {
  return [
    {
      id: "date",
      header: "Date",
      enableHiding: false,
      cell: ({ row }) => (
        <DateTimeText value={row.original.date} style="short" className="whitespace-nowrap" />
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span>{row.original.customer_name}</span>
          <span className="text-caption text-text-muted">{row.original.customer_email}</span>
        </span>
      ),
    },
    {
      id: "services",
      header: "Services",
      cell: ({ row }) => <span className="line-clamp-2">{row.original.service_summary}</span>,
    },
    {
      id: "amount",
      header: "Amount",
      cell: ({ row }) => <MoneyText pence={row.original.amount_pence} />,
    },
    {
      id: "fee",
      header: "Fee",
      cell: ({ row }) =>
        row.original.fee_pence === null ? "None" : <MoneyText pence={row.original.fee_pence} />,
    },
    {
      id: "net",
      header: "Net",
      cell: ({ row }) =>
        row.original.net_pence === null ? (
          <MoneyText pence={row.original.amount_pence} />
        ) : (
          <MoneyText pence={row.original.net_pence} />
        ),
    },
    {
      id: "refunded",
      header: "Refunded",
      cell: ({ row }) =>
        row.original.amount_refunded_pence ? (
          <MoneyText pence={row.original.amount_refunded_pence} />
        ) : (
          <span className="text-text-subtle">None</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <PaymentStatusBadge status={row.original.status} />,
    },
    {
      id: "source",
      header: "Source",
      cell: ({ row }) => (row.original.payment_source === "stripe" ? "Stripe" : "Offline"),
    },
    {
      id: "booking",
      header: "Booking",
      cell: ({ row }) => (
        <Link
          href={`/bookings/${row.original.booking.id}` as Route}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {row.original.booking.reference}
        </Link>
      ),
    },
    {
      id: "attention",
      header: () => <span className="sr-only">Needs attention</span>,
      enableHiding: false,
      cell: ({ row }) =>
        row.original.needs_attention ? (
          <span className="inline-flex text-status-negative-text" title="Needs attention">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Needs attention</span>
          </span>
        ) : null,
    },
    {
      id: "details",
      header: () => <span className="sr-only">Details</span>,
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => open(row.original.id)}
          aria-label={`Details of the payment for ${row.original.booking.reference}`}
        >
          Details
        </Button>
      ),
    },
  ];
}

export function Transactions({ range }: { range: { from: string; to: string } }) {
  const [search, setSearch] = React.useState("");
  const [term, setTerm] = React.useState("");
  const [statuses, setStatuses] = React.useState<string[]>([]);
  const [min, setMin] = React.useState("");
  const [max, setMax] = React.useState("");
  const [flag, setFlag] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [openId, setOpenId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setTerm(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filters: Record<string, QueryParam> = {
    from: range.from,
    to: range.to,
    search: term,
    status: statuses,
    min_amount: poundsToPence(min) ?? undefined,
    max_amount: poundsToPence(max) ?? undefined,
    has_refund: flag === "refund" ? true : undefined,
    disputed: flag === "disputed" ? true : undefined,
  };
  const list = useQuery({
    queryKey: ["payments", filters, page],
    queryFn: async () => {
      const envelope: Envelope<PaymentListItem[]> & { totals?: PaymentListTotals } = await request<
        PaymentListItem[]
      >("/api/admin/payments", {
        query: { ...filters, page, page_size: PAGE_SIZE },
      });
      return envelope;
    },
    placeholderData: keepPreviousData,
  });
  const totals = list.data?.totals;

  const statusText =
    statuses.length === 0
      ? "All statuses"
      : statuses.length === 1
        ? (PAYMENT_STATUS_LABELS[statuses[0] ?? ""] ?? "1 selected")
        : `${String(statuses.length)} statuses`;

  return (
    <>
      <div
        role="search"
        aria-label="Filter payments"
        className="mb-4 grid gap-3 rounded-lg border-thin border-border bg-background p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="sm:col-span-2">
          <Label htmlFor="payments-search">Search</Label>
          <div className="relative mt-1.5">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-subtle"
              aria-hidden="true"
            />
            <Input
              id="payments-search"
              type="search"
              className="pl-9"
              placeholder="Customer, email or reference"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div>
          <span id="payments-status-label" className="font-body text-small font-semibold">
            Status
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="control"
                size="none"
                type="button"
                aria-labelledby="payments-status-label payments-status-value"
                className={`mt-1.5 flex items-center justify-between gap-2 text-left ${selectClass}`}
              >
                <span id="payments-status-value">{statusText}</span>
                <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <fieldset>
                <legend className="sr-only">Statuses to show</legend>
                {STATUSES.map((status) => (
                  <label
                    key={status}
                    className="flex min-h-touch cursor-pointer items-center gap-3 rounded-sm px-2 font-body text-small hover:bg-surface-alt"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={statuses.includes(status)}
                      onChange={(e) => {
                        setStatuses((current) =>
                          e.target.checked
                            ? [...current, status]
                            : current.filter((s) => s !== status),
                        );
                        setPage(1);
                      }}
                    />
                    {PAYMENT_STATUS_LABELS[status]}
                  </label>
                ))}
              </fieldset>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="payments-min">Min amount (£)</Label>
          <Input
            id="payments-min"
            inputMode="decimal"
            className="mt-1.5"
            value={min}
            onChange={(e) => {
              setMin(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <Label htmlFor="payments-max">Max amount (£)</Label>
          <Input
            id="payments-max"
            inputMode="decimal"
            className="mt-1.5"
            value={max}
            onChange={(e) => {
              setMax(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <Label htmlFor="payments-flag">Show only</Label>
          <select
            id="payments-flag"
            className={`mt-1.5 ${selectClass}`}
            value={flag}
            onChange={(e) => {
              setFlag(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All payments</option>
            <option value="refund">With a refund</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>
      </div>

      <div className="mb-3 flex justify-end">
        <Button asChild variant="outline" size="sm">
          <a
            href={`/api/admin/payments/export.csv?${queryString(filters)}`}
            download
            data-testid="payments-export"
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
          </a>
        </Button>
      </div>

      <DataTable
        caption="Transactions"
        columns={columns(setOpenId)}
        data={list.data?.data}
        isLoading={list.isPending}
        error={list.isError ? errorMessage(list.error) : null}
        onRetry={() => void list.refetch()}
        getRowId={(row) => row.id}
        serverPagination={{
          page,
          pageSize: PAGE_SIZE,
          total: list.data?.meta?.total ?? 0,
          onPageChange: setPage,
        }}
        onRowClick={(row) => setOpenId(row.id)}
        totals={
          totals
            ? {
                date: <span>Total ({totals.count})</span>,
                amount: <MoneyText pence={totals.amount_pence} />,
                fee: <MoneyText pence={totals.fee_pence} />,
                net: <MoneyText pence={totals.net_pence} />,
                refunded: <MoneyText pence={totals.refunded_pence} />,
              }
            : undefined
        }
        emptyTitle="No payments in this period"
        emptyDescription="Try another date range or clear the filters."
        testId="payments-table"
      />
      <p className="mt-2 font-body text-caption text-text-muted">
        Select a row to see the payment, its refunds and its history.
      </p>
      <PaymentSheet id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
