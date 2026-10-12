import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const cardVariants = cva("rounded-lg border-thin transition-colors duration-normal ease-standard", {
  variants: {
    variant: {
      service: "service-card",
      map: "map-card",
      default: "border-border bg-background shadow-none",
      surface: "border-border bg-surface shadow-none",
      interactive:
        "cursor-pointer border-border bg-background shadow-none hover:border-border-strong",
      brand: "border-primary bg-primary text-primary-foreground shadow-none",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export function Card({ className, variant, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant }), className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-3", className)} {...props} />;
}
