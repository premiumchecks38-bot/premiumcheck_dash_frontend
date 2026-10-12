import "server-only";

import { z } from "zod";

/**
 * Server only configuration. Nothing here is ever sent to the browser: the dashboard talks to
 * the backend exclusively from its own server (BFF), so no API URL or secret is public.
 */
const schema = z.object({
  /** Backend API including /api/v1, for example http://localhost:8000/api/v1. */
  API_URL: z.url({
    error: "API_URL must be an absolute URL, for example http://localhost:8000/api/v1",
  }),
  /** Shared with the backend's TRUSTED_PROXY_SECRET: lets it rate limit by the real visitor IP. */
  BACKEND_PROXY_SECRET: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  /** Public origin of the dashboard (https://admin.premiumchecks.co.uk). Empty: the request origin. */
  DASHBOARD_URL: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.replace(/\/+$/, "") : undefined)),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cached ??= (() => {
    const result = schema.safeParse({
      API_URL: process.env.API_URL,
      BACKEND_PROXY_SECRET: process.env.BACKEND_PROXY_SECRET,
      DASHBOARD_URL: process.env.DASHBOARD_URL,
      NODE_ENV: process.env.NODE_ENV,
    });
    if (!result.success) {
      throw new Error(
        `Invalid dashboard environment:\n${result.error.issues
          .map((i) => `  ${i.path.join(".")}: ${i.message}`)
          .join("\n")}`,
      );
    }
    return result.data;
  })();
  return cached;
}

/** Cookies are Secure everywhere except local development over http. */
export function secureCookies(): boolean {
  return serverEnv().NODE_ENV === "production";
}
