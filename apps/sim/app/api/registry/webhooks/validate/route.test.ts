/**
 * Registry Webhook Validation API Route Test Suite - Comprehensive Test Coverage
 *
 * Tests webhook validation functionality for custom registry tools and blocks including:
 * - URL accessibility and health checking
 * - Authentication testing for tools
 * - Response time monitoring and metrics
 * - Execution testing with mock payloads
 * - Error handling and edge cases
 *
 * Key Features Tested:
 * - Authentication and authorization
 * - URL validation and accessibility checks
 * - Authentication mechanism testing
 * - Performance monitoring
 * - Error handling and recovery
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/app/api/__test-utils__/module-mocks'
import { setupEnhancedTestMocks } from '@/app/api/__test-utils__/enhanced-utils'
import { mockControls, mockUser } from '@/app/api/__test-utils__/module-mocks'

/**
 * Sample tool and block data for validation testing
 */
const sampleTool = {
  id: 'tool_validation_123',
  name: 'test_webhook_tool',
  displayName: 'Test Webhook Tool',
  userId: mockUser.id,
  webhookUrl: 'https://api.example.com/webhook/tool',
  webhookMethod: 'POST',
  status: 'active',
  authentication: {
    type: 'bearer',
    token: 'test-auth-token-12345',
  },
  version: '1.0.0',
  category: 'api',
}

const sampleToolWithApiKey = {
  id: 'tool_apikey_456',
  name: 'test_apikey_tool',
  displayName: 'Test API Key Tool',
  userId: mockUser.id,
  webhookUrl: 'https://api.example.com/webhook/apikey',
  webhookMethod: 'POST',
  status: 'active',
  authentication: {
    type: 'api_key',
    apiKey: 'test-api-key-67890',
    headerName: 'X-API-Key',
  },
  version: '1.0.0',
  category: 'external',
}

const sampleBlock = {
  id: 'block_validation_789',
  name: 'test_processor_block',
  displayName: 'Test Processor Block',
  userId: mockUser.id,
  executionUrl: 'https://api.example.com/execute/processor',
  validationUrl: 'https://api.example.com/validate/processor',
  status: 'active',
  inputPorts: [{ name: 'input', type: 'string', required: true, description: 'Input data' }],
  outputPorts: [
    { name: 'output', type: 'string', required: true, description: 'Processed output' },
  ],
  version: '2.0.0',
  category: 'processing',
}

/**
 * Mock fetch responses for webhook validation testing
 */
function mockValidationResponse(options: {
  executionOk?: boolean
  validationOk?: boolean
  executionStatus?: number
  validationStatus?: number
  executionTime?: number
  validationTime?: number
  executionData?: any
  validationData?: any
} = {}) {
  const {
    executionOk = true,
    validationOk = true,
    executionStatus = 200,
    validationStatus = 200,
    executionTime = 150,
    validationTime = 75,
    executionData = { success: true, test: true },
    validationData = { valid: true },
  } = options

  let callCount = 0
  global.fetch = vi.fn().mockImplementation(async (url, opts) => {
    callCount++

    // Simulate network delay
    await new Promise((resolve) =>
      setTimeout(resolve, callCount === 1 ? executionTime : validationTime)
    )

    const isValidationUrl = url.toString().includes('validate')
    const ok = isValidationUrl ? validationOk : executionOk
    const status = isValidationUrl ? validationStatus : executionStatus
    const data = isValidationUrl ? validationData : executionData

    return {
      ok,
      status,
      statusText: ok ? 'OK' : 'Bad Request',
      headers: new Headers({
        'content-type': 'application/json',
        'content-length': JSON.stringify(data).length.toString(),
        'x-response-time': `${isValidationUrl ? validationTime : executionTime}ms`,
      }),
      json: () => Promise.resolve(data),
    }
  })
}

