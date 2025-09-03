/**
 * Registry Execution API Route Test Suite - Comprehensive Test Coverage
 *
 * Tests execution functionality for custom registry tools and blocks including:
 * - Tool webhook execution with authentication and configuration
 * - Block execution URL calls with manifest validation
 * - Rate limiting and usage tracking
 * - Timeout handling and error recovery
 * - Performance monitoring and logging
 *
 * Key Features Tested:
 * - Authentication and authorization
 * - Request validation and parameter handling
 * - Webhook delivery and response processing
 * - Error handling and timeout management
 * - Usage statistics and rate limiting
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/app/api/__test-utils__/module-mocks'
import { setupEnhancedTestMocks } from '@/app/api/__test-utils__/enhanced-utils'
import { mockControls, mockUser } from '@/app/api/__test-utils__/module-mocks'

/**
 * Sample tool and block data for testing execution scenarios
 */
const sampleTool = {
  id: 'tool_123456789',
  name: 'test_api_tool',
  displayName: 'Test API Tool',
  userId: mockUser.id,
  webhookUrl: 'https://api.example.com/webhook/tool',
  webhookMethod: 'POST',
  usageCount: 5,
  errorCount: 0,
  status: 'active',
  authentication: {
    type: 'bearer',
    token: 'test-bearer-token-12345',
  },
  webhookTimeout: 30000,
  version: '1.0.0',
  category: 'api',
}

const sampleBlock = {
  id: 'block_987654321',
  name: 'test_processor_block',
  displayName: 'Test Processor Block',
  userId: mockUser.id,
  executionUrl: 'https://api.example.com/execute/block',
  validationUrl: 'https://api.example.com/validate/block',
  usageCount: 3,
  errorCount: 0,
  status: 'active',
  inputPorts: [{ name: 'input', type: 'string', required: true, description: 'Input data' }],
  outputPorts: [{ name: 'output', type: 'string', required: true, description: 'Output data' }],
  executionTimeout: 120000,
  version: '2.0.0',
  category: 'processing',
}

const sampleToolExecutionRequest = {
  toolId: sampleTool.id,
  inputs: {
    query: 'test query',
    parameters: { limit: 10, format: 'json' },
  },
  config: {
    apiKey: 'test-config-api-key',
    timeout: 15000,
  },
  executionId: 'exec_tool_test_123',
}

const sampleBlockExecutionRequest = {
  blockId: sampleBlock.id,
  inputs: {
    input: 'test input data for processing',
  },
  config: {
    processingMode: 'fast',
    outputFormat: 'structured',
  },
  executionId: 'exec_block_test_456',
}

/**
 * Mock fetch responses for webhook execution testing
 */
function mockWebhookResponse(success = true, data = null, status = 200) {
  const responseData =
    data || (success ? { result: 'success', processed: true } : { error: 'failed' })

  global.fetch = vi.fn().mockResolvedValue({
    ok: success,
    status: status,
    statusText: success ? 'OK' : 'Bad Request',
    json: () => Promise.resolve(responseData),
    headers: new Headers({
      'content-type': 'application/json',
    }),
  })
}

