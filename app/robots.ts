import type { MetadataRoute } from "next";
import { siteURL } from "@/lib/site-config.mjs";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: siteURL("/sitemap.xml") };
}
