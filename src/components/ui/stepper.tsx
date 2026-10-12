import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface StepItem {
  id: string;
  title: string;
  description?: string;
}

export interface StepperProps extends React.HTMLAttributes<HTMLOListElement> {
  steps: StepItem[];
  currentStepIndex: number;
  onStepClick?: (index: number) => void;
}

export function Stepper({
  steps,
  currentStepIndex,
  onStepClick,
  className,
  ...props
}: StepperProps) {
  return (
    <nav aria-label="Progress">
      <ol
        className={cn("flex flex-col gap-4 md:flex-row md:items-center md:gap-8", className)}
        {...props}
      >
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isUpcoming = index > currentStepIndex;
          const isClickable = Boolean(onStepClick && isCompleted);

          return (
            <li
              key={step.id}
              className={cn("flex-1", isCurrent && "font-semibold")}
              aria-current={isCurrent ? "step" : undefined}
            >
              <div
                className={cn("flex items-center gap-3", isClickable && "group cursor-pointer")}
                onClick={() => {
                  if (isClickable && onStepClick) {
                    onStepClick(index);
                  }
                }}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === "Enter" || e.key === " ") && onStepClick) {
                    e.preventDefault();
                    onStepClick(index);
                  }
                }}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-heading text-small font-semibold transition-colors",
                    isCompleted && "bg-accent text-accent-foreground",
                    isCurrent &&
                      "border-thick border-primary bg-primary text-primary-foreground shadow-sm",
                    isUpcoming && "border-thin border-border bg-surface text-text-muted",
                    isClickable &&
                      "group-hover:opacity-85 focus-visible:outline-focus focus-visible:outline-focus-ring",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </span>
                <div className="flex flex-col">
                  <span
                    className={cn(
                      "font-heading text-small leading-tight font-semibold",
                      isCurrent && "text-text",
                      isCompleted && "text-text",
                      isUpcoming && "text-text-muted",
                    )}
                  >
                    {step.title}
                  </span>
                  {step.description ? (
                    <span className="font-body text-caption text-text-muted">
                      {step.description}
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
