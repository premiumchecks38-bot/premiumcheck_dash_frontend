import { authRoute, forwardJson } from "@/lib/server/auth-routes";

/** Set a new password with the token from the reset email. */
export function POST(request: Request): Promise<Response> {
  return authRoute(request, (body) =>
    forwardJson(request, "/admin/auth/password-reset/confirm", {
      token: body.token,
      new_password: body.new_password,
    }),
  );
}
