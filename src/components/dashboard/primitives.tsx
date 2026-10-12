"use client";

import * as React from "react";
import { DropdownMenu, Popover as RadixPopover, Tooltip as RadixTooltip } from "radix-ui";

import { cn } from "@/lib/utils/cn";

/**
 * Dashboard only primitives the website does not need: dropdown menu, popover and tooltip.
 * Built on Radix with the shared tokens, styled like the website's dialogs and selects.
 */

const surface =
  "z-dropdown rounded-md border-thin border-border bg-background text-text shadow-lg data-[state=open]:animate-fade-in";

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export const MenuContent = React.forwardRef<
  React.ComponentRef<typeof DropdownMenu.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(surface, "min-w-56 p-1", className)}
      {...props}
    />
  </DropdownMenu.Portal>
));
MenuContent.displayName = "MenuContent";

export const MenuItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenu.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenu.Item
    ref={ref}
    className={cn(
      "flex min-h-touch cursor-pointer items-center gap-2 rounded-sm px-3 font-body text-small text-text outline-none select-none",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-alt",
      className,
    )}
    {...props}
  />
));
MenuItem.displayName = "MenuItem";

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-border" />;
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <DropdownMenu.Label className="px-3 py-2">{children}</DropdownMenu.Label>;
}

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;

export const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof RadixPopover.Content>,
  React.ComponentPropsWithoutRef<typeof RadixPopover.Content>
>(({ className, sideOffset = 8, align = "end", ...props }, ref) => (
  <RadixPopover.Portal>
    <RadixPopover.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      className={cn(surface, "p-0", className)}
      {...props}
    />
  </RadixPopover.Portal>
));
PopoverContent.displayName = "PopoverContent";

export const TooltipProvider = RadixTooltip.Provider;

/** A short label for an icon only control (for example the collapsed sidebar). */
export function Tooltip({
  label,
  children,
  side = "right",
}: {
  label: string;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={8}
          className="z-toast rounded-sm bg-primary px-2 py-1 font-body text-caption text-primary-foreground shadow-md"
        >
          {label}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
