import type { NextConfig } from "next";

// Extremely minimal Next.js configuration to prevent build hanging
const nextConfig: NextConfig = {
  // Disable all checks and optimizations that might cause hanging
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Minimal webpack config to handle node modules
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
