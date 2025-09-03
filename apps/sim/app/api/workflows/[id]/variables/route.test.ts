/**
 * Comprehensive Test Suite for Workflow Variables API - Bun/Vitest Compatible
 * Tests workflow variables CRUD operations, authentication, authorization, and caching
 * Uses the proven module-level mocking infrastructure for 90%+ test pass rates
 *
 * This test suite covers GET variables retrieval, POST variables updates, permissions,
 * and comprehensive logging for debugging and maintenance by future developers.
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockRequest,
  mockUser,
  setupComprehensiveTestMocks,
} from '@/app/api/__test-utils__/utils'

// Module-level mocks - Required for bun/vitest compatibility
const mockPermissions = {
  getUserEntityPermissions: vi.fn(),
}

const mockInternalAuth = {
  verifyInternalToken: vi.fn(),
}

// Mock permissions utils at module level
vi.mock('@/lib/permissions/utils', () => ({
  getUserEntityPermissions: mockPermissions.getUserEntityPermissions,
}))

// Mock internal auth at module level
vi.mock('@/lib/auth/internal', () => ({
  verifyInternalToken: mockInternalAuth.verifyInternalToken,
}))

// Sample workflow data for consistent testing
const sampleWorkflowData = {
  id: 'workflow-123',
  userId: 'user-123',
  name: 'Test Variables Workflow',
  description: 'A test workflow with variables',
  workspaceId: null,
  variables: {
    'var-1': { id: 'var-1', name: 'testVar', type: 'string', value: '"hello world"' },
    'var-2': { id: 'var-2', name: 'numberVar', type: 'number', value: '42' },
    'var-3': { id: 'var-3', name: 'boolVar', type: 'boolean', value: 'true' },
  },
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
}

const sampleWorkspaceWorkflow = {
  ...sampleWorkflowData,
  userId: 'other-user-456',
  workspaceId: 'workspace-456',
  variables: {
    'var-workspace': {
      id: 'var-workspace',
      name: 'workspaceVar',
      type: 'string',
      value: '"shared"',
    },
  },
}

describe('Workflow Variables API - Comprehensive Test Suite', () => {
  let mocks: any
  let GET: any
  let POST: any

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    console.log('[SETUP] Initializing workflow variables API test infrastructure')

    // Setup comprehensive test infrastructure with proper database setup
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: {
          results: [
            [sampleWorkflowData], // Workflow lookup for authenticated user
          ],
        },
      },
    })

    // Configure database behavior for .then() pattern used in the route
    mocks.database.mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          then: (callback: any) => {
            console.log('[MOCK] Variables database .then() called with workflow data')
            return callback([sampleWorkflowData])
          },
        }),
      }),
    }))

    // Configure permissions to allow read by default
    mockPermissions.getUserEntityPermissions.mockResolvedValue('read')

    // Configure internal auth
    mockInternalAuth.verifyInternalToken.mockResolvedValue(true)

    // Configure database operations for updates
    mocks.database.mockDb.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ ...sampleWorkflowData, updatedAt: new Date() }]),
      }),
    })

    // Import route handlers after mocks are set up
    const routeModule = await import('./route')
    GET = routeModule.GET
    POST = routeModule.POST

    console.log('[SETUP] Test infrastructure initialized for workflow variables')
  })

  afterEach(() => {
    // Clean up after each test for isolation
    vi.clearAllMocks()
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for variables access', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing authentication requirement for variables access')

      mocks.auth.setUnauthenticated()

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Unauthenticated variables response status: ${response.status}`)
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should authenticate with API key', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing API key authentication for variables')

      mocks.auth.setUnauthenticated()

      // Configure database to return API key results then workflow data
      let selectCallCount = 0
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: (table: any) => ({
          where: () => ({
            limit: () => {
              selectCallCount++
              const tableName = String(table)

              // First call: API key lookup returns user
              if (tableName.includes('apiKey') || tableName.includes('api_key')) {
                console.log('[TEST] API key lookup - returning user')
                return Promise.resolve([{ userId: 'user-123' }])
              }

              // Second call: workflow lookup returns workflow
              console.log('[TEST] Workflow lookup - returning workflow')
              return Promise.resolve([sampleWorkflowData])
            },
            then: (callback: any) => {
              selectCallCount++
              const isApiKeyCall = selectCallCount === 1

              if (isApiKeyCall) {
                console.log('[TEST] API key .then() - returning user')
                return callback([{ userId: 'user-123' }])
              }
              console.log('[TEST] Workflow .then() - returning workflow')
              return callback([sampleWorkflowData])
            },
          }),
        }),
      }))

      const request = createMockRequest('GET', undefined, { 'x-api-key': 'test-api-key' })
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] API key variables response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toEqual(sampleWorkflowData.variables)
    })

    it('should return 404 when workflow does not exist', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow not found scenario for variables')

      // Configure database to return empty results for workflow lookup
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            then: (callback: any) => {
              console.log('[TEST] Workflow not found .then() - returning empty array')
              return callback([])
            },
          }),
        }),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })

      console.log(`[TEST] Workflow not found response status: ${response.status}`)
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Workflow not found')
    })
  })

  describe('GET Variables - Basic Access', () => {
    it('should allow access when user owns the workflow', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing variables access for workflow owner')

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Owner variables access response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toEqual(sampleWorkflowData.variables)
      expect(data.requestId).toBeDefined()
      expect(data.workflowId).toBe('workflow-123')
    })

    it('should allow access when user has workspace permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing variables access with workspace permissions')

      // Configure database to return workspace workflow
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            then: (callback: any) => {
              console.log('[TEST] Workspace workflow variables .then() called')
              return callback([sampleWorkspaceWorkflow])
            },
          }),
        }),
      }))

      // Configure permissions to allow read access for workspace
      mockPermissions.getUserEntityPermissions.mockResolvedValue('read')

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Workspace variables access response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toEqual(sampleWorkspaceWorkflow.variables)

      // Verify permissions check was called
      expect(mockPermissions.getUserEntityPermissions).toHaveBeenCalledWith(
        'user-123',
        'workspace',
        'workspace-456'
      )
    })

    it('should deny access when user has no workspace permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing denied workspace variables access')

      // Configure database to return workspace workflow
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            then: (callback: any) => {
              console.log('[TEST] Denied workspace workflow variables .then() called')
              return callback([sampleWorkspaceWorkflow])
            },
          }),
        }),
      }))

      // Configure permissions to deny access
      mockPermissions.getUserEntityPermissions.mockResolvedValue(null)

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Denied variables access response status: ${response.status}`)
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should support internal JWT token authentication', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing internal JWT token authentication for variables')

      // Configure internal token verification to succeed
      mockInternalAuth.verifyInternalToken.mockResolvedValue(true)

      const request = createMockRequest('GET', undefined, {
        authorization: 'Bearer internal-jwt-token',
      })
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] JWT variables auth response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toEqual(sampleWorkflowData.variables)
    })
  })

  describe('GET Variables - Data Handling', () => {
    it('should return empty object for workflows with no variables', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing empty variables handling')

      const workflowWithoutVariables = {
        ...sampleWorkflowData,
        variables: null,
      }

      // Configure database to return workflow without variables
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            then: (callback: any) => {
              console.log('[TEST] No variables workflow .then() called')
              return callback([workflowWithoutVariables])
            },
          }),
        }),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Empty variables response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toEqual({})
    })

    it('should include proper cache headers', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing cache headers in variables response')

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Cache headers response status: ${response.status}`)
      expect(response.status).toBe(200)

      // Verify cache headers
      const cacheControl = response.headers.get('Cache-Control')
      const etag = response.headers.get('ETag')

      expect(cacheControl).toBe('max-age=30, stale-while-revalidate=300')
      expect(etag).toMatch(/^"variables-workflow-123-\d+"$/)
    })

    it('should handle complex variable types', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing complex variable types handling')

      const workflowWithComplexVariables = {
        ...sampleWorkflowData,
        variables: {
          'var-string': { id: 'var-string', name: 'stringVar', type: 'string', value: '"hello"' },
          'var-number': { id: 'var-number', name: 'numberVar', type: 'number', value: '123.45' },
          'var-boolean': { id: 'var-boolean', name: 'boolVar', type: 'boolean', value: 'false' },
          'var-object': {
            id: 'var-object',
            name: 'objectVar',
            type: 'object',
            value: '{"key": "value"}',
          },
          'var-array': { id: 'var-array', name: 'arrayVar', type: 'array', value: '[1, 2, 3]' },
        },
      }

      // Configure database to return workflow with complex variables
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            then: (callback: any) => {
              console.log('[TEST] Complex variables workflow .then() called')
              return callback([workflowWithComplexVariables])
            },
          }),
        }),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Complex variables response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toEqual(workflowWithComplexVariables.variables)
      expect(Object.keys(data.data)).toHaveLength(5)
    })
  })

  describe('POST Variables - Updates', () => {
    it('should allow owner to update variables', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing variables update by owner')

      const newVariables = [
        {
          id: 'var-new',
          workflowId: 'workflow-123',
          name: 'newVar',
          type: 'string',
          value: '"updated value"',
        },
        {
          id: 'var-updated',
          workflowId: 'workflow-123',
          name: 'updatedVar',
          type: 'number',
          value: '999',
        },
      ]

      const request = createMockRequest('POST', { variables: newVariables })
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Variables update response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.requestId).toBeDefined()

      // Verify database update was called
      expect(mocks.database.mockDb.update).toHaveBeenCalled()
    })

    it('should allow users with write permissions to update variables', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing variables update with write permissions')

      // Configure database to return workspace workflow
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            then: (callback: any) => {
              console.log('[TEST] Workspace workflow update variables .then() called')
              return callback([sampleWorkspaceWorkflow])
            },
          }),
        }),
      }))

      // Configure permissions to allow write access
      mockPermissions.getUserEntityPermissions.mockResolvedValue('write')

      const newVariables = [
        {
          id: 'var-workspace-new',
          workflowId: 'workflow-123',
          name: 'workspaceVar',
          type: 'string',
          value: '"workspace updated"',
        },
      ]

      const request = createMockRequest('POST', { variables: newVariables })
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Workspace variables update response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)

      // Verify permissions check was called
      expect(mockPermissions.getUserEntityPermissions).toHaveBeenCalledWith(
        'user-123',
        'workspace',
        'workspace-456'
      )

      // Verify database update was called
      expect(mocks.database.mockDb.update).toHaveBeenCalled()
    })

    it('should deny access for users without write permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing denied variables update access')

      // Configure database to return workspace workflow
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            then: (callback: any) => {
              console.log('[TEST] Denied workspace workflow variables .then() called')
              return callback([sampleWorkspaceWorkflow])
            },
          }),
        }),
      }))

      // Configure permissions to deny write access
      mockPermissions.getUserEntityPermissions.mockResolvedValue('read')

      const newVariables = [
        {
          id: 'var-denied',
          workflowId: 'workflow-123',
          name: 'deniedVar',
          type: 'string',
          value: '"should fail"',
        },
      ]

      const request = createMockRequest('POST', { variables: newVariables })
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Denied variables update response status: ${response.status}`)
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should validate request data schema', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing variables update data validation')

      // Invalid data - missing required fields
      const invalidData = { variables: [{ name: 'test' }] }

      const request = createMockRequest('POST', invalidData)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Invalid data response status: ${response.status}`)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
      expect(data.requestId).toBeDefined()
    })

    it('should handle malformed JSON in request body', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing malformed JSON handling for variables update')

      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/variables',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid-json-content',
        }
      )

      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Malformed JSON response status: ${response.status}`)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid JSON')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully during GET', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing database error handling for GET variables')

      // Configure database to throw error
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            then: (callback: any) => {
              throw new Error('Database connection failed')
            },
          }),
        }),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Database error GET response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Database connection failed')
    })

    it('should handle database errors gracefully during POST', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing database error handling for POST variables')

      // Configure database update to throw error
      mocks.database.mockDb.update.mockImplementation(() => {
        throw new Error('Database update failed')
      })

      const newVariables = [
        {
          id: 'var-error',
          workflowId: 'workflow-123',
          name: 'errorVar',
          type: 'string',
          value: '"error test"',
        },
      ]

      const request = createMockRequest('POST', { variables: newVariables })
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Database error POST response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Database update failed')
    })

    it('should handle permission check errors', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing permission check error handling')

      // Configure database to return workspace workflow
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            then: (callback: any) => {
              console.log('[TEST] Permission error workflow .then() called')
              return callback([sampleWorkspaceWorkflow])
            },
          }),
        }),
      }))

      // Configure permissions to throw error
      mockPermissions.getUserEntityPermissions.mockRejectedValue(
        new Error('Permission service unavailable')
      )

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Permission error response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Permission service unavailable')
    })
  })
})
