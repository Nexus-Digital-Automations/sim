/**
 * ToolDiscoveryService - Advanced tool search and discovery system
 *
 * Provides intelligent tool discovery with full-text search, filtering,
 * recommendations, and similarity matching.
 */

import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/packages/db'
import { toolCategories, toolRegistry } from '@/packages/db/schema'
import { ToolAnalyticsService } from './analytics-service'
import type {
  EnrichedTool,
  IToolDiscoveryService,
  RecommendationContext,
  ToolAnalytics,
  ToolSearchFacets,
  ToolSearchQuery,
  ToolSearchResult,
} from './types'

const logger = createLogger('ToolDiscoveryService')

/**
 * Advanced tool discovery and search service
 */
export class ToolDiscoveryService implements IToolDiscoveryService {
  private analyticsService: ToolAnalyticsService

  constructor() {
    this.analyticsService = new ToolAnalyticsService()
  }

  /**
   * Search tools with advanced filtering, ranking, and faceting
   */
  async searchTools(query: ToolSearchQuery): Promise<ToolSearchResult> {
    logger.debug('Searching tools', { query })

    try {
      // Build base query with joins
      const baseQuery = db
        .select({
          tool: toolRegistry,
          category: toolCategories,
        })
        .from(toolRegistry)
        .leftJoin(toolCategories, eq(toolRegistry.categoryId, toolCategories.id))

      // Apply filters
      const conditions = this.buildSearchConditions(query)
      const searchQuery = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery

      // Apply sorting
      const sortedQuery = this.applySorting(searchQuery, query.sortBy, query.sortOrder)

      // Apply pagination
      const paginatedQuery = sortedQuery.limit(query.limit || 50).offset(query.offset || 0)

      // Execute main search
      const results = await paginatedQuery

      // Get total count
      const totalQuery = db
        .select({ count: count() })
        .from(toolRegistry)
        .leftJoin(toolCategories, eq(toolRegistry.categoryId, toolCategories.id))

      const totalWithConditions =
        conditions.length > 0 ? totalQuery.where(and(...conditions)) : totalQuery

      const [{ count: total }] = await totalWithConditions

      // Enrich tools with analytics and recommendations
      const enrichedTools = await Promise.all(
        results.map(async (result) => {
          const analytics = await this.analyticsService.getToolAnalytics(result.tool.id)
          return await this.enrichTool(result.tool, result.category, analytics)
        })
      )

      // Generate facets for filtering
      const facets = await this.generateSearchFacets(query)

      // Generate search suggestions if query has text
      const suggestions = query.query
        ? await this.generateSearchSuggestions(query.query)
        : undefined

      return {
        tools: enrichedTools,
        total,
        facets,
        suggestions,
      }
    } catch (error) {
      logger.error('Failed to search tools', { query, error })
      throw error
    }
  }

  /**
   * Find tools similar to a given tool
   */
  async getSimilarTools(toolId: string, limit = 10): Promise<EnrichedTool[]> {
    logger.debug('Finding similar tools', { toolId, limit })

    try {
      const tool = await db.select().from(toolRegistry).where(eq(toolRegistry.id, toolId)).limit(1)

      if (tool.length === 0) {
        throw new Error(`Tool not found: ${toolId}`)
      }

      const targetTool = tool[0]
      const targetTags = JSON.parse(targetTool.tags as string) as string[]
      const targetKeywords = JSON.parse(targetTool.keywords as string) as string[]

      // Find tools with similar tags, categories, or keywords
      const similarTools = await db
        .select({
          tool: toolRegistry,
          category: toolCategories,
        })
        .from(toolRegistry)
        .leftJoin(toolCategories, eq(toolRegistry.categoryId, toolCategories.id))
        .where(
          and(
            eq(toolRegistry.status, 'active'),
            sql`${toolRegistry.id} != ${toolId}`,
            or(
              // Same category
              eq(toolRegistry.categoryId, targetTool.categoryId),
              // Similar tags (using JSON operators)
              sql`${toolRegistry.tags}::jsonb ?| array[${targetTags.map((t) => `'${t}'`).join(',')}]`,
              // Similar keywords
              sql`${toolRegistry.keywords}::jsonb ?| array[${targetKeywords.map((k) => `'${k}'`).join(',')}]`,
              // Same type
              eq(toolRegistry.toolType, targetTool.toolType)
            )
          )
        )
        .orderBy(desc(toolRegistry.usageCount))
        .limit(limit)

      // Enrich and return
      const enrichedTools = await Promise.all(
        similarTools.map(async (result) => {
          const analytics = await this.analyticsService.getToolAnalytics(result.tool.id)
          return await this.enrichTool(result.tool, result.category, analytics)
        })
      )

      return enrichedTools
    } catch (error) {
      logger.error('Failed to find similar tools', { toolId, error })
      throw error
    }
  }

