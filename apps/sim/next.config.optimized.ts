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

  // Enable optimized experimental features for modular architecture
  experimental: {
    // Enable modern bundling optimizations
    turbo: {
      rules: {
        // Optimize icon loading with dynamic imports
        '*.icons.tsx': {
          loaders: ['@next/font/local'],
          options: {
            src: './components/icons',
            display: 'swap',
          },
        },
      },
    },
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

  // Optimized webpack configuration for modular architecture
  webpack: (config, { isServer, dev }) => {
    // Ensure parlant-chat-react is properly resolved
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      }
    }

    // Optimize modular architecture with strategic chunking
    if (!isServer && !dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,

        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Icons: Split into category-based chunks for tree shaking
            iconModules: {
              test: /\/components\/icons\//,
              name: 'icons',
              chunks: 'all',
              enforce: true,
              priority: 100,
            },

            // User Input: Split refactored modular components
            userInputComponents: {
              test: /\/user-input\/components\//,
              name: 'user-input-components',
              chunks: 'all',
              enforce: true,
              priority: 90,
            },

            // Executor: Split modular executor components
            executorCore: {
              test: /\/executor\/core\//,
              name: 'executor-core',
              chunks: 'all',
              enforce: true,
              priority: 85,
            },

            // Store modules: Split by domain
            chatStore: {
              test: /\/stores\/copilot\/chat-store\./,
              name: 'chat-store',
              chunks: 'all',
              enforce: true,
              priority: 80,
            },

            toolStore: {
              test: /\/stores\/copilot\/tool-store\./,
              name: 'tool-store',
              chunks: 'all',
              enforce: true,
              priority: 80,
            },

            // Legacy large files (maintain existing optimization)
            legacyLargeFiles: {
              test: /\/(components\/icons\.tsx|.*user-input\.tsx|stores\/.*store\.ts|executor\/index\.ts)$/,
              name: 'legacy-large-files',
              chunks: 'all',
              enforce: true,
              priority: 70,
            },

            // Vendor libraries
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 60,
            },

            // Common utilities
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 50,
            },
          },
        },

        // Enable module concatenation for better tree shaking
        concatenateModules: true,
        usedExports: true,
        providedExports: true,
        sideEffects: false,
      }

      // Add module rules for optimized loading
      config.module.rules.push(
        // Dynamic icon loading optimization
        {
          test: /\/components\/icons\/.*\.tsx$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['next/babel'],
                plugins: [
                  // Enable dynamic import transformation
                  '@babel/plugin-syntax-dynamic-import',
                ],
                cacheDirectory: true,
                compact: true,
              },
            },
          ],
        },

        // Modular component optimization
        {
          test: /\/user-input\/components\/.*\.tsx$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['next/babel'],
                cacheDirectory: true,
                compact: true,
              },
            },
          ],
        },

        // Executor core optimization
        {
          test: /\/executor\/core\/.*\.ts$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['next/babel'],
                cacheDirectory: true,
                compact: true,
              },
            },
          ],
        },

        // Store optimization
        {
          test: /\/stores\/copilot\/.*-store\.ts$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['next/babel'],
                cacheDirectory: true,
                compact: true,
              },
            },
          ],
        }
      )

      // Add resolve aliases for better module resolution
      config.resolve.alias = {
        ...config.resolve.alias,
        '@icons': './components/icons',
        '@icons/ui': './components/icons/ui-icons',
        '@icons/action': './components/icons/action-icons',
        '@icons/navigation': './components/icons/navigation-icons',
        '@executor/core': './executor/core',
        '@stores/copilot': './stores/copilot',
      }
    }

    // Development optimizations
    if (dev) {
      // Enable fast refresh for modular components
      config.module.rules.push({
        test: /\.(tsx|ts)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['next/babel'],
              plugins: ['react-refresh/babel'],
              cacheDirectory: true,
            },
          },
        ],
      })
    }

    return config
  },

  // Performance optimizations
  poweredByHeader: false,
  generateEtags: true,
  compress: true,
  trailingSlash: false,

  // Enable build output analysis in development
  ...(process.env.ANALYZE === 'true' && {
    // Bundle analyzer configuration
    experimental: {
      bundlePagesExternals: true,
    },
  }),
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
