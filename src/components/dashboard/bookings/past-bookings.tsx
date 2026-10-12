"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";

import { DataTable } from "@/components/dashboard/data-table";
import { DateTimeText } from "@/components/dashboard/date-time-text";
import { selectClass } from "@/components/dashboard/field-styles";
import { usePermission } from "@/components/dashboard/session-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Renewal } from "@/lib/api/schemas";
import { PAST_STATUSES } from "@/lib/bookings/filters";
import { adminPage } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";

import { BookingsList } from "./bookings-list";

const REMINDER_STAGES: Record<number, string> = {
  0: "None yet",
  1: "First reminder",
  2: "Second reminder",
  3: "Final reminder",
};

/** Query string that opens the new booking form prefilled for a renewal. */
export function renewalHref(renewal: Renewal): Route {
  const params = new URLSearchParams({
    email: renewal.customer_email,
    name: renewal.customer_name,
    address: renewal.property_address,
    renewal: renewal.certificate.booking_reference,
    certificate_type: renewal.certificate.certificate_type,
  });
  if (renewal.customer_phone) params.set("phone", renewal.customer_phone);
  return `/bookings/new?${params.toString()}` as Route;
}

function renewalColumns(canBook: boolean): ColumnDef<Renewal>[] {
  return [
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
    { id: "property", header: "Property", cell: ({ row }) => row.original.property_address },
    {
      id: "type",
      header: "Certificate",
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span>{row.original.certificate.certificate_name}</span>
          <Link
            href={`/bookings/${row.original.certificate.booking_id}` as Route}
            className="text-caption text-primary underline-offset-4 hover:underline"
          >
            {row.original.certificate.booking_reference}
          </Link>
        </span>
      ),
    },
    {
      id: "expires",
      header: "Expires",
      cell: ({ row }) => (
        <span className="flex flex-col">
          <DateTimeText value={row.original.certificate.expires_at} style="date" />
          <span className="text-caption text-text-muted">
            {row.original.days_left === 1
              ? "1 day left"
              : `${String(row.original.days_left)} days left`}
          </span>
        </span>
      ),
    },
    {
      id: "reminder",
      header: "Reminder sent",
      cell: ({ row }) =>
        row.original.reminders_opt_out ? (
          <span className="text-text-muted">Unsubscribed</span>
        ) : (
          (REMINDER_STAGES[row.original.certificate.reminder_stage ?? 0] ?? "None yet")
        ),
    },
    {
      id: "action",
      header: () => <span className="sr-only">Actions</span>,
      enableHiding: false,
      cell: ({ row }) =>
        canBook ? (
          <Button asChild variant="outline" size="xs">
            <Link href={renewalHref(row.original)}>
              <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Create renewal booking
            </Link>
          </Button>
        ) : null,
    },
  ];
}

function Renewals() {
  const [days, setDays] = React.useState("30");
  const [page, setPage] = React.useState(1);
  const { canEdit } = usePermission("bookings_upcoming");
  const list = useQuery({
    queryKey: ["renewals", days, page],
    queryFn: () =>
      adminPage<Renewal[]>("/certificates", {
        query: { expiring_within_days: Number(days), page, page_size: 25 },
      }),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <div className="mb-4 flex max-w-xs flex-col">
        <Label htmlFor="renewal-days">Expiring within</Label>
        <select
          id="renewal-days"
          className={`mt-1.5 ${selectClass}`}
          value={days}
          onChange={(event) => {
            setDays(event.target.value);
            setPage(1);
          }}
        >
          {["30", "60", "90"].map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
      </div>
      <DataTable
        caption="Certificates due for renewal"
        columns={renewalColumns(canEdit)}
        data={list.data?.data}
        isLoading={list.isPending}
        error={list.isError ? errorMessage(list.error) : null}
        onRetry={() => void list.refetch()}
        getRowId={(row) => row.certificate.id}
        serverPagination={{
          page,
          pageSize: 25,
          total: list.data?.meta.total ?? 0,
          onPageChange: setPage,
        }}
        emptyTitle="Nothing due for renewal"
        emptyDescription={`No certificate expires in the next ${days} days.`}
        testId="renewals-table"
      />
    </>
  );
}

/** Past bookings and the Renewals tab (?tab=renewals). */
export function PastBookings() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = params.get("tab") === "renewals" ? "renewals" : "bookings";
  return (
    <Tabs
      value={tab}
      onValueChange={(value) =>
        router.replace((value === "renewals" ? `${pathname}?tab=renewals` : pathname) as Route, {
          scroll: false,
        })
      }
    >
      <TabsList className="mb-4">
        <TabsTrigger value="bookings">Bookings</TabsTrigger>
        <TabsTrigger value="renewals">Renewals</TabsTrigger>
      </TabsList>
      <TabsContent value="bookings">
        <BookingsList scope="past" statuses={PAST_STATUSES} page="bookings_past" />
      </TabsContent>
      <TabsContent value="renewals">
        <Renewals />
      </TabsContent>
    </Tabs>
  );
}
