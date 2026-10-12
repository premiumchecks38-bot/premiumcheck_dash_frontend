import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items, className, ...props }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex py-2", className)} {...props}>
      <ol className="flex flex-wrap items-center gap-1.5 font-body text-small text-text-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.label} className="inline-flex items-center gap-1.5">
              {index > 0 ? (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-text-subtle"
                  aria-hidden="true"
                />
              ) : null}
              {isLast || !item.href ? (
                <span
                  className={cn(isLast && "font-semibold text-text")}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href as Route}
                  className="rounded-xs transition-colors hover:text-text hover:underline focus-visible:outline-focus focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
