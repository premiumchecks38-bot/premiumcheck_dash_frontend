"use client";

import * as React from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

import type { Schemas } from "@/lib/api/schemas";
import { formatMoney } from "@/components/dashboard/money-text";
import { formatDate } from "@/lib/utils/format";

type DailyRevenue = Schemas["DailyRevenue"];

/** "6 Oct": short axis labels (the year is in the heading and the table). */
function dayMonth(seconds: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(seconds * 1000));
}

/** Reads a design token from :root so the chart uses the same colours and fonts as the page. */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * 30 day takings line chart. Decorative for screen readers: RevenueTable carries the same
 * numbers as an accessible table. Loaded on demand, only for people with payments access.
 */
export function RevenueChart({ daily }: { daily: DailyRevenue[] }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element || daily.length === 0) return;
    const primary = token("--pc-color-primary");
    const accent = token("--pc-color-accent");
    const muted = token("--pc-color-text-muted");
    const grid = token("--pc-color-border");
    const font = `${token("--pc-text-caption")} ${token("--pc-font-body") || "sans-serif"}`;

    const lastIndex = daily.length - 1;
    const xs = daily.map((d) => new Date(`${d.date}T12:00:00Z`).getTime() / 1000);
    const gross = daily.map((d) => d.gross_pence / 100);
    const net = daily.map((d) => d.net_pence / 100);
    const axis = {
      stroke: muted,
      font,
      grid: { stroke: grid, width: 1 },
      ticks: { stroke: grid, width: 1 },
    };

    const chart = new uPlot(
      {
        width: element.clientWidth,
        height: element.clientHeight,
        legend: { show: true },
        // Away from the chart the legend shows the latest day; hovering shows that day.
        hooks: {
          ready: [(u) => u.setLegend({ idx: lastIndex })],
          setCursor: [
            (u) => {
              if (u.cursor.idx === null || u.cursor.idx === undefined)
                u.setLegend({ idx: lastIndex });
            },
          ],
        },
        cursor: { drag: { x: false, y: false } },
        scales: { x: { time: true } },
        axes: [
          {
            ...axis,
            values: (_u, ticks) => ticks.map((t) => dayMonth(t)),
          },
          {
            ...axis,
            size: 72,
            values: (_u, ticks) => ticks.map((t) => formatMoney(Math.round(t * 100))),
          },
        ],
        series: [
          // Fall back to the latest day's values by default so the legend is never blank.
          {
            label: "Day",
            value: (_u, t: number | null) => {
              const d = t === null && daily[lastIndex] ? daily[lastIndex].date : null;
              if (d) return formatDate(new Date(`${d}T12:00:00Z`), "short");
              return t === null ? "" : formatDate(new Date(t * 1000), "short");
            },
          },
          {
            label: "Gross",
            stroke: primary,
            width: 2,
            value: (_u, v: number | null) => {
              if (v === null && daily[lastIndex]) return formatMoney(daily[lastIndex].gross_pence);
              return v === null ? "" : formatMoney(Math.round(v * 100));
            },
          },
          {
            label: "Net",
            stroke: accent,
            width: 2,
            dash: [6, 4],
            value: (_u, v: number | null) => {
              if (v === null && daily[lastIndex]) return formatMoney(daily[lastIndex].net_pence);
              return v === null ? "" : formatMoney(Math.round(v * 100));
            },
          },
        ],
      },
      [xs, gross, net],
      element,
    );

    const observer = new ResizeObserver(() =>
      chart.setSize({ width: element.clientWidth, height: element.clientHeight }),
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      chart.destroy();
    };
  }, [daily]);

  return <div ref={ref} className="h-chart w-full" data-testid="revenue-chart" />;
}
