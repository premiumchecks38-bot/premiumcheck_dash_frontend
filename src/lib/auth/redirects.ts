/**
 * Only internal paths are accepted as "return to" targets: a single leading slash, no
 * protocol relative "//", no backslashes, no auth or API routes.
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  let path: string;
  try {
    path = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return null;
  if (/[\u0000-\u001f]/.test(path)) return null;
  try {
    // Must stay on the same origin once resolved.
    const url = new URL(path, "https://dashboard.invalid");
    if (url.origin !== "https://dashboard.invalid") return null;
    const clean = `${url.pathname}${url.search}`;
    if (/^\/(api|login|logout)(\/|$|\?)/.test(clean)) return null;
    return clean;
  } catch {
    return null;
  }
}
