import type { Envelope, Paged } from "@/lib/api/schemas";
import { reloadTo } from "@/lib/client/navigate";

/**
 * Browser side calls to the dashboard's own BFF routes (/api/admin/..., /api/auth/...).
 * The CSRF token is echoed from its cookie; tokens never appear in JavaScript.
 */

export const CSRF_COOKIE = "ppc_dash_csrf";
export const CSRF_HEADER = "X-CSRF-Token";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  /** Seconds, from Retry-After on 429. */
  readonly retryAfter: number | null;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    retryAfter?: number | null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details ?? null;
    this.retryAfter = retryAfter ?? null;
  }
}

export function readCsrfToken(
  cookie: string = typeof document === "undefined" ? "" : document.cookie,
): string {
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === CSRF_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return "";
}

/** Called when the session has ended: back to the login page, then to this page. */
let onSessionExpired = (): void => {
  const next = `${window.location.pathname}${window.location.search}`;
  reloadTo(`/login?expired=1&next=${encodeURIComponent(next)}`);
};

/** Tests replace the redirect. */
export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

export interface RequestOptions {
  method?: string;
  json?: unknown;
  body?: BodyInit;
  /** Arrays repeat the parameter (status=a&status=b). */
  query?: Record<string, QueryParam>;
  signal?: AbortSignal;
}

type QueryScalar = string | number | boolean | null | undefined;
export type QueryParam = QueryScalar | readonly string[];

/** The query string for a request (also used for download links). */
export function queryString(query: Record<string, QueryParam>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value as readonly string[]) params.append(key, item);
    } else if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

function withQuery(path: string, query: RequestOptions["query"]): string {
  if (!query) return path;
  const text = queryString(query);
  return text ? `${path}${path.includes("?") ? "&" : "?"}${text}` : path;
}

/** Fetch a BFF route and return the parsed envelope; throws ApiError on any failure. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<Envelope<T>> {
  const method = (options.method ?? (options.json !== undefined ? "POST" : "GET")).toUpperCase();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (method !== "GET") headers[CSRF_HEADER] = readCsrfToken();
  let body = options.body;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }
  let response: Response;
  try {
    response = await fetch(withQuery(path, options.query), {
      method,
      headers,
      body,
      credentials: "same-origin",
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK_ERROR", "You appear to be offline. Check your connection.");
  }
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Not JSON (for example an HTML error page).
  }
  if (!response.ok) {
    const error = (
      payload as { error?: { code?: string; message?: string; details?: unknown } } | null
    )?.error;
    const retryAfter = Number(response.headers.get("retry-after"));
    const apiError = new ApiError(
      response.status,
      error?.code ?? `HTTP_${String(response.status)}`,
      error?.message ?? "Something went wrong.",
      error?.details,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    );
    if (response.status === 401 && apiError.code === "SESSION_EXPIRED") onSessionExpired();
    throw apiError;
  }
  return payload as Envelope<T>;
}

function normalizeAdminPath(path: string): string {
  if (path.startsWith("/admin/")) return path.slice(6);
  if (path === "/admin") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

/** Shorthand for the data of a dashboard API call (/api/admin + path). */
export async function admin<T>(path: string, options?: RequestOptions): Promise<T> {
  return (await request<T>(`/api/admin${normalizeAdminPath(path)}`, options)).data;
}

/** A paginated dashboard list: rows plus the page information from the backend. */
export async function adminPage<T>(path: string, options?: RequestOptions): Promise<Paged<T>> {
  const envelope = await request<T>(`/api/admin${normalizeAdminPath(path)}`, options);
  return {
    data: envelope.data,
    meta: envelope.meta ?? { page: 1, page_size: 0, total: 0, total_pages: 0 },
  };
}

