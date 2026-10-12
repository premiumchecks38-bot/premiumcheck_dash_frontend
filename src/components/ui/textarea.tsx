import * as React from "react";

import { cn } from "@/lib/utils/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, disabled, "aria-invalid": ariaInvalid, ...props }, ref) => {
    const isInvalid = ariaInvalid === true || ariaInvalid === "true" || hasError;

    return (
      <textarea
        className={cn(
          "flex min-h-24 w-full rounded-md border-thin border-border bg-background px-3.5 py-2.5 font-body text-body text-text shadow-sm transition-colors",
          "placeholder:text-text-subtle",
          "focus-visible:outline-focus focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
          "disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-50",
          isInvalid && "border-error-border focus-visible:outline-error-text",
          className,
        )}
        ref={ref}
        disabled={disabled}
        aria-invalid={isInvalid ? "true" : undefined}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
