import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script, createContext } from "node:vm";
import nextConfig from "../next.config.mjs";
import { siteConfig, siteURL, getSiteLinks } from "../lib/site-config.mjs";
import { getTimerManifest } from "../lib/site-presentation.mjs";

// Exercise the real exported shell/assets in a worker harness; this is not a browser test.
const origin = "https://tabata.test";
const manifest = JSON.parse(
  await readFile("out/timer/manifest.webmanifest", "utf8"),
);
const basePath = nextConfig.basePath || "";
const timerPath = `${basePath}/timer/`;
const appURL = origin + timerPath;
const html = await readFile("out/timer/index.html", "utf8");
const home = await readFile("out/index.html", "utf8");
const source = await readFile("out/timer/sw.js", "utf8");
if (getSiteLinks().some((link) => link.href === "/timer/"))
  assert.ok(home.includes(`href="${timerPath}"`));
assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
assert.ok(
  html.includes(`canonical" href="${siteURL("/timer/")}"`),
);
assert.deepEqual(manifest, getTimerManifest());
assert.ok(html.includes(siteConfig.timer.name));
assert.ok(
  !source.includes("__BUILD_ID__"),
  "Worker needs a build-specific cache",
);
assert.equal(manifest.id, timerPath);
assert.equal(manifest.start_url, timerPath);
assert.equal(manifest.scope, timerPath);
assert.ok(html.includes(`href="${timerPath}manifest.webmanifest"`));
const entries = new Map();
const listeners = {};
const fetched = new Set();
let offline = false;
const keyOf = (key) =>
  new URL(typeof key === "string" ? key : key.url, origin).href;
const cache = {
  put: async (key, response) => entries.set(keyOf(key), response),
  match: async (key) => entries.get(keyOf(key))?.clone(),
};
const context = createContext({
  URL,
  Response,
  console,
  Set,
  Promise,
  self: {
    location: new URL(appURL + "sw.js"),
    clients: { claim: async () => {} },
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
  },
  caches: {
    open: async () => cache,
    keys: async () => [],
    delete: async () => true,
  },
  fetch: async (resource) => {
    if (offline) throw new Error("offline");
    const url = new URL(
      typeof resource === "string" ? resource : resource.url,
      origin,
    );
    assert.equal(url.origin, origin);
    assert.ok(
      url.pathname.startsWith(`${basePath}/`),
      "Resources must respect the deployment prefix",
    );
    let path = "out" + url.pathname.slice(basePath.length);
    if (path.endsWith("/")) path += "index.html";
    const contents = await readFile(path);
    fetched.add(url.href);
    const response = new Response(contents);
    Object.defineProperty(response, "url", { value: url.href });
    return response;
  },
});
new Script(source).runInContext(context);
let installing;
listeners.install({
  waitUntil: (promise) => {
    installing = promise;
  },
});
await installing;
assert.ok(
  [...fetched].some((url) => url.endsWith(".woff2")),
  "Fonts must be cached",
);
assert.ok(
  [...fetched].some((url) => url.endsWith(".js")),
  "Scripts must be cached",
);
assert.ok(entries.has(appURL + "offline-ready"));
offline = true;
let navigation;
listeners.fetch({
  request: { url: appURL, method: "GET", mode: "navigate" },
  respondWith: (promise) => {
    navigation = promise;
  },
});
assert.match(await (await navigation).text(), /Seu tempo/);
for (const url of fetched) {
  if (url === appURL) continue;
  let response;
  listeners.fetch({
    request: { url, method: "GET", mode: "cors" },
    respondWith: (promise) => {
      response = promise;
    },
  });
  assert.equal((await response).status, 200, url);
}
console.log(
  `Export verified: ${timerPath}, unique canonical, install manifest and ${fetched.size} resources available in the offline worker harness.`,
);
