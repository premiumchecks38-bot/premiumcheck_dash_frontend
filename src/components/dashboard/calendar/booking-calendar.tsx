"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import {
  BookingPaymentBadge,
  BookingStatusBadge,
} from "@/components/dashboard/bookings/booking-badges";
import { useBookingOptions } from "@/components/dashboard/bookings/use-booking-options";
import { selectClass } from "@/components/dashboard/field-styles";
import { MoneyText } from "@/components/dashboard/money-text";
import { Facts } from "@/components/dashboard/panel";
import { usePermission } from "@/components/dashboard/session-context";
import { statusClasses } from "@/components/dashboard/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { AvailabilityDay, BookingDetail, CalendarEvent } from "@/lib/api/schemas";
import { BOOKING_STATUS_LABELS } from "@/lib/bookings/badges";
import { groupEvents, monthGrid, shiftAnchor, visibleRange, weekDays } from "@/lib/calendar/grid";
import { admin } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import {
  addDays,
  daysBetween,
  isDateString,
  londonToday,
  monthLabel,
  shortDayLabel,
} from "@/lib/dates";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const UUID = /^[0-9a-f-]{36}$/i;

type View = "month" | "week";

function useCalendarState() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const today = londonToday();
  const view: View = params.get("view") === "week" ? "week" : "month";
  const rawDate = params.get("date") ?? "";
  const anchor = isDateString(rawDate) ? rawDate : today;
  const engineer = UUID.test(params.get("engineer") ?? "") ? (params.get("engineer") ?? "") : "";
  const service = UUID.test(params.get("service") ?? "") ? (params.get("service") ?? "") : "";
  const set = React.useCallback(
    (changes: Partial<{ view: View; date: string; engineer: string; service: string }>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      const text = next.toString();
      router.replace((text ? `${pathname}?${text}` : pathname) as Route, { scroll: false });
    },
    [params, pathname, router],
  );
  return { today, view, anchor, engineer, service, set };
}

