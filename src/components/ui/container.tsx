import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const containerVariants = cva("mx-auto w-full px-gutter", {
  variants: {
    size: {
      narrow: "max-w-narrow",
      content: "max-w-content",
      wide: "max-w-wide",
      full: "max-w-none",
    },
  },
  defaultVariants: {
    size: "content",
  },
});

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof containerVariants> {
  as?: React.ElementType;
}

export function Container({
  as: Component = "div",
  size,
  className,
  children,
  ...props
}: ContainerProps) {
  return (
    <Component className={cn(containerVariants({ size }), className)} {...props}>
      {children}
    </Component>
  );
}
