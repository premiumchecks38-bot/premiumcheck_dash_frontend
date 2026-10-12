import * as React from "react";

import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, type = "text", hasError, disabled, "aria-invalid": ariaInvalid, ...props },
    ref,
  ) => {
    const isInvalid = ariaInvalid === true || ariaInvalid === "true" || hasError;

    return (
      <input
        type={type}
        className={cn(
          "flex min-h-touch w-full rounded-md border-thin border-border bg-background px-3.5 py-2 font-body text-body text-text shadow-sm transition-colors",
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

Input.displayName = "Input";
