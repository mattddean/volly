import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    dynamicIO: true,
    ppr: true,
    // disable client-side router cache
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

export default nextConfig;
