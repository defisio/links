import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script, createContext } from "node:vm";

const source = readFileSync(
  new URL("../public/timer/sw.js", import.meta.url),
  "utf8",
);
function worker() {
  const listeners = {};
  const entries = new Map();
  const requested = [];
  const cache = {
    put: async (key, value) =>
      entries.set(
        typeof key === "string"
          ? new URL(key, "https://example.com").href
          : key.url,
        value,
      ),
    match: async (key) =>
      entries
        .get(
          typeof key === "string"
            ? new URL(key, "https://example.com").href
            : key.url,
        )
        ?.clone(),
  };
  let offline = false;
  const context = createContext({
    URL,
    Response,
    console,
    Set,
    Promise,
    self: {
      location: new URL("https://example.com/timer/sw.js"),
      addEventListener: (type, handler) => {
        listeners[type] = handler;
      },
      clients: { claim: async () => {} },
    },
    caches: {
      open: async () => cache,
      keys: async () => ["de-tabata-offline-v1", "other-app-cache"],
      delete: async () => true,
    },
    fetch: async (resource) => {
      if (offline) throw new Error("offline");
      const url = new URL(
        typeof resource === "string" ? resource : resource.url,
        "https://example.com",
      );
      requested.push(url.pathname);
      const body =
        url.pathname === "/timer/"
          ? '<html><link href="/_next/static/chunks/app.css" rel="stylesheet"><script src="/_next/static/chunks/app.js"></script></html>'
          : url.pathname.endsWith(".css")
            ? "@font-face{src:url(../media/font.woff2)}"
            : "asset";
      const response = new Response(body, { status: 200 });
      Object.defineProperty(response, "url", { value: url.href });
      return response;
    },
  });
  new Script(source).runInContext(context);
  return {
    listeners,
    requested,
    entries,
    goOffline: () => {
      offline = true;
    },
  };
}

test("offline install caches the exported shell, JS, CSS, fonts and installation icons", async () => {
  const w = worker();
  let installed;
  w.listeners.install({
    waitUntil: (promise) => {
      installed = promise;
    },
  });
  await installed;
  for (const pathname of [
    "/timer/",
    "/_next/static/chunks/app.js",
    "/_next/static/chunks/app.css",
    "/_next/static/media/font.woff2",
    "/timer/icon-512.png",
  ]) {
    assert.ok(w.requested.includes(pathname), `Missing ${pathname}`);
  }
  let readiness;
  let message;
  w.listeners.message({
    data: { type: "CHECK_OFFLINE" },
    ports: [
      {
        postMessage: (value) => {
          message = value;
        },
      },
    ],
    waitUntil: (promise) => {
      readiness = promise;
    },
  });
  await readiness;
  assert.equal(message.type, "OFFLINE_READY");
  w.goOffline();
  let response;
  w.listeners.fetch({
    request: {
      url: "https://example.com/timer/",
      method: "GET",
      mode: "navigate",
    },
    respondWith: (promise) => {
      response = promise;
    },
  });
  assert.match(await (await response).text(), /<html>/);
  w.listeners.fetch({
    request: {
      url: "https://example.com/_next/static/chunks/app.js",
      method: "GET",
      mode: "cors",
    },
    respondWith: (promise) => {
      response = promise;
    },
  });
  assert.equal(await (await response).text(), "asset");
});

test("worker ignores other sites and unrelated paths", () => {
  const w = worker();
  let intercepted = false;
  for (const url of [
    "https://example.com/links/",
    "https://other.example/timer/",
  ]) {
    w.listeners.fetch({
      request: { url, method: "GET", mode: "navigate" },
      respondWith: () => {
        intercepted = true;
      },
    });
  }
  assert.equal(intercepted, false);
});
