import { NextResponse } from "next/server";

import { authRoute, tokensFrom } from "@/lib/server/auth-routes";
import { backendFetch } from "@/lib/server/backend";
import { passThrough } from "@/lib/server/bff";
import { clearSessionCookies, setSessionCookies, setTwoFactorCookie } from "@/lib/server/session";

interface LoginData {
  status: "authenticated" | "two_factor_required";
  access_token: string | null;
  expires_in: number | null;
  two_factor_setup_required: boolean;
  two_factor_token: string | null;
}

/**
 * Email and password. The access and refresh tokens go into httpOnly cookies; with 2FA on, the
 * pending token goes into a short lived httpOnly cookie for /api/auth/2fa/verify. The browser
 * only learns the outcome.
 */
export function POST(request: Request): Promise<Response> {
  return authRoute(request, async (body) => {
    const upstream = await backendFetch("/admin/auth/login", {
      method: "POST",
      incoming: request,
      json: { email: body.email, password: body.password },
    });
    if (!upstream.ok) return passThrough(upstream);
    const { data } = (await upstream.json()) as { data: LoginData };

    if (data.status === "two_factor_required" && data.two_factor_token) {
      const response = NextResponse.json({ success: true, data: { status: data.status } });
      clearSessionCookies(response);
      setTwoFactorCookie(response, data.two_factor_token);
      return response;
    }
    const tokens =
      data.access_token && data.expires_in
        ? tokensFrom(upstream, { access_token: data.access_token, expires_in: data.expires_in })
        : null;
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
    return response;
  });
}
