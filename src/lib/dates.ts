/**
 * Calendar dates as "YYYY-MM-DD" strings in Europe/London. Arithmetic is done on the date only
 * (as UTC midnights), so clock changes can never shift a day.
 */

export const LONDON = "Europe/London";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: string): boolean {
  return DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** Today's date in London. */
export function londonToday(now: Date = new Date()): string {
  return londonDateOf(now);
}

/** The London calendar date of an instant. */
export function londonDateOf(instant: Date | string): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LONDON,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** 0 Monday to 6 Sunday. */
export function weekdayIndex(date: string): number {
  return (toUtc(date).getUTCDay() + 6) % 7;
}

export function startOfWeek(date: string): string {
  return addDays(date, -weekdayIndex(date));
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: string): string {
  const d = toUtc(startOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return fromUtc(d);
}

export function addMonths(date: string, months: number): string {
  const d = toUtc(startOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + months);
  return fromUtc(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

/** "Tue 6 Oct" style label for a date string (no time zone shift: it is a calendar day). */
export function shortDayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(toUtc(date));
}

/** "October 2026". */
export function monthLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(toUtc(date));
}

/** The hour (0 to 23) of an instant in London. */
export function londonHour(instant: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: LONDON,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date(instant)),
  );
}

/** London's offset from UTC in minutes at an instant (60 in summer, 0 in winter). */
export function londonOffsetMinutes(instant: Date): number {
  const name = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    timeZoneName: "shortOffset",
  })
    .formatToParts(instant)
    .find((p) => p.type === "timeZoneName")?.value;
  const match = /GMT([+-]\d{1,2})(?::(\d{2}))?/.exec(name ?? "");
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  return hours * 60 + Math.sign(hours) * minutes;
}

/**
 * A London wall clock time from a datetime-local input ("2026-10-25T09:30") as a UTC ISO
 * string, whatever time zone the browser is in. Across the clock change the offset of the
 * resulting instant is used, so 01:30 on the October Sunday means the first (summer) one.
 */
export function londonLocalToIso(local: string): string {
  const asUtc = Date.parse(`${local}:00Z`);
  if (Number.isNaN(asUtc)) throw new Error("Not a date and time");
  const first = londonOffsetMinutes(new Date(asUtc));
  const guess = asUtc - first * 60_000;
  const second = londonOffsetMinutes(new Date(guess));
  return new Date(asUtc - second * 60_000).toISOString();
}

/** The London wall clock time of an instant, for a datetime-local input. */
export function isoToLondonLocal(iso: string): string {
  const date = new Date(iso);
  const shifted = new Date(date.getTime() + londonOffsetMinutes(date) * 60_000);
  return shifted.toISOString().slice(0, 16);
}
