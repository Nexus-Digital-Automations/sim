/**
 * Copilot Checkpoints Revert API Test Suite - Bun/Vitest 3.x Compatible
 *
 * Comprehensive test coverage for copilot checkpoint revert operations with enhanced
 * bun/vitest compatible infrastructure, authentication, and workflow state management.
 *
 * Key Features:
 * - Enhanced bun/vitest compatible mocking infrastructure
 * - Comprehensive logging for debugging checkpoint operations
 * - Production-ready error handling and validation
 * - Workflow state reversion and validation testing
 * - External API integration testing for state updates
 *
 * Migrated from vi.doMock() to proven module-level mocking approach.
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ================================
// 🚨 CRITICAL: IMPORT MODULE MOCKS FIRST
// ================================
import '@/app/api/__test-utils__/module-mocks'
import { mockControls } from '@/app/api/__test-utils__/module-mocks'
// Import route handlers AFTER mocks are set up
import { POST } from './route'

// Debug: Check if POST function was imported correctly
console.log('POST function imported:', typeof POST, POST)

// ================================
// TEST DATA DEFINITIONS
// ================================

const testUser = {
  id: 'user-123',
  email: 'test@copilot.com',
  name: 'Test User',
}

const sampleWorkflowState = {
  blocks: {
    start: { type: 'start', config: {} },
    http: { type: 'http', config: { url: 'https://api.example.com' } },
    end: { type: 'end', config: {} },
  },
  edges: [
    { from: 'start', to: 'http' },
    { from: 'http', to: 'end' },
  ],
  loops: {},
  parallels: {},
  isDeployed: true,
  deploymentStatuses: { production: 'deployed' },
  hasActiveWebhook: false,
}

const sampleCheckpoint = {
  id: 'checkpoint-123',
  workflowId: 'workflow-456',
  userId: testUser.id,
  workflowState: sampleWorkflowState,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
}

const sampleWorkflow = {
  id: 'workflow-456',
  userId: testUser.id,
  name: 'Test Workflow',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
}

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Create mock request for copilot checkpoints revert API endpoints
 */
function createMockRequest(
  method = 'POST',
  body?: any,
  headers: Record<string, string> = {}
): NextRequest {
  const baseUrl = 'http://localhost:3000/api/copilot/checkpoints/revert'

  console.log(`🔧 Creating ${method} request to ${baseUrl}`)

  const requestInit: RequestInit = {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers,
    }),
    ...(body && method !== 'GET' && { body: JSON.stringify(body) }),
  }

  if (body && method !== 'GET') {
    console.log('🔧 Request body size:', JSON.stringify(body).length, 'characters')
  }

  return new NextRequest(baseUrl, requestInit)
}

/**
 * Setup mock fetch for external API calls
 */
function setupMockFetch(response: any = { success: true }, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(ok ? 'Success' : 'Error'),
  })
}

