import "server-only";

import { backendFetch, readBackendError, refreshTokenFromSetCookie } from "./backend";
import type { SessionTokens } from "./session";

/**
 * Refresh the backend session, once per refresh token.
 *
 * Parallel requests that find an expired access token all await the same in flight refresh
 * (single flight), so the backend rotates the token only once. Results are kept for 25 seconds:
 * a request that arrives just after with the old refresh cookie (the browser had not stored the
 * new one yet) reuses the result instead of presenting a rotated token. The backend's own
 * 30 second grace window covers the same race across server instances.
 */

export type RefreshOutcome =
  | { ok: true; tokens: SessionTokens; twoFactorSetupRequired: boolean }
  | { ok: false; code: string };

interface Entry {
  promise: Promise<RefreshOutcome>;
  settledAt: number | null;
}

const REUSE_MS = 25_000;
const inflight = new Map<string, Entry>();

export type RefreshCall = (refreshToken: string, incoming: Headers) => Promise<RefreshOutcome>;

/** The real call to POST /admin/auth/refresh. */
export const callBackendRefresh: RefreshCall = async (refreshToken, incoming) => {
  const response = await backendFetch("/admin/auth/refresh", {
    method: "POST",
    incoming,
    refreshToken,
  });
  if (!response.ok) {
    const error = await readBackendError(response);
    return { ok: false, code: error.code };
  }
  const body = (await response.json()) as {
    data: { access_token: string; expires_in: number; two_factor_setup_required: boolean };
  };
  const refresh = refreshTokenFromSetCookie(response);
  if (!refresh) return { ok: false, code: "INVALID_REFRESH_TOKEN" };
  return {
    ok: true,
    twoFactorSetupRequired: body.data.two_factor_setup_required,
    tokens: {
      accessToken: body.data.access_token,
      accessExpiresIn: body.data.expires_in,
      refreshToken: refresh.token,
      refreshMaxAge: refresh.maxAge,
    },
  };
};

export function refreshSession(
  refreshToken: string,
  incoming: Headers,
  call: RefreshCall = callBackendRefresh,
  now: () => number = Date.now,
): Promise<RefreshOutcome> {
  const existing = inflight.get(refreshToken);
  if (existing && (existing.settledAt === null || now() - existing.settledAt < REUSE_MS)) {
    return existing.promise;
  }
  const entry: Entry = {
    promise: Promise.resolve({ ok: false, code: "PENDING" }),
    settledAt: null,
  };
  entry.promise = call(refreshToken, incoming)
    .catch((): RefreshOutcome => ({ ok: false, code: "BACKEND_UNAVAILABLE" }))
    .then((outcome) => {
      entry.settledAt = now();
      // Failed refreshes are not reused: the next attempt may succeed.
      if (!outcome.ok) inflight.delete(refreshToken);
      return outcome;
    });
  inflight.set(refreshToken, entry);
  pruneOld(now());
  return entry.promise;
}

function pruneOld(at: number): void {
  for (const [key, entry] of inflight) {
    if (entry.settledAt !== null && at - entry.settledAt >= REUSE_MS) inflight.delete(key);
  }
}

/** Test helper: forget every cached refresh. */
export function resetRefreshCache(): void {
  inflight.clear();
}
