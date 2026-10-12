import type { Schemas } from "@/lib/api/schemas";
import { formatMoney } from "@/components/dashboard/money-text";
import { formatDate } from "@/lib/utils/format";

/** The chart's numbers as a table: always read by screen readers, shown on request for everyone. */
export function RevenueTable({ daily }: { daily: Schemas["DailyRevenue"][] }) {
  return (
    <details className="mt-4 font-body text-small">
      <summary className="inline-flex min-h-touch cursor-pointer items-center font-semibold text-primary underline-offset-4 hover:underline">
        Show the figures as a table
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-left" data-testid="revenue-table">
          <caption className="sr-only">Takings per day for the last 30 days</caption>
          <thead>
            <tr className="border-b-thin border-border">
              <th scope="col" className="px-cell-x py-2 font-semibold text-text-muted">
                Date
              </th>
              <th scope="col" className="px-cell-x py-2 text-right font-semibold text-text-muted">
                Gross
              </th>
              <th scope="col" className="px-cell-x py-2 text-right font-semibold text-text-muted">
                Net
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-thin divide-border">
            {daily.map((day) => (
              <tr key={day.date}>
                <th scope="row" className="px-cell-x py-2 font-normal">
                  {formatDate(day.date, "short")}
                </th>
                <td className="px-cell-x py-2 text-right tabular-nums">
                  {formatMoney(day.gross_pence)}
                </td>
                <td className="px-cell-x py-2 text-right tabular-nums">
                  {formatMoney(day.net_pence)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