describe('Registry Execution API - POST /api/registry/execute?type=tool', () => {
  let mocks: any

  beforeEach(() => {
    console.log('🧪 Setting up Registry Execution API tests for tools')

    mockControls.reset()
    vi.clearAllMocks()

    // Setup successful webhook response by default
    mockWebhookResponse(true)

    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleTool], []] }, // Tool found, rate limit check empty
        update: { results: [] }, // Usage tracking updates
      },
      permissions: { level: 'admin' },
    })

    // Setup database results for tool execution
    mockControls.setDatabaseResults([
      [sampleTool], // Tool lookup result
      [], // Rate limit update result
      [], // Tool usage update result
    ])

    console.log('✅ Tool execution test setup complete')
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for tool execution', async () => {
      console.log('🧪 Testing authentication requirement for tool execution')

      mocks.auth.setUnauthenticated()

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=tool', {
        method: 'POST',
        body: JSON.stringify(sampleToolExecutionRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error.code).toBe('UNAUTHORIZED')

      console.log('✅ Authentication requirement enforced for tool execution')
    })

    it('should validate tool ownership and access', async () => {
      console.log('🧪 Testing tool ownership validation')

      // Mock tool not found (user doesn't own it)
      mockControls.setDatabaseResults([
        [], // No tool found for this user
      ])

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=tool', {
        method: 'POST',
        body: JSON.stringify(sampleToolExecutionRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error.code).toBe('TOOL_NOT_FOUND')

      console.log('✅ Tool ownership validation successful')
    })
  })

  describe('Tool Execution Success Cases', () => {
    it('should execute tool webhook successfully', async () => {
      console.log('🧪 Testing successful tool webhook execution')

      const expectedResponse = {
        result: 'Tool executed successfully',
        data: { processed: 10, status: 'completed' },
        timestamp: new Date().toISOString(),
      }
      mockWebhookResponse(true, expectedResponse)

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=tool', {
        method: 'POST',
        body: JSON.stringify(sampleToolExecutionRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.toolId).toBe(sampleTool.id)
      expect(responseData.executionId).toBe(sampleToolExecutionRequest.executionId)
      expect(responseData.data).toEqual(expectedResponse)
      expect(responseData.executionTime).toBeGreaterThan(0)

      console.log('✅ Tool webhook execution successful')
    })

    it('should include authentication headers for authenticated tools', async () => {
      console.log('🧪 Testing authentication header inclusion')

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=tool', {
        method: 'POST',
        body: JSON.stringify(sampleToolExecutionRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      // Verify fetch was called with authentication headers
      expect(fetch).toHaveBeenCalledWith(
        sampleTool.webhookUrl,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${sampleTool.authentication.token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'SimRegistry/1.0',
          }),
        })
      )

      console.log('✅ Authentication headers included correctly')
    })

    it('should handle custom timeout values', async () => {
      console.log('🧪 Testing custom timeout handling')

      const customTimeoutRequest = {
        ...sampleToolExecutionRequest,
        timeout: 45000,
      }

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=tool', {
        method: 'POST',
        body: JSON.stringify(customTimeoutRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)

      console.log('✅ Custom timeout handling successful')
    })
  })

  describe('Tool Execution Error Cases', () => {
    it('should handle webhook failures gracefully', async () => {
      console.log('🧪 Testing webhook failure handling')

      mockWebhookResponse(false, { error: 'Internal server error' }, 500)

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=tool', {
        method: 'POST',
        body: JSON.stringify(sampleToolExecutionRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('Tool webhook returned 500')
      expect(responseData.executionTime).toBeGreaterThan(0)

      console.log('✅ Webhook failure handling successful')
    })

    it('should handle network timeouts', async () => {
      console.log('🧪 Testing network timeout handling')

      // Mock fetch to simulate timeout
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 100)
          })
      )

      const shortTimeoutRequest = {
        ...sampleToolExecutionRequest,
        timeout: 1000, // Short timeout for testing
      }

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=tool', {
        method: 'POST',
        body: JSON.stringify(shortTimeoutRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('Request timeout')

      console.log('✅ Network timeout handling successful')
    })

    it('should validate inactive tools', async () => {
      console.log('🧪 Testing inactive tool validation')

      const inactiveTool = { ...sampleTool, status: 'inactive' }
      mockControls.setDatabaseResults([
        [inactiveTool], // Inactive tool found
      ])

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=tool', {
        method: 'POST',
        body: JSON.stringify(sampleToolExecutionRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error.code).toBe('TOOL_NOT_FOUND')

      console.log('✅ Inactive tool validation successful')
    })
  })

  describe('Input Validation', () => {
    it('should validate required fields', async () => {
      console.log('🧪 Testing required field validation')

      const invalidRequest = {
        // Missing toolId
        inputs: {},
        config: {},
      }

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=tool', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')

      console.log('✅ Required field validation successful')
    })

    it('should validate timeout ranges', async () => {
      console.log('🧪 Testing timeout range validation')

      const invalidTimeouts = [500, 400000] // Too low and too high

      for (const timeout of invalidTimeouts) {
        const invalidRequest = {
          ...sampleToolExecutionRequest,
          timeout,
        }

        const { POST } = await import('@/app/api/registry/execute/route')
        const request = new NextRequest('http://localhost/api/registry/execute?type=tool', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      }

      console.log('✅ Timeout range validation successful')
    })

    it('should require valid execution type', async () => {
      console.log('🧪 Testing execution type validation')

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=invalid', {
        method: 'POST',
        body: JSON.stringify(sampleToolExecutionRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.code).toBe('INVALID_TYPE')

      console.log('✅ Execution type validation successful')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce execution rate limits', async () => {
      console.log('🧪 Testing execution rate limiting')

      // Setup rate limit exceeded scenario
      mockControls.setDatabaseResults([
        [sampleTool], // Tool found
        [
          {
            userId: mockUser.id,
            webhookCalls: 600, // Over the limit
            windowStart: new Date(),
          },
        ], // Rate limit check - exceeded
      ])

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=tool', {
        method: 'POST',
        body: JSON.stringify(sampleToolExecutionRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(429)
      expect(responseData.error.code).toBe('RATE_LIMIT_EXCEEDED')

      console.log('✅ Execution rate limiting successful')
    })
  })

  describe('Usage Tracking', () => {
    it('should update usage statistics on successful execution', async () => {
      console.log('🧪 Testing usage statistics tracking')

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=tool', {
        method: 'POST',
        body: JSON.stringify(sampleToolExecutionRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)

      // Verify database update calls were made for usage tracking
      expect(mocks.database.mockDb.update).toHaveBeenCalled()

      console.log('✅ Usage statistics tracking successful')
    })

    it('should track error counts on failed executions', async () => {
      console.log('🧪 Testing error count tracking')

      mockWebhookResponse(false, { error: 'Tool execution failed' }, 400)

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=tool', {
        method: 'POST',
        body: JSON.stringify(sampleToolExecutionRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(false)

      // Verify error count update was made
      expect(mocks.database.mockDb.update).toHaveBeenCalled()

      console.log('✅ Error count tracking successful')
    })
  })
})

