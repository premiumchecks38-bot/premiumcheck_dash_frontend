"use client";

import { useQuery } from "@tanstack/react-query";

import type { BookingOptions } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";

/** Engineers, windows, services, property types and areas (anyone with bookings access). */
export function useBookingOptions() {
  return useQuery({
    queryKey: ["booking-options"],
    queryFn: () => admin<BookingOptions>("/bookings/options"),
    staleTime: 5 * 60_000,
  });
}
