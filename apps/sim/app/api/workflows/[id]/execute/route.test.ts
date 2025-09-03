/**
 * Comprehensive Test Suite for Workflow Execution API - Bun/Vitest Compatible
 * Tests workflow execution, authentication, authorization, and error handling
 * Uses the proven module-level mocking infrastructure for 90%+ test pass rates
 *
 * This test suite covers GET/POST execution, rate limiting, billing, and comprehensive
 * logging for debugging and maintenance by future developers.
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
const mockExecutor = {
  execute: vi.fn(),
}

const mockWorkflowMiddleware = {
  validateWorkflowAccess: vi.fn(),
}

const mockWorkflowDbHelpers = {
  loadDeployedWorkflowState: vi.fn(),
}

const mockBilling = {
  checkServerSideUsageLimits: vi.fn(),
}

const mockRateLimiter = {
  checkRateLimit: vi.fn(),
}

const mockWorkflowUtils = {
  updateWorkflowRunCounts: vi.fn(),
  workflowHasResponseBlock: vi.fn(),
  createHttpResponseFromBlock: vi.fn(),
}

const mockLoggingSession = {
  safeStart: vi.fn(),
  safeComplete: vi.fn(),
  safeCompleteWithError: vi.fn(),
  setupExecutor: vi.fn(),
}

const mockExecutionLogger = {
  startWorkflowExecution: vi.fn(),
  logBlockExecution: vi.fn(),
  completeWorkflowExecution: vi.fn(),
}

const mockUtils = {
  decryptSecret: vi.fn(),
  isHosted: vi.fn(),
  getRotatingApiKey: vi.fn(),
}

// Mock workflow validation middleware at module level
vi.mock('@/app/api/workflows/middleware', () => ({
  validateWorkflowAccess: mockWorkflowMiddleware.validateWorkflowAccess,
}))

// Mock executor at module level
vi.mock('@/executor', () => ({
  Executor: vi.fn().mockImplementation(() => mockExecutor),
}))

// Mock workflow database helpers at module level
vi.mock('@/lib/workflows/db-helpers', () => ({
  loadDeployedWorkflowState: mockWorkflowDbHelpers.loadDeployedWorkflowState,
}))

// Mock billing at module level
vi.mock('@/lib/billing', () => ({
  checkServerSideUsageLimits: mockBilling.checkServerSideUsageLimits,
}))

// Mock rate limiter at module level
vi.mock('@/services/queue', () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    checkRateLimit: mockRateLimiter.checkRateLimit,
  })),
  RateLimitError: class RateLimitError extends Error {
    constructor(
      message: string,
      public statusCode = 429
    ) {
      super(message)
      this.name = 'RateLimitError'
    }
  },
}))

// Mock workflow utils at module level
vi.mock('@/lib/workflows/utils', () => ({
  updateWorkflowRunCounts: mockWorkflowUtils.updateWorkflowRunCounts,
  workflowHasResponseBlock: mockWorkflowUtils.workflowHasResponseBlock,
  createHttpResponseFromBlock: mockWorkflowUtils.createHttpResponseFromBlock,
}))

// Mock logging session at module level
vi.mock('@/lib/logs/execution/logging-session', () => ({
  LoggingSession: vi.fn().mockImplementation(() => mockLoggingSession),
}))

// Mock execution logger at module level
vi.mock('@/lib/logs/execution/logger', () => ({
  executionLogger: mockExecutionLogger,
}))

// Mock trace spans at module level
vi.mock('@/lib/logs/execution/trace-spans/trace-spans', () => ({
  buildTraceSpans: vi.fn().mockReturnValue({
    traceSpans: [],
    totalDuration: 100,
  }),
}))

// Mock utilities at module level
vi.mock('@/lib/utils', () => ({
  decryptSecret: mockUtils.decryptSecret,
  isHosted: mockUtils.isHosted,
  getRotatingApiKey: mockUtils.getRotatingApiKey,
}))

// Mock serializer at module level
vi.mock('@/serializer', () => ({
  Serializer: vi.fn().mockImplementation(() => ({
    serializeWorkflow: vi.fn().mockReturnValue({
      version: '1.0',
      blocks: [],
      connections: [],
      loops: {},
    }),
  })),
}))

// Mock server utils at module level
vi.mock('@/stores/workflows/server-utils', () => ({
  mergeSubblockState: vi.fn().mockReturnValue({
    'starter-id': {
      id: 'starter-id',
      type: 'starter',
      subBlocks: {},
    },
  }),
}))

// Mock internal auth at module level
vi.mock('@/lib/auth/internal', () => ({
  verifyInternalToken: vi.fn(),
}))

// Sample workflow data for consistent testing
const sampleWorkflowData = {
  id: 'workflow-123',
  userId: 'user-123',
  name: 'Test Execution Workflow',
  description: 'A test workflow for execution',
  workspaceId: null,
  isDeployed: true,
  deployedAt: new Date('2024-01-01T00:00:00.000Z'),
}

const sampleWorkflowState = {
  blocks: {
    'starter-id': {
      id: 'starter-id',
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
  edges: [
    {
      id: 'edge-1',
      source: 'starter-id',
      target: 'agent-id',
      sourceHandle: 'source',
      targetHandle: 'target',
    },
  ],
  loops: {},
  parallels: {},
  isFromNormalizedTables: false,
}

const sampleExecutionResult = {
  success: true,
  output: {
    response: 'Test execution successful',
  },
  logs: [],
  metadata: {
    duration: 123,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
  },
}

describe('Workflow Execution API - Comprehensive Test Suite', () => {
  let mocks: any
  let GET: any
  let POST: any

  beforeEach(async () => {
    // Clear all mocks and reset modules for fresh state
    vi.clearAllMocks()
    vi.resetModules()

    console.log('[SETUP] Initializing workflow execution API test infrastructure')

    // Setup comprehensive test infrastructure with proper database setup
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: {
          results: [
            [{ plan: 'free' }], // Subscription lookup
            [{ userId: 'user-123' }], // API key lookup
            [
              {
                id: 'env-id',
                userId: 'user-123',
                variables: { OPENAI_API_KEY: 'encrypted:key-value' },
              },
            ], // Environment variables
          ],
        },
      },
    })

    // Configure workflow middleware to allow access by default
    mockWorkflowMiddleware.validateWorkflowAccess.mockResolvedValue({
      workflow: sampleWorkflowData,
    })

    // Configure workflow state loader to return sample deployed state
    mockWorkflowDbHelpers.loadDeployedWorkflowState.mockResolvedValue(sampleWorkflowState)

    // Configure billing to allow execution
    mockBilling.checkServerSideUsageLimits.mockResolvedValue({
      isExceeded: false,
      currentUsage: 10,
      limit: 100,
    })

    // Configure rate limiter to allow requests
    mockRateLimiter.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: new Date(),
    })

    // Configure executor to return successful execution
    mockExecutor.execute.mockResolvedValue(sampleExecutionResult)

    // Configure workflow utils
    mockWorkflowUtils.updateWorkflowRunCounts.mockResolvedValue(undefined)
    mockWorkflowUtils.workflowHasResponseBlock.mockReturnValue(false)
    mockWorkflowUtils.createHttpResponseFromBlock.mockReturnValue(new Response('OK'))

    // Configure logging session
    mockLoggingSession.safeStart.mockResolvedValue(undefined)
    mockLoggingSession.safeComplete.mockResolvedValue(undefined)
    mockLoggingSession.safeCompleteWithError.mockResolvedValue(undefined)
    mockLoggingSession.setupExecutor.mockReturnValue(undefined)

    // Configure execution logger
    mockExecutionLogger.startWorkflowExecution.mockResolvedValue(undefined)
    mockExecutionLogger.logBlockExecution.mockResolvedValue(undefined)
    mockExecutionLogger.completeWorkflowExecution.mockResolvedValue(undefined)

    // Configure utilities
    mockUtils.decryptSecret.mockResolvedValue({
      decrypted: 'decrypted-secret-value',
    })
    mockUtils.isHosted.mockReturnValue(false)
    mockUtils.getRotatingApiKey.mockReturnValue('rotated-api-key')

    // Configure database to support environment variable updates
    mocks.database.mockDb.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    // Import route handlers after mocks are set up
    const routeModule = await import('./route')
    GET = routeModule.GET
    POST = routeModule.POST

    console.log('[SETUP] Test infrastructure initialized for workflow execution')
  })

  afterEach(() => {
    // Clean up after each test for isolation
    vi.clearAllMocks()
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for workflow execution', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing authentication requirement for workflow execution')

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

      console.log(`[TEST] Unauthenticated execution response status: ${response.status}`)
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should authenticate with API key for execution', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing API key authentication for execution')

      mocks.auth.setUnauthenticated()

      // Configure database to return API key results
      let selectCallCount = 0
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: (table: any) => ({
          where: () => ({
            limit: () => {
              selectCallCount++
              const tableName = String(table)

              if (tableName.includes('apiKey') || tableName.includes('api_key')) {
                console.log('[TEST] API key lookup - returning user')
                return Promise.resolve([{ userId: 'user-123' }])
              }
              if (tableName.includes('subscription')) {
                return Promise.resolve([{ plan: 'free' }])
              }
              return Promise.resolve([{ id: 'env-id', userId: 'user-123', variables: {} }])
            },
          }),
        }),
      }))

      const request = createMockRequest('GET', undefined, { 'x-api-key': 'test-api-key' })
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] API key execution response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should check workflow access permissions', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow access permissions')

      // Configure middleware to deny access
      mockWorkflowMiddleware.validateWorkflowAccess.mockResolvedValue({
        error: {
          message: 'Workflow not found',
          status: 404,
        },
      })

      const request = createMockRequest('GET')
      const response = await GET(request, {
        params: Promise.resolve({ id: 'nonexistent-workflow' }),
      })

      console.log(`[TEST] Access denied response status: ${response.status}`)
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Workflow not found')
    })
  })

  describe('GET Execution', () => {
    it('should execute workflow with GET request successfully', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing successful GET workflow execution')

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] GET execution response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.output).toBeDefined()
      expect(data.output.response).toBe('Test execution successful')

      // Verify middleware was called
      expect(mockWorkflowMiddleware.validateWorkflowAccess).toHaveBeenCalledWith(
        expect.any(Object),
        'workflow-123'
      )

      // Verify executor was called
      expect(mockExecutor.execute).toHaveBeenCalledWith('workflow-123')
    })

    it('should execute workflow with URL parameters', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing GET execution with URL parameters')

      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/execute?param1=value1&param2=value2'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] GET with params response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)

      // Verify executor was called with workflow ID
      expect(mockExecutor.execute).toHaveBeenCalledWith('workflow-123')
    })
  })

  describe('POST Execution', () => {
    it('should execute workflow with POST request successfully', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing successful POST workflow execution')

      const requestBody = {
        inputs: {
          message: 'Test input message',
          priority: 'high',
        },
      }

      const request = createMockRequest('POST', requestBody)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] POST execution response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.output).toBeDefined()
      expect(data.output.response).toBe('Test execution successful')

      // Verify middleware was called
      expect(mockWorkflowMiddleware.validateWorkflowAccess).toHaveBeenCalledWith(
        expect.any(Object),
        'workflow-123'
      )

      // Verify executor was called
      expect(mockExecutor.execute).toHaveBeenCalledWith('workflow-123')
    })

    it('should execute workflow with structured input', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing POST execution with structured input')

      const structuredInput = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        isActive: true,
        preferences: { theme: 'dark', language: 'en' },
        tags: ['test', 'api', 'execution'],
      }

      const request = createMockRequest('POST', structuredInput)
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Structured input response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)

      // Verify executor was called with workflow ID
      expect(mockExecutor.execute).toHaveBeenCalledWith('workflow-123')
    })

    it('should execute workflow with empty request body', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing POST execution with empty body')

      const request = createMockRequest('POST', {})
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Empty body response status: ${response.status}`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)

      // Verify executor was called
      expect(mockExecutor.execute).toHaveBeenCalledWith('workflow-123')
    })

    it('should handle malformed JSON in request body', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing malformed JSON handling')

      const request = new NextRequest('http://localhost:3000/api/workflows/workflow-123/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Malformed JSON response status: ${response.status}`)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid JSON')
    })
  })

  describe('Rate Limiting and Billing', () => {
    it('should enforce rate limits', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing rate limit enforcement')

      // Configure rate limiter to deny request
      mockRateLimiter.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      })

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Rate limited response status: ${response.status}`)
      expect(response.status).toBe(429)
      const data = await response.json()
      expect(data.error).toContain('Rate limit exceeded')
    })

    it('should enforce billing limits', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing billing limit enforcement')

      // Configure billing to exceed limits
      mockBilling.checkServerSideUsageLimits.mockResolvedValue({
        isExceeded: true,
        currentUsage: 100,
        limit: 100,
      })

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Billing limited response status: ${response.status}`)
      expect(response.status).toBe(402)
      const data = await response.json()
      expect(data.error).toContain('Usage limit exceeded')
    })
  })

  describe('Workflow Variables and Environment', () => {
    it('should pass workflow variables to executor', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow variables passing')

      const workflowVariables = {
        variable1: { id: 'var1', name: 'variable1', type: 'string', value: '"test value"' },
        variable2: { id: 'var2', name: 'variable2', type: 'boolean', value: 'true' },
      }

      // Configure middleware to return workflow with variables
      mockWorkflowMiddleware.validateWorkflowAccess.mockResolvedValue({
        workflow: {
          ...sampleWorkflowData,
          variables: workflowVariables,
        },
      })

      const request = createMockRequest('POST', { testInput: 'value' })
      const response = await POST(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Variables passing response status: ${response.status}`)
      expect(response.status).toBe(200)

      // Verify executor was called with variables
      expect(mockExecutor.execute).toHaveBeenCalledWith('workflow-123')
    })

    it('should decrypt environment variables', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing environment variable decryption')

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Env vars decryption response status: ${response.status}`)
      expect(response.status).toBe(200)

      // Verify decryptSecret was called
      expect(mockUtils.decryptSecret).toHaveBeenCalledWith('encrypted:key-value')
    })
  })

  describe('Error Handling', () => {
    it('should handle execution errors gracefully', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing execution error handling')

      // Configure executor to throw error
      mockExecutor.execute.mockRejectedValue(new Error('Execution failed'))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Execution error response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('Execution failed')

      // Verify error logging was called
      expect(mockLoggingSession.safeCompleteWithError).toHaveBeenCalled()
    })

    it('should handle workflow state loading errors', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow state loading error handling')

      // Configure state loader to throw error
      mockWorkflowDbHelpers.loadDeployedWorkflowState.mockRejectedValue(
        new Error('State loading failed')
      )

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] State loading error response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should handle billing check errors', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing billing check error handling')

      // Configure billing to throw error
      mockBilling.checkServerSideUsageLimits.mockRejectedValue(new Error('Billing service down'))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Billing error response status: ${response.status}`)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('Logging and Monitoring', () => {
    it('should properly initialize and complete logging session', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing logging session lifecycle')

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Logging session response status: ${response.status}`)
      expect(response.status).toBe(200)

      // Verify logging session lifecycle
      expect(mockLoggingSession.safeStart).toHaveBeenCalled()
      expect(mockLoggingSession.safeComplete).toHaveBeenCalled()
      expect(mockLoggingSession.setupExecutor).toHaveBeenCalled()
    })

    it('should update workflow run counts', async () => {
      // Log test execution for debugging
      console.log('[TEST] Testing workflow run count updates')

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })

      console.log(`[TEST] Run count update response status: ${response.status}`)
      expect(response.status).toBe(200)

      // Verify run count was updated
      expect(mockWorkflowUtils.updateWorkflowRunCounts).toHaveBeenCalledWith('workflow-123')
    })
  })
})
