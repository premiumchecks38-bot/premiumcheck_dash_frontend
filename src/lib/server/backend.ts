import "server-only";

import { serverEnv } from "./env";

/**
 * Calls to the FastAPI backend, made only from the dashboard server. Every call forwards the
 * visitor's IP with the trusted proxy secret (the same mechanism as the website), so login
 * limits and audit logs see the real person, not this server.
 */

const PROXY_SECRET_HEADER = "X-PPC-Proxy-Secret";
/** The backend's refresh cookie name (REFRESH_COOKIE_NAME). */
export const BACKEND_REFRESH_COOKIE = "ppc_admin_refresh";

const IPV4 = /^(\d{1,3})(\.\d{1,3}){3}$/;
const IPV6 = /^[0-9a-f:.]+$/i;

function validIp(value: string | null | undefined): string | undefined {
  const candidate = value?.trim().replace(/^\[|\]$/g, "");
  if (!candidate) return undefined;
  if (IPV4.test(candidate) || (candidate.includes(":") && IPV6.test(candidate))) return candidate;
  return undefined;
}

/** The visitor's IP: X-Real-IP, else the last X-Forwarded-For hop (added by our own host). */
export function visitorIp(headers: Headers): string | undefined {
  const real = validIp(headers.get("x-real-ip"));
  if (real) return real;
  const hops = headers.get("x-forwarded-for")?.split(",") ?? [];
  return validIp(hops[hops.length - 1]);
}

export function visitorHeaders(incoming: Headers): Record<string, string> {
  const secret = serverEnv().BACKEND_PROXY_SECRET;
  const ip = visitorIp(incoming);
  if (!secret || !ip) return {};
  return { [PROXY_SECRET_HEADER]: secret, "X-Forwarded-For": ip };
}

export function backendUrl(path: string, search = ""): string {
  const base = serverEnv().API_URL.replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}${search}`;
}

export interface BackendError {
  code: string;
  message: string;
  details?: unknown;
}

/** The backend's error envelope, or a generic one when the body is not JSON. */
export async function readBackendError(response: Response): Promise<BackendError> {
  try {
    const body = (await response.clone().json()) as { error?: BackendError };
    if (body.error?.code) return body.error;
  } catch {
    // Not JSON.
  }
  return {
    code: `HTTP_${String(response.status)}`,
    message: response.statusText || "Request failed",
  };
}

/** The refresh token from the backend's Set-Cookie header, with its expiry. */
export function refreshTokenFromSetCookie(
  response: Response,
): { token: string; maxAge: number } | null {
  const cookies = response.headers.getSetCookie();
  for (const cookie of cookies) {
    const [pair, ...attributes] = cookie.split(";");
    const [name, ...rest] = (pair ?? "").split("=");
    if (name?.trim() !== BACKEND_REFRESH_COOKIE) continue;
    const token = rest.join("=").trim();
    if (!token) return null;
    const maxAgeAttr = attributes.find((a) => a.trim().toLowerCase().startsWith("max-age="));
    const maxAge = maxAgeAttr ? Number(maxAgeAttr.split("=")[1]) : 14 * 24 * 3600;
    return { token, maxAge: Number.isFinite(maxAge) ? maxAge : 14 * 24 * 3600 };
  }
  return null;
}

export interface BackendCall {
  method?: string;
  incoming: Request | Headers;
  accessToken?: string | null;
  refreshToken?: string | null;
  json?: unknown;
  body?: BodyInit | null;
  headers?: Record<string, string>;
  search?: string;
  signal?: AbortSignal;
}

/** One request to the backend. Throws only on network failures. */
export async function backendFetch(path: string, call: BackendCall): Promise<Response> {
  const incoming = call.incoming instanceof Headers ? call.incoming : call.incoming.headers;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...visitorHeaders(incoming),
    ...call.headers,
  };
  if (call.accessToken) headers.Authorization = `Bearer ${call.accessToken}`;
  if (call.refreshToken) headers.Cookie = `${BACKEND_REFRESH_COOKIE}=${call.refreshToken}`;
  let body = call.body;
  if (call.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(call.json);
  }
  return fetch(backendUrl(path, call.search), {
    method: call.method ?? "GET",
    headers,
    body,
    cache: "no-store",
    redirect: "manual",
    signal: call.signal,
    // Request bodies are streamed for uploads.
    ...(body instanceof ReadableStream ? { duplex: "half" } : {}),
  });
}