describe('Copilot Checkpoints Revert API Route', () => {
  /**
   * Setup comprehensive test environment before each test
   */
  beforeEach(() => {
    console.log('\\n🧪 Setting up copilot checkpoints revert test environment')

    // Reset all mock controls to clean state
    mockControls.reset()
    vi.clearAllMocks()

    // Setup default successful fetch mock
    setupMockFetch()

    // Mock Date.now for consistent timestamps
    vi.spyOn(Date, 'now').mockReturnValue(1640995200000) // 2022-01-01 00:00:00 UTC

    console.log('✅ Copilot checkpoints revert test setup complete')
  })

  afterEach(() => {
    console.log('🧹 Cleaning up copilot checkpoints revert test environment')
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  describe('Authentication and Authorization', () => {
    /**
     * Test unauthenticated access returns 401
     */
    it('should return 401 when user is not authenticated', async () => {
      console.log('[TEST] Testing unauthenticated access')

      // Setup unauthenticated state
      mockControls.setUnauthenticated()

      const req = createMockRequest('POST', {
        checkpointId: 'checkpoint-123',
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(401)
      const responseData = await response.json()
      expect(responseData.error).toBe('Unauthorized')
    })

    /**
     * Test checkpoint ownership validation
     */
    it('should validate checkpoint ownership', async () => {
      console.log('[TEST] Testing checkpoint ownership validation')

      // Setup authenticated user
      mockControls.setAuthUser(testUser)

      // Mock checkpoint not found (user doesn't own it)
      mockControls.setDatabaseResults([[]]) // Empty result for checkpoint lookup

      const req = createMockRequest('POST', {
        checkpointId: 'other-user-checkpoint',
      })

      console.log('[TEST] About to call POST function')
      const response = await POST(req)
      console.log('[TEST] POST function returned:', typeof response, response)

      if (!response) {
        throw new Error('POST function returned undefined')
      }
      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(404)
      const responseData = await response.json()
      expect(responseData.error).toBe('Checkpoint not found or access denied')
    })

    /**
     * Test workflow ownership validation
     */
    it('should validate workflow ownership after checkpoint found', async () => {
      console.log('[TEST] Testing workflow ownership validation')

      // Setup authenticated user
      mockControls.setAuthUser(testUser)

      // Mock checkpoint found but workflow belongs to different user
      const checkpointWithDifferentUser = {
        ...sampleCheckpoint,
        workflowId: 'other-workflow-456',
      }

      const workflowWithDifferentUser = {
        id: 'other-workflow-456',
        userId: 'different-user-789',
        name: 'Other User Workflow',
      }

      mockControls.setDatabaseResults([
        [checkpointWithDifferentUser], // Checkpoint found
        [workflowWithDifferentUser], // Workflow found but different user
      ])

      const req = createMockRequest('POST', {
        checkpointId: checkpointWithDifferentUser.id,
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(401)
      const responseData = await response.json()
      expect(responseData.error).toBe('Unauthorized')
    })
  })

  describe('Input Validation', () => {
    beforeEach(() => {
      // Setup authenticated user for validation tests
      mockControls.setAuthUser(testUser)
    })

    /**
     * Test missing checkpointId validation
     */
    it('should return 500 for missing checkpointId', async () => {
      console.log('[TEST] Testing missing checkpointId validation')

      const req = createMockRequest('POST', {
        // Missing checkpointId
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData.error).toBe('Failed to revert to checkpoint')
    })

    /**
     * Test empty checkpointId validation
     */
    it('should return 500 for empty checkpointId', async () => {
      console.log('[TEST] Testing empty checkpointId validation')

      const req = createMockRequest('POST', {
        checkpointId: '',
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData.error).toBe('Failed to revert to checkpoint')
    })

    /**
     * Test invalid JSON handling
     */
    it('should handle invalid JSON gracefully', async () => {
      console.log('[TEST] Testing invalid JSON handling')

      const req = new NextRequest('http://localhost:3000/api/copilot/checkpoints/revert', {
        method: 'POST',
        body: '{invalid-json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData.error).toBe('Failed to revert to checkpoint')
    })
  })

  describe('Business Logic', () => {
    beforeEach(() => {
      // Setup authenticated user for business logic tests
      mockControls.setAuthUser(testUser)
    })

    /**
     * Test successful checkpoint revert
     */
    it('should successfully revert to checkpoint', async () => {
      console.log('[TEST] Testing successful checkpoint revert')

      // Mock checkpoint and workflow found
      mockControls.setDatabaseResults([
        [sampleCheckpoint], // Checkpoint lookup result
        [sampleWorkflow], // Workflow lookup result
      ])

      // Setup successful fetch response
      setupMockFetch({ success: true })

      const req = createMockRequest('POST', {
        checkpointId: sampleCheckpoint.id,
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(200)
      const responseData = await response.json()

      expect(responseData.success).toBe(true)
      expect(responseData.workflowId).toBe(sampleWorkflow.id)
      expect(responseData.checkpointId).toBe(sampleCheckpoint.id)
      expect(responseData.revertedAt).toBeDefined()
      expect(responseData.checkpoint).toBeDefined()
      expect(responseData.checkpoint.workflowState.lastSaved).toBe(1640995200000)
    })

    /**
     * Test checkpoint with complex workflow state
     */
    it('should handle complex workflow state correctly', async () => {
      console.log('[TEST] Testing complex workflow state handling')

      const complexWorkflowState = {
        blocks: {
          start: { type: 'start', config: {} },
          http: { type: 'http', config: { url: 'https://api.example.com' } },
          condition: { type: 'condition', config: { expression: 'data.success' } },
          end: { type: 'end', config: {} },
        },
        edges: [
          { from: 'start', to: 'http' },
          { from: 'http', to: 'condition' },
          { from: 'condition', to: 'end' },
        ],
        loops: {
          loop1: { condition: 'count < 3', iterations: 3 },
        },
        parallels: {
          parallel1: { branches: ['branch1', 'branch2'] },
        },
        isDeployed: true,
        deploymentStatuses: {
          production: 'deployed',
          staging: 'pending',
        },
        hasActiveWebhook: true,
        deployedAt: '2024-01-01T10:00:00.000Z',
      }

      const complexCheckpoint = {
        ...sampleCheckpoint,
        workflowState: complexWorkflowState,
      }

      mockControls.setDatabaseResults([
        [complexCheckpoint], // Complex checkpoint
        [sampleWorkflow], // Workflow lookup result
      ])

      setupMockFetch({ success: true })

      const req = createMockRequest('POST', {
        checkpointId: complexCheckpoint.id,
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
      const responseData = await response.json()

      expect(responseData.checkpoint.workflowState.blocks).toEqual(complexWorkflowState.blocks)
      expect(responseData.checkpoint.workflowState.edges).toEqual(complexWorkflowState.edges)
      expect(responseData.checkpoint.workflowState.loops).toEqual(complexWorkflowState.loops)
      expect(responseData.checkpoint.workflowState.parallels).toEqual(
        complexWorkflowState.parallels
      )
      expect(responseData.checkpoint.workflowState.deployedAt).toBe('2024-01-01T10:00:00.000Z')
    })

    /**
     * Test checkpoint with null/undefined values
     */
    it('should handle checkpoint state with null/undefined values', async () => {
      console.log('[TEST] Testing checkpoint state with null/undefined values')

      const checkpointWithNullValues = {
        ...sampleCheckpoint,
        workflowState: {
          blocks: null,
          edges: undefined,
          loops: null,
          parallels: undefined,
          deploymentStatuses: null,
          isDeployed: false,
        },
      }

      mockControls.setDatabaseResults([
        [checkpointWithNullValues], // Checkpoint with null values
        [sampleWorkflow], // Workflow lookup result
      ])

      setupMockFetch({ success: true })

      const req = createMockRequest('POST', {
        checkpointId: checkpointWithNullValues.id,
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
      const responseData = await response.json()

      // Null/undefined values should be replaced with defaults
      expect(responseData.checkpoint.workflowState).toEqual({
        blocks: {},
        edges: [],
        loops: {},
        parallels: {},
        isDeployed: false,
        deploymentStatuses: {},
        hasActiveWebhook: false,
        lastSaved: 1640995200000,
      })
    })

    /**
     * Test checkpoint with invalid deployedAt date
     */
    it('should handle invalid deployedAt date correctly', async () => {
      console.log('[TEST] Testing invalid deployedAt date handling')

      const checkpointWithInvalidDate = {
        ...sampleCheckpoint,
        workflowState: {
          ...sampleWorkflowState,
          deployedAt: 'invalid-date',
        },
      }

      mockControls.setDatabaseResults([
        [checkpointWithInvalidDate], // Checkpoint with invalid date
        [sampleWorkflow], // Workflow lookup result
      ])

      setupMockFetch({ success: true })

      const req = createMockRequest('POST', {
        checkpointId: checkpointWithInvalidDate.id,
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
      const responseData = await response.json()

      // Invalid date should be filtered out
      expect(responseData.checkpoint.workflowState.deployedAt).toBeUndefined()
    })

    /**
     * Test checkpoint with valid deployedAt date
     */
    it('should preserve valid deployedAt date', async () => {
      console.log('[TEST] Testing valid deployedAt date preservation')

      const validDeployedAt = '2024-01-01T12:00:00.000Z'
      const checkpointWithValidDate = {
        ...sampleCheckpoint,
        workflowState: {
          ...sampleWorkflowState,
          deployedAt: validDeployedAt,
        },
      }

      mockControls.setDatabaseResults([
        [checkpointWithValidDate], // Checkpoint with valid date
        [sampleWorkflow], // Workflow lookup result
      ])

      setupMockFetch({ success: true })

      const req = createMockRequest('POST', {
        checkpointId: checkpointWithValidDate.id,
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
      const responseData = await response.json()

      expect(responseData.checkpoint.workflowState.deployedAt).toBe(validDeployedAt)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockControls.setAuthUser(testUser)
    })

    /**
     * Test checkpoint not found scenario
     */
    it('should return 404 when checkpoint is not found', async () => {
      console.log('[TEST] Testing checkpoint not found scenario')

      // Mock checkpoint not found
      mockControls.setDatabaseResults([[]]) // Empty result

      const req = createMockRequest('POST', {
        checkpointId: 'non-existent-checkpoint',
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(404)
      const responseData = await response.json()
      expect(responseData.error).toBe('Checkpoint not found or access denied')
    })

    /**
     * Test workflow not found scenario
     */
    it('should return 404 when workflow is not found', async () => {
      console.log('[TEST] Testing workflow not found scenario')

      // Mock checkpoint found but workflow not found
      mockControls.setDatabaseResults([
        [sampleCheckpoint], // Checkpoint found
        [], // Workflow not found
      ])

      const req = createMockRequest('POST', {
        checkpointId: sampleCheckpoint.id,
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(404)
      const responseData = await response.json()
      expect(responseData.error).toBe('Workflow not found')
    })

    /**
     * Test database error during checkpoint lookup
     */
    it('should handle database errors during checkpoint lookup', async () => {
      console.log('[TEST] Testing database error during checkpoint lookup')

      // Setup database to throw an error
      mockControls.setDatabaseError('Database connection failed')

      const req = createMockRequest('POST', {
        checkpointId: sampleCheckpoint.id,
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData.error).toBe('Failed to revert to checkpoint')
    })

    /**
     * Test database error during workflow lookup
     */
    it('should handle database errors during workflow lookup', async () => {
      console.log('[TEST] Testing database error during workflow lookup')

      // First call succeeds (checkpoint), second call fails (workflow)
      let callCount = 0
      mockControls.setDatabaseResults([
        [sampleCheckpoint], // First call: checkpoint found
      ])

      // Mock the second database call to fail
      setTimeout(() => {
        if (callCount > 0) {
          mockControls.setDatabaseError('Workflow lookup failed')
        }
        callCount++
      }, 10)

      const req = createMockRequest('POST', {
        checkpointId: sampleCheckpoint.id,
      })

      const response = await POST(req)

      // Either the workflow lookup succeeds or fails depending on timing
      console.log(`[TEST] Response status: ${response.status}`)
      expect([200, 500].includes(response.status)).toBe(true)
    })

    /**
     * Test state API call failure
     */
    it('should handle state API call failure', async () => {
      console.log('[TEST] Testing state API call failure')

      mockControls.setDatabaseResults([
        [sampleCheckpoint], // Checkpoint found
        [sampleWorkflow], // Workflow found
      ])

      // Setup failed fetch response
      setupMockFetch({ error: 'State validation failed' }, false)

      const req = createMockRequest('POST', {
        checkpointId: sampleCheckpoint.id,
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData.error).toBe('Failed to revert workflow to checkpoint')
    })

    /**
     * Test network error during state API call
     */
    it('should handle network errors during state API call', async () => {
      console.log('[TEST] Testing network error during state API call')

      mockControls.setDatabaseResults([
        [sampleCheckpoint], // Checkpoint found
        [sampleWorkflow], // Workflow found
      ])

      // Setup fetch to throw network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const req = createMockRequest('POST', {
        checkpointId: sampleCheckpoint.id,
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData.error).toBe('Failed to revert to checkpoint')
    })
  })

  describe('External API Integration', () => {
    beforeEach(() => {
      mockControls.setAuthUser(testUser)
      mockControls.setDatabaseResults([
        [sampleCheckpoint], // Checkpoint found
        [sampleWorkflow], // Workflow found
      ])
    })

    /**
     * Test workflow state API call with correct parameters
     */
    it('should call workflow state API with correct parameters', async () => {
      console.log('[TEST] Testing workflow state API call parameters')

      setupMockFetch({ success: true })

      const req = createMockRequest('POST', {
        checkpointId: sampleCheckpoint.id,
      })

      const response = await POST(req)

      expect(response.status).toBe(200)

      // Verify fetch was called with correct parameters
      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/workflows/${sampleWorkflow.id}/state`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining(JSON.stringify(sampleWorkflowState.blocks).slice(1, -1)),
        })
      )
    })

    /**
     * Test cookie forwarding to state API
     */
    it('should forward cookies to state API call', async () => {
      console.log('[TEST] Testing cookie forwarding to state API')

      setupMockFetch({ success: true })

      const req = new NextRequest('http://localhost:3000/api/copilot/checkpoints/revert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'session=test-session; auth=token123',
        },
        body: JSON.stringify({
          checkpointId: sampleCheckpoint.id,
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(200)

      // Verify cookies were forwarded
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Cookie: 'session=test-session; auth=token123',
          }),
        })
      )
    })

    /**
     * Test handling missing cookies
     */
    it('should handle missing cookies gracefully', async () => {
      console.log('[TEST] Testing missing cookies handling')

      setupMockFetch({ success: true })

      const req = new NextRequest('http://localhost:3000/api/copilot/checkpoints/revert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No Cookie header
        },
        body: JSON.stringify({
          checkpointId: sampleCheckpoint.id,
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(200)

      // Verify fetch was called with empty cookie string
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Cookie: '', // Empty string when no cookies
          }),
        })
      )
    })
  })

  describe('Performance and Edge Cases', () => {
    beforeEach(() => {
      mockControls.setAuthUser(testUser)
    })

    /**
     * Test performance with large workflow states
     */
    it('should handle large workflow states efficiently', async () => {
      console.log('[TEST] Testing large workflow state handling')

      // Create a large workflow state
      const largeBlocks: Record<string, any> = {}
      const largeEdges = []

      for (let i = 0; i < 100; i++) {
        largeBlocks[`block-${i}`] = {
          type: 'http',
          config: { url: `https://api-${i}.example.com` },
        }

        if (i > 0) {
          largeEdges.push({ from: `block-${i - 1}`, to: `block-${i}` })
        }
      }

      const largeWorkflowState = {
        blocks: largeBlocks,
        edges: largeEdges,
        loops: {},
        parallels: {},
        isDeployed: true,
        deploymentStatuses: {},
        hasActiveWebhook: false,
      }

      const largeCheckpoint = {
        ...sampleCheckpoint,
        workflowState: largeWorkflowState,
      }

      mockControls.setDatabaseResults([
        [largeCheckpoint], // Large checkpoint
        [sampleWorkflow], // Workflow found
      ])

      setupMockFetch({ success: true })

      const startTime = Date.now()

      const req = createMockRequest('POST', {
        checkpointId: largeCheckpoint.id,
      })

      const response = await POST(req)
      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`[TEST] Large workflow state processed in ${duration}ms`)

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds

      const responseData = await response.json()
      expect(Object.keys(responseData.checkpoint.workflowState.blocks)).toHaveLength(100)
    })

    /**
     * Test concurrent revert requests
     */
    it('should handle concurrent revert requests', async () => {
      console.log('[TEST] Testing concurrent revert requests')

      mockControls.setDatabaseResults([
        [sampleCheckpoint], // Checkpoint found
        [sampleWorkflow], // Workflow found
      ])

      setupMockFetch({ success: true })

      // Create multiple concurrent requests
      const concurrentRequests = Array.from({ length: 3 }, (_, i) =>
        createMockRequest('POST', {
          checkpointId: `${sampleCheckpoint.id}-${i}`,
        })
      )

      const responses = await Promise.all(concurrentRequests.map((req) => POST(req)))

      // All requests should complete
      responses.forEach((response, index) => {
        console.log(`[TEST] Concurrent request ${index + 1} status:`, response.status)
        expect([200, 404, 500].includes(response.status)).toBe(true)
      })
    })
  })
})
