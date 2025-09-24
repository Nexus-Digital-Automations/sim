/**
 * Tests for ToolDiscoveryService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ToolDiscoveryService } from '../discovery-service'
import type { ToolSearchQuery, EnrichedTool } from '../types'

// Mock database
vi.mock('@/packages/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: vi.fn(() => Promise.resolve([])),
              })),
            })),
          })),
        })),
        where: vi.fn(() => ({
          groupBy: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve([
              {
                id: 'test-category',
                name: 'Test Category',
                count: 5,
              },
            ])),
          })),
        })),
      })),
    })),
  },
}))

// Mock logger
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  })),
}))

// Mock analytics service
vi.mock('../analytics-service', () => ({
  ToolAnalyticsService: vi.fn(() => ({
    getToolAnalytics: vi.fn(() => Promise.resolve({
      usageCount: 10,
      successRate: 0.95,
      avgExecutionTimeMs: 150,
      errorRate: 0.05,
      popularityScore: 0.8,
      reviewCount: 5,
      userRating: 4.2,
    })),
  })),
}))

const mockTool: EnrichedTool = {
  id: 'test_tool',
  name: 'test_tool',
  displayName: 'Test Tool',
  description: 'A test tool',
  version: '1.0.0',
  toolType: 'builtin',
  scope: 'global',
  status: 'active',
  tags: ['test'],
  keywords: ['test', 'mock'],
  schema: {},
  metadata: {},
  implementationType: 'server',
  executionContext: {},
  isPublic: true,
  requiresAuth: false,
  requiredPermissions: [],
  usageExamples: [],
  commonQuestions: [],
  analytics: {
    usageCount: 10,
    successRate: 0.95,
    avgExecutionTimeMs: 150,
    errorRate: 0.05,
    popularityScore: 0.8,
    reviewCount: 5,
    userRating: 4.2,
  },
  healthStatus: {
    status: 'healthy',
    lastCheckTime: new Date(),
  },
}

describe('ToolDiscoveryService', () => {
  let discoveryService: ToolDiscoveryService

  beforeEach(() => {
    discoveryService = new ToolDiscoveryService()
    vi.clearAllMocks()
  })

  describe('searchTools', () => {
    it('should search tools with basic query', async () => {
      const query: ToolSearchQuery = {
        query: 'test',
        limit: 10,
      }

      const results = await discoveryService.searchTools(query)

      expect(results).toBeDefined()
      expect(results).toHaveProperty('tools')
      expect(results).toHaveProperty('total')
      expect(results).toHaveProperty('facets')
      expect(Array.isArray(results.tools)).toBe(true)
      expect(typeof results.total).toBe('number')
    })

    it('should handle empty search results', async () => {
      const query: ToolSearchQuery = {
        query: 'nonexistent',
        limit: 10,
      }

      const results = await discoveryService.searchTools(query)

      expect(results.tools).toHaveLength(0)
      expect(results.total).toBe(0)
    })

    it('should apply filters correctly', async () => {
      const query: ToolSearchQuery = {
        toolType: 'builtin',
        scope: 'global',
        status: 'active',
        tags: ['test'],
        limit: 10,
      }

      const results = await discoveryService.searchTools(query)
      expect(results).toBeDefined()
    })

    it('should include facets in results', async () => {
      const results = await discoveryService.searchTools({ limit: 10 })

      expect(results.facets).toBeDefined()
      expect(results.facets).toHaveProperty('categories')
      expect(results.facets).toHaveProperty('types')
      expect(results.facets).toHaveProperty('scopes')
      expect(results.facets).toHaveProperty('tags')
    })
  })

  describe('getSimilarTools', () => {
    it('should find similar tools', async () => {
      // Mock database to return a tool
      const mockDb = await vi.importMock('@/packages/db')
      mockDb.db.select.mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{
              id: 'test_tool',
              tags: JSON.stringify(['test']),
              keywords: JSON.stringify(['test']),
              categoryId: 'cat_test',
              toolType: 'builtin',
            }])),
          })),
        })),
      })

      const similarTools = await discoveryService.getSimilarTools('test_tool', 5)

      expect(Array.isArray(similarTools)).toBe(true)
    })

    it('should handle tool not found', async () => {
      const mockDb = await vi.importMock('@/packages/db')
      mockDb.db.select.mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })

      await expect(discoveryService.getSimilarTools('nonexistent', 5))
        .rejects.toThrow('Tool not found: nonexistent')
    })
  })

  describe('getPopularTools', () => {
    it('should return popular tools', async () => {
      const popularTools = await discoveryService.getPopularTools(undefined, 10)

      expect(Array.isArray(popularTools)).toBe(true)
    })

    it('should filter by workspace', async () => {
      const popularTools = await discoveryService.getPopularTools('workspace_123', 10)

      expect(Array.isArray(popularTools)).toBe(true)
    })
  })

  describe('getToolsByCategory', () => {
    it('should return tools by category', async () => {
      const tools = await discoveryService.getToolsByCategory('cat_test')

      expect(Array.isArray(tools)).toBe(true)
    })
  })

  describe('getToolsByTags', () => {
    it('should return tools by tags', async () => {
      const tools = await discoveryService.getToolsByTags(['test', 'api'])

      expect(Array.isArray(tools)).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle database errors in search', async () => {
      const mockDb = await vi.importMock('@/packages/db')
      mockDb.db.select.mockImplementation(() => {
        throw new Error('Database error')
      })

      await expect(discoveryService.searchTools({ limit: 10 }))
        .rejects.toThrow('Database error')
    })
  })

  describe('sorting and pagination', () => {
    it('should handle different sort options', async () => {
      const sortOptions = ['name', 'usage', 'rating', 'recent', 'relevance'] as const

      for (const sortBy of sortOptions) {
        const results = await discoveryService.searchTools({
          sortBy,
          sortOrder: 'desc',
          limit: 5,
        })

        expect(results).toBeDefined()
      }
    })

    it('should handle pagination', async () => {
      const page1 = await discoveryService.searchTools({
        limit: 5,
        offset: 0,
      })

      const page2 = await discoveryService.searchTools({
        limit: 5,
        offset: 5,
      })

      expect(page1).toBeDefined()
      expect(page2).toBeDefined()
    })
  })
})