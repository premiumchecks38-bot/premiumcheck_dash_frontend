"use client";

import * as React from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

import type { Schemas } from "@/lib/api/schemas";
import { formatMoney } from "@/components/dashboard/money-text";
import { formatDate } from "@/lib/utils/format";

type DailyRevenue = Schemas["DailyRevenue"];

function dayMonth(seconds: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(seconds * 1000));
}

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * 30 day takings line chart with responsive layout and collision-free React legend.
 */
export function RevenueChart({ daily }: { daily: DailyRevenue[] }) {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const [activeItem, setActiveItem] = React.useState<{
    date: string;
    gross: string;
    net: string;
  } | null>(null);

  React.useEffect(() => {
    const element = chartRef.current;
    if (!element || daily.length === 0) return;
    const primary = token("--pc-color-primary") || "#0F172A";
    const accent = token("--pc-color-accent") || "#0FA3F3";
    const muted = token("--pc-color-text-muted") || "#64748B";
    const grid = token("--pc-color-border") || "#E2E8F0";
    const font = `${token("--pc-text-caption") || "11px"} ${token("--pc-font-body") || "sans-serif"}`;

    const lastIndex = daily.length - 1;
    const xs = daily.map((d) => new Date(`${d.date}T12:00:00Z`).getTime() / 1000);
    const gross = daily.map((d) => d.gross_pence / 100);
    const net = daily.map((d) => d.net_pence / 100);

    const updateActive = (idx: number) => {
      const item = daily[idx];
      if (item) {
        setActiveItem({
          date: formatDate(new Date(`${item.date}T12:00:00Z`), "short"),
          gross: formatMoney(item.gross_pence),
          net: formatMoney(item.net_pence),
        });
      }
    };

    updateActive(lastIndex);

    const isMobile = element.clientWidth < 640;
    const chartHeight = isMobile ? 180 : 220;
    const yAxisSize = isMobile ? 54 : 72;

    const axis = {
      stroke: muted,
      font,
      grid: { stroke: grid, width: 1 },
      ticks: { stroke: grid, width: 1 },
    };

    const chart = new uPlot(
      {
        width: element.clientWidth,
        height: chartHeight,
        legend: { show: false }, // Custom responsive React legend below prevents layout overlaps
        cursor: {
          drag: { x: false, y: false },
          points: { show: true },
        },
        hooks: {
          ready: [() => updateActive(lastIndex)],
          setCursor: [
            (u) => {
              if (u.cursor.idx !== null && u.cursor.idx !== undefined) {
                updateActive(u.cursor.idx);
              } else {
                updateActive(lastIndex);
              }
            },
          ],
        },
        scales: { x: { time: true } },
        axes: [
          {
            ...axis,
            values: (_u, ticks) => ticks.map((t) => dayMonth(t)),
          },
          {
            ...axis,
            size: yAxisSize,
            values: (_u, ticks) => ticks.map((t) => formatMoney(Math.round(t * 100))),
          },
        ],
        series: [
          {},
          {
            label: "Gross",
            stroke: primary,
            width: 2,
          },
          {
            label: "Net",
            stroke: accent,
            width: 2,
            dash: [6, 4],
          },
        ],
      },
      [xs, gross, net],
      element,
    );

    const observer = new ResizeObserver(() => {
      if (!element) return;
      const isMob = element.clientWidth < 640;
      chart.setSize({
        width: element.clientWidth,
        height: isMob ? 180 : 220,
      });
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      chart.destroy();
    };
  }, [daily]);

  return (
    <div className="w-full space-y-3" data-testid="revenue-chart">
      <div ref={chartRef} className="w-full overflow-hidden" />
      {activeItem && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md bg-surface-alt/70 px-3 py-2 text-xs border border-border-subtle">
          <div className="flex items-center gap-1.5">
            <span className="text-text-subtle font-medium">Day:</span>
            <span className="font-semibold text-text">{activeItem.date}</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2.5 rounded-xs bg-primary inline-block shrink-0" />
              <span className="text-text-muted">Gross:</span>
              <span className="font-semibold font-mono text-text">{activeItem.gross}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-2.5 border-t-2 border-dashed border-accent inline-block shrink-0" />
              <span className="text-text-muted">Net:</span>
              <span className="font-semibold font-mono text-text">{activeItem.net}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
