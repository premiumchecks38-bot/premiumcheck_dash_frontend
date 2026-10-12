import { addDays, endOfMonth, isDateString, londonToday, startOfWeek } from "@/lib/dates";

/**
 * Booking list filters, kept in the URL so a filtered list can be shared and survives a reload.
 * One definition turns the URL into filters, filters into the URL, and filters into the
 * backend's query parameters.
 */

export const BOOKING_STATUSES = [
  "pending_payment",
  "confirmed",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "refunded",
  "no_show",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const UPCOMING_STATUSES: readonly BookingStatus[] = [
  "pending_payment",
  "confirmed",
  "scheduled",
  "in_progress",
];
export const PAST_STATUSES: readonly BookingStatus[] = [
  "completed",
  "cancelled",
  "refunded",
  "no_show",
  "confirmed",
  "scheduled",
  "pending_payment",
];

export const PAYMENT_FILTERS = ["paid", "payment_due", "pending_payment"] as const;
export type PaymentFilter = (typeof PAYMENT_FILTERS)[number];

export const DATE_PRESETS = [
  "today",
  "tomorrow",
  "this_week",
  "next_7_days",
  "this_month",
] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export const PRESET_LABELS: Record<DatePreset, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  this_week: "This week",
  next_7_days: "Next 7 days",
  this_month: "This month",
};

export interface BookingFilters {
  q: string;
  statuses: BookingStatus[];
  service: string;
  area: string;
  engineer: string;
  payment: PaymentFilter | "";
  window: string;
  from: string;
  to: string;
  preset: DatePreset | "";
  attention: boolean;
  unassigned: boolean;
  hasCertificate: "" | "yes" | "no";
  expiringWithin: string;
  sort: "" | "appointment" | "-appointment";
  page: number;
}

export const EMPTY_FILTERS: BookingFilters = {
  q: "",
  statuses: [],
  service: "",
  area: "",
  engineer: "",
  payment: "",
  window: "",
  from: "",
  to: "",
  preset: "",
  attention: false,
  unassigned: false,
  hasCertificate: "",
  expiringWithin: "",
  sort: "",
  page: 1,
};

/** The date range of a preset, from a London "today". */
export function presetRange(
  preset: DatePreset,
  today: string = londonToday(),
): { from: string; to: string } {
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "tomorrow":
      return { from: addDays(today, 1), to: addDays(today, 1) };
    case "this_week": {
      const monday = startOfWeek(today);
      return { from: today, to: addDays(monday, 6) };
    }
    case "next_7_days":
      return { from: today, to: addDays(today, 6) };
    case "this_month":
      return { from: today, to: endOfMonth(today) };
  }
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | "" {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id = (value: string | null) => (value && UUID.test(value) ? value : "");

/** URL search params to filters. Unknown or malformed values are ignored. */
export function parseFilters(params: URLSearchParams): BookingFilters {
  const statuses = (params.get("status") ?? "")
    .split(",")
    .filter((s): s is BookingStatus => (BOOKING_STATUSES as readonly string[]).includes(s));
  const page = Number(params.get("page"));
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const expiring = params.get("expiring") ?? "";
  return {
    q: (params.get("q") ?? "").slice(0, 200),
    statuses: [...new Set(statuses)],
    service: id(params.get("service")),
    area: id(params.get("area")),
    engineer: id(params.get("engineer")),
    payment: oneOf(params.get("payment"), PAYMENT_FILTERS),
    window: /^[A-Za-z]{1,10}$/.test(params.get("window") ?? "")
      ? (params.get("window") ?? "").toUpperCase()
      : "",
    from: isDateString(from) ? from : "",
    to: isDateString(to) ? to : "",
    preset: oneOf(params.get("preset"), DATE_PRESETS),
    attention: params.get("attention") === "1",
    unassigned: params.get("unassigned") === "1",
    hasCertificate: oneOf(params.get("cert"), ["yes", "no"] as const),
    expiringWithin: /^\d{1,3}$/.test(expiring) ? expiring : "",
    sort: oneOf(params.get("sort"), ["appointment", "-appointment"] as const),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** Filters to URL search params (defaults are left out, so the URL stays short). */
export function filtersToParams(filters: BookingFilters): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value: string | false | number) => {
    if (value === false || value === "" || value === 0) return;
    params.set(key, String(value));
  };
  set("q", filters.q.trim());
  set("status", filters.statuses.join(","));
  set("service", filters.service);
  set("area", filters.area);
  set("engineer", filters.engineer);
  set("payment", filters.payment);
  set("window", filters.window);
  if (filters.preset) set("preset", filters.preset);
  else {
    set("from", filters.from);
    set("to", filters.to);
  }
  set("attention", filters.attention && "1");
  set("unassigned", filters.unassigned && "1");
  set("cert", filters.hasCertificate);
  set("expiring", filters.expiringWithin);
  set("sort", filters.sort);
  if (filters.page > 1) set("page", filters.page);
  return params;
}

export type QueryValue = string | number | boolean | string[];

/** Filters to the backend's query parameters for GET /admin/bookings/{upcoming,past}. */
export function filtersToQuery(
  filters: BookingFilters,
  pageSize: number,
  today: string = londonToday(),
): Record<string, QueryValue> {
  const range = filters.preset
    ? presetRange(filters.preset, today)
    : { from: filters.from, to: filters.to };
  const query: Record<string, QueryValue> = { page: filters.page, page_size: pageSize };
  if (filters.q.trim()) query.search = filters.q.trim();
  if (filters.statuses.length) query.status = filters.statuses;
  if (filters.service) query.service_id = filters.service;
  if (filters.area) query.area_id = filters.area;
  if (filters.engineer) query.engineer_id = filters.engineer;
  if (filters.payment) query.payment = filters.payment;
  if (filters.window) query.window_code = filters.window;
  if (range.from) query.date_from = range.from;
  if (range.to) query.date_to = range.to;
  if (filters.attention) query.needs_attention = true;
  if (filters.unassigned) query.unassigned = true;
  if (filters.hasCertificate) query.has_certificate = filters.hasCertificate === "yes";
  if (filters.expiringWithin)
    query.certificate_expiring_within_days = Number(filters.expiringWithin);
  if (filters.sort) query.sort = filters.sort;
  return query;
}

/** How many filters (beyond the defaults) are active, for the "Clear filters" button. */
export function activeFilterCount(filters: BookingFilters): number {
  return [
    filters.q.trim(),
    filters.statuses.length,
    filters.service,
    filters.area,
    filters.engineer,
    filters.payment,
    filters.window,
    filters.preset || filters.from || filters.to,
    filters.attention,
    filters.unassigned,
    filters.hasCertificate,
    filters.expiringWithin,
  ].filter(Boolean).length;
}
