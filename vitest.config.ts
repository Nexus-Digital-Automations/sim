/**
 * Vitest Configuration for Intelligent Chatbot Testing
 *
 * Comprehensive test configuration supporting:
 * - TypeScript and TSX files
 * - React component testing
 * - API endpoint testing
 * - Mock implementations
 * - Coverage reporting
 */

import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    name: 'Intelligent Chatbot Tests',
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: [
      'test/**/*.test.{ts,tsx}',
      'apps/**/test/**/*.test.{ts,tsx}',
      'lib/**/test/**/*.test.{ts,tsx}',
    ],
    exclude: ['node_modules', 'dist', '.next', 'coverage'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json'],
      reportsDirectory: 'coverage',
      include: [
        'lib/help/ai/**/*.{ts,tsx}',
        'apps/sim/components/help/**/*.{ts,tsx}',
        'apps/sim/app/api/help/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/node_modules/**',
        '**/coverage/**',
        '**/.next/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    testTimeout: 10000,
    pool: 'threads',
  },
  resolve: {
    alias: {
      '@': '.',
      '@/lib': './lib',
      '@/apps/sim': './apps/sim',
      '@/components': './components',
    },
  },
})
