/**
 * Knowledge Search API Route Tests - Bun-Compatible Test Suite
 *
 * This file contains comprehensive tests for knowledge search functionality focusing on:
 * - Authentication and authorization with multiple auth methods
 * - Search parameter validation and error handling
 * - Vector search, tag search, and combined search modes
 * - Cost tracking and performance metrics
 * - Database error resilience and API integration
 *
 * Migration Notes:
 * - Migrated from vi.mock() to pure bun-compatible infrastructure
 * - Uses bun-test-setup.ts for all mocking without vi.mock() calls
 * - Implements proper cleanup and test isolation patterns
 * - Maintains all original test functionality with enhanced logging
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type BunTestMocks,
  createTestRequest,
  defaultMockUser,
  setupComprehensiveTestMocks,
} from '@/app/api/__test-utils__/bun-test-setup'

// Bun-compatible mock functions for knowledge search functionality
const mockCheckKnowledgeBaseAccess = vi.fn()
const mockHandleTagOnlySearch = vi.fn()
const mockHandleVectorOnlySearch = vi.fn()
const mockHandleTagAndVectorSearch = vi.fn()
const mockGetQueryStrategy = vi.fn()
const mockGenerateSearchEmbedding = vi.fn()
const mockGetDocumentNamesByIds = vi.fn()
const mockEstimateTokenCount = vi.fn()
const mockCalculateCost = vi.fn()
const mockGetUserId = vi.fn()

// Bun-compatible drizzle-orm mock functions
const mockDrizzleAnd = vi.fn((...args) => ({ and: args }))
const mockDrizzleEq = vi.fn((a, b) => ({ eq: [a, b] }))
const mockDrizzleInArray = vi.fn((field, values) => ({ inArray: [field, values] }))
const mockDrizzleIsNull = vi.fn((arg) => ({ isNull: arg }))
const mockDrizzleSql = vi.fn((strings, ...values) => ({
  sql: strings,
  values,
  as: vi.fn().mockReturnValue({ sql: strings, values, alias: 'mocked_alias' }),
}))

// Mock console logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
const mockCreateLogger = vi.fn().mockReturnValue(mockLogger)

// Mock environment configuration
const mockEnv = {
  OPENAI_API_KEY: 'test-api-key',
}
const mockIsTruthy = (value: string | boolean | number | undefined) =>
  typeof value === 'string' ? value === 'true' || value === '1' : Boolean(value)

// Mock database schema objects
const mockKnowledgeBases = {
  id: 'id',
  userId: 'userId',
  name: 'name',
  deletedAt: 'deletedAt',
}
const mockKnowledgeBaseChunks = {
  id: 'id',
  content: 'content',
  documentId: 'documentId',
  knowledgeBaseId: 'knowledgeBaseId',
  chunkIndex: 'chunkIndex',
  embedding: 'embedding',
}
const mockKnowledgeBaseDocuments = {
  id: 'id',
  name: 'name',
  knowledgeBaseId: 'knowledgeBaseId',
}
const mockKnowledgeBaseTagDefinitions = {
  id: 'id',
  knowledgeBaseId: 'knowledgeBaseId',
  tagSlot: 'tagSlot',
  displayName: 'displayName',
}

// Mock document utility functions
const mockRetryWithExponentialBackoff = vi.fn().mockImplementation((fn) => fn())

// Mock APIError class
class MockAPIError extends Error {
  public status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'APIError'
    this.status = status
  }
}

// Setup bun-compatible global mocks using vi.stubGlobal
vi.stubGlobal('__mockKnowledgeSearch', {
  checkKnowledgeBaseAccess: mockCheckKnowledgeBaseAccess,
  handleTagOnlySearch: mockHandleTagOnlySearch,
  handleVectorOnlySearch: mockHandleVectorOnlySearch,
  handleTagAndVectorSearch: mockHandleTagAndVectorSearch,
  getQueryStrategy: mockGetQueryStrategy,
  generateSearchEmbedding: mockGenerateSearchEmbedding,
  getDocumentNamesByIds: mockGetDocumentNamesByIds,
  estimateTokenCount: mockEstimateTokenCount,
  calculateCost: mockCalculateCost,
  getUserId: mockGetUserId,
  APIError: MockAPIError,
  retryWithExponentialBackoff: mockRetryWithExponentialBackoff,
  createLogger: mockCreateLogger,
  env: mockEnv,
  isTruthy: mockIsTruthy,
  drizzle: {
    and: mockDrizzleAnd,
    eq: mockDrizzleEq,
    inArray: mockDrizzleInArray,
    isNull: mockDrizzleIsNull,
    sql: mockDrizzleSql,
  },
  schema: {
    knowledgeBases: mockKnowledgeBases,
    knowledgeBaseChunks: mockKnowledgeBaseChunks,
    knowledgeBaseDocuments: mockKnowledgeBaseDocuments,
    knowledgeBaseTagDefinitions: mockKnowledgeBaseTagDefinitions,
  },
})

describe('Knowledge Search API Route - Bun-Compatible Test Suite', () => {
  let mocks: BunTestMocks

  // Test data constants
  const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5]
  const mockSearchResults = [
    {
      id: 'chunk-1',
      content: 'This is a test chunk',
      documentId: 'doc-1',
      chunkIndex: 0,
      metadata: { title: 'Test Document' },
      distance: 0.2,
    },
    {
      id: 'chunk-2',
      content: 'Another test chunk',
      documentId: 'doc-2',
      chunkIndex: 1,
      metadata: { title: 'Another Document' },
      distance: 0.3,
    },
  ]

  const mockKnowledgeBases = [
    {
      id: 'kb-123',
      userId: 'user-123',
      name: 'Test KB',
      deletedAt: null,
    },
  ]

  beforeEach(() => {
    console.log('🚀 Setting up Knowledge Search API test environment')

    // Clear all mocks
    vi.clearAllMocks()

    // Setup comprehensive test mocks using bun-compatible infrastructure
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: defaultMockUser },
      database: { select: { results: [mockSearchResults] } },
    })

    // Configure search utility mocks using bun-compatible approach
    mockGetQueryStrategy.mockReturnValue({
      useParallel: false,
      distanceThreshold: 1.0,
      parallelLimit: 15,
      singleQueryOptimized: true,
    })

    mockGenerateSearchEmbedding.mockResolvedValue(mockEmbedding)

    mockGetDocumentNamesByIds.mockResolvedValue({
      'doc-1': 'Test Document',
      'doc-2': 'Another Document',
    })

    mockEstimateTokenCount.mockReturnValue({
      count: 521,
      confidence: 'high',
      provider: 'openai',
      method: 'precise',
    })

    mockCalculateCost.mockReturnValue({
      input: 0.00001042,
      output: 0,
      total: 0.00001042,
      pricing: {
        input: 0.02,
        output: 0,
        updatedAt: '2025-07-10',
      },
    })

    // Mock fetch for OpenAI API calls using bun-compatible vi.stubGlobal
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [{ embedding: mockEmbedding }],
          }),
      })
    )

    // Mock crypto.randomUUID using bun-compatible vi.stubGlobal
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue('mock-uuid-1234-5678'),
    })

    console.log('✅ Knowledge Search API test environment setup complete (bun-compatible)')
  })

  afterEach(() => {
    console.log('🧹 Cleaning up Knowledge Search API test environment')
    mocks.cleanup()
    vi.clearAllMocks()
    console.log('✅ Knowledge Search test cleanup complete')
  })

  describe('POST /api/knowledge/search', () => {
    const validSearchData = {
      knowledgeBaseIds: 'kb-123',
      query: 'test search query',
      topK: 10,
    }

    const mockKnowledgeBases = [
      {
        id: 'kb-123',
        userId: 'user-123',
        name: 'Test KB',
        deletedAt: null,
      },
    ]

    it('should perform search successfully with single knowledge base', async () => {
      console.log('🧪 Testing single knowledge base search functionality')

      // Setup authenticated user and knowledge base access
      mocks.auth.setAuthenticated(defaultMockUser)
      mockGetUserId.mockResolvedValue(defaultMockUser.id)

      mockCheckKnowledgeBaseAccess.mockResolvedValue({
        hasAccess: true,
        knowledgeBase: {
          id: 'kb-123',
          userId: defaultMockUser.id,
          name: 'Test KB',
          deletedAt: null,
        },
      })

      // Configure database to return search results
      mocks.database.setSelectResults([mockSearchResults])
      mockHandleVectorOnlySearch.mockResolvedValue(mockSearchResults)

      const req = createTestRequest('POST', validSearchData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('📊 Search response status:', response.status)
      console.log('📊 Search results count:', data.data?.results?.length)

      if (response.status !== 200) {
        console.log('❌ Test failed with response:', data)
      }

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.results).toHaveLength(2)
      expect(data.data.results[0].similarity).toBe(0.8) // 1 - 0.2
      expect(data.data.query).toBe(validSearchData.query)
      expect(data.data.knowledgeBaseIds).toEqual(['kb-123'])

      expect(mockHandleVectorOnlySearch).toHaveBeenCalledWith({
        knowledgeBaseIds: ['kb-123'],
        topK: 10,
        queryVector: JSON.stringify(mockEmbedding),
        distanceThreshold: expect.any(Number),
      })

      console.log('✅ Single knowledge base search test completed successfully')
    })

    it('should perform search successfully with multiple knowledge bases', async () => {
      console.log('🧪 Testing multiple knowledge base search functionality')

      const multiKbData = {
        ...validSearchData,
        knowledgeBaseIds: ['kb-123', 'kb-456'],
      }

      const multiKbs = [
        ...mockKnowledgeBases,
        { id: 'kb-456', userId: defaultMockUser.id, name: 'Test KB 2', deletedAt: null },
      ]

      // Setup authenticated user and multiple knowledge base access
      mocks.auth.setAuthenticated(defaultMockUser)
      mockGetUserId.mockResolvedValue(defaultMockUser.id)

      mockCheckKnowledgeBaseAccess
        .mockResolvedValueOnce({ hasAccess: true, knowledgeBase: multiKbs[0] })
        .mockResolvedValueOnce({ hasAccess: true, knowledgeBase: multiKbs[1] })

      // Configure database and search handler
      mocks.database.setSelectResults([mockSearchResults])
      mockHandleVectorOnlySearch.mockResolvedValue(mockSearchResults)

      const req = createTestRequest('POST', multiKbData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('📊 Multi-KB search status:', response.status)
      console.log('📊 Knowledge bases searched:', data.data?.knowledgeBaseIds)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.knowledgeBaseIds).toEqual(['kb-123', 'kb-456'])

      expect(mockHandleVectorOnlySearch).toHaveBeenCalledWith({
        knowledgeBaseIds: ['kb-123', 'kb-456'],
        topK: 10,
        queryVector: JSON.stringify(mockEmbedding),
        distanceThreshold: expect.any(Number),
      })

      console.log('✅ Multiple knowledge base search test completed successfully')
    })

    it('should handle workflow-based authentication', async () => {
      console.log('🧪 Testing workflow-based authentication functionality')

      const workflowData = {
        ...validSearchData,
        workflowId: 'workflow-123',
      }

      // Setup workflow authentication
      mocks.auth.setAuthenticated(defaultMockUser)
      mockGetUserId.mockResolvedValue(defaultMockUser.id)

      mockCheckKnowledgeBaseAccess.mockResolvedValue({
        hasAccess: true,
        knowledgeBase: {
          id: 'kb-123',
          userId: defaultMockUser.id,
          name: 'Test KB',
          deletedAt: null,
        },
      })

      // Configure database and search handler
      mocks.database.setSelectResults([mockSearchResults])
      mockHandleVectorOnlySearch.mockResolvedValue(mockSearchResults)

      const req = createTestRequest('POST', workflowData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('📊 Workflow auth response status:', response.status)
      console.log('📊 Workflow ID processed:', workflowData.workflowId)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockGetUserId).toHaveBeenCalledWith(expect.any(String), 'workflow-123')

      console.log('✅ Workflow-based authentication test completed successfully')
    })

    it('should return unauthorized for unauthenticated request with security logging', async () => {
      console.log('🧪 Testing unauthorized access security controls')
      console.log('📊 Attempted search data:', validSearchData)

      // Setup unauthenticated state
      mocks.auth.setUnauthenticated()
      mockGetUserId.mockResolvedValue(null)

      const req = createTestRequest('POST', validSearchData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('⚠️ Unauthorized search attempt blocked')
      console.log('📊 Security response status:', response.status)
      console.log('📊 Security response data:', data)

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')

      // Verify no search operations were attempted for security
      expect(mockHandleVectorOnlySearch).not.toHaveBeenCalled()
      expect(mockHandleTagOnlySearch).not.toHaveBeenCalled()
      expect(mockGenerateSearchEmbedding).not.toHaveBeenCalled()

      console.log('✅ Unauthorized access security test completed successfully')
    })

    it('should return not found for workflow that does not exist', async () => {
      console.log('🧪 Testing nonexistent workflow handling')

      const workflowData = {
        ...validSearchData,
        workflowId: 'nonexistent-workflow',
      }

      // Setup workflow not found scenario
      mockGetUserId.mockResolvedValue(null)

      const req = createTestRequest('POST', workflowData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('📊 Nonexistent workflow response status:', response.status)
      console.log('📊 Error message:', data.error)

      expect(response.status).toBe(404)
      expect(data.error).toBe('Workflow not found')

      console.log('✅ Nonexistent workflow test completed successfully')
    })

    it('should return not found for non-existent knowledge base', async () => {
      console.log('🧪 Testing non-existent knowledge base handling')

      // Setup authenticated user but non-existent knowledge base
      mocks.auth.setAuthenticated(defaultMockUser)
      mockGetUserId.mockResolvedValue(defaultMockUser.id)

      mockCheckKnowledgeBaseAccess.mockResolvedValue({
        hasAccess: false,
        notFound: true,
      })

      const req = createTestRequest('POST', validSearchData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('📊 Non-existent KB response status:', response.status)
      console.log('📊 Error message:', data.error)

      expect(response.status).toBe(404)
      expect(data.error).toBe('Knowledge base not found or access denied')

      console.log('✅ Non-existent knowledge base test completed successfully')
    })

    it('should return not found for some missing knowledge bases', async () => {
      const multiKbData = {
        ...validSearchData,
        knowledgeBaseIds: ['kb-123', 'kb-missing'],
      }

      mockGetUserId.mockResolvedValue('user-123')

      // Mock access check: first KB has access, second doesn't
      mockCheckKnowledgeBaseAccess
        .mockResolvedValueOnce({ hasAccess: true, knowledgeBase: mockKnowledgeBases[0] })
        .mockResolvedValueOnce({ hasAccess: false, notFound: true })

      const req = createTestRequest('POST', multiKbData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Knowledge bases not found or access denied: kb-missing')
    })

    it('should validate search parameters', async () => {
      console.log('🧪 Testing search parameter validation')

      const invalidData = {
        knowledgeBaseIds: '', // Empty string
        query: '', // Empty query
        topK: 150, // Too high
      }

      console.log('📊 Invalid search parameters:', invalidData)

      const req = createTestRequest('POST', invalidData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('📊 Parameter validation response status:', response.status)
      console.log('📊 Validation error details:', data.details)

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()

      console.log('✅ Search parameter validation test completed successfully')
    })

    it('should use default topK value when not provided', async () => {
      console.log('🧪 Testing default topK value assignment')

      const dataWithoutTopK = {
        knowledgeBaseIds: 'kb-123',
        query: 'test search query',
      }

      // Setup authenticated user and knowledge base access
      mocks.auth.setAuthenticated(defaultMockUser)
      mockGetUserId.mockResolvedValue(defaultMockUser.id)

      mockCheckKnowledgeBaseAccess.mockResolvedValue({
        hasAccess: true,
        knowledgeBase: {
          id: 'kb-123',
          userId: defaultMockUser.id,
          name: 'Test KB',
          deletedAt: null,
        },
      })

      // Configure database and search handler
      mocks.database.setSelectResults([mockSearchResults])
      mockHandleVectorOnlySearch.mockResolvedValue(mockSearchResults)

      const req = createTestRequest('POST', dataWithoutTopK)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('📊 Default topK response status:', response.status)
      console.log('📊 Applied topK value:', data.data?.topK)

      expect(response.status).toBe(200)
      expect(data.data.topK).toBe(10) // Default value

      console.log('✅ Default topK value test completed successfully')
    })

    it('should handle OpenAI API errors', async () => {
      console.log('🧪 Testing OpenAI API error handling')

      // Setup authenticated user
      mocks.auth.setAuthenticated(defaultMockUser)
      mockGetUserId.mockResolvedValue(defaultMockUser.id)

      mockCheckKnowledgeBaseAccess.mockResolvedValue({
        hasAccess: true,
        knowledgeBase: mockKnowledgeBases[0],
      })

      mocks.database.setSelectResults([mockKnowledgeBases])

      // Mock generateSearchEmbedding to throw OpenAI API error
      mockGenerateSearchEmbedding.mockRejectedValueOnce(
        new Error('OpenAI API error: 401 Unauthorized - Invalid API key')
      )

      const req = createTestRequest('POST', validSearchData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('📊 OpenAI API error response status:', response.status)
      console.log('📊 Error message:', data.error)

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to perform vector search')

      console.log('✅ OpenAI API error handling test completed successfully')
    })

    it('should handle missing OpenAI API key', async () => {
      console.log('🧪 Testing missing OpenAI API key error handling')

      // Setup authenticated user
      mocks.auth.setAuthenticated(defaultMockUser)
      mockGetUserId.mockResolvedValue(defaultMockUser.id)

      mockCheckKnowledgeBaseAccess.mockResolvedValue({
        hasAccess: true,
        knowledgeBase: mockKnowledgeBases[0],
      })

      mocks.database.setSelectResults([mockKnowledgeBases])

      // Mock generateSearchEmbedding to throw missing API key error
      mockGenerateSearchEmbedding.mockRejectedValueOnce(new Error('OPENAI_API_KEY not configured'))

      const req = createTestRequest('POST', validSearchData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('📊 Missing API key response status:', response.status)
      console.log('📊 Error message:', data.error)

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to perform vector search')

      console.log('✅ Missing OpenAI API key error handling test completed successfully')
    })

    it('should handle database errors during search', async () => {
      console.log('🧪 Testing database error handling during search')

      // Setup authenticated user
      mocks.auth.setAuthenticated(defaultMockUser)
      mockGetUserId.mockResolvedValue(defaultMockUser.id)

      mockCheckKnowledgeBaseAccess.mockResolvedValue({
        hasAccess: true,
        knowledgeBase: mockKnowledgeBases[0],
      })

      mocks.database.setSelectResults([mockKnowledgeBases])

      // Mock the search handler to throw a database error
      mockHandleVectorOnlySearch.mockRejectedValueOnce(new Error('Database error'))

      const req = createTestRequest('POST', validSearchData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('📊 Database error response status:', response.status)
      console.log('📊 Error message:', data.error)

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to perform vector search')

      console.log('✅ Database error handling test completed successfully')
    })

    it('should handle invalid OpenAI response format', async () => {
      console.log('🧪 Testing invalid OpenAI response format error handling')

      // Setup authenticated user
      mocks.auth.setAuthenticated(defaultMockUser)
      mockGetUserId.mockResolvedValue(defaultMockUser.id)

      mockCheckKnowledgeBaseAccess.mockResolvedValue({
        hasAccess: true,
        knowledgeBase: mockKnowledgeBases[0],
      })

      mocks.database.setSelectResults([mockKnowledgeBases])

      // Mock generateSearchEmbedding to throw invalid response format error
      mockGenerateSearchEmbedding.mockRejectedValueOnce(
        new Error('Invalid response format from OpenAI embeddings API')
      )

      const req = createTestRequest('POST', validSearchData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      console.log('📊 Invalid response format error status:', response.status)
      console.log('📊 Error message:', data.error)

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to perform vector search')

      console.log('✅ Invalid OpenAI response format error handling test completed successfully')
    })

    describe('Cost tracking', () => {
      it('should include cost information in successful search response', async () => {
        console.log('🧪 Testing cost information in search response')

        // Setup authenticated user
        mocks.auth.setAuthenticated(defaultMockUser)
        mockGetUserId.mockResolvedValue(defaultMockUser.id)

        // Mock knowledge base access check to return success
        mockCheckKnowledgeBaseAccess.mockResolvedValue({
          hasAccess: true,
          knowledgeBase: {
            id: 'kb-123',
            userId: defaultMockUser.id,
            name: 'Test KB',
            deletedAt: null,
          },
        })

        // Configure database and search handler
        mocks.database.setSelectResults([mockSearchResults])
        mockHandleVectorOnlySearch.mockResolvedValue(mockSearchResults)

        const req = createTestRequest('POST', validSearchData)
        const { POST } = await import('@/app/api/knowledge/search/route')
        const response = await POST(req)
        const data = await response.json()

        console.log('📊 Cost tracking response status:', response.status)
        console.log('📊 Cost information:', data.data?.cost)

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)

        // Verify cost information is included
        expect(data.data.cost).toBeDefined()
        expect(data.data.cost.input).toBe(0.00001042)
        expect(data.data.cost.output).toBe(0)
        expect(data.data.cost.total).toBe(0.00001042)
        expect(data.data.cost.tokens).toEqual({
          prompt: 521,
          completion: 0,
          total: 521,
        })
        expect(data.data.cost.model).toBe('text-embedding-3-small')
        expect(data.data.cost.pricing).toEqual({
          input: 0.02,
          output: 0,
          updatedAt: '2025-07-10',
        })

        console.log('✅ Cost information test completed successfully')
      })

      it('should call cost calculation functions with correct parameters', async () => {
        console.log('🧪 Testing cost calculation function calls')

        // Setup authenticated user
        mocks.auth.setAuthenticated(defaultMockUser)
        mockGetUserId.mockResolvedValue(defaultMockUser.id)

        // Mock knowledge base access check to return success
        mockCheckKnowledgeBaseAccess.mockResolvedValue({
          hasAccess: true,
          knowledgeBase: {
            id: 'kb-123',
            userId: defaultMockUser.id,
            name: 'Test KB',
            deletedAt: null,
          },
        })

        // Configure database and search handler
        mocks.database.setSelectResults([mockSearchResults])
        mockHandleVectorOnlySearch.mockResolvedValue(mockSearchResults)

        const req = createTestRequest('POST', validSearchData)
        const { POST } = await import('@/app/api/knowledge/search/route')
        await POST(req)

        console.log('📊 Token estimation calls:', mockEstimateTokenCount.mock.calls)
        console.log('📊 Cost calculation calls:', mockCalculateCost.mock.calls)

        // Verify token estimation was called with correct parameters
        expect(mockEstimateTokenCount).toHaveBeenCalledWith('test search query', 'openai')

        // Verify cost calculation was called with correct parameters
        expect(mockCalculateCost).toHaveBeenCalledWith('text-embedding-3-small', 521, 0, false)

        console.log('✅ Cost calculation function calls test completed successfully')
      })

      it('should handle cost calculation with different query lengths', async () => {
        console.log('🧪 Testing cost calculation with different query lengths')

        // Mock different token count for longer query
        mockEstimateTokenCount.mockReturnValue({
          count: 1042,
          confidence: 'high',
          provider: 'openai',
          method: 'precise',
        })
        mockCalculateCost.mockReturnValue({
          input: 0.00002084,
          output: 0,
          total: 0.00002084,
          pricing: {
            input: 0.02,
            output: 0,
            updatedAt: '2025-07-10',
          },
        })

        const longQueryData = {
          ...validSearchData,
          query:
            'This is a much longer search query with many more tokens to test cost calculation accuracy',
        }

        // Setup authenticated user
        mocks.auth.setAuthenticated(defaultMockUser)
        mockGetUserId.mockResolvedValue(defaultMockUser.id)

        // Mock knowledge base access check to return success
        mockCheckKnowledgeBaseAccess.mockResolvedValue({
          hasAccess: true,
          knowledgeBase: {
            id: 'kb-123',
            userId: defaultMockUser.id,
            name: 'Test KB',
            deletedAt: null,
          },
        })

        // Configure database and search handler
        mocks.database.setSelectResults([mockSearchResults])
        mockHandleVectorOnlySearch.mockResolvedValue(mockSearchResults)

        const req = createTestRequest('POST', longQueryData)
        const { POST } = await import('@/app/api/knowledge/search/route')
        const response = await POST(req)
        const data = await response.json()

        console.log('📊 Long query cost response status:', response.status)
        console.log('📊 Cost data:', data.data?.cost)

        expect(response.status).toBe(200)
        expect(data.data.cost.input).toBe(0.00002084)
        expect(data.data.cost.tokens.prompt).toBe(1042)
        expect(mockCalculateCost).toHaveBeenCalledWith('text-embedding-3-small', 1042, 0, false)

        console.log('✅ Different query lengths cost calculation test completed successfully')
      })
    })
  })

  describe('Optional Query Search', () => {
    const mockTagDefinitions = [
      { tagSlot: 'tag1', displayName: 'category' },
      { tagSlot: 'tag2', displayName: 'priority' },
    ]

    const mockTaggedResults = [
      {
        id: 'chunk-1',
        content: 'Tagged content 1',
        documentId: 'doc-1',
        chunkIndex: 0,
        tag1: 'api',
        tag2: 'high',
        distance: 0,
        knowledgeBaseId: 'kb-123',
      },
      {
        id: 'chunk-2',
        content: 'Tagged content 2',
        documentId: 'doc-2',
        chunkIndex: 1,
        tag1: 'docs',
        tag2: 'medium',
        distance: 0,
        knowledgeBaseId: 'kb-123',
      },
    ]

    it('should perform tag-only search without query', async () => {
      const tagOnlyData = {
        knowledgeBaseIds: 'kb-123',
        filters: {
          category: 'api',
        },
        topK: 10,
      }

      mockGetUserId.mockResolvedValue('user-123')
      mockCheckKnowledgeBaseAccess.mockResolvedValue({
        hasAccess: true,
        knowledgeBase: {
          id: 'kb-123',
          userId: 'user-123',
          name: 'Test KB',
          deletedAt: null,
        },
      })

      // Configure database to return tag definitions and search handler
      mocks.database.setSelectResults([mockTagDefinitions, mockTagDefinitions])
      mockHandleTagOnlySearch.mockResolvedValue(mockTaggedResults)

      const req = createTestRequest('POST', tagOnlyData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      if (response.status !== 200) {
        console.log('Tag-only search test error:', data)
      }

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.results).toHaveLength(2)
      expect(data.data.results[0].similarity).toBe(1) // Perfect similarity for tag-only
      expect(data.data.query).toBe('') // Empty query
      expect(data.data.cost).toBeUndefined() // No cost for tag-only search
      expect(mockGenerateSearchEmbedding).not.toHaveBeenCalled() // No embedding API call
      expect(mockHandleTagOnlySearch).toHaveBeenCalledWith({
        knowledgeBaseIds: ['kb-123'],
        topK: 10,
        filters: { category: 'api' }, // Note: When no tag definitions are found, it uses the original filter key
      })
    })

    it('should perform query + tag combination search', async () => {
      const combinedData = {
        knowledgeBaseIds: 'kb-123',
        query: 'test search',
        filters: {
          category: 'api',
        },
        topK: 10,
      }

      mockGetUserId.mockResolvedValue('user-123')
      mockCheckKnowledgeBaseAccess.mockResolvedValue({
        hasAccess: true,
        knowledgeBase: {
          id: 'kb-123',
          userId: 'user-123',
          name: 'Test KB',
          deletedAt: null,
        },
      })

      // Configure database to return tag definitions and search handler
      mocks.database.setSelectResults([mockTagDefinitions, mockTagDefinitions])
      mockHandleTagAndVectorSearch.mockResolvedValue(mockSearchResults)

      // Fetch mock is already configured globally in beforeEach

      const req = createTestRequest('POST', combinedData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      if (response.status !== 200) {
        console.log('Query+tag combination test error:', data)
      }

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.results).toHaveLength(2)
      expect(data.data.query).toBe('test search')
      expect(data.data.cost).toBeDefined() // Cost included for vector search
      expect(mockGenerateSearchEmbedding).toHaveBeenCalled() // Embedding API called
      expect(mockHandleTagAndVectorSearch).toHaveBeenCalledWith({
        knowledgeBaseIds: ['kb-123'],
        topK: 10,
        filters: { category: 'api' }, // Note: When no tag definitions are found, it uses the original filter key
        queryVector: JSON.stringify(mockEmbedding),
        distanceThreshold: 1, // Single KB uses threshold of 1.0
      })
    })

    it('should validate that either query or filters are provided', async () => {
      const emptyData = {
        knowledgeBaseIds: 'kb-123',
        topK: 10,
      }

      const req = createTestRequest('POST', emptyData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message:
              'Please provide either a search query or tag filters to search your knowledge base',
          }),
        ])
      )
    })

    it('should validate that empty query with empty filters fails', async () => {
      const emptyFiltersData = {
        knowledgeBaseIds: 'kb-123',
        query: '',
        filters: {},
        topK: 10,
      }

      const req = createTestRequest('POST', emptyFiltersData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should handle empty tag values gracefully', async () => {
      // This simulates what happens when the frontend sends empty tag values
      // The tool transformation should filter out empty values, resulting in no filters
      const emptyTagValueData = {
        knowledgeBaseIds: 'kb-123',
        query: '',
        topK: 10,
        // This would result in no filters after tool transformation
      }

      const req = createTestRequest('POST', emptyTagValueData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message:
              'Please provide either a search query or tag filters to search your knowledge base',
          }),
        ])
      )
    })

    it('should handle null values from frontend gracefully', async () => {
      // This simulates the exact scenario the user reported
      // Null values should be transformed to undefined and then trigger validation
      const nullValuesData = {
        knowledgeBaseIds: 'kb-123',
        topK: null,
        query: null,
        filters: null,
      }

      const req = createTestRequest('POST', nullValuesData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message:
              'Please provide either a search query or tag filters to search your knowledge base',
          }),
        ])
      )
    })

    it('should perform query-only search (existing behavior)', async () => {
      const queryOnlyData = {
        knowledgeBaseIds: 'kb-123',
        query: 'test search query',
        topK: 10,
      }

      mockGetUserId.mockResolvedValue('user-123')
      mockCheckKnowledgeBaseAccess.mockResolvedValue({
        hasAccess: true,
        knowledgeBase: {
          id: 'kb-123',
          userId: 'user-123',
          name: 'Test KB',
          deletedAt: null,
        },
      })

      // Configure database and search handler
      mocks.database.setSelectResults([mockSearchResults])
      mockHandleVectorOnlySearch.mockResolvedValue(mockSearchResults)

      // Fetch mock is already configured globally in beforeEach

      const req = createTestRequest('POST', queryOnlyData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.results).toHaveLength(2)
      expect(data.data.query).toBe('test search query')
      expect(data.data.cost).toBeDefined() // Cost included for vector search
      expect(mockGenerateSearchEmbedding).toHaveBeenCalled() // Embedding API called
    })

    it('should handle tag-only search with multiple knowledge bases', async () => {
      const multiKbTagData = {
        knowledgeBaseIds: ['kb-123', 'kb-456'],
        filters: {
          category: 'docs',
          priority: 'high',
        },
        topK: 10,
      }

      mockGetUserId.mockResolvedValue('user-123')
      mockCheckKnowledgeBaseAccess
        .mockResolvedValueOnce({
          hasAccess: true,
          knowledgeBase: {
            id: 'kb-123',
            userId: 'user-123',
            name: 'Test KB',
            deletedAt: null,
          },
        })
        .mockResolvedValueOnce({
          hasAccess: true,
          knowledgeBase: { id: 'kb-456', userId: 'user-123', name: 'Test KB 2' },
        })

      // Configure database for multiple KB tag search
      // Chain the mocks for: tag defs, search, display mapping KB1, display mapping KB2
      mocks.database.setSelectResults([
        mockTagDefinitions, // Tag definitions for filter mapping
        mockTaggedResults, // Search results
        mockTagDefinitions, // Display mapping KB1
        mockTagDefinitions, // Display mapping KB2
      ])
      mockHandleTagOnlySearch.mockResolvedValue(mockTaggedResults)

      const req = createTestRequest('POST', multiKbTagData)
      const { POST } = await import('@/app/api/knowledge/search/route')
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.knowledgeBaseIds).toEqual(['kb-123', 'kb-456'])
      expect(mockGenerateSearchEmbedding).not.toHaveBeenCalled() // No embedding for tag-only
    })
  })
})
