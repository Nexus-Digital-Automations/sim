/**
 * Jest Configuration for Agent Management UI Testing
 *
 * Comprehensive Jest configuration for unit, integration, and component tests.
 * Includes TypeScript support, React Testing Library, and custom matchers.
 */

const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

/** @type {import('jest').Config} */
const customJestConfig = {
  // Setup files
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],

  // Test environment
  testEnvironment: "jsdom",

  // Module name mapping
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@/components/(.*)$": "<rootDir>/components/$1",
    "^@/lib/(.*)$": "<rootDir>/lib/$1",
    "^@/hooks/(.*)$": "<rootDir>/hooks/$1",
    "^@/utils/(.*)$": "<rootDir>/utils/$1",
    "^@/types/(.*)$": "<rootDir>/types/$1",
    "^@/app/(.*)$": "<rootDir>/app/$1",
  },

  // Test patterns
  testMatch: [
    "<rootDir>/apps/sim/app/**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)",
    "<rootDir>/apps/sim/app/**/*.(test|spec).(ts|tsx|js|jsx)",
    "<rootDir>/tests/**/*.(test|spec).(ts|tsx|js|jsx)",
  ],

  // Coverage configuration
  collectCoverageFrom: [
    "apps/sim/app/**/*.{ts,tsx}",
    "!apps/sim/app/**/*.d.ts",
    "!apps/sim/app/**/layout.tsx",
    "!apps/sim/app/**/page.tsx",
    "!apps/sim/app/**/loading.tsx",
    "!apps/sim/app/**/error.tsx",
    "!apps/sim/app/**/not-found.tsx",
    "!apps/sim/app/**/*.stories.{ts,tsx}",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/dist/**",
    "!**/build/**",
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Specific thresholds for critical components
    "apps/sim/app/workspace/[workspaceId]/agents/components/agent-form/": {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    "apps/sim/app/workspace/[workspaceId]/agents/components/guideline-builder/":
      {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85,
      },
  },

  // Coverage reporters
  coverageReporters: ["text", "lcov", "html", "json-summary"],

  // Transform configuration
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
        },
      },
    ],
  },

  // Module file extensions
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  // Ignore patterns
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
    "<rootDir>/build/",
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    "/node_modules/(?!(some-esm-package|another-esm-package)/)",
  ],

  // Global mocks
  globals: {
    "ts-jest": {
      tsconfig: {
        jsx: "react-jsx",
      },
    },
  },

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Reporters
  reporters: [
    "default",
    [
      "jest-html-reporters",
      {
        publicPath: "./coverage/html-report",
        filename: "report.html",
        expand: true,
      },
    ],
  ],

  // Watch plugins
  watchPlugins: [
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname",
  ],

  // Error handling
  errorOnDeprecated: true,

  // Max workers for parallel testing
  maxWorkers: "50%",

  // Cache directory
  cacheDirectory: "<rootDir>/.jest-cache",
};

// Export the configuration
module.exports = createJestConfig(customJestConfig);
