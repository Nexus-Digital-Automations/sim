import type { NextConfig } from 'next'
import { env } from './lib/env'
import { isProd } from './lib/environment'

const nextConfig: NextConfig = {
  // Standard production configuration with full optimization enabled
  output: 'standalone',

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

  // Use default experimental features (Next.js handles these safely)
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
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

  // Let Next.js handle webpack optimization completely
  // No custom webpack configuration

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

// Temporarily disable Sentry during build to debug timeout issue
export default nextConfig
// export default isDev ? nextConfig : withSentryConfig(nextConfig, sentryConfig)
