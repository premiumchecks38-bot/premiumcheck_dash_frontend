/**
 * Website copy has no em dashes, en dashes or emojis. Fields and the editor clean text on
 * paste and on save with these rules, which match the backend (clean_typography in
 * app/services/content_sanitiser.py), so the dashboard shows exactly what will be stored.
 *
 * - A dash between two numbers (a range) becomes a hyphen.
 * - A dash between words or clauses becomes a comma.
 * - Any other en dash (inside a word) becomes a hyphen.
 * - Emojis are removed, with the spaces they leave behind.
 *
 * The characters are built from their code points so this file stays plain ASCII.
 */

const cp = (...points: number[]) => String.fromCodePoint(...points);
const FIGURE_DASH = cp(0x2012);
const EN_DASH = cp(0x2013);
const EM_DASH = cp(0x2014);
const BAR = cp(0x2015);
const DASHES = `${FIGURE_DASH}${EN_DASH}${EM_DASH}${BAR}`;

const DIGIT_DASH_RE = new RegExp(`(?<=\\d)\\s*[${DASHES}]\\s*(?=\\d)`, "gu");
const SPACED_DASH_RE = new RegExp(`[ \\t]+[${DASHES}]+[ \\t]+`, "gu");
const EM_DASH_RE = new RegExp(`[ \\t]*[${EM_DASH}${BAR}]+[ \\t]*`, "gu");
const EN_DASH_RE = new RegExp(`[${FIGURE_DASH}${EN_DASH}]`, "gu");

/** Pictographs, flags, symbols and dingbats used as emoji, joiners and variation selectors. */
const EMOJI_RANGES: [number, number][] = [
  [0x1f000, 0x1faff],
  [0x1f1e6, 0x1f1ff],
  [0x2600, 0x27bf],
  [0x2b00, 0x2bff],
  [0x2300, 0x23ff],
  [0xfe0f, 0xfe0f],
  [0x200d, 0x200d],
  [0x20e3, 0x20e3],
];
const EMOJI_RE = new RegExp(
  `[${EMOJI_RANGES.map(([a, b]) => (a === b ? `\\u{${a.toString(16)}}` : `\\u{${a.toString(16)}}-\\u{${b.toString(16)}}`)).join("")}]`,
  "gu",
);

/** Keys whose values are never prose: secrets and codes are sent exactly as typed. */
const UNTOUCHED_KEYS = new Set([
  "password",
  "current_password",
  "new_password",
  "temporary_password",
  "token",
  "code",
]);

export function cleanText(text: string): string {
  if (!text) return text;
  let out = text
    .replace(DIGIT_DASH_RE, "-")
    .replace(SPACED_DASH_RE, ", ")
    .replace(EM_DASH_RE, ", ")
    .replace(EN_DASH_RE, "-");
  const stripped = out.replace(EMOJI_RE, "");
  if (stripped !== out) {
    out = stripped.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+([,.;:!?])/g, "$1");
    if (text === text.trim()) out = out.trim();
  }
  return out;
}

/** True when cleaning would change the text (for the "we replaced..." note). */
export function needsCleaning(text: string): boolean {
  return cleanText(text) !== text;
}

/** Clean every string in a JSON value (form values or editor JSON), secrets excepted. */
export function cleanDeep<T>(value: T): T {
  if (typeof value === "string") return cleanText(value) as T;
  if (Array.isArray(value)) return value.map((item: unknown) => cleanDeep(item)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = UNTOUCHED_KEYS.has(key) ? item : cleanDeep(item);
    }
    return out as T;
  }
  return value;
}

export const CLEANED_NOTE =
  "Dashes and emojis are not used on the website, so we replaced them with a comma or hyphen.";