/** Month and week calendar with AM and PM rows, places left, closed days and a booking Sheet. */
export function BookingCalendar() {
  const { today, view, anchor, engineer, service, set } = useCalendarState();
  const options = useBookingOptions();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [focused, setFocused] = React.useState(anchor);
  const gridRef = React.useRef<HTMLTableElement>(null);

  const range = visibleRange(view, anchor);
  const days = daysBetween(range.from, range.to) + 1;
  const events = useQuery({
    queryKey: ["calendar", range.from, range.to],
    queryFn: () =>
      admin<CalendarEvent[]>("/bookings/calendar", { query: { from: range.from, to: range.to } }),
    placeholderData: keepPreviousData,
  });
  const availability = useQuery({
    queryKey: ["calendar-availability", range.from, days],
    queryFn: () =>
      admin<AvailabilityDay[]>("/bookings/availability", { query: { from: range.from, days } }),
    placeholderData: keepPreviousData,
  });

  const filtered = (events.data ?? []).filter(
    (e) =>
      (!engineer || e.engineer_id === engineer) &&
      (!service || (e.service_ids ?? []).includes(service)),
  );
  const grouped = groupEvents(filtered);
  const dayInfo = new Map((availability.data ?? []).map((d) => [d.date, d]));
  const windows = options.data?.windows.length
    ? options.data.windows.map((w) => ({ code: w.code, label: w.label }))
    : [
        { code: "AM", label: "Morning" },
        { code: "PM", label: "Afternoon" },
      ];

  const weeks =
    view === "month" ? monthGrid(anchor).map((w) => w.map((d) => d.date)) : [weekDays(anchor)];
  const month = anchor.slice(0, 7);

  // Arrow keys move between days; Enter on a day with bookings focuses its first booking.
  // Set by the arrow keys; the day is focused once it is on screen (after a view change too).
  const moveFocus = React.useRef(false);
  React.useEffect(() => {
    if (!moveFocus.current) return;
    const cell = gridRef.current?.querySelector<HTMLElement>(`[data-date="${focused}"]`);
    if (cell) {
      cell.focus();
      moveFocus.current = false;
    }
  }, [focused, anchor, view]);
  const onKeyDown = (event: React.KeyboardEvent<HTMLTableElement>) => {
    const target = event.target as HTMLElement;
    const date = target.dataset.date;
    if (!date) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (step !== undefined) {
      event.preventDefault();
      moveFocus.current = true;
      const next = addDays(date, step);
      setFocused(next);
      if (next < range.from || next > range.to) set({ date: next });
    } else if (event.key === "Enter") {
      target.querySelector<HTMLElement>("button")?.focus();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border-thin border-border bg-background p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => set({ date: "" })}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={view === "month" ? "Previous month" : "Previous week"}
            onClick={() => set({ date: shiftAnchor(view, anchor, -1) })}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={view === "month" ? "Next month" : "Next week"}
            onClick={() => set({ date: shiftAnchor(view, anchor, 1) })}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <h2
            className="ml-2 font-heading text-h4 font-bold text-primary"
            aria-live="polite"
            data-testid="calendar-title"
          >
            {view === "month" ? monthLabel(anchor) : `Week of ${shortDayLabel(range.from)}`}
          </h2>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div
            role="group"
            aria-label="View"
            className="flex rounded-full border-thin border-border p-1"
          >
            {(["month", "week"] as const).map((v) => (
              <Button
                key={v}
                variant={view === v ? "primary" : "ghost"}
                size="xs"
                aria-pressed={view === v}
                onClick={() => set({ view: v === "month" ? undefined : v })}
              >
                {v === "month" ? "Month" : "Week"}
              </Button>
            ))}
          </div>
          <div>
            <Label htmlFor="calendar-engineer">Engineer</Label>
            <select
              id="calendar-engineer"
              className={`mt-1.5 ${selectClass}`}
              value={engineer}
              onChange={(e) => set({ engineer: e.target.value })}
            >
              <option value="">All engineers</option>
              {(options.data?.engineers ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="calendar-service">Service</Label>
            <select
              id="calendar-service"
              className={`mt-1.5 ${selectClass}`}
              value={service}
              onChange={(e) => set({ service: e.target.value })}
            >
              <option value="">All services</option>
              {(options.data?.services ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {events.isError ? <Alert variant="error">{errorMessage(events.error)}</Alert> : null}

      <div className="relative overflow-x-auto rounded-lg border-thin border-border bg-background">
        <table
          ref={gridRef}
          role="grid"
          className="w-full min-w-calendar table-fixed border-collapse"
          onKeyDown={onKeyDown}
          aria-busy={events.isFetching}
          data-testid="calendar-grid"
        >
          <caption className="sr-only">
            Bookings{" "}
            {view === "month"
              ? `in ${monthLabel(anchor)}`
              : `for the week of ${shortDayLabel(range.from)}`}
            . Use the arrow keys to move between days.
          </caption>
          <thead className="bg-surface">
            <tr>
              {WEEKDAYS.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className="px-2 py-2 text-left font-heading text-caption font-bold tracking-wider text-text-muted uppercase"
                >
                  <abbr title={day} className="no-underline">
                    {day.slice(0, 3)}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0]} className="border-t-thin border-border align-top">
                {week.map((date) => {
                  const info = dayInfo.get(date);
                  const outside = view === "month" && date.slice(0, 7) !== month;
                  const byWindow = grouped.get(date);
                  const isToday = date === today;
                  return (
                    <td
                      key={date}
                      data-date={date}
                      tabIndex={date === focused ? 0 : -1}
                      onFocus={() => setFocused(date)}
                      aria-label={`${formatDate(date, "weekday")}${info?.blocked ? `, closed${info.blocked_reason ? `: ${info.blocked_reason}` : ""}` : ""}`}
                      className={cn(
                        "h-36 border-l-thin border-border p-1.5 align-top first:border-l-0 focus-visible:outline-focus focus-visible:-outline-offset-2 focus-visible:outline-focus-ring",
                        outside && "bg-surface text-text-subtle",
                        info?.blocked && "bg-surface-alt",
                      )}
                      data-blocked={info?.blocked ? true : undefined}
                    >
                      <div className="mb-1 flex items-center justify-between gap-1">
                        <span
                          className={cn(
                            "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 font-body text-caption font-semibold",
                            isToday && "bg-primary text-primary-foreground",
                          )}
                        >
                          {Number(date.slice(8))}
                        </span>
                        {info?.blocked ? (
                          <span
                            className="truncate font-body text-micro font-semibold text-text-muted"
                            title={info.blocked_reason ?? "Closed"}
                          >
                            {info.blocked_reason ?? "Closed"}
                          </span>
                        ) : null}
                      </div>
                      {windows.map((w) => {
                        const items = byWindow?.get(w.code) ?? [];
                        const slot = info?.slots.find((s) => s.code === w.code);
                        if (!items.length && !slot) return null;
                        return (
                          <div key={w.code} className="mb-1">
                            <p className="flex justify-between font-body text-micro text-text-muted">
                              <span>{w.code}</span>
                              {slot && !info?.blocked && date >= today ? (
                                <span data-testid="places-left">{slot.places_left} left</span>
                              ) : null}
                            </p>
                            <ul className="space-y-0.5">
                              {items.map((event) => (
                                <li key={event.id}>
                                  <Button
                                    variant="control"
                                    size="none"
                                    type="button"
                                    onClick={() => setOpenId(event.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Escape")
                                        (
                                          e.currentTarget.closest("td") as HTMLElement | null
                                        )?.focus();
                                    }}
                                    className={`block w-full truncate rounded-sm px-1.5 py-0.5 text-left font-body font-semibold ${statusClasses("booking", event.status)}`}
                                    title={`${event.reference}, ${event.title}`}
                                    data-testid="calendar-chip"
                                  >
                                    {/* The size sits on its own span: the merge rules in cn do not know
                                    text-micro and would drop it next to the status text colour. */}
                                    <span className="text-micro">
                                      {event.reference} {event.postcode}
                                    </span>
                                    <span className="sr-only">
                                      , {event.title},{" "}
                                      {BOOKING_STATUS_LABELS[event.status] ?? event.status}
                                    </span>
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="font-body text-caption text-text-muted">
        Tab to the calendar, move between days with the arrow keys, and press Enter to reach a
        day&apos;s bookings.
      </p>

      <BookingSheet id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function BookingSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const options = useBookingOptions();
  const { canEdit } = usePermission("bookings_upcoming");
  const [engineer, setEngineer] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const booking = useQuery({
    queryKey: ["booking", id],
    queryFn: () => admin<BookingDetail>(`/bookings/${id ?? ""}`),
    enabled: Boolean(id),
  });
  const data = booking.data;

  const assign = async () => {
    if (!data || !engineer) return;
    setBusy(true);
    try {
      const updated = await admin<BookingDetail>(`/bookings/${data.id}/assign-engineer`, {
        json: { engineer_id: engineer },
      });
      queryClient.setQueryData(["booking", data.id], updated);
      await queryClient.invalidateQueries({ queryKey: ["calendar"] });
      toast.success(`${updated.engineer?.name ?? "Engineer"} assigned to ${updated.reference}.`);
      setEngineer("");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={Boolean(id)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto" data-testid="calendar-sheet">
        <SheetHeader>
          <SheetTitle>{data?.reference ?? "Booking"}</SheetTitle>
          <SheetDescription>
            {data
              ? `${data.customer.full_name}, ${data.appointment.date ? formatDate(data.appointment.date, "weekday") : ""} ${data.appointment.label ?? ""}`
              : "Loading..."}
          </SheetDescription>
        </SheetHeader>
        {!data ? (
          booking.isError ? (
            <Alert variant="error">{errorMessage(booking.error)}</Alert>
          ) : (
            <Skeleton className="mt-4 h-40 w-full" />
          )
        ) : (
          <div className="mt-4 space-y-5">
            <div className="flex flex-wrap gap-2">
              <BookingStatusBadge status={data.status} />
              <BookingPaymentBadge booking={data} />
            </div>
            <Facts
              items={[
                { label: "Property", value: `${data.address_line1}, ${data.postcode}` },
                { label: "Services", value: data.services.join(", ") },
                { label: "Engineer", value: data.engineer?.name ?? "Not assigned" },
                {
                  label: "Phone",
                  value: data.customer.phone ? (
                    <a
                      className="text-primary underline-offset-4 hover:underline"
                      href={`tel:${data.customer.phone}`}
                    >
                      {data.customer.phone}
                    </a>
                  ) : (
                    "Not given"
                  ),
                },
                { label: "Total", value: <MoneyText pence={data.totals.total_pence} /> },
              ]}
            />
            {canEdit && !["cancelled", "refunded", "completed", "no_show"].includes(data.status) ? (
              <div className="flex flex-wrap items-end gap-2 rounded-md border-thin border-border p-3">
                <div className="min-w-48 flex-1">
                  <Label htmlFor="sheet-engineer">Assign engineer</Label>
                  <select
                    id="sheet-engineer"
                    className={`mt-1.5 ${selectClass}`}
                    value={engineer}
                    onChange={(e) => setEngineer(e.target.value)}
                  >
                    <option value="">Choose an engineer</option>
                    {(options.data?.engineers ?? []).map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  size="sm"
                  variant="accent"
                  disabled={!engineer}
                  loading={busy}
                  onClick={() => void assign()}
                >
                  Assign
                </Button>
              </div>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link href={`/bookings/${data.id}` as Route}>Open the booking</Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
