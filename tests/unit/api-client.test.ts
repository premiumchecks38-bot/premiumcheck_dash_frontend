import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  admin,
  readCsrfToken,
  request,
  setSessionExpiredHandler,
} from "@/lib/client/api";
import { safeNext } from "@/lib/auth/redirects";

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = "ppc_dash_csrf=; max-age=0";
});

describe("browser API client", () => {
  it("echoes the CSRF cookie on changes but not on reads", async () => {
    document.cookie = "ppc_dash_csrf=token123";
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => Promise.resolve(Response.json({ success: true, data: 1 })));
    await admin("/team");
    await admin("/team", { json: { email: "a@example.com" } });
    const [readInit, writeInit] = fetch.mock.calls.map(([, init]) => new Headers(init?.headers));
    expect(readInit?.get("x-csrf-token")).toBeNull();
    expect(writeInit?.get("x-csrf-token")).toBe("token123");
    expect(fetch.mock.calls[1]?.[1]?.method).toBe("POST");
  });

  it("reads the token from a cookie string", () => {
    expect(readCsrfToken("a=1; ppc_dash_csrf=abc%3D; b=2")).toBe("abc=");
    expect(readCsrfToken("a=1")).toBe("");
  });

  it("throws ApiError with code, details and Retry-After", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { success: false, error: { code: "RATE_LIMITED", message: "Slow down", details: null } },
        { status: 429, headers: { "Retry-After": "30" } },
      ),
    );
    const error = await request("/api/auth/login", { json: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, code: "RATE_LIMITED", retryAfter: 30 });
  });

  it("sends the person to the login page when the session has ended", async () => {
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { success: false, error: { code: "SESSION_EXPIRED", message: "Ended" } },
        { status: 401 },
      ),
    );
    await expect(admin("/overview")).rejects.toBeInstanceOf(ApiError);
    expect(expired).toHaveBeenCalledOnce();
  });

  it("maps a network failure to NETWORK_ERROR", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(admin("/overview")).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});

describe("safeNext", () => {
  it("keeps internal paths with their query", () => {
    expect(safeNext("/team?status=invited")).toBe("/team?status=invited");
    expect(safeNext(encodeURIComponent("/payments/disputes"))).toBe("/payments/disputes");
  });

  it("refuses anything that could leave the dashboard or loop", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/api/auth/logout",
      "/login",
      "/logout",
      "team",
      null,
    ]) {
      expect(safeNext(bad)).toBeNull();
    }
  });
});