  /**
   * Get popular tools based on usage statistics
   */
  async getPopularTools(workspaceId?: string, limit = 10): Promise<EnrichedTool[]> {
    logger.debug('Getting popular tools', { workspaceId, limit })

    try {
      let query = db
        .select({
          tool: toolRegistry,
          category: toolCategories,
        })
        .from(toolRegistry)
        .leftJoin(toolCategories, eq(toolRegistry.categoryId, toolCategories.id))
        .where(and(eq(toolRegistry.status, 'active'), eq(toolRegistry.isPublic, true)))

      // If workspace-specific, consider workspace usage patterns
      if (workspaceId) {
        // This could be enhanced with workspace-specific analytics
        query = query.orderBy(desc(toolRegistry.usageCount), desc(toolRegistry.successRate))
      } else {
        query = query.orderBy(desc(toolRegistry.usageCount), desc(toolRegistry.successRate))
      }

      const results = await query.limit(limit)

      // Enrich and return
      const enrichedTools = await Promise.all(
        results.map(async (result) => {
          const analytics = await this.analyticsService.getToolAnalytics(result.tool.id)
          return await this.enrichTool(result.tool, result.category, analytics)
        })
      )

      return enrichedTools
    } catch (error) {
      logger.error('Failed to get popular tools', { workspaceId, error })
      throw error
    }
  }

  /**
   * Get recommended tools based on context
   */
  async getRecommendedTools(context: RecommendationContext, limit = 10): Promise<EnrichedTool[]> {
    logger.debug('Getting recommended tools', { context, limit })

    try {
      // Build recommendation conditions based on context
      const conditions = []

      // Filter by workspace and user permissions
      if (context.workspaceId || context.userId) {
        conditions.push(eq(toolRegistry.isPublic, true))
      }

      // If user has preferences, incorporate them
      if (context.userPreferences) {
        const { favoriteCategories, preferredTypes, dismissed } = context.userPreferences

        if (favoriteCategories.length > 0) {
          conditions.push(inArray(toolRegistry.categoryId, favoriteCategories))
        }

        if (preferredTypes.length > 0) {
          conditions.push(inArray(toolRegistry.toolType, preferredTypes))
        }

        if (dismissed.length > 0) {
          conditions.push(
            sql`${toolRegistry.id} NOT IN (${dismissed.map((id) => `'${id}'`).join(',')})`
          )
        }
      }

      // Get base recommendations
      let query = db
        .select({
          tool: toolRegistry,
          category: toolCategories,
        })
        .from(toolRegistry)
        .leftJoin(toolCategories, eq(toolRegistry.categoryId, toolCategories.id))
        .where(and(eq(toolRegistry.status, 'active'), ...conditions))

      // Apply contextual sorting
      if (context.recentTools && context.recentTools.length > 0) {
        // Prioritize tools similar to recently used ones
        query = query.orderBy(desc(toolRegistry.usageCount))
      } else {
        // Default to popular tools
        query = query.orderBy(desc(toolRegistry.usageCount), desc(toolRegistry.successRate))
      }

      const results = await query.limit(limit)

      // Enrich and return
      const enrichedTools = await Promise.all(
        results.map(async (result) => {
          const analytics = await this.analyticsService.getToolAnalytics(result.tool.id)
          const enriched = await this.enrichTool(result.tool, result.category, analytics)

          // Add recommendation data
          enriched.recommendation = {
            score: this.calculateRecommendationScore(enriched, context),
            confidence: 0.8, // This could be more sophisticated
            reason: this.generateRecommendationReason(enriched, context),
            recommendationType: 'contextual',
            contextData: context,
          }

          return enriched
        })
      )

      // Sort by recommendation score
      return enrichedTools.sort(
        (a, b) => (b.recommendation?.score || 0) - (a.recommendation?.score || 0)
      )
    } catch (error) {
      logger.error('Failed to get recommended tools', { context, error })
      throw error
    }
  }

  /**
   * Get tools by category
   */
  async getToolsByCategory(categoryId: string): Promise<EnrichedTool[]> {
    logger.debug('Getting tools by category', { categoryId })

    try {
      const results = await db
        .select({
          tool: toolRegistry,
          category: toolCategories,
        })
        .from(toolRegistry)
        .leftJoin(toolCategories, eq(toolRegistry.categoryId, toolCategories.id))
        .where(and(eq(toolRegistry.categoryId, categoryId), eq(toolRegistry.status, 'active')))
        .orderBy(desc(toolRegistry.usageCount), asc(toolRegistry.displayName))

      // Enrich and return
      const enrichedTools = await Promise.all(
        results.map(async (result) => {
          const analytics = await this.analyticsService.getToolAnalytics(result.tool.id)
          return await this.enrichTool(result.tool, result.category, analytics)
        })
      )

      return enrichedTools
    } catch (error) {
      logger.error('Failed to get tools by category', { categoryId, error })
      throw error
    }
  }

