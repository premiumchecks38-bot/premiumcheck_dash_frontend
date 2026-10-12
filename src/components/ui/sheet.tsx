"use client";

import * as React from "react";
import { Dialog as RadixDialog } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export const Sheet = RadixDialog.Root;
export const SheetTrigger = RadixDialog.Trigger;
export const SheetPortal = RadixDialog.Portal;

export const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Overlay>
>(({ className, ...props }, ref) => (
  <RadixDialog.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-overlay bg-overlay backdrop-blur-xs data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

const sheetVariants = cva(
  "fixed z-modal gap-4 bg-background p-6 shadow-lg transition-transform duration-slow ease-standard focus-visible:outline-none",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b-thin border-border data-[state=closed]:-translate-y-full data-[state=open]:translate-y-0",
        bottom:
          "inset-x-0 bottom-0 border-t-thin border-border data-[state=closed]:translate-y-full data-[state=open]:translate-y-0",
        left: "inset-y-0 left-0 h-full w-3/4 max-w-sm border-r-thin border-border data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0",
        right:
          "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l-thin border-border data-[state=closed]:translate-x-full data-[state=open]:translate-x-0",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

export interface SheetContentProps
  extends
    React.ComponentPropsWithoutRef<typeof RadixDialog.Content>,
    VariantProps<typeof sheetVariants> {}

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <RadixDialog.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
      {children}
      <RadixDialog.Close className="absolute top-4 right-4 inline-flex min-h-touch min-w-touch items-center justify-center rounded-sm p-2 text-text-muted hover:text-text focus-visible:outline-focus focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
        <X className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Close</span>
      </RadixDialog.Close>
    </RadixDialog.Content>
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-2 text-left", className)} {...props} />;
}

export const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Title>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(({ className, ...props }, ref) => (
  <RadixDialog.Title
    ref={ref}
    className={cn("font-heading text-h3 font-bold text-text", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

export const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Description>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(({ className, ...props }, ref) => (
  <RadixDialog.Description
    ref={ref}
    className={cn("font-body text-small text-text-muted", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";
