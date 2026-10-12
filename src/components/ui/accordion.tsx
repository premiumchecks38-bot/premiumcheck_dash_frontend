"use client";

import * as React from "react";
import { Accordion as RadixAccordion } from "radix-ui";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export const Accordion = RadixAccordion.Root;

export const AccordionItem = React.forwardRef<
  React.ComponentRef<typeof RadixAccordion.Item>,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Item>
>(({ className, ...props }, ref) => (
  <RadixAccordion.Item
    ref={ref}
    className={cn("border-b-thin border-border", className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

export const AccordionTrigger = React.forwardRef<
  React.ComponentRef<typeof RadixAccordion.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Trigger> & { variant?: "default" | "faq" }
>(({ className, children, variant = "default", ...props }, ref) => (
  <RadixAccordion.Header className="flex">
    <RadixAccordion.Trigger
      ref={ref}
      className={cn(
        "flex min-h-touch flex-1 cursor-pointer items-center justify-between py-4 text-left font-heading text-body font-semibold text-text transition-all",
        "focus-visible:outline-focus focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        "[&[data-state=open]>svg]:rotate-180",
        variant === "faq" && "group gap-4 px-5 text-white data-[state=open]:text-primary",
        className,
      )}
      {...props}
    >
      {children}
      {variant === "faq" ? (
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-accent group-data-[state=open]:bg-accent group-data-[state=open]:text-white"
          aria-hidden="true"
        >
          <ChevronDown className="h-4 w-4 transition-transform duration-normal group-data-[state=open]:rotate-180" />
        </span>
      ) : (
        <ChevronDown
          className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-normal"
          aria-hidden="true"
        />
      )}
    </RadixAccordion.Trigger>
  </RadixAccordion.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

/**
 * Content stays in the HTML while closed (forceMount, hidden by CSS), so answers are in the
 * initial page for search engines and answer engines, and need no fetch or render on open.
 */
export const AccordionContent = React.forwardRef<
  React.ComponentRef<typeof RadixAccordion.Content>,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Content>
>(({ className, children, forceMount = true, ...props }, ref) => (
  <RadixAccordion.Content
    ref={ref}
    forceMount={forceMount}
    className="overflow-hidden font-body text-body text-text-muted data-[state=closed]:hidden data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pt-1 pb-4", className)}>{children}</div>
  </RadixAccordion.Content>
));
AccordionContent.displayName = "AccordionContent";
