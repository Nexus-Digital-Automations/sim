import type { NextConfig } from 'next'
import { env } from './lib/env'
import { isProd } from './lib/environment'

const nextConfig: NextConfig = {
  // STATIC EXPORT TO BYPASS SSR OPTIMIZATION HANGS
  output: 'export',
  distDir: '.next',
  trailingSlash: true,
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Enable TypeScript and ESLint for production builds
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Disable experimental features to prevent optimization hangs
  experimental: {},

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

  // ANTI-HANG WEBPACK CONFIG - DISABLE PROBLEMATIC OPTIMIZATIONS
  webpack: (config, { dev, isServer }) => {
    // Disable all optimizations that cause hangs
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        // Completely disable minification to prevent hangs
        minimize: false,
        // Disable complex chunking strategies
        splitChunks: false,
        // Disable other optimization features that can cause hangs
        usedExports: false,
        sideEffects: false,
        providedExports: false,
        concatenateModules: false,
        flagIncludedChunks: false,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        mergeDuplicateChunks: false,
      }

      // Disable caching to prevent cache-related hangs
      config.cache = false

      // Performance settings to prevent size-based hangs
      config.performance = false
    }

    // Development optimizations
    if (dev) {
      config.watchOptions = {
        poll: false,
        ignored: ['**/node_modules/**', '**/.next/**'],
        aggregateTimeout: 300,
      }
    }

    return config
  },

  // Performance optimizations
  poweredByHeader: false,
  generateEtags: true,
  compress: true,
  trailingSlash: false,

  // Build performance optimization
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
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

// Temporarily disable Sentry during build to debug timeout issue
export default nextConfig
// export default isDev ? nextConfig : withSentryConfig(nextConfig, sentryConfig)
