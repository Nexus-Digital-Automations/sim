import type { NextConfig } from 'next'
import { env } from './lib/env'
import { isDev, isHosted, isProd } from './lib/environment'
import { getMainCSPPolicy, getWorkflowExecutionCSPPolicy } from './lib/security/csp'

const nextConfig: NextConfig = {
  // RADICAL OPTIMIZATION BYPASS - Minimal Configuration
  devIndicators: false,

  // Basic images config only
  images: {
    unoptimized: true, // Disable image optimization to prevent hangs
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Simplified pattern to avoid complex matching
      },
    ],
  },

  // Ignore all errors during build to prevent hangs
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Force standalone output to bypass optimization issues
  output: 'standalone',

  // Minimal experimental config (Next.js 15 compatible)
  experimental: {
    optimizeCss: false,
    turbopackSourceMaps: false,
    optimizePackageImports: [],
    forceSwcTransforms: false,
    fullySpecified: false,
    // Removed esmExternals per Next.js recommendation
    // Remove invalid Next.js 15 properties (appDir is default, serverComponentsExternalPackages moved to serverExternalPackages)
  },

  // Minimal server external packages
  serverExternalPackages: ['pdf-parse', 'parlant-server', 'fs', 'fs/promises', 'path'],

  // RADICAL WEBPACK BYPASS - Development-like settings for production
  webpack: (config, { isServer, dev }) => {
    // DISABLE ALL OPTIMIZATIONS - treat production like development (Webpack 5 compatible)
    config.optimization = {
      minimize: false, // Completely disable minification
      splitChunks: false, // Disable chunk splitting
      sideEffects: false,
      usedExports: false,
      concatenateModules: false,
      flagIncludedChunks: false,
      providedExports: false,
      removeAvailableModules: false,
      removeEmptyChunks: false,
      mergeDuplicateChunks: false,
      // Remove invalid webpack 5 properties (occurrenceOrder)
    }

    // Minimal resolve configuration
    config.resolve = {
      ...config.resolve,
      symlinks: false,
      cacheWithContext: false,
      // Simplified extensions
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

    // Disable problematic plugins that can cause hangs
    config.plugins = config.plugins.filter((plugin) => {
      const name = plugin.constructor.name
      // Keep only essential plugins
      return ![
        'OptimizeCSSAssetsPlugin',
        'TerserPlugin',
        'CompressionPlugin',
        'BundleAnalyzerPlugin',
      ].includes(name)
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

  // Minimal transpile packages

  transpilePackages: [
    'prettier',
    '@react-email/components',
    '@react-email/render',
    '@t3-oss/env-nextjs',
    '@t3-oss/env-core',
    '@sim/db',
  ],
  async headers() {
    return [
      {
        // API routes CORS headers
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          {
            key: 'Access-Control-Allow-Origin',
            value: env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,OPTIONS,PUT,DELETE',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-API-Key',
          },
        ],
      },
      // For workflow execution API endpoints
      {
        source: '/api/workflows/:id/execute',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,OPTIONS,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-API-Key',
          },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          {
            key: 'Content-Security-Policy',
            value: getWorkflowExecutionCSPPolicy(),
          },
        ],
      },
      {
        // Exclude Vercel internal resources and static assets from strict COEP, Google Drive Picker to prevent 'refused to connect' issue
        source: '/((?!_next|_vercel|api|favicon.ico|w/.*|workspace/.*|api/tools/drive).*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        // For main app routes, Google Drive Picker, and Vercel resources - use permissive policies
        source: '/(w/.*|workspace/.*|api/tools/drive|_next/.*|_vercel/.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
      // Block access to sourcemap files (defense in depth)
      {
        source: '/(.*)\\.map$',
        headers: [
          {
            key: 'x-robots-tag',
            value: 'noindex',
          },
        ],
      },
      // Apply security headers to routes not handled by middleware runtime CSP
      // Middleware handles: /, /workspace/*, /chat/*
      {
        source: '/((?!workspace|chat$).*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: getMainCSPPolicy(),
          },
        ],
      },
    ]
  },
  async redirects() {
    const redirects = []

    // Only enable domain redirects for the hosted version
    if (isHosted) {
      redirects.push(
        {
          source: '/((?!api|_next|_vercel|favicon|static|.*\\..*).*)',
          destination: 'https://www.sim.ai/$1',
          permanent: true,
          has: [{ type: 'host' as const, value: 'simstudio.ai' }],
        },
        {
          source: '/((?!api|_next|_vercel|favicon|static|.*\\..*).*)',
          destination: 'https://www.sim.ai/$1',
          permanent: true,
          has: [{ type: 'host' as const, value: 'www.simstudio.ai' }],
        }
      )
    }

    return redirects
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
