import * as React from "react";
import { Label as RadixLabel } from "radix-ui";

import { cn } from "@/lib/utils/cn";

export interface LabelProps extends React.ComponentPropsWithoutRef<typeof RadixLabel.Root> {
  required?: boolean;
}

export const Label = React.forwardRef<React.ComponentRef<typeof RadixLabel.Root>, LabelProps>(
  ({ className, children, required, ...props }, ref) => {
    return (
      <RadixLabel.Root
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 font-heading text-small leading-none font-semibold text-text peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className,
        )}
        {...props}
      >
        {children}
        {required ? (
          <span className="text-error-text" aria-hidden="true">
            *
          </span>
        ) : null}
      </RadixLabel.Root>
    );
  },
);

Label.displayName = "Label";
