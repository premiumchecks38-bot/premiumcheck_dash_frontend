import { beforeEach, describe, expect, it, vi } from "vitest";

import type { backendFetch } from "@/lib/server/backend";
import { callWithSession, passThrough } from "@/lib/server/bff";
import { resetRefreshCache, type RefreshCall } from "@/lib/server/refresh";

const tokens = {
  accessToken: "fresh",
  accessExpiresIn: 900,
  refreshToken: "rotated",
  refreshMaxAge: 1209600,
};

function request(cookie: string): Request {
  return new Request("https://admin.example.test/api/admin/team", { headers: { cookie } });
}

const expiredToken = () =>
  Response.json(
    { success: false, error: { code: "INVALID_TOKEN", message: "Expired" } },
    { status: 401 },
  );

describe("passThrough", () => {
  it("drops the backend's content-length, which describes the compressed body", async () => {
    const body = JSON.stringify({ success: true, data: { long: "x".repeat(2000) } });
    const upstream = new Response(body, {
      headers: { "content-type": "application/json", "content-length": "120" },
    });
    const response = passThrough(upstream);
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.text()).toBe(body);
  });

  it("marks event streams as unbuffered", () => {
    const response = passThrough(
      new Response("", { headers: { "content-type": "text/event-stream" } }),
    );
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    expect(response.headers.get("cache-control")).toBe("no-cache, no-transform");
  });
});

describe("callWithSession", () => {
  beforeEach(() => resetRefreshCache());

  it("refreshes once on 401 INVALID_TOKEN and retries with the new token", async () => {
    const fetch = vi
      .fn<typeof backendFetch>()
      .mockResolvedValueOnce(expiredToken())
      .mockResolvedValueOnce(Response.json({ success: true, data: [] }));
    const refresh = vi
      .fn<RefreshCall>()
      .mockResolvedValue({ ok: true, tokens, twoFactorSetupRequired: false });

    const result = await callWithSession(
      request("ppc_dash_access=old; ppc_dash_refresh=r1"),
      "/admin/team",
      {},
      { fetch, refresh },
    );

    expect(result.kind).toBe("response");
    expect(refresh).toHaveBeenCalledOnce();
    expect(fetch.mock.calls.map(([, call]) => call.accessToken)).toEqual(["old", "fresh"]);
    expect(result.kind === "response" && result.tokens).toEqual(tokens);
  });

  it("refreshes first when the access cookie has already expired", async () => {
    const fetch = vi
      .fn<typeof backendFetch>()
      .mockResolvedValue(Response.json({ success: true, data: [] }));
    const refresh = vi
      .fn<RefreshCall>()
      .mockResolvedValue({ ok: true, tokens, twoFactorSetupRequired: false });
    await callWithSession(request("ppc_dash_refresh=r1"), "/admin/team", {}, { fetch, refresh });
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[1].accessToken).toBe("fresh");
  });

  it("reports an expired session when the refresh fails", async () => {
    const fetch = vi.fn<typeof backendFetch>().mockResolvedValue(expiredToken());
    const refresh = vi
      .fn<RefreshCall>()
      .mockResolvedValue({ ok: false, code: "INVALID_REFRESH_TOKEN" });
    const result = await callWithSession(
      request("ppc_dash_access=old; ppc_dash_refresh=r1"),
      "/admin/team",
      {},
      { fetch, refresh },
    );
    expect(result).toEqual({ kind: "expired" });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("does not refresh for other 401s or for 403s", async () => {
    const refresh = vi.fn<RefreshCall>();
    const forbidden = Response.json(
      { success: false, error: { code: "PAGE_ACCESS_DENIED", message: "No" } },
      { status: 403 },
    );
    const fetch = vi.fn<typeof backendFetch>().mockResolvedValue(forbidden);
    const result = await callWithSession(
      request("ppc_dash_access=ok; ppc_dash_refresh=r1"),
      "/admin/team",
      {},
      { fetch, refresh },
    );
    expect(refresh).not.toHaveBeenCalled();
    expect(result.kind === "response" && result.upstream.status).toBe(403);
  });

  it("shares one refresh between parallel requests", async () => {
    const fetch = vi.fn<typeof backendFetch>((_path, call) =>
      Promise.resolve(
        call.accessToken === "fresh" ? Response.json({ success: true, data: [] }) : expiredToken(),
      ),
    );
    const refresh = vi.fn<RefreshCall>(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, tokens, twoFactorSetupRequired: false }), 10),
        ),
    );
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        callWithSession(
          request("ppc_dash_access=old; ppc_dash_refresh=same"),
          "/admin/team",
          {},
          { fetch, refresh },
        ),
      ),
    );
    expect(refresh).toHaveBeenCalledOnce();
    expect(results.every((r) => r.kind === "response" && r.upstream.status === 200)).toBe(true);
  });
});
