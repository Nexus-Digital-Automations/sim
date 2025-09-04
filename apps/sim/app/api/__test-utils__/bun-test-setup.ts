/**
 * Bun-Compatible Test Setup - Direct Mock Implementation
 *
 * This file provides a completely bun-compatible test infrastructure that works
 * without relying on vi.mock() calls which are not supported in bun environment.
 *
 * Key features:
 * - Direct mock implementations using vi.fn() and vi.stubGlobal()
 * - No dependency on vi.mock() or vi.doMock()
 * - Compatible with both bun and vitest 3.x
 * - Comprehensive logging for debugging
 * - Production-ready mock implementations
 */

import { NextRequest } from 'next/server'
import { vi } from 'vitest'

export interface MockUser {
  id: string
  email: string
  name?: string
}

export interface BunTestMocks {
  auth: {
    setAuthenticated: (user?: MockUser) => void
    setUnauthenticated: () => void
    getCurrentUser: () => MockUser | null
  }
  database: {
    setSelectResults: (results: any[][]) => void
    setInsertResults: (results: any[]) => void
    setUpdateResults: (results: any[]) => void
    setDeleteResults: (results: any[]) => void
    resetDatabase: () => void
    throwError: (error: Error | string) => void
    mockDb: {
      select: any
      insert: any
      update: any
      delete: any
    }
  }
  permissions: {
    setPermissionLevel: (level: string) => void
  }
  cleanup: () => void
}

// Global state for mocks
let currentMockUser: MockUser | null = null
let currentDatabaseResults: any[][] = []
let currentPermissionLevel = 'admin'
let shouldThrowDatabaseError: Error | string | null = null

export const defaultMockUser: MockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
}

/**
 * Setup comprehensive test mocks that work with bun
 * This creates all necessary mocks without using vi.mock()
 */
