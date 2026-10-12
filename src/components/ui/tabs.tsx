"use client";

import * as React from "react";
import { Tabs as RadixTabs } from "radix-ui";

import { cn } from "@/lib/utils/cn";

export const Tabs = RadixTabs.Root;

export const TabsList = React.forwardRef<
  React.ComponentRef<typeof RadixTabs.List>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.List>
>(({ className, ...props }, ref) => (
  <RadixTabs.List
    ref={ref}
    className={cn(
      "inline-flex h-auto items-center justify-center rounded-md bg-surface-alt p-1 text-text-muted",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof RadixTabs.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(({ className, ...props }, ref) => (
  <RadixTabs.Trigger
    ref={ref}
    className={cn(
      "inline-flex min-h-touch cursor-pointer items-center justify-center rounded-sm px-4 py-2 font-heading text-small font-semibold whitespace-nowrap transition-all",
      "focus-visible:outline-focus focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-background data-[state=active]:text-text data-[state=active]:shadow-sm",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof RadixTabs.Content>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(({ className, ...props }, ref) => (
  <RadixTabs.Content
    ref={ref}
    className={cn(
      "mt-3 rounded-md focus-visible:outline-focus focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
