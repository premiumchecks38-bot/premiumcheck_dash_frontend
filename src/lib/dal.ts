import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";

import type { SessionUser } from "@/lib/auth/permissions";
import { safeNext } from "@/lib/auth/redirects";
import { backendFetch, readBackendError } from "@/lib/server/backend";
import { COOKIES } from "@/lib/server/session";

/**
 * Data Access Layer: the only place pages and layouts learn who is signed in.
 *
 * getSession() verifies the session with the backend (GET /admin/auth/me) on every request,
 * once per request thanks to React cache. proxy.ts only redirects when no session cookie
 * exists at all; a forged or stale cookie gets this far and is rejected here.
 */

export type Session =
  | { status: "authenticated"; user: SessionUser }
  /** The access token is missing or expired but a refresh session may exist. */
  | { status: "refresh" }
  | { status: "anonymous" };

/** Header set by proxy.ts with the requested path, so layouts can return the user there. */
export const PATH_HEADER = "x-dash-path";

export const getSession = cache(async (): Promise<Session> => {
  const jar = await cookies();
  const access = jar.get(COOKIES.access)?.value;
  const hasSession = jar.get(COOKIES.session)?.value === "1";
  if (!access) return { status: hasSession ? "refresh" : "anonymous" };

  const response = await backendFetch("/admin/auth/me", {
    incoming: await headers(),
    accessToken: access,
  });
  if (response.ok) {
    const body = (await response.json()) as { data: SessionUser };
    return { status: "authenticated", user: body.data };
  }
  const error = await readBackendError(response);
  if (response.status === 401 && hasSession && error.code !== "ACCOUNT_DISABLED") {
    return { status: "refresh" };
  }
  return { status: "anonymous" };
});

/**
 * Data for the first render of a page, read on the server with the signed in user's token so the
 * page arrives complete (no loading shift). Null on any failure: the client then fetches it
 * through the BFF as usual, with its error handling and refresh.
 */
export async function prefetchAdmin<T>(path: string): Promise<T | null> {
  const access = (await cookies()).get(COOKIES.access)?.value;
  if (!access) return null;
  try {
    const response = await backendFetch(`/admin${path}`, {
      incoming: await headers(),
      accessToken: access,
    });
    if (!response.ok) return null;
    return ((await response.json()) as { data: T }).data;
  } catch {
    return null;
  }
}

/** The path being rendered (from proxy.ts), for "return here after login". */
export async function currentPath(): Promise<string> {
  return safeNext((await headers()).get(PATH_HEADER)) ?? "/";
}

/**
 * The signed in user, or a redirect: to the refresh route when only the access token has
 * expired, to the login page otherwise. With forced 2FA setup pending, every page except the
 * setup page sends the user there.
 */
export async function requireUser(
  options: { allowTwoFactorSetup?: boolean } = {},
): Promise<SessionUser> {
  const session = await getSession();
  const next = await currentPath();
  if (session.status === "refresh") {
    redirect(`/api/auth/refresh?next=${encodeURIComponent(next)}` as Route);
  }
  if (session.status === "anonymous") {
    redirect(`/login?next=${encodeURIComponent(next)}` as Route);
  }
  if (session.user.two_factor_setup_required && !options.allowTwoFactorSetup) {
    redirect("/account/security/setup");
  }
  return session.user;
}
