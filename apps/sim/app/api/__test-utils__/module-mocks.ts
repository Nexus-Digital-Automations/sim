/**
 * Module-level mocks for bun/vitest compatibility
 * 
 * This file sets up vi.mock() calls that work properly with bun and vitest 3.x.
 * These mocks are applied at module load time and provide stable mock implementations.
 * 
 * Key principles:
 * - Use vi.mock() with factory functions instead of vi.doMock()
 * - Create mocks that can be controlled at runtime through exposed functions
 * - Provide comprehensive logging and debugging capabilities
 * - Support both sync and async mock operations
 * 
 * Import this file in test files to apply all necessary mocks.
 */

import { vi } from 'vitest'

// Global mock state containers
let mockAuthUser: any = null
let mockDatabaseResults: any[] = [[]]
let mockPermissionLevel: string = 'admin'
let mockInternalTokenValid: boolean = true

// Export runtime controls for tests
export const mockControls = {
  // Authentication controls
  setAuthUser: (user: any) => {
    mockAuthUser = user
    console.log('🔧 Mock auth user set:', user?.id || 'null')
  },
  setUnauthenticated: () => {
    mockAuthUser = null
    console.log('🔧 Mock auth set to unauthenticated')
  },
  
  // Database controls
  setDatabaseResults: (results: any[]) => {
    mockDatabaseResults = results
    console.log('🔧 Mock database results set:', results.length, 'result sets')
  },
  
  // Permission controls
  setPermissionLevel: (level: string) => {
    mockPermissionLevel = level
    console.log('🔧 Mock permission level set:', level)
  },
  
  // Internal auth controls
  setInternalTokenValid: (valid: boolean) => {
    mockInternalTokenValid = valid
    console.log('🔧 Mock internal token validity set:', valid)
  },
  
  // Reset all mocks to defaults
  reset: () => {
    mockAuthUser = { id: 'user-123', email: 'test@example.com' }
    mockDatabaseResults = [[]]
    mockPermissionLevel = 'admin'
    mockInternalTokenValid = true
    console.log('🔧 All mocks reset to defaults')
  }
}

// Initialize with defaults
mockControls.reset()

// Mock @/lib/auth
vi.mock('@/lib/auth', () => {
  console.log('📦 Mocking @/lib/auth')
  return {
    getSession: vi.fn().mockImplementation(() => {
      const result = mockAuthUser ? { user: mockAuthUser } : null
      console.log('🔍 getSession called, returning:', result?.user?.id || 'null')
      return Promise.resolve(result)
    })
  }
})

// Mock @/lib/auth/internal
vi.mock('@/lib/auth/internal', () => {
  console.log('📦 Mocking @/lib/auth/internal')
  return {
    verifyInternalToken: vi.fn().mockImplementation((token: string) => {
      console.log('🔍 verifyInternalToken called with:', token?.substring(0, 10) + '...')
      return Promise.resolve(mockInternalTokenValid)
    })
  }
})

// Mock @/lib/permissions/utils
vi.mock('@/lib/permissions/utils', () => {
  console.log('📦 Mocking @/lib/permissions/utils')
  return {
    getUserEntityPermissions: vi.fn().mockImplementation((userId: string, entityType: string, entityId: string) => {
      console.log('🔍 getUserEntityPermissions called:', { userId, entityType, entityId, returning: mockPermissionLevel })
      return Promise.resolve(mockPermissionLevel)
    })
  }
})

// Mock @/lib/logs/console/logger
vi.mock('@/lib/logs/console/logger', () => {
  console.log('📦 Mocking @/lib/logs/console/logger')
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  }
  
  return {
    createLogger: vi.fn().mockImplementation((name: string) => {
      console.log('🔍 createLogger called for:', name)
      return mockLogger
    })
  }
})

