import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { siteConfig } from "../lib/site-config.mjs";

const root = resolve("out");
const basePath = siteConfig.site.basePath;
const port = Number(process.env.PORT || 3000);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};
await stat(resolve(root, "index.html")).catch(() => {
  throw new Error("Execute npm run build antes de iniciar a versão exportada.");
});
const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405);
    response.end();
    return;
  }
  try {
    const url = new URL(request.url || "/", "http://localhost");
    const pathname = decodeURIComponent(url.pathname);
    if (basePath && pathname === basePath) {
      response.writeHead(308, { Location: `${basePath}/${url.search}` });
      response.end();
      return;
    }
    if (!pathname.startsWith(`${basePath}/`)) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    let file = resolve(root, "." + pathname.slice(basePath.length));
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    if ((await stat(file)).isDirectory()) {
      if (!pathname.endsWith("/")) {
        response.writeHead(308, { Location: url.pathname + "/" + url.search });
        response.end();
        return;
      }
      file = resolve(file, "index.html");
    }
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": "no-cache",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Site: http://localhost:${port}${basePath}/`);
  if (siteConfig.features.tabata)
    console.log(`Tabata: http://localhost:${port}${basePath}/timer/`);
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
