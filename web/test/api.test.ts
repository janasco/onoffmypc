import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { api, apiReq } from "../src/lib/api.ts";

const realFetch = globalThis.fetch;

/** Replace fetch with a stub and return a recorder of what it was called with. */
function stubFetch(responder: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return responder(url, init);
  }) as typeof globalThis.fetch;
  return calls;
}

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  globalThis.fetch = realFetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("returns the parsed body on success", async () => {
  stubFetch(() => ok({ email: "a@b.c", email_verified: true }));
  const res = await api.me<{ email: string }>();
  assert.equal(res.error, undefined);
  assert.equal(res.data?.email, "a@b.c");
});

test("short-circuits a 401 without reading the body", async () => {
  // A 401 must never be treated as data, and the body is not consumed.
  const calls = stubFetch(() => new Response("nope", { status: 401 }));
  const res = await api.me();
  assert.equal(res.status, 401);
  assert.equal(res.error, "unauthorized");
  assert.equal(res.data, undefined);
  assert.equal(calls.length, 1);
});

test("surfaces the server's error message on a non-2xx response", async () => {
  stubFetch(() => ok({ error: "invalid pairing code" }, 400));
  const res = await api.pairCode("device-1");
  assert.equal(res.error, "invalid pairing code");
  assert.equal(res.status, 400);
});

test("falls back to a generic message when the error body has no error field", async () => {
  stubFetch(() => ok({ code: "unknown_thing" }, 500));
  const res = await api.devices();
  assert.equal(res.error, "request failed");
  assert.equal(res.status, 500);
  assert.equal(res.code, "unknown_thing");
});

test("tolerates a non-JSON body instead of throwing", async () => {
  // A proxy or gateway may return HTML; parsing must not blow up the caller.
  stubFetch(() => new Response("<html>502</html>", { status: 502 }));
  const res = await api.devices();
  assert.equal(res.error, "request failed");
  assert.equal(res.status, 502);
});

test("maps a transport failure to a network error", async () => {
  stubFetch(() => {
    throw new TypeError("fetch failed");
  });
  const res = await api.devices();
  assert.equal(res.error, "network error");
  assert.equal(res.status, undefined);
});

test("sends credentials and a JSON body for mutations, and omits an empty body", async () => {
  const calls = stubFetch(() => ok({ id: "d1", token: "t1" }));

  await api.addDevice("Kitchen PC");
  assert.equal(calls[0].url, "https://api.onoffmypc.com/devices");
  const init = calls[0].init as RequestInit;
  assert.equal(init.method, "POST");
  assert.equal(init.body, JSON.stringify({ name: "Kitchen PC" }));
  assert.equal((init.headers as Record<string, string>)["Content-Type"], "application/json");
  assert.equal(init.credentials, "include");

  await api.devices();
  assert.equal(calls[1].init?.body, undefined);
});

test("url-encodes interpolated path parameters", async () => {
  // An id containing a slash or query character must not escape its segment.
  const calls = stubFetch(() => ok([]));
  await api.verifyEmail("tok/en?x=1");
  assert.equal(calls[0].url, "https://api.onoffmypc.com/auth/verify-email?token=tok%2Fen%3Fx%3D1");
});

test("apiReq is callable directly with an explicit generic", async () => {
  stubFetch(() => ok({ ok: true }));
  const res = await apiReq<{ ok: boolean }>("GET", "/health");
  assert.equal(res.data?.ok, true);
});
