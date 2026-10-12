import * as React from "react";

import { cn } from "@/lib/utils/cn";

export interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  error?: string | null;
}

export function FieldError({ error, className, id, ...props }: FieldErrorProps) {
  if (!error) return null;

  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className={cn("mt-1 font-body text-small font-medium text-error-text", className)}
      {...props}
    >
      {error}
    </p>
  );
}
