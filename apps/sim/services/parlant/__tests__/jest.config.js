/**
 * Jest configuration for Universal Tool Adapter System Integration Testing
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: ['<rootDir>/**/*.test.ts', '<rootDir>/**/tool-adapter-*.ts'],

  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform TypeScript files
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          compilerOptions: {
            module: 'esnext',
            moduleResolution: 'node',
            allowSyntheticDefaultImports: true,
            esModuleInterop: true,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
          },
        },
      },
    ],
  },

  // Module Name mapping for path aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../../../$1',
    '^@/services/parlant/(.*)$': '<rootDir>/../$1',
    '^@/tools/(.*)$': '<rootDir>/../../../../tools/$1',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Test timeouts
  testTimeout: 300000, // 5 minutes for integration tests

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/../**/*.ts',
    '!<rootDir>/../**/*.test.ts',
    '!<rootDir>/../**/*.d.ts',
    '!<rootDir>/../**/node_modules/**',
  ],
  coverageDirectory: '<rootDir>/../../../../coverage/tool-adapter-integration',
  coverageReporters: ['text', 'lcov', 'html', 'json'],

  // Global setup and teardown
  globalSetup: '<rootDir>/global-setup.ts',
  globalTeardown: '<rootDir>/global-teardown.ts',

  // Test execution settings
  maxWorkers: 1, // Run tests serially for integration testing
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,

  // Ignore patterns
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/build/'],

  // Error handling
  bail: 0, // Don't stop on first failure
  errorOnDeprecated: true,

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/../../../../test-reports',
        outputName: 'tool-adapter-integration-results.xml',
        suiteName: 'Universal Tool Adapter System Integration Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],
}