// Mock @/db with comprehensive database operations
vi.mock('@/db', () => {
  console.log('📦 Mocking @/db')
  
  let callIndex = 0
  
  const createSelectChain = () => {
    const resolveQuery = () => {
      const result = mockDatabaseResults[callIndex] || mockDatabaseResults[0] || []
      callIndex = (callIndex + 1) % Math.max(mockDatabaseResults.length, 1)
      console.log('🔍 Database select chain resolved with:', result?.length, 'records')
      return Promise.resolve(result)
    }

    // Create a chainable mock that always returns itself until a terminal method is called
    const chain: any = {
      from: vi.fn().mockImplementation(() => {
        console.log('🔍 Database from() called')
        return chain
      }),
      leftJoin: vi.fn().mockImplementation(() => {
        console.log('🔍 Database leftJoin() called')
        return chain
      }),
      innerJoin: vi.fn().mockImplementation(() => {
        console.log('🔍 Database innerJoin() called')
        return chain
      }),
      where: vi.fn().mockImplementation(() => {
        console.log('🔍 Database where() called')
        return chain
      }),
      groupBy: vi.fn().mockImplementation(() => {
        console.log('🔍 Database groupBy() called')
        return chain
      }),
      orderBy: vi.fn().mockImplementation(() => {
        console.log('🔍 Database orderBy() called')
        return chain
      }),
      limit: vi.fn().mockImplementation(() => {
        console.log('🔍 Database limit() called')
        return resolveQuery()
      }),
      // Also add promise methods in case the chain is awaited without limit()
      then: function(onFulfilled: any, onRejected?: any) {
        console.log('🔍 Database chain then() called')
        return resolveQuery().then(onFulfilled, onRejected)
      },
      catch: function(onRejected: any) {
        console.log('🔍 Database chain catch() called')
        return resolveQuery().catch(onRejected)
      }
    }

    return chain
  }

  const createInsertChain = () => ({
    values: vi.fn().mockImplementation(() => ({
      returning: vi.fn().mockImplementation(() => {
        const result = [{ id: 'mock-insert-id', createdAt: new Date() }]
        console.log('🔍 Database insert returning:', result.length, 'records')
        return Promise.resolve(result)
      }),
      onConflictDoUpdate: vi.fn().mockImplementation(() => {
        const result = [{ id: 'mock-upsert-id', updatedAt: new Date() }]
        console.log('🔍 Database upsert returning:', result.length, 'records')
        return Promise.resolve(result)
      }),
    })),
  })

  const createUpdateChain = () => ({
    set: vi.fn().mockImplementation(() => ({
      where: vi.fn().mockImplementation(() => {
        const result = [{ id: 'mock-update-id', updatedAt: new Date() }]
        console.log('🔍 Database update returning:', result.length, 'records')
        return Promise.resolve(result)
      }),
    })),
  })

  const createDeleteChain = () => ({
    where: vi.fn().mockImplementation(() => {
      const result = [{ id: 'mock-delete-id' }]
      console.log('🔍 Database delete returning:', result.length, 'records')
      return Promise.resolve(result)
    }),
  })

  const mockDb = {
    select: vi.fn().mockImplementation(() => {
      console.log('🔍 Database select() called')
      return createSelectChain()
    }),
    insert: vi.fn().mockImplementation(() => {
      console.log('🔍 Database insert() called')
      return createInsertChain()
    }),
    update: vi.fn().mockImplementation(() => {
      console.log('🔍 Database update() called')
      return createUpdateChain()
    }),
    delete: vi.fn().mockImplementation(() => {
      console.log('🔍 Database delete() called')  
      return createDeleteChain()
    }),
    transaction: vi.fn().mockImplementation(async (callback: any) => {
      console.log('🔍 Database transaction() called')
      const tx = {
        select: vi.fn().mockImplementation(() => createSelectChain()),
        insert: vi.fn().mockImplementation(() => createInsertChain()),
        update: vi.fn().mockImplementation(() => createUpdateChain()),
        delete: vi.fn().mockImplementation(() => createDeleteChain()),
      }
      return await callback(tx)
    }),
  }

  return { db: mockDb }
})