  /**
   * Get tools by tags
   */
  async getToolsByTags(tags: string[]): Promise<EnrichedTool[]> {
    logger.debug('Getting tools by tags', { tags })

    try {
      const results = await db
        .select({
          tool: toolRegistry,
          category: toolCategories,
        })
        .from(toolRegistry)
        .leftJoin(toolCategories, eq(toolRegistry.categoryId, toolCategories.id))
        .where(
          and(
            eq(toolRegistry.status, 'active'),
            sql`${toolRegistry.tags}::jsonb ?| array[${tags.map((tag) => `'${tag}'`).join(',')}]`
          )
        )
        .orderBy(desc(toolRegistry.usageCount))

      // Enrich and return
      const enrichedTools = await Promise.all(
        results.map(async (result) => {
          const analytics = await this.analyticsService.getToolAnalytics(result.tool.id)
          return await this.enrichTool(result.tool, result.category, analytics)
        })
      )

      return enrichedTools
    } catch (error) {
      logger.error('Failed to get tools by tags', { tags, error })
      throw error
    }
  }

  // Helper methods

  /**
   * Build search conditions based on query parameters
   */
  private buildSearchConditions(query: ToolSearchQuery): any[] {
    const conditions = []

    // Text search across multiple fields
    if (query.query) {
      conditions.push(
        or(
          ilike(toolRegistry.name, `%${query.query}%`),
          ilike(toolRegistry.displayName, `%${query.query}%`),
          ilike(toolRegistry.description, `%${query.query}%`),
          ilike(toolRegistry.naturalLanguageDescription, `%${query.query}%`),
          sql`${toolRegistry.tags}::text ILIKE ${`%${query.query}%`}`,
          sql`${toolRegistry.keywords}::text ILIKE ${`%${query.query}%`}`
        )
      )
    }

    // Filter by category
    if (query.categoryId) {
      conditions.push(eq(toolRegistry.categoryId, query.categoryId))
    }

    // Filter by tool type
    if (query.toolType) {
      conditions.push(eq(toolRegistry.toolType, query.toolType))
    }

    // Filter by scope
    if (query.scope) {
      conditions.push(eq(toolRegistry.scope, query.scope))
    }

    // Filter by status
    if (query.status) {
      conditions.push(eq(toolRegistry.status, query.status))
    } else {
      // Default to active tools only
      conditions.push(eq(toolRegistry.status, 'active'))
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      conditions.push(
        sql`${toolRegistry.tags}::jsonb ?| array[${query.tags.map((tag) => `'${tag}'`).join(',')}]`
      )
    }

    // Filter by auth requirement
    if (query.requiresAuth !== undefined) {
      conditions.push(eq(toolRegistry.requiresAuth, query.requiresAuth))
    }

    // Filter by public/private
    if (query.isPublic !== undefined) {
      conditions.push(eq(toolRegistry.isPublic, query.isPublic))
    }

    return conditions
  }

  /**
   * Apply sorting to the query
   */
  private applySorting(query: any, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    const orderFunc = sortOrder === 'asc' ? asc : desc

    switch (sortBy) {
      case 'name':
        return query.orderBy(orderFunc(toolRegistry.displayName))
      case 'usage':
        return query.orderBy(orderFunc(toolRegistry.usageCount))
      case 'rating':
        return query.orderBy(orderFunc(toolRegistry.successRate))
      case 'recent':
        return query.orderBy(orderFunc(toolRegistry.lastUsed))
      default:
        // Default relevance sorting: usage count + success rate
        return query.orderBy(desc(toolRegistry.usageCount), desc(toolRegistry.successRate))
    }
  }

  /**
   * Generate search facets for filtering
   */
  private async generateSearchFacets(query: ToolSearchQuery): Promise<ToolSearchFacets> {
    // Get category facets
    const categories = await db
      .select({
        id: toolCategories.id,
        name: toolCategories.name,
        count: count(toolRegistry.id),
      })
      .from(toolCategories)
      .leftJoin(toolRegistry, eq(toolCategories.id, toolRegistry.categoryId))
      .where(eq(toolRegistry.status, 'active'))
      .groupBy(toolCategories.id, toolCategories.name)
      .orderBy(desc(count(toolRegistry.id)))

    // Get type facets
    const types = await db
      .select({
        type: toolRegistry.toolType,
        count: count(),
      })
      .from(toolRegistry)
      .where(eq(toolRegistry.status, 'active'))
      .groupBy(toolRegistry.toolType)
      .orderBy(desc(count()))

    // Get scope facets
    const scopes = await db
      .select({
        scope: toolRegistry.scope,
        count: count(),
      })
      .from(toolRegistry)
      .where(eq(toolRegistry.status, 'active'))
      .groupBy(toolRegistry.scope)
      .orderBy(desc(count()))

    // Get tag facets (this is more complex with JSON fields)
    // For now, we'll return empty array and implement later
    const tags: Array<{ tag: string; count: number }> = []

    return {
      categories: categories.map((c) => ({ id: c.id, name: c.name, count: Number(c.count) })),
      types: types.map((t) => ({ type: t.type, count: Number(t.count) })),
      scopes: scopes.map((s) => ({ scope: s.scope, count: Number(s.count) })),
      tags,
    }
  }

