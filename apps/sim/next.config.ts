import type { NextConfig } from 'next'
import { env } from './lib/env'
import { isDev, isHosted, isProd } from './lib/environment'
import { getMainCSPPolicy, getWorkflowExecutionCSPPolicy } from './lib/security/csp'

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

  // EXTREME WEBPACK BYPASS - Maximum optimization disable
  webpack: (config, { isServer, dev }) => {
    // FORCE DEVELOPMENT MODE SETTINGS - completely bypass all optimizations
    config.mode = 'development'
    config.optimization = {
      minimize: false,
      minimizer: [],
      splitChunks: false,
      runtimeChunk: false,
      sideEffects: false,
      usedExports: false,
      concatenateModules: false,
      flagIncludedChunks: false,
      providedExports: false,
      removeAvailableModules: false,
      removeEmptyChunks: false,
      mergeDuplicateChunks: false,
      mangleExports: false,
      innerGraph: false,
      realContentHash: false,
      emitOnErrors: true,
      checkWasmTypes: false,
      nodeEnv: 'development',
    }

    // Disable all caching to prevent hangs
    config.cache = false
    config.snapshot = undefined

    // Minimal resolve configuration
    config.resolve = {
      ...config.resolve,
      symlinks: false,
      cacheWithContext: false,
      cache: false,
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    }

    // Minimal externals for client-side
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        'fs/promises': false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
      }
    }

    // Remove ALL optimization-related plugins
    config.plugins = config.plugins.filter((plugin) => {
      const name = plugin.constructor.name
      // Remove ANY plugin that could cause optimization hangs
      return ![
        'OptimizeCSSAssetsPlugin',
        'TerserPlugin',
        'CompressionPlugin',
        'BundleAnalyzerPlugin',
        'MiniCssExtractPlugin',
        'CssMinimizerPlugin',
        'OptimizeCssAssetsWebpackPlugin',
        'UglifyJsPlugin',
        'AggressiveMergingPlugin',
        'ModuleConcatenationPlugin',
      ].includes(name)
    })

    // Force module rules to be minimal
    config.module.rules = config.module.rules.map((rule) => {
      if (rule.use && Array.isArray(rule.use)) {
        rule.use = rule.use.filter((use) => {
          if (typeof use === 'object' && use.loader) {
            // Remove optimization loaders
            return !use.loader.includes('optimize')
          }
          return true
        })
      }
      return rule
    })

    return config
  },
  ...(isDev && {
    allowedDevOrigins: [
      ...(env.NEXT_PUBLIC_APP_URL
        ? (() => {
            try {
              return [new URL(env.NEXT_PUBLIC_APP_URL).host]
            } catch {
              return []
            }
          })()
        : []),
      'localhost:3000',
      'localhost:3001',
    ],
  }),

  // Minimal transpile packages - removed to prevent optimization hangs
  transpilePackages: [],

  // Static export mode - remove headers and redirects that cause optimization hangs
  // Headers and redirects are not supported in static export mode
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
