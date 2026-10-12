import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const textVariants = cva("font-body text-pretty", {
  variants: {
    size: {
      lead: "text-lead",
      body: "text-body",
      small: "text-small",
      caption: "text-caption",
    },
    variant: {
      default: "text-text",
      muted: "text-text-muted",
      subtle: "text-text-subtle",
      inverse: "text-primary-foreground",
      accent: "text-accent",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
  },
  defaultVariants: {
    size: "body",
    variant: "default",
    weight: "normal",
  },
});

export interface TextProps
  extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof textVariants> {
  as?: React.ElementType;
}

export function Text({
  as: Component = "p",
  size,
  variant,
  weight,
  className,
  children,
  ...props
}: TextProps) {
  return (
    <Component className={cn(textVariants({ size, variant, weight }), className)} {...props}>
      {children}
    </Component>
  );
}
