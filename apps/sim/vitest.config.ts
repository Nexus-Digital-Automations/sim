import path, { resolve } from 'path'
/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

const nextEnv = require('@next/env')
const { loadEnvConfig } = nextEnv.default || nextEnv

const projectDir = process.cwd()
loadEnvConfig(projectDir)

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.{ts,tsx}'],
    exclude: [...configDefaults.exclude, '**/node_modules/**', '**/dist/**'],
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@': resolve(__dirname, './'),
    },
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'clover', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'coverage/**',
        'dist/**',
        'node_modules/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.stories.*',
        '**/test-utils.*',
        '**/__test-utils__/**',
        '**/__tests__/**',
        '**/vitest.setup.ts',
        '**/next-env.d.ts',
        '**/instrumentation*.ts',
        '**/middleware.ts',
        '**/global-error.tsx',
        '**/manifest.ts',
        '**/zoom-prevention.tsx',
        '**/theme-provider.tsx',
        '**/layout.tsx',
        '**/loading.tsx',
        '**/not-found.tsx',
        '**/error.tsx',
        'public/**',
        'tailwind.config.ts',
        'postcss.config.mjs',
        'components.json',
        'next.config.ts',
        'drizzle.config.ts',
        'trigger.config.ts',
        'telemetry.config.ts'
      ],
      // Coverage thresholds - only enforced in CI/CD
      thresholds: process.env.NODE_ENV === 'test' && !process.env.SKIP_COVERAGE_THRESHOLDS ? {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Critical modules require higher coverage
        'components/ui/*.{ts,tsx}': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'lib/auth*.{ts,tsx}': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'app/api/**/*.{ts,tsx}': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      } : {},
      // Include all source files for accurate coverage reporting
      all: true,
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'stores/**/*.{ts,tsx}',
        'blocks/**/*.{ts,tsx}',
        'tools/**/*.{ts,tsx}',
        'executor/**/*.{ts,tsx}',
        'serializer/**/*.{ts,tsx}',
        'services/**/*.{ts,tsx}',
        'socket-server/**/*.{ts,tsx}',
        'providers/**/*.{ts,tsx}'
      ],
      // Skip threshold enforcement in development and for individual test runs
      skipFull: process.env.NODE_ENV === 'development' || process.env.SKIP_COVERAGE_THRESHOLDS === 'true'
    },
    // Performance and timeout settings
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    // Reporter configuration for CI/CD
    reporter: process.env.CI ? ['json', 'default'] : ['default'],
    outputFile: process.env.CI ? {
      json: './coverage/test-results.json'
    } : undefined,
    // Pool configuration for performance
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        useAtomics: true
      }
    }
  },
  resolve: {
    alias: [
      {
        find: '@/lib/logs/console/logger',
        replacement: path.resolve(__dirname, 'lib/logs/console/logger.ts'),
      },
      {
        find: '@/stores/console/store',
        replacement: path.resolve(__dirname, 'stores/console/store.ts'),
      },
      {
        find: '@/stores/execution/store',
        replacement: path.resolve(__dirname, 'stores/execution/store.ts'),
      },
      {
        find: '@/blocks/types',
        replacement: path.resolve(__dirname, 'blocks/types.ts'),
      },
      {
        find: '@/serializer/types',
        replacement: path.resolve(__dirname, 'serializer/types.ts'),
      },
      { find: '@/lib', replacement: path.resolve(__dirname, 'lib') },
      { find: '@/stores', replacement: path.resolve(__dirname, 'stores') },
      {
        find: '@/components',
        replacement: path.resolve(__dirname, 'components'),
      },
      { find: '@/app', replacement: path.resolve(__dirname, 'app') },
      { find: '@/api', replacement: path.resolve(__dirname, 'app/api') },
      {
        find: '@/executor',
        replacement: path.resolve(__dirname, 'executor'),
      },
      {
        find: '@/providers',
        replacement: path.resolve(__dirname, 'providers'),
      },
      { find: '@/tools', replacement: path.resolve(__dirname, 'tools') },
      { find: '@/blocks', replacement: path.resolve(__dirname, 'blocks') },
      {
        find: '@/serializer',
        replacement: path.resolve(__dirname, 'serializer'),
      },
      { find: '@', replacement: path.resolve(__dirname) },
    ],
  },
})
