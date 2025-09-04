/**
 * Marketplace Search Suggestions API - Real-time Search Auto-completion
 *
 * This API provides intelligent search suggestions including:
 * - Template name and description matching with fuzzy search
 * - Author suggestions with reputation weighting
 * - Category and tag suggestions with usage statistics
 * - Trending and popular content recommendations
 * - Performance-optimized with caching and query optimization
 *
 * @author Claude Code Template Marketplace System
 * @version 1.0.0
 */

import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { templateCategories, templates, templateTags, userReputation } from '@/db/schema'

const logger = createLogger('MarketplaceSuggestionsAPI')

/**
 * Search Suggestion Types
 *
 * Defines the structure for search auto-completion suggestions across the marketplace.
 * Each suggestion includes type classification, display information, and enrichment metadata
 * for ranking and presentation purposes.
 */
interface SearchSuggestion {
  /** Suggestion type classification for filtering and priority ranking */
  type: 'template' | 'category' | 'author' | 'tag'
  /** Unique identifier or search value used for query execution */
  value: string
  /** Human-readable display label for the suggestion */
  label: string
  /** Optional detailed description for context and preview */
  description?: string
  /** Enrichment metadata for ranking, visual styling, and user guidance */
  metadata?: {
    /** Visual icon identifier for UI representation */
    icon?: string
    /** Color theme identifier for visual consistency */
    color?: string
    /** Usage statistics (views, downloads, template count, etc.) */
    count?: number
    /** Average user rating (0-5 scale) for quality indication */
    rating?: number
    /** Author reputation points for credibility assessment */
    reputation?: number
    /** Trending score or growth percentage for popularity indication */
    trend?: number | string
  }
}

/**
 * Get Search Suggestions - GET /api/community/marketplace/suggestions
 *
 * Provide intelligent search auto-completion suggestions
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)

    // Extract and validate parameters
    const query = searchParams.get('q')?.trim()
    const limit = Math.min(20, Math.max(1, Number.parseInt(searchParams.get('limit') || '10')))
    const types = searchParams.get('types')?.split(',') || ['template', 'category', 'author', 'tag']
    const includePopular = searchParams.get('popular') !== 'false'

    if (!query || query.length < 2) {
      // Return popular suggestions if no query provided
      if (includePopular) {
        const popularSuggestions = await getPopularSuggestions(limit, types)

        return NextResponse.json({
          success: true,
          suggestions: popularSuggestions,
          metadata: {
            requestId,
            processingTime: Date.now() - startTime,
            query: '',
            type: 'popular',
          },
        })
      }
      return NextResponse.json({
        success: true,
        suggestions: [],
        metadata: {
          requestId,
          processingTime: Date.now() - startTime,
          query: '',
          type: 'empty',
        },
      })
    }

    logger.info(`[${requestId}] Search suggestions request`, {
      query,
      limit,
      types,
    })

    const suggestions: SearchSuggestion[] = []

    // Get suggestions from different sources in parallel
    const suggestionPromises: Promise<SearchSuggestion[]>[] = []

    if (types.includes('template')) {
      suggestionPromises.push(getTemplateSuggestions(query, Math.ceil(limit * 0.4)))
    }

    if (types.includes('category')) {
      suggestionPromises.push(getCategorySuggestions(query, Math.ceil(limit * 0.2)))
    }

    if (types.includes('author')) {
      suggestionPromises.push(getAuthorSuggestions(query, Math.ceil(limit * 0.2)))
    }

    if (types.includes('tag')) {
      suggestionPromises.push(getTagSuggestions(query, Math.ceil(limit * 0.2)))
    }

    // Execute all suggestion queries in parallel
    const suggestionResults = await Promise.allSettled(suggestionPromises)

    // Combine and rank suggestions
    for (const result of suggestionResults) {
      if (result.status === 'fulfilled') {
        suggestions.push(...result.value)
      } else {
        logger.warn(`[${requestId}] Suggestion query failed`, {
          error: result.reason,
        })
      }
    }

    // Sort suggestions by relevance and limit results
    const rankedSuggestions = rankSuggestions(suggestions, query).slice(0, limit)

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Search suggestions completed`, {
      query,
      suggestionCount: rankedSuggestions.length,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      suggestions: rankedSuggestions,
      metadata: {
        requestId,
        processingTime,
        query,
        total: rankedSuggestions.length,
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Search suggestions failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get suggestions',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Get template name and description suggestions
 */
