"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";

import { MoneyText, formatMoney } from "@/components/dashboard/money-text";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { VatReport as VatReportData } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { downloadCsv, toCsv } from "@/lib/csv";
import { shortDayLabel } from "@/lib/dates";

const cell = "px-cell-x py-2 text-right tabular-nums";

/** VAT on sales and refunds for the selected range, in total and per VAT rate (owner and admin). */
export function VatReport({ range }: { range: { from: string; to: string } }) {
  const report = useQuery({
    queryKey: ["vat-report", range.from, range.to],
    queryFn: () => admin<VatReportData>("/payments/vat-report", { query: range }),
  });
  const r = report.data;
  if (report.isError) return <Alert variant="error">{errorMessage(report.error)}</Alert>;
  if (!r) return <Skeleton className="h-48 w-full" />;

  const exportCsv = () =>
    downloadCsv(
      `vat-report-${r.date_from}-to-${r.date_to}.csv`,
      toCsv(
        ["line", "net", "vat", "gross"],
        [
          [
            "Sales",
            formatMoney(r.sales.net_pence),
            formatMoney(r.sales.vat_pence),
            formatMoney(r.sales.gross_pence),
          ],
          [
            "Refunds",
            formatMoney(r.refunds.net_pence),
            formatMoney(r.refunds.vat_pence),
            formatMoney(r.refunds.gross_pence),
          ],
          [
            "After refunds",
            formatMoney(r.after_refunds.net_pence),
            formatMoney(r.after_refunds.vat_pence),
            formatMoney(r.after_refunds.gross_pence),
          ],
          ...r.by_rate.map((line) => [
            `Rate ${line.rate_label}`,
            formatMoney(line.net_pence),
            formatMoney(line.vat_pence),
            formatMoney(line.net_pence + line.vat_pence),
          ]),
        ],
      ),
    );

  return (
    <div className="space-y-4" data-testid="vat-report">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-body text-small text-text-muted">
          {shortDayLabel(r.date_from)} to {shortDayLabel(r.date_to)}, money received and refunded in
          the period.
        </p>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
        </Button>
      </div>
      <div className="relative overflow-x-auto rounded-lg border-thin border-border bg-background">
        <table className="w-full border-collapse font-body text-small">
          <caption className="sr-only">VAT summary</caption>
          <thead className="bg-surface text-text-muted">
            <tr className="border-b-thin border-border">
              <th scope="col" className="px-cell-x py-2 text-left font-semibold">
                Line
              </th>
              <th scope="col" className="px-cell-x py-2 text-right font-semibold">
                Net
              </th>
              <th scope="col" className="px-cell-x py-2 text-right font-semibold">
                VAT
              </th>
              <th scope="col" className="px-cell-x py-2 text-right font-semibold">
                Gross
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-thin divide-border">
            {(
              [
                ["Sales", r.sales],
                ["Refunds", r.refunds],
                ["After refunds", r.after_refunds],
              ] as const
            ).map(([label, amounts]) => (
              <tr key={label} className={label === "After refunds" ? "font-semibold" : undefined}>
                <th scope="row" className="px-cell-x py-2 text-left font-normal">
                  {label}
                </th>
                <td className={cell}>
                  <MoneyText pence={amounts.net_pence} />
                </td>
                <td className={cell}>
                  <MoneyText pence={amounts.vat_pence} />
                </td>
                <td className={cell}>
                  <MoneyText pence={amounts.gross_pence} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="relative overflow-x-auto rounded-lg border-thin border-border bg-background">
        <table className="w-full border-collapse font-body text-small">
          <caption className="text-h5 px-cell-x py-2 text-left font-heading font-bold text-primary">
            By VAT rate
          </caption>
          <thead className="bg-surface text-text-muted">
            <tr className="border-b-thin border-border">
              <th scope="col" className="px-cell-x py-2 text-left font-semibold">
                Rate
              </th>
              <th scope="col" className="px-cell-x py-2 text-right font-semibold">
                Sales net
              </th>
              <th scope="col" className="px-cell-x py-2 text-right font-semibold">
                Sales VAT
              </th>
              <th scope="col" className="px-cell-x py-2 text-right font-semibold">
                Refunds net
              </th>
              <th scope="col" className="px-cell-x py-2 text-right font-semibold">
                Refunds VAT
              </th>
              <th scope="col" className="px-cell-x py-2 text-right font-semibold">
                Net
              </th>
              <th scope="col" className="px-cell-x py-2 text-right font-semibold">
                VAT
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-thin divide-border">
            {r.by_rate.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-cell-x py-3 text-text-muted">
                  No sales in this period.
                </td>
              </tr>
            ) : (
              r.by_rate.map((line) => (
                <tr key={line.vat_rate_bp}>
                  <th scope="row" className="px-cell-x py-2 text-left font-normal">
                    {line.rate_label}
                  </th>
                  <td className={cell}>
                    <MoneyText pence={line.sales_net_pence} />
                  </td>
                  <td className={cell}>
                    <MoneyText pence={line.sales_vat_pence} />
                  </td>
                  <td className={cell}>
                    <MoneyText pence={line.refunds_net_pence} />
                  </td>
                  <td className={cell}>
                    <MoneyText pence={line.refunds_vat_pence} />
                  </td>
                  <td className={cell}>
                    <MoneyText pence={line.net_pence} />
                  </td>
                  <td className={cell}>
                    <MoneyText pence={line.vat_pence} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
