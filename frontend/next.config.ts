import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/acms',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/acms',
        basePath: false,
        permanent: false,
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
