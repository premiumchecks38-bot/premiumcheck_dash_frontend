"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Check, Download } from "lucide-react";

import { DataTable } from "@/components/dashboard/data-table";
import { DateTimeText } from "@/components/dashboard/date-time-text";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { MoneyText } from "@/components/dashboard/money-text";
import { useUrlFilters } from "@/components/dashboard/use-url-filters";
import { Button } from "@/components/ui/button";
import type { CustomerListItem } from "@/lib/api/schemas";
import { CUSTOMER_TYPE_LABELS } from "@/lib/bookings/labels";
import { adminPage, queryString, type QueryParam } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";

const PAGE_SIZE = 25;
const KEYS = ["q", "type", "marketing", "reminders", "page"] as const;

const yes = (on: boolean, label: string) =>
  on ? (
    <span className="inline-flex items-center gap-1 text-status-positive-text">
      <Check className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  ) : (
    <span className="text-text-subtle">
      <span aria-hidden="true">No</span>
      <span className="sr-only">Not {label.toLowerCase()}</span>
    </span>
  );

const columns: ColumnDef<CustomerListItem>[] = [
  {
    id: "name",
    header: "Name",
    enableHiding: false,
    cell: ({ row }) => (
      <span className="flex flex-col">
        <Link
          href={`/customers/${row.original.id}` as Route}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {row.original.full_name}
        </Link>
        {row.original.company_name ? (
          <span className="text-caption text-text-muted">{row.original.company_name}</span>
        ) : null}
      </span>
    ),
  },
  { id: "email", header: "Email", cell: ({ row }) => row.original.email },
  {
    id: "phone",
    header: "Phone",
    cell: ({ row }) => row.original.phone ?? <span className="text-text-subtle">Not given</span>,
  },
  {
    id: "type",
    header: "Type",
    cell: ({ row }) =>
      CUSTOMER_TYPE_LABELS[row.original.customer_type] ?? row.original.customer_type,
  },
  {
    id: "bookings",
    header: "Bookings",
    cell: ({ row }) => <span className="tabular-nums">{row.original.booking_count}</span>,
  },
  {
    id: "spent",
    header: "Total spent",
    cell: ({ row }) => <MoneyText pence={row.original.total_spent_pence} />,
  },
  {
    id: "last",
    header: "Last booking",
    cell: ({ row }) => (
      <DateTimeText value={row.original.last_booking_at} style="date" fallback="None" />
    ),
  },
  {
    id: "marketing",
    header: "Marketing",
    cell: ({ row }) => yes(row.original.marketing_opt_in, "Opted in to marketing"),
  },
  {
    id: "reminders",
    header: "Reminders off",
    cell: ({ row }) => yes(row.original.reminders_opt_out, "Unsubscribed from reminders"),
  },
];

export function CustomersList() {
  const router = useRouter();
  const [filters, setFilters] = useUrlFilters(KEYS);
  const page = Math.max(1, Number(filters.page) || 1);
  const query: Record<string, QueryParam> = {
    search: filters.q,
    customer_type: filters.type,
    marketing_opt_in: filters.marketing || undefined,
    reminders_opt_out: filters.reminders || undefined,
  };
  const list = useQuery({
    queryKey: ["customers", query, page],
    queryFn: () =>
      adminPage<CustomerListItem[]>("/customers", {
        query: { ...query, page, page_size: PAGE_SIZE },
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <FilterBar
        search={{ value: filters.q, label: "Search", placeholder: "Name, email, phone or company" }}
        selects={[
          {
            key: "type",
            label: "Type",
            value: filters.type,
            options: Object.entries(CUSTOMER_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            key: "marketing",
            label: "Marketing",
            value: filters.marketing,
            options: [
              { value: "true", label: "Opted in" },
              { value: "false", label: "Not opted in" },
            ],
          },
          {
            key: "reminders",
            label: "Renewal reminders",
            value: filters.reminders,
            options: [
              { value: "false", label: "Receiving" },
              { value: "true", label: "Unsubscribed" },
            ],
          },
        ]}
        onChange={(key, value) =>
          setFilters({ [key]: value })
        }
        onReset={() => setFilters({ q: null, type: null, marketing: null, reminders: null })}
      />
      <div className="mb-3 flex justify-end">
        <Button asChild variant="outline" size="sm">
          <a
            href={`/api/admin/customers/export.csv?${queryString(query)}`}
            download
            data-testid="customers-export"
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
          </a>
        </Button>
      </div>
      <DataTable
        caption="Customers"
        columns={columns}
        data={list.data?.data}
        isLoading={list.isPending}
        error={list.isError ? errorMessage(list.error) : null}
        onRetry={() => void list.refetch()}
        getRowId={(row) => row.id}
        serverPagination={{
          page,
          pageSize: PAGE_SIZE,
          total: list.data?.meta.total ?? 0,
          onPageChange: (next) => setFilters({ page: String(next) }),
        }}
        onRowClick={(row) => router.push(`/customers/${row.id}` as Route)}
        emptyTitle="No customers match"
        emptyDescription="Try a different search, or clear the filters."
        testId="customers-table"
      />
    </>
  );
}
