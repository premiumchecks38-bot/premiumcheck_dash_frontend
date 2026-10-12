import { NextResponse } from "next/server";

import { authRoute } from "@/lib/server/auth-routes";
import { callWithSession, passThrough, sessionExpired } from "@/lib/server/bff";
import { clearSessionCookies } from "@/lib/server/session";

/** Revoke every session of the signed in user (all devices), then clear this browser's. */
export function POST(request: Request): Promise<Response> {
  return authRoute(request, async () => {
    const result = await callWithSession(request, "/admin/auth/logout-all", { method: "POST" });
    if (result.kind === "expired") return sessionExpired();
    if (!result.upstream.ok) return passThrough(result.upstream);
    const response = NextResponse.json({
      success: true,
      data: null,
      message: "Signed out of all devices.",
    });
    clearSessionCookies(response);
    return response;
  });
}
