"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarClock,
  Clock,
  PoundSterling,
  ReceiptText,
  Scale,
  UserPlus,
} from "lucide-react";

import { DataTable } from "@/components/dashboard/data-table";
import { formatMoney } from "@/components/dashboard/money-text";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Overview, Schemas } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { formatDate } from "@/lib/utils/format";

import { RevenueTable } from "./revenue-table";

// The chart library is only downloaded for people who can see money, after the page loads.
const RevenueChart = dynamic(() => import("./revenue-chart").then((m) => m.RevenueChart), {
  ssr: false,
  loading: () => <Skeleton className="h-chart w-full" />,
});

type TodayJob = Schemas["TodayJob"];

const jobColumns: ColumnDef<TodayJob>[] = [
  {
    accessorKey: "appointment",
    header: "Window",
    cell: ({ row }) => row.original.appointment.label ?? "Not set",
    enableHiding: false,
  },
  { accessorKey: "reference", header: "Reference", enableHiding: false },
  { accessorKey: "customer_name", header: "Customer" },
  { accessorKey: "postcode", header: "Postcode" },
  {
    id: "services",
    header: "Services",
    cell: ({ row }) => row.original.services.join(", "),
    enableSorting: false,
  },
  {
    accessorKey: "engineer",
    header: "Engineer",
    cell: ({ row }) => row.original.engineer ?? "Not assigned",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge kind="booking" status={row.original.status} />,
  },
];

/** Percent change of this week against the average week in the last 30 days. */
function weekChange(revenue: NonNullable<Overview["revenue"]>): number | null {
  const days = revenue.daily;
  if (days.length < 14) return null;
  const total = days.reduce((sum, d) => sum + d.gross_pence, 0);
  const averageWeek = (total / days.length) * 7;
  if (averageWeek <= 0) return null;
  return ((revenue.this_week.gross_pence - averageWeek) / averageWeek) * 100;
}

export function OverviewView({
  initial,
  showMoney,
  firstName,
}: {
  /** Read on the server for the first render; null when that failed. */
  initial: Overview | null;
  showMoney: boolean;
  firstName: string;
}) {
  const [loadedAt] = React.useState(() => Date.now());
  const overview = useQuery({
    queryKey: ["overview"],
    queryFn: () => admin<Overview>("/overview"),
    initialData: initial ?? undefined,
    initialDataUpdatedAt: loadedAt,
  });
  const data = overview.data;
  const revenue = showMoney ? data?.revenue : null;

  return (
    <>
      <PageHeader
        title={firstName ? `Good to see you, ${firstName}` : "Overview"}
        description={
          data
            ? `Today is ${formatDate(data.today, "weekday")}.`
            : "Today's jobs and the numbers that matter."
        }
      />

      <section aria-labelledby="bookings-heading" className="space-y-4">
        <h2 id="bookings-heading" className="sr-only">
          Bookings
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="overview-bookings">
          {overview.isPending ? (
            Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-32 w-full" />)
          ) : data ? (
            <>
              <StatCard label="Jobs today" value={data.todays_jobs.length} icon={CalendarCheck2} />
              <StatCard
                label="Bookings this week"
                value={data.this_week_bookings}
                icon={CalendarClock}
              />
              <StatCard
                label="Upcoming bookings"
                value={data.upcoming_bookings}
                icon={Clock}
                href="/bookings/upcoming"
              />
              <StatCard
                label="Waiting for payment"
                value={data.pending_payment}
                icon={ReceiptText}
                hint="Online bookings not paid yet"
              />
              <StatCard
                label="Payment due on the day"
                value={data.payment_due}
                icon={PoundSterling}
                hint="Pay later bookings still owing"
              />
              <StatCard
                label="New customers this month"
                value={data.new_customers_this_month}
                icon={UserPlus}
              />
              <StatCard
                label="Needs attention"
                value={data.needs_attention_count}
                icon={AlertTriangle}
                trend="up-bad"
                href="/bookings/upcoming?attention=1"
                hint={
                  data.needs_attention_count > 0
                    ? "Open the list to resolve them"
                    : "Nothing waiting"
                }
                testId="needs-attention"
              />
            </>
          ) : null}
        </div>
      </section>

      {overview.isError ? (
        <p role="alert" className="mt-6 font-body text-small text-error-text">
          {errorMessage(overview.error)}
        </p>
      ) : null}

      {revenue ? (
        <section
          aria-labelledby="revenue-heading"
          className="mt-10 space-y-4"
          data-testid="overview-revenue"
        >
          <h2 id="revenue-heading" className="font-heading text-h3 font-bold text-primary">
            Revenue
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Today"
              value={formatMoney(revenue.today.gross_pence)}
              hint={`Net ${formatMoney(revenue.today.net_pence)}`}
            />
            <StatCard
              label="This week"
              value={formatMoney(revenue.this_week.gross_pence)}
              hint={`Net ${formatMoney(revenue.this_week.net_pence)}`}
              changePercent={weekChange(revenue)}
            />
            <StatCard
              label="This month"
              value={formatMoney(revenue.this_month.gross_pence)}
              hint={`Net ${formatMoney(revenue.this_month.net_pence)}`}
              href="/payments"
            />
            <StatCard
              label="Refunds this month"
              value={formatMoney(revenue.refunds_this_month_pence)}
              trend="up-bad"
              icon={ReceiptText}
            />
            <StatCard
              label="Open disputes"
              value={revenue.open_disputes}
              trend="up-bad"
              icon={Scale}
              href="/payments/disputes"
            />
          </div>
          <div className="rounded-lg border-thin border-border bg-background p-5">
            <h3 className="font-heading text-h4 font-bold text-primary">Last 30 days</h3>
            <p className="mt-1 font-body text-small text-text-muted">
              Gross takings per day, including VAT.
            </p>
            <div className="mt-4" aria-hidden="true">
              <RevenueChart daily={revenue.daily} />
            </div>
            <RevenueTable daily={revenue.daily} />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="today-heading" className="mt-10 space-y-4">
        <h2 id="today-heading" className="font-heading text-h3 font-bold text-primary">
          Today&apos;s jobs
        </h2>
        <DataTable
          caption="Today's jobs"
          columns={jobColumns}
          data={data?.todays_jobs}
          isLoading={overview.isPending}
          error={overview.isError ? errorMessage(overview.error) : null}
          onRetry={() => void overview.refetch()}
          emptyTitle="No jobs today"
          emptyDescription="Appointments booked for today will be listed here."
          getRowId={(row) => row.id}
        />
      </section>
    </>
  );
}