export function setupComprehensiveTestMocks(
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
  } = {}
): BunTestMocks {
  const {
    auth = { authenticated: true },
    database = {},
    permissions = { level: 'admin' },
  } = options

  console.log('🚀 Setting up comprehensive test mocks (bun-compatible)')

  // Reset global state
  currentMockUser = null
  currentDatabaseResults = []
  currentPermissionLevel = permissions.level || 'admin'
  shouldThrowDatabaseError = null

  // Setup authentication state
  if (auth.authenticated) {
    currentMockUser = auth.user || defaultMockUser
    console.log('🔧 Mock auth set to authenticated user:', currentMockUser.id)
  } else {
    console.log('🔧 Mock auth set to unauthenticated')
  }

  // Setup database results
  if (database.select?.results) {
    currentDatabaseResults = database.select.results
    console.log('🔧 Database configured with', currentDatabaseResults.length, 'result sets')
  }

  // Create mock database functions
  const mockSelect = vi.fn()
  const mockFrom = vi.fn()
  const mockWhere = vi.fn()
  const mockLimit = vi.fn()
  const mockOrderBy = vi.fn()
  const mockInsert = vi.fn()
  const mockValues = vi.fn()
  const mockReturning = vi.fn()
  const mockUpdate = vi.fn()
  const mockSet = vi.fn()
  const mockDelete = vi.fn()

  // Setup database query chain
  mockSelect.mockReturnValue({ from: mockFrom })
  mockFrom.mockReturnValue({ where: mockWhere })
  mockWhere.mockReturnValue({
    orderBy: mockOrderBy,
    limit: mockLimit,
  })

  // Mock results based on current state
  mockOrderBy.mockImplementation(async () => {
    if (shouldThrowDatabaseError) {
      const error =
        shouldThrowDatabaseError instanceof Error
          ? shouldThrowDatabaseError
          : new Error(shouldThrowDatabaseError.toString())
      throw error
    }
    return currentDatabaseResults[0] || []
  })

  mockLimit.mockImplementation(async () => {
    if (shouldThrowDatabaseError) {
      const error =
        shouldThrowDatabaseError instanceof Error
          ? shouldThrowDatabaseError
          : new Error(shouldThrowDatabaseError.toString())
      throw error
    }
    return currentDatabaseResults[0] || []
  })

  // Setup insert chain
  mockInsert.mockReturnValue({ values: mockValues })
  mockValues.mockReturnValue({ returning: mockReturning })
  mockReturning.mockImplementation(async () => {
    if (shouldThrowDatabaseError) {
      const error =
        shouldThrowDatabaseError instanceof Error
          ? shouldThrowDatabaseError
          : new Error(shouldThrowDatabaseError.toString())
      throw error
    }
    return [{ id: 'new-record-123', ...database.insert?.results?.[0] }]
  })

  // Setup update chain
  mockUpdate.mockReturnValue({ set: mockSet })
  mockSet.mockReturnValue({ where: mockWhere })

  // Mock the database module using vi.stubGlobal
  vi.stubGlobal('__mockDatabase', {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    },
  })

  // Mock the auth module
  const mockGetSession = vi.fn().mockImplementation(async () => {
    const result = currentMockUser ? { user: currentMockUser } : null
    console.log('🔍 getSession called, returning:', result?.user?.id || 'null')
    return result
  })

  vi.stubGlobal('__mockAuth', {
    getSession: mockGetSession,
    auth: {
      api: {
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      },
    },
  })

  // Mock database schema
  vi.stubGlobal('__mockDbSchema', {
    copilotChats: {
      id: 'id',
      userId: 'userId',
      messages: 'messages',
      title: 'title',
      model: 'model',
      workflowId: 'workflowId',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    chatDeployments: {
      id: 'id',
      userId: 'userId',
      subdomain: 'subdomain',
      title: 'title',
      workflowId: 'workflowId',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  })

  // Mock drizzle-orm functions
  vi.stubGlobal('__mockDrizzleOrm', {
    and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
    eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
    desc: vi.fn((field) => ({ field, type: 'desc' })),
    asc: vi.fn((field) => ({ field, type: 'asc' })),
  })

  console.log('✅ Comprehensive test mocks setup complete (bun-compatible)')

  return {
    auth: {
      setAuthenticated: (user?: MockUser) => {
        currentMockUser = user || defaultMockUser
        console.log('🔧 Auth set to authenticated user:', currentMockUser.id)

        // Update the mocked getSession function
        mockGetSession.mockResolvedValue({ user: currentMockUser })
      },
      setUnauthenticated: () => {
        currentMockUser = null
        console.log('🔧 Auth set to unauthenticated')

        // Update the mocked getSession function
        mockGetSession.mockResolvedValue(null)
      },
      getCurrentUser: () => currentMockUser,
    },
    database: {
      setSelectResults: (results: any[][]) => {
        currentDatabaseResults = results
        console.log('🔧 Database select results updated:', results.length, 'result sets')

        // Update mock implementations
        mockOrderBy.mockResolvedValue(results[0] || [])
        mockLimit.mockResolvedValue(results[0] || [])
      },
      setInsertResults: (results: any[]) => {
        console.log('🔧 Database insert results updated:', results.length, 'records')
        mockReturning.mockResolvedValue(results)
      },
      setUpdateResults: (results: any[]) => {
        console.log('🔧 Database update results updated:', results.length, 'records')
        // Update mock would be implemented here if needed
      },
      setDeleteResults: (results: any[]) => {
        console.log('🔧 Database delete results updated:', results.length, 'records')
        // Delete mock would be implemented here if needed
      },
      resetDatabase: () => {
        currentDatabaseResults = []
        shouldThrowDatabaseError = null
        console.log('🔧 Database reset to defaults')

        mockOrderBy.mockResolvedValue([])
        mockLimit.mockResolvedValue([])
        mockReturning.mockResolvedValue([])
      },
      throwError: (error: Error | string) => {
        shouldThrowDatabaseError = error
        console.log(
          '🔧 Database configured to throw error:',
          error instanceof Error ? error.message : error
        )

        // Update mocks to throw the error
        const errorToThrow = error instanceof Error ? error : new Error(error.toString())
        mockOrderBy.mockRejectedValue(errorToThrow)
        mockLimit.mockRejectedValue(errorToThrow)
        mockReturning.mockRejectedValue(errorToThrow)
      },
      mockDb: {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
      },
    },
    permissions: {
      setPermissionLevel: (level: string) => {
        currentPermissionLevel = level
        console.log('🔧 Permission level set to:', level)
      },
    },
    cleanup: () => {
      console.log('🧹 Cleaning up comprehensive test mocks')

      // Reset global state
      currentMockUser = null
      currentDatabaseResults = []
      currentPermissionLevel = 'admin'
      shouldThrowDatabaseError = null

      // Clear all vi.fn() mocks
      vi.clearAllMocks()

      console.log('✅ Test mock cleanup complete')
    },
  }
}

/**
 * Create a mock NextRequest for testing
 */
export function createTestRequest(
  method = 'GET',
  body?: any,
  headers: Record<string, string> = {},
  url = 'http://localhost:3000/api/test'
): NextRequest {
  console.log(`🔧 Creating ${method} request to ${url}`)

  const requestInit: {
    method: string
    headers: Headers
    body?: string
  } = {
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
 * Quick setup for authenticated API tests
 */
export function quickAuthSetup(user: MockUser = defaultMockUser) {
  console.log('⚡ Quick authenticated setup for user:', user.id)

  return setupComprehensiveTestMocks({
    auth: { authenticated: true, user },
    database: { select: { results: [[]] } },
    permissions: { level: 'admin' },
  })
}

/**
 * Quick setup for unauthenticated API tests
 */
export function quickUnauthSetup() {
  console.log('⚡ Quick unauthenticated setup')

  return setupComprehensiveTestMocks({
    auth: { authenticated: false },
    database: { select: { results: [[]] } },
    permissions: { level: 'none' },
  })
}
