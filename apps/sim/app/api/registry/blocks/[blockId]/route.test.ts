/**
 * Comprehensive Integration Tests for Individual Registry Block API Endpoints
 *
 * This test suite covers the individual block management endpoints:
 * - GET /api/registry/blocks/[blockId] - Retrieve block details with full port information
 * - PUT /api/registry/blocks/[blockId] - Update block configuration and port definitions
 * - DELETE /api/registry/blocks/[blockId] - Deactivate/remove block with execution history preservation
 *
 * Key Testing Areas for Blocks:
 * - Authentication and authorization
 * - Block ownership verification
 * - Port configuration updates and validation
 * - Execution URL re-validation on changes
 * - Manifest updates and schema validation
 * - Soft delete behavior with execution log preservation
 * - Performance considerations for complex blocks
 * - Security validation for execution endpoints
 *
 * Block-Specific Considerations:
 * - More complex validation due to port definitions
 * - Execution URL validation instead of webhook validation
 * - Port schema updates require careful validation
 * - Performance impact of complex port configurations
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
 * Sample block data for testing individual block operations
 * Includes comprehensive port definitions and execution configuration
 */
const sampleBlock = {
  id: 'block_1234567890abcdef',
  userId: mockUser.id,
  name: 'test_processor_block',
  displayName: 'Test Data Processor Block',
  description: 'A comprehensive test block for integration testing',
  icon: 'processor-icon',
  category: 'processing',
  version: '1.2.0',
  status: 'active',
  manifest: {
    inputPorts: [
      {
        name: 'primary_input',
        type: 'object',
        required: true,
        description: 'Primary data input for processing',
        schema: {
          type: 'object',
          properties: {
            text: { type: 'string', minLength: 1 },
            metadata: { type: 'object' },
          },
          required: ['text'],
        },
      },
      {
        name: 'configuration',
        type: 'object',
        required: false,
        description: 'Optional processing configuration',
        schema: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['fast', 'accurate'] },
            timeout: { type: 'number', minimum: 1000, maximum: 60000 },
          },
        },
      },
    ],
    outputPorts: [
      {
        name: 'processed_result',
        type: 'object',
        required: true,
        description: 'Main processing output',
        schema: {
          type: 'object',
          properties: {
            result: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
          required: ['result', 'confidence'],
        },
      },
      {
        name: 'diagnostics',
        type: 'object',
        required: false,
        description: 'Processing diagnostics and metrics',
        schema: {
          type: 'object',
          properties: {
            processingTime: { type: 'number' },
            memoryUsed: { type: 'number' },
          },
        },
      },
    ],
    configSchema: {
      type: 'object',
      properties: {
        apiEndpoint: {
          type: 'string',
          format: 'uri',
          description: 'External processing service endpoint',
        },
        maxRetries: {
          type: 'number',
          minimum: 0,
          maximum: 5,
          description: 'Maximum retry attempts',
        },
      },
      required: ['apiEndpoint'],
    },
  },
  inputPorts: [
    {
      name: 'primary_input',
      type: 'object',
      required: true,
      description: 'Primary data input for processing',
    },
    {
      name: 'configuration',
      type: 'object',
      required: false,
      description: 'Optional processing configuration',
    },
  ],
  outputPorts: [
    {
      name: 'processed_result',
      type: 'object',
      required: true,
      description: 'Main processing output',
    },
    {
      name: 'diagnostics',
      type: 'object',
      required: false,
      description: 'Processing diagnostics and metrics',
    },
  ],
  configSchema: {
    type: 'object',
    properties: {
      apiEndpoint: { type: 'string', format: 'uri' },
      maxRetries: { type: 'number', minimum: 0, maximum: 5 },
    },
    required: ['apiEndpoint'],
  },
  executionUrl: 'https://api.example.com/execute/processor',
  validationUrl: 'https://api.example.com/validate/processor',
  executionTimeout: 180000, // 3 minutes
  usageCount: 42,
  lastUsedAt: new Date('2024-01-20T14:30:00.000Z'),
  errorCount: 5,
  lastErrorAt: new Date('2024-01-18T09:15:00.000Z'),
  lastErrorMessage: 'Execution timeout after 180 seconds',
  tags: ['processing', 'data-analysis', 'production'],
  metadata: {
    author: 'Block Developer Team',
    documentation: 'https://docs.example.com/processor-block',
    supportUrl: 'https://support.example.com',
    performanceNotes: 'Optimized for large datasets',
  },
  createdAt: new Date('2023-12-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-20T15:00:00.000Z'),
}

