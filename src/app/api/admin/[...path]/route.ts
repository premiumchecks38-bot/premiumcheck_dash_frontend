import type { NextRequest } from "next/server";

import { backendUnavailable, callWithSession, passThrough, sessionExpired } from "@/lib/server/bff";
import { checkCsrf, csrfFailure } from "@/lib/server/csrf";

/**
 * Generic BFF proxy: /api/admin/<path> to the backend /api/v1/admin/<path> with the access
 * token from the httpOnly cookie. Handles JSON, multipart uploads, file downloads (CSV, PDF)
 * and the notifications event stream (streamed through without buffering).
 */

export const maxDuration = 300;

interface Context {
  params: Promise<{ path: string[] }>;
}

/** Request headers forwarded to the backend. */
const FORWARD = ["content-type", "accept", "idempotency-key", "last-event-id"];

async function handle(request: NextRequest, context: Context): Promise<Response> {
  const csrf = checkCsrf(request);
  if (!csrf.ok) return csrfFailure(csrf);

  const { path } = await context.params;
  const joined = path.join("/");
  // Session endpoints have their own routes under /api/auth, which manage the cookies.
  const ownRoute =
    /^auth\/(login|refresh|logout|logout-all|2fa\/verify|change-password|password-reset|invite)/;
  if (
    path.some((segment) => segment === ".." || segment === "." || segment === "") ||
    ownRoute.test(joined)
  ) {
    return Response.json(
      { success: false, error: { code: "NOT_FOUND", message: "Not found." } },
      { status: 404 },
    );
  }
  const headers: Record<string, string> = {};
  for (const name of FORWARD) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  // Buffered so the call can be retried after a token refresh (uploads are at most 22 MiB).
  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : null;

  try {
    const result = await callWithSession(
      request,
      `/admin/${path.map(encodeURIComponent).join("/")}`,
      {
        method: request.method,
        body: body && body.byteLength > 0 ? body : null,
        headers,
        search: request.nextUrl.search,
        signal: request.signal,
      },
    );
    if (result.kind === "expired") return sessionExpired();
    return passThrough(result.upstream, result.tokens);
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.error("BFF proxy failed", error instanceof Error ? error.message : error);
    return backendUnavailable();
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