async function getTemplateSuggestions(query: string, limit: number): Promise<SearchSuggestion[]> {
  const searchTerm = `%${query}%`

  const templateResults = await db
    .select({
      id: templates.id,
      name: templates.name,
      description: templates.description,
      author: templates.author,
      views: templates.views,
      downloadCount: templates.downloadCount,
      avgRating: templates.avgRating,
      ratingCount: templates.ratingCount,
      icon: templates.icon,
      color: templates.color,
    })
    .from(templates)
    .where(
      and(
        eq(templates.status, 'published'),
        or(ilike(templates.name, searchTerm), ilike(templates.description, searchTerm))
      )
    )
    .orderBy(
      desc(sql`(${templates.views} + ${templates.downloadCount} * 2 + ${templates.stars} * 3)`),
      desc(templates.avgRating)
    )
    .limit(limit)

  return templateResults.map((template) => {
    // Apply null safety patterns for template metrics and content
    const safeViews = template.views ?? 0
    const safeDownloadCount = template.downloadCount ?? 0
    const safeAvgRating = template.avgRating ?? 0

    // Safely truncate description with null checking
    const description = template.description
      ? template.description.length > 100
        ? `${template.description.slice(0, 100)}...`
        : template.description
      : undefined

    // Ensure SearchSuggestion interface compliance
    return {
      type: 'template' as const,
      value: template.id || '',
      label: template.name || '',
      description,
      metadata: {
        icon: template.icon || '📄',
        color: template.color || '#3B82F6',
        count: safeViews + safeDownloadCount,
        rating: safeAvgRating,
      },
    }
  })
}

/**
 * Get category suggestions
 */
async function getCategorySuggestions(query: string, limit: number): Promise<SearchSuggestion[]> {
  const searchTerm = `%${query}%`

  const categoryResults = await db
    .select({
      id: templateCategories.id,
      name: templateCategories.name,
      slug: templateCategories.slug,
      description: templateCategories.description,
      icon: templateCategories.icon,
      color: templateCategories.color,
      templateCount: templateCategories.templateCount,
    })
    .from(templateCategories)
    .where(
      and(
        eq(templateCategories.isActive, true),
        or(
          ilike(templateCategories.name, searchTerm),
          ilike(templateCategories.description, searchTerm)
        )
      )
    )
    .orderBy(desc(templateCategories.templateCount), templateCategories.name)
    .limit(limit)

  return categoryResults.map((category) => {
    // Apply null safety patterns for category data
    const safeTemplateCount = category.templateCount ?? 0

    // Ensure SearchSuggestion interface compliance
    return {
      type: 'category' as const,
      value: category.slug || category.id || '',
      label: category.name || '',
      description: category.description || undefined,
      metadata: {
        icon: category.icon || '📁',
        color: category.color || '#6B7280',
        count: safeTemplateCount,
      },
    }
  })
}

/**
 * Get author suggestions
 */
async function getAuthorSuggestions(query: string, limit: number): Promise<SearchSuggestion[]> {
  const searchTerm = `%${query}%`

  // Get authors from templates with their stats
  const authorResults = await db
    .select({
      userId: templates.userId,
      author: templates.author,
      templateCount: sql<number>`COUNT(*)`,
      totalViews: sql<number>`SUM(${templates.views})`,
      totalDownloads: sql<number>`SUM(COALESCE(${templates.downloadCount}, 0))`,
      avgRating: sql<number>`AVG(CASE WHEN ${templates.ratingCount} > 0 THEN ${templates.avgRating} ELSE NULL END)`,
    })
    .from(templates)
    .where(and(eq(templates.status, 'published'), ilike(templates.author, searchTerm)))
    .groupBy(templates.userId, templates.author)
    .orderBy(desc(sql`COUNT(*)`), desc(sql`SUM(${templates.views})`))
    .limit(limit)

  // Enrich with reputation data
  const authorIds = authorResults.map((a) => a.userId).filter(Boolean)
  let reputationMap = new Map()

  if (authorIds.length > 0) {
    const reputationResults = await db
      .select({
        userId: userReputation.userId,
        totalPoints: userReputation.totalPoints,
        reputationLevel: userReputation.reputationLevel,
      })
      .from(userReputation)
      .where(sql`${userReputation.userId} = ANY(${authorIds})`)

    reputationMap = new Map(
      reputationResults.map((r) => [r.userId, { points: r.totalPoints, level: r.reputationLevel }])
    )
  }

  return authorResults.map((author) => {
    // Apply null safety patterns for author reputation and metrics
    const reputation = reputationMap.get(author.userId) || { points: 0, level: 1 }
    const safeTemplateCount = Number(author.templateCount) || 0
    const safeAvgRating = author.avgRating ? Number(author.avgRating.toFixed(1)) : 0
    const safeReputationPoints = Number(reputation.points) || 0
    const safeReputationLevel = Number(reputation.level) || 1

    // Ensure SearchSuggestion interface compliance
    return {
      type: 'author' as const,
      value: author.userId || author.author || '',
      label: author.author || '',
      description: `${safeTemplateCount} templates • Level ${safeReputationLevel}`,
      metadata: {
        icon: '👤',
        count: safeTemplateCount,
        rating: safeAvgRating,
        reputation: safeReputationPoints,
      },
    }
  })
}

