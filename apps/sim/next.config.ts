import type { NextConfig } from 'next'
import { env } from './lib/env'
import { isProd } from './lib/environment'

const nextConfig: NextConfig = {
  // PRODUCTION-READY CONFIG FOR LARGE APPLICATIONS
  output: 'standalone',

  // Enable optimized images with performance tuning
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Enable TypeScript and ESLint for production builds
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Minimal experimental features for stability
  experimental: {
    // Optimize bundling for specific packages
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // External packages that should not be bundled
  serverExternalPackages: [
    'fs', 'path', 'crypto', 'stream', 'util', 'os',
    'sharp', 'canvas', 'better-sqlite3', 'fsevents',
    'mysql2', 'pg', 'sqlite3',
  ],

  // HYBRID OPTIMIZATION CONFIG - MAXIMUM PERFORMANCE WITHOUT HANGS
  webpack: (config, { dev, isServer }) => {
    // Enable intelligent optimization for production builds
    if (config.optimization && !dev) {
      config.optimization.minimize = true
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
      config.optimization.removeAvailableModules = false // Faster for large apps
      config.optimization.removeEmptyChunks = true
      config.optimization.mergeDuplicateChunks = true

      // ULTRA-EFFICIENT CHUNKING STRATEGY
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000, // Optimal chunk size for performance
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        automaticNameDelimiter: '-',
        cacheGroups: {
          // Framework chunk (React + Next.js)
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
            name: 'framework',
            chunks: 'all',
            priority: 50,
            enforce: true,
          },
          // Visualization libraries (heavy but frequently used)
          viz: {
            test: /[\\/]node_modules[\\/](three|@xyflow|reactflow|framer-motion|lenis)[\\/]/,
            name: 'visualization',
            chunks: 'all',
            priority: 40,
            reuseExistingChunk: true,
          },
          // UI component libraries
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|@chatscope)[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Utilities and smaller libraries
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name: 'lib',
            chunks: 'all',
            priority: 20,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          // Application code
          default: {
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      }

      // OPTIMIZED MINIFICATION - Use Next.js built-in SWC
      // Remove all existing minimizers and use Next.js default (which is SWC-based)
      config.optimization.minimizer = []
    }

    // Enhanced caching for large applications
    config.cache = {
      type: 'filesystem',
      cacheDirectory: require('path').resolve(process.cwd(), '.next/cache/webpack'),
      compression: 'gzip',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    }

    // Optimized module resolution for large codebases
    config.resolve = {
      ...config.resolve,
      symlinks: false,
      cacheWithContext: false,
      unsafeCache: true,
    }

    // Memory management for large applications
    config.performance = {
      hints: false, // Disable size warnings for large apps
      maxAssetSize: 1000000, // 1MB
      maxEntrypointSize: 1000000, // 1MB
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
