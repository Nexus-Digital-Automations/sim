/**
 * Jest Setup File for Parlant Server Tests
 *
 * This file configures Jest for testing the Parlant server integration
 * with proper environment variables and global test configuration.
 */

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/simstudio_test'
process.env.PARLANT_PORT = '8801' // Different port for testing
process.env.PARLANT_HOST = '0.0.0.0'
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key-placeholder'

// Configure Jest timeout for integration tests
jest.setTimeout(30000)

// Global test utilities
global.testConfig = {
  parlantServerUrl: 'http://localhost:8801',
  simServerUrl: 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL,
  apiTimeout: 10000,
  startupTimeout: 15000,
}

// Mock console methods to reduce noise in test output unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: console.warn,
    error: console.error,
  }
}

console.log('🧪 Jest test environment configured for Parlant server testing')
