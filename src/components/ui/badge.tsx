import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-heading text-caption font-semibold transition-colors select-none",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground",
        accent: "border-thin border-accent-bright bg-accent-subtle text-accent-subtle-foreground",
        warning: "border-thin border-warning-border bg-warning-bg text-warning-text",
        success: "border-thin border-success-border bg-success-bg text-success-text",
        error: "border-thin border-error-border bg-error-bg text-error-text",
        info: "border-thin border-info-border bg-info-bg text-info-text",
        outline: "border-thin border-border bg-background text-text",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