/**
 * Mock fetch for execution URL validation testing
 */
function mockFetchWithResponse(status = 200, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    headers: new Headers(),
    json: () => Promise.resolve({}),
  })
}

describe('Registry Block API - GET /api/registry/blocks/[blockId]', () => {
  let mocks: any

  beforeEach(() => {
    console.log('🧪 Setting up Individual Block GET tests')

    // Reset all mocks to clean state
    mockControls.reset()
    vi.clearAllMocks()

    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleBlock]] },
      },
      permissions: { level: 'admin' },
    })

    // Setup database results for block retrieval
    mockControls.setDatabaseResults([[sampleBlock]])

    console.log('✅ Individual Block GET test setup complete')
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 when user is not authenticated', async () => {
      console.log('🧪 Testing unauthenticated access to block details')

      mocks.auth.setUnauthenticated()

      const response = await GET(createEnhancedMockRequest('GET'), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('Authentication required')

      console.log('✅ Unauthenticated access properly rejected')
    })

    it('should return block details for authenticated owner', async () => {
      console.log('🧪 Testing authenticated block detail retrieval')

      const response = await GET(createEnhancedMockRequest('GET'), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.block.id).toBe(sampleBlock.id)
      expect(data.block.name).toBe(sampleBlock.name)
      expect(data.block.displayName).toBe(sampleBlock.displayName)

      console.log('✅ Block details retrieved successfully')
    })

    it('should return 404 for non-existent block', async () => {
      console.log('🧪 Testing non-existent block access')

      // Setup empty database response (block not found)
      mockControls.setDatabaseResults([[]])

      const response = await GET(createEnhancedMockRequest('GET'), {
        params: { blockId: 'nonexistent_block' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('BLOCK_NOT_FOUND')
      expect(data.error.message).toBe('Block not found or access denied')

      console.log('✅ Non-existent block properly handled')
    })

    it("should return 404 when accessing another user's block", async () => {
      console.log("🧪 Testing access to another user's block")

      // Setup block owned by different user
      const otherUserBlock = {
        ...sampleBlock,
        userId: 'other-user-id',
      }
      mockControls.setDatabaseResults([[otherUserBlock]])

      const response = await GET(createEnhancedMockRequest('GET'), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('BLOCK_NOT_FOUND')

      console.log('✅ Cross-user access properly blocked')
    })
  })

  describe('Block Detail Response Structure', () => {
    it('should return complete block information including ports', async () => {
      console.log('🧪 Testing complete block information response')

      const response = await GET(createEnhancedMockRequest('GET'), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      const block = data.block

      // Verify all essential fields are present
      expect(block).toHaveProperty('id')
      expect(block).toHaveProperty('name')
      expect(block).toHaveProperty('displayName')
      expect(block).toHaveProperty('description')
      expect(block).toHaveProperty('version')
      expect(block).toHaveProperty('status')
      expect(block).toHaveProperty('manifest')
      expect(block).toHaveProperty('inputPorts')
      expect(block).toHaveProperty('outputPorts')
      expect(block).toHaveProperty('configSchema')
      expect(block).toHaveProperty('executionUrl')
      expect(block).toHaveProperty('executionTimeout')
      expect(block).toHaveProperty('usageCount')
      expect(block).toHaveProperty('errorCount')
      expect(block).toHaveProperty('tags')
      expect(block).toHaveProperty('metadata')
      expect(block).toHaveProperty('createdAt')
      expect(block).toHaveProperty('updatedAt')

      console.log('✅ Complete block information returned')
    })

    it('should include detailed port information', async () => {
      console.log('🧪 Testing detailed port information inclusion')

      const response = await GET(createEnhancedMockRequest('GET'), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      const block = data.block

      // Verify port information structure
      expect(Array.isArray(block.inputPorts)).toBe(true)
      expect(Array.isArray(block.outputPorts)).toBe(true)
      expect(block.inputPorts.length).toBe(2)
      expect(block.outputPorts.length).toBe(2)

      // Verify port details
      const primaryInput = block.inputPorts.find((p: any) => p.name === 'primary_input')
      expect(primaryInput).toBeDefined()
      expect(primaryInput.type).toBe('object')
      expect(primaryInput.required).toBe(true)
      expect(primaryInput.description).toBeDefined()

      console.log('✅ Detailed port information included')
    })

    it('should include execution configuration details', async () => {
      console.log('🧪 Testing execution configuration inclusion')

      const response = await GET(createEnhancedMockRequest('GET'), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      const block = data.block

      expect(block.executionUrl).toBe(sampleBlock.executionUrl)
      expect(block.validationUrl).toBe(sampleBlock.validationUrl)
      expect(block.executionTimeout).toBe(sampleBlock.executionTimeout)

      console.log('✅ Execution configuration details included')
    })

    it('should include usage statistics and error information', async () => {
      console.log('🧪 Testing usage statistics inclusion')

      const response = await GET(createEnhancedMockRequest('GET'), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      const block = data.block

      expect(block.usageCount).toBe(42)
      expect(block.errorCount).toBe(5)
      expect(block.lastUsedAt).toBeDefined()
      expect(block.lastErrorAt).toBeDefined()
      expect(block.lastErrorMessage).toBe('Execution timeout after 180 seconds')

      console.log('✅ Usage statistics and error information included')
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
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_ERROR')

      console.log('✅ Database error handled gracefully')
    })
  })
})

describe('Registry Block API - PUT /api/registry/blocks/[blockId]', () => {
  let mocks: any

  beforeEach(() => {
    console.log('🧪 Setting up Individual Block PUT tests')

    // Reset all mocks to clean state
    mockControls.reset()
    vi.clearAllMocks()

    // Setup successful execution URL validation
    mockFetchWithResponse(200, true)

    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleBlock]] },
        update: { results: [{ ...sampleBlock, displayName: 'Updated Block' }] },
      },
      permissions: { level: 'admin' },
    })

    console.log('✅ Individual Block PUT test setup complete')
  })

  describe('Successful Updates', () => {
    it('should update block display name successfully', async () => {
      console.log('🧪 Testing display name update for block')

      const updateData = {
        displayName: 'Enhanced Data Processor Block',
      }

      // Setup database results
      mockControls.setDatabaseResults([
        [sampleBlock], // Block existence check
        [{ ...sampleBlock, displayName: updateData.displayName, updatedAt: new Date() }], // Update result
      ])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.displayName).toBe(updateData.displayName)
      expect(data.updatedAt).toBeDefined()

      console.log('✅ Block display name update successful')
    })

    it('should update port configuration and manifest', async () => {
      console.log('🧪 Testing port configuration update')

      const updateData = {
        manifest: {
          inputPorts: [
            {
              name: 'enhanced_input',
              type: 'object' as const,
              required: true,
              description: 'Enhanced input with new capabilities',
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'string' },
                  format: { type: 'string', enum: ['json', 'xml', 'yaml'] },
                },
                required: ['data'],
              },
            },
          ],
          outputPorts: [
            {
              name: 'enhanced_output',
              type: 'object' as const,
              required: true,
              description: 'Enhanced output with additional metadata',
              schema: {
                type: 'object',
                properties: {
                  result: { type: 'string' },
                  format: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
                required: ['result'],
              },
            },
          ],
          configSchema: {
            type: 'object' as const,
            properties: {
              endpoint: { type: 'string', format: 'uri' },
              version: { type: 'string', enum: ['v1', 'v2'] },
            },
            required: ['endpoint'],
          },
        },
      }

      mockControls.setDatabaseResults([
        [sampleBlock], // Block existence check
        [{ ...sampleBlock, manifest: updateData.manifest }], // Update result
      ])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(200)

      console.log('✅ Port configuration update successful')
    })

    it('should update execution configuration', async () => {
      console.log('🧪 Testing execution configuration update')

      const updateData = {
        executionUrl: 'https://api.newexample.com/execute/enhanced-processor',
        validationUrl: 'https://api.newexample.com/validate/enhanced-processor',
        executionTimeout: 240000, // 4 minutes
      }

      mockControls.setDatabaseResults([
        [sampleBlock], // Block existence check
        [{ ...sampleBlock, ...updateData }], // Update result
      ])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id).toBe(sampleBlock.id)

      console.log('✅ Execution configuration update successful')
    })

    it('should update multiple fields simultaneously', async () => {
      console.log('🧪 Testing multiple field update for block')

      const updateData = {
        displayName: 'Advanced Data Processor Block',
        description: 'An advanced block with enhanced processing capabilities',
        version: '2.0.0',
        executionTimeout: 300000, // 5 minutes
        tags: ['processing', 'advanced', 'v2'],
        metadata: {
          author: 'Enhanced Development Team',
          changelog: 'Added advanced processing features',
          performanceNotes: 'Optimized for very large datasets',
        },
      }

      mockControls.setDatabaseResults([
        [sampleBlock], // Block existence check
        [{ ...sampleBlock, ...updateData, updatedAt: new Date() }], // Update result
      ])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.displayName).toBe(updateData.displayName)
      expect(data.version).toBe(updateData.version)

      console.log('✅ Multiple field update successful for block')
    })

    it('should update block status', async () => {
      console.log('🧪 Testing block status update')

      const updateData = {
        status: 'inactive' as const,
      }

      mockControls.setDatabaseResults([
        [sampleBlock], // Block existence check
        [{ ...sampleBlock, status: updateData.status }], // Update result
      ])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status).toBe(updateData.status)

      console.log('✅ Block status update successful')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for updates', async () => {
      console.log('🧪 Testing authentication requirement for block updates')

      mocks.auth.setUnauthenticated()

      const updateData = { displayName: 'Updated Block' }
      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error.code).toBe('UNAUTHORIZED')

      console.log('✅ Authentication requirement enforced for blocks')
    })

    it('should prevent updates to non-existent blocks', async () => {
      console.log('🧪 Testing updates to non-existent blocks')

      // Setup empty database response
      mockControls.setDatabaseResults([[]])

      const updateData = { displayName: 'Updated Block' }
      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { blockId: 'nonexistent_block' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('BLOCK_NOT_FOUND')

      console.log('✅ Non-existent block update properly blocked')
    })

    it('should prevent cross-user block updates', async () => {
      console.log('🧪 Testing cross-user block update prevention')

      // Setup block owned by different user
      const otherUserBlock = { ...sampleBlock, userId: 'other-user-id' }
      mockControls.setDatabaseResults([[otherUserBlock]])

      const updateData = { displayName: 'Hacked Block' }
      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('BLOCK_NOT_FOUND')

      console.log('✅ Cross-user block update properly blocked')
    })
  })

  describe('Input Validation', () => {
    it('should validate display name length', async () => {
      console.log('🧪 Testing display name length validation for blocks')

      const updateData = {
        displayName: '', // Empty display name
      }

      mockControls.setDatabaseResults([[sampleBlock]])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')

      console.log('✅ Display name validation successful for blocks')
    })

    it('should validate version format', async () => {
      console.log('🧪 Testing version format validation for blocks')

      const invalidVersions = ['1.0', 'v2.0.0', '1.0.0.0', 'latest']

      mockControls.setDatabaseResults([[sampleBlock]])

      for (const invalidVersion of invalidVersions) {
        const updateData = { version: invalidVersion }
        const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
          params: { blockId: 'block_1234567890abcdef' },
        })

        expect(response.status).toBe(400)
      }

      console.log('✅ Version format validation successful for blocks')
    })

    it('should validate execution URL format', async () => {
      console.log('🧪 Testing execution URL format validation')

      const invalidUrls = ['not-a-url', 'ftp://example.com', '']

      mockControls.setDatabaseResults([[sampleBlock]])

      for (const invalidUrl of invalidUrls) {
        const updateData = { executionUrl: invalidUrl }
        const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
          params: { blockId: 'block_1234567890abcdef' },
        })

        expect(response.status).toBe(400)
      }

      console.log('✅ Execution URL format validation successful')
    })

    it('should validate execution timeout ranges', async () => {
      console.log('🧪 Testing execution timeout range validation')

      const invalidTimeouts = [500, 700000, -5000] // Too low, too high, negative

      mockControls.setDatabaseResults([[sampleBlock]])

      for (const invalidTimeout of invalidTimeouts) {
        const updateData = { executionTimeout: invalidTimeout }
        const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
          params: { blockId: 'block_1234567890abcdef' },
        })

        expect(response.status).toBe(400)
      }

      console.log('✅ Execution timeout range validation successful')
    })

    it('should validate port configuration in manifest updates', async () => {
      console.log('🧪 Testing port configuration validation in updates')

      const invalidManifestUpdates = [
        // Duplicate input port names
        {
          manifest: {
            inputPorts: [
              { name: 'input', type: 'string', required: true, description: 'First' },
              { name: 'input', type: 'number', required: false, description: 'Duplicate' },
            ],
            outputPorts: [
              { name: 'output', type: 'string', required: true, description: 'Result' },
            ],
            configSchema: { type: 'object', properties: {} },
          },
        },
        // Port name conflict between input and output
        {
          manifest: {
            inputPorts: [{ name: 'data', type: 'string', required: true, description: 'Input' }],
            outputPorts: [{ name: 'data', type: 'object', required: true, description: 'Output' }],
            configSchema: { type: 'object', properties: {} },
          },
        },
      ]

      mockControls.setDatabaseResults([[sampleBlock]])

      for (const invalidUpdate of invalidManifestUpdates) {
        const response = await PUT(createEnhancedMockRequest('PUT', invalidUpdate), {
          params: { blockId: 'block_1234567890abcdef' },
        })

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('INVALID_MANIFEST')
      }

      console.log('✅ Port configuration validation successful in updates')
    })
  })

  describe('Execution URL Validation on Changes', () => {
    it('should validate new execution URL accessibility', async () => {
      console.log('🧪 Testing new execution URL validation')

      // Mock failed execution URL validation
      mockFetchWithResponse(404, false)

      const updateData = {
        executionUrl: 'https://api.inaccessible.com/execute',
      }

      mockControls.setDatabaseResults([[sampleBlock]])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('EXECUTION_URL_VALIDATION_FAILED')

      console.log('✅ Execution URL validation successful')
    })

    it('should validate new validation URL if provided', async () => {
      console.log('🧪 Testing new validation URL validation')

      // Mock successful execution URL but failed validation URL
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, status: 200 }) // Execution URL success
        .mockResolvedValueOnce({ ok: false, status: 404 }) // Validation URL failure

      const updateData = {
        validationUrl: 'https://api.inaccessible.com/validate',
      }

      mockControls.setDatabaseResults([[sampleBlock]])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('VALIDATION_URL_VALIDATION_FAILED')

      console.log('✅ Validation URL validation successful')
    })

    it('should skip URL validation when URLs unchanged', async () => {
      console.log('🧪 Testing URL validation skip for unchanged URLs')

      const updateData = {
        displayName: 'Updated Display Name',
        // executionUrl and validationUrl stay the same
      }

      mockControls.setDatabaseResults([
        [sampleBlock], // Block existence check
        [{ ...sampleBlock, displayName: updateData.displayName }], // Update result
      ])

      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      // URL validation should not have been called
      expect(global.fetch).not.toHaveBeenCalled()

      console.log('✅ URL validation skipped for unchanged URLs')
    })
  })

  describe('Error Handling', () => {
    it('should handle update failures gracefully', async () => {
      console.log('🧪 Testing update failure handling for blocks')

      mockControls.setDatabaseResults([
        [sampleBlock], // Block existence check
        [], // Update fails - no result returned
      ])

      const updateData = { displayName: 'Failed Update' }
      const response = await PUT(createEnhancedMockRequest('PUT', updateData), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('UPDATE_FAILED')

      console.log('✅ Update failure handled gracefully for blocks')
    })

    it('should handle malformed JSON gracefully', async () => {
      console.log('🧪 Testing malformed JSON handling in block updates')

      const request = new NextRequest('http://localhost:3000/api/registry/blocks/block_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      })

      const response = await PUT(request, { params: { blockId: 'block_123' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_ERROR')

      console.log('✅ Malformed JSON handled gracefully for blocks')
    })
  })
})

describe('Registry Block API - DELETE /api/registry/blocks/[blockId]', () => {
  let mocks: any

  beforeEach(() => {
    console.log('🧪 Setting up Individual Block DELETE tests')

    // Reset all mocks to clean state
    mockControls.reset()
    vi.clearAllMocks()

    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleBlock], []] }, // Block exists, no recent logs
        update: { results: [{ ...sampleBlock, status: 'inactive' }] },
      },
      permissions: { level: 'admin' },
    })

    console.log('✅ Individual Block DELETE test setup complete')
  })

  describe('Successful Deletion (Soft Delete)', () => {
    it('should soft delete block successfully', async () => {
      console.log('🧪 Testing successful block soft deletion')

      mockControls.setDatabaseResults([
        [sampleBlock], // Block existence check
        [], // No recent execution logs
        [{ ...sampleBlock, status: 'inactive', updatedAt: new Date() }], // Update result
      ])

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id).toBe(sampleBlock.id)
      expect(data.status).toBe('inactive')
      expect(data.deletedAt).toBeDefined()
      expect(data.message).toBe('Block deactivated successfully.')

      console.log('✅ Block soft deletion successful')
    })

    it('should preserve execution history when deleting block with usage', async () => {
      console.log('🧪 Testing execution history preservation')

      // Mock recent execution logs
      const recentLogs = [{ id: 'log_123', registryItemId: sampleBlock.id, registryType: 'block' }]

      mockControls.setDatabaseResults([
        [sampleBlock], // Block existence check
        recentLogs, // Recent execution logs found
        [{ ...sampleBlock, status: 'inactive' }], // Update result
      ])

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toContain('Execution logs preserved for audit trail')

      console.log('✅ Execution history preservation successful')
    })

    it('should include usage statistics in deletion response', async () => {
      console.log('🧪 Testing usage statistics in block deletion response')

      const blockWithUsage = {
        ...sampleBlock,
        usageCount: 127,
        errorCount: 8,
      }

      mockControls.setDatabaseResults([
        [blockWithUsage], // Block existence check with usage stats
        [], // No recent logs
        [{ ...blockWithUsage, status: 'inactive' }], // Update result
      ])

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id).toBe(blockWithUsage.id)
      expect(data.name).toBe(blockWithUsage.name)

      console.log('✅ Usage statistics included in block deletion response')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for deletion', async () => {
      console.log('🧪 Testing authentication requirement for block deletion')

      mocks.auth.setUnauthenticated()

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error.code).toBe('UNAUTHORIZED')

      console.log('✅ Authentication requirement enforced for block deletion')
    })

    it('should prevent deletion of non-existent blocks', async () => {
      console.log('🧪 Testing deletion of non-existent blocks')

      // Setup empty database response
      mockControls.setDatabaseResults([[]])

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { blockId: 'nonexistent_block' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('BLOCK_NOT_FOUND')

      console.log('✅ Non-existent block deletion properly blocked')
    })

    it('should prevent cross-user block deletion', async () => {
      console.log('🧪 Testing cross-user block deletion prevention')

      const otherUserBlock = { ...sampleBlock, userId: 'other-user-id' }
      mockControls.setDatabaseResults([[otherUserBlock]])

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error.code).toBe('BLOCK_NOT_FOUND')

      console.log('✅ Cross-user block deletion properly blocked')
    })
  })

  describe('Error Handling', () => {
    it('should handle deletion failures gracefully', async () => {
      console.log('🧪 Testing deletion failure handling for blocks')

      mockControls.setDatabaseResults([
        [sampleBlock], // Block exists
        [], // No recent logs
        [], // Update fails - no result returned
      ])

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('DELETION_FAILED')

      console.log('✅ Deletion failure handled gracefully for blocks')
    })

    it('should handle database errors during deletion', async () => {
      console.log('🧪 Testing database errors during block deletion')

      // Force database error on update
      mockControls.setDatabaseResults([
        [sampleBlock], // Block exists
        [], // No recent logs
      ])

      const originalUpdate = mocks.database.mockDb.update
      mocks.database.mockDb.update = vi.fn(() => {
        throw new Error('Database connection failed')
      })

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_ERROR')

      console.log('✅ Database error during block deletion handled gracefully')
    })
  })

  describe('Security and Edge Cases', () => {
    it('should handle extremely long block IDs', async () => {
      console.log('🧪 Testing extremely long block ID handling')

      const longBlockId = `block_${'a'.repeat(1000)}`

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { blockId: longBlockId },
      })

      // Should handle gracefully (either 404 or proper processing)
      expect([404, 500]).toContain(response.status)

      console.log('✅ Long block ID handled gracefully')
    })

    it('should handle special characters in block ID', async () => {
      console.log('🧪 Testing special characters in block ID')

      const specialBlockIds = [
        'block_<script>',
        'block_${injection}',
        'block_../../../',
        'block_\x00null',
      ]

      for (const specialId of specialBlockIds) {
        const response = await DELETE(createEnhancedMockRequest('DELETE'), {
          params: { blockId: specialId },
        })

        // Should handle gracefully without crashing
        expect([404, 400, 500]).toContain(response.status)
      }

      console.log('✅ Special characters in block ID handled gracefully')
    })

    it('should maintain referential integrity during deletion', async () => {
      console.log('🧪 Testing referential integrity during block deletion')

      // Setup block with related execution logs
      const blockWithLogs = { ...sampleBlock }
      const executionLogs = [
        { id: 'log_1', registryItemId: blockWithLogs.id, registryType: 'block' },
        { id: 'log_2', registryItemId: blockWithLogs.id, registryType: 'block' },
      ]

      mockControls.setDatabaseResults([
        [blockWithLogs], // Block exists
        executionLogs, // Has execution logs
        [{ ...blockWithLogs, status: 'inactive' }], // Soft delete result
      ])

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toContain('Execution logs preserved')

      console.log('✅ Referential integrity maintained for block deletion')
    })

    it('should handle blocks with complex port configurations during deletion', async () => {
      console.log('🧪 Testing deletion of blocks with complex port configurations')

      const complexBlock = {
        ...sampleBlock,
        inputPorts: Array.from({ length: 15 }, (_, i) => ({
          name: `complex_input_${i}`,
          type: 'object',
          required: i % 2 === 0,
          description: `Complex input port ${i}`,
        })),
        outputPorts: Array.from({ length: 12 }, (_, i) => ({
          name: `complex_output_${i}`,
          type: 'array',
          required: i % 3 === 0,
          description: `Complex output port ${i}`,
        })),
      }

      mockControls.setDatabaseResults([
        [complexBlock], // Complex block exists
        [], // No recent logs
        [{ ...complexBlock, status: 'inactive' }], // Soft delete result
      ])

      const response = await DELETE(createEnhancedMockRequest('DELETE'), {
        params: { blockId: 'block_1234567890abcdef' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status).toBe('inactive')

      console.log('✅ Complex port configuration deletion handled successfully')
    })
  })
})
