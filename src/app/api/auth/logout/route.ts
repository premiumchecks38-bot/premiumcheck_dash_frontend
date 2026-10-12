import { NextResponse } from "next/server";

import { authRoute } from "@/lib/server/auth-routes";
import { backendFetch } from "@/lib/server/backend";
import { COOKIES, clearSessionCookies, readCookie } from "@/lib/server/session";

/** Revoke this session at the backend and clear every dashboard session cookie. */
export function POST(request: Request): Promise<Response> {
  return authRoute(request, async () => {
    const refreshToken = readCookie(request, COOKIES.refresh);
    if (refreshToken) {
      // Cookies are cleared even if the backend cannot be reached.
      await backendFetch("/admin/auth/logout", {
        method: "POST",
        incoming: request,
        refreshToken,
      }).catch(() => null);
    }
    const response = NextResponse.json({ success: true, data: null, message: "Signed out." });
    clearSessionCookies(response);
    return response;
  });
}
