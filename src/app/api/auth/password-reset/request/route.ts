import { authRoute, forwardJson } from "@/lib/server/auth-routes";

/** Request a password reset link (always answers the same, whether or not the email exists). */
export function POST(request: Request): Promise<Response> {
  return authRoute(request, (body) =>
    forwardJson(request, "/admin/auth/password-reset/request", { email: body.email }),
  );
}
