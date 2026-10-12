import { beforeEach, describe, expect, it, vi } from "vitest";

import { refreshSession, resetRefreshCache, type RefreshOutcome } from "@/lib/server/refresh";

const ok: RefreshOutcome = {
  ok: true,
  twoFactorSetupRequired: false,
  tokens: {
    accessToken: "new-access",
    accessExpiresIn: 900,
    refreshToken: "new-refresh",
    refreshMaxAge: 1209600,
  },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("refreshSession (single flight)", () => {
  beforeEach(() => resetRefreshCache());

  it("calls the backend once for parallel requests with the same refresh token", async () => {
    const pending = deferred<RefreshOutcome>();
    const call = vi.fn(() => pending.promise);
    const results = Promise.all(
      Array.from({ length: 5 }, () => refreshSession("old-refresh", new Headers(), call)),
    );
    pending.resolve(ok);
    const outcomes = await results;
    expect(call).toHaveBeenCalledTimes(1);
    expect(outcomes.every((o) => o.ok && o.tokens.accessToken === "new-access")).toBe(true);
  });

  it("reuses a settled result for 25 seconds, then refreshes again", async () => {
    let clock = 1_000_000;
    const now = () => clock;
    const call = vi.fn(() => Promise.resolve(ok));
    await refreshSession("old-refresh", new Headers(), call, now);
    clock += 24_000;
    await refreshSession("old-refresh", new Headers(), call, now);
    expect(call).toHaveBeenCalledTimes(1);
    clock += 2_000;
    await refreshSession("old-refresh", new Headers(), call, now);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("does not cache failures, so the next attempt calls the backend again", async () => {
    const call = vi
      .fn<(token: string, incoming: Headers) => Promise<RefreshOutcome>>()
      .mockResolvedValueOnce({ ok: false, code: "INVALID_REFRESH_TOKEN" })
      .mockResolvedValueOnce(ok);
    expect((await refreshSession("t", new Headers(), call)).ok).toBe(false);
    expect((await refreshSession("t", new Headers(), call)).ok).toBe(true);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("turns a network failure into BACKEND_UNAVAILABLE", async () => {
    const call = vi.fn(() => Promise.reject(new Error("connect ECONNREFUSED")));
    expect(await refreshSession("t", new Headers(), call)).toEqual({
      ok: false,
      code: "BACKEND_UNAVAILABLE",
    });
  });

  it("keeps different refresh tokens apart", async () => {
    const call = vi.fn(() => Promise.resolve(ok));
    await Promise.all([
      refreshSession("a", new Headers(), call),
      refreshSession("b", new Headers(), call),
    ]);
    expect(call).toHaveBeenCalledTimes(2);
  });
});
