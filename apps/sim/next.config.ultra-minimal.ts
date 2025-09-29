import type { NextConfig } from "next";

// Ultra minimal config for emergency build
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Single webpack modification
  webpack: (config) => {
    // Ensure we don't process node modules that cause issues
    config.externals = config.externals || [];
    if (!Array.isArray(config.externals)) {
      config.externals = [config.externals];
    }
    config.externals.push({
      sharp: "commonjs sharp",
      canvas: "commonjs canvas",
      "better-sqlite3": "commonjs better-sqlite3",
    });
    return config;
  },
};

export default nextConfig;
