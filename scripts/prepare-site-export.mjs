import { readFile, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assetPath, siteConfig } from "../lib/site-config.mjs";

/** @param {string} directory @param {string} buildId @param {typeof siteConfig} config */
export async function prepareSiteExport(directory, buildId, config = siteConfig) {
  if (!config.features.tabata) {
    // Static assets from public/ must also disappear when the feature is disabled.
    await rm(resolve(directory, "timer"), { recursive: true, force: true });
    await rm(resolve(directory, "timer.html"), { force: true });
    await rm(resolve(directory, "timer.txt"), { force: true });
    return;
  }
  const path = resolve(directory, "timer/sw.js");
  const source = await readFile(path, "utf8");
  if (!source.includes("__BUILD_ID__")) throw new Error("Tabata worker build marker is missing");
  const iconMarker = "/*__SITE_ICON_PATHS__*/ []";
  if (!source.includes(iconMarker)) throw new Error("Tabata worker icon marker is missing");
  const icons = Object.values(config.timer.icons).map((icon) => assetPath(icon, config));
  await writeFile(path, source.replaceAll("__BUILD_ID__", buildId).replace(iconMarker, JSON.stringify(icons)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const buildId = (await readFile(".next/BUILD_ID", "utf8")).trim();
  await prepareSiteExport("out", buildId);
  console.log("Exportação do site preparada para publicação.");
}
