import * as React from "react";

import { cn } from "@/lib/utils/cn";

export interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  targetId?: string;
}

export function SkipLink({
  targetId = "main-content",
  className,
  children = "Skip to main content",
  ...props
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-toast",
        "bg-primary font-heading text-small font-semibold text-primary-foreground",
        "inline-flex min-h-touch items-center justify-center rounded-md px-4 py-2.5 shadow-md",
        "focus-visible:outline-focus focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
