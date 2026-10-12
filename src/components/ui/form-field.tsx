import * as React from "react";

import { cn } from "@/lib/utils/cn";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  id?: string;
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
}

export function FormField({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
  ...props
}: FormFieldProps) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)} {...props}>
      {label ? (
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
      ) : null}
      {hint ? (
        <p id={hintId} className="font-body text-caption text-text-muted">
          {hint}
        </p>
      ) : null}
      <div>{children}</div>
      <FieldError id={errorId} error={error} />
    </div>
  );
}
