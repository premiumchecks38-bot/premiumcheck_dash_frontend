/**
 * Prefill for the new booking form from the URL. Renewals and quote conversions link to
 * /bookings/new with these parameters:
 *   email, name, phone            the customer
 *   address                       "10 Oak Avenue, St Albans, AL1 3AB" (split on commas)
 *   postcode                      overrides the postcode from address
 *   items                         "optionId:2,optionId" price options with quantities
 *   certificate_type              picks a matching service when no items are given
 *   renewal                       the earlier booking's reference (added to the notes)
 *   notes                         internal notes
 */

export interface BookingPrefill {
  email: string;
  name: string;
  phone: string;
  addressLine1: string;
  city: string;
  postcode: string;
  items: { optionId: string; quantity: number }[];
  certificateType: string;
  notes: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export function readPrefill(params: URLSearchParams): BookingPrefill {
  const text = (key: string, max = 200) => (params.get(key) ?? "").trim().slice(0, max);
  const parts = text("address", 300)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  let postcode = text("postcode", 10);
  if (!postcode && parts.length && POSTCODE.test(parts.at(-1) ?? "")) postcode = parts.pop() ?? "";
  const addressLine1 = parts.length > 1 ? parts.slice(0, -1).join(", ") : (parts[0] ?? "");
  const city = parts.length > 1 ? (parts.at(-1) ?? "") : "";
  const items = text("items", 2000)
    .split(",")
    .map((entry) => {
      const [optionId = "", qty = "1"] = entry.split(":");
      return { optionId, quantity: Math.min(50, Math.max(1, Number.parseInt(qty, 10) || 1)) };
    })
    .filter((item) => UUID.test(item.optionId));
  const renewal = text("renewal", 30);
  const notes = [renewal ? `Renewal of ${renewal}.` : "", text("notes", 2000)]
    .filter(Boolean)
    .join(" ");
  return {
    email: text("email", 320),
    name: text("name"),
    phone: text("phone", 30),
    addressLine1,
    city,
    postcode: postcode.toUpperCase(),
    items,
    certificateType: text("certificate_type", 40),
    notes,
  };
}

/** Service name words that match a certificate type (renewals). */
export const CERTIFICATE_SERVICE_HINTS: Record<string, string[]> = {
  eicr: ["eicr", "electrical"],
  cp12: ["gas safety", "cp12", "gas"],
  cp42: ["cp42", "commercial gas"],
  epc: ["epc", "energy"],
  fra: ["fire risk"],
  pat: ["pat"],
  asbestos: ["asbestos"],
  emergency_lighting: ["emergency lighting"],
  inventory: ["inventory"],
};
