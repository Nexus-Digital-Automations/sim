/**
 * Bun/Vitest 3.x Compatible Test Utilities
 * 
 * This module provides test utilities that work reliably with bun and vitest 3.x
 * without relying on vi.doMock() which has compatibility issues.
 * 
 * Key differences from standard utils.ts:
 * - Uses vi.mock() with factory functions instead of vi.doMock()
 * - Provides runtime mock manipulation through returned mock objects
 * - Includes comprehensive logging for debugging test issues
 * - Supports both module-level and runtime mocking patterns
 */

import { NextRequest } from 'next/server'
import { vi, beforeEach, afterEach } from 'vitest'

export interface MockUser {
  id: string
  email: string
  name?: string
}

export interface MockAuthResult {
  mockGetSession: ReturnType<typeof vi.fn>
  setAuthenticated: (user?: MockUser) => void
  setUnauthenticated: () => void
  getCurrentUser: () => MockUser | null
}

export interface DatabaseMockResult {
  mockDb: any
  resetDatabase: () => void
  setSelectResults: (results: any[][]) => void
  setInsertResults: (results: any[]) => void
  setUpdateResults: (results: any[]) => void
  setDeleteResults: (results: any[]) => void
  setTransactionBehavior: (callback: (tx: any) => any) => void
}

export interface RuntimeMockControls {
  auth: MockAuthResult
  database: DatabaseMockResult
  cleanup: () => void
}

// Default test user
export const mockUser: MockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User'
}

// Sample workflow test data
export const sampleWorkflowState = {
  blocks: {
    'starter-id': {
      id: 'starter-id',
      type: 'starter',
      name: 'Start',
      position: { x: 100, y: 100 },
      subBlocks: {
        startWorkflow: { id: 'startWorkflow', type: 'dropdown', value: 'manual' },
        webhookPath: { id: 'webhookPath', type: 'short-input', value: '' },
      },
      outputs: { input: 'any' },
      enabled: true,
      horizontalHandles: true,
      isWide: false,
      advancedMode: false,
      triggerMode: false,
      height: 95,
    },
    'agent-id': {
      id: 'agent-id',
      type: 'agent',
      name: 'Agent 1',
      position: { x: 634, y: -167 },
      subBlocks: {
        systemPrompt: {
          id: 'systemPrompt',
          type: 'long-input',
          value: 'You are a helpful assistant',
        },
        context: { id: 'context', type: 'short-input', value: '<start.input>' },
        model: { id: 'model', type: 'dropdown', value: 'gpt-4o' },
        apiKey: { id: 'apiKey', type: 'short-input', value: '{{OPENAI_API_KEY}}' },
      },
      outputs: {
        response: {
          content: 'string',
          model: 'string',
          tokens: 'any',
        },
      },
      enabled: true,
      horizontalHandles: true,
      isWide: false,
      advancedMode: false,
      triggerMode: false,
      height: 680,
    },
  },
  edges: [
    {
      id: 'edge-id',
      source: 'starter-id',
      target: 'agent-id',
      sourceHandle: 'source',
      targetHandle: 'target',
    },
  ],
  loops: {},
  parallels: {},
  lastSaved: Date.now(),
  isDeployed: false,
}

/**
 * Create mock request for testing API endpoints
 */
export function createMockRequest(
  method = 'GET',
  body?: any,
  headers: Record<string, string> = {}
): NextRequest {
  const url = 'http://localhost:3000/api/test'
  
  const requestInit: RequestInit = {
    method,
    headers: new Headers(headers),
  }
  
  if (body) {
    requestInit.body = JSON.stringify(body)
    requestInit.headers = new Headers({
      'Content-Type': 'application/json',
      ...headers
    })
  }

  return new NextRequest(new URL(url), requestInit)
}

/**
 * Create database mock with runtime controls
 * Works with current bun/vitest without vi.doMock issues
 */
