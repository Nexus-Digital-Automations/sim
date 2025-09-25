/**
 * Hybrid Workflow Testing Framework Configuration
 *
 * Centralized configuration for running all hybrid workflow tests including
 * mode switching, synchronization, workflow integration, UX, and performance tests.
 */

import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'Hybrid Workflow Framework Tests',
    globals: true,
    environment: 'jsdom',
    include: ['__tests__/hybrid-workflow-framework/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    setupFiles: [path.resolve(__dirname, './test-setup.ts')],
    testTimeout: 30000, // 30 seconds for performance tests
    poolOptions: {
      forks: {
        singleFork: false,
        maxForks: 4,
        minForks: 1,
      },
    },
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/hybrid-framework',
      include: [
        'lib/workflow-journey-mapping/**/*.ts',
        'lib/auth/hybrid.ts',
        'services/parlant/**/*.ts',
        'components/**/*.tsx',
        'app/workspace/**/components/**/*.tsx',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/node_modules/**',
        '**/.next/**',
        '**/coverage/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        'lib/workflow-journey-mapping/': {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
    },
    reporters: [
      'default',
      'json',
      ['html', { outputFile: './test-results/hybrid-framework/index.html' }],
    ],
    outputFile: {
      json: './test-results/hybrid-framework/results.json',
      junit: './test-results/hybrid-framework/junit.xml',
    },
    benchmark: {
      include: ['__tests__/hybrid-workflow-framework/performance/**/*.test.ts'],
      outputFile: './test-results/hybrid-framework/benchmarks.json',
      reporters: ['default', 'json'],
    },
  },
  resolve: {
    alias: [
      {
        find: '@/lib/workflow-journey-mapping',
        replacement: path.resolve(__dirname, '../lib/workflow-journey-mapping'),
      },
      {
        find: '@/lib/auth',
        replacement: path.resolve(__dirname, '../lib/auth'),
      },
      {
        find: '@/lib/logs/console/logger',
        replacement: path.resolve(__dirname, '../lib/logs/console/logger.ts'),
      },
      {
        find: '@/services',
        replacement: path.resolve(__dirname, '../services'),
      },
      {
        find: '@/components',
        replacement: path.resolve(__dirname, '../components'),
      },
      {
        find: '@/stores/workflows/workflow/types',
        replacement: path.resolve(__dirname, '../stores/workflows/workflow/types.ts'),
      },
      {
        find: '@/blocks',
        replacement: path.resolve(__dirname, '../blocks'),
      },
      {
        find: '@/app',
        replacement: path.resolve(__dirname, '../app'),
      },
      {
        find: '@sim/db',
        replacement: path.resolve(__dirname, '../../../packages/db'),
      },
      { find: '@', replacement: path.resolve(__dirname, '..') },
    ],
  },
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.HYBRID_TESTING': '"true"',
    'process.env.LOG_LEVEL': '"silent"',
  },
})
