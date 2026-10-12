/**
 * The public website, for "View on website" links and the page preview. Set
 * NEXT_PUBLIC_WEBSITE_URL (it is public, not a secret); the live domain is the default.
 */
export const WEBSITE_URL = (
  process.env.NEXT_PUBLIC_WEBSITE_URL ?? "https://premiumchecks.co.uk"
).replace(/\/+$/, "");

/** The full website address of a path ("/services/eicr"). */
export function websiteUrl(path: string): string {
  return `${WEBSITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