function createDatabaseMock(): DatabaseMockResult {
  let selectResults: any[][] = [[]]
  let insertResults: any[] = []
  let updateResults: any[] = []
  let deleteResults: any[] = []
  let transactionCallback: ((tx: any) => any) | null = null
  let selectCallIndex = 0

  const createSelectChain = () => ({
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockImplementation(() => {
      const result = selectResults[selectCallIndex] || selectResults[0] || []
      selectCallIndex = (selectCallIndex + 1) % selectResults.length
      return Promise.resolve(result)
    }),
    limit: vi.fn().mockImplementation(() => {
      const result = selectResults[selectCallIndex] || selectResults[0] || []
      selectCallIndex = (selectCallIndex + 1) % selectResults.length
      return Promise.resolve(result)
    }),
  })

  const createInsertChain = () => ({
    values: vi.fn().mockImplementation(() => ({
      returning: vi.fn().mockResolvedValue(insertResults),
      onConflictDoUpdate: vi.fn().mockResolvedValue(insertResults),
    })),
  })

  const createUpdateChain = () => ({
    set: vi.fn().mockImplementation(() => ({
      where: vi.fn().mockResolvedValue(updateResults),
    })),
  })

  const createDeleteChain = () => ({
    where: vi.fn().mockResolvedValue(deleteResults),
  })

  const createTransactionMock = () => {
    return vi.fn().mockImplementation(async (callback: any) => {
      if (transactionCallback) {
        return await transactionCallback(callback)
      }
      
      const tx = {
        select: vi.fn().mockImplementation(() => createSelectChain()),
        insert: vi.fn().mockImplementation(() => createInsertChain()),
        update: vi.fn().mockImplementation(() => createUpdateChain()),
        delete: vi.fn().mockImplementation(() => createDeleteChain()),
      }
      return await callback(tx)
    })
  }

  const mockDb = {
    select: vi.fn().mockImplementation(() => createSelectChain()),
    insert: vi.fn().mockImplementation(() => createInsertChain()),
    update: vi.fn().mockImplementation(() => createUpdateChain()),
    delete: vi.fn().mockImplementation(() => createDeleteChain()),
    transaction: createTransactionMock(),
  }

  return {
    mockDb,
    resetDatabase: () => {
      selectCallIndex = 0
      selectResults = [[]]
      insertResults = []
      updateResults = []
      deleteResults = []
      transactionCallback = null
    },
    setSelectResults: (results: any[][]) => {
      selectResults = results
      selectCallIndex = 0
    },
    setInsertResults: (results: any[]) => {
      insertResults = results
    },
    setUpdateResults: (results: any[]) => {
      updateResults = results
    },
    setDeleteResults: (results: any[]) => {
      deleteResults = results
    },
    setTransactionBehavior: (callback: (tx: any) => any) => {
      transactionCallback = callback
    }
  }
}

/**
 * Create authentication mock with runtime controls
 */
function createAuthMock(): MockAuthResult {
  let currentUser: MockUser | null = mockUser
  
  const mockGetSession = vi.fn().mockImplementation(() => {
    return Promise.resolve(currentUser ? { user: currentUser } : null)
  })

  return {
    mockGetSession,
    setAuthenticated: (user?: MockUser) => {
      currentUser = user || mockUser
      mockGetSession.mockResolvedValue({ user: currentUser })
    },
    setUnauthenticated: () => {
      currentUser = null
      mockGetSession.mockResolvedValue(null)
    },
    getCurrentUser: () => currentUser
  }
}

/**
 * Main setup function for bun/vitest compatible mocks
 * 
 * This replaces setupComprehensiveTestMocks with a version that works
 * reliably with bun and vitest 3.x without module mocking issues.
 */
