import type { NextConfig } from "next";
import { env } from "./lib/env";
import { isProd } from "./lib/environment";

const nextConfig: NextConfig = {
  // Removed static export to fix build hanging issue

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

  // Enable TypeScript and ESLint for production builds
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Temporarily disable experimental features to fix build timeout
  experimental: {
    // All experimental features disabled to prevent optimization hangs
  },

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

  // Custom webpack configuration to help with parlant-chat-react resolution
  webpack: (config, { isServer }) => {
    // Ensure parlant-chat-react is properly resolved
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
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

// Temporarily disable SENTRY during build to debug timeout issue
export default nextConfig;
// export default isDev ? nextConfig : withSentryConfig(nextConfig, sentryConfig)
