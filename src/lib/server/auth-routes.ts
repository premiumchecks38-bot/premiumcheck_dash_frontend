import "server-only";

import { NextResponse } from "next/server";

import { backendFetch, refreshTokenFromSetCookie } from "./backend";
import { backendUnavailable, passThrough } from "./bff";
import { checkCsrf, csrfFailure } from "./csrf";
import type { SessionTokens } from "./session";

/** Run a state changing auth route: CSRF check, JSON body, backend failures as 502. */
export async function authRoute(
  request: Request,
  handler: (body: Record<string, unknown>) => Promise<Response>,
): Promise<Response> {
  const csrf = checkCsrf(request);
  if (!csrf.ok) return csrfFailure(csrf);
  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_JSON", message: "The request was not valid." } },
      { status: 400 },
    );
  }
  try {
    return await handler(body);
  } catch (error) {
    console.error("Auth route failed", error instanceof Error ? error.message : error);
    return backendUnavailable();
  }
}

/** Forward a JSON body to a public auth endpoint and return the backend's answer as is. */
export async function forwardJson(
  request: Request,
  path: string,
  json: Record<string, unknown>,
): Promise<Response> {
  const upstream = await backendFetch(path, { method: "POST", incoming: request, json });
  return passThrough(upstream);
}

interface TokenBody {
  access_token: string;
  expires_in: number;
  two_factor_setup_required?: boolean;
}

/** Session tokens from a successful login, 2FA or refresh response. */
export function tokensFrom(upstream: Response, data: TokenBody): SessionTokens | null {
  const refresh = refreshTokenFromSetCookie(upstream);
  if (!refresh) return null;
  return {
    accessToken: data.access_token,
    accessExpiresIn: data.expires_in,
    refreshToken: refresh.token,
    refreshMaxAge: refresh.maxAge,
  };
}
