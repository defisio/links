// @ts-check
import config from "../site.config.json" with { type: "json" };
import { parseSiteConfig } from "./site-schema.mjs";

export const siteConfig = parseSiteConfig(config);

/** Paths in configuration are relative to public/, without the deployment prefix.
 * @param {string} path
 * @param {typeof siteConfig} config
 */
export function assetPath(path, config = siteConfig) {
  if (/^(https?:\/\/|mailto:|tel:)/.test(path)) return path;
  return `${config.site.basePath}${path.startsWith("/") ? path : `/${path}`}`;
}

/** @param {string} path @param {typeof siteConfig} config */
export function siteURL(path = "/", config = siteConfig) {
  return new URL(assetPath(path, config), config.site.origin).href;
}

/** @param {typeof siteConfig} config */
export function getSiteLinks(config = siteConfig) {
  return config.links.filter((link) =>
    (link.feature !== "tabata" || config.features.tabata) &&
    (config.features.tabata || !/^\/timer(?:\/|$)/.test(link.href)),
  );
}

/** Keep the existing id when updating a deployed site: it owns browser data and locks.
 * @param {typeof siteConfig} config
 */
export function getTabataKeys(config = siteConfig) {
  const prefix = `${config.id}.tabata`;
  return {
    storage: `${prefix}.v1`, dataLock: `${prefix}-data`, audioLock: `${prefix}-audio`,
    soundtrack: `${prefix}-soundtrack`, alerts: `${prefix}.alerts`,
  };
}
