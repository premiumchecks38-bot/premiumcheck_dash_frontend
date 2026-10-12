"use client";

import { Toaster as SonnerToaster } from "sonner";

export { toast } from "sonner";

export type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <SonnerToaster
      className="toaster group font-body"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-text group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-md group-[.toaster]:border-thin group-[.toaster]:font-body",
          description: "group-[.toast]:text-text-muted group-[.toast]:text-small",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-semibold group-[.toast]:rounded-sm",
          cancelButton:
            "group-[.toast]:bg-surface group-[.toast]:text-text group-[.toast]:rounded-sm",
        },
      }}
      {...props}
    />
  );
}
