/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/links", // Comentado para desenvolvimento local
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
