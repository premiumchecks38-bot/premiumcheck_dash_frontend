import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-alt", className)}
      {...props}
    />
  );
}
