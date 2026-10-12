"use client";

import * as React from "react";
import { Select as RadixSelect } from "radix-ui";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export const Select = RadixSelect.Root;
export const SelectValue = RadixSelect.Value;

export interface SelectTriggerProps extends React.ComponentPropsWithoutRef<
  typeof RadixSelect.Trigger
> {
  hasError?: boolean;
}

export const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof RadixSelect.Trigger>,
  SelectTriggerProps
>(({ className, children, hasError, ...props }, ref) => (
  <RadixSelect.Trigger
    ref={ref}
    className={cn(
      "flex min-h-touch w-full items-center justify-between rounded-md border-thin border-border bg-background px-3.5 py-2 font-body text-body text-text transition-colors",
      "placeholder:text-text-subtle",
      "focus-visible:outline-focus focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
      "disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-50",
      hasError && "border-error-border focus-visible:outline-error-text",
      className,
    )}
    {...props}
  >
    {children}
    <RadixSelect.Icon asChild>
      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
    </RadixSelect.Icon>
  </RadixSelect.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectScrollUpButton = React.forwardRef<
  React.ComponentRef<typeof RadixSelect.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <RadixSelect.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" aria-hidden="true" />
  </RadixSelect.ScrollUpButton>
));
SelectScrollUpButton.displayName = "SelectScrollUpButton";

export const SelectScrollDownButton = React.forwardRef<
  React.ComponentRef<typeof RadixSelect.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <RadixSelect.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" aria-hidden="true" />
  </RadixSelect.ScrollDownButton>
));
SelectScrollDownButton.displayName = "SelectScrollDownButton";

export const SelectContent = React.forwardRef<
  React.ComponentRef<typeof RadixSelect.Content>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <RadixSelect.Portal>
    <RadixSelect.Content
      ref={ref}
      className={cn(
        "relative z-dropdown min-w-32 overflow-hidden rounded-md border-thin border-border bg-background text-text shadow-md data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <RadixSelect.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
        )}
      >
        {children}
      </RadixSelect.Viewport>
      <SelectScrollDownButton />
    </RadixSelect.Content>
  </RadixSelect.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof RadixSelect.Label>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Label>
>(({ className, ...props }, ref) => (
  <RadixSelect.Label
    ref={ref}
    className={cn("px-3 py-1.5 font-heading text-caption font-semibold text-text-muted", className)}
    {...props}
  />
));
SelectLabel.displayName = "SelectLabel";

export const SelectItem = React.forwardRef<
  React.ComponentRef<typeof RadixSelect.Item>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Item>
>(({ className, children, ...props }, ref) => (
  <RadixSelect.Item
    ref={ref}
    className={cn(
      "relative flex min-h-touch w-full cursor-default items-center rounded-sm py-2 pr-8 pl-3 font-body text-body outline-none select-none focus:bg-surface focus:text-text data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-4 w-4 items-center justify-center">
      <RadixSelect.ItemIndicator>
        <Check className="h-4 w-4 text-accent" aria-hidden="true" />
      </RadixSelect.ItemIndicator>
    </span>
    <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
  </RadixSelect.Item>
));
SelectItem.displayName = "SelectItem";

export const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof RadixSelect.Separator>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Separator>
>(({ className, ...props }, ref) => (
  <RadixSelect.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
));
SelectSeparator.displayName = "SelectSeparator";
