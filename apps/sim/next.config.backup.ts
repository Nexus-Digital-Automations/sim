import type { NextConfig } from "next";
import { env } from "./lib/env";
import { isProd } from "./lib/environment";

const nextConfig: NextConfig = {
  // Enable optimized images with basic configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ["image/webp", "image/avif"],
  },

  // Disable TypeScript and ESLint for faster builds
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Remove experimental features to prevent build hangs
  // experimental: {
  //   webpackBuildWorker: false,
  //   largePageDataBytes: 128 * 1000,
  // },

  // External packages that should not be bundled
  serverExternalPackages: [
    "fs",
    "path",
    "crypto",
    "stream",
    "util",
    "os",
    "sharp",
    "canvas",
    "better-sqlite3",
    "fsevents",
    "mysql2",
    "pg",
    "sqlite3",
  ],

  // Minimal webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
      };
    }
    return config;
  },

  // Performance optimizations
  poweredByHeader: false,
  generateEtags: true,
  compress: true,
  trailingSlash: false,
};

const sentryConfig = {
  silent: true,
  org: env.SENTRY_ORG || "",
  project: env.SENTRY_PROJECT || "",
  authToken: env.SENTRY_AUTH_TOKEN || undefined,
  disableSourceMapUpload: !isProd,
  autoInstrumentServerFunctions: isProd,
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludePerformanceMonitoring: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },
};

// Export optimized configuration for modular architecture
export default nextConfig;
// export default isDev ? nextConfig : withSentryConfig(nextConfig, sentryConfig)
