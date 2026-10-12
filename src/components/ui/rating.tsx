import * as React from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface RatingProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showScore?: boolean;
}

export function Rating({ value, max = 5, showScore = false, className, ...props }: RatingProps) {
  const roundedValue = Math.min(Math.max(value, 0), max);
  const label = `Rated ${roundedValue.toFixed(1)} out of ${max} stars`;

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    >
      <div className="flex items-center gap-0.5 text-warning" aria-hidden="true">
        {Array.from({ length: max }).map((_, i) => {
          const filled = i < Math.floor(roundedValue);
          const half = !filled && i < roundedValue;

          return (
            <Star
              key={i}
              className={cn(
                "h-4 w-4",
                filled && "fill-warning text-warning",
                half && "fill-warning/50 text-warning",
                !filled && !half && "text-border-strong",
              )}
            />
          );
        })}
      </div>
      {showScore ? (
        <span className="ml-1 font-heading text-small font-semibold text-text">
          {roundedValue.toFixed(1)}
        </span>
      ) : null}
      <span className="sr-only">{label}</span>
    </div>
  );
}
