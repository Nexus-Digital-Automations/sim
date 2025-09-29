import type { NextConfig } from "next";

// Emergency build configuration - completely disables optimization to bypass hanging
const nextConfig: NextConfig = {
  // Disable all optimizations that cause hanging
  swcMinify: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable experimental features
  experimental: {
    esmExternals: false,
    webpackBuildWorker: false,
  },

  // Minimal webpack config - bypass all optimizations
  webpack: (config, { isServer, dev }) => {
    // Disable all optimizations
    if (!dev) {
      config.optimization.minimize = false;
      config.optimization.minimizer = [];
      config.optimization.splitChunks = false;
      config.optimization.runtimeChunk = false;
    }

    // Basic fallbacks for client-side
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        util: false,
      };
    }

    return config;
  },

  // Disable all performance optimizations
  poweredByHeader: false,
  generateEtags: false,
  compress: false,

  // Output standalone for simpler deployment
  output: "standalone",

  // Disable image optimization
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
