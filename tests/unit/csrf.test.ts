import { describe, expect, it } from "vitest";

import { checkCsrf, csrfFailure, newCsrfToken } from "@/lib/server/csrf";

const ORIGIN = "https://admin.example.test";

function req(method: string, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/admin/team`, { method, headers });
}

describe("checkCsrf", () => {
  const token = "a".repeat(64);
  const good = { origin: ORIGIN, cookie: `ppc_dash_csrf=${token}`, "x-csrf-token": token };

  it("lets safe methods through without a token", () => {
    expect(checkCsrf(req("GET")).ok).toBe(true);
    expect(checkCsrf(req("HEAD")).ok).toBe(true);
  });

  it("accepts a same origin request whose header matches the cookie", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(checkCsrf(req(method, good))).toEqual({ ok: true });
    }
  });

  it("rejects a missing or foreign Origin", () => {
    expect(checkCsrf(req("POST", { ...good, origin: "https://evil.example" }))).toEqual({
      ok: false,
      reason: "origin",
    });
    const { origin: _origin, ...noOrigin } = good;
    expect(checkCsrf(req("POST", noOrigin))).toEqual({ ok: false, reason: "origin" });
    // A sibling subdomain is a different origin.
    expect(checkCsrf(req("POST", { ...good, origin: "https://www.example.test" }))).toEqual({
      ok: false,
      reason: "origin",
    });
  });

  it("rejects a missing or mismatched token", () => {
    expect(checkCsrf(req("POST", { ...good, "x-csrf-token": "b".repeat(64) }))).toEqual({
      ok: false,
      reason: "token",
    });
    const { "x-csrf-token": _header, ...noHeader } = good;
    expect(checkCsrf(req("POST", noHeader))).toEqual({ ok: false, reason: "token" });
    expect(checkCsrf(req("POST", { ...good, cookie: "" }))).toEqual({ ok: false, reason: "token" });
  });

  it("answers 403 CSRF_FAILED", async () => {
    const response = csrfFailure({ ok: false, reason: "token" });
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("CSRF_FAILED");
  });

  it("creates long random tokens", () => {
    const a = newCsrfToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(newCsrfToken()).not.toBe(a);
  });
});
