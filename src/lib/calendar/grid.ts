import {
  addDays,
  endOfMonth,
  londonDateOf,
  londonHour,
  startOfMonth,
  startOfWeek,
} from "@/lib/dates";

/**
 * Calendar grids built from calendar dates only (never from instants), so a clock change in
 * the middle of a week or month cannot drop, repeat or shift a day.
 */

export interface GridDay {
  date: string;
  inMonth: boolean;
}

/** Whole weeks (Monday first) covering the month of `date`. */
export function monthGrid(date: string): GridDay[][] {
  const first = startOfMonth(date);
  const last = endOfMonth(date);
  const month = first.slice(0, 7);
  const weeks: GridDay[][] = [];
  let day = startOfWeek(first);
  while (day <= last) {
    const week: GridDay[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({ date: day, inMonth: day.slice(0, 7) === month });
      day = addDays(day, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/** The seven dates (Monday to Sunday) of the week containing `date`. */
export function weekDays(date: string): string[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** First and last date shown by a view, for the API request. */
export function visibleRange(view: "month" | "week", date: string): { from: string; to: string } {
  if (view === "week") {
    const days = weekDays(date);
    return { from: days[0] ?? date, to: days[6] ?? date };
  }
  const weeks = monthGrid(date);
  return { from: weeks[0]?.[0]?.date ?? date, to: weeks.at(-1)?.[6]?.date ?? date };
}

export interface CalendarItem {
  start: string;
  window_code?: string | null;
}

/** The window an event belongs to: its own code, or by its London start time (AM before 1pm). */
export function windowOf(event: CalendarItem): string {
  if (event.window_code) return event.window_code;
  return londonHour(event.start) < 13 ? "AM" : "PM";
}

/** Events grouped by London date, then window code. */
export function groupEvents<T extends CalendarItem>(
  events: readonly T[],
): Map<string, Map<string, T[]>> {
  const days = new Map<string, Map<string, T[]>>();
  for (const event of events) {
    const date = londonDateOf(event.start);
    const windows = days.get(date) ?? new Map<string, T[]>();
    const code = windowOf(event);
    windows.set(code, [...(windows.get(code) ?? []), event]);
    days.set(date, windows);
  }
  return days;
}

/** Move the anchor date by one view (previous or next month or week). */
export function shiftAnchor(view: "month" | "week", date: string, step: 1 | -1): string {
  if (view === "week") return addDays(date, 7 * step);
  const first = startOfMonth(date);
  const shifted = step === 1 ? addDays(endOfMonth(first), 1) : startOfMonth(addDays(first, -1));
  return shifted;
}
