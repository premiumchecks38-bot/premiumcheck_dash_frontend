/**
 * Icon keys for categories and cards. The website maps each key to an icon; anything else is
 * refused here so the website never meets a key it cannot draw.
 */
export const ICON_KEYS = [
  { value: "zap", label: "Electrical (lightning)" },
  { value: "flame", label: "Gas (flame)" },
  { value: "fire-extinguisher", label: "Fire safety (extinguisher)" },
  { value: "alarm-smoke", label: "Smoke alarm" },
  { value: "lightbulb", label: "Lighting (bulb)" },
  { value: "thermometer", label: "Heating (thermometer)" },
  { value: "leaf", label: "Energy (leaf)" },
  { value: "shield-check", label: "Compliance (shield)" },
  { value: "clipboard-check", label: "Inspection (clipboard)" },
  { value: "file-text", label: "Certificate (document)" },
  { value: "home", label: "Home" },
  { value: "building", label: "Commercial building" },
  { value: "key", label: "Lettings (key)" },
  { value: "wrench", label: "Repairs (wrench)" },
  { value: "calendar-check", label: "Booking (calendar)" },
  { value: "pound", label: "Price (pound)" },
] as const;

export function iconLabel(key: string | null | undefined): string {
  if (!key) return "No icon";
  return ICON_KEYS.find((i) => i.value === key)?.label ?? key;
}
