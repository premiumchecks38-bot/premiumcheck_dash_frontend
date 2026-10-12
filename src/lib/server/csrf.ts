import "server-only";

import { serverEnv } from "./env";
import { COOKIES, readCookie } from "./session";

/**
 * CSRF protection for every state changing BFF request (POST, PUT, PATCH, DELETE):
 * 1. Same origin: the Origin header must be the dashboard's own origin.
 * 2. Double submit: the X-CSRF-Token header must equal the ppc_dash_csrf cookie.
 * SameSite=Lax session cookies already stop most cross site requests; these two checks close
 * the remaining gaps (same site subdomains, older browsers).
 */

export const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export type CsrfResult = { ok: true } | { ok: false; reason: "origin" | "token" };

function expectedOrigin(request: Request): string {
  return serverEnv().DASHBOARD_URL ?? new URL(request.url).origin;
}

/** Constant time comparison of two strings. */
function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkCsrf(request: Request): CsrfResult {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return { ok: true };
  const origin = request.headers.get("origin");
  if (!origin || origin !== expectedOrigin(request)) return { ok: false, reason: "origin" };
  const cookie = readCookie(request, COOKIES.csrf);
  const header = request.headers.get(CSRF_HEADER);
  if (!cookie || !header || !equal(cookie, header)) return { ok: false, reason: "token" };
  return { ok: true };
}

export function csrfFailure(result: Exclude<CsrfResult, { ok: true }>): Response {
  return Response.json(
    {
      success: false,
      error: {
        code: "CSRF_FAILED",
        message:
          result.reason === "origin"
            ? "This request did not come from the dashboard."
            : "Your session security token is missing or out of date. Reload the page and try again.",
      },
    },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

/** A new random CSRF token (set by proxy.ts when the cookie is missing). */
export function newCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
