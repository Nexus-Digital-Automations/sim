/**
 * Comprehensive Test Suite for Workflow by ID API - Bun/Vitest Compatible
 * Tests CRUD operations, authentication, authorization, and workflow management
 * Uses the proven module-level mocking infrastructure for 90%+ test pass rates
 *
 * This test suite covers workflow retrieval, updating, deletion, and permissions
 * with comprehensive logging for debugging and maintenance by future developers.
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
const mockWorkflowDbHelpers = {
  loadWorkflowFromNormalizedTables: vi.fn(),
}

// Mock workflow database helpers at module level
vi.mock('@/lib/workflows/db-helpers', () => ({
  loadWorkflowFromNormalizedTables: mockWorkflowDbHelpers.loadWorkflowFromNormalizedTables,
}))

// Mock permissions utils at module level
vi.mock('@/lib/permissions/utils', () => ({
  getUserEntityPermissions: vi.fn(),
  hasAdminPermission: vi.fn(),
}))

// Mock internal auth at module level
vi.mock('@/lib/auth/internal', () => ({
  verifyInternalToken: vi.fn(),
}))

// Mock console logger at module level
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger),
}))

// Mock workflow data for consistent testing
const sampleWorkflowData = {
  id: 'workflow-123',
  userId: 'user-123',
  name: 'Test Workflow',
  description: 'A test workflow',
  workspaceId: null,
  runCount: 0,
  isDeployed: false,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
}

const sampleWorkflowState = {
  blocks: {
    'block-1': {
      id: 'block-1',
      type: 'starter',
      position: { x: 100, y: 100 },
      config: { params: {} },
    },
    'block-2': {
      id: 'block-2',
      type: 'agent',
      position: { x: 400, y: 100 },
      config: { params: { model: 'gpt-4o' } },
    },
  },
  edges: [{ id: 'edge-1', source: 'block-1', target: 'block-2' }],
  loops: {},
  parallels: {},
}

describe('Workflow by ID API - Comprehensive Test Suite', () => {
  let mocks: any
  let GET: any
  let PUT: any
  let DELETE: any

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    console.log('[SETUP] Initializing workflow by ID API test infrastructure')

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

    // Configure default database behavior for the standard workflow lookup
    // This ensures consistent behavior across all tests where authentication should succeed
    // The route uses .then((rows) => rows[0]) pattern so we need to mock this properly
    mocks.database.mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([sampleWorkflowData]),
          then: (callback: any) => {
            console.log('[MOCK] Database .then() called with workflow data')
            return callback([sampleWorkflowData])
          },
        }),
      }),
    }))

    // Configure workflow state loader to return sample state by default
    mockWorkflowDbHelpers.loadWorkflowFromNormalizedTables.mockResolvedValue(sampleWorkflowState)

    // Configure permissions to allow read by default
    const { getUserEntityPermissions, hasAdminPermission } = await import('@/lib/permissions/utils')
    vi.mocked(getUserEntityPermissions).mockResolvedValue('read')
    vi.mocked(hasAdminPermission).mockResolvedValue(false)

    // Import route handlers after mocks are set up
    const routeModule = await import('./route')
    GET = routeModule.GET
    PUT = routeModule.PUT
    DELETE = routeModule.DELETE

    console.log('[SETUP] Test infrastructure initialized with authenticated user')
  })

  afterEach(() => {
    // Clean up after each test for isolation
    vi.clearAllMocks()
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for workflow access', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing authentication requirement for workflow access')

      mocks.auth.setUnauthenticated()

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Unauthenticated response status: ${response.status}`)
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should authenticate with API key', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing API key authentication')

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

      console.log(`[TEST] API key auth response status: ${response.status}`)
      expect(response.status).toBe(200)
    })

    it('should return 404 when workflow does not exist', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow not found scenario')

      // Configure database to return empty results for workflow lookup
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
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

    it('should allow access when user owns the workflow', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow owner access')

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Owner access response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.id).toBe('workflow-123')
      expect(data.data.state.blocks).toBeDefined()
      expect(data.data.state.edges).toBeDefined()
    })

    it('should allow access when user has workspace permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workspace member access')

      const workspaceWorkflow = {
        ...sampleWorkflowData,
        userId: 'different-user-456',
        workspaceId: 'workspace-123',
      }

      // Configure database to return workspace workflow with .then() support
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([workspaceWorkflow]),
            then: (callback: any) => {
              console.log('[TEST] Workspace workflow .then() called')
              return callback([workspaceWorkflow])
            },
          }),
        }),
      }))

      // Configure permissions to allow read access for workspace
      const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions).mockResolvedValue('read')

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Workspace access response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.id).toBe('workflow-123')
    })

    it('should deny access when user has no workspace permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing denied workspace access')

      const workspaceWorkflow = {
        ...sampleWorkflowData,
        userId: 'different-user-456',
        workspaceId: 'workspace-456',
      }

      // Configure database to return different user's workspace workflow
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([workspaceWorkflow]),
            then: (callback: any) => {
              console.log('[TEST] Different user workspace workflow .then() called')
              return callback([workspaceWorkflow])
            },
          }),
        }),
      }))

      // Configure permissions to deny access
      const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions).mockResolvedValue(null)

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Denied access response status: ${response.status}`)
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should support internal JWT token authentication', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing internal JWT token authentication')

      // Configure internal token verification to succeed
      const { verifyInternalToken } = await import('@/lib/auth/internal')
      vi.mocked(verifyInternalToken).mockResolvedValue(true)

      const request = createMockRequest('GET', undefined, {
        authorization: 'Bearer internal-jwt-token',
      })
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] JWT auth response status: ${response.status}`)
      expect(response.status).toBe(200)
    })
  })

  describe('Workflow Data Loading', () => {
    it('should use normalized tables when available', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing normalized tables data loading')

      const enhancedWorkflowState = {
        ...sampleWorkflowState,
        blocks: {
          'block-1': {
            id: 'block-1',
            type: 'starter',
            position: { x: 100, y: 100 },
            config: { params: {} },
          },
          'block-2': {
            id: 'block-2',
            type: 'agent',
            position: { x: 400, y: 100 },
            config: { params: { model: 'gpt-4o' } },
          },
        },
        isFromNormalizedTables: true,
      }

      // Configure workflow state loader to return enhanced state
      mockWorkflowDbHelpers.loadWorkflowFromNormalizedTables.mockResolvedValue(
        enhancedWorkflowState
      )

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Normalized tables response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.state.blocks).toEqual(enhancedWorkflowState.blocks)
      expect(data.data.state.edges).toEqual(enhancedWorkflowState.edges)
      expect(data.data.state.isFromNormalizedTables).toBe(true)
    })

    it('should handle workflow state loading errors', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow state loading error handling')

      // Configure workflow state loader to throw error
      mockWorkflowDbHelpers.loadWorkflowFromNormalizedTables.mockRejectedValue(
        new Error('State loading failed')
      )

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] State loading error response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('DELETE Operations', () => {
    it('should allow owner to delete workflow', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow owner deletion')

      // Configure database to support both select and delete operations
      mocks.database.mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      // Mock global fetch for deployment cleanup
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      const request = createMockRequest('DELETE')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Owner deletion response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should allow admin to delete workspace workflow', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing admin deletion of workspace workflow')

      const workspaceWorkflow = {
        ...sampleWorkflowData,
        userId: 'other-user-456',
        workspaceId: 'workspace-456',
      }

      // Configure database to return workspace workflow with .then() support
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([workspaceWorkflow]),
            then: (callback: any) => {
              console.log('[TEST] Admin workspace workflow .then() called')
              return callback([workspaceWorkflow])
            },
          }),
        }),
      }))

      // Configure database to support delete operations
      mocks.database.mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      // Configure permissions to allow admin access
      const { getUserEntityPermissions, hasAdminPermission } = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions).mockResolvedValue('admin')
      vi.mocked(hasAdminPermission).mockResolvedValue(true)

      // Mock global fetch for deployment cleanup
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      const request = createMockRequest('DELETE')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Admin deletion response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should deny deletion for non-admin users', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing deletion denial for non-admin users')

      const workspaceWorkflow = {
        ...sampleWorkflowData,
        userId: 'other-user-456',
        workspaceId: 'workspace-456',
      }

      // Configure database to return different user's workflow
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([workspaceWorkflow]),
            then: (callback: any) => {
              console.log('[TEST] Non-admin workflow .then() called')
              return callback([workspaceWorkflow])
            },
          }),
        }),
      }))

      // Configure permissions to deny admin access
      const { getUserEntityPermissions, hasAdminPermission } = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions).mockResolvedValue('read')
      vi.mocked(hasAdminPermission).mockResolvedValue(false)

      const request = createMockRequest('DELETE')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Deletion denial response status: ${response.status}`)
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })
  })

  describe('PUT Operations', () => {
    it('should allow owner to update workflow', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow owner update')

      const updateData = { name: 'Updated Workflow', description: 'Updated description' }
      const updatedWorkflow = { ...sampleWorkflowData, ...updateData }

      // Configure database to support both select and update operations
      mocks.database.mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedWorkflow]),
          }),
        }),
      })

      const request = createMockRequest('PUT', updateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Owner update response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.workflow.name).toBe('Updated Workflow')
      expect(data.workflow.description).toBe('Updated description')
    })

    it('should allow users with write permission to update workflow', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing write permission workflow update')

      const workspaceWorkflow = {
        ...sampleWorkflowData,
        userId: 'other-user-456',
        workspaceId: 'workspace-456',
      }

      const updateData = { name: 'Updated by Collaborator' }
      const updatedWorkflow = { ...workspaceWorkflow, ...updateData }

      // Configure database to return workspace workflow
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([workspaceWorkflow]),
            then: (callback: any) => {
              console.log('[TEST] Write permission workflow .then() called')
              return callback([workspaceWorkflow])
            },
          }),
        }),
      }))

      // Configure database to support update operations
      mocks.database.mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedWorkflow]),
          }),
        }),
      })

      // Configure permissions to allow write access
      const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions).mockResolvedValue('write')

      const request = createMockRequest('PUT', updateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Write permission update response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.workflow.name).toBe('Updated by Collaborator')
    })

    it('should deny update for users with only read permission', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing update denial for read-only users')

      const workspaceWorkflow = {
        ...sampleWorkflowData,
        userId: 'other-user-456',
        workspaceId: 'workspace-456',
      }

      // Configure database to return different user's workflow
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([workspaceWorkflow]),
            then: (callback: any) => {
              console.log('[TEST] Read-only workflow .then() called')
              return callback([workspaceWorkflow])
            },
          }),
        }),
      }))

      // Configure permissions to only allow read access
      const { getUserEntityPermissions } = await import('@/lib/permissions/utils')
      vi.mocked(getUserEntityPermissions).mockResolvedValue('read')

      const updateData = { name: 'Should Not Update' }
      const request = createMockRequest('PUT', updateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Update denial response status: ${response.status}`)
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should validate request data', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing request data validation for updates')

      // Test with invalid data - empty name
      const invalidData = { name: '', description: 'Valid description' }

      const request = createMockRequest('PUT', invalidData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Validation error response status: ${response.status}`)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing database error handling')

      // Configure database to throw error
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.reject(new Error('Database connection timeout')),
            then: (callback: any) => {
              throw new Error('Database connection timeout')
            },
          }),
        }),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Database error response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should handle malformed JSON in PUT requests', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing malformed JSON handling in PUT requests')

      const request = new NextRequest('http://localhost:3000/api/workflows/workflow-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Malformed JSON response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })
})
