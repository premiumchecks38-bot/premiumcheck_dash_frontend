"use client";

import { useQuery } from "@tanstack/react-query";

import { dateInputClass } from "@/components/dashboard/field-styles";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { AvailabilityDay } from "@/lib/api/schemas";
import { windowCards, type WindowCard } from "@/lib/bookings/reschedule";
import { admin } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { londonToday } from "@/lib/dates";
import { cn } from "@/lib/utils/cn";

/**
 * A date and the windows of that day (reschedule and phone bookings). Blocked dates have none.
 * Reports the chosen window's code and its start time for the API.
 */
export function WindowPicker({
  idPrefix,
  date,
  onDateChange,
  code,
  onCodeChange,
  serviceIds,
  current,
}: {
  idPrefix: string;
  date: string;
  onDateChange: (date: string) => void;
  code: string | null;
  onCodeChange: (code: string | null, start: string | null) => void;
  serviceIds: string[];
  current?: { date: string; code: string } | null;
}) {
  const today = londonToday();
  const day = useQuery({
    queryKey: ["availability", date, serviceIds],
    queryFn: () =>
      admin<AvailabilityDay[]>("/bookings/availability", {
        query: { from: date, days: 1, service_ids: serviceIds },
      }),
    enabled: Boolean(date),
  });
  const availability = day.data?.[0];
  const cards = windowCards(availability, { today, current });

  return (
    <div className="space-y-3">
      <div className="max-w-xs">
        <Label htmlFor={`${idPrefix}-date`}>Date</Label>
        <input
          id={`${idPrefix}-date`}
          type="date"
          min={today}
          className={`mt-1.5 ${dateInputClass}`}
          value={date}
          onChange={(event) => {
            onDateChange(event.target.value);
            onCodeChange(null, null);
          }}
        />
      </div>
      <fieldset>
        <legend className="font-body text-small font-semibold">Window</legend>
        {day.isPending ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : day.isError ? (
          <p className="mt-2 font-body text-small text-error-text">{errorMessage(day.error)}</p>
        ) : cards.length === 0 ? (
          <p className="mt-2 font-body text-small text-text-muted">
            {availability?.blocked
              ? `Closed${availability.blocked_reason ? `: ${availability.blocked_reason}` : ""}.`
              : "No appointments on this day. Choose another date."}
          </p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2" data-testid={`${idPrefix}-windows`}>
            {cards.map((card: WindowCard) => {
              const slot = availability?.slots.find((s) => s.code === card.code);
              const checked = code === card.code;
              return (
                <label
                  key={card.code}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-md border-thin border-border p-3 font-body text-small has-[:checked]:border-primary has-[:checked]:bg-surface",
                    !card.selectable && "cursor-not-allowed opacity-60",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`${idPrefix}-window`}
                      value={card.code}
                      className="h-4 w-4 accent-primary"
                      checked={checked}
                      disabled={!card.selectable}
                      onChange={() => onCodeChange(card.code, slot?.start ?? null)}
                    />
                    <span className="font-semibold">{card.label}</span>
                  </span>
                  {card.note ? (
                    <span className="pl-6 text-caption text-text-muted">{card.note}</span>
                  ) : null}
                </label>
              );
            })}
          </div>
        )}
      </fieldset>
    </div>
  );
}
