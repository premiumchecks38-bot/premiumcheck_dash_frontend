import { backendUnavailable, callWithSession, passThrough, sessionExpired } from "@/lib/server/bff";

/** The signed in user's profile, role and page permissions (refreshing when needed). */
export async function GET(request: Request): Promise<Response> {
  try {
    const result = await callWithSession(request, "/admin/auth/me", {});
    if (result.kind === "expired") return sessionExpired();
    return passThrough(result.upstream, result.tokens);
  } catch {
    return backendUnavailable();
  }
}
