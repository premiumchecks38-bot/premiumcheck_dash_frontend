import Link from "next/link";
import type { Route } from "next";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Change against the previous period, in percent (positive or negative). */
  changePercent?: number | null;
  /** "up is good" for revenue, "up is bad" for refunds or disputes. */
  trend?: "up-good" | "up-bad";
  hint?: React.ReactNode;
  icon?: LucideIcon;
  href?: Route;
  testId?: string;
  valueClassName?: string;
}

/** One KPI: label, value and optionally the change with its direction. */
export function StatCard({
  label,
  value,
  changePercent,
  trend = "up-good",
  hint,
  icon: Icon,
  href,
  testId,
  valueClassName,
}: StatCardProps) {
  const hasChange = typeof changePercent === "number" && Number.isFinite(changePercent);
  const up = hasChange && changePercent >= 0;
  const good = hasChange && (trend === "up-good" ? up : !up);
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="font-body text-small text-text-muted">{label}</p>
        {Icon ? <Icon className="h-5 w-5 text-text-subtle" aria-hidden="true" /> : null}
      </div>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-bold tracking-tight text-primary tabular-nums leading-tight",
          valueClassName,
        )}
        style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
      >
        {value}
      </p>
      {hasChange ? (
        <p
          className={cn(
            "mt-1 inline-flex items-center gap-1 font-body text-caption font-semibold",
            good ? "text-status-positive-text" : "text-status-negative-text",
          )}
        >
          {up ? (
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <TrendingDown className="h-4 w-4" aria-hidden="true" />
          )}
          {`${up ? "+" : ""}${changePercent.toFixed(1)}%`}
          <span className="sr-only">{up ? " up" : " down"} on the previous period</span>
        </p>
      ) : null}
      {hint ? <p className="mt-1 font-body text-caption text-text-muted">{hint}</p> : null}
    </>
  );
  const classes = "block rounded-lg border-thin border-border bg-background p-5";
  return href ? (
    <Link
      href={href}
      className={cn(classes, "transition-colors hover:border-border-strong")}
      data-testid={testId}
    >
      {body}
    </Link>
  ) : (
    <div className={classes} data-testid={testId}>
      {body}
    </div>
  );
}
