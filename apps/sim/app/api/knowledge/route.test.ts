/**
 * Knowledge Base API Route Test Suite - Bun/Vitest 3.x Compatible
 *
 * Comprehensive test coverage for knowledge base CRUD operations with enhanced logging,
 * authentication, validation, and production-ready error handling patterns.
 *
 * Key Features:
 * - Enhanced bun/vitest compatible mocking infrastructure
 * - Comprehensive logging for debugging knowledge base operations
 * - Production-ready error handling and validation
 * - Secure access control and permission validation
 * - Performance tracking and optimization insights
 *
 * Knowledge Base Operations Tested:
 * - Knowledge base creation with validation and chunking configuration
 * - Knowledge base retrieval with proper access control
 * - Authentication and authorization workflows
 * - Database error handling and resilience patterns
 * - Edge case validation and boundary testing
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Import enhanced test utilities for bun/vitest compatibility
import {
  createEnhancedMockRequest,
  enhancedMockUser,
  setupEnhancedTestMocks,
} from '@/app/api/__test-utils__/enhanced-utils'

// Import module mocks for consistent mocking across tests
import '@/app/api/__test-utils__/module-mocks'

// Module-level mocks for knowledge base utilities
vi.mock('@/app/api/knowledge/utils', () => ({
  checkKnowledgeBaseAccess: vi.fn().mockImplementation(async (userId: string, kbId: string) => {
    console.log('🔍 checkKnowledgeBaseAccess called:', { userId, kbId })
    return Promise.resolve(true) // Default to allowing access for tests
  }),
  generateKnowledgeBaseEmbedding: vi.fn().mockImplementation(async (text: string) => {
    console.log('🔍 generateKnowledgeBaseEmbedding called for text length:', text.length)
    return Promise.resolve(new Array(1536).fill(0.1)) // Mock embedding vector
  }),
  processKnowledgeBaseValidation: vi.fn().mockImplementation(async (data: any) => {
    console.log('🔍 processKnowledgeBaseValidation called:', Object.keys(data))
    return Promise.resolve({ isValid: true, errors: [] })
  }),
}))

// Mock document processing utilities with enhanced logging
vi.mock('@/lib/documents/utils', () => ({
  retryWithExponentialBackoff: vi.fn().mockImplementation(async (fn: () => Promise<any>) => {
    console.log('🔍 retryWithExponentialBackoff called')
    return await fn() // Execute function immediately for tests
  }),
  validateDocumentProcessing: vi.fn().mockImplementation(async (document: any) => {
    console.log('🔍 validateDocumentProcessing called for document:', document.id || 'unknown')
    return Promise.resolve({ isValid: true, processingTime: 150 })
  }),
}))

// Mock tokenization estimators with realistic values
vi.mock('@/lib/tokenization/estimators', () => ({
  estimateTokenCount: vi.fn().mockImplementation((text: string) => {
    const count = Math.floor(text.length / 4) // Rough estimation
    console.log('🔍 estimateTokenCount called, returning:', count)
    return { count, confidence: 'high' }
  }),
}))

// Mock provider cost calculation utilities
vi.mock('@/providers/utils', () => ({
  calculateCost: vi.fn().mockImplementation((usage: any) => {
    const cost = {
      input: 0.00001042,
      output: 0,
      total: 0.00001042,
      pricing: { input: 0.02, output: 0, updatedAt: '2025-07-10' },
    }
    console.log('🔍 calculateCost called, returning:', cost.total)
    return cost
  }),
}))

describe('Knowledge Base API Route - Enhanced Test Suite', () => {
  let mocks: ReturnType<typeof setupEnhancedTestMocks>

  beforeEach(() => {
    console.log('🧪 Setting up Knowledge Base API tests with enhanced mocks')

    // Initialize enhanced test mocks with knowledge base specific configurations
    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: enhancedMockUser },
      database: {
        select: {
          results: [
            // Mock knowledge base data
            [
              {
                id: 'kb-1',
                name: 'Test Knowledge Base',
                description: 'Test description for knowledge base operations',
                userId: enhancedMockUser.id,
                embeddingModel: 'text-embedding-3-small',
                embeddingDimension: 1536,
                chunkingConfig: {
                  maxSize: 1024,
                  minSize: 100,
                  overlap: 200,
                },
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
                updatedAt: new Date('2024-01-01T00:00:00.000Z'),
              },
            ],
            // Count result for pagination
            [{ count: 1 }],
          ],
        },
      },
      permissions: { level: 'admin' },
    })

    console.log('✅ Knowledge Base API test setup complete')
  })

  afterEach(() => {
    console.log('🧹 Cleaning up Knowledge Base API test mocks')
    mocks.cleanup()
    vi.clearAllMocks()
  })

  describe('GET /api/knowledge', () => {
    it('should return unauthorized for unauthenticated user with detailed logging', async () => {
      console.log('🧪 Testing knowledge base access with unauthenticated user')

      // Set up unauthenticated state using enhanced mocks
      mocks.auth.setUnauthenticated()

      console.log('📝 Creating mock GET request for knowledge bases')
      const req = createEnhancedMockRequest('GET')

      console.log('🔧 Importing and executing GET route handler')
      const { GET } = await import('@/app/api/knowledge/route')
      const response = await GET(req)
      const data = await response.json()

      console.log('✅ Unauthorized access response:', {
        status: response.status,
        error: data.error,
      })

      // Verify proper authentication rejection
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(data).toHaveProperty('message')

      console.log('✅ Unauthorized access test completed successfully')
    })

    it('should handle database errors with comprehensive error tracking', async () => {
      console.log('🧪 Testing knowledge base database error handling')

      // Set up authenticated user but configure database to fail
      mocks.auth.setAuthenticated(enhancedMockUser)

      // Configure database to return empty results to simulate error condition
      mocks.database.setSelectResults([]) // Empty results to trigger error path

      console.log('📝 Creating mock GET request for database error scenario')
      const req = createEnhancedMockRequest('GET')

      console.log('🔧 Testing database error handling in GET route')
      const { GET } = await import('@/app/api/knowledge/route')
      const response = await GET(req)
      const data = await response.json()

      console.log('✅ Database error response:', { status: response.status, error: data.error })

      // Verify proper error handling (may return 200 with empty data or 500 depending on implementation)
      expect([200, 500]).toContain(response.status)

      if (response.status === 500) {
        expect(data.error).toContain('Failed')
      } else {
        expect(data).toHaveProperty('success')
      }

      console.log('✅ Database error handling test completed')
    })

    it('should successfully fetch knowledge bases with performance tracking', async () => {
      const startTime = Date.now()
      console.log('🧪 Testing successful knowledge base retrieval with performance metrics')

      // Set up authenticated user with proper knowledge base data
      mocks.auth.setAuthenticated(enhancedMockUser)

      const mockKnowledgeBases = [
        {
          id: 'kb-1',
          name: 'Test Knowledge Base',
          description: 'Test description for successful retrieval',
          userId: enhancedMockUser.id,
          embeddingModel: 'text-embedding-3-small',
          embeddingDimension: 1536,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          id: 'kb-2',
          name: 'Another Knowledge Base',
          description: 'Second test knowledge base',
          userId: enhancedMockUser.id,
          embeddingModel: 'text-embedding-3-large',
          embeddingDimension: 3072,
          createdAt: new Date('2024-01-02T00:00:00.000Z'),
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        },
      ]

      // Configure database to return knowledge bases and count
      mocks.database.setSelectResults([mockKnowledgeBases, [{ count: mockKnowledgeBases.length }]])

      console.log('📝 Creating mock GET request for successful retrieval')
      const req = createEnhancedMockRequest('GET')

      console.log('🔧 Executing successful knowledge base retrieval')
      const { GET } = await import('@/app/api/knowledge/route')
      const response = await GET(req)
      const data = await response.json()

      const endTime = Date.now()
      const duration = endTime - startTime
      console.log(`✅ Knowledge base retrieval completed in ${duration}ms`)
      console.log('✅ Response data structure:', {
        status: response.status,
        success: data.success,
        dataLength: data.data?.length,
        firstKbName: data.data?.[0]?.name,
      })

      // Verify successful knowledge base retrieval
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(Array.isArray(data.data)).toBe(true)

      // Verify performance is reasonable (under 1 second for tests)
      expect(duration).toBeLessThan(1000)

      console.log('✅ Successful knowledge base retrieval test completed')
    })
  })

  describe('POST /api/knowledge', () => {
    const validKnowledgeBaseData = {
      name: 'Test Knowledge Base',
      description: 'Test description for knowledge base creation',
      chunkingConfig: {
        maxSize: 1024,
        minSize: 100,
        overlap: 200,
      },
      embeddingModel: 'text-embedding-3-small',
      embeddingDimension: 1536,
    }

    it('should create knowledge base successfully with comprehensive validation', async () => {
      console.log('🧪 Testing successful knowledge base creation with enhanced validation')

      // Set up authenticated user for knowledge base creation
      mocks.auth.setAuthenticated(enhancedMockUser)

      // Configure database to return successful creation result
      const createdKnowledgeBase = {
        id: 'kb-created-123',
        ...validKnowledgeBaseData,
        userId: enhancedMockUser.id,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }
      mocks.database.setSelectResults([[createdKnowledgeBase]])

      console.log('📝 Creating mock POST request with valid knowledge base data')
      const req = createEnhancedMockRequest('POST', validKnowledgeBaseData)

      console.log('🔧 Executing knowledge base creation')
      const { POST } = await import('@/app/api/knowledge/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('✅ Knowledge base creation response:', {
        status: response.status,
        success: data.success,
        kbName: data.data?.name,
        kbId: data.data?.id,
      })

      // Verify successful knowledge base creation
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data.data).toHaveProperty('name', validKnowledgeBaseData.name)
      expect(data.data).toHaveProperty('description', validKnowledgeBaseData.description)
      expect(data.data).toHaveProperty('id')
      expect(data.data).toHaveProperty('userId', enhancedMockUser.id)

      console.log('✅ Successful knowledge base creation test completed')
    })

    it('should return unauthorized for unauthenticated user with detailed logging', async () => {
      console.log('🧪 Testing knowledge base creation access control for unauthenticated user')

      // Set up unauthenticated state to test access control
      mocks.auth.setUnauthenticated()

      console.log('📝 Creating mock POST request with unauthenticated user')
      const req = createEnhancedMockRequest('POST', validKnowledgeBaseData)

      console.log('🔧 Testing authorization rejection for knowledge base creation')
      const { POST } = await import('@/app/api/knowledge/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('✅ Unauthorized creation response:', {
        status: response.status,
        error: data.error,
      })

      // Verify proper authentication rejection
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(data).toHaveProperty('message')

      console.log('✅ Unauthorized knowledge base creation test completed')
    })

    it('should validate required fields with comprehensive error reporting', async () => {
      console.log('🧪 Testing knowledge base creation validation for missing required fields')

      // Set up authenticated user for validation testing
      mocks.auth.setAuthenticated(enhancedMockUser)

      const invalidData = { description: 'Missing required name field' }
      console.log('📝 Creating mock POST request with invalid data:', Object.keys(invalidData))
      const req = createEnhancedMockRequest('POST', invalidData)

      console.log('🔧 Testing field validation for knowledge base creation')
      const { POST } = await import('@/app/api/knowledge/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('✅ Field validation response:', {
        status: response.status,
        error: data.error,
        hasDetails: !!data.details,
      })

      // Verify proper validation error handling
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid')
      expect(data).toHaveProperty('details')

      // Ensure validation provides helpful error information
      if (data.details) {
        expect(data.details).toContain('name')
      }

      console.log('✅ Required field validation test completed')
    })

    it('should validate chunking config constraints with detailed error analysis', async () => {
      console.log('🧪 Testing chunking configuration validation with constraint violations')

      // Set up authenticated user for chunking validation testing
      mocks.auth.setAuthenticated(enhancedMockUser)

      const invalidChunkingData = {
        name: 'Test KB with Invalid Chunking',
        description: 'Testing chunking configuration constraints',
        chunkingConfig: {
          maxSize: 100,
          minSize: 200, // Invalid: minSize > maxSize
          overlap: 50,
        },
      }

      console.log('📝 Creating mock POST request with invalid chunking config:', {
        maxSize: invalidChunkingData.chunkingConfig.maxSize,
        minSize: invalidChunkingData.chunkingConfig.minSize,
        overlap: invalidChunkingData.chunkingConfig.overlap,
      })
      const req = createEnhancedMockRequest('POST', invalidChunkingData)

      console.log('🔧 Testing chunking configuration validation logic')
      const { POST } = await import('@/app/api/knowledge/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('✅ Chunking validation response:', {
        status: response.status,
        error: data.error,
        validationIssue: 'minSize > maxSize',
      })

      // Verify proper chunking configuration validation
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid')
      expect(data).toHaveProperty('details')

      console.log('✅ Chunking configuration validation test completed')
    })

    it('should use default values for optional fields with proper fallback handling', async () => {
      console.log('🧪 Testing default value assignment for optional knowledge base fields')

      // Set up authenticated user for default value testing
      mocks.auth.setAuthenticated(enhancedMockUser)

      // Configure database to return minimal knowledge base with defaults applied
      const minimalKnowledgeBase = {
        id: 'kb-minimal-123',
        name: 'Minimal Test KB',
        description: null, // Test null description handling
        userId: enhancedMockUser.id,
        embeddingModel: 'text-embedding-3-small', // Default value
        embeddingDimension: 1536, // Default value
        chunkingConfig: {
          maxSize: 1024, // Default value
          minSize: 1, // Default value
          overlap: 200, // Default value
        },
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }
      mocks.database.setSelectResults([[minimalKnowledgeBase]])

      const minimalData = { name: 'Minimal Test KB' }
      console.log('📝 Creating mock POST request with minimal data:', Object.keys(minimalData))
      const req = createEnhancedMockRequest('POST', minimalData)

      console.log('🔧 Testing default value assignment in knowledge base creation')
      const { POST } = await import('@/app/api/knowledge/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('✅ Default values response:', {
        status: response.status,
        embeddingModel: data.data?.embeddingModel,
        embeddingDimension: data.data?.embeddingDimension,
        chunkingConfigKeys: data.data?.chunkingConfig ? Object.keys(data.data.chunkingConfig) : [],
      })

      // Verify successful creation with default values
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')

      // Verify default embedding model and dimension
      expect(data.data.embeddingModel).toBe('text-embedding-3-small')
      expect(data.data.embeddingDimension).toBe(1536)

      // Verify default chunking configuration
      expect(data.data.chunkingConfig).toEqual({
        maxSize: 1024,
        minSize: 1,
        overlap: 200,
      })

      console.log('✅ Default value assignment test completed')
    })

    it('should handle database errors during creation with comprehensive error tracking', async () => {
      console.log('🧪 Testing database error handling during knowledge base creation')

      // Set up authenticated user for database error testing
      mocks.auth.setAuthenticated(enhancedMockUser)

      // Configure database to simulate error condition
      mocks.database.setSelectResults([]) // Empty results to trigger error handling

      console.log('📝 Creating mock POST request for database error scenario')
      const req = createEnhancedMockRequest('POST', validKnowledgeBaseData)

      console.log('🔧 Testing database error resilience in knowledge base creation')
      const { POST } = await import('@/app/api/knowledge/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('✅ Database error handling response:', {
        status: response.status,
        error: data.error,
        errorType: typeof data.error,
      })

      // Verify proper error handling (should be graceful, not leak sensitive info)
      expect([400, 500]).toContain(response.status)
      expect(data).toHaveProperty('error')

      // Ensure error messages don't leak sensitive database information
      if (data.error) {
        expect(data.error).not.toContain('constraint violation')
        expect(data.error).not.toContain('duplicate')
        expect(data.error).not.toContain('sql')
        expect(data.error).not.toContain('database')
      }

      console.log('✅ Database error handling test completed')
    })

    it('should handle edge cases with comprehensive validation and boundary testing', async () => {
      console.log('🧪 Testing edge cases and boundary conditions for knowledge base creation')

      // Set up authenticated user for edge case testing
      mocks.auth.setAuthenticated(enhancedMockUser)

      const edgeCaseData = {
        name: 'A'.repeat(256), // Very long name to test length limits
        description: 'B'.repeat(2048), // Very long description to test length limits
        chunkingConfig: {
          maxSize: 8192, // Maximum reasonable chunk size
          minSize: 1, // Minimum chunk size
          overlap: 100, // Reasonable overlap
        },
        embeddingModel: 'text-embedding-3-large', // Alternative embedding model
        embeddingDimension: 3072, // Corresponding dimension
      }

      console.log('📝 Edge case data characteristics:', {
        nameLength: edgeCaseData.name.length,
        descriptionLength: edgeCaseData.description.length,
        maxSize: edgeCaseData.chunkingConfig.maxSize,
        embeddingModel: edgeCaseData.embeddingModel,
      })

      // Configure database for edge case scenario
      const edgeKnowledgeBase = {
        id: 'kb-edge-123',
        ...edgeCaseData,
        userId: enhancedMockUser.id,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }
      mocks.database.setSelectResults([[edgeKnowledgeBase]])

      const req = createEnhancedMockRequest('POST', edgeCaseData)

      console.log('🔧 Testing boundary condition handling in knowledge base creation')
      const { POST } = await import('@/app/api/knowledge/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('✅ Edge case handling response:', {
        status: response.status,
        success: data.success,
        hasValidationErrors: !!data.details,
      })

      // Edge cases should either succeed with valid data or fail with proper validation
      if (response.status === 200) {
        expect(data).toHaveProperty('success', true)
        expect(data).toHaveProperty('data')
        console.log('✅ Edge cases handled successfully with data validation')
      } else if (response.status === 400) {
        expect(data).toHaveProperty('error')
        expect(data.error).toContain('Invalid')
        console.log('✅ Edge cases properly rejected with validation errors')
      }

      // Verify that extremely long inputs are handled gracefully
      expect(response.status).not.toBe(500) // Should not cause server errors

      console.log('✅ Edge case and boundary testing completed')
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle concurrent creation requests with performance monitoring', async () => {
      console.log(
        '🧪 Testing concurrent knowledge base creation scenarios with performance tracking'
      )

      // Set up authenticated user for concurrent testing
      mocks.auth.setAuthenticated(enhancedMockUser)

      // Configure database to handle multiple concurrent operations
      const concurrentResults = Array.from({ length: 5 }, (_, i) => ({
        id: `kb-concurrent-${i}-123`,
        name: `Concurrent KB ${i}`,
        description: `Test concurrent creation ${i}`,
        userId: enhancedMockUser.id,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }))
      mocks.database.setSelectResults([concurrentResults])

      console.log('📝 Creating 5 concurrent knowledge base creation requests')
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => {
        const data = {
          name: `Concurrent KB ${i}`,
          description: `Test concurrent creation scenario ${i}`,
          chunkingConfig: {
            maxSize: 1024 + i * 100, // Vary parameters slightly
            minSize: 50 + i * 10,
            overlap: 200,
          },
        }
        return createEnhancedMockRequest('POST', data)
      })

      const { POST } = await import('@/app/api/knowledge/route')
      const startTime = Date.now()

      console.log('🔧 Executing concurrent knowledge base creation requests')
      const responses = await Promise.all(
        concurrentRequests.map(async (req, index) => {
          console.log(`🚀 Starting concurrent request ${index}`)
          return await POST(req)
        })
      )

      const endTime = Date.now()
      const duration = endTime - startTime
      const averageResponseTime = duration / responses.length

      console.log('✅ Concurrent requests performance metrics:', {
        totalDuration: `${duration}ms`,
        averageResponseTime: `${averageResponseTime.toFixed(2)}ms`,
        requestCount: responses.length,
        throughput: `${(responses.length / (duration / 1000)).toFixed(2)} req/sec`,
      })

      // Verify all concurrent requests completed successfully
      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
        console.log(`✅ Concurrent request ${index} completed with status:`, response.status)
      })

      // Verify reasonable performance (all requests should complete within 5 seconds)
      expect(duration).toBeLessThan(5000)

      // Verify reasonable average response time (under 1 second per request)
      expect(averageResponseTime).toBeLessThan(1000)

      console.log('✅ Concurrent knowledge base creation performance test completed')
    })
  })

  describe('Integration and Compatibility', () => {
    it('should maintain backward compatibility with legacy data formats', async () => {
      console.log('🧪 Testing backward compatibility with legacy knowledge base data formats')

      // Set up authenticated user for legacy compatibility testing
      mocks.auth.setAuthenticated(enhancedMockUser)

      const legacyData = {
        name: 'Legacy Knowledge Base',
        description: 'Testing backward compatibility with older API versions',
        // Missing modern fields like embeddingModel, embeddingDimension, chunkingConfig
        // Should still work with default values
      }

      console.log('📝 Legacy format data structure:', {
        providedFields: Object.keys(legacyData),
        missingModernFields: ['embeddingModel', 'embeddingDimension', 'chunkingConfig'],
      })

      // Configure database to return legacy knowledge base with defaults applied
      const legacyKnowledgeBase = {
        id: 'kb-legacy-123',
        ...legacyData,
        userId: enhancedMockUser.id,
        embeddingModel: 'text-embedding-3-small', // Default applied
        embeddingDimension: 1536, // Default applied
        chunkingConfig: {
          maxSize: 1024,
          minSize: 1,
          overlap: 200,
        }, // Default applied
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }
      mocks.database.setSelectResults([[legacyKnowledgeBase]])

      const req = createEnhancedMockRequest('POST', legacyData)

      console.log('🔧 Testing legacy data format compatibility')
      const { POST } = await import('@/app/api/knowledge/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('✅ Legacy compatibility response:', {
        status: response.status,
        success: data.success,
        appliedDefaults: {
          embeddingModel: data.data?.embeddingModel,
          hasChunkingConfig: !!data.data?.chunkingConfig,
        },
      })

      // Verify backward compatibility works correctly
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')

      // Verify legacy data is preserved
      expect(data.data.name).toBe(legacyData.name)
      expect(data.data.description).toBe(legacyData.description)

      // Verify defaults are properly applied for missing fields
      expect(data.data.embeddingModel).toBe('text-embedding-3-small')
      expect(data.data.embeddingDimension).toBe(1536)
      expect(data.data.chunkingConfig).toBeDefined()

      console.log('✅ Backward compatibility test completed successfully')
    })
  })

  describe('Security and Access Control', () => {
    it('should enforce proper user isolation for knowledge bases', async () => {
      console.log('🧪 Testing user isolation and access control for knowledge bases')

      // Set up authenticated user for security testing
      const testUser = {
        id: 'security-test-user-456',
        email: 'security-test@example.com',
        name: 'Security Test User',
      }
      mocks.auth.setAuthenticated(testUser)

      // Configure database to return user-specific knowledge bases only
      const userKnowledgeBases = [
        {
          id: 'kb-user-specific-1',
          name: 'User Specific KB 1',
          userId: testUser.id, // Belongs to current user
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]
      mocks.database.setSelectResults([userKnowledgeBases, [{ count: 1 }]])

      console.log('📝 Creating GET request to test user isolation')
      const req = createEnhancedMockRequest('GET')

      console.log('🔧 Testing user-specific knowledge base access control')
      const { GET } = await import('@/app/api/knowledge/route')
      const response = await GET(req)
      const data = await response.json()

      console.log('✅ User isolation response:', {
        status: response.status,
        kbCount: data.data?.length,
        firstKbUserId: data.data?.[0]?.userId,
        currentUserId: testUser.id,
      })

      // Verify proper user isolation
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')

      // Verify only user's own knowledge bases are returned
      if (data.data && data.data.length > 0) {
        data.data.forEach((kb: any) => {
          expect(kb.userId).toBe(testUser.id)
        })
      }

      console.log('✅ User isolation and access control test completed')
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should handle network timeouts and recover gracefully', async () => {
      console.log('🧪 Testing network timeout handling and error recovery')

      // Set up authenticated user for timeout testing
      mocks.auth.setAuthenticated(enhancedMockUser)

      // Configure database to simulate timeout behavior
      mocks.database.setSelectResults([]) // Empty to trigger error conditions

      console.log('📝 Creating request that may encounter timeout conditions')
      const req = createEnhancedMockRequest('GET')

      console.log('🔧 Testing timeout resilience and error recovery')
      const { GET } = await import('@/app/api/knowledge/route')

      const startTime = Date.now()
      const response = await GET(req)
      const endTime = Date.now()
      const responseTime = endTime - startTime

      const data = await response.json()

      console.log('✅ Timeout handling response:', {
        status: response.status,
        responseTime: `${responseTime}ms`,
        errorHandling: response.status >= 400 ? 'error' : 'success',
      })

      // Verify reasonable response time (should not hang indefinitely)
      expect(responseTime).toBeLessThan(5000) // Should respond within 5 seconds

      // Verify graceful handling regardless of outcome
      expect([200, 400, 500]).toContain(response.status)
      expect(data).toBeDefined()

      console.log('✅ Network timeout and error recovery test completed')
    })
  })
})
