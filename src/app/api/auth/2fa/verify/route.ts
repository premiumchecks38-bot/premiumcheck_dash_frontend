import { NextResponse } from "next/server";

import { authRoute, tokensFrom } from "@/lib/server/auth-routes";
import { backendFetch } from "@/lib/server/backend";
import { passThrough } from "@/lib/server/bff";
import { COOKIES, clearTwoFactorCookie, readCookie, setSessionCookies } from "@/lib/server/session";

/** Second login step: the pending token (httpOnly cookie) plus a TOTP or backup code. */
export function POST(request: Request): Promise<Response> {
  return authRoute(request, async (body) => {
    const pending = readCookie(request, COOKIES.twoFactor);
    if (!pending) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TWO_FACTOR_EXPIRED",
            message: "The sign in step has expired. Enter your email and password again.",
          },
        },
        { status: 401 },
      );
    }
    const upstream = await backendFetch("/admin/auth/2fa/verify", {
      method: "POST",
      incoming: request,
      json: { two_factor_token: pending, code: body.code },
    });
    if (!upstream.ok) return passThrough(upstream);
    const { data } = (await upstream.json()) as {
      data: { access_token: string; expires_in: number; two_factor_setup_required: boolean };
    };
    const tokens = tokensFrom(upstream, data);
    if (!tokens) {
      return NextResponse.json(
        { success: false, error: { code: "LOGIN_FAILED", message: "Sign in failed. Try again." } },
        { status: 502 },
      );
    }
    const response = NextResponse.json({
      success: true,
      data: { status: "authenticated", two_factor_setup_required: data.two_factor_setup_required },
    });
    setSessionCookies(response, tokens);
    clearTwoFactorCookie(response);
    return response;
  });
}
