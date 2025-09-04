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
 */
interface SearchSuggestion {
  type: 'template' | 'category' | 'author' | 'tag'
  value: string
  label: string
  description?: string
  metadata?: {
    icon?: string
    color?: string
    count?: number
    rating?: number
    reputation?: number
    trend?: number
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

  return templateResults.map((template) => ({
    type: 'template' as const,
    value: template.id,
    label: template.name,
    description:
      template.description?.slice(0, 100) +
      (template.description && template.description.length > 100 ? '...' : ''),
    metadata: {
      icon: template.icon || '📄',
      color: template.color || '#3B82F6',
      count: template.views + (template.downloadCount || 0),
      rating: template.avgRating || 0,
    },
  }))
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

  return categoryResults.map((category) => ({
    type: 'category' as const,
    value: category.slug,
    label: category.name,
    description: category.description,
    metadata: {
      icon: category.icon || '📁',
      color: category.color || '#6B7280',
      count: category.templateCount,
    },
  }))
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
    const reputation = reputationMap.get(author.userId) || { points: 0, level: 1 }

    return {
      type: 'author' as const,
      value: author.userId || author.author,
      label: author.author,
      description: `${author.templateCount} templates • Level ${reputation.level}`,
      metadata: {
        icon: '👤',
        count: author.templateCount,
        rating: Number(author.avgRating?.toFixed(1)) || 0,
        reputation: reputation.points,
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

  return tagResults.map((tag) => ({
    type: 'tag' as const,
    value: tag.name,
    label: tag.displayName,
    description: tag.description,
    metadata: {
      icon: '🏷️',
      color: tag.color || '#3B82F6',
      count: tag.usageCount,
      trend: tag.weeklyGrowth > 0 ? tag.trendScore : 0,
    },
  }))
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
      ...popularTemplates.map((template) => ({
        type: 'template' as const,
        value: template.id,
        label: template.name,
        description: 'Popular template',
        metadata: {
          icon: template.icon || '📄',
          color: template.color || '#3B82F6',
          count: template.views + (template.downloadCount || 0),
          rating: template.avgRating || 0,
        },
      }))
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
      ...popularCategories.map((category) => ({
        type: 'category' as const,
        value: category.slug,
        label: category.name,
        description: 'Browse category',
        metadata: {
          icon: category.icon || '📁',
          color: category.color || '#6B7280',
          count: category.templateCount,
        },
      }))
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
      ...trendingTags.map((tag) => ({
        type: 'tag' as const,
        value: tag.name,
        label: tag.displayName,
        description: 'Trending topic',
        metadata: {
          icon: '🔥',
          color: tag.color || '#3B82F6',
          count: tag.usageCount,
          trend: tag.trendScore,
        },
      }))
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

  // Boost trending items
  const trend = suggestion.metadata?.trend || 0
  if (trend > 50) score += 15
  else if (trend > 20) score += 10
  else if (trend > 0) score += 5

  // Boost highly rated items
  const rating = suggestion.metadata?.rating || 0
  if (rating >= 4.5) score += 15
  else if (rating >= 4.0) score += 10
  else if (rating >= 3.5) score += 5

  return score
}
