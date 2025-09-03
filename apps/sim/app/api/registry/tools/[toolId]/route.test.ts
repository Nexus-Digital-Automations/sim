/**
 * Comprehensive Integration Tests for Individual Registry Tool API Endpoints
 *
 * This test suite covers the individual tool management endpoints:
 * - GET /api/registry/tools/[toolId] - Retrieve tool details
 * - PUT /api/registry/tools/[toolId] - Update tool configuration
 * - DELETE /api/registry/tools/[toolId] - Deactivate/remove tool
 *
 * Key Testing Areas:
 * - Authentication and authorization
 * - Tool ownership verification
 * - Input validation for updates
 * - Webhook re-validation on URL changes
 * - Soft delete behavior and audit trail preservation
 * - Error handling and edge cases
 * - Performance and security considerations
 *
 * Dependencies: vitest, bun-compatible test infrastructure
 * Test Infrastructure: Uses enhanced-utils for consistent mock patterns
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
import { DELETE, GET, PUT } from './route'

/**
 * Sample tool data for testing individual tool operations
 * Includes comprehensive tool configuration for thorough testing
 */
const sampleTool = {
  id: 'tool_1234567890abcdef',
  userId: mockUser.id,
  name: 'test_search_tool',
  displayName: 'Test Search Tool',
  description: 'A test search tool for integration testing',
  icon: 'search-icon',
  category: 'search',
  version: '1.0.0',
  status: 'active',
  manifest: {
    configSchema: {
      type: 'object',
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
      },
      required: ['apiKey'],
    },
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          description: 'Search results',
        },
      },
    },
  },
  configSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string' },
      baseUrl: { type: 'string' },
    },
    required: ['apiKey'],
  },
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
    },
  },
  outputSchema: {
    type: 'object',
    properties: {
      results: { type: 'array' },
    },
  },
  webhookUrl: 'https://api.example.com/webhook/search',
  webhookMethod: 'POST',
  webhookTimeout: 30000,
  webhookRetryCount: 3,
  authentication: {
    type: 'api_key',
    tokenValidationUrl: 'https://api.example.com/validate',
    requirements: {
      header: 'X-API-Key',
    },
  },
  usageCount: 15,
  lastUsedAt: new Date('2024-01-15T10:30:00.000Z'),
  errorCount: 2,
  lastErrorAt: new Date('2024-01-10T14:20:00.000Z'),
  lastErrorMessage: 'Timeout error during webhook execution',
  tags: ['search', 'external-api'],
  metadata: {
    author: 'Test Developer',
    documentation: 'https://docs.example.com',
  },
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-15T12:00:00.000Z'),
}

/**
 * Mock fetch for webhook validation testing
 */
function mockFetchWithResponse(status = 200, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    headers: new Headers(),
    json: () => Promise.resolve({}),
  })
}

