import type { MetadataRoute } from "next";
import { siteConfig, siteURL } from "@/lib/site-config.mjs";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteURL("/"), priority: 1 },
    ...(siteConfig.features.tabata ? [{ url: siteURL("/timer/"), priority: 0.8 }] : []),
  ];
}
