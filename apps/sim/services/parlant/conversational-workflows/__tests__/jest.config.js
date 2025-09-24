/**
 * Jest Configuration for Conversational Workflows Tests
 * =====================================================
 */

const { createJestConfig } = require('@jest/config')

/** @type {import('jest').Config} */
const config = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.js'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/jest.setup.ts'],

  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../$1',
    '^@/services/(.*)$': '<rootDir>/../$1',
    '^@/lib/(.*)$': '<rootDir>/../../lib/$1',
    '^@/app/(.*)$': '<rootDir>/../../app/$1',
  },

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          compilerOptions: {
            module: 'commonjs',
            target: 'es2020',
            lib: ['es2020'],
            allowSyntheticDefaultImports: true,
            esModuleInterop: true,
            skipLibCheck: true,
            strict: true,
            forceConsistentCasingInFileNames: true,
            moduleResolution: 'node',
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            incremental: true,
            baseUrl: '.',
            paths: {
              '@/*': ['../../*'],
            },
          },
        },
      },
    ],
  },

  // File extensions to handle
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/__tests__/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    '../**/*.ts',
    '!../**/*.d.ts',
    '!../**/__tests__/**',
    '!../**/node_modules/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Test timeout
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts'],

  // Mock configuration
  modulePathIgnorePatterns: ['<rootDir>/dist/'],

  // Global setup and teardown
  globalSetup: '<rootDir>/__tests__/global-setup.ts',
  globalTeardown: '<rootDir>/__tests__/global-teardown.ts',

  // Error handling
  errorOnDeprecated: true,

  // Concurrent tests
  maxWorkers: '50%',
}

module.exports = config
