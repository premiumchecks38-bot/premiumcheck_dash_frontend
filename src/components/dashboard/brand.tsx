import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** The dashboard's brand logo, matching the main website logo and favicon. */
export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center",
        compact ? "h-10 w-full justify-center" : "h-12 justify-start",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/favicon.ico"
        alt="Premium Property Checks"
        width={28}
        height={28}
        className={cn(
          "h-7 w-7 rounded-sm object-contain transition-all duration-200",
          compact ? "opacity-100 scale-100" : "opacity-0 scale-75 absolute pointer-events-none",
        )}
      />
      <div
        className={cn(
          "inline-flex flex-col items-end transition-all duration-200",
          compact ? "opacity-0 scale-90 absolute pointer-events-none" : "opacity-100 scale-100",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Premium Property Checks"
          width={180}
          height={48}
          className="h-10 w-auto object-contain"
        />
        <span className="font-heading text-[10px] font-bold tracking-wider text-text-subtle uppercase -mt-1 pr-0.5">
          Admin Dashboard
        </span>
      </div>
      <span className="sr-only">Premium Property Checks</span>
    </span>
  );
}
