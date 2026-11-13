import { readFile, writeFile } from "node:fs/promises";
import nextConfig from "../next.config.mjs";

// Each export gets an isolated cache. Waiting workers do not interrupt open workouts.
const buildId = (await readFile(".next/BUILD_ID", "utf8")).trim();
const basePath = nextConfig.basePath || "";
const path = "out/timer/sw.js";
const source = await readFile(path, "utf8");
if (!source.includes("__BUILD_ID__"))
  throw new Error("Tabata worker build marker is missing");
await writeFile(path, source.replaceAll("__BUILD_ID__", buildId));
const manifestPath = "out/timer/manifest.webmanifest";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.id = manifest.start_url = manifest.scope = `${basePath}/timer/`;
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
const sitemapPath = "out/sitemap.xml";
const sitemap = await readFile(sitemapPath, "utf8");
await writeFile(
  sitemapPath,
  sitemap.replace(
    "https://defisio.github.io/timer/",
    `https://defisio.github.io${basePath}/timer/`,
  ),
);
console.log("Tabata offline worker prepared for this export.");
