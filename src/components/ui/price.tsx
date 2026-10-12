import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";

const priceVariants = cva("inline-flex items-baseline font-heading font-bold text-text", {
  variants: {
    size: {
      sm: "text-small",
      md: "text-body",
      lg: "text-h3",
      xl: "text-h2",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface PriceProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof priceVariants> {
  pence: number;
  showVatLabel?: boolean;
  vatType?: "inc" | "exc";
  prefix?: string;
  trimWholePounds?: boolean;
}

export function Price({
  pence,
  showVatLabel = false,
  vatType = "inc",
  prefix,
  trimWholePounds = false,
  size,
  className,
  ...props
}: PriceProps) {
  const formatted = formatPrice(pence, { trimWholePounds });
  const vatText = vatType === "inc" ? "inc VAT" : "exc VAT";

  return (
    <span className={cn(priceVariants({ size }), className)} {...props}>
      {prefix ? (
        <span className="mr-1 font-body text-small font-normal text-text-muted">{prefix}</span>
      ) : null}
      <span>{formatted}</span>
      {showVatLabel ? (
        <span className="ml-1.5 font-body text-caption font-normal text-text-muted">{vatText}</span>
      ) : null}
    </span>
  );
}
