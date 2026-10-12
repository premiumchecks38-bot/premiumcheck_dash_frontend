/** Words for backend codes shown on the booking, customer and payment screens. */

export const CERTIFICATE_TYPE_LABELS: Record<string, string> = {
  eicr: "EICR (electrical)",
  cp12: "Gas safety (CP12)",
  cp42: "Commercial gas (CP42)",
  epc: "EPC",
  fra: "Fire risk assessment",
  pat: "PAT testing",
  asbestos: "Asbestos survey",
  emergency_lighting: "Emergency lighting",
  inventory: "Inventory",
  other: "Other",
};

export const OFFLINE_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  card_terminal: "Card terminal",
  other: "Other",
};

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  landlord: "Landlord",
  letting_agent: "Letting agent",
  homeowner: "Homeowner",
  business: "Business",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: "Card (paid online)",
  pay_on_inspection: "Pay on inspection",
};

export const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  admin: "Dashboard",
  phone: "Phone",
};

/** "booking_confirmed" to "Booking confirmed". */
export function humanise(code: string): string {
  const text = code.replace(/[_-]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