export function setupBunCompatibleMocks(): RuntimeMockControls {
  console.log('🧪 Setting up bun-compatible test mocks')
  
  // Create mock instances with runtime controls
  const authMock = createAuthMock()
  const databaseMock = createDatabaseMock()
  
  // Mock drizzle operators (these are safe to mock at module level)
  const mockDrizzleOperators = {
    and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
    eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
    or: vi.fn((...conditions) => ({ type: 'or', conditions })),
    gte: vi.fn((field, value) => ({ type: 'gte', field, value })),
    lte: vi.fn((field, value) => ({ type: 'lte', field, value })),
    asc: vi.fn((field) => ({ field, type: 'asc' })),
    desc: vi.fn((field) => ({ field, type: 'desc' })),
    isNull: vi.fn((field) => ({ field, type: 'isNull' })),
    count: vi.fn((field) => ({ field, type: 'count' })),
    ilike: vi.fn((field, value) => ({ field, value, type: 'ilike' })),
    inArray: vi.fn((field, values) => ({ field, values, type: 'inArray' })),
    sql: vi.fn((strings, ...values) => ({
      type: 'sql',
      sql: strings,
      values,
    })),
  }

  // Create mock schema objects
  const mockSchema = {
    workflow: {
      id: 'id',
      userId: 'userId',
      name: 'name',
      description: 'description',
      color: 'color',
      workspaceId: 'workspaceId',
      folderId: 'folderId',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      isDeployed: 'isDeployed',
      runCount: 'runCount',
    },
    workflowBlocks: {
      id: 'id',
      workflowId: 'workflowId',
      blockId: 'blockId',
    },
    workspace: {
      id: 'id',
      userId: 'userId',
    },
    apiKey: {
      id: 'id',
      userId: 'userId',
    }
  }

  // Mock logger
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
  }

  // Mock permissions utility
  const mockPermissions = {
    getUserEntityPermissions: vi.fn().mockResolvedValue('admin'),
  }

  // Mock internal auth
  const mockInternalAuth = {
    verifyInternalToken: vi.fn().mockResolvedValue(true),
  }

  // Mock UUID generation
  const mockCrypto = {
    randomUUID: vi.fn().mockReturnValue('mock-uuid-1234-5678'),
  }
  
  // Store original implementations for cleanup
  const originalCrypto = global.crypto
  
  // Apply global mocks
  global.crypto = { ...originalCrypto, ...mockCrypto } as any
  
  console.log('✅ Bun-compatible mocks setup complete')

  return {
    auth: authMock,
    database: databaseMock,
    cleanup: () => {
      console.log('🧹 Cleaning up bun-compatible mocks')
      // Restore original implementations
      global.crypto = originalCrypto
      
      // Reset all mocks
      authMock.setAuthenticated(mockUser)
      databaseMock.resetDatabase()
      
      // Clear all vi.fn() mock calls
      vi.clearAllMocks()
      
      console.log('✅ Cleanup complete')
    }
  }
}

/**
 * Simplified mock setup for basic API tests
 * Use this for tests that don't need complex database or auth scenarios
 */
export function setupBasicApiMocks() {
  const mocks = setupBunCompatibleMocks()
  
  // Set up default successful authentication
  mocks.auth.setAuthenticated(mockUser)
  
  // Set up default database responses
  mocks.database.setSelectResults([[]])
  
  return mocks
}

/**
 * Enhanced mock setup for comprehensive testing
 * Use this for tests that need detailed control over mocking behavior
 */
export function setupEnhancedApiMocks(options: {
  authenticated?: boolean
  user?: MockUser
  selectResults?: any[][]
  insertResults?: any[]
  updateResults?: any[]
  deleteResults?: any[]
} = {}) {
  const {
    authenticated = true,
    user = mockUser,
    selectResults = [[]],
    insertResults = [],
    updateResults = [],
    deleteResults = []
  } = options
  
  const mocks = setupBunCompatibleMocks()
  
  // Configure authentication
  if (authenticated) {
    mocks.auth.setAuthenticated(user)
  } else {
    mocks.auth.setUnauthenticated()
  }
  
  // Configure database responses
  mocks.database.setSelectResults(selectResults)
  mocks.database.setInsertResults(insertResults)
  mocks.database.setUpdateResults(updateResults)
  mocks.database.setDeleteResults(deleteResults)
  
  return mocks
}

/**
 * Utility to setup automatic cleanup in test suites
 * Call this in your beforeEach/afterEach hooks
 */
export function setupTestCleanup(mocks: RuntimeMockControls) {
  beforeEach(() => {
    console.log('🧪 Resetting mocks for new test')
    // Reset to clean state before each test
    mocks.auth.setAuthenticated(mockUser)
    mocks.database.resetDatabase()
    vi.clearAllMocks()
  })
  
  afterEach(() => {
    console.log('🧹 Cleaning up after test')
    mocks.cleanup()
  })
}

/**
 * Debug utility to log current mock states
 * Useful for troubleshooting test failures
 */
export function debugMockState(mocks: RuntimeMockControls) {
  console.log('🔍 Current mock state:')
  console.log('  Auth user:', mocks.auth.getCurrentUser())
  console.log('  Database calls:', {
    select: mocks.database.mockDb.select.mock.calls.length,
    insert: mocks.database.mockDb.insert.mock.calls.length,
    update: mocks.database.mockDb.update.mock.calls.length,
    delete: mocks.database.mockDb.delete.mock.calls.length,
  })
}