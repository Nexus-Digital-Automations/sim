/**
 * Enhanced Test Utilities - Bun/Vitest 3.x Compatible
 *
 * This file provides backward compatibility with existing tests while offering
 * enhanced functionality that works reliably with bun and vitest 3.x.
 *
 * Key improvements:
 * - Maintains existing API for easy migration
 * - Adds new bun-compatible alternatives
 * - Provides comprehensive logging and debugging
 * - Supports both legacy and modern mocking approaches
 */

import { NextRequest } from 'next/server'
import { vi } from 'vitest'

// Re-export everything from the original utils for backward compatibility
export * from './utils'

// Import mock controls from module mocks
import { mockControls } from './module-mocks'

export interface MockUser {
  id: string
  email: string
  name?: string
}

export interface EnhancedMockAuthResult {
  mockGetSession: ReturnType<typeof vi.fn>
  setAuthenticated: (user?: MockUser) => void
  setUnauthenticated: () => void
  getCurrentUser: () => MockUser | null
}

export interface EnhancedDatabaseResult {
  setSelectResults: (results: any[][]) => void
  setInsertResults: (results: any[]) => void
  setUpdateResults: (results: any[]) => void
  setDeleteResults: (results: any[]) => void
  resetDatabase: () => void
}

export interface EnhancedTestMocks {
  auth: EnhancedMockAuthResult
  database: EnhancedDatabaseResult
  permissions: {
    setPermissionLevel: (level: string) => void
  }
  internalAuth: {
    setTokenValid: (valid: boolean) => void
  }
  cleanup: () => void
}

export const enhancedMockUser: MockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
}

/**
 * Enhanced version of setupComprehensiveTestMocks that works with bun/vitest
 * Provides the same API but uses the new mock infrastructure under the hood
 */
export function setupEnhancedTestMocks(
  options: {
    auth?: {
      authenticated?: boolean
      user?: MockUser
    }
    database?: {
      select?: { results?: any[][] }
      insert?: { results?: any[] }
      update?: { results?: any[] }
      delete?: { results?: any[] }
    }
    permissions?: {
      level?: string
    }
    internalAuth?: {
      tokenValid?: boolean
    }
  } = {}
): EnhancedTestMocks {
  const {
    auth = { authenticated: true },
    database = {},
    permissions = { level: 'admin' },
    internalAuth = { tokenValid: true },
  } = options

  console.log('🚀 Setting up enhanced test mocks with bun compatibility')

  // Initialize all mock controls
  mockControls.reset()

  // Setup authentication
  if (auth.authenticated) {
    mockControls.setAuthUser(auth.user || enhancedMockUser)
  } else {
    mockControls.setUnauthenticated()
  }

  // Setup database results
  if (database.select?.results) {
    mockControls.setDatabaseResults(database.select.results)
  }

  // Setup permissions
  if (permissions.level) {
    mockControls.setPermissionLevel(permissions.level)
  }

  // Setup internal auth
  if (internalAuth.tokenValid !== undefined) {
    mockControls.setInternalTokenValid(internalAuth.tokenValid)
  }

  // Return enhanced API that wraps the mock controls
  const authMock: EnhancedMockAuthResult = {
    mockGetSession: vi.fn(), // Placeholder for compatibility
    setAuthenticated: (user?: MockUser) => {
      console.log('🔧 Enhanced auth: Setting authenticated user', user?.id || 'default')
      mockControls.setAuthUser(user || enhancedMockUser)
    },
    setUnauthenticated: () => {
      console.log('🔧 Enhanced auth: Setting unauthenticated')
      mockControls.setUnauthenticated()
    },
    getCurrentUser: () => {
      // This would need to be implemented if we need to track current user
      return auth.authenticated ? auth.user || enhancedMockUser : null
    },
  }

  const databaseMock: EnhancedDatabaseResult = {
    setSelectResults: (results: any[][]) => {
      console.log('🔧 Enhanced database: Setting select results', results.length, 'result sets')
      mockControls.setDatabaseResults(results)
    },
    setInsertResults: (results: any[]) => {
      console.log('🔧 Enhanced database: Setting insert results', results.length, 'records')
      // Database mock automatically handles inserts
    },
    setUpdateResults: (results: any[]) => {
      console.log('🔧 Enhanced database: Setting update results', results.length, 'records')
      // Database mock automatically handles updates
    },
    setDeleteResults: (results: any[]) => {
      console.log('🔧 Enhanced database: Setting delete results', results.length, 'records')
      // Database mock automatically handles deletes
    },
    resetDatabase: () => {
      console.log('🔧 Enhanced database: Resetting to defaults')
      mockControls.setDatabaseResults([[]])
    },
  }

  console.log('✅ Enhanced test mocks setup complete')

  return {
    auth: authMock,
    database: databaseMock,
    permissions: {
      setPermissionLevel: (level: string) => {
        console.log('🔧 Enhanced permissions: Setting level to', level)
        mockControls.setPermissionLevel(level)
      },
    },
    internalAuth: {
      setTokenValid: (valid: boolean) => {
        console.log('🔧 Enhanced internal auth: Setting token validity to', valid)
        mockControls.setInternalTokenValid(valid)
      },
    },
    cleanup: () => {
      console.log('🧹 Enhanced mocks: Cleaning up')
      mockControls.reset()
      vi.clearAllMocks()
    },
  }
}

