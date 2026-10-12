"use client";

import * as React from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { filtersToParams, parseFilters, type BookingFilters } from "@/lib/bookings/filters";

/** Booking filters from the URL, and a setter that writes them back (resetting the page). */
export function useBookingFilters(): [BookingFilters, (changes: Partial<BookingFilters>) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = React.useMemo(
    () => parseFilters(new URLSearchParams(params.toString())),
    [params],
  );

  // The filters last written, until the URL catches up: two quick changes (say two chips
  // clicked one after the other) must build on each other, not on the old URL.
  const pending = React.useRef<BookingFilters | null>(null);
  React.useEffect(() => {
    pending.current = null;
  }, [params]);

  const update = React.useCallback(
    (changes: Partial<BookingFilters>) => {
      const next: BookingFilters = { ...(pending.current ?? filters), ...changes };
      if (!("page" in changes)) next.page = 1;
      // A custom range replaces the preset, and a preset replaces a custom range.
      if (("from" in changes || "to" in changes) && !("preset" in changes)) next.preset = "";
      if (changes.preset) {
        next.from = "";
        next.to = "";
      }
      pending.current = next;
      const tab = params.get("tab");
      const query = filtersToParams(next);
      if (tab) query.set("tab", tab);
      const text = query.toString();
      router.replace((text ? `${pathname}?${text}` : pathname) as Route, { scroll: false });
    },
    [filters, params, pathname, router],
  );

  return [filters, update];
}
