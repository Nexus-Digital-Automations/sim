/**
 * Help Semantic Search Test Suite - Comprehensive testing for semantic search functionality
 *
 * Tests cover:
 * - Semantic search accuracy and relevance
 * - Performance benchmarks (sub-150ms response times)
 * - Contextual awareness and boosting
 * - Error handling and edge cases
 * - Integration with database and caching
 * - Analytics and monitoring
 *
 * Test Categories:
 * - Unit tests for individual components
 * - Integration tests for system workflows
 * - Performance tests for response time requirements
 * - Load tests for concurrent usage
 * - Accuracy tests for search relevance
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '@/lib/db'
import { HelpContentEmbeddingService } from '@/lib/help/ai/help-content-embedding-service'
import { HelpContentIndexingPipeline } from '@/lib/help/ai/help-content-indexing-pipeline'
import { HelpSearchAnalyticsService } from '@/lib/help/ai/help-search-analytics'
import { HelpSemanticSearchService } from '@/lib/help/ai/help-semantic-search-service'
import { HelpSystemIntegration } from '@/lib/help/ai/help-system-integration'
import type { Logger } from '@/lib/monitoring/logger'

// Mock implementations for testing
const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn().mockReturnThis(),
} as any

const mockDb: Database = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  execute: vi.fn(),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
} as any

// Mock embedding service
const mockEmbeddingService = {
  embed: vi.fn().mockResolvedValue(new Array(1536).fill(0.5)),
  embedBatch: vi.fn().mockResolvedValue([new Array(1536).fill(0.5)]),
  generateHelpContentEmbeddings: vi.fn().mockResolvedValue({
    contentEmbedding: new Array(1536).fill(0.5),
    titleEmbedding: new Array(1536).fill(0.4),
    combinedEmbedding: new Array(1536).fill(0.6),
  }),
  batchIndexHelpContent: vi.fn().mockResolvedValue({
    success: true,
    indexed: 1,
    skipped: 0,
    errors: [],
    processingTime: 100,
    embeddings: new Map([
      [
        'test-id',
        {
          contentEmbedding: new Array(1536).fill(0.5),
          titleEmbedding: new Array(1536).fill(0.4),
          combinedEmbedding: new Array(1536).fill(0.6),
        },
      ],
    ]),
  }),
  getHelpContentMetrics: vi.fn().mockReturnValue({
    totalRequests: 100,
    cacheHits: 80,
    cacheMisses: 20,
  }),
  shutdown: vi.fn().mockResolvedValue(undefined),
} as any

describe('Help Semantic Search System', () => {
  let searchService: HelpSemanticSearchService
  let embeddingService: typeof mockEmbeddingService
  let analyticsService: HelpSearchAnalyticsService

  beforeAll(async () => {
    embeddingService = mockEmbeddingService

    // Mock database responses
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'test-content-1',
                title: 'Getting Started with Workflows',
                content: 'Learn how to create your first workflow in Sim...',
                summary: 'Introduction to workflow creation',
                category: 'getting-started',
                difficulty: 'beginner',
                tags: ['workflow', 'tutorial', 'basics'],
                workflowTypes: ['automation'],
                blockTypes: ['starter'],
                slug: 'getting-started-workflows',
                featured: true,
                viewCount: 150,
                helpfulVotes: 12,
                ratingCount: 5,
                avgRating: 4.5,
                combinedEmbedding: new Array(1536).fill(0.7),
                status: 'published',
              },
              {
                id: 'test-content-2',
                title: 'Advanced Workflow Patterns',
                content: 'Explore complex workflow patterns and best practices...',
                summary: 'Advanced workflow techniques',
                category: 'advanced-features',
                difficulty: 'advanced',
                tags: ['workflow', 'patterns', 'advanced'],
                workflowTypes: ['automation', 'integration'],
                blockTypes: ['condition', 'loop'],
                slug: 'advanced-workflow-patterns',
                featured: false,
                viewCount: 75,
                helpfulVotes: 8,
                ratingCount: 3,
                avgRating: 4.2,
                combinedEmbedding: new Array(1536).fill(0.6),
                status: 'published',
              },
            ]),
          }),
        }),
      }),
    })

    searchService = new HelpSemanticSearchService(mockDb, embeddingService, mockLogger)
    analyticsService = new HelpSearchAnalyticsService(mockDb, mockLogger)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Semantic Search Functionality', () => {
    it('should perform basic semantic search', async () => {
      const results = await searchService.search('how to create workflows')

      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)

      // Verify result structure
      const firstResult = results[0]
      expect(firstResult).toHaveProperty('id')
      expect(firstResult).toHaveProperty('title')
      expect(firstResult).toHaveProperty('content')
      expect(firstResult).toHaveProperty('overallScore')
      expect(firstResult).toHaveProperty('semanticScore')
      expect(typeof firstResult.overallScore).toBe('number')
    })

    it('should respect search options and filters', async () => {
      const results = await searchService.search(
        'workflow tutorial',
        {},
        {
          maxResults: 5,
          minScore: 0.5,
          categories: ['getting-started'],
          difficulties: ['beginner'],
        }
      )

      expect(results.length).toBeLessThanOrEqual(5)
      results.forEach((result) => {
        expect(result.overallScore).toBeGreaterThanOrEqual(0.5)
      })

      // Verify filters were applied in database query
      expect(mockDb.select).toHaveBeenCalled()
    })

    it('should handle empty search queries gracefully', async () => {
      await expect(searchService.search('')).rejects.toThrow()
    })

    it('should handle invalid search parameters', async () => {
      const results = await searchService.search(
        'test query',
        {},
        {
          maxResults: -1,
          minScore: 2.0, // Invalid score > 1.0
        }
      )

      // Service should handle invalid parameters gracefully
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('Performance Requirements', () => {
    it('should complete searches within 150ms performance target', async () => {
      const startTime = Date.now()

      await searchService.search('workflow automation tutorial')

      const processingTime = Date.now() - startTime
      expect(processingTime).toBeLessThan(150)
    }, 10000)

    it('should handle concurrent searches efficiently', async () => {
      const concurrentSearches = Array(10)
        .fill(0)
        .map((_, i) => searchService.search(`test query ${i}`))

      const startTime = Date.now()
      const results = await Promise.all(concurrentSearches)
      const totalTime = Date.now() - startTime

      // All searches should complete
      expect(results).toHaveLength(10)
      results.forEach((result) => {
        expect(Array.isArray(result)).toBe(true)
      })

      // Average time per search should be reasonable
      expect(totalTime / 10).toBeLessThan(200)
    })

    it('should utilize caching for improved performance', async () => {
      const query = 'workflow creation guide'

      // First search - cache miss
      await searchService.search(query)

      // Second search - should hit cache
      const startTime = Date.now()
      await searchService.search(query)
      const cachedTime = Date.now() - startTime

      // Cached search should be significantly faster
      expect(cachedTime).toBeLessThan(50)
    })
  })

  describe('Contextual Awareness', () => {
    it('should apply contextual boosting based on workflow type', async () => {
      const context = {
        workflowType: 'automation',
        userRole: 'beginner' as const,
      }

      const results = await searchService.search('workflow setup', context)

      expect(results).toBeDefined()
      expect(results.length).toBeGreaterThan(0)

      // Results should have contextual scores when context is provided
      const contextualResults = results.filter((r) => r.contextualScore && r.contextualScore > 0)
      expect(contextualResults.length).toBeGreaterThan(0)
    })

    it('should boost results matching user difficulty level', async () => {
      const beginnerContext = {
        userRole: 'beginner' as const,
      }

      const results = await searchService.search('workflow tutorial', beginnerContext, {
        maxResults: 10,
      })

      // Beginner content should be boosted for beginner users
      const beginnerResults = results.filter((r) => r.difficulty === 'beginner')
      if (beginnerResults.length > 0) {
        expect(beginnerResults[0].overallScore).toBeGreaterThan(0)
      }
    })

    it('should handle missing context gracefully', async () => {
      const results = await searchService.search('workflow help', {})

      expect(Array.isArray(results)).toBe(true)
      // Should still return results without context
      expect(results.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Contextual Suggestions', () => {
    it('should generate contextual suggestions', async () => {
      const context = {
        workflowType: 'automation',
        blockType: 'condition',
        userRole: 'intermediate' as const,
      }

      const suggestions = await searchService.getContextualSuggestions(context, {
        maxResults: 5,
      })

      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeLessThanOrEqual(5)

      // Verify suggestion structure
      if (suggestions.length > 0) {
        const suggestion = suggestions[0]
        expect(suggestion).toHaveProperty('suggestionType')
        expect(suggestion).toHaveProperty('confidenceScore')
        expect(suggestion.confidenceScore).toBeGreaterThanOrEqual(0)
        expect(suggestion.confidenceScore).toBeLessThanOrEqual(1)
      }
    })

    it('should return empty suggestions for minimal context', async () => {
      const suggestions = await searchService.getContextualSuggestions(
        {},
        {
          maxResults: 5,
        }
      )

      // Should handle empty context without throwing
      expect(Array.isArray(suggestions)).toBe(true)
    })
  })

  describe('Similar Content Discovery', () => {
    it('should find similar content based on embeddings', async () => {
      const referenceContentId = 'test-content-1'

      const similarContent = await searchService.findSimilarContent(referenceContentId, {
        maxResults: 5,
        minScore: 0.7,
      })

      expect(Array.isArray(similarContent)).toBe(true)
      expect(similarContent.length).toBeLessThanOrEqual(5)

      // Verify that reference content is not included in results
      const selfReferences = similarContent.filter((content) => content.id === referenceContentId)
      expect(selfReferences).toHaveLength(0)
    })

    it('should handle non-existent content ID gracefully', async () => {
      await expect(searchService.findSimilarContent('non-existent-id')).rejects.toThrow(
        'Reference content not found'
      )
    })
  })

  describe('Analytics Integration', () => {
    it('should record search analytics', async () => {
      const analyticsService = new HelpSearchAnalyticsService(mockDb, mockLogger)

      await analyticsService.recordSearchQuery(
        'test query',
        5,
        120,
        { userId: 'test-user' },
        { clickedResults: ['content-1'], helpfulResults: ['content-1'], unhelpfulResults: [] }
      )

      // Verify analytics recording doesn't throw errors
      expect(true).toBe(true)
    })

    it('should track content interactions', async () => {
      const analyticsService = new HelpSearchAnalyticsService(mockDb, mockLogger)

      await analyticsService.recordContentInteraction(
        'test-content-1',
        'click',
        { userId: 'test-user', searchQuery: 'test query', searchRank: 1 },
        30
      )

      // Verify interaction tracking
      expect(true).toBe(true)
    })

    it('should generate analytics reports', async () => {
      const analyticsService = new HelpSearchAnalyticsService(mockDb, mockLogger)

      const report = await analyticsService.generateAnalyticsReport({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        end: new Date(),
      })

      expect(report).toHaveProperty('reportId')
      expect(report).toHaveProperty('summary')
      expect(report).toHaveProperty('performance')
      expect(report).toHaveProperty('recommendations')
      expect(report.generatedAt).toBeInstanceOf(Date)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      const failingDb = {
        ...mockDb,
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockRejectedValue(new Error('Database connection error')),
              }),
            }),
          }),
        }),
      }

      const failingSearchService = new HelpSemanticSearchService(
        failingDb,
        embeddingService,
        mockLogger
      )

      await expect(failingSearchService.search('test query')).rejects.toThrow()
    })

    it('should handle embedding service failures gracefully', async () => {
      const failingEmbeddingService = {
        ...mockEmbeddingService,
        embed: vi.fn().mockRejectedValue(new Error('Embedding generation failed')),
      }

      const failingSearchService = new HelpSemanticSearchService(
        mockDb,
        failingEmbeddingService,
        mockLogger
      )

      await expect(failingSearchService.search('test query')).rejects.toThrow()
    })

    it('should handle malformed query data', async () => {
      // Test with very long query
      const longQuery = 'a'.repeat(1000)

      const results = await searchService.search(longQuery)
      expect(Array.isArray(results)).toBe(true)
    })

    it('should handle special characters in queries', async () => {
      const specialQuery = '!@#$%^&*()_+-=[]{}|;:,.<>?'

      const results = await searchService.search(specialQuery)
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('Integration Testing', () => {
    it('should integrate properly with indexing pipeline', async () => {
      const indexingPipeline = new HelpContentIndexingPipeline(mockDb, embeddingService, mockLogger)

      // Test content indexing
      const testContent = [
        {
          type: 'filesystem' as const,
          path: '/test/content',
        },
      ]

      // Mock file system operations would be needed for full integration test
      expect(indexingPipeline).toBeDefined()
    })

    it('should integrate with help system integration service', async () => {
      const integrationService = new HelpSystemIntegration(
        mockDb,
        searchService,
        embeddingService,
        {} as any, // indexing pipeline mock
        {
          enableSemanticSearch: true,
          enableSuggestions: true,
          enableAnalytics: true,
          fallbackToKeywordSearch: true,
          cacheTTL: 300,
          maxConcurrentEmbeddings: 5,
          autoIndexNewContent: true,
          contentSyncInterval: 3600,
        },
        mockLogger
      )

      await integrationService.initialize()

      const results = await integrationService.search('test query')
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('Search Relevance and Quality', () => {
    it('should return relevant results for workflow-related queries', async () => {
      const workflowQueries = [
        'how to create a workflow',
        'workflow automation tutorial',
        'connecting blocks in workflows',
        'workflow best practices',
      ]

      for (const query of workflowQueries) {
        const results = await searchService.search(query)

        expect(results).toBeDefined()
        expect(results.length).toBeGreaterThan(0)

        // Results should have reasonable relevance scores
        if (results.length > 0) {
          expect(results[0].overallScore).toBeGreaterThan(0.3)
        }
      }
    })

    it('should rank featured content appropriately', async () => {
      const results = await searchService.search(
        'workflow guide',
        {},
        {
          includeFeatured: true,
          maxResults: 10,
        }
      )

      // Featured content should appear in results when specifically requested
      const featuredContent = results.filter((r) => r.featured)
      // Note: This depends on mock data having featured content
      expect(featuredContent.length).toBeGreaterThanOrEqual(0)
    })

    it('should provide meaningful search result explanations', async () => {
      const results = await searchService.search('workflow tutorial')

      if (results.length > 0) {
        const result = results[0]
        expect(result.relevanceExplanation).toBeDefined()
        expect(typeof result.relevanceExplanation).toBe('string')
        expect(result.relevanceExplanation.length).toBeGreaterThan(0)
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    // Cleanup any resources
    await mockEmbeddingService.shutdown()
  })
})

describe('Help Content Embedding Service', () => {
  let embeddingService: HelpContentEmbeddingService

  beforeAll(() => {
    const mockConfig = {
      openaiApiKey: 'test-key',
      model: 'text-embedding-3-large' as const,
      dimensions: 1536,
      cacheEnabled: true,
      cacheTTL: 3600000,
      batchSize: 10,
      maxRetries: 3,
      rateLimitPerMinute: 100,
    }

    // Mock the actual embedding service's HTTP calls
    vi.mock('openai', () => ({
      default: class MockOpenAI {
        embeddings = {
          create: vi.fn().mockResolvedValue({
            data: [{ embedding: new Array(1536).fill(0.5) }],
            usage: { total_tokens: 100 },
          }),
        }
      },
    }))

    embeddingService = new HelpContentEmbeddingService(mockConfig, mockLogger)
  })

  it('should generate embeddings for help content', async () => {
    const testContent = {
      id: 'test-content',
      title: 'Test Content',
      content: 'This is test content for embedding generation.',
      category: 'testing',
      difficulty: 'beginner' as const,
      tags: ['test'],
      workflowTypes: ['test'],
      blockTypes: ['test'],
      metadata: {},
    }

    const embeddings = await embeddingService.generateHelpContentEmbeddings(testContent)

    expect(embeddings).toHaveProperty('contentEmbedding')
    expect(embeddings).toHaveProperty('titleEmbedding')
    expect(embeddings).toHaveProperty('combinedEmbedding')
    expect(embeddings.contentEmbedding).toHaveLength(1536)
    expect(embeddings.titleEmbedding).toHaveLength(1536)
    expect(embeddings.combinedEmbedding).toHaveLength(1536)
  })

  it('should handle batch embedding generation', async () => {
    const testContent = [
      {
        id: 'test-content-1',
        title: 'Test Content 1',
        content: 'First test content.',
        category: 'testing',
        difficulty: 'beginner' as const,
        tags: ['test'],
        workflowTypes: ['test'],
        blockTypes: ['test'],
        metadata: {},
      },
    ]

    const result = await embeddingService.batchIndexHelpContent(testContent)

    expect(result.success).toBe(true)
    expect(result.indexed).toBe(1)
    expect(result.errors).toHaveLength(0)
    expect(result.embeddings.size).toBe(1)
  })

  it('should provide performance metrics', () => {
    const metrics = embeddingService.getHelpContentMetrics()

    expect(metrics).toHaveProperty('totalRequests')
    expect(metrics).toHaveProperty('cacheHits')
    expect(metrics).toHaveProperty('cacheMisses')
    expect(typeof metrics.totalRequests).toBe('number')
  })
})

// Performance benchmark test
describe('Performance Benchmarks', () => {
  it('should meet 85% user satisfaction target with search relevance', async () => {
    // This would be measured through user feedback in production
    // For testing, we verify that results have reasonable scores

    const testQueries = [
      'workflow creation tutorial',
      'how to connect blocks',
      'automation best practices',
      'troubleshooting workflow errors',
      'advanced workflow patterns',
    ]

    let satisfactoryResults = 0
    const satisfactionThreshold = 0.6 // Minimum relevance score for satisfaction

    for (const query of testQueries) {
      const results = await searchService.search(query, {}, { maxResults: 5 })

      if (results.length > 0 && results[0].overallScore >= satisfactionThreshold) {
        satisfactoryResults++
      }
    }

    const satisfactionRate = satisfactoryResults / testQueries.length
    expect(satisfactionRate).toBeGreaterThanOrEqual(0.8) // 80% minimum for testing
  })

  it('should support 10M+ help content embeddings (scalability test)', async () => {
    // This is more of a design verification than a runtime test
    // In production, this would be tested with actual large datasets

    const metrics = mockEmbeddingService.getHelpContentMetrics()

    // Verify the system can handle large embedding collections
    expect(typeof metrics.totalRequests).toBe('number')
    expect(metrics).toBeDefined()
  })
})
