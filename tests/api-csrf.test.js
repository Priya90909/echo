import { beforeEach, afterEach, it, expect, vi } from "vitest";
const tokenA = "a".repeat(64),
  tokenB = "b".repeat(64);
const reply = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());
it("recovers from a stale tab token with one safe retry", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(reply({ token: tokenA }))
    .mockResolvedValueOnce(reply({ saved: true }))
    .mockResolvedValueOnce(reply({ code: "CSRF_INVALID" }, 403))
    .mockResolvedValueOnce(reply({ token: tokenB }))
    .mockResolvedValueOnce(reply({ saved: true }));
  vi.stubGlobal("fetch", fetch);
  const { api } = await import("../apps/web/src/api.js");
  await api("/auth/login", { method: "POST", body: "{}" });
  await expect(
    api("/auth/register", { method: "POST", body: "{}" }),
  ).resolves.toEqual({ saved: true });
  expect(fetch).toHaveBeenCalledTimes(5);
  expect(fetch.mock.calls[4][1].headers.get("x-csrf-token")).toBe(tokenB);
  expect(fetch.mock.calls[3][1].cache).toBe("no-store");
});
it("shares token acquisition between simultaneous mutations", async () => {
  const fetch = vi
    .fn()
    .mockImplementation(async (path) =>
      path === "/api/auth/csrf"
        ? reply({ token: tokenA })
        : reply({ saved: true }),
    );
  vi.stubGlobal("fetch", fetch);
  const { api } = await import("../apps/web/src/api.js");
  await Promise.all([
    api("/likes/a", { method: "PUT" }),
    api("/likes/b", { method: "PUT" }),
  ]);
  expect(
    fetch.mock.calls.filter(([path]) => path === "/api/auth/csrf"),
  ).toHaveLength(1);
});
it("does not retry an authorization denial", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(reply({ token: tokenA }))
    .mockResolvedValueOnce(reply({ error: "Not permitted" }, 403));
  vi.stubGlobal("fetch", fetch);
  const { api } = await import("../apps/web/src/api.js");
  await expect(api("/admin", { method: "POST" })).rejects.toThrow(
    "Not permitted",
  );
  expect(fetch).toHaveBeenCalledTimes(2);
});
