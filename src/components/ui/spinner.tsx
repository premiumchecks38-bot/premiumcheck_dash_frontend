import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const spinnerVariants = cva(
  "animate-spin rounded-full border-thick border-solid border-current border-t-transparent",
  {
    variants: {
      size: {
        sm: "h-4 w-4 border-thin",
        md: "h-5 w-5 border-thick",
        lg: "h-8 w-8 border-thick",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof spinnerVariants> {
  label?: string;
}

export function Spinner({ className, size, label = "Loading...", ...props }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center justify-center", className)}
      {...props}
    >
      <span className={cn(spinnerVariants({ size }))} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
