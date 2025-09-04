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
let mockPermissionLevel = 'admin'
let mockInternalTokenValid = true
let mockDatabaseError: Error | string | null = null

// File upload specific mock state  
const mockFileState = {
  storageProvider: 'local' as 'local' | 's3' | 'azure' | 'gcs',
  uploadResult: null as any,
  uploadError: null as string | null,
}

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

  // Database error controls
  setDatabaseError: (error: Error | string | null) => {
    mockDatabaseError = error
    console.log('🔧 Mock database error set:', error instanceof Error ? error.message : error)
  },

  // File upload storage controls
  setStorageProvider: (provider: 'local' | 's3' | 'azure' | 'gcs') => {
    mockFileState.storageProvider = provider
    console.log('🔧 Mock storage provider set:', provider)
  },

  setUploadSuccess: (result: any) => {
    mockFileState.uploadResult = result
    mockFileState.uploadError = null
    console.log('🔧 Mock upload success set:', result?.key || result?.id || 'result')
  },

  setUploadError: (error: string) => {
    mockFileState.uploadError = error
    mockFileState.uploadResult = null
    console.log('🔧 Mock upload error set:', error)
  },

  // Reset all mocks to defaults
  reset: () => {
    mockAuthUser = { id: 'user-123', email: 'test@example.com' }
    mockDatabaseResults = [[]]
    mockPermissionLevel = 'admin'
    mockInternalTokenValid = true
    mockDatabaseError = null
    mockFileState.storageProvider = 'local'
    mockFileState.uploadResult = null
    mockFileState.uploadError = null
    console.log('🔧 All mocks reset to defaults')
  },
}

// Initialize with defaults
mockControls.reset()

// Mock auth API functionality
const mockAuthApi = {
  forgetPassword: vi.fn(),
  resetPassword: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}

// Mock @/lib/auth
vi.mock('@/lib/auth', () => {
  console.log('📦 Mocking @/lib/auth')
  return {
    getSession: vi.fn().mockImplementation(() => {
      const result = mockAuthUser ? { user: mockAuthUser } : null
      console.log('🔍 getSession called, returning:', result?.user?.id || 'null')
      return Promise.resolve(result)
    }),
    auth: {
      api: mockAuthApi,
    },
  }
})