/**
 * Get tag suggestions
 */
async function getTagSuggestions(query: string, limit: number): Promise<SearchSuggestion[]> {
  const searchTerm = `%${query}%`

  const tagResults = await db
    .select({
      id: templateTags.id,
      name: templateTags.name,
      displayName: templateTags.displayName,
      description: templateTags.description,
      color: templateTags.color,
      usageCount: templateTags.usageCount,
      trendScore: templateTags.trendScore,
      weeklyGrowth: templateTags.weeklyGrowth,
    })
    .from(templateTags)
    .where(
      and(
        eq(templateTags.isActive, true),
        or(
          ilike(templateTags.displayName, searchTerm),
          ilike(templateTags.name, searchTerm),
          ilike(templateTags.description, searchTerm)
        )
      )
    )
    .orderBy(desc(templateTags.usageCount), desc(templateTags.trendScore))
    .limit(limit)

  return tagResults.map((tag) => {
    // Apply null safety patterns for growth calculations and trend analysis
    // weeklyGrowth and trendScore are decimal types that return strings from database
    // Convert to numbers with null safety for mathematical comparisons
    const safeWeeklyGrowth = Number(tag.weeklyGrowth) || 0
    const safeTrendScore = Number(tag.trendScore) || 0
    const safeUsageCount = Number(tag.usageCount) || 0

    // Calculate trend indicator - positive growth gets trend score, otherwise stable
    const trendValue = safeWeeklyGrowth > 0.1 ? safeTrendScore : 0

    // Ensure SearchSuggestion interface compliance with proper type casting
    return {
      type: 'tag' as const,
      value: tag.name || '',
      label: tag.displayName || tag.name || '',
      description: tag.description || undefined,
      metadata: {
        icon: '🏷️',
        color: tag.color || '#3B82F6',
        count: safeUsageCount,
        trend: trendValue,
      },
    }
  })
}

/**
 * Get popular suggestions when no query is provided
 */