  /**
   * Generate search suggestions based on query
   */
  private async generateSearchSuggestions(query: string): Promise<string[]> {
    // This is a simplified implementation
    // In a real system, we'd use more sophisticated suggestion algorithms
    const suggestions = []

    // Get similar tool names
    const similarTools = await db
      .select({ name: toolRegistry.displayName })
      .from(toolRegistry)
      .where(and(eq(toolRegistry.status, 'active'), ilike(toolRegistry.displayName, `%${query}%`)))
      .limit(5)

    suggestions.push(...similarTools.map((t) => t.name))

    // Get related categories
    const relatedCategories = await db
      .select({ name: toolCategories.name })
      .from(toolCategories)
      .where(ilike(toolCategories.name, `%${query}%`))
      .limit(3)

    suggestions.push(...relatedCategories.map((c) => c.name))

    return suggestions.slice(0, 8) // Limit total suggestions
  }

  /**
   * Enrich a tool with analytics and category data
   */
  private async enrichTool(
    tool: any,
    category: any,
    analytics: ToolAnalytics
  ): Promise<EnrichedTool> {
    return {
      id: tool.id,
      name: tool.name,
      displayName: tool.displayName,
      description: tool.description,
      longDescription: tool.longDescription || undefined,
      version: tool.version,
      toolType: tool.toolType,
      scope: tool.scope,
      status: tool.status,
      categoryId: tool.categoryId || undefined,
      tags: JSON.parse(tool.tags as string),
      keywords: JSON.parse(tool.keywords as string),
      schema: JSON.parse(tool.schema as string),
      resultSchema: tool.resultSchema ? JSON.parse(tool.resultSchema as string) : undefined,
      metadata: JSON.parse(tool.metadata as string),
      implementationType: tool.implementationType as any,
      executionContext: JSON.parse(tool.executionContext as string),
      isPublic: tool.isPublic,
      requiresAuth: tool.requiresAuth,
      requiredPermissions: JSON.parse(tool.requiredPermissions as string),
      naturalLanguageDescription: tool.naturalLanguageDescription || undefined,
      usageExamples: JSON.parse(tool.usageExamples as string),
      commonQuestions: JSON.parse(tool.commonQuestions as string),
      category: category || undefined,
      analytics,
      healthStatus: {
        status: tool.healthStatus as any,
        lastCheckTime: tool.lastHealthCheck || undefined,
      },
    }
  }

  /**
   * Calculate recommendation score based on context
   */
  private calculateRecommendationScore(tool: EnrichedTool, context: RecommendationContext): number {
    let score = 0.5 // Base score

    // Usage-based scoring
    if (tool.analytics.usageCount > 0) {
      score += Math.min(tool.analytics.usageCount / 1000, 0.3) // Max 0.3 for usage
    }

    // Success rate scoring
    if (tool.analytics.successRate > 0) {
      score += tool.analytics.successRate * 0.2 // Max 0.2 for success rate
    }

    // Context-based scoring
    if (context.userPreferences) {
      const { favoriteCategories, preferredTypes, recentlyUsed } = context.userPreferences

      // Category preference
      if (tool.categoryId && favoriteCategories.includes(tool.categoryId)) {
        score += 0.2
      }

      // Type preference
      if (preferredTypes.includes(tool.toolType)) {
        score += 0.1
      }

      // Recently used bonus
      if (recentlyUsed.includes(tool.id)) {
        score += 0.15
      }
    }

    return Math.min(score, 1.0) // Cap at 1.0
  }

  /**
   * Generate recommendation reason
   */
  private generateRecommendationReason(tool: EnrichedTool, context: RecommendationContext): string {
    const reasons = []

    if (tool.analytics.usageCount > 100) {
      reasons.push('Popular tool')
    }

    if (tool.analytics.successRate > 0.9) {
      reasons.push('High success rate')
    }

    if (context.userPreferences?.favoriteCategories.includes(tool.categoryId!)) {
      reasons.push('Matches your preferences')
    }

    if (context.recentTools?.length && tool.category) {
      reasons.push(`Similar to tools you've used recently`)
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Recommended for you'
  }
}