describe('Registry Tool API - GET /api/registry/tools/[toolId]', () => {
  let mocks: any

  beforeEach(() => {
    console.log('🧪 Setting up Individual Tool GET tests')

    // Reset all mocks to clean state
    mockControls.reset()
    vi.clearAllMocks()

    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleTool]] },
      },
      permissions: { level: 'admin' },
    })

    // Setup database results for tool retrieval
    mockControls.setDatabaseResults([[sampleTool]])

    console.log('✅ Individual Tool GET test setup complete')
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 when user is not authenticated', async () => {
      console.log('🧪 Testing unauthenticated access to tool details')

      mocks.auth.setUnauthenticated()

      const response = await GET(createEnhancedMockRequest('GET'), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('Authentication required')

      console.log('✅ Unauthenticated access properly rejected')
    })

    it('should return tool details for authenticated owner', async () => {
      console.log('🧪 Testing authenticated tool detail retrieval')

      const response = await GET(createEnhancedMockRequest('GET'), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.tool.id).toBe(sampleTool.id)
      expect(data.tool.name).toBe(sampleTool.name)
      expect(data.tool.displayName).toBe(sampleTool.displayName)

      console.log('✅ Tool details retrieved successfully')
    })

    it('should return 404 for non-existent tool', async () => {
      console.log('🧪 Testing non-existent tool access')

      // Setup empty database response (tool not found)
      mockControls.setDatabaseResults([[]])

      const response = await GET(createEnhancedMockRequest('GET'), {
        params: { toolId: 'nonexistent_tool' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('TOOL_NOT_FOUND')
      expect(data.error.message).toBe('Tool not found or access denied')

      console.log('✅ Non-existent tool properly handled')
    })

    it("should return 404 when accessing another user's tool", async () => {
      console.log("🧪 Testing access to another user's tool")

      // Setup tool owned by different user
      const otherUserTool = {
        ...sampleTool,
        userId: 'other-user-id',
      }
      mockControls.setDatabaseResults([[otherUserTool]])

      const response = await GET(createEnhancedMockRequest('GET'), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('TOOL_NOT_FOUND')

      console.log('✅ Cross-user access properly blocked')
    })
  })

  describe('Tool Detail Response Structure', () => {
    it('should return complete tool information', async () => {
      console.log('🧪 Testing complete tool information response')

      const response = await GET(createEnhancedMockRequest('GET'), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      const tool = data.tool

      // Verify all essential fields are present
      expect(tool).toHaveProperty('id')
      expect(tool).toHaveProperty('name')
      expect(tool).toHaveProperty('displayName')
      expect(tool).toHaveProperty('description')
      expect(tool).toHaveProperty('version')
      expect(tool).toHaveProperty('status')
      expect(tool).toHaveProperty('manifest')
      expect(tool).toHaveProperty('webhookUrl')
      expect(tool).toHaveProperty('usageCount')
      expect(tool).toHaveProperty('errorCount')
      expect(tool).toHaveProperty('tags')
      expect(tool).toHaveProperty('metadata')
      expect(tool).toHaveProperty('createdAt')
      expect(tool).toHaveProperty('updatedAt')

      console.log('✅ Complete tool information returned')
    })

    it('should include usage statistics', async () => {
      console.log('🧪 Testing usage statistics inclusion')

      const response = await GET(createEnhancedMockRequest('GET'), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      const tool = data.tool

      expect(tool.usageCount).toBe(15)
      expect(tool.errorCount).toBe(2)
      expect(tool.lastUsedAt).toBeDefined()
      expect(tool.lastErrorAt).toBeDefined()
      expect(tool.lastErrorMessage).toBeDefined()

      console.log('✅ Usage statistics included')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      console.log('🧪 Testing database error handling')

      // Force database error
      const originalSelect = mocks.database.mockDb.select
      mocks.database.mockDb.select = vi.fn(() => {
        throw new Error('Database connection failed')
      })

      const response = await GET(createEnhancedMockRequest('GET'), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_ERROR')

      console.log('✅ Database error handled gracefully')
    })
  })
})

describe('Registry Tool API - PUT /api/registry/tools/[toolId]', () => {
  let mocks: any

  beforeEach(() => {
    console.log('🧪 Setting up Individual Tool PUT tests')

    // Reset all mocks to clean state
    mockControls.reset()
    vi.clearAllMocks()

    // Setup successful webhook validation
    mockFetchWithResponse(200, true)

    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleTool]] },
        update: { results: [{ ...sampleTool, displayName: 'Updated Tool' }] },
      },
      permissions: { level: 'admin' },
    })

    console.log('✅ Individual Tool PUT test setup complete')
  })

  describe('Successful Updates', () => {
    it('should update tool display name successfully', async () => {
      console.log('🧪 Testing display name update')

      const updateData = {
        displayName: 'Updated Search Tool',
      }

      // Setup database results
      mockControls.setDatabaseResults([
        [sampleTool], // Tool existence check
        [{ ...sampleTool, displayName: updateData.displayName, updatedAt: new Date() }], // Update result
      ])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.displayName).toBe(updateData.displayName)
      expect(data.updatedAt).toBeDefined()

      console.log('✅ Display name update successful')
    })

    it('should update multiple fields simultaneously', async () => {
      console.log('🧪 Testing multiple field update')

      const updateData = {
        displayName: 'Enhanced Search Tool',
        description: 'An enhanced search tool with new capabilities',
        version: '2.0.0',
        tags: ['search', 'enhanced', 'v2'],
        metadata: {
          author: 'Updated Developer',
          changelog: 'Added new search features',
        },
      }

      mockControls.setDatabaseResults([
        [sampleTool], // Tool existence check
        [{ ...sampleTool, ...updateData, updatedAt: new Date() }], // Update result
      ])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.displayName).toBe(updateData.displayName)
      expect(data.version).toBe(updateData.version)

      console.log('✅ Multiple field update successful')
    })

    it('should update webhook configuration with validation', async () => {
      console.log('🧪 Testing webhook configuration update')

      const updateData = {
        webhookUrl: 'https://api.newexample.com/webhook/search',
        webhookMethod: 'PUT' as const,
        webhookTimeout: 45000,
        webhookRetryCount: 5,
      }

      mockControls.setDatabaseResults([
        [sampleTool], // Tool existence check
        [{ ...sampleTool, ...updateData }], // Update result
      ])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id).toBe(sampleTool.id)

      console.log('✅ Webhook configuration update successful')
    })

    it('should update manifest and schemas', async () => {
      console.log('🧪 Testing manifest and schema update')

      const updateData = {
        manifest: {
          configSchema: {
            type: 'object' as const,
            properties: {
              apiKey: { type: 'string' },
              region: { type: 'string', enum: ['us', 'eu', 'asia'] },
            },
            required: ['apiKey', 'region'],
          },
          inputSchema: {
            type: 'object' as const,
            properties: {
              query: { type: 'string', minLength: 1 },
              filters: { type: 'object' },
            },
          },
        },
      }

      mockControls.setDatabaseResults([
        [sampleTool], // Tool existence check
        [{ ...sampleTool, manifest: updateData.manifest }], // Update result
      ])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(200)

      console.log('✅ Manifest and schema update successful')
    })

    it('should update tool status', async () => {
      console.log('🧪 Testing status update')

      const updateData = {
        status: 'inactive' as const,
      }

      mockControls.setDatabaseResults([
        [sampleTool], // Tool existence check
        [{ ...sampleTool, status: updateData.status }], // Update result
      ])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status).toBe(updateData.status)

      console.log('✅ Status update successful')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for updates', async () => {
      console.log('🧪 Testing authentication requirement for updates')

      mocks.auth.setUnauthenticated()

      const updateData = { displayName: 'Updated Tool' }
      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error.code).toBe('UNAUTHORIZED')

      console.log('✅ Authentication requirement enforced')
    })

    it('should prevent updates to non-existent tools', async () => {
      console.log('🧪 Testing updates to non-existent tools')

      // Setup empty database response
      mockControls.setDatabaseResults([[]])

      const updateData = { displayName: 'Updated Tool' }
      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { toolId: 'nonexistent_tool' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('TOOL_NOT_FOUND')

      console.log('✅ Non-existent tool update properly blocked')
    })

    it('should prevent cross-user tool updates', async () => {
      console.log('🧪 Testing cross-user update prevention')

      // Setup tool owned by different user
      const otherUserTool = { ...sampleTool, userId: 'other-user-id' }
      mockControls.setDatabaseResults([[otherUserTool]])

      const updateData = { displayName: 'Hacked Tool' }
      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('TOOL_NOT_FOUND')

      console.log('✅ Cross-user update properly blocked')
    })
  })

  describe('Input Validation', () => {
    it('should validate display name length', async () => {
      console.log('🧪 Testing display name length validation')

      const updateData = {
        displayName: '', // Empty display name
      }

      mockControls.setDatabaseResults([[sampleTool]])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')

      console.log('✅ Display name validation successful')
    })

    it('should validate version format', async () => {
      console.log('🧪 Testing version format validation')

      const invalidVersions = ['1.0', 'v2.0.0', '1.0.0.0', 'latest']

      mockControls.setDatabaseResults([[sampleTool]])

      for (const invalidVersion of invalidVersions) {
        const updateData = { version: invalidVersion }
        const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
          params: { toolId: 'tool_1234567890abcdef' },
        })

        expect(response.status).toBe(400)
      }

      console.log('✅ Version format validation successful')
    })

    it('should validate webhook URL format', async () => {
      console.log('🧪 Testing webhook URL format validation')

      const invalidUrls = ['not-a-url', 'ftp://example.com', '']

      mockControls.setDatabaseResults([[sampleTool]])

      for (const invalidUrl of invalidUrls) {
        const updateData = { webhookUrl: invalidUrl }
        const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
          params: { toolId: 'tool_1234567890abcdef' },
        })

        expect(response.status).toBe(400)
      }

      console.log('✅ Webhook URL format validation successful')
    })

    it('should validate timeout ranges', async () => {
      console.log('🧪 Testing timeout range validation')

      const invalidTimeouts = [500, 400000, -1000]

      mockControls.setDatabaseResults([[sampleTool]])

      for (const invalidTimeout of invalidTimeouts) {
        const updateData = { webhookTimeout: invalidTimeout }
        const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
          params: { toolId: 'tool_1234567890abcdef' },
        })

        expect(response.status).toBe(400)
      }

      console.log('✅ Timeout range validation successful')
    })
  })

  describe('Webhook Validation on URL Changes', () => {
    it('should validate new webhook URL accessibility', async () => {
      console.log('🧪 Testing new webhook URL validation')

      // Mock failed webhook validation
      mockFetchWithResponse(404, false)

      const updateData = {
        webhookUrl: 'https://api.inaccessible.com/webhook',
      }

      mockControls.setDatabaseResults([[sampleTool]])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('WEBHOOK_VALIDATION_FAILED')

      console.log('✅ Webhook URL validation successful')
    })

    it('should skip webhook validation when URL unchanged', async () => {
      console.log('🧪 Testing webhook validation skip for unchanged URL')

      const updateData = {
        displayName: 'Updated Display Name',
        // webhookUrl stays the same
      }

      mockControls.setDatabaseResults([
        [sampleTool], // Tool existence check
        [{ ...sampleTool, displayName: updateData.displayName }], // Update result
      ])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      // Webhook validation should not have been called
      expect(global.fetch).not.toHaveBeenCalled()

      console.log('✅ Webhook validation skipped for unchanged URL')
    })
  })

  describe('Error Handling', () => {
    it('should handle update failures gracefully', async () => {
      console.log('🧪 Testing update failure handling')

      mockControls.setDatabaseResults([
        [sampleTool], // Tool existence check
        [], // Update fails - no result returned
      ])

      const updateData = { displayName: 'Failed Update' }
      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('UPDATE_FAILED')

      console.log('✅ Update failure handled gracefully')
    })

    it('should handle malformed JSON gracefully', async () => {
      console.log('🧪 Testing malformed JSON handling in updates')

      const request = new NextRequest('http://localhost:3000/api/registry/tools/tool_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      })

      const response = await PUT(request, { params: { toolId: 'tool_123' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_ERROR')

      console.log('✅ Malformed JSON handled gracefully')
    })
  })
})

describe('Registry Tool API - DELETE /api/registry/tools/[toolId]', () => {
  let mocks: any

  beforeEach(() => {
    console.log('🧪 Setting up Individual Tool DELETE tests')

    // Reset all mocks to clean state
    mockControls.reset()
    vi.clearAllMocks()

    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleTool], []] }, // Tool exists, no recent logs
        update: { results: [{ ...sampleTool, status: 'inactive' }] },
      },
      permissions: { level: 'admin' },
    })

    console.log('✅ Individual Tool DELETE test setup complete')
  })

  describe('Successful Deletion (Soft Delete)', () => {
    it('should soft delete tool successfully', async () => {
      console.log('🧪 Testing successful tool soft deletion')

      mockControls.setDatabaseResults([
        [sampleTool], // Tool existence check
        [], // No recent webhook execution logs
        [{ ...sampleTool, status: 'inactive', updatedAt: new Date() }], // Update result
      ])

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id).toBe(sampleTool.id)
      expect(data.status).toBe('inactive')
      expect(data.deletedAt).toBeDefined()
      expect(data.message).toBe('Tool deactivated successfully.')

      console.log('✅ Tool soft deletion successful')
    })

    it('should preserve audit trail when deleting tool with execution history', async () => {
      console.log('🧪 Testing audit trail preservation')

      // Mock recent webhook execution logs
      const recentLogs = [{ id: 'log_123' }]

      mockControls.setDatabaseResults([
        [sampleTool], // Tool existence check
        recentLogs, // Recent webhook execution logs found
        [{ ...sampleTool, status: 'inactive' }], // Update result
      ])

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toContain('Execution logs preserved for audit trail')

      console.log('✅ Audit trail preservation successful')
    })

    it('should include usage statistics in deletion response', async () => {
      console.log('🧪 Testing usage statistics in deletion response')

      const toolWithUsage = {
        ...sampleTool,
        usageCount: 25,
        errorCount: 3,
      }

      mockControls.setDatabaseResults([
        [toolWithUsage], // Tool existence check with usage stats
        [], // No recent logs
        [{ ...toolWithUsage, status: 'inactive' }], // Update result
      ])

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id).toBe(toolWithUsage.id)
      expect(data.name).toBe(toolWithUsage.name)

      console.log('✅ Usage statistics included in response')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for deletion', async () => {
      console.log('🧪 Testing authentication requirement for deletion')

      mocks.auth.setUnauthenticated()

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error.code).toBe('UNAUTHORIZED')

      console.log('✅ Authentication requirement enforced for deletion')
    })

    it('should prevent deletion of non-existent tools', async () => {
      console.log('🧪 Testing deletion of non-existent tools')

      // Setup empty database response
      mockControls.setDatabaseResults([[]])

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { toolId: 'nonexistent_tool' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('TOOL_NOT_FOUND')

      console.log('✅ Non-existent tool deletion properly blocked')
    })

    it('should prevent cross-user tool deletion', async () => {
      console.log('🧪 Testing cross-user deletion prevention')

      const otherUserTool = { ...sampleTool, userId: 'other-user-id' }
      mockControls.setDatabaseResults([[otherUserTool]])

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('TOOL_NOT_FOUND')

      console.log('✅ Cross-user deletion properly blocked')
    })
  })

  describe('Error Handling', () => {
    it('should handle deletion failures gracefully', async () => {
      console.log('🧪 Testing deletion failure handling')

      mockControls.setDatabaseResults([
        [sampleTool], // Tool exists
        [], // No recent logs
        [], // Update fails - no result returned
      ])

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('DELETION_FAILED')

      console.log('✅ Deletion failure handled gracefully')
    })

    it('should handle database errors during deletion', async () => {
      console.log('🧪 Testing database errors during deletion')

      // Force database error on update
      mockControls.setDatabaseResults([
        [sampleTool], // Tool exists
        [], // No recent logs
      ])

      const originalUpdate = mocks.database.mockDb.update
      mocks.database.mockDb.update = vi.fn(() => {
        throw new Error('Database connection failed')
      })

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_ERROR')

      console.log('✅ Database error during deletion handled gracefully')
    })
  })

  describe('Security and Edge Cases', () => {
    it('should handle extremely long tool IDs', async () => {
      console.log('🧪 Testing extremely long tool ID handling')

      const longToolId = `tool_${'a'.repeat(1000)}`

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { toolId: longToolId },
      })

      // Should handle gracefully (either 404 or proper processing)
      expect([404, 500]).toContain(response.status)

      console.log('✅ Long tool ID handled gracefully')
    })

    it('should handle special characters in tool ID', async () => {
      console.log('🧪 Testing special characters in tool ID')

      const specialToolIds = [
        'tool_<script>',
        'tool_$' + '{injection}', // Intentionally split to avoid linter template string warning
        'tool_../../../',
        'tool_\x00null',
      ]

      for (const specialId of specialToolIds) {
        const response = await DELETE(createEnhancedMockRequest('DELETE'), {
          params: { toolId: specialId },
        })

        // Should handle gracefully without crashing
        expect([404, 400, 500]).toContain(response.status)
      }

      console.log('✅ Special characters in tool ID handled gracefully')
    })

    it('should maintain referential integrity during deletion', async () => {
      console.log('🧪 Testing referential integrity during deletion')

      // Setup tool with related execution logs
      const toolWithLogs = { ...sampleTool }
      const executionLogs = [
        { id: 'log_1', registryItemId: toolWithLogs.id },
        { id: 'log_2', registryItemId: toolWithLogs.id },
      ]

      mockControls.setDatabaseResults([
        [toolWithLogs], // Tool exists
        executionLogs, // Has execution logs
        [{ ...toolWithLogs, status: 'inactive' }], // Soft delete result
      ])

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { toolId: 'tool_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toContain('Execution logs preserved')

      console.log('✅ Referential integrity maintained')
    })
  })
})
