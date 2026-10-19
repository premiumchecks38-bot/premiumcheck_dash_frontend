/**
 * Window cards for rescheduling and phone bookings, from the availability endpoint. Every
 * window of a date that is not in the past is selectable; a blocked date has no windows.
 */

export interface AvailabilitySlot {
  code: string;
  start: string;
  label: string;
}

export interface AvailabilityDay {
  date: string;
  blocked: boolean;
  blocked_reason: string | null;
  slots: AvailabilitySlot[];
}

export interface WindowCard {
  code: string;
  label: string;
  selectable: boolean;
  /** Why it cannot be chosen. */
  note: string | null;
  current: boolean;
}

export function windowCards(
  day: AvailabilityDay | undefined,
  options: {
    today: string;
    /** The booking's current date and window: shown, never offered as a change. */
    current?: { date: string; code: string } | null;
  },
): WindowCard[] {
  if (!day) return [];
  return day.slots.map((slot) => {
    const current = options.current?.date === day.date && options.current.code === slot.code;
    let note: string | null = null;
    let selectable = true;
    if (day.date < options.today) {
      selectable = false;
      note = "In the past";
    }
    if (current) {
      selectable = false;
      note = "Current appointment";
    }
    return { code: slot.code, label: slot.label, selectable, note, current };
  });
}

/** The chosen window, if it is still selectable (for example after the date changed). */
export function selectedWindow(
  cards: readonly WindowCard[],
  code: string | null,
): WindowCard | null {
  return cards.find((c) => c.code === code && c.selectable) ?? null;
}

/** "HH:MM" of a local date time string like "2026-10-06T08:00:00+01:00" (for the API). */
export function timeOf(start: string): string {
  const match = /T(\d{2}:\d{2})/.exec(start);
  return match?.[1] ?? "08:00";
}
