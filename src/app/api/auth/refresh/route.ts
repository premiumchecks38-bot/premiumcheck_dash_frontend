import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/lib/auth/redirects";
import { checkCsrf, csrfFailure } from "@/lib/server/csrf";
import { refreshSession } from "@/lib/server/refresh";
import { COOKIES, clearSessionCookies, readCookie, setSessionCookies } from "@/lib/server/session";

/**
 * GET: page navigation with an expired access token (redirected here by the DAL). Refreshes and
 * returns to the page, or goes to the login page with "Your session has ended".
 * POST: the same for scripts (CSRF checked), answering with JSON.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const next = safeNext(request.nextUrl.searchParams.get("next")) ?? "/";
  const refreshToken = readCookie(request, COOKIES.refresh);
  const outcome = refreshToken
    ? await refreshSession(refreshToken, request.headers)
    : ({ ok: false, code: "INVALID_REFRESH_TOKEN" } as const);

  if (outcome.ok) {
    const target = outcome.twoFactorSetupRequired ? "/account/security/setup" : next;
    const response = NextResponse.redirect(new URL(target, request.url));
    setSessionCookies(response, outcome.tokens);
    return response;
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("expired", "1");
  login.searchParams.set("next", next);
  const response = NextResponse.redirect(login);
  clearSessionCookies(response);
  return response;
}

export async function POST(request: Request): Promise<Response> {
  const csrf = checkCsrf(request);
  if (!csrf.ok) return csrfFailure(csrf);
  const refreshToken = readCookie(request, COOKIES.refresh);
  const outcome = refreshToken
    ? await refreshSession(refreshToken, request.headers)
    : ({ ok: false, code: "INVALID_REFRESH_TOKEN" } as const);
  if (!outcome.ok) {
    const response = NextResponse.json(
      { success: false, error: { code: "SESSION_EXPIRED", message: "Your session has ended." } },
      { status: 401 },
    );
    clearSessionCookies(response);
    return response;
  }
  const response = NextResponse.json({ success: true, data: null });
  setSessionCookies(response, outcome.tokens);
  return response;
}
