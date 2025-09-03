/**
 * Vitest Test Setup Configuration
 *
 * Global test setup and mocking configuration for the Sim AI platform test suite.
 * This file runs before each test file and sets up essential mocks and utilities.
 *
 * Key Features:
 * - Browser API mocks (matchMedia, ResizeObserver, IntersectionObserver)
 * - Global fetch mock for API testing
 * - Application-specific store and service mocks
 * - Console output filtering for cleaner test runs
 * - Testing Library DOM utilities integration
 *
 * Mock Strategy:
 * - Environment-aware mocking (window objects only in browser-like environments)
 * - Comprehensive browser API coverage for headless testing
 * - Application store mocking for isolated unit tests
 * - Controlled console output for focused test results
 *
 * @see https://vitest.dev/config/#setupfiles
 * @see https://testing-library.com/docs/ecosystem-jest-dom/
 */

import { afterAll, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

/**
 * Browser API Mocks
 * Essential browser APIs that are not available in Node.js test environment
 * Only applied when window object is available (jsdom environment)
 */

// Only set up browser globals if window is available (jsdom environment)
// This prevents errors in node environment tests
if (typeof window !== 'undefined') {
  /**
   * Mock window.matchMedia for CSS media query testing
   * Required for theme providers and responsive component testing
   * Provides a consistent interface across different test environments
   */
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// Mock ResizeObserver (both node and jsdom environments)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver (both node and jsdom environments)
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
) as any

vi.mock('@/lib/logs/console/logger', () => {
  const createLogger = vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  }))

  return { createLogger }
})

vi.mock('@/stores/console/store', () => ({
  useConsoleStore: {
    getState: vi.fn().mockReturnValue({
      addConsole: vi.fn(),
    }),
  },
}))

vi.mock('@/stores/execution/store', () => ({
  useExecutionStore: {
    getState: vi.fn().mockReturnValue({
      setIsExecuting: vi.fn(),
      setIsDebugging: vi.fn(),
      setPendingBlocks: vi.fn(),
      reset: vi.fn(),
      setActiveBlocks: vi.fn(),
    }),
  },
}))

vi.mock('@/blocks/registry', () => ({
  getBlock: vi.fn(() => ({
    name: 'Mock Block',
    description: 'Mock block description',
    icon: () => null,
    subBlocks: [],
    outputs: {},
  })),
  getAllBlocks: vi.fn(() => ({})),
}))

const originalConsoleError = console.error
const originalConsoleWarn = console.warn

console.error = (...args: any[]) => {
  if (args[0] === 'Workflow execution failed:' && args[1]?.message === 'Test error') {
    return
  }
  if (typeof args[0] === 'string' && args[0].includes('[zustand persist middleware]')) {
    return
  }
  originalConsoleError(...args)
}

console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('[zustand persist middleware]')) {
    return
  }
  originalConsoleWarn(...args)
}

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})