async function getPopularSuggestions(limit: number, types: string[]): Promise<SearchSuggestion[]> {
  const suggestions: SearchSuggestion[] = []
  const perType = Math.ceil(limit / types.length)

  // Get popular templates
  if (types.includes('template')) {
    const popularTemplates = await db
      .select({
        id: templates.id,
        name: templates.name,
        description: templates.description,
        views: templates.views,
        downloadCount: templates.downloadCount,
        avgRating: templates.avgRating,
        icon: templates.icon,
        color: templates.color,
      })
      .from(templates)
      .where(eq(templates.status, 'published'))
      .orderBy(
        desc(sql`(${templates.views} + ${templates.downloadCount} * 2 + ${templates.stars} * 3)`)
      )
      .limit(perType)

    suggestions.push(
      ...popularTemplates.map((template) => {
        // Apply null safety patterns for popular template metrics
        const safeViews = template.views ?? 0
        const safeDownloadCount = template.downloadCount ?? 0
        const safeAvgRating = template.avgRating ?? 0

        // Ensure SearchSuggestion interface compliance
        return {
          type: 'template' as const,
          value: template.id || '',
          label: template.name || '',
          description: 'Popular template',
          metadata: {
            icon: template.icon || '📄',
            color: template.color || '#3B82F6',
            count: safeViews + safeDownloadCount,
            rating: safeAvgRating,
          },
        }
      })
    )
  }

  // Get popular categories
  if (types.includes('category')) {
    const popularCategories = await db
      .select({
        id: templateCategories.id,
        name: templateCategories.name,
        slug: templateCategories.slug,
        icon: templateCategories.icon,
        color: templateCategories.color,
        templateCount: templateCategories.templateCount,
      })
      .from(templateCategories)
      .where(eq(templateCategories.isActive, true))
      .orderBy(desc(templateCategories.templateCount))
      .limit(perType)

    suggestions.push(
      ...popularCategories.map((category) => {
        // Apply null safety patterns for popular category data
        const safeTemplateCount = category.templateCount ?? 0

        // Ensure SearchSuggestion interface compliance
        return {
          type: 'category' as const,
          value: category.slug || category.id || '',
          label: category.name || '',
          description: 'Browse category',
          metadata: {
            icon: category.icon || '📁',
            color: category.color || '#6B7280',
            count: safeTemplateCount,
          },
        }
      })
    )
  }

  // Get trending tags
  if (types.includes('tag')) {
    const trendingTags = await db
      .select({
        id: templateTags.id,
        name: templateTags.name,
        displayName: templateTags.displayName,
        color: templateTags.color,
        usageCount: templateTags.usageCount,
        trendScore: templateTags.trendScore,
      })
      .from(templateTags)
      .where(eq(templateTags.isActive, true))
      .orderBy(desc(templateTags.trendScore), desc(templateTags.usageCount))
      .limit(perType)

    suggestions.push(
      ...trendingTags.map((tag) => {
        // Apply null safety patterns for trending tag data
        // Convert decimal types to numbers for safe mathematical operations
        const safeUsageCount = Number(tag.usageCount) || 0
        const safeTrendScore = Number(tag.trendScore) || 0

        // Ensure SearchSuggestion interface compliance
        return {
          type: 'tag' as const,
          value: tag.name || '',
          label: tag.displayName || tag.name || '',
          description: 'Trending topic',
          metadata: {
            icon: '🔥',
            color: tag.color || '#3B82F6',
            count: safeUsageCount,
            trend: safeTrendScore,
          },
        }
      })
    )
  }

  return suggestions.slice(0, limit)
}

/**
 * Rank and sort suggestions by relevance to query
 */
function rankSuggestions(suggestions: SearchSuggestion[], query: string): SearchSuggestion[] {
  const queryLower = query.toLowerCase()

  return suggestions
    .map((suggestion) => ({
      ...suggestion,
      relevanceScore: calculateRelevanceScore(suggestion, queryLower),
    }))
    .sort((a, b) => {
      // Sort by relevance score first, then by metadata
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore
      }

      // Secondary sorting by type priority and metadata
      const typePriority = { template: 4, category: 3, author: 2, tag: 1 }
      const aTypePriority = typePriority[a.type] || 0
      const bTypePriority = typePriority[b.type] || 0

      if (bTypePriority !== aTypePriority) {
        return bTypePriority - aTypePriority
      }

      // Tertiary sorting by popularity metrics
      const aCount = a.metadata?.count || 0
      const bCount = b.metadata?.count || 0
      return bCount - aCount
    })
    .map(({ relevanceScore, ...suggestion }) => suggestion) // Remove relevanceScore from final result
}

/**
 * Calculate relevance score for a suggestion
 */
function calculateRelevanceScore(suggestion: SearchSuggestion, queryLower: string): number {
  let score = 0
  const labelLower = suggestion.label.toLowerCase()
  const descriptionLower = suggestion.description?.toLowerCase() || ''

  // Exact match gets highest score
  if (labelLower === queryLower) {
    score += 100
  } else if (labelLower.startsWith(queryLower)) {
    score += 80
  } else if (labelLower.includes(queryLower)) {
    score += 60
  } else if (descriptionLower.includes(queryLower)) {
    score += 40
  }

  // Boost score based on popularity
  const count = suggestion.metadata?.count || 0
  if (count > 1000) score += 20
  else if (count > 100) score += 15
  else if (count > 10) score += 10
  else if (count > 0) score += 5

  // Boost trending items with null safety for trend values
  // trend can be number or string, requiring safe type conversion
  const trendValue =
    typeof suggestion.metadata?.trend === 'number'
      ? suggestion.metadata.trend
      : typeof suggestion.metadata?.trend === 'string'
        ? Number(suggestion.metadata.trend) || 0
        : 0

  if (trendValue > 50) score += 15
  else if (trendValue > 20) score += 10
  else if (trendValue > 0) score += 5

  // Boost highly rated items
  const rating = suggestion.metadata?.rating || 0
  if (rating >= 4.5) score += 15
  else if (rating >= 4.0) score += 10
  else if (rating >= 3.5) score += 5

  return score
}
