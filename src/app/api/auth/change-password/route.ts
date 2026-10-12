import { authRoute } from "@/lib/server/auth-routes";
import { callWithSession, passThrough, sessionExpired } from "@/lib/server/bff";
import { COOKIES, readCookie } from "@/lib/server/session";

/**
 * Change the password. The backend signs out every other session; it keeps this one because the
 * current refresh token is sent along (the generic proxy does not send it).
 */
export function POST(request: Request): Promise<Response> {
  return authRoute(request, async (body) => {
    const result = await callWithSession(request, "/admin/auth/change-password", {
      method: "POST",
      json: { current_password: body.current_password, new_password: body.new_password },
      refreshToken: readCookie(request, COOKIES.refresh) ?? null,
    });
    if (result.kind === "expired") return sessionExpired();
    return passThrough(result.upstream, result.tokens);
  });
}
