import { authRoute, forwardJson } from "@/lib/server/auth-routes";

/** Accept a team invitation by choosing a password. */
export function POST(request: Request): Promise<Response> {
  return authRoute(request, (body) =>
    forwardJson(request, "/admin/auth/invite/accept", {
      token: body.token,
      password: body.password,
      full_name: body.full_name,
    }),
  );
}
