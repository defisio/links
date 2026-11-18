import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { assetPath, getSiteLinks, siteConfig, siteURL } from "../lib/site-config.mjs";
import { getStructuredData } from "../lib/site-presentation.mjs";

const html = await readFile("out/index.html", "utf8");
const dom = new JSDOM(html);
const document = dom.window.document;
assert.equal(document.querySelector("h1")?.textContent.trim(), siteConfig.profile.name);
assert.equal(document.title, siteConfig.seo.title);
assert.equal(document.documentElement.lang, siteConfig.site.language);
assert.equal(document.querySelector('meta[name="description"]')?.content, siteConfig.seo.description);
assert.equal(document.querySelector('link[rel="canonical"]')?.href, siteURL("/"));
assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1);
assert.equal(document.documentElement.style.getPropertyValue("--primary"), siteConfig.theme.home.primary);
const links = [...document.querySelectorAll('nav[aria-label="Links de contato e redes sociais"] a')];
assert.deepEqual(links.map((link) => link.getAttribute("href")), getSiteLinks().map((link) => assetPath(link.href)));
assert.deepEqual([...document.querySelectorAll('script[type="application/ld+json"]')].map((node) => JSON.parse(node.textContent)),
  JSON.parse(JSON.stringify(getStructuredData())));
for (const image of [siteConfig.assets.avatar, siteConfig.assets.logo].filter(Boolean)) {
  assert.ok([...document.querySelectorAll("img")].some((node) => node.getAttribute("src") === assetPath(image.src)));
}
for (const path of [siteConfig.assets.avatar.src, siteConfig.assets.logo?.src, siteConfig.assets.favicon, siteConfig.assets.socialImage.src].filter(Boolean)) {
  await access(resolve("out", `.${path}`));
}
const robots = await readFile("out/robots.txt", "utf8");
assert.ok(robots.includes(`Sitemap: ${siteURL("/sitemap.xml")}`));
const sitemap = await readFile("out/sitemap.xml", "utf8");
assert.ok(sitemap.includes(`<loc>${siteURL("/")}</loc>`));
if (siteConfig.features.tabata) {
  assert.ok(sitemap.includes(`<loc>${siteURL("/timer/")}</loc>`));
  await import("./check-tabata-export.mjs");
} else {
  assert.ok(!sitemap.includes(siteURL("/timer/")));
  assert.equal(await access("out/timer").then(() => true, () => false), false);
  assert.equal(await access("out/timer.html").then(() => true, () => false), false);
}
dom.window.close();
console.log(`Site verificado: ${siteConfig.profile.name}, ${siteURL("/")}, identidade, links, metadados e recursos configurados.`);
