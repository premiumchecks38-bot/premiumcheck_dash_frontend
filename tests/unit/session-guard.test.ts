import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * proxy.ts only checks that a session cookie exists; the Data Access Layer verifies it with the
 * backend. A forged cookie must get past the first and be stopped by the second.
 */

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    }),
  headers: () => Promise.resolve(new Headers({ "x-dash-path": "/team" })),
}));

const { proxy } = await import("@/proxy");
const { getSession, requireUser } = await import("@/lib/dal");

const FORGED = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvd25lciJ9.forged-signature";

function backendSays(status: number, body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body, { status }));
}

function redirectTarget(error: unknown): string {
  const digest = (error as { digest?: string }).digest ?? "";
  return digest.split(";")[2] ?? "";
}

describe("forged session cookie", () => {
  beforeEach(() => jar.clear());
  afterEach(() => vi.restoreAllMocks());

  it("passes proxy.ts (a cheap cookie presence check)", () => {
    const request = new NextRequest("https://admin.example.test/team", {
      headers: { cookie: `ppc_dash_access=${FORGED}` },
    });
    const response = proxy(request);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("is rejected by the DAL, which asks the backend", async () => {
    jar.set("ppc_dash_access", FORGED);
    const fetch = backendSays(401, {
      success: false,
      error: { code: "INVALID_TOKEN", message: "Invalid token" },
    });
    expect(await getSession()).toEqual({ status: "anonymous" });
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("http://backend.test/api/v1/admin/auth/me");
    expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${FORGED}`);
  });

  it("sends the layout to the login page with the return path", async () => {
    jar.set("ppc_dash_access", FORGED);
    backendSays(401, {
      success: false,
      error: { code: "INVALID_TOKEN", message: "Invalid token" },
    });
    const error = await requireUser().catch((e: unknown) => e);
    expect(redirectTarget(error)).toBe("/login?next=%2Fteam");
  });

  it("without any cookie, proxy.ts redirects to login itself", () => {
    const response = proxy(new NextRequest("https://admin.example.test/team?tab=2"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://admin.example.test/login?next=%2Fteam%3Ftab%3D2",
    );
  });

  it("sets the CSRF cookie when it is missing, readable by the page", () => {
    const response = proxy(new NextRequest("https://admin.example.test/login"));
    const cookie = response.cookies.get("ppc_dash_csrf");
    expect(cookie?.value).toMatch(/^[0-9a-f]{64}$/);
    expect(cookie?.httpOnly).toBe(false);
    expect(cookie?.sameSite).toBe("strict");
  });

  it("a valid session reaches the page with the user from the backend", async () => {
    jar.set("ppc_dash_access", "real-token");
    backendSays(200, {
      success: true,
      data: { id: "u1", role: "owner", two_factor_setup_required: false, permissions: [] },
    });
    const user = await requireUser();
    expect(user.id).toBe("u1");
  });
});
