import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const alertVariants = cva(
  "relative flex w-full items-start gap-3 rounded-md border-thin p-4 font-body text-small",
  {
    variants: {
      variant: {
        info: "border-info-border bg-info-bg text-info-text",
        success: "border-success-border bg-success-bg text-success-text",
        warning: "border-warning-border bg-warning-bg text-warning-text",
        error: "border-error-border bg-error-bg text-error-text",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

const iconMap = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
  hideIcon?: boolean;
}

export function Alert({
  variant = "info",
  title,
  hideIcon = false,
  className,
  children,
  ...props
}: AlertProps) {
  const IconComponent = iconMap[variant ?? "info"];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {!hideIcon ? <IconComponent className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : null}
      <div className="flex-1 space-y-1">
        {title ? (
          <h4 className="font-heading text-small leading-tight font-semibold text-current">
            {title}
          </h4>
        ) : null}
        <div className="text-small leading-relaxed text-current">{children}</div>
      </div>
    </div>
  );
}
