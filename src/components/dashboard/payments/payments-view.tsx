"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CreditCard, Landmark, PoundSterling, ReceiptText, Undo2, Wallet } from "lucide-react";

import { DateTimeText } from "@/components/dashboard/date-time-text";
import { dateInputClass, selectClass } from "@/components/dashboard/field-styles";
import { formatMoney } from "@/components/dashboard/money-text";
import { RevenueTable } from "@/components/dashboard/overview/revenue-table";
import { Can, useSessionUser } from "@/components/dashboard/session-context";
import { StatCard } from "@/components/dashboard/stat-card";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaymentSummary } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { shortDayLabel } from "@/lib/dates";
import { parsePreset, RANGE_LABELS, RANGE_PRESETS, rangeFor } from "@/lib/payments/ranges";

import { AttentionList } from "./attention-list";
import { Transactions } from "./transactions";
import { VatReport } from "./vat-report";

// The chart library is only downloaded when the page needs it, after the cards.
const RevenueChart = dynamic(
  () => import("@/components/dashboard/overview/revenue-chart").then((m) => m.RevenueChart),
  { ssr: false, loading: () => <Skeleton className="h-chart w-full" /> },
);

const TABS = ["transactions", "attention", "vat"] as const;
type Tab = (typeof TABS)[number];

export function PaymentsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { role } = useSessionUser();
  const vatAllowed = role === "owner" || role === "admin";
  const preset = parsePreset(params.get("range") ?? "");
  const range = rangeFor(preset, { from: params.get("from") ?? "", to: params.get("to") ?? "" });
  const rawTab = params.get("tab") ?? "";
  const tab: Tab =
    (TABS as readonly string[]).includes(rawTab) && (rawTab !== "vat" || vatAllowed)
      ? (rawTab as Tab)
      : "transactions";

  const setParams = React.useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      const text = next.toString();
      router.replace((text ? `${pathname}?${text}` : pathname) as Route, { scroll: false });
    },
    [params, pathname, router],
  );

  const summary = useQuery({
    queryKey: ["payments-summary", range.from, range.to],
    queryFn: () => admin<PaymentSummary>("/payments/summary", { query: range }),
    placeholderData: keepPreviousData,
  });
  const s = summary.data;
  const previous = s
    ? `${shortDayLabel(s.previous_period.date_from)} to ${shortDayLabel(s.previous_period.date_to)}`
    : "";

  return (
    <div className="space-y-6">
      {s && !s.stripe_configured ? (
        <Alert
          variant="info"
          title="Card payments are not connected yet"
          data-testid="stripe-not-connected"
        >
          Stripe keys have not been added to the server, so card payments, refunds and payouts are
          not available. Offline payments still work.
        </Alert>
      ) : null}

      <div
        className="flex flex-wrap items-end gap-3 rounded-lg border-thin border-border bg-background p-4"
        role="group"
        aria-label="Date range"
      >
        <div>
          <Label htmlFor="payments-range">Date range</Label>
          <select
            id="payments-range"
            className={`mt-1.5 ${selectClass}`}
            value={preset}
            onChange={(e) =>
              setParams({
                range: e.target.value === "this_month" ? null : e.target.value,
                from: e.target.value === "custom" ? range.from : null,
                to: e.target.value === "custom" ? range.to : null,
              })
            }
          >
            {RANGE_PRESETS.map((p) => (
              <option key={p} value={p}>
                {RANGE_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        {preset === "custom" ? (
          <>
            <div>
              <Label htmlFor="payments-from">From</Label>
              <input
                id="payments-from"
                type="date"
                className={`mt-1.5 ${dateInputClass}`}
                value={range.from}
                onChange={(e) => setParams({ from: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="payments-to">To</Label>
              <input
                id="payments-to"
                type="date"
                className={`mt-1.5 ${dateInputClass}`}
                value={range.to}
                min={range.from}
                onChange={(e) => setParams({ to: e.target.value })}
              />
            </div>
          </>
        ) : null}
        <p className="pb-3 font-body text-small text-text-muted">
          {shortDayLabel(range.from)} to {shortDayLabel(range.to)}
          {previous ? `, compared with ${previous}` : ""}
        </p>
      </div>

      {summary.isError ? <Alert variant="error">{errorMessage(summary.error)}</Alert> : null}

      <section
        aria-label="Summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        data-testid="payments-summary"
      >
        {!s ? (
          Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : (
          <>
            <StatCard
              label="Gross volume"
              value={formatMoney(s.gross_volume_pence)}
              icon={PoundSterling}
              changePercent={s.previous_period.gross_change_percent}
              hint={`${String(s.payment_count)} payments, average ${formatMoney(s.average_order_pence)}`}
            />
            <StatCard
              label="Stripe fees"
              value={formatMoney(s.fees_pence)}
              icon={CreditCard}
              hint={`Card volume ${formatMoney(s.stripe_volume_pence)}`}
            />
            <StatCard
              label="Net revenue"
              value={formatMoney(s.net_revenue_pence)}
              icon={Wallet}
              changePercent={s.previous_period.net_change_percent}
              hint="After Stripe fees and refunds"
            />
            <StatCard
              label="Refunds"
              value={formatMoney(s.refunds_pence)}
              icon={Undo2}
              trend="up-bad"
              hint={
                s.disputes_pence
                  ? `Disputed ${formatMoney(s.disputes_pence)}`
                  : "No disputes in this period"
              }
            />
            <StatCard
              label="Offline payments"
              value={formatMoney(s.offline_volume_pence)}
              icon={ReceiptText}
              hint={`${String(s.offline_count)} paid by bank transfer, cash or terminal`}
            />
            <StatCard
              label="Next payout"
              value={s.next_payout ? formatMoney(s.next_payout.amount_pence) : "None scheduled"}
              icon={Landmark}
              href="/payments/payouts"
              hint={
                s.next_payout?.arrival_date ? (
                  <>
                    Arrives <DateTimeText value={s.next_payout.arrival_date} style="date" />
                  </>
                ) : (
                  "From Stripe"
                )
              }
            />
          </>
        )}
      </section>

      <section
        aria-labelledby="daily-heading"
        className="rounded-lg border-thin border-border bg-background p-5"
      >
        <h2 id="daily-heading" className="font-heading text-h4 font-bold text-primary">
          Daily takings
        </h2>
        <p className="mt-1 font-body text-small text-text-muted">
          Gross and net received per day, including VAT.
        </p>
        {s ? (
          <>
            <div className="mt-4" aria-hidden="true">
              <RevenueChart daily={s.daily ?? []} />
            </div>
            <RevenueTable daily={s.daily ?? []} />
          </>
        ) : (
          <Skeleton className="mt-4 h-chart w-full" />
        )}
      </section>

      <Tabs
        value={tab}
        onValueChange={(value) => setParams({ tab: value === "transactions" ? null : value })}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="attention">Needs attention</TabsTrigger>
          <Can requires={{ roles: ["owner", "admin"] }}>
            <TabsTrigger value="vat">VAT report</TabsTrigger>
          </Can>
        </TabsList>
        <TabsContent value="transactions">
          <Transactions range={range} />
        </TabsContent>
        <TabsContent value="attention">
          <AttentionList />
        </TabsContent>
        {vatAllowed ? (
          <TabsContent value="vat">
            <VatReport range={range} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
