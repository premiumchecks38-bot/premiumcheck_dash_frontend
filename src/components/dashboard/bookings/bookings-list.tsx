"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { ColumnDef, RowSelectionState, SortingState } from "@tanstack/react-table";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, UserCog } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/dashboard/data-table";
import { selectClass } from "@/components/dashboard/field-styles";
import { MoneyText, formatMoney } from "@/components/dashboard/money-text";
import { usePermission } from "@/components/dashboard/session-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { BookingListItem } from "@/lib/api/schemas";
import { paymentState, PAYMENT_STATE_LABELS, BOOKING_STATUS_LABELS } from "@/lib/bookings/badges";
import { filtersToQuery, type BookingFilters, type BookingStatus } from "@/lib/bookings/filters";
import { adminPage, admin, queryString } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { downloadCsv, toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/utils/format";

import { BookingPaymentBadge, BookingStatusBadge } from "./booking-badges";
import { BookingFilterBar } from "./booking-filter-bar";
import { useBookingFilters } from "./use-booking-filters";
import { useBookingOptions } from "./use-booking-options";

const PAGE_SIZE = 25;

function appointmentText(b: BookingListItem): string {
  return b.appointment.date ? formatDate(b.appointment.date, "short") : "Not set";
}

function columns(): ColumnDef<BookingListItem>[] {
  return [
    {
      id: "reference",
      header: "Reference",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <Link
          href={`/bookings/${row.original.id}` as Route}
          className="font-semibold whitespace-nowrap text-primary underline-offset-4 hover:underline"
        >
          {row.original.reference}
        </Link>
      ),
    },
    {
      id: "appointment",
      header: "Appointment",
      enableSorting: true,
      cell: ({ row }) => (
        <span className="flex flex-col whitespace-nowrap">
          <span>{appointmentText(row.original)}</span>
          <span className="text-caption text-text-muted">
            {row.original.appointment.label ?? ""}
          </span>
        </span>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span>{row.original.customer.full_name}</span>
          <span className="text-caption text-text-muted">{row.original.customer.email}</span>
        </span>
      ),
    },
    {
      id: "property",
      header: "Property",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex flex-col whitespace-nowrap">
          <span>{row.original.postcode}</span>
          {row.original.property_number ? (
            <span className="text-caption text-text-muted">{row.original.property_number}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: "services",
      header: "Services",
      enableSorting: false,
      cell: ({ row }) => <span className="line-clamp-2">{row.original.services.join(", ")}</span>,
    },
    {
      id: "engineer",
      header: "Engineer",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.engineers.length ? (
          row.original.engineers.map((e) => e.name).join(", ")
        ) : (
          <span className="text-text-muted">Unassigned</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => <BookingStatusBadge status={row.original.status} />,
    },
    {
      id: "payment",
      header: "Payment",
      enableSorting: false,
      cell: ({ row }) => <BookingPaymentBadge booking={row.original} />,
    },
    {
      id: "total",
      header: "Total",
      enableSorting: false,
      cell: ({ row }) => <MoneyText pence={row.original.total_pence} />,
    },
    {
      id: "attention",
      header: () => <span className="sr-only">Needs attention</span>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) =>
        row.original.needs_attention ? (
          <span
            className="inline-flex items-center text-status-negative-text"
            title="Needs attention"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Needs attention</span>
          </span>
        ) : null,
    },
  ];
}

function exportRows(rows: BookingListItem[]): string {
  return toCsv(
    [
      "reference",
      "appointment_date",
      "window",
      "customer",
      "email",
      "phone",
      "postcode",
      "property_number",
      "services",
      "engineer",
      "status",
      "payment",
      "total",
    ],
    rows.map((b) => [
      b.reference,
      b.appointment.date ?? "",
      b.appointment.label ?? "",
      b.customer.full_name,
      b.customer.email,
      b.customer.phone ?? "",
      b.postcode,
      b.property_number ?? "",
      b.services.join("; "),
      b.engineers.map((e) => e.name).join("; "),
      BOOKING_STATUS_LABELS[b.status] ?? b.status,
      PAYMENT_STATE_LABELS[paymentState(b)],
      formatMoney(b.total_pence),
    ]),
  );
}

interface Chip {
  label: string;
  active: (f: BookingFilters) => boolean;
  toggle: (f: BookingFilters) => Partial<BookingFilters>;
}

const CHIPS: Chip[] = [
  {
    label: "Today",
    active: (f) => f.preset === "today",
    toggle: (f) => ({ preset: f.preset === "today" ? "" : "today", from: "", to: "" }),
  },
  {
    label: "Needs attention",
    active: (f) => f.attention,
    toggle: (f) => ({ attention: !f.attention }),
  },
  {
    label: "Payment due",
    active: (f) => f.payment === "payment_due",
    toggle: (f) => ({ payment: f.payment === "payment_due" ? "" : "payment_due" }),
  },
  {
    label: "Unassigned",
    active: (f) => f.unassigned,
    toggle: (f) => ({ unassigned: !f.unassigned }),
  },
];

/** Upcoming or past bookings: filters in the URL, paged and sorted by the backend. */
export function BookingsList({
  scope,
  statuses,
  page,
}: {
  scope: "upcoming" | "past";
  statuses: readonly BookingStatus[];
  page: "bookings_upcoming" | "bookings_past";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canEdit } = usePermission(page);
  const [filters, update] = useBookingFilters();
  const options = useBookingOptions();
  const [selected, setSelected] = React.useState<RowSelectionState>({});
  // Every row seen on any page, so a selection can span pages.
  const [known, setKnown] = React.useState<Record<string, BookingListItem>>({});
  const [seenRows, setSeenRows] = React.useState<BookingListItem[] | undefined>();
  const [engineer, setEngineer] = React.useState("");
  const [assigning, setAssigning] = React.useState(false);

  const query = filtersToQuery(filters, PAGE_SIZE);
  const list = useQuery({
    queryKey: ["bookings", scope, query],
    queryFn: () => adminPage<BookingListItem[]>(`/bookings/${scope}`, { query }),
    placeholderData: keepPreviousData,
  });
  const rows = list.data?.data;
  if (rows && rows !== seenRows) {
    setSeenRows(rows);
    setKnown((k) => ({ ...k, ...Object.fromEntries(rows.map((row) => [row.id, row])) }));
  }

  const sorting: SortingState = filters.sort
    ? [{ id: "appointment", desc: filters.sort === "-appointment" }]
    : [];
  const selectedRows = Object.keys(selected)
    .filter((id) => selected[id])
    .map((id) => known[id])
    .filter((row): row is BookingListItem => Boolean(row));

  const assign = async () => {
    if (!engineer || selectedRows.length === 0) return;
    setAssigning(true);
    let done = 0;
    const failed: string[] = [];
    for (const booking of selectedRows) {
      try {
        await admin(`/bookings/${booking.id}/assign-engineer`, { json: { engineer_id: engineer } });
        done += 1;
      } catch (error) {
        failed.push(`${booking.reference}: ${errorMessage(error)}`);
      }
    }
    setAssigning(false);
    if (done)
      toast.success(`Engineer added to ${String(done)} ${done === 1 ? "booking" : "bookings"}.`);
    if (failed.length) toast.error(`Not assigned: ${failed.join("; ")}`);
    setSelected({});
    await queryClient.invalidateQueries({ queryKey: ["bookings"] });
  };

  const exportUrl = `/api/admin/bookings/export.csv?${queryString({
    ...filtersToQuery({ ...filters, page: 1 }, PAGE_SIZE),
    scope,
    page: undefined,
    page_size: undefined,
  })}`;

  return (
    <>
      {scope === "upcoming" ? (
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Quick filters">
          {CHIPS.map((chip) => {
            const on = chip.active(filters);
            return (
              <Button
                key={chip.label}
                type="button"
                variant={on ? "primary" : "outline"}
                size="xs"
                aria-pressed={on}
                onClick={() => update(chip.toggle(filters))}
              >
                {chip.label}
              </Button>
            );
          })}
        </div>
      ) : null}

      <BookingFilterBar
        filters={filters}
        onChange={update}
        options={options.data}
        statuses={statuses}
        past={scope === "past"}
      />

      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        {canEdit && selectedRows.length > 0 ? (
          <div
            className="flex flex-wrap items-end gap-3 rounded-md border-thin border-border bg-surface p-3"
            data-testid="bulk-actions"
          >
            <p className="self-center font-body text-small font-semibold">
              {selectedRows.length} selected
            </p>
            <div>
              <Label htmlFor="bulk-engineer">Engineer</Label>
              <select
                id="bulk-engineer"
                className={`mt-1.5 ${selectClass}`}
                value={engineer}
                onChange={(event) => setEngineer(event.target.value)}
              >
                <option value="">Choose an engineer</option>
                {(options.data?.engineers ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              variant="accent"
              disabled={!engineer}
              loading={assigning}
              onClick={() => void assign()}
            >
              <UserCog className="h-4 w-4" aria-hidden="true" /> Assign engineer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCsv(
                  `bookings-selected-${String(selectedRows.length)}.csv`,
                  exportRows(selectedRows),
                )
              }
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Export selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected({})}>
              Clear selection
            </Button>
          </div>
        ) : (
          <span />
        )}
        {scope === "past" ? (
          <Button asChild variant="outline" size="sm">
            <a href={exportUrl} download data-testid="export-csv">
              <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
            </a>
          </Button>
        ) : null}
      </div>

      <DataTable
        caption={scope === "upcoming" ? "Upcoming bookings" : "Past bookings"}
        columns={columns()}
        data={list.data?.data}
        isLoading={list.isPending}
        error={list.isError ? errorMessage(list.error) : null}
        onRetry={() => void list.refetch()}
        getRowId={(row) => row.id}
        serverPagination={{
          page: filters.page,
          pageSize: PAGE_SIZE,
          total: list.data?.meta.total ?? 0,
          onPageChange: (next) => update({ page: next }),
        }}
        manualSorting={{
          sorting,
          onSortingChange: (next) => {
            const first = next[0];
            update({ sort: first ? (first.desc ? "-appointment" : "appointment") : "" });
          },
        }}
        selection={
          canEdit ? { selected, onChange: setSelected, label: (row) => row.reference } : undefined
        }
        onRowClick={(row) => router.push(`/bookings/${row.id}` as Route)}
        emptyTitle="No bookings match"
        emptyDescription="Try a different search, or clear the filters."
        testId="bookings-table"
      />
    </>
  );
}