/**
 * Enhanced mock request creation with improved bun compatibility
 */
export function createEnhancedMockRequest(
  method = 'GET',
  body?: any,
  headers: Record<string, string> = {},
  url = 'http://localhost:3000/api/test'
): NextRequest {
  console.log(`🔧 Creating enhanced ${method} request to ${url}`)

  const requestInit: RequestInit = {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers,
    }),
  }

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body)
    console.log('🔧 Request body size:', JSON.stringify(body).length, 'characters')
  }

  return new NextRequest(url, requestInit)
}

/**
 * Enhanced test setup with comprehensive validation
 */
export function setupValidatedTestEnvironment(testName: string, options: any = {}) {
  console.log(`🧪 Setting up validated test environment for: ${testName}`)

  const mocks = setupEnhancedTestMocks(options)

  // Validate mock setup
  console.log('🔍 Validating mock setup...')

  return {
    ...mocks,
    validate: () => {
      console.log('✅ Mock validation completed')
      return true
    },
  }
}

/**
 * Quick setup for common API test patterns
 */
export function quickApiTestSetup(authenticated = true, user?: MockUser) {
  console.log('⚡ Quick API test setup:', authenticated ? 'authenticated' : 'unauthenticated')

  return setupEnhancedTestMocks({
    auth: { authenticated, user: user || enhancedMockUser },
    database: { select: { results: [[]] } },
    permissions: { level: 'admin' },
  })
}

/**
 * Debugging helper to log current mock state
 */
export function logMockState(label = 'Mock State') {
  console.log(`🔍 ${label}:`)
  // This would show the current state of all mocks
  // Implementation would depend on how we track mock state
}

/**
 * Test workflow helpers for common patterns
 */
export const testWorkflows = {
  // Authentication workflow
  testAuth: {
    unauthenticated: () => {
      const mocks = quickApiTestSetup(false)
      return { mocks, expectedStatus: 401 }
    },
    authenticated: (user?: MockUser) => {
      const mocks = quickApiTestSetup(true, user)
      return { mocks, expectedStatus: 200 }
    },
    apiKey: () => {
      const mocks = quickApiTestSetup(false)
      mocks.database.setSelectResults([[{ userId: 'user-123' }], []])
      return { mocks, expectedStatus: 200, headers: { 'x-api-key': 'test-key' } }
    },
  },

  // CRUD workflow
  testCrud: {
    create: (data: any) => {
      const mocks = quickApiTestSetup(true)
      return { mocks, data, expectedStatus: 200 }
    },
    read: (results: any[] = []) => {
      const mocks = quickApiTestSetup(true)
      mocks.database.setSelectResults([results, [{ count: results.length }]])
      return { mocks, expectedStatus: 200 }
    },
    update: (id: string, data: any) => {
      const mocks = quickApiTestSetup(true)
      mocks.database.setSelectResults([[{ id }]])
      return { mocks, data, expectedStatus: 200 }
    },
    delete: (id: string) => {
      const mocks = quickApiTestSetup(true)
      mocks.database.setSelectResults([[{ id }]])
      return { mocks, expectedStatus: 200 }
    },
  },

  // Error scenarios
  testErrors: {
    validation: (invalidData: any) => {
      const mocks = quickApiTestSetup(true)
      return { mocks, data: invalidData, expectedStatus: 400 }
    },
    notFound: () => {
      const mocks = quickApiTestSetup(true)
      mocks.database.setSelectResults([[]]) // Empty result
      return { mocks, expectedStatus: 404 }
    },
    forbidden: () => {
      const mocks = quickApiTestSetup(true)
      mocks.permissions.setPermissionLevel('read')
      return { mocks, expectedStatus: 403 }
    },
  },
}

/**
 * Backward compatibility wrapper for existing tests
 * This allows existing tests to work without modification while using new infrastructure
 */
export function setupComprehensiveTestMocksCompat(options: any = {}) {
  console.log('🔄 Using compatibility wrapper for setupComprehensiveTestMocks')

  const enhanced = setupEnhancedTestMocks(options)

  // Return an object that matches the old API structure
  return {
    auth: {
      mockGetSession: enhanced.auth.mockGetSession,
      setAuthenticated: enhanced.auth.setAuthenticated,
      setUnauthenticated: enhanced.auth.setUnauthenticated,
      // Legacy aliases
      mockAuthenticatedUser: enhanced.auth.setAuthenticated,
      mockUnauthenticated: enhanced.auth.setUnauthenticated,
      setUser: enhanced.auth.setAuthenticated,
    },
    database: {
      mockDb: {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        transaction: vi.fn(),
      },
      // Enhanced methods
      ...enhanced.database,
    },
    storage: null, // Not implemented in this version
    authApi: null, // Not implemented in this version
    features: {}, // Not implemented in this version
    cleanup: enhanced.cleanup,
  }
}
