import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** The dashboard's brand logo, matching the main website logo and favicon. */
export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <span className={cn("inline-flex items-center justify-center p-1", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/favicon.ico"
          alt="Premium Property Checks"
          width={28}
          height={28}
          className="h-7 w-7 rounded-sm object-contain"
        />
        <span className="sr-only">Premium Property Checks</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex w-full items-center justify-center py-1", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Premium Property Checks"
        width={180}
        height={48}
        className="h-9 sm:h-10 w-auto max-w-[200px] object-contain mx-auto"
      />
      <span className="sr-only">Premium Property Checks Dashboard</span>
    </span>
  );
}
