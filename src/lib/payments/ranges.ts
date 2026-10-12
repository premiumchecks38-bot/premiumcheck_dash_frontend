import { addDays, endOfMonth, isDateString, londonToday, startOfMonth } from "@/lib/dates";

/** Date ranges for the Payments page, as London calendar dates. */

export const RANGE_PRESETS = [
  "this_month",
  "last_month",
  "last_30_days",
  "this_year",
  "custom",
] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const RANGE_LABELS: Record<RangePreset, string> = {
  this_month: "This month",
  last_month: "Last month",
  last_30_days: "Last 30 days",
  this_year: "This year",
  custom: "Custom",
};

export function rangeFor(
  preset: RangePreset,
  custom: { from: string; to: string },
  today: string = londonToday(),
): { from: string; to: string } {
  switch (preset) {
    case "this_month":
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case "last_month": {
      const last = addDays(startOfMonth(today), -1);
      return { from: startOfMonth(last), to: last };
    }
    case "last_30_days":
      return { from: addDays(today, -29), to: today };
    case "this_year":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case "custom": {
      const from = isDateString(custom.from) ? custom.from : startOfMonth(today);
      const to =
        isDateString(custom.to) && custom.to >= from ? custom.to : today < from ? from : today;
      return { from, to };
    }
  }
}

export function parsePreset(value: string): RangePreset {
  return (RANGE_PRESETS as readonly string[]).includes(value)
    ? (value as RangePreset)
    : "this_month";
}
