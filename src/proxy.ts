import { NextResponse, type NextRequest } from "next/server";

import { newCsrfToken } from "@/lib/server/csrf";
import { secureCookies } from "@/lib/server/env";
import { COOKIES } from "@/lib/server/session";

/**
 * Cheap checks only. This NEVER authorises anything: a forged cookie passes here and is
 * rejected by the Data Access Layer (src/lib/dal.ts) and the backend.
 *
 * - No session cookie at all on a dashboard page: redirect to /login with the return path.
 * - Pass the requested path to layouts (x-dash-path) so they can return there after login.
 * - Make sure the CSRF double submit cookie exists.
 * - Every response is noindex: the dashboard is private.
 */

const PUBLIC_PAGES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/logout",
  "/robots.txt",
];

function isPublic(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession =
    Boolean(request.cookies.get(COOKIES.access)?.value) ||
    request.cookies.get(COOKIES.session)?.value === "1";

  let response: NextResponse;
  if (!isPublic(pathname) && !hasSession) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    response = NextResponse.redirect(login);
  } else {
    const forwarded = new Headers(request.headers);
    forwarded.set("x-dash-path", `${pathname}${search}`);
    response = NextResponse.next({ request: { headers: forwarded } });
  }

  if (!request.cookies.get(COOKIES.csrf)?.value) {
    response.cookies.set(COOKIES.csrf, newCsrfToken(), {
      // Read by the page and echoed in X-CSRF-Token; useless to anyone on another origin.
      httpOnly: false,
      secure: secureCookies(),
      sameSite: "strict",
      path: "/",
    });
  }
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2|css|js)$).*)",
  ],
};
