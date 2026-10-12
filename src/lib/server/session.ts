import "server-only";

import type { NextResponse } from "next/server";

import { secureCookies } from "./env";

/**
 * Dashboard session cookies. All are httpOnly except the CSRF token (which the page must read
 * to echo it in a header). The browser never sees a backend token in JavaScript.
 *
 * - ACCESS: the backend access token, path /, lives as long as the token (15 minutes).
 * - REFRESH: the backend refresh token, path /api only (the BFF routes), 14 days.
 * - SESSION: "1" while a refresh session exists. Pages cannot see the /api scoped refresh
 *   cookie, so proxy.ts and layouts use this marker to tell "signed out" from "access token
 *   expired, refresh first".
 * - TWO_FACTOR: the pending login token between the password and the 2FA step, 5 minutes.
 * - CSRF: random token for the double submit check on every state changing request.
 */
export const COOKIES = {
  access: "ppc_dash_access",
  refresh: "ppc_dash_refresh",
  session: "ppc_dash_session",
  twoFactor: "ppc_dash_2fa",
  csrf: "ppc_dash_csrf",
} as const;

export const REFRESH_PATH = "/api";
const TWO_FACTOR_PATH = "/api/auth";

export interface SessionTokens {
  accessToken: string;
  /** Seconds. */
  accessExpiresIn: number;
  refreshToken: string;
  /** Seconds. */
  refreshMaxAge: number;
}

type CookieTarget = Pick<NextResponse, "cookies">;

function base() {
  return { httpOnly: true, secure: secureCookies(), sameSite: "lax" as const };
}

export function setSessionCookies(target: CookieTarget, tokens: SessionTokens): void {
  // A few seconds early, so the cookie is gone before the backend would reject the token.
  const accessAge = Math.max(tokens.accessExpiresIn - 10, 1);
  target.cookies.set(COOKIES.access, tokens.accessToken, {
    ...base(),
    path: "/",
    maxAge: accessAge,
  });
  target.cookies.set(COOKIES.refresh, tokens.refreshToken, {
    ...base(),
    path: REFRESH_PATH,
    maxAge: tokens.refreshMaxAge,
  });
  target.cookies.set(COOKIES.session, "1", { ...base(), path: "/", maxAge: tokens.refreshMaxAge });
}

export function clearSessionCookies(target: CookieTarget): void {
  target.cookies.set(COOKIES.access, "", { ...base(), path: "/", maxAge: 0 });
  target.cookies.set(COOKIES.refresh, "", { ...base(), path: REFRESH_PATH, maxAge: 0 });
  target.cookies.set(COOKIES.session, "", { ...base(), path: "/", maxAge: 0 });
  target.cookies.set(COOKIES.twoFactor, "", { ...base(), path: TWO_FACTOR_PATH, maxAge: 0 });
}

export function setTwoFactorCookie(target: CookieTarget, token: string): void {
  target.cookies.set(COOKIES.twoFactor, token, {
    ...base(),
    path: TWO_FACTOR_PATH,
    maxAge: 5 * 60,
  });
}

export function clearTwoFactorCookie(target: CookieTarget): void {
  target.cookies.set(COOKIES.twoFactor, "", { ...base(), path: TWO_FACTOR_PATH, maxAge: 0 });
}

/** Read a cookie from a request's Cookie header (route handlers and proxy). */
export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      const value = rest.join("=");
      return value ? decodeURIComponent(value) : undefined;
    }
  }
  return undefined;
}
