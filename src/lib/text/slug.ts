/**
 * URL slugs, matching the backend (slugify in app/services/slug_service.py): accents folded to
 * plain letters, anything else between letters and numbers becomes one hyphen, at most 200
 * characters with no hyphen at either end.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(text: string, max = 200): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, max).replace(/-+$/, "");
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 200 && SLUG_PATTERN.test(slug);
}
