/**
 * Jest setup file for Universal Tool Adapter System Integration Testing
 */

import { jest } from '@jest/globals'

// Increase default timeout for integration tests
jest.setTimeout(300000) // 5 minutes

// Mock external dependencies that aren't available in test environment
jest.mock('@/lib/auth/internal', () => ({
  generateInternalToken: jest.fn().mockResolvedValue('mock-internal-token'),
}))

jest.mock('@/lib/urls/utils', () => ({
  getBaseUrl: jest.fn().mockReturnValue('http://localhost:3000'),
}))

// Setup console formatting for better test output
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

console.log = (...args) => {
  const timestamp = new Date().toISOString()
  originalConsoleLog(`[${timestamp}]`, ...args)
}

console.error = (...args) => {
  const timestamp = new Date().toISOString()
  originalConsoleError(`[${timestamp}] ERROR:`, ...args)
}

console.warn = (...args) => {
  const timestamp = new Date().toISOString()
  originalConsoleWarn(`[${timestamp}] WARN:`, ...args)
}

// Global test configuration
global.testConfig = {
  timeout: 300000,
  retries: 3,
  verbose: true,
}

// Setup global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason)
  console.error('Promise:', promise)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

// Test environment validation
beforeAll(() => {
  console.log('🚀 Setting up Universal Tool Adapter System Integration Testing Environment')
  console.log(`📅 Test Session Started: ${new Date().toISOString()}`)
  console.log(`🔧 Node Version: ${process.version}`)
  console.log(`📊 Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`)
  console.log('='.repeat(80))
})

afterAll(() => {
  console.log('='.repeat(80))
  console.log(`📅 Test Session Ended: ${new Date().toISOString()}`)
  console.log(
    `📊 Final Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
  )
  console.log('🏁 Universal Tool Adapter System Integration Testing Complete')
})
