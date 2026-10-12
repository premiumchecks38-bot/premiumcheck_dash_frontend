"use client";

import * as React from "react";
import { RadioGroup as RadixRadioGroup } from "radix-ui";

import { cn } from "@/lib/utils/cn";

export const RadioGroup = React.forwardRef<
  React.ComponentRef<typeof RadixRadioGroup.Root>,
  React.ComponentPropsWithoutRef<typeof RadixRadioGroup.Root>
>(({ className, ...props }, ref) => {
  return <RadixRadioGroup.Root className={cn("grid gap-2", className)} {...props} ref={ref} />;
});
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps extends React.ComponentPropsWithoutRef<
  typeof RadixRadioGroup.Item
> {
  hasError?: boolean;
}

export const RadioGroupItem = React.forwardRef<
  React.ComponentRef<typeof RadixRadioGroup.Item>,
  RadioGroupItemProps
>(({ className, hasError, ...props }, ref) => {
  return (
    <span className="inline-flex min-h-touch min-w-touch items-center justify-center">
      <RadixRadioGroup.Item
        ref={ref}
        className={cn(
          "aspect-square h-5 w-5 cursor-pointer rounded-full border-thin border-border bg-background shadow-sm transition-colors",
          "focus-visible:outline-focus focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
          "disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-50",
          "data-[state=checked]:border-primary data-[state=checked]:text-primary",
          hasError && "border-error-border",
          className,
        )}
        {...props}
      >
        <RadixRadioGroup.Indicator className="flex items-center justify-center">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
        </RadixRadioGroup.Indicator>
      </RadixRadioGroup.Item>
    </span>
  );
});
RadioGroupItem.displayName = "RadioGroupItem";
