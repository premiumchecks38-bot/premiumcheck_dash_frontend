import { poundsToPence, penceToPounds } from "@/lib/payments/refund";

/**
 * Prices are entered in pounds excluding VAT and stored in pence. VAT is a rate in basis
 * points (2000 is 20%), rounded half up per unit like the backend (vat_pence in
 * app/services/pricing_service.py), so the preview matches what customers pay.
 */

export const STANDARD_VAT_BP = 2000;

export const VAT_RATES = [
  { value: 2000, label: "20% (standard)" },
  { value: 500, label: "5% (reduced)" },
  { value: 0, label: "0% (zero rated or exempt)" },
] as const;

export function vatPence(netPence: number, rateBp: number): number {
  return Math.floor((netPence * rateBp + 5000) / 10000);
}

export function grossPence(netPence: number, rateBp: number): number {
  return netPence + vatPence(netPence, rateBp);
}

export interface PriceInput {
  /** Pence, or null when the typed text is not a valid amount. */
  pence: number | null;
  error: string | null;
}

/** Read a typed price in pounds ("99", "99.5", "£1,250.00"). */
export function readPrice(text: string): PriceInput {
  if (!text.trim()) return { pence: null, error: "Enter a price" };
  const pence = poundsToPence(text);
  if (pence === null) return { pence: null, error: "Enter pounds and pence, like 99.00" };
  if (pence > 100_000_000) return { pence: null, error: "That price is too high" };
  return { pence, error: null };
}

/** "99.00" for an input field. */
export function priceText(pence: number): string {
  return penceToPounds(pence);
}

export function vatRateLabel(rateBp: number): string {
  const found = VAT_RATES.find((r) => r.value === rateBp);
  return found ? found.label : `${String(rateBp / 100)}%`;
}

/** Parses "[was: £120]" or "(was £120)" from option label to separate clean title and was price. */
export function parseLabelWithWas(label: string): { cleanLabel: string; wasPrice: string } {
  const match = /[\(\[]\s*was:?\s*£?(\d+(?:\.\d{1,2})?)\s*[\)\]]/i.exec(label);
  if (!match) return { cleanLabel: label, wasPrice: "" };
  const cleanLabel = label.replace(/[\(\[]\s*was:?\s*£?\d+(?:\.\d{1,2})?\s*[\)\]]/gi, "").trim();
  return { cleanLabel, wasPrice: match[1] ?? "" };
}

/** Formats clean label with optional was price: "1 Bed Flat", "120" -> "1 Bed Flat [was: £120]". */
export function formatLabelWithWas(cleanLabel: string, wasPrice: string): string {
  const trimmedWas = wasPrice.trim().replace(/^£/, "");
  if (!trimmedWas || isNaN(Number(trimmedWas)) || Number(trimmedWas) <= 0) {
    return cleanLabel.trim();
  }
  return `${cleanLabel.trim()} [was: £${trimmedWas}]`;
}

export interface PriceDiscountCalculation {
  cleanLabel: string;
  hasDiscount: boolean;
  wasPrice: string;
  netWasPence: number;
  grossWasPence: number;
  netNewPence: number;
  grossNewPence: number;
  savingsGrossPence: number;
  savingsPercent: number;
}

export function calculatePriceDiscount(
  label: string,
  netNewPence: number,
  vatRateBp: number = STANDARD_VAT_BP,
): PriceDiscountCalculation {
  const { cleanLabel, wasPrice } = parseLabelWithWas(label);
  const parsedWas = readPrice(wasPrice);
  const netWasPence = parsedWas.pence ?? 0;
  const grossWasPence = grossPence(netWasPence, vatRateBp);
  const grossNewPence = grossPence(netNewPence, vatRateBp);

  const hasDiscount = netWasPence > netNewPence && netNewPence > 0;
  const savingsGrossPence = hasDiscount ? grossWasPence - grossNewPence : 0;
  const savingsPercent =
    hasDiscount && grossWasPence > 0
      ? Math.round((savingsGrossPence / grossWasPence) * 100)
      : 0;

  return {
    cleanLabel,
    hasDiscount,
    wasPrice,
    netWasPence,
    grossWasPence,
    netNewPence,
    grossNewPence,
    savingsGrossPence,
    savingsPercent,
  };
}
