import { siteConfig } from "./lib/site-config.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: siteConfig.site.basePath,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
