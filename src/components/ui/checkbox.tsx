"use client";

import * as React from "react";
import { Checkbox as RadixCheckbox } from "radix-ui";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof RadixCheckbox.Root> {
  hasError?: boolean;
}

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof RadixCheckbox.Root>,
  CheckboxProps
>(({ className, hasError, ...props }, ref) => (
  <span className="inline-flex min-h-touch min-w-touch items-center justify-center">
    <RadixCheckbox.Root
      ref={ref}
      className={cn(
        "peer h-5 w-5 shrink-0 rounded-sm border-thin border-border bg-background transition-colors",
        "focus-visible:outline-focus focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        "disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-50",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        hasError && "border-error-border",
        className,
      )}
      {...props}
    >
      <RadixCheckbox.Indicator className={cn("flex items-center justify-center text-current")}>
        <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  </span>
));

Checkbox.displayName = "Checkbox";