// Mock @/lib/copilot/auth (used by checkpoint revert API)
vi.mock('@/lib/copilot/auth', () => {
  console.log('📦 Mocking @/lib/copilot/auth')
  return {
    authenticateCopilotRequestSessionOnly: vi.fn().mockImplementation(() => {
      const result = {
        userId: mockAuthUser?.id || null,
        isAuthenticated: !!mockAuthUser,
        user: mockAuthUser
      }
      console.log('🔍 authenticateCopilotRequestSessionOnly called, returning:', {
        userId: result.userId,
        isAuthenticated: result.isAuthenticated
      })
      return Promise.resolve(result)
    }),
    createInternalServerErrorResponse: vi.fn().mockImplementation((message = 'Internal Server Error') => {
      console.log('🔍 createInternalServerErrorResponse called with:', message)
      return new Response(JSON.stringify({ error: message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }),
    createNotFoundResponse: vi.fn().mockImplementation((message = 'Not Found') => {
      console.log('🔍 createNotFoundResponse called with:', message)
      return new Response(JSON.stringify({ error: message }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }),
    createUnauthorizedResponse: vi.fn().mockImplementation(() => {
      console.log('🔍 createUnauthorizedResponse called')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }),
    createBadRequestResponse: vi.fn().mockImplementation((message = 'Bad Request') => {
      console.log('🔍 createBadRequestResponse called with:', message)
      return new Response(JSON.stringify({ error: message }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }),
    createRequestTracker: vi.fn().mockImplementation((short = true) => {
      const requestId = short ? `req-${Math.random().toString(36).substr(2, 8)}` : `req-${crypto.randomUUID()}`
      const startTime = Date.now()
      const tracker = {
        requestId,
        startTime,
        getDuration: () => Date.now() - startTime
      }
      console.log('🔍 createRequestTracker called, returning:', tracker.requestId)
      return tracker
    }),
  }
})

// Export auth API mock controls for tests
export { mockAuthApi }

// Mock @/lib/auth/internal
vi.mock('@/lib/auth/internal', () => {
  console.log('📦 Mocking @/lib/auth/internal')
  return {
    verifyInternalToken: vi.fn().mockImplementation((token: string) => {
      console.log('🔍 verifyInternalToken called with:', `${token?.substring(0, 10)}...`)
      return Promise.resolve(mockInternalTokenValid)
    }),
  }
})

// Mock @/lib/permissions/utils
vi.mock('@/lib/permissions/utils', () => {
  console.log('📦 Mocking @/lib/permissions/utils')
  return {
    getUserEntityPermissions: vi
      .fn()
      .mockImplementation((userId: string, entityType: string, entityId: string) => {
        console.log('🔍 getUserEntityPermissions called:', {
          userId,
          entityType,
          entityId,
          returning: mockPermissionLevel,
        })
        return Promise.resolve(mockPermissionLevel)
      }),
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
    }),
  }
})

// Mock @/db with comprehensive database operations
vi.mock('@/db', () => {
  console.log('📦 Mocking @/db')

  let callIndex = 0

  const createSelectChain = () => {
    const resolveQuery = () => {
      if (mockDatabaseError) {
        const error =
          mockDatabaseError instanceof Error ? mockDatabaseError : new Error(mockDatabaseError)
        console.log('🔍 Database select chain throwing error:', error.message)
        return Promise.reject(error)
      }
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
      then: (onFulfilled: any, onRejected?: any) => {
        console.log('🔍 Database chain then() called')
        return resolveQuery().then(onFulfilled, onRejected)
      },
      catch: (onRejected: any) => {
        console.log('🔍 Database chain catch() called')
        return resolveQuery().catch(onRejected)
      },
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
    account: {
      id: 'id',
      userId: 'userId',
      providerId: 'providerId',
      accountId: 'accountId',
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
      idToken: 'idToken',
      accessTokenExpiresAt: 'accessTokenExpiresAt',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    user: {
      id: 'id',
      email: 'email',
      name: 'name',
      image: 'image',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
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
    },
    chat: {
      id: 'id',
      workflowId: 'workflowId',
      userId: 'userId',
      subdomain: 'subdomain',
      title: 'title',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    workflowCheckpoints: {
      id: 'id',
      userId: 'userId',
      workflowId: 'workflowId',
      workflowState: 'workflowState',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
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
      console.log(
        '🔍 sql() called with',
        strings?.length,
        'template parts and',
        values?.length,
        'values'
      )
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
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    randomUUID: vi.fn().mockImplementation(() => {
      const uuid = `mock-uuid-${Date.now()}`
      console.log('🔍 crypto.randomUUID() called, returning:', uuid)
      return uuid
    }),
  }
})

// Mock workflow API utilities
vi.mock('@/app/api/workflows/utils', () => {
  console.log('📦 Mocking @/app/api/workflows/utils')
  
  const { NextResponse } = require('next/server')
  
  return {
    createErrorResponse: vi.fn().mockImplementation((error: string, status: number, code?: string) => {
      console.log('🔍 createErrorResponse called:', { error, status, code })
      return NextResponse.json(
        {
          error,
          code: code || error.toUpperCase().replace(/\s+/g, '_'),
        },
        { status }
      )
    }),
    createSuccessResponse: vi.fn().mockImplementation((data: any) => {
      console.log('🔍 createSuccessResponse called with:', Object.keys(data))
      return NextResponse.json(data)
    }),
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
    }),
  }
})

// Mock @/lib/uploads for file storage operations
vi.mock('@/lib/uploads', () => {
  console.log('📦 Mocking @/lib/uploads')
  return {
    uploadFile: vi.fn().mockImplementation(async (buffer, filename, type, size) => {
      console.log('🔍 uploadFile called:', { filename, type, size: buffer.length })
      console.log('🔍 uploadFile mockUploadError state:', mockFileState.uploadError)
      console.log('🔍 uploadFile storageProvider state:', mockFileState.storageProvider)
      
      if (mockFileState.uploadError) {
        console.log('🔍 Upload throwing error:', mockFileState.uploadError)
        const error = new Error(mockFileState.uploadError)
        throw error
      }

      const result = mockFileState.uploadResult || {
        key: `${mockFileState.storageProvider}-${Date.now()}-${filename}`,
        path: `/api/files/serve/${filename}`,
        name: filename,
        size: size,
        type: type,
      }
      
      console.log('🔍 Upload returning result:', result.key)
      return result
    }),
    
    getPresignedUrl: vi.fn().mockImplementation(async (key, expirySeconds) => {
      console.log('🔍 getPresignedUrl called:', { key, expirySeconds })
      
      if (mockStorageProvider === 'local') {
        return undefined // Local storage doesn't use presigned URLs
      }
      
      return `https://cdn.example.com/${key}?expires=${Date.now() + (expirySeconds * 1000)}`
    }),
    
    isUsingCloudStorage: vi.fn().mockImplementation(() => {
      const result = mockStorageProvider !== 'local'
      console.log('🔍 isUsingCloudStorage called, storage provider:', mockStorageProvider, 'returning:', result)
      return result
    }),
  }
})

// Mock @/lib/uploads/setup.server (side-effect import)
vi.mock('@/lib/uploads/setup.server', () => {
  console.log('📦 Mocking @/lib/uploads/setup.server')
  return {}
})

// Mock @/app/api/files/utils for error handling
vi.mock('@/app/api/files/utils', () => {
  console.log('📦 Mocking @/app/api/files/utils')
  
  class MockInvalidRequestError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'InvalidRequestError'
    }
  }
  
  return {
    InvalidRequestError: MockInvalidRequestError,
    
    createErrorResponse: vi.fn().mockImplementation((error) => {
      console.log('🔍 createErrorResponse called:', error.message)
      const status = error.name === 'InvalidRequestError' ? 400 : 500
      return new Response(JSON.stringify({
        error: error.name || 'Error',
        message: error.message
      }), {
        status,
        headers: { 'Content-Type': 'application/json' }
      })
    }),
    
    createOptionsResponse: vi.fn().mockImplementation(() => {
      console.log('🔍 createOptionsResponse called')
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      })
    }),
  }
})

// Mock dynamic execution file storage import
vi.mock('@/lib/workflows/execution-file-storage', () => {
  console.log('📦 Mocking @/lib/workflows/execution-file-storage')
  return {
    uploadExecutionFile: vi.fn().mockImplementation(async (context, buffer, filename, type) => {
      console.log('🔍 uploadExecutionFile called:', { 
        workflowId: context.workflowId, 
        executionId: context.executionId,
        filename, 
        type 
      })
      
      if (mockUploadError) {
        throw new Error(mockUploadError)
      }

      return mockUploadResult || {
        id: `exec-file-${Date.now()}`,
        name: filename,
        size: buffer.length,
        type: type,
        path: `/api/files/serve/execution/${context.executionId}/${filename}`,
        url: `/api/files/serve/execution/${context.executionId}/${filename}`,
        uploadedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      }
    }),
  }
})

// Mock @/lib/uploads with comprehensive storage operations
let mockUseCloudStorage = false
let mockDeleteFileError: Error | null = null

export const mockUploadsControls = {
  setCloudStorage: (enabled: boolean) => {
    mockUseCloudStorage = enabled
    console.log('🔧 Mock cloud storage enabled:', enabled)
  },
  setDeleteFileError: (error: Error | null) => {
    mockDeleteFileError = error
    console.log('🔧 Mock delete file error set:', error?.message || 'null')
  },
  reset: () => {
    mockUseCloudStorage = false
    mockDeleteFileError = null
    console.log('🔧 Uploads mocks reset to defaults')
  },
}

vi.mock('@/lib/uploads', () => {
  console.log('📦 Mocking @/lib/uploads')
  return {
    deleteFile: vi.fn().mockImplementation(async (key: string) => {
      console.log('🔍 deleteFile called with key:', key)
      if (mockDeleteFileError) {
        throw mockDeleteFileError
      }
      return Promise.resolve()
    }),
    isUsingCloudStorage: vi.fn().mockImplementation(() => {
      console.log('🔍 isUsingCloudStorage called, returning:', mockUseCloudStorage)
      return mockUseCloudStorage
    }),
    uploadFile: vi.fn().mockImplementation(async () => {
      console.log('🔍 uploadFile mock called')
      return Promise.resolve({
        path: '/api/files/serve/mock-file.txt',
        key: 'mock-file.txt',
        name: 'mock-file.txt',
        size: 100,
        type: 'text/plain',
      })
    }),
    downloadFile: vi.fn().mockImplementation(async () => {
      console.log('🔍 downloadFile mock called')
      return Promise.resolve(Buffer.from('mock file content'))
    }),
    getStorageProvider: vi.fn().mockImplementation(() => {
      const provider = mockUseCloudStorage ? 's3' : 'local'
      console.log('🔍 getStorageProvider called, returning:', provider)
      return provider
    }),
  }
})

// Mock @/lib/uploads/setup
vi.mock('@/lib/uploads/setup', () => {
  console.log('📦 Mocking @/lib/uploads/setup')
  return {
    UPLOAD_DIR: '/tmp/test-uploads',
    USE_S3_STORAGE: false,
    USE_BLOB_STORAGE: false,
  }
})

// Mock @/lib/uploads/setup.server (server-only imports)
vi.mock('@/lib/uploads/setup.server', () => {
  console.log('📦 Mocking @/lib/uploads/setup.server')
  return {}
})

// Mock file system operations
vi.mock('fs', async (importOriginal) => {
  console.log('📦 Mocking fs')
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    existsSync: vi.fn().mockImplementation((path: string) => {
      // Don't return file exists if we're testing delete errors
      if (mockDeleteFileError && mockDeleteFileError.message.includes('ENOENT')) {
        console.log('🔍 fs.existsSync returning false (simulating file not found)')
        return false
      }
      console.log('🔍 fs.existsSync called with:', path, 'returning: true')
      return true
    }),
  }
})

vi.mock('fs/promises', async (importOriginal) => {
  console.log('📦 Mocking fs/promises')
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    unlink: vi.fn().mockImplementation(async (path: string) => {
      console.log('🔍 fs.unlink called with:', path)
      if (mockDeleteFileError) {
        throw mockDeleteFileError
      }
      return Promise.resolve()
    }),
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
  name: 'Test User',
}
