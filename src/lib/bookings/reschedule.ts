/**
 * Window cards for rescheduling and phone bookings, from the availability endpoint. A card is
 * selectable when the day is open and there are places left; owners and admins can override
 * a full window (the backend checks the role again).
 */

export interface AvailabilitySlot {
  code: string;
  start: string;
  label: string;
  capacity: number;
  places_left: number;
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
  placesLeft: number;
  capacity: number;
  selectable: boolean;
  /** Why it cannot be chosen, or a warning when an override is used. */
  note: string | null;
  current: boolean;
}

export function windowCards(
  day: AvailabilityDay | undefined,
  options: {
    override?: boolean;
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
    } else if (day.blocked) {
      selectable = Boolean(options.override);
      note = day.blocked_reason ? `Closed: ${day.blocked_reason}` : "Closed";
    } else if (slot.places_left <= 0) {
      selectable = Boolean(options.override);
      note = options.override ? "Full: booking over capacity" : "Full";
    }
    if (current) {
      selectable = false;
      note = "Current appointment";
    }
    return {
      code: slot.code,
      label: slot.label,
      placesLeft: Math.max(0, slot.places_left),
      capacity: slot.capacity,
      selectable,
      note,
      current,
    };
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
