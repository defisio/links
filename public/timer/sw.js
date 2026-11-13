/* The worker caches the app, not a timer. Clock recovery uses persisted timestamps. */
const CACHE = "de-tabata-offline-v1-__BUILD_ID__";
const ROOT = new URL("./", self.location.href).pathname;
const BASE = new URL("../", self.location.href).pathname;
const APP = ROOT;
const READY = new URL("offline-ready", self.location.href).href;
async function store(cache, url) {
  const response = await fetch(url, { cache: "reload" });
  if (!response.ok) throw new Error("Resource unavailable");
  await cache.put(url, response.clone());
  return response;
}
async function prepareOffline() {
  const cache = await caches.open(CACHE);
  const response = await store(cache, APP);
  const html = await response.text();
  const assets = new Set([
    ROOT + "manifest.webmanifest",
    ROOT + "icon.svg",
    ROOT + "icon-192.png",
    ROOT + "icon-512.png",
    ROOT + "icon-maskable.png",
  ]);
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const url = new URL(
      match[1].replaceAll("&amp;", "&"),
      self.location.origin,
    );
    if (
      url.origin === self.location.origin &&
      url.pathname.startsWith(BASE + "_next/static/")
    )
      assets.add(url.href);
  }
  if (![...assets].some((url) => url.includes(".js")))
    throw new Error("App scripts missing");
  await Promise.all(
    [...assets].map(async (url) => {
      const asset = await store(cache, url);
      if (new URL(url, self.location.origin).pathname.endsWith(".css")) {
        const css = await asset.text();
        const fonts = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(
          (match) => new URL(match[1], asset.url),
        );
        await Promise.all(
          fonts
            .filter((font) => font.origin === self.location.origin)
            .map((font) => store(cache, font.href)),
        );
      }
    }),
  );
  await cache.put(READY, new Response("ready"));
}
self.addEventListener("install", (event) => {
  // No skipWaiting: an update must not replace an app being used for a workout.
  event.waitUntil(prepareOffline());
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      await Promise.all(
        (await caches.keys())
          .filter(
            (key) => key.startsWith("de-tabata-offline-") && key !== CACHE,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "CHECK_OFFLINE")
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE);
        if (await cache.match(READY))
          event.ports[0]?.postMessage({ type: "OFFLINE_READY" });
      })(),
    );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  if (
    !url.pathname.startsWith(ROOT) &&
    !url.pathname.startsWith(BASE + "_next/static/")
  )
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            await cache.put(APP, response.clone());
            return response;
          }
        } catch {
          /* Use the cached shell when offline. */
        }
        return (
          (await cache.match(APP)) ||
          new Response("Conecte-se uma vez para preparar seu Tabata offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      })(),
    );
  } else {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      })(),
    );
  }
});
