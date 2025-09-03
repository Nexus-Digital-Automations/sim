/**
 * Copilot Confirm API Test Suite - Bun/Vitest 3.x Compatible
 *
 * Comprehensive test coverage for copilot confirmation operations with enhanced logging,
 * authentication, validation, and production-ready error handling patterns.
 *
 * Key Features:
 * - Enhanced bun/vitest compatible mocking infrastructure
 * - Comprehensive logging for debugging copilot operations
 * - Production-ready error handling and validation
 * - Secure access control and authentication testing
 * - Redis integration testing with proper mock controls
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

// ================================
// MODULE-LEVEL MOCKS FOR BUN/VITEST COMPATIBILITY
// ================================

// Mock Redis operations at module level
const mockRedisExists = vi.fn()
const mockRedisSet = vi.fn()
const mockGetRedisClient = vi.fn()

// Mock Redis client with factory function
vi.mock('@/lib/redis', () => {
  console.log('📦 Mocking @/lib/redis')
  return {
    getRedisClient: mockGetRedisClient,
  }
})

// Import route handlers AFTER mocks are set up
import { POST } from './route'

// ================================
// TEST DATA DEFINITIONS
// ================================

const sampleToolCallData = {
  toolCallId: 'tool-call-123',
  status: 'success',
  message: 'Tool executed successfully',
}

const testUser = {
  id: 'user-123',
  email: 'test@copilot.com',
  name: 'Test User',
}

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Create mock request for copilot confirm API endpoints
 */
function createMockRequest(
  method = 'POST',
  body?: any,
  headers: Record<string, string> = {}
): NextRequest {
  const baseUrl = 'http://localhost:3000/api/copilot/confirm'

  console.log(`🔧 Creating ${method} request to ${baseUrl}`)

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

  return new NextRequest(baseUrl, requestInit)
}

/**
 * Setup Redis mock client with default behavior
 */
function setupRedisMocks() {
  const mockRedisClient = {
    exists: mockRedisExists,
    set: mockRedisSet,
  }

  mockGetRedisClient.mockReturnValue(mockRedisClient)
  mockRedisExists.mockResolvedValue(1) // Tool call exists by default
  mockRedisSet.mockResolvedValue('OK')

  console.log('🔧 Redis mocks configured')
}

describe('Copilot Confirm API Route', () => {
  /**
   * Setup comprehensive test environment before each test
   */
  beforeEach(() => {
    console.log('\n🧪 Setting up copilot confirm API test environment')

    // Reset all mock controls to clean state
    mockControls.reset()
    vi.clearAllMocks()

    // Setup Redis mocks
    setupRedisMocks()

    console.log('✅ Copilot confirm API test setup complete')
  })

  afterEach(() => {
    console.log('🧹 Cleaning up copilot confirm API test environment')
    vi.clearAllMocks()
  })

  describe('Authentication and Authorization', () => {
    /**
     * Test unauthenticated access returns 401
     */
    it('should return 401 when user is not authenticated', async () => {
      console.log('[TEST] Testing unauthenticated access')

      // Setup unauthenticated state
      mockControls.setUnauthenticated()

      const req = createMockRequest('POST', sampleToolCallData)
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
     * Test missing toolCallId validation
     */
    it('should return 400 for invalid request body - missing toolCallId', async () => {
      console.log('[TEST] Testing missing toolCallId validation')

      const req = createMockRequest('POST', {
        status: 'success',
        // Missing toolCallId
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toContain('Required')
    })

    /**
     * Test missing status validation
     */
    it('should return 400 for invalid request body - missing status', async () => {
      console.log('[TEST] Testing missing status validation')

      const req = createMockRequest('POST', {
        toolCallId: 'tool-call-123',
        // Missing status
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toContain('Invalid request data')
    })

    /**
     * Test invalid status value validation
     */
    it('should return 400 for invalid status value', async () => {
      console.log('[TEST] Testing invalid status value validation')

      const req = createMockRequest('POST', {
        toolCallId: 'tool-call-123',
        status: 'invalid-status',
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toContain('Invalid notification status')
    })

    /**
     * Test empty toolCallId validation
     */
    it('should validate empty toolCallId', async () => {
      console.log('[TEST] Testing empty toolCallId validation')

      const req = createMockRequest('POST', {
        toolCallId: '',
        status: 'success',
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toContain('Tool call ID is required')
    })
  })

  describe('Business Logic', () => {
    beforeEach(() => {
      // Setup authenticated user for business logic tests
      mockControls.setAuthUser(testUser)
    })

    /**
     * Test successful tool call confirmation
     */
    it('should successfully confirm tool call with success status', async () => {
      console.log('[TEST] Testing successful tool call confirmation')

      const req = createMockRequest('POST', {
        toolCallId: 'tool-call-123',
        status: 'success',
        message: 'Tool executed successfully',
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData).toEqual({
        success: true,
        message: 'Tool executed successfully',
        toolCallId: 'tool-call-123',
        status: 'success',
      })

      // Verify Redis operations were called
      expect(mockRedisExists).toHaveBeenCalled()
      expect(mockRedisSet).toHaveBeenCalled()
    })

    /**
     * Test all valid status types
     */
    it('should handle all valid status types', async () => {
      console.log('[TEST] Testing all valid status types')

      const validStatuses = ['success', 'error', 'accepted', 'rejected', 'background']

      for (const status of validStatuses) {
        console.log(`[TEST] Testing status: ${status}`)

        const req = createMockRequest('POST', {
          toolCallId: `tool-call-${status}`,
          status,
        })

        const response = await POST(req)

        expect(response.status).toBe(200)
        const responseData = await response.json()
        expect(responseData.success).toBe(true)
        expect(responseData.status).toBe(status)
        expect(responseData.toolCallId).toBe(`tool-call-${status}`)
      }

      console.log('[TEST] All status types validated successfully')
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockControls.setAuthUser(testUser)
    })

    /**
     * Test Redis client unavailable
     */
    it('should return 400 when Redis client is not available', async () => {
      console.log('[TEST] Testing Redis client unavailable error')

      // Mock Redis client as unavailable
      mockGetRedisClient.mockReturnValue(null)

      const req = createMockRequest('POST', sampleToolCallData)
      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toBe('Failed to update tool call status or tool call not found')
    })

    /**
     * Test tool call not found in Redis
     */
    it('should return 400 when tool call is not found in Redis', async () => {
      console.log('[TEST] Testing tool call not found error')

      // Mock tool call as not existing in Redis
      mockRedisExists.mockResolvedValue(0)

      const req = createMockRequest('POST', {
        toolCallId: 'non-existent-tool',
        status: 'success',
      })

      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toBe('Failed to update tool call status or tool call not found')
    })

    /**
     * Test Redis errors handling
     */
    it('should handle Redis errors gracefully', async () => {
      console.log('[TEST] Testing Redis error handling')

      // Mock Redis operations to throw an error
      mockRedisExists.mockRejectedValue(new Error('Redis connection failed'))

      const req = createMockRequest('POST', sampleToolCallData)
      const response = await POST(req)

      console.log(`[TEST] Response status: ${response.status}`)
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toBe('Failed to update tool call status or tool call not found')
    })

    /**
     * Test invalid JSON handling
     */
    it('should handle JSON parsing errors in request body', async () => {
      console.log('[TEST] Testing JSON parsing error handling')

      // Create a request with invalid JSON
      const req = new NextRequest('http://localhost:3000/api/copilot/confirm', {
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
      expect(responseData.error).toContain('JSON')
    })
  })
})
