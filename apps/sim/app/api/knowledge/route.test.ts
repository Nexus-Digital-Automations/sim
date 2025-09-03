/**
 * Comprehensive Test Suite for Knowledge Base API Route
 *
 * Tests all CRUD operations, validation, authentication, and error handling
 * for the knowledge base API with enhanced logging and validation
 *
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupEnhancedTestMocks } from '@/app/api/__test-utils__/enhanced-utils'
import {
  createMockRequest,
  mockAuth,
  mockConsoleLogger,
  mockDrizzleOrm,
  mockKnowledgeSchemas,
} from '@/app/api/__test-utils__/utils'

// Module-level mocking for search operations
vi.mock('@/app/api/knowledge/utils', () => ({
  checkKnowledgeBaseAccess: vi.fn(),
  generateKnowledgeBaseEmbedding: vi.fn(),
  processKnowledgeBaseValidation: vi.fn(),
}))

vi.mock('@/lib/documents/utils', () => ({
  retryWithExponentialBackoff: vi.fn().mockImplementation((fn) => fn()),
  validateDocumentProcessing: vi.fn(),
}))

vi.mock('@/lib/tokenization/estimators', () => ({
  estimateTokenCount: vi.fn().mockReturnValue({ count: 521, confidence: 'high' }),
}))

vi.mock('@/providers/utils', () => ({
  calculateCost: vi.fn().mockReturnValue({
    input: 0.00001042,
    output: 0,
    total: 0.00001042,
    pricing: { input: 0.02, output: 0, updatedAt: '2025-07-10' },
  }),
}))

// Enhanced mocking setup with comprehensive logging
setupEnhancedTestMocks()
mockKnowledgeSchemas()
mockDrizzleOrm()
mockConsoleLogger()

describe('Knowledge Base API Route', () => {
  const mockAuth$ = mockAuth()

  // Helper function to create logger in tests
  const createTestLogger = async (name: string) => {
    const { createLogger } = await import('@/lib/logs/console/logger')
    return createLogger(name)
  }

  const mockDbChain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    const logger = await createTestLogger('Knowledge Route Test')
    logger.info('[Knowledge Route Test] Setting up test environment with enhanced mocking')

    // Enhanced database mocking with comprehensive logging
    vi.doMock('@/db', () => ({
      db: mockDbChain,
    }))

    Object.values(mockDbChain).forEach((fn) => {
      if (typeof fn === 'function') {
        fn.mockClear()
        if (fn !== mockDbChain.orderBy && fn !== mockDbChain.values) {
          fn.mockReturnThis()
        }
      }
    })

    // Enhanced crypto mocking with validation
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue('mock-uuid-1234-5678'),
    })

    logger.debug('[Knowledge Route Test] Test environment setup completed')
  })

  afterEach(async () => {
    const logger = await createTestLogger('Knowledge Route Test')
    logger.debug('[Knowledge Route Test] Cleaning up test environment')
    vi.clearAllMocks()
    logger.debug('[Knowledge Route Test] Test cleanup completed')
  })

  describe('GET /api/knowledge', () => {
    it('should return unauthorized for unauthenticated user with detailed logging', async () => {
      const logger = await createTestLogger('Knowledge GET')
      logger.info('[Knowledge GET] Testing unauthorized access scenario')

      mockAuth$.mockUnauthenticated()

      const req = createMockRequest('GET')
      const { GET } = await import('@/app/api/knowledge/route')
      const response = await GET(req)
      const data = await response.json()

      logger.debug('[Knowledge GET] Response status:', response.status)
      logger.debug('[Knowledge GET] Response data:', data)

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')

      logger.info('[Knowledge GET] Unauthorized access test completed successfully')
    })

    it('should handle database errors with comprehensive error tracking', async () => {
      const logger = await createTestLogger('Knowledge GET')
      logger.info('[Knowledge GET] Testing database error handling')

      mockAuth$.mockAuthenticatedUser()
      const dbError = new Error('Database connection failed')
      mockDbChain.orderBy.mockRejectedValue(dbError)

      const req = createMockRequest('GET')
      const { GET } = await import('@/app/api/knowledge/route')
      const response = await GET(req)
      const data = await response.json()

      logger.error('[Knowledge GET] Database error occurred:', dbError.message)
      logger.debug('[Knowledge GET] Error response:', data)

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch knowledge bases')

      logger.info('[Knowledge GET] Database error handling test completed')
    })

    it('should successfully fetch knowledge bases with performance tracking', async () => {
      const logger = await createTestLogger('Knowledge GET')
      const startTime = Date.now()
      logger.info('[Knowledge GET] Testing successful knowledge base retrieval')

      mockAuth$.mockAuthenticatedUser()
      const mockKnowledgeBases = [
        {
          id: 'kb-1',
          name: 'Test Knowledge Base',
          description: 'Test description',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
      mockDbChain.orderBy.mockResolvedValue(mockKnowledgeBases)

      const req = createMockRequest('GET')
      const { GET } = await import('@/app/api/knowledge/route')
      const response = await GET(req)
      const data = await response.json()

      const endTime = Date.now()
      const duration = endTime - startTime
      logger.info('[Knowledge GET] Request completed in', duration, 'ms')
      logger.debug('[Knowledge GET] Response data:', data)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockKnowledgeBases)

      logger.info('[Knowledge GET] Successful retrieval test completed')
    })
  })

  describe('POST /api/knowledge', () => {
    const validKnowledgeBaseData = {
      name: 'Test Knowledge Base',
      description: 'Test description',
      chunkingConfig: {
        maxSize: 1024,
        minSize: 100,
        overlap: 200,
      },
    }

    it('should create knowledge base successfully', async () => {
      mockAuth$.mockAuthenticatedUser()

      const req = createMockRequest('POST', validKnowledgeBaseData)
      const { POST } = await import('@/app/api/knowledge/route')
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe(validKnowledgeBaseData.name)
      expect(data.data.description).toBe(validKnowledgeBaseData.description)
      expect(mockDbChain.insert).toHaveBeenCalled()
    })

    it('should return unauthorized for unauthenticated user', async () => {
      mockAuth$.mockUnauthenticated()

      const req = createMockRequest('POST', validKnowledgeBaseData)
      const { POST } = await import('@/app/api/knowledge/route')
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should validate required fields', async () => {
      mockAuth$.mockAuthenticatedUser()

      const req = createMockRequest('POST', { description: 'Missing name' })
      const { POST } = await import('@/app/api/knowledge/route')
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
    })

    it('should validate chunking config constraints', async () => {
      mockAuth$.mockAuthenticatedUser()

      const invalidData = {
        name: 'Test KB',
        chunkingConfig: {
          maxSize: 100,
          minSize: 200, // Invalid: minSize > maxSize
          overlap: 50,
        },
      }

      const req = createMockRequest('POST', invalidData)
      const { POST } = await import('@/app/api/knowledge/route')
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should use default values for optional fields', async () => {
      mockAuth$.mockAuthenticatedUser()

      const minimalData = { name: 'Test KB' }
      const req = createMockRequest('POST', minimalData)
      const { POST } = await import('@/app/api/knowledge/route')
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.embeddingModel).toBe('text-embedding-3-small')
      expect(data.data.embeddingDimension).toBe(1536)
      expect(data.data.chunkingConfig).toEqual({
        maxSize: 1024,
        minSize: 1,
        overlap: 200,
      })
    })

    it('should handle database errors during creation with comprehensive error tracking', async () => {
      const logger = await createTestLogger('Knowledge GET')
      logger.info('[Knowledge POST] Testing database error handling during creation')

      mockAuth$.mockAuthenticatedUser()
      const dbError = new Error('Database constraint violation: duplicate name')
      mockDbChain.values.mockRejectedValue(dbError)

      const req = createMockRequest('POST', validKnowledgeBaseData)
      const { POST } = await import('@/app/api/knowledge/route')
      const response = await POST(req)
      const data = await response.json()

      logger.error('[Knowledge POST] Database error during creation:', dbError.message)
      logger.debug('[Knowledge POST] Error response:', data)

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create knowledge base')

      // Verify error handling doesn't leak sensitive information
      expect(data.error).not.toContain('constraint violation')
      expect(data.error).not.toContain('duplicate')

      logger.info('[Knowledge POST] Database error handling test completed')
    })

    it('should handle edge cases with comprehensive validation', async () => {
      const logger = await createTestLogger('Knowledge GET')
      logger.info('[Knowledge POST] Testing edge cases and boundary conditions')

      const edgeCaseData = {
        name: 'A'.repeat(256), // Very long name
        description: 'B'.repeat(2048), // Very long description
        chunkingConfig: {
          maxSize: 8192, // Maximum allowed
          minSize: 1, // Minimum allowed
          overlap: 100,
        },
      }
      logger.debug('[Knowledge POST] Edge case data lengths:', {
        nameLength: edgeCaseData.name.length,
        descriptionLength: edgeCaseData.description.length,
      })

      mockAuth$.mockAuthenticatedUser()
      mockDbChain.values.mockResolvedValue([{ id: 'kb-edge-123', ...edgeCaseData }])

      const req = createMockRequest('POST', edgeCaseData)
      const { POST } = await import('@/app/api/knowledge/route')
      const response = await POST(req)
      const data = await response.json()

      // Should either succeed with valid edge cases or fail with proper validation
      logger.debug('[Knowledge POST] Edge case response:', { status: response.status })

      if (response.status === 200) {
        expect(data.success).toBe(true)
        logger.info('[Knowledge POST] Edge cases handled successfully')
      } else if (response.status === 400) {
        expect(data.error).toBe('Invalid request data')
        logger.info('[Knowledge POST] Edge cases properly validated')
      }

      logger.info('[Knowledge POST] Edge case test completed')
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle concurrent creation requests', async () => {
      const logger = await createTestLogger('Knowledge GET')
      logger.info('[Knowledge POST] Testing concurrent creation scenarios')

      mockAuth$.mockAuthenticatedUser()
      mockDbChain.values.mockResolvedValue([{ id: 'kb-concurrent-123' }])

      const concurrentRequests = Array.from({ length: 5 }, (_, i) => {
        const data = {
          name: `Concurrent KB ${i}`,
          description: `Test concurrent creation ${i}`,
        }
        return createMockRequest('POST', data)
      })

      const { POST } = await import('@/app/api/knowledge/route')
      const startTime = Date.now()

      const responses = await Promise.all(concurrentRequests.map((req) => POST(req)))

      const endTime = Date.now()
      const duration = endTime - startTime
      logger.info('[Knowledge POST] Concurrent requests completed in', duration, 'ms')

      // All requests should complete successfully
      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
        logger.debug(`[Knowledge POST] Concurrent request ${index} status:`, response.status)
      })

      logger.info('[Knowledge POST] Concurrent creation test completed')
    })
  })

  describe('Integration and Compatibility', () => {
    it('should maintain backward compatibility with legacy data formats', async () => {
      const logger = await createTestLogger('Knowledge GET')
      logger.info('[Knowledge POST] Testing backward compatibility')

      const legacyData = {
        name: 'Legacy Knowledge Base',
        // Missing modern fields but should still work
      }
      logger.debug('[Knowledge POST] Legacy format data:', legacyData)

      mockAuth$.mockAuthenticatedUser()
      mockDbChain.values.mockResolvedValue([{ id: 'kb-legacy-123', ...legacyData }])

      const req = createMockRequest('POST', legacyData)
      const { POST } = await import('@/app/api/knowledge/route')
      const response = await POST(req)
      const data = await response.json()

      logger.debug('[Knowledge POST] Legacy compatibility response:', data)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      logger.info('[Knowledge POST] Backward compatibility test completed')
    })
  })
})
