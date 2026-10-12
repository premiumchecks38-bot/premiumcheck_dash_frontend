import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const headingVariants = cva("font-heading tracking-tight text-balance text-current", {
  variants: {
    size: {
      display: "text-display font-extrabold",
      h1: "text-h1 font-extrabold",
      h2: "text-h2 font-bold",
      h3: "text-h3 font-bold",
      h4: "text-h4 font-semibold",
    },
  },
  defaultVariants: {
    size: "h2",
  },
});

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>, VariantProps<typeof headingVariants> {
  level?: HeadingLevel;
}

export function Heading({ level = "h2", size, className, children, ...props }: HeadingProps) {
  const Component = level as React.ElementType;
  const visualSize =
    size ??
    (level.startsWith("h") ? (level as VariantProps<typeof headingVariants>["size"]) : "h2");

  return (
    <Component className={cn(headingVariants({ size: visualSize }), className)} {...props}>
      {children}
    </Component>
  );
}
