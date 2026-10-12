/**
 * Meta title and description lengths. Search engines cut titles at roughly 60 characters
 * and descriptions at roughly 160; very short ones waste the space. The backend gives its own
 * warnings as well (SeoResult.warnings), which are shown next to these.
 */

export type LengthState = "empty" | "short" | "good" | "long";

export const TITLE_LIMITS = { min: 30, max: 60, hardMax: 200 } as const;
export const DESCRIPTION_LIMITS = { min: 70, max: 160, hardMax: 500 } as const;
export const QUICK_ANSWER_LIMITS = { min: 40, max: 300, hardMax: 600 } as const;

export function lengthState(text: string, limits: { min: number; max: number }): LengthState {
  const length = text.trim().length;
  if (length === 0) return "empty";
  if (length < limits.min) return "short";
  if (length > limits.max) return "long";
  return "good";
}

export const LENGTH_MESSAGES: Record<LengthState, string> = {
  empty: "Not set: a default is used",
  short: "Short: there is room to say more",
  good: "A good length",
  long: "Too long: search results will cut it off",
};

/** The title as it appears in results, with the site suffix the website adds. */
export function fullTitle(title: string, suffix: string): string {
  const clean = title.trim();
  if (!suffix) return clean;
  return clean ? `${clean} | ${suffix}` : suffix;
}

/** Cut text like a results page does (on a word, with an ellipsis). */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}...`;
}

/** Chips for the SEO overview, from a row's values and the backend warnings. */
export type SeoChip =
  | "missing_title"
  | "missing_description"
  | "too_long"
  | "noindex"
  | "missing_og_image"
  | "missing_quick_answer";

export const SEO_CHIP_LABELS: Record<SeoChip, string> = {
  missing_title: "Missing title",
  missing_description: "Missing description",
  too_long: "Too long",
  noindex: "Noindex",
  missing_og_image: "Missing OG image",
  missing_quick_answer: "Missing quick answer",
};

export interface SeoRowValues {
  meta_title: string | null;
  meta_description: string | null;
  noindex: boolean;
  og_image_id: string | null;
  warnings: string[];
  quick_answer_missing?: boolean | null;
}

export function seoChips(row: SeoRowValues): SeoChip[] {
  const chips: SeoChip[] = [];
  const warnings = row.warnings.join(" ").toLowerCase();
  if (!row.meta_title?.trim()) chips.push("missing_title");
  if (!row.meta_description?.trim()) chips.push("missing_description");
  if (
    (row.meta_title?.trim().length ?? 0) > TITLE_LIMITS.max ||
    (row.meta_description?.trim().length ?? 0) > DESCRIPTION_LIMITS.max ||
    warnings.includes("cut it")
  )
    chips.push("too_long");
  if (row.noindex) chips.push("noindex");
  if (!row.og_image_id) chips.push("missing_og_image");
  if (row.quick_answer_missing) chips.push("missing_quick_answer");
  return chips;
}