// Mock @/db/schema
vi.mock('@/db/schema', () => {
  console.log('📦 Mocking @/db/schema')
  return {
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
      isPublished: 'isPublished',
      deployedAt: 'deployedAt',
      lastRunAt: 'lastRunAt',
      state: 'state',
    },
    workflowBlocks: {
      id: 'id',
      workflowId: 'workflowId',
      blockId: 'blockId',
      blockData: 'blockData',
      createdAt: 'createdAt',
    },
    workspace: {
      id: 'id',
      userId: 'userId',
      name: 'name',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    apiKey: {
      id: 'id',
      userId: 'userId',
      keyHash: 'keyHash',
      name: 'name',
      createdAt: 'createdAt',
      lastUsedAt: 'lastUsedAt',
    }
  }
})

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => {
  console.log('📦 Mocking drizzle-orm')
  return {
    and: vi.fn((...conditions) => {
      console.log('🔍 and() called with', conditions.length, 'conditions')
      return { conditions, type: 'and' }
    }),
    eq: vi.fn((field, value) => {
      console.log('🔍 eq() called:', field, '=', value)
      return { field, value, type: 'eq' }
    }),
    or: vi.fn((...conditions) => {
      console.log('🔍 or() called with', conditions.length, 'conditions')
      return { type: 'or', conditions }
    }),
    ilike: vi.fn((field, value) => {
      console.log('🔍 ilike() called:', field, 'ILIKE', value)
      return { field, value, type: 'ilike' }
    }),
    inArray: vi.fn((field, values) => {
      console.log('🔍 inArray() called:', field, 'IN', values?.length, 'values')
      return { field, values, type: 'inArray' }
    }),
    gte: vi.fn((field, value) => {
      console.log('🔍 gte() called:', field, '>=', value)
      return { type: 'gte', field, value }
    }),
    lte: vi.fn((field, value) => {
      console.log('🔍 lte() called:', field, '<=', value)
      return { type: 'lte', field, value }
    }),
    asc: vi.fn((field) => {
      console.log('🔍 asc() called for field:', field)
      return { field, type: 'asc' }
    }),
    desc: vi.fn((field) => {
      console.log('🔍 desc() called for field:', field)
      return { field, type: 'desc' }
    }),
    isNull: vi.fn((field) => {
      console.log('🔍 isNull() called for field:', field)
      return { field, type: 'isNull' }
    }),
    count: vi.fn((field) => {
      console.log('🔍 count() called for field:', field)
      return { field, type: 'count' }
    }),
    sql: vi.fn((strings, ...values) => {
      console.log('🔍 sql() called with', strings?.length, 'template parts and', values?.length, 'values')
      return {
        type: 'sql',
        sql: strings,
        values,
      }
    }),
  }
})

// Mock crypto for consistent UUID generation
vi.mock('crypto', async (importOriginal) => {
  console.log('📦 Mocking crypto')
  const actual = await importOriginal() as any
  return {
    ...actual,
    randomUUID: vi.fn().mockImplementation(() => {
      const uuid = 'mock-uuid-' + Date.now()
      console.log('🔍 crypto.randomUUID() called, returning:', uuid)
      return uuid
    })
  }
})

// Mock Next.js headers (common source of test failures)
vi.mock('next/headers', () => {
  console.log('📦 Mocking next/headers')
  return {
    headers: vi.fn().mockImplementation(() => {
      console.log('🔍 headers() called')
      return new Headers()
    }),
    cookies: vi.fn().mockImplementation(() => {
      console.log('🔍 cookies() called')
      return {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      }
    })
  }
})

console.log('✅ All module mocks initialized successfully')

// Export sample data for tests
export const sampleWorkflowData = {
  id: 'workflow-123',
  name: 'Test Workflow',
  description: 'A test workflow for API testing',
  color: '#FF6B35',
  userId: 'user-123',
  workspaceId: 'workspace-456',
  folderId: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  isDeployed: false,
  deployedAt: null,
  runCount: 0,
  lastRunAt: null,
  isPublished: false,
  state: null,
}

export const sampleWorkflowsList = [
  sampleWorkflowData,
  {
    ...sampleWorkflowData,
    id: 'workflow-124',
    name: 'Another Test Workflow',
    runCount: 5,
    isDeployed: true,
    deployedAt: new Date('2024-01-02T00:00:00.000Z'),
  },
]

export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User'
}