import "server-only";

import { NextResponse } from "next/server";

import { backendFetch, readBackendError, type BackendCall } from "./backend";
import { refreshSession, type RefreshCall, callBackendRefresh } from "./refresh";
import {
  COOKIES,
  clearSessionCookies,
  readCookie,
  setSessionCookies,
  type SessionTokens,
} from "./session";

/** Backend error codes that mean "the access token is missing, expired or invalid". */
const ACCESS_TOKEN_REJECTED = new Set(["INVALID_TOKEN", "NOT_AUTHENTICATED"]);

/**
 * Response headers worth passing from the backend to the browser. Never content-length or
 * content-encoding: fetch has already decompressed a gzipped body, so the backend's length
 * would cut it short. Next sets the right framing itself.
 */
const PASS_HEADERS = [
  "content-type",
  "content-disposition",
  // Certificate downloads answer with a redirect to a short lived signed URL.
  "location",
  "retry-after",
  "x-request-id",
  "cache-control",
  "x-total-count",
];

export type SessionResult =
  { kind: "response"; upstream: Response; tokens?: SessionTokens } | { kind: "expired" };

export interface SessionDeps {
  fetch?: typeof backendFetch;
  refresh?: RefreshCall;
}

/**
 * Call the backend as the signed in user. With no access token, or when the backend rejects it,
 * the session is refreshed once (single flight) and the call retried with the new token.
 * Request bodies are buffered by the caller so the retry can resend them.
 */
export async function callWithSession(
  request: Request,
  path: string,
  call: Omit<BackendCall, "incoming" | "accessToken">,
  deps: SessionDeps = {},
): Promise<SessionResult> {
  const doFetch = deps.fetch ?? backendFetch;
  const access = readCookie(request, COOKIES.access);
  const refreshToken = readCookie(request, COOKIES.refresh);
  let tokens: SessionTokens | undefined;

  const refresh = async (): Promise<SessionTokens | undefined> => {
    if (!refreshToken) return undefined;
    const outcome = await refreshSession(
      refreshToken,
      request.headers,
      deps.refresh ?? callBackendRefresh,
    );
    return outcome.ok ? outcome.tokens : undefined;
  };

  if (!access) {
    tokens = await refresh();
    if (!tokens) return { kind: "expired" };
  }

  let upstream = await doFetch(path, {
    ...call,
    incoming: request,
    accessToken: tokens?.accessToken ?? access,
  });
  if (upstream.status === 401 && !tokens) {
    const error = await readBackendError(upstream);
    if (ACCESS_TOKEN_REJECTED.has(error.code)) {
      tokens = await refresh();
      if (!tokens) return { kind: "expired" };
      upstream = await doFetch(path, {
        ...call,
        incoming: request,
        accessToken: tokens.accessToken,
      });
    }
  }
  if (upstream.status === 401) {
    const error = await readBackendError(upstream);
    if (ACCESS_TOKEN_REJECTED.has(error.code)) return { kind: "expired" };
  }
  return { kind: "response", upstream, tokens };
}

/** 401 telling the page to send the user to the login page, with the session cookies cleared. */
export function sessionExpired(): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      error: { code: "SESSION_EXPIRED", message: "Your session has ended. Please sign in again." },
    },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
  clearSessionCookies(response);
  return response;
}

/** Copy the backend response (JSON, files or an event stream) without buffering it. */
export function passThrough(upstream: Response, tokens?: SessionTokens): NextResponse {
  const headers = new Headers();
  for (const name of PASS_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("cache-control")) headers.set("Cache-Control", "no-store");
  if (headers.get("content-type")?.startsWith("text/event-stream")) {
    headers.set("Cache-Control", "no-cache, no-transform");
    headers.set("X-Accel-Buffering", "no");
  }
  const response = new NextResponse(upstream.body, { status: upstream.status, headers });
  if (tokens) setSessionCookies(response, tokens);
  return response;
}

export function backendUnavailable(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "BACKEND_UNAVAILABLE",
        message: "The server could not be reached. Try again.",
      },
    },
    { status: 502, headers: { "Cache-Control": "no-store" } },
  );
}
