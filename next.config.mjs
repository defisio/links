/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/links",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
