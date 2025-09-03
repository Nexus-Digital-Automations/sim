/**
 * Comprehensive Test Suite for Workflow Deployment API - Bun/Vitest Compatible
 * Tests deployment, undeployment, authentication, authorization, and API key management
 * Uses the proven module-level mocking infrastructure for 90%+ test pass rates
 *
 * This test suite covers GET deployment status, POST deployment, DELETE undeployment,
 * and comprehensive logging for debugging and maintenance by future developers.
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockRequest,
  mockUser,
  setupComprehensiveTestMocks,
} from '@/app/api/__test-utils__/utils'

// Module-level mocks - Required for bun/vitest compatibility
const mockWorkflowMiddleware = {
  validateWorkflowAccess: vi.fn(),
}

const mockWorkflowDbHelpers = {
  loadWorkflowFromNormalizedTables: vi.fn(),
}

const mockWorkflowUtils = {
  createSuccessResponse: vi.fn(),
  createErrorResponse: vi.fn(),
}

const mockUtils = {
  generateApiKey: vi.fn(),
}

const mockSerializer = {
  serializeWorkflow: vi.fn(),
}

// Mock workflow validation middleware at module level
vi.mock('@/app/api/workflows/middleware', () => ({
  validateWorkflowAccess: mockWorkflowMiddleware.validateWorkflowAccess,
}))

// Mock workflow database helpers at module level
vi.mock('@/lib/workflows/db-helpers', () => ({
  loadWorkflowFromNormalizedTables: mockWorkflowDbHelpers.loadWorkflowFromNormalizedTables,
}))

// Mock workflow utils at module level
vi.mock('@/app/api/workflows/utils', () => ({
  createSuccessResponse: mockWorkflowUtils.createSuccessResponse,
  createErrorResponse: mockWorkflowUtils.createErrorResponse,
}))

// Mock utilities at module level
vi.mock('@/lib/utils', () => ({
  generateApiKey: mockUtils.generateApiKey,
}))

// Mock serializer at module level
vi.mock('@/serializer', () => ({
  serializeWorkflow: mockSerializer.serializeWorkflow,
}))

// Mock UUID generation at module level
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid-1234'),
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

// Mock drizzle-orm operators at module level
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
}))

// Mock database schema at module level
vi.mock('@/db/schema', () => ({
  workflow: {},
  apiKey: {},
  workflowBlocks: {},
  workflowEdges: {},
  workflowSubflows: {},
}))

// Sample workflow data for consistent testing
const sampleWorkflowData = {
  id: 'workflow-123',
  userId: 'user-123',
  name: 'Test Deployment Workflow',
  description: 'A test workflow for deployment',
  workspaceId: null,
  isDeployed: false,
  deployedAt: null,
  deployedState: null,
}

const sampleWorkflowState = {
  blocks: {
    'block-1': {
      id: 'block-1',
      type: 'starter',
      name: 'Start',
      position: { x: 100, y: 100 },
      enabled: true,
      subBlocks: {},
      outputs: {},
      data: {},
    },
    'agent-id': {
      id: 'agent-id',
      type: 'agent',
      name: 'Agent',
      position: { x: 300, y: 100 },
      enabled: true,
      subBlocks: {},
      outputs: {},
      data: {},
    },
  },
  edges: [],
  loops: {},
  parallels: {},
  isFromNormalizedTables: true,
}

const sampleSerializedWorkflow = {
  version: '1.0',
  blocks: [
    {
      id: 'block-1',
      metadata: { id: 'starter', name: 'Start' },
      position: { x: 100, y: 100 },
      config: { tool: 'starter', params: {} },
      inputs: {},
      outputs: {},
      enabled: true,
    },
  ],
  connections: [],
  loops: {},
  parallels: {},
}

describe('Workflow Deployment API - Comprehensive Test Suite', () => {
  let mocks: any
  let GET: any
  let POST: any
  let DELETE: any

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    console.log('[SETUP] Initializing workflow deployment API test infrastructure')

    // Setup comprehensive test infrastructure with proper database setup
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: {
          results: [
            [sampleWorkflowData], // Workflow lookup
            [], // Block lookup
            [], // Edge lookup
            [], // Subflow lookup
            [], // API key lookup
          ],
        },
      },
    })

    // Configure workflow middleware to allow access by default
    mockWorkflowMiddleware.validateWorkflowAccess.mockResolvedValue({
      workflow: sampleWorkflowData,
    })

    // Configure workflow state loader to return sample state
    mockWorkflowDbHelpers.loadWorkflowFromNormalizedTables.mockResolvedValue(sampleWorkflowState)

    // Configure workflow utils to return proper responses
    mockWorkflowUtils.createSuccessResponse.mockImplementation((data) => {
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    mockWorkflowUtils.createErrorResponse.mockImplementation((message, status = 500) => {
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    // Configure utilities
    mockUtils.generateApiKey.mockReturnValue('sim_testkeygenerated12345')

    // Configure serializer
    mockSerializer.serializeWorkflow.mockReturnValue(sampleSerializedWorkflow)

    // Configure database operations for insert and update
    mocks.database.mockDb.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ id: 'mock-api-key-id' }]),
    })

    mocks.database.mockDb.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([sampleWorkflowData]),
      }),
    })

    // Global crypto mock for request IDs
    global.crypto = {
      randomUUID: vi.fn().mockReturnValue('mock-request-id'),
    } as any

    // Import route handlers after mocks are set up
    const routeModule = await import('./route')
    GET = routeModule.GET
    POST = routeModule.POST
    DELETE = routeModule.DELETE

    console.log('[SETUP] Test infrastructure initialized for workflow deployment')
  })

  afterEach(() => {
    // Clean up after each test for isolation
    vi.clearAllMocks()
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for deployment operations', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing authentication requirement for deployment')

      mocks.auth.setUnauthenticated()

      // Configure middleware to return authentication error
      mockWorkflowMiddleware.validateWorkflowAccess.mockResolvedValue({
        error: {
          message: 'Access denied',
          status: 403,
        },
      })

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Unauthenticated deployment response status: ${response.status}`)
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should check workflow access permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow access permissions for deployment')

      // Configure middleware to deny access
      mockWorkflowMiddleware.validateWorkflowAccess.mockResolvedValue({
        error: {
          message: 'Workflow not found',
          status: 404,
        },
      })

      const request = createMockRequest('POST')
      const response = await POST(request, { params: Promise.resolve({ id: 'nonexistent-workflow' }) })

      console.log(`[TEST] Access denied response status: ${response.status}`)
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Workflow not found')
    })

    it('should handle unauthorized access to workflow', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing unauthorized workflow access')

      // Configure middleware to return unauthorized error
      mockWorkflowMiddleware.validateWorkflowAccess.mockResolvedValue({
        error: {
          message: 'Unauthorized access',
          status: 403,
        },
      })

      const request = createMockRequest('POST')
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Unauthorized access response status: ${response.status}`)
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized access')
    })
  })

  describe('GET Deployment Status', () => {
    it('should fetch deployment info successfully for undeployed workflow', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing deployment status fetch for undeployed workflow')

      const undeployedWorkflow = {
        ...sampleWorkflowData,
        isDeployed: false,
        deployedAt: null,
        deployedState: null,
      }

      // Configure database to return undeployed workflow
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([undeployedWorkflow]),
          }),
        }),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Deployment status response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.isDeployed).toBe(false)
      expect(data.apiKey).toBeNull()
      expect(data.deployedAt).toBeNull()
    })

    it('should fetch deployment info successfully for deployed workflow', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing deployment status fetch for deployed workflow')

      const deployedWorkflow = {
        ...sampleWorkflowData,
        isDeployed: true,
        deployedAt: new Date('2024-01-01T00:00:00.000Z'),
        deployedState: JSON.stringify(sampleSerializedWorkflow),
      }

      // Configure database to return deployed workflow with API key
      let selectCallCount = 0
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => {
              selectCallCount++
              if (selectCallCount === 1) {
                // Workflow lookup
                return Promise.resolve([deployedWorkflow])
              } else {
                // API key lookup
                return Promise.resolve([{ key: 'sim_deployedkey12345', id: 'api-key-id' }])
              }
            },
          }),
        }),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Deployed status response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.isDeployed).toBe(true)
      expect(data.apiKey).toBe('sim_deployedkey12345')
      expect(data.deployedAt).toBeDefined()
    })
  })

  describe('POST Deployment', () => {
    it('should deploy workflow successfully', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing successful workflow deployment')

      // Configure database select calls for deployment process
      let selectCallCount = 0
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => {
              selectCallCount++
              if (selectCallCount <= 4) {
                // First few calls for workflow data loading
                return Promise.resolve([])
              } else {
                // API key lookup - return empty for new key generation
                return Promise.resolve([])
              }
            },
            orderBy: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        }),
      }))

      const request = createMockRequest('POST')
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Deployment response status: ${response.status}`)
      expect(response.status).toBe(200)

      // Verify workflow was serialized
      expect(mockSerializer.serializeWorkflow).toHaveBeenCalled()

      // Verify API key was generated
      expect(mockUtils.generateApiKey).toHaveBeenCalled()

      // Verify database update was called
      expect(mocks.database.mockDb.update).toHaveBeenCalled()
    })

    it('should handle deployment of already deployed workflow', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing deployment of already deployed workflow')

      const deployedWorkflow = {
        ...sampleWorkflowData,
        isDeployed: true,
        deployedAt: new Date('2024-01-01T00:00:00.000Z'),
      }

      // Configure middleware to return already deployed workflow
      mockWorkflowMiddleware.validateWorkflowAccess.mockResolvedValue({
        workflow: deployedWorkflow,
      })

      const request = createMockRequest('POST')
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Already deployed response status: ${response.status}`)
      expect(response.status).toBe(200)

      // Should still update the deployment with fresh state
      expect(mockSerializer.serializeWorkflow).toHaveBeenCalled()
    })
  })

  describe('DELETE Undeployment', () => {
    it('should undeploy workflow successfully', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing successful workflow undeployment')

      const deployedWorkflow = {
        ...sampleWorkflowData,
        isDeployed: true,
        deployedAt: new Date('2024-01-01T00:00:00.000Z'),
      }

      // Configure middleware to return deployed workflow
      mockWorkflowMiddleware.validateWorkflowAccess.mockResolvedValue({
        workflow: deployedWorkflow,
      })

      const request = createMockRequest('DELETE')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Undeployment response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.isDeployed).toBe(false)
      expect(data.deployedAt).toBeNull()
      expect(data.apiKey).toBeNull()

      // Verify database update was called
      expect(mocks.database.mockDb.update).toHaveBeenCalled()
    })

    it('should handle undeployment of already undeployed workflow', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing undeployment of already undeployed workflow')

      const undeployedWorkflow = {
        ...sampleWorkflowData,
        isDeployed: false,
        deployedAt: null,
      }

      // Configure middleware to return undeployed workflow
      mockWorkflowMiddleware.validateWorkflowAccess.mockResolvedValue({
        workflow: undeployedWorkflow,
      })

      const request = createMockRequest('DELETE')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Already undeployed response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.isDeployed).toBe(false)
      expect(data.deployedAt).toBeNull()

      // Should still perform the undeployment operation
      expect(mocks.database.mockDb.update).toHaveBeenCalled()
    })
  })

  describe('API Key Management', () => {
    it('should generate new API key during deployment', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing API key generation during deployment')

      // Configure database to return no existing API key
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
            orderBy: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        }),
      }))

      const request = createMockRequest('POST')
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] API key generation response status: ${response.status}`)
      expect(response.status).toBe(200)

      // Verify new API key was generated
      expect(mockUtils.generateApiKey).toHaveBeenCalled()

      // Verify API key was inserted into database
      expect(mocks.database.mockDb.insert).toHaveBeenCalled()
    })

    it('should reuse existing API key if available', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing API key reuse during deployment')

      const existingApiKey = { key: 'sim_existingkey12345', id: 'existing-api-key-id' }

      // Configure database to return existing API key
      let selectCallCount = 0
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => {
              selectCallCount++
              if (selectCallCount <= 4) {
                // First few calls for workflow data loading
                return Promise.resolve([])
              } else {
                // API key lookup - return existing key
                return Promise.resolve([existingApiKey])
              }
            },
            orderBy: () => ({
              limit: () => Promise.resolve([existingApiKey]),
            }),
          }),
        }),
      }))

      const request = createMockRequest('POST')
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] API key reuse response status: ${response.status}`)
      expect(response.status).toBe(200)

      // Should not generate new API key if one exists
      expect(mockUtils.generateApiKey).not.toHaveBeenCalled()

      // Should not insert new API key
      expect(mocks.database.mockDb.insert).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle workflow state loading errors', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow state loading error handling')

      // Configure state loader to throw error
      mockWorkflowDbHelpers.loadWorkflowFromNormalizedTables.mockRejectedValue(
        new Error('State loading failed')
      )

      const request = createMockRequest('POST')
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] State loading error response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should handle serialization errors during deployment', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing serialization error handling')

      // Configure serializer to throw error
      mockSerializer.serializeWorkflow.mockImplementation(() => {
        throw new Error('Serialization failed')
      })

      const request = createMockRequest('POST')
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Serialization error response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should handle database errors during deployment', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing database error handling during deployment')

      // Configure database update to throw error
      mocks.database.mockDb.update.mockImplementation(() => {
        throw new Error('Database update failed')
      })

      const request = createMockRequest('POST')
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Database error response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should handle database errors during status fetch', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing database error handling during status fetch')

      // Configure database select to throw error
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.reject(new Error('Database connection failed')),
          }),
        }),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Database connection error response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })
})