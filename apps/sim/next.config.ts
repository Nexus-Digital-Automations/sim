import type { NextConfig } from 'next'
import { env } from './lib/env'
import { isProd } from './lib/environment'

const nextConfig: NextConfig = {
  // ULTRA-MINIMAL CONFIG TO PREVENT BUILD HANGS
  output: 'standalone',

  // Disable ALL optimization features
  images: {
    unoptimized: true,
  },

  // Skip all validation during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable all experimental features
  experimental: {},

  // Minimal externals only
  serverExternalPackages: ['fs', 'path'],

  // SIMPLIFIED WEBPACK CONFIG - minimal changes only
  webpack: (config) => {
    // Only disable minimization in production to prevent hangs
    if (config.optimization) {
      config.optimization.minimize = false
    }

    return config
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