describe('Registry Webhook Validation API - POST /api/registry/webhooks/validate', () => {
  let mocks: any

  beforeEach(() => {
    console.log('🧪 Setting up Registry Webhook Validation API tests')

    mockControls.reset()
    vi.clearAllMocks()

    // Setup successful validation response by default
    mockValidationResponse()

    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleTool]] },
      },
      permissions: { level: 'admin' },
    })

    console.log('✅ Webhook validation test setup complete')
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for webhook validation', async () => {
      console.log('🧪 Testing authentication requirement')

      mocks.auth.setUnauthenticated()

      const { POST } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'tool',
          id: sampleTool.id,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error.code).toBe('UNAUTHORIZED')

      console.log('✅ Authentication requirement enforced')
    })

    it('should validate tool ownership', async () => {
      console.log('🧪 Testing tool ownership validation')

      // Mock tool not found (user doesn't own it)
      mockControls.setDatabaseResults([
        [], // No tool found for this user
      ])

      const { POST } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'tool',
          id: sampleTool.id,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error.code).toBe('TOOL_NOT_FOUND')

      console.log('✅ Tool ownership validation successful')
    })

    it('should validate block ownership', async () => {
      console.log('🧪 Testing block ownership validation')

      // Mock block not found
      mockControls.setDatabaseResults([
        [], // No block found for this user
      ])

      const { POST } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'block',
          id: sampleBlock.id,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error.code).toBe('BLOCK_NOT_FOUND')

      console.log('✅ Block ownership validation successful')
    })
  })

  describe('Tool Webhook Validation', () => {
    it('should validate tool webhook successfully', async () => {
      console.log('🧪 Testing successful tool webhook validation')

      mockControls.setDatabaseResults([
        [sampleTool], // Tool found
      ])

      const { POST } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'tool',
          id: sampleTool.id,
          testAuthentication: false,
          testExecution: false,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.type).toBe('tool')
      expect(responseData.id).toBe(sampleTool.id)
      expect(responseData.name).toBe(sampleTool.name)
      expect(responseData.validation.status).toBe('healthy')
      expect(responseData.validation.url).toBe(sampleTool.webhookUrl)
      expect(responseData.validation.responseTime).toBeGreaterThan(0)
      expect(responseData.validation.statusCode).toBe(200)

      console.log('✅ Tool webhook validation successful')
    })

    it('should test Bearer authentication', async () => {
      console.log('🧪 Testing Bearer authentication validation')

      mockControls.setDatabaseResults([
        [sampleTool], // Tool with Bearer authentication
      ])

      const { POST } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'tool',
          id: sampleTool.id,
          testAuthentication: true,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.validation.details.authentication).toBeDefined()
      expect(responseData.validation.details.authentication.type).toBe('bearer')
      expect(responseData.validation.details.authentication.valid).toBe(true)

      // Verify fetch was called with authentication header
      expect(fetch).toHaveBeenCalledWith(
        sampleTool.webhookUrl,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${sampleTool.authentication.token}`,
          }),
        })
      )

      console.log('✅ Bearer authentication validation successful')
    })

    it('should test API key authentication', async () => {
      console.log('🧪 Testing API key authentication validation')

      mockControls.setDatabaseResults([
        [sampleToolWithApiKey], // Tool with API key authentication
      ])

      const { POST } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'tool',
          id: sampleToolWithApiKey.id,
          testAuthentication: true,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.validation.details.authentication).toBeDefined()
      expect(responseData.validation.details.authentication.type).toBe('api_key')
      expect(responseData.validation.details.authentication.valid).toBe(true)

      // Verify fetch was called with API key header
      expect(fetch).toHaveBeenCalledWith(
        sampleToolWithApiKey.webhookUrl,
        expect.objectContaining({
          headers: expect.objectContaining({
            [sampleToolWithApiKey.authentication.headerName]:
              sampleToolWithApiKey.authentication.apiKey,
          }),
        })
      )

      console.log('✅ API key authentication validation successful')
    })

    it('should test webhook execution with mock payload', async () => {
      console.log('🧪 Testing webhook execution validation')

      mockControls.setDatabaseResults([
        [sampleTool], // Tool found
      ])

      const executionResponse = {
        result: 'Test execution successful',
        timestamp: new Date().toISOString(),
        testMode: true,
      }
      mockValidationResponse({
        executionData: executionResponse,
      })

      const { POST } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'tool',
          id: sampleTool.id,
          testExecution: true,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.validation.details.execution).toBeDefined()
      expect(responseData.validation.details.execution.testPassed).toBe(true)
      expect(responseData.validation.details.execution.responseData).toEqual(executionResponse)

      // Verify fetch was called with test payload
      expect(fetch).toHaveBeenCalledWith(
        sampleTool.webhookUrl,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"test":true'),
        })
      )

      console.log('✅ Webhook execution validation successful')
    })

    it('should handle webhook failures gracefully', async () => {
      console.log('🧪 Testing webhook failure handling')

      mockControls.setDatabaseResults([
        [sampleTool], // Tool found
      ])

      mockValidationResponse({
        executionOk: false,
        executionStatus: 500,
      })

      const { POST } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'tool',
          id: sampleTool.id,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.validation.status).toBe('unhealthy')
      expect(responseData.validation.statusCode).toBe(500)
      expect(responseData.validation.error).toContain('HTTP 500')

      console.log('✅ Webhook failure handling successful')
    })

    it('should handle authentication failures', async () => {
      console.log('🧪 Testing authentication failure handling')

      mockControls.setDatabaseResults([
        [sampleTool], // Tool found
      ])

      mockValidationResponse({
        executionOk: false,
        executionStatus: 401,
      })

      const { POST } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'tool',
          id: sampleTool.id,
          testAuthentication: true,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.validation.status).toBe('unhealthy')
      expect(responseData.validation.details.authentication).toBeDefined()
      expect(responseData.validation.details.authentication.valid).toBe(false)
      expect(responseData.validation.details.authentication.error).toBe('Unauthorized')

      console.log('✅ Authentication failure handling successful')
    })

    it('should handle network timeouts', async () => {
      console.log('🧪 Testing network timeout handling')

      mockControls.setDatabaseResults([
        [sampleTool], // Tool found
      ])

      // Mock fetch to timeout
      global.fetch = vi.fn().mockRejectedValue(new Error('Request timeout'))

      const { POST } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'tool',
          id: sampleTool.id,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.validation.status).toBe('unhealthy')
      expect(responseData.validation.error).toContain('Request timeout')

      console.log('✅ Network timeout handling successful')
    })
  })

  describe('Block Validation', () => {
    it('should validate block execution and validation URLs', async () => {
      console.log('🧪 Testing block URL validation')

      mockControls.setDatabaseResults([
        [sampleBlock], // Block found
      ])

      const { POST } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'block',
          id: sampleBlock.id,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.type).toBe('block')
      expect(responseData.id).toBe(sampleBlock.id)
      expect(responseData.validation.execution).toBeDefined()
      expect(responseData.validation.execution.status).toBe('healthy')
      expect(responseData.validation.validation).toBeDefined()
      expect(responseData.validation.validation.status).toBe('healthy')

      // Verify both URLs were tested
      expect(fetch).toHaveBeenCalledWith(sampleBlock.executionUrl, expect.any(Object))
      expect(fetch).toHaveBeenCalledWith(sampleBlock.validationUrl, expect.any(Object))

      console.log('✅ Block URL validation successful')
    })

    it('should test block execution with test payload', async () => {
      console.log('🧪 Testing block execution validation')

      mockControls.setDatabaseResults([
        [sampleBlock], // Block found
      ])

      const { POST } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'block',
          id: sampleBlock.id,
          testExecution: true,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.validation.execution.details.execution).toBeDefined()
      expect(responseData.validation.execution.details.execution.testPassed).toBe(true)

      // Verify execution URL was called with test payload
      expect(fetch).toHaveBeenCalledWith(
        sampleBlock.executionUrl,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"test":true'),
        })
      )

      console.log('✅ Block execution validation successful')
    })

    it('should handle missing validation URL gracefully', async () => {
      console.log('🧪 Testing missing validation URL handling')

      const blockWithoutValidation = {
        ...sampleBlock,
        validationUrl: null,
      }

      mockControls.setDatabaseResults([
        [blockWithoutValidation], // Block without validation URL
      ])

      const { POST } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'block',
          id: blockWithoutValidation.id,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.validation.execution).toBeDefined()
      expect(responseData.validation.validation).toBeUndefined()

      // Only execution URL should be tested
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(fetch).toHaveBeenCalledWith(blockWithoutValidation.executionUrl, expect.any(Object))

      console.log('✅ Missing validation URL handled gracefully')
    })
  })

  describe('Input Validation', () => {
    it('should validate required fields', async () => {
      console.log('🧪 Testing required field validation')

      const invalidRequests = [
        {}, // Missing type and id
        { type: 'tool' }, // Missing id
        { id: 'test_id' }, // Missing type
        { type: 'invalid', id: 'test_id' }, // Invalid type
      ]

      for (const invalidRequest of invalidRequests) {
        const { POST } = await import('@/app/api/registry/webhooks/validate/route')
        const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      }

      console.log('✅ Required field validation successful')
    })

    it('should validate boolean flags', async () => {
      console.log('🧪 Testing boolean flag validation')

      mockControls.setDatabaseResults([
        [sampleTool], // Tool found
      ])

      const { POST } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'tool',
          id: sampleTool.id,
          testAuthentication: true,
          testExecution: true,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.validation.details.authentication).toBeDefined()
      expect(responseData.validation.details.execution).toBeDefined()

      console.log('✅ Boolean flag validation successful')
    })
  })

  describe('Performance Monitoring', () => {
    it('should measure response times accurately', async () => {
      console.log('🧪 Testing response time measurement')

      mockControls.setDatabaseResults([
        [sampleTool], // Tool found
      ])

      mockValidationResponse({
        executionTime: 250, // 250ms response time
      })

      const { POST } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'tool',
          id: sampleTool.id,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.validation.responseTime).toBeGreaterThan(200)
      expect(responseData.validation.responseTime).toBeLessThan(300)

      console.log('✅ Response time measurement accurate')
    })

    it('should include response metadata', async () => {
      console.log('🧪 Testing response metadata inclusion')

      mockControls.setDatabaseResults([
        [sampleTool], // Tool found
      ])

      const { POST } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'tool',
          id: sampleTool.id,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.validation.details).toBeDefined()
      expect(responseData.validation.details.headers).toBeDefined()
      expect(responseData.validation.details.contentType).toBeDefined()
      expect(responseData.validation.details.responseSize).toBeDefined()

      console.log('✅ Response metadata inclusion successful')
    })
  })
})

describe('Registry Webhook Validation API - GET /api/registry/webhooks/validate/status', () => {
  let mocks: any

  beforeEach(() => {
    console.log('🧪 Setting up validation status tests')

    mockControls.reset()
    vi.clearAllMocks()

    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: {
          results: [
            [sampleTool, sampleToolWithApiKey], // Tools
            [sampleBlock], // Blocks
          ],
        },
      },
      permissions: { level: 'admin' },
    })

    console.log('✅ Validation status test setup complete')
  })

  describe('Status Summary', () => {
    it('should return validation status summary for all items', async () => {
      console.log('🧪 Testing validation status summary')

      mockControls.setDatabaseResults([
        [sampleTool, sampleToolWithApiKey], // User's tools
        [sampleBlock], // User's blocks
      ])

      const { GET } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate/status')

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.results).toBeDefined()
      expect(responseData.results.tools).toHaveLength(2)
      expect(responseData.results.blocks).toHaveLength(1)
      expect(responseData.summary).toBeDefined()
      expect(responseData.summary.totalTools).toBe(2)
      expect(responseData.summary.totalBlocks).toBe(1)

      console.log('✅ Validation status summary successful')
    })

    it('should filter by type when specified', async () => {
      console.log('🧪 Testing type-specific status filtering')

      mockControls.setDatabaseResults([
        [sampleTool, sampleToolWithApiKey], // Tools only
      ])

      const { GET } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest(
        'http://localhost/api/registry/webhooks/validate/status?type=tool'
      )

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.results.tools).toHaveLength(2)
      expect(responseData.results.blocks).toBeUndefined()
      expect(responseData.summary.totalTools).toBe(2)
      expect(responseData.summary.totalBlocks).toBe(0)

      console.log('✅ Type-specific status filtering successful')
    })

    it('should identify items with recent errors', async () => {
      console.log('🧪 Testing recent error identification')

      const toolWithRecentError = {
        ...sampleTool,
        errorCount: 3,
        lastErrorAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      }

      mockControls.setDatabaseResults([
        [toolWithRecentError], // Tool with recent errors
        [], // No blocks
      ])

      const { GET } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate/status')

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.results.tools[0].hasRecentErrors).toBe(true)
      expect(responseData.summary.toolsWithRecentErrors).toBe(1)

      console.log('✅ Recent error identification successful')
    })

    it('should require authentication', async () => {
      console.log('🧪 Testing authentication requirement for status')

      mocks.auth.setUnauthenticated()

      const { GET } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate/status')

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error.code).toBe('UNAUTHORIZED')

      console.log('✅ Authentication requirement enforced for status')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      console.log('🧪 Testing database error handling in status endpoint')

      // Mock database error
      mockControls.setDatabaseResults([])
      const originalSelect = mocks.database.mockDb.select
      mocks.database.mockDb.select = vi.fn(() => {
        throw new Error('Database connection failed')
      })

      const { GET } = await import('@/app/api/registry/webhooks/validate/route')
      const request = new NextRequest('http://localhost/api/registry/webhooks/validate/status')

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error.code).toBe('INTERNAL_ERROR')

      console.log('✅ Database error handling successful')
    })
  })
})
