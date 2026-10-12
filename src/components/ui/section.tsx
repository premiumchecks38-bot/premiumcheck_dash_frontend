import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const sectionVariants = cva("relative w-full", {
  variants: {
    background: {
      default: "bg-background text-text",
      surface: "bg-surface text-text",
      surfaceAlt: "bg-surface-alt text-text",
      brand: "bg-primary text-primary-foreground",
    },
    spacing: {
      none: "py-0",
      sm: "py-section-y-sm",
      md: "py-section-y",
      lg: "py-section-y-lg",
    },
  },
  defaultVariants: {
    background: "default",
    spacing: "md",
  },
});

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof sectionVariants> {
  as?: React.ElementType;
}

export function Section({
  as: Component = "section",
  background,
  spacing,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <Component className={cn(sectionVariants({ background, spacing }), className)} {...props}>
      {children}
    </Component>
  );
}
