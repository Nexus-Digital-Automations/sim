import type { NextConfig } from 'next'
import { env } from './lib/env'
import { isProd } from './lib/environment'

const nextConfig: NextConfig = {
  // Enable optimized images with basic configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Enable TypeScript and ESLint for production builds
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Simplified experimental features to prevent build hangs
  experimental: {
    // Enable webpack build cache for faster rebuilds
    webpackBuildWorker: true,
    // Optimize large page chunks
    largePageDataBytes: 128 * 1000, // 128KB
  },

  // External packages that should not be bundled
  serverExternalPackages: [
    'fs',
    'path',
    'crypto',
    'stream',
    'util',
    'os',
    'sharp',
    'canvas',
    'better-sqlite3',
    'fsevents',
    'mysql2',
    'pg',
    'sqlite3',
  ],

  // Simplified webpack configuration to prevent hanging
  webpack: (config, { isServer }) => {
    // Ensure parlant-chat-react is properly resolved
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      }
    }

    // Basic resolve aliases (keep essential ones only)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@icons': './components/icons',
      '@executor/core': './executor/core',
      '@stores/copilot': './stores/copilot',
    }

    return config
  },

  // Performance optimizations
  poweredByHeader: false,
  generateEtags: true,
  compress: true,
  trailingSlash: false,
}

const sentryConfig = {
  silent: true,
  org: env.SENTRY_ORG || '',
  project: env.SENTRY_PROJECT || '',
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
}

// Export optimized configuration for modular architecture
export default nextConfig
// export default isDev ? nextConfig : withSentryConfig(nextConfig, sentryConfig)