describe('Registry Execution API - POST /api/registry/execute?type=block', () => {
  let mocks: any

  beforeEach(() => {
    console.log('🧪 Setting up Registry Execution API tests for blocks')

    mockControls.reset()
    vi.clearAllMocks()

    // Setup successful execution response by default
    mockWebhookResponse(true, {
      output: 'processed result data',
      metadata: { processingTime: 1234, confidence: 0.95 },
    })

    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleBlock], []] },
        update: { results: [] },
      },
      permissions: { level: 'admin' },
    })

    mockControls.setDatabaseResults([
      [sampleBlock], // Block lookup result
      [], // Rate limit update result
      [], // Block usage update result
    ])

    console.log('✅ Block execution test setup complete')
  })

  describe('Block Execution Success Cases', () => {
    it('should execute block successfully', async () => {
      console.log('🧪 Testing successful block execution')

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=block', {
        method: 'POST',
        body: JSON.stringify(sampleBlockExecutionRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.blockId).toBe(sampleBlock.id)
      expect(responseData.executionId).toBe(sampleBlockExecutionRequest.executionId)
      expect(responseData.data).toBeDefined()
      expect(responseData.executionTime).toBeGreaterThan(0)

      console.log('✅ Block execution successful')
    })

    it('should include port information in execution request', async () => {
      console.log('🧪 Testing port information inclusion')

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=block', {
        method: 'POST',
        body: JSON.stringify(sampleBlockExecutionRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      // Verify fetch was called with port information
      expect(fetch).toHaveBeenCalledWith(
        sampleBlock.executionUrl,
        expect.objectContaining({
          body: expect.stringContaining('inputPorts'),
        })
      )

      console.log('✅ Port information included in execution')
    })

    it('should perform validation when validation URL is provided', async () => {
      console.log('🧪 Testing validation URL execution')

      // Mock successful execution followed by successful validation
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ output: 'test result' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ valid: true }),
        })

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=block', {
        method: 'POST',
        body: JSON.stringify(sampleBlockExecutionRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)

      // Verify both execution and validation URLs were called
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(fetch).toHaveBeenNthCalledWith(1, sampleBlock.executionUrl, expect.any(Object))
      expect(fetch).toHaveBeenNthCalledWith(2, sampleBlock.validationUrl, expect.any(Object))

      console.log('✅ Validation URL execution successful')
    })
  })

  describe('Block Execution Error Cases', () => {
    it('should handle execution URL failures', async () => {
      console.log('🧪 Testing execution URL failure handling')

      mockWebhookResponse(false, { error: 'Block processing failed' }, 500)

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=block', {
        method: 'POST',
        body: JSON.stringify(sampleBlockExecutionRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('Block execution URL returned 500')

      console.log('✅ Execution URL failure handling successful')
    })

    it('should handle validation failures gracefully', async () => {
      console.log('🧪 Testing validation failure handling')

      // Mock successful execution but failed validation
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ output: 'test result' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Validation Failed',
        })

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=block', {
        method: 'POST',
        body: JSON.stringify(sampleBlockExecutionRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      // Should still succeed even if validation fails (validation is optional)
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)

      console.log('✅ Validation failure handled gracefully')
    })
  })

  describe('Block-Specific Validation', () => {
    it('should validate block timeout ranges', async () => {
      console.log('🧪 Testing block timeout validation')

      const invalidRequest = {
        ...sampleBlockExecutionRequest,
        timeout: 700000, // Over 10 minute limit for blocks
      }

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=block', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')

      console.log('✅ Block timeout validation successful')
    })

    it('should have different rate limits than tools', async () => {
      console.log('🧪 Testing block-specific rate limits')

      // Setup rate limit exceeded for blocks (lower limit than tools)
      mockControls.setDatabaseResults([
        [sampleBlock], // Block found
        [
          {
            userId: mockUser.id,
            webhookCalls: 250, // Over block limit (200) but under tool limit (500)
            windowStart: new Date(),
          },
        ], // Rate limit check - exceeded
      ])

      const { POST } = await import('@/app/api/registry/execute/route')
      const request = new NextRequest('http://localhost/api/registry/execute?type=block', {
        method: 'POST',
        body: JSON.stringify(sampleBlockExecutionRequest),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(429)
      expect(responseData.error.code).toBe('RATE_LIMIT_EXCEEDED')

      console.log('✅ Block-specific rate limits validated')
    })
  })
})
