/**
 * Formatting helpers. All money is integer pence, all dates and times are shown in
 * UK time (Europe/London) regardless of where the server or browser is.
 *
 * Intl range formatters are deliberately avoided because they insert en dashes.
 */

export const SITE_TIME_ZONE = "Europe/London";
export const SITE_LOCALE = "en-GB";

const gbp = new Intl.NumberFormat(SITE_LOCALE, {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const gbpWhole = new Intl.NumberFormat(SITE_LOCALE, {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export interface FormatPriceOptions {
  /** Drop ".00" for whole pounds, for example "£99" instead of "£99.00". */
  trimWholePounds?: boolean;
}

/** 13417 -> "£134.17". Throws on non integer input, since prices must be pence. */
export function formatPrice(pence: number, options: FormatPriceOptions = {}): string {
  if (!Number.isInteger(pence)) {
    throw new TypeError(`formatPrice expects integer pence, received ${String(pence)}`);
  }
  const pounds = pence / 100;
  if (options.trimWholePounds && pence % 100 === 0) {
    return gbpWhole.format(pounds);
  }
  return gbp.format(pounds);
}

/** VAT rate in basis points as a percentage: 2000 -> "20%", 1750 -> "17.5%". */
export function formatVatRate(basisPoints: number): string {
  return `${String(basisPoints / 100)}%`;
}

type DateInput = string | number | Date;

function toDate(input: DateInput): Date {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid date: ${String(input)}`);
  }
  return date;
}

/** Date only values such as "2026-10-06" are calendar days, not instants. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export type DateStyle = "long" | "short" | "weekday" | "numeric";

const dateStyles: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  long: { day: "numeric", month: "long", year: "numeric" },
  short: { day: "numeric", month: "short", year: "numeric" },
  weekday: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  numeric: { day: "2-digit", month: "2-digit", year: "numeric" },
};

/**
 * Format a date in London time.
 * "2026-10-06T23:30:00Z" -> "7 October 2026" (BST is UTC+1).
 * "2026-10-06" -> "6 October 2026" (date only values are never shifted).
 */
export function formatDate(input: DateInput, style: DateStyle = "long"): string {
  const isDateOnly = typeof input === "string" && DATE_ONLY.test(input);
  const date = toDate(isDateOnly ? `${input}T12:00:00Z` : input);
  return new Intl.DateTimeFormat(SITE_LOCALE, {
    ...dateStyles[style],
    timeZone: isDateOnly ? "UTC" : SITE_TIME_ZONE,
  }).format(date);
}

const TIME_OF_DAY = /^(\d{2}):(\d{2})(?::\d{2})?$/;

/** Format one time as 24 hour "HH:MM" in London time. Accepts "09:00[:00]" or an instant. */
export function formatTime(input: DateInput): string {
  if (typeof input === "string") {
    const match = TIME_OF_DAY.exec(input);
    if (match) return `${match[1] ?? "00"}:${match[2] ?? "00"}`;
  }
  return new Intl.DateTimeFormat(SITE_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: SITE_TIME_ZONE,
  }).format(toDate(input));
}

/** "09:00" + "11:00" -> "09:00 to 11:00". */
export function formatTimeRange(start: DateInput, end: DateInput): string {
  return `${formatTime(start)} to ${formatTime(end)}`;
}
