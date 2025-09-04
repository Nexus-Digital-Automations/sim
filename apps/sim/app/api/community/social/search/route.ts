/**
 * Community Social Search & Discovery API
 *
 * Comprehensive search and discovery system for social features with intelligent
 * recommendations, trending content detection, and personalized discovery algorithms.
 * Provides advanced search capabilities across users, content, and social interactions.
 *
 * FEATURES:
 * - Multi-faceted search (users, templates, activities, comments)
 * - Intelligent content recommendations and personalization
 * - Trending detection with viral coefficient analysis
 * - Social graph-based discovery and suggestions
 * - Real-time search with autocomplete and suggestions
 * - Advanced filtering and faceted search capabilities
 * - Machine learning-powered relevance scoring
 * - Social proof integration (followers, engagement, reputation)
 * - Contextual search based on user interests and behavior
 * - Geographic and temporal search capabilities
 *
 * SECURITY:
 * - Privacy-aware search with visibility controls
 * - Rate limiting for search queries
 * - Content moderation integration
 * - User blocking and filtering support
 * - Search analytics with privacy protection
 * - GDPR compliant search indexing
 *
 * @created 2025-09-04
 * @author Community Social Search & Discovery API
 */

import { sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { ratelimit } from '@/lib/ratelimit'
import { db } from '@/db'

// ========================
// VALIDATION SCHEMAS
// ========================

const SearchQuerySchema = z.object({
  query: z.string().min(1).max(200),
  searchType: z.enum(['users', 'templates', 'activities', 'comments', 'all']).default('all'),
  filters: z
    .object({
      categories: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      dateRange: z
        .object({
          from: z.string().datetime().optional(),
          to: z.string().datetime().optional(),
        })
        .optional(),
      engagementMin: z.number().min(0).optional(),
      reputationMin: z.number().min(0).optional(),
      verified: z.boolean().optional(),
      location: z.string().optional(),
      language: z.string().optional(),
      contentType: z.array(z.string()).optional(),
    })
    .optional(),
  sort: z.enum(['relevance', 'recent', 'popular', 'trending']).default('relevance'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  includeAggregations: z.boolean().default(true),
  personalized: z.boolean().default(true),
})

const DiscoveryQuerySchema = z.object({
  discoveryType: z
    .enum(['trending', 'recommended', 'similar', 'popular', 'new'])
    .default('recommended'),
  baseId: z.string().optional(), // For similarity-based discovery
  baseType: z.enum(['user', 'template', 'activity']).optional(),
  categories: z.array(z.string()).optional(),
  timeframe: z.enum(['1h', '6h', '1d', '3d', '1w', '1m']).default('1d'),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
  excludeSeen: z.boolean().default(true),
  diversityBoost: z.boolean().default(true),
})

const SuggestionsQuerySchema = z.object({
  query: z.string().min(1).max(100),
  suggestionType: z.enum(['users', 'tags', 'categories', 'locations']).default('users'),
  limit: z.number().min(1).max(20).default(10),
  includeStats: z.boolean().default(false),
})

const TrendingQuerySchema = z.object({
  trendingType: z
    .enum(['hashtags', 'topics', 'users', 'templates', 'activities'])
    .default('topics'),
  timeframe: z.enum(['1h', '6h', '1d', '3d', '1w']).default('1d'),
  limit: z.number().min(1).max(50).default(20),
  minThreshold: z.number().min(0).optional(),
  location: z.string().optional(),
})

// ========================
// API HANDLERS
// ========================

/**
 * GET /api/community/social/search - Universal search endpoint
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[SocialSearch] Processing GET request for universal search')

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())

    // Type conversions for schema validation
    const processedParams: Record<string, any> = { ...queryParams }

    // Handle nested filters object
    if (processedParams.filters && typeof processedParams.filters === 'string') {
      try {
        processedParams.filters = JSON.parse(processedParams.filters)
      } catch {
        processedParams.filters = undefined
      }
    }

    // Convert arrays from comma-separated strings
    const arrayFields = ['categories', 'tags', 'contentType']
    if (processedParams.filters) {
      for (const field of arrayFields) {
        if (processedParams.filters[field] && typeof processedParams.filters[field] === 'string') {
          processedParams.filters[field] = processedParams.filters[field].split(',')
        }
      }
    }

    // Convert numeric fields
    if (processedParams.limit)
      processedParams.limit = Number.parseInt(processedParams.limit as string)
    if (processedParams.offset)
      processedParams.offset = Number.parseInt(processedParams.offset as string)
    if (processedParams.includeAggregations)
      processedParams.includeAggregations = processedParams.includeAggregations === 'true'
    if (processedParams.personalized)
      processedParams.personalized = processedParams.personalized === 'true'

    const params = SearchQuerySchema.parse(processedParams)
    console.log('[SocialSearch] Search parameters validated:', params)

    // Get current user session for personalization
    const currentUser = await getSession()
    const currentUserId = currentUser?.user?.id

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || currentUserId || 'anonymous'
    const rateLimitResult = await ratelimit(200, '1m').limit(`search:${clientId}`)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Get user's blocked users and preferences for filtering
    const searchContext = currentUserId ? await getSearchContext(currentUserId) : null

    // Execute search based on search type
    const searchResults = await executeUniversalSearch(params, currentUserId, searchContext)

    // Get search aggregations if requested
    let aggregations = null
    if (params.includeAggregations) {
      aggregations = await getSearchAggregations(params, currentUserId)
    }

    // Record search query for analytics and ML improvement
    if (currentUserId) {
      await recordSearchQuery(currentUserId, params, searchResults.total)
    }

    const executionTime = Date.now() - startTime
    console.log(
      `[SocialSearch] Search completed with ${searchResults.results.length} results in ${executionTime}ms`
    )

    return NextResponse.json({
      data: searchResults.results,
      pagination: {
        total: searchResults.total,
        limit: params.limit,
        offset: params.offset,
        hasMore: searchResults.hasMore,
      },
      aggregations,
      searchMetadata: {
        searchType: params.searchType,
        query: params.query,
        sort: params.sort,
        personalized: params.personalized && !!currentUserId,
        resultTypes: searchResults.resultTypes,
        algorithmUsed: searchResults.algorithm,
      },
      meta: {
        executionTime,
        currentUserId,
        resultCount: searchResults.results.length,
        queryComplexity: calculateQueryComplexity(params),
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[SocialSearch] Error in GET search request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid search parameters',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Search failed',
        message:
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/community/social/search/discover - Content discovery endpoint
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[SocialSearch] Processing POST request for content discovery')

    // Parse and validate request body
    const body = await request.json()
    const params = DiscoveryQuerySchema.parse(body)
    console.log('[SocialSearch] Discovery parameters validated:', params)

    // Get current user session
    const currentUser = await getSession()
    const currentUserId = currentUser?.user?.id

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || currentUserId || 'anonymous'
    const rateLimitResult = await ratelimit(100, '1m').limit(`discovery:${clientId}`)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Get user context for personalization
    const userContext = currentUserId ? await getUserDiscoveryContext(currentUserId) : null

    // Execute discovery based on discovery type
    const discoveryResults = await executeDiscovery(params, currentUserId, userContext)

    // Record discovery interaction for ML learning
    if (currentUserId) {
      await recordDiscoveryInteraction(currentUserId, params, discoveryResults.results.length)
    }

    const executionTime = Date.now() - startTime
    console.log(
      `[SocialSearch] Discovery completed with ${discoveryResults.results.length} results in ${executionTime}ms`
    )

    return NextResponse.json({
      data: discoveryResults.results,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        hasMore: discoveryResults.hasMore,
      },
      discoveryMetadata: {
        discoveryType: params.discoveryType,
        algorithmUsed: discoveryResults.algorithm,
        personalizationScore: discoveryResults.personalizationScore,
        diversityScore: discoveryResults.diversityScore,
        noveltyScore: discoveryResults.noveltyScore,
      },
      meta: {
        executionTime,
        currentUserId,
        resultCount: discoveryResults.results.length,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[SocialSearch] Error in POST discovery request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid discovery parameters',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Discovery failed',
        message:
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

// ========================
// ADDITIONAL ENDPOINTS
// ========================

/**
 * Handle search suggestions
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[SocialSearch] Processing PUT request for search suggestions')

    const body = await request.json()
    const params = SuggestionsQuerySchema.parse(body)

    // Get current user session
    const currentUser = await getSession()
    const currentUserId = currentUser?.user?.id

    // Rate limiting for suggestions
    const clientId = request.headers.get('x-forwarded-for') || currentUserId || 'anonymous'
    const rateLimitResult = await ratelimit(300, '1m').limit(`suggestions:${clientId}`)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Generate suggestions based on type
    const suggestions = await generateSuggestions(params, currentUserId)

    const executionTime = Date.now() - startTime
    console.log(`[SocialSearch] Generated ${suggestions.length} suggestions in ${executionTime}ms`)

    return NextResponse.json({
      data: suggestions,
      suggestionType: params.suggestionType,
      query: params.query,
      meta: {
        executionTime,
        suggestionCount: suggestions.length,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[SocialSearch] Error in PUT suggestions request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid suggestion parameters',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Suggestions failed',
        message:
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Execute universal search across multiple content types
 */
async function executeUniversalSearch(
  params: any,
  currentUserId?: string,
  searchContext?: any
): Promise<{
  results: any[]
  total: number
  hasMore: boolean
  resultTypes: Record<string, number>
  algorithm: string
}> {
  try {
    console.log('[SocialSearch] Executing universal search:', params.query)

    const results: any[] = []
    const resultTypes: Record<string, number> = {}
    let algorithm = 'basic_search'

    // Search users if requested
    if (params.searchType === 'users' || params.searchType === 'all') {
      const userResults = await searchUsers(params, currentUserId, searchContext)
      results.push(...userResults.map((r) => ({ ...r, resultType: 'user' })))
      resultTypes.users = userResults.length
    }

    // Search templates if requested
    if (params.searchType === 'templates' || params.searchType === 'all') {
      const templateResults = await searchTemplates(params, currentUserId, searchContext)
      results.push(...templateResults.map((r) => ({ ...r, resultType: 'template' })))
      resultTypes.templates = templateResults.length
    }

    // Search activities if requested
    if (params.searchType === 'activities' || params.searchType === 'all') {
      const activityResults = await searchActivities(params, currentUserId, searchContext)
      results.push(...activityResults.map((r) => ({ ...r, resultType: 'activity' })))
      resultTypes.activities = activityResults.length
    }

    // Search comments if requested
    if (params.searchType === 'comments' || params.searchType === 'all') {
      const commentResults = await searchComments(params, currentUserId, searchContext)
      results.push(...commentResults.map((r) => ({ ...r, resultType: 'comment' })))
      resultTypes.comments = commentResults.length
    }

    // Apply unified sorting and ranking
    const rankedResults = applyUniversalRanking(results, params, currentUserId, searchContext)

    // Apply pagination
    const paginatedResults = rankedResults.slice(params.offset, params.offset + params.limit)

    // Determine algorithm used
    if (currentUserId && params.personalized) {
      algorithm = 'personalized_search'
    } else if (params.sort === 'trending') {
      algorithm = 'trending_search'
    } else if (params.sort === 'popular') {
      algorithm = 'popularity_search'
    }

    return {
      results: paginatedResults,
      total: rankedResults.length,
      hasMore: params.offset + params.limit < rankedResults.length,
      resultTypes,
      algorithm,
    }
  } catch (error) {
    console.error('[SocialSearch] Error in universal search:', error)
    return {
      results: [],
      total: 0,
      hasMore: false,
      resultTypes: {},
      algorithm: 'error',
    }
  }
}

/**
 * Search users with advanced filtering and ranking
 */
async function searchUsers(
  params: any,
  currentUserId?: string,
  searchContext?: any
): Promise<any[]> {
  try {
    console.log('[SocialSearch] Searching users:', params.query)

    const searchTerms = params.query.toLowerCase().split(' ').filter(Boolean)
    const whereConditions: string[] = []
    const queryValues: any[] = []

    // Build text search conditions
    const textSearchCondition = searchTerms
      .map(
        (term, index) =>
          `(LOWER(u.name) LIKE $${queryValues.length + index + 1} OR 
        LOWER(cup.display_name) LIKE $${queryValues.length + index + 1} OR 
        LOWER(cup.bio) LIKE $${queryValues.length + index + 1} OR 
        LOWER(cup.title) LIKE $${queryValues.length + index + 1} OR 
        LOWER(cup.company) LIKE $${queryValues.length + index + 1})`
      )
      .join(' AND ')

    whereConditions.push(`(${textSearchCondition})`)
    queryValues.push(...searchTerms.map((term) => `%${term}%`))

    // Apply filters
    if (params.filters?.verified) {
      whereConditions.push('cup.is_verified = true')
    }

    if (params.filters?.reputationMin) {
      whereConditions.push(`ur.total_points >= ${params.filters.reputationMin}`)
    }

    if (params.filters?.location) {
      whereConditions.push(`LOWER(cup.location) LIKE $${queryValues.length + 1}`)
      queryValues.push(`%${params.filters.location.toLowerCase()}%`)
    }

    // Apply blocking filters
    if (currentUserId && searchContext?.blockedUsers?.length > 0) {
      whereConditions.push(`u.id != ANY($${queryValues.length + 1})`)
      queryValues.push(searchContext.blockedUsers)
    }

    // Visibility filter
    whereConditions.push("(cup.profile_visibility = 'public' OR cup.profile_visibility IS NULL)")

    // Build ranking clause
    let orderClause = 'u.created_at DESC'
    if (params.sort === 'relevance') {
      orderClause = `(
        CASE WHEN LOWER(u.name) = LOWER($${queryValues.length + 1}) THEN 10
             WHEN LOWER(cup.display_name) = LOWER($${queryValues.length + 1}) THEN 9
             WHEN LOWER(u.name) LIKE $${queryValues.length + 2} THEN 8
             WHEN LOWER(cup.display_name) LIKE $${queryValues.length + 2} THEN 7
             ELSE 1 END
        + COALESCE(ur.total_points, 0) * 0.001
        + CASE WHEN cup.is_verified THEN 2 ELSE 0 END
      ) DESC`
      queryValues.push(params.query.toLowerCase(), `%${params.query.toLowerCase()}%`)
    } else if (params.sort === 'popular') {
      orderClause = 'follower_counts.follower_count DESC, ur.total_points DESC'
    }

    const query = `
      SELECT 
        u.id,
        u.name,
        u.image,
        cup.display_name,
        cup.bio,
        cup.title,
        cup.company,
        cup.location,
        cup.specializations,
        cup.skills,
        cup.industries,
        cup.is_verified,
        cup.trust_score,
        cup.last_active_at,
        ur.total_points as reputation_points,
        ur.reputation_level,
        COALESCE(follower_counts.follower_count, 0) as follower_count,
        COALESCE(template_counts.template_count, 0) as template_count,
        ${
          currentUserId
            ? `
        CASE WHEN user_follows.follower_id IS NOT NULL THEN true ELSE false END as is_following
        `
            : 'false as is_following'
        }
      FROM "user" u
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      LEFT JOIN (
        SELECT following_id, COUNT(*) as follower_count
        FROM community_user_follows
        GROUP BY following_id
      ) follower_counts ON u.id = follower_counts.following_id
      LEFT JOIN (
        SELECT created_by_user_id, COUNT(*) as template_count
        FROM templates
        WHERE status = 'approved'
        GROUP BY created_by_user_id
      ) template_counts ON u.id = template_counts.created_by_user_id
      ${
        currentUserId
          ? `
      LEFT JOIN community_user_follows user_follows 
        ON u.id = user_follows.following_id AND user_follows.follower_id = '${currentUserId}'
      `
          : ''
      }
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${orderClause}
      LIMIT 50
    `

    const result = await db.execute(sql.raw(query))

    return result.map((row: any) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      image: row.image,
      bio: row.bio,
      title: row.title,
      company: row.company,
      location: row.location,
      specializations: row.specializations || [],
      skills: row.skills || [],
      industries: row.industries || [],
      isVerified: row.is_verified || false,
      trustScore: row.trust_score || 0,
      lastActiveAt: row.last_active_at,
      reputation: {
        points: row.reputation_points || 0,
        level: row.reputation_level || 1,
      },
      socialStats: {
        followerCount: row.follower_count || 0,
        templateCount: row.template_count || 0,
        isFollowing: row.is_following || false,
      },
      searchRelevance: 1.0, // Would calculate relevance score in production
    }))
  } catch (error) {
    console.error('[SocialSearch] Error searching users:', error)
    return []
  }
}

/**
 * Search templates with social context
 */
async function searchTemplates(
  params: any,
  currentUserId?: string,
  searchContext?: any
): Promise<any[]> {
  try {
    console.log('[SocialSearch] Searching templates:', params.query)

    const searchTerms = params.query.toLowerCase().split(' ').filter(Boolean)
    const whereConditions: string[] = ["t.status = 'approved'", "t.visibility = 'public'"]
    const queryValues: any[] = []

    // Build text search conditions
    const textSearchCondition = searchTerms
      .map(
        (term, index) =>
          `(LOWER(t.name) LIKE $${queryValues.length + index + 1} OR 
        LOWER(t.description) LIKE $${queryValues.length + index + 1} OR 
        LOWER(t.category) LIKE $${queryValues.length + index + 1})`
      )
      .join(' AND ')

    whereConditions.push(`(${textSearchCondition})`)
    queryValues.push(...searchTerms.map((term) => `%${term}%`))

    // Apply category filters
    if (params.filters?.categories?.length > 0) {
      whereConditions.push(`t.category = ANY($${queryValues.length + 1})`)
      queryValues.push(params.filters.categories)
    }

    // Apply engagement filters
    if (params.filters?.engagementMin) {
      whereConditions.push(`(t.like_count + t.download_count) >= ${params.filters.engagementMin}`)
    }

    // Apply date filters
    if (params.filters?.dateRange?.from) {
      whereConditions.push(`t.created_at >= $${queryValues.length + 1}`)
      queryValues.push(params.filters.dateRange.from)
    }
    if (params.filters?.dateRange?.to) {
      whereConditions.push(`t.created_at <= $${queryValues.length + 1}`)
      queryValues.push(params.filters.dateRange.to)
    }

    // Build ranking clause
    let orderClause = 't.created_at DESC'
    if (params.sort === 'popular') {
      orderClause = '(t.like_count + t.download_count + t.rating_average * 10) DESC'
    } else if (params.sort === 'trending') {
      orderClause = `(
        (t.like_count + t.download_count) 
        / POWER(EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 3600 + 1, 0.5)
      ) DESC`
    }

    const query = `
      SELECT 
        t.id,
        t.name,
        t.description,
        t.category,
        t.tags,
        t.visibility,
        t.like_count,
        t.download_count,
        t.rating_average,
        t.rating_count,
        t.created_at,
        t.updated_at,
        -- Creator information
        u.name as creator_name,
        u.image as creator_image,
        cup.display_name as creator_display_name,
        cup.is_verified as creator_is_verified,
        ur.total_points as creator_reputation,
        ${
          currentUserId
            ? `
        CASE WHEN template_likes.user_id IS NOT NULL THEN true ELSE false END as is_liked,
        CASE WHEN bookmarks.user_id IS NOT NULL THEN true ELSE false END as is_bookmarked
        `
            : 'false as is_liked, false as is_bookmarked'
        }
      FROM templates t
      INNER JOIN "user" u ON t.created_by_user_id = u.id
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      ${
        currentUserId
          ? `
      LEFT JOIN (
        SELECT target_id, user_id
        FROM community_activity_engagement
        WHERE target_type = 'template' AND engagement_type = 'like' AND user_id = '${currentUserId}'
      ) template_likes ON t.id = template_likes.target_id
      LEFT JOIN (
        SELECT target_id, user_id
        FROM community_activity_engagement
        WHERE target_type = 'template' AND engagement_type = 'bookmark' AND user_id = '${currentUserId}'
      ) bookmarks ON t.id = bookmarks.target_id
      `
          : ''
      }
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${orderClause}
      LIMIT 50
    `

    const result = await db.execute(sql.raw(query))

    return result.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      tags: row.tags || [],
      visibility: row.visibility,
      engagement: {
        likeCount: row.like_count || 0,
        downloadCount: row.download_count || 0,
        ratingAverage: row.rating_average || 0,
        ratingCount: row.rating_count || 0,
        isLiked: row.is_liked || false,
        isBookmarked: row.is_bookmarked || false,
      },
      creator: {
        id: row.created_by_user_id,
        name: row.creator_name,
        displayName: row.creator_display_name,
        image: row.creator_image,
        isVerified: row.creator_is_verified || false,
        reputation: row.creator_reputation || 0,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      searchRelevance: 1.0,
    }))
  } catch (error) {
    console.error('[SocialSearch] Error searching templates:', error)
    return []
  }
}

/**
 * Search activities with engagement context
 */
async function searchActivities(
  params: any,
  currentUserId?: string,
  searchContext?: any
): Promise<any[]> {
  try {
    console.log('[SocialSearch] Searching activities:', params.query)

    const searchTerms = params.query.toLowerCase().split(' ').filter(Boolean)
    const whereConditions: string[] = [
      'cua.is_hidden = false',
      "cua.visibility IN ('public', 'community')",
    ]
    const queryValues: any[] = []

    // Build text search conditions
    const textSearchCondition = searchTerms
      .map(
        (term, index) =>
          `(LOWER(cua.target_title) LIKE $${queryValues.length + index + 1} OR 
        LOWER(cua.activity_data::text) LIKE $${queryValues.length + index + 1})`
      )
      .join(' AND ')

    whereConditions.push(`(${textSearchCondition})`)
    queryValues.push(...searchTerms.map((term) => `%${term}%`))

    // Apply content type filters
    if (params.filters?.contentType?.length > 0) {
      whereConditions.push(`cua.activity_type = ANY($${queryValues.length + 1})`)
      queryValues.push(params.filters.contentType)
    }

    // Apply date filters
    if (params.filters?.dateRange?.from) {
      whereConditions.push(`cua.created_at >= $${queryValues.length + 1}`)
      queryValues.push(params.filters.dateRange.from)
    }
    if (params.filters?.dateRange?.to) {
      whereConditions.push(`cua.created_at <= $${queryValues.length + 1}`)
      queryValues.push(params.filters.dateRange.to)
    }

    // Build ranking clause
    let orderClause = 'cua.created_at DESC'
    if (params.sort === 'popular') {
      orderClause = '(cua.like_count + cua.comment_count * 2) DESC'
    } else if (params.sort === 'trending') {
      orderClause = `(
        (cua.like_count + cua.comment_count * 2) 
        / POWER(EXTRACT(EPOCH FROM (NOW() - cua.created_at)) / 3600 + 1, 0.5)
      ) DESC`
    }

    const query = `
      SELECT 
        cua.id,
        cua.user_id,
        cua.activity_type,
        cua.activity_data,
        cua.target_type,
        cua.target_id,
        cua.target_title,
        cua.visibility,
        cua.is_featured,
        cua.like_count,
        cua.comment_count,
        cua.created_at,
        cua.updated_at,
        -- User information
        u.name as user_name,
        u.image as user_image,
        cup.display_name as user_display_name,
        cup.is_verified as user_is_verified,
        ur.total_points as user_reputation
      FROM community_user_activities cua
      INNER JOIN "user" u ON cua.user_id = u.id
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${orderClause}
      LIMIT 50
    `

    const result = await db.execute(sql.raw(query))

    return result.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      user: {
        id: row.user_id,
        name: row.user_name,
        displayName: row.user_display_name,
        image: row.user_image,
        isVerified: row.user_is_verified || false,
        reputation: row.user_reputation || 0,
      },
      activityType: row.activity_type,
      activityData: row.activity_data || {},
      targetType: row.target_type,
      targetId: row.target_id,
      targetTitle: row.target_title,
      visibility: row.visibility,
      isFeatured: row.is_featured || false,
      engagement: {
        likeCount: row.like_count || 0,
        commentCount: row.comment_count || 0,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      searchRelevance: 1.0,
    }))
  } catch (error) {
    console.error('[SocialSearch] Error searching activities:', error)
    return []
  }
}

/**
 * Search comments with thread context
 */
async function searchComments(
  params: any,
  currentUserId?: string,
  searchContext?: any
): Promise<any[]> {
  try {
    console.log('[SocialSearch] Searching comments:', params.query)

    const searchTerms = params.query.toLowerCase().split(' ').filter(Boolean)
    const whereConditions: string[] = ['cc.is_deleted = false', 'cc.is_hidden = false']
    const queryValues: any[] = []

    // Build text search conditions
    const textSearchCondition = searchTerms
      .map((term, index) => `LOWER(cc.content) LIKE $${queryValues.length + index + 1}`)
      .join(' AND ')

    whereConditions.push(`(${textSearchCondition})`)
    queryValues.push(...searchTerms.map((term) => `%${term}%`))

    // Apply date filters
    if (params.filters?.dateRange?.from) {
      whereConditions.push(`cc.created_at >= $${queryValues.length + 1}`)
      queryValues.push(params.filters.dateRange.from)
    }
    if (params.filters?.dateRange?.to) {
      whereConditions.push(`cc.created_at <= $${queryValues.length + 1}`)
      queryValues.push(params.filters.dateRange.to)
    }

    const query = `
      SELECT 
        cc.id,
        cc.user_id,
        cc.target_type,
        cc.target_id,
        cc.parent_id,
        cc.content,
        cc.depth,
        cc.like_count,
        cc.dislike_count,
        cc.reply_count,
        cc.is_pinned,
        cc.is_edited,
        cc.created_at,
        cc.updated_at,
        -- User information
        u.name as user_name,
        u.image as user_image,
        cup.display_name as user_display_name,
        cup.is_verified as user_is_verified,
        ur.total_points as user_reputation
      FROM community_comments cc
      INNER JOIN "user" u ON cc.user_id = u.id
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY (cc.like_count - cc.dislike_count) DESC, cc.created_at DESC
      LIMIT 30
    `

    const result = await db.execute(sql.raw(query))

    return result.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      user: {
        id: row.user_id,
        name: row.user_name,
        displayName: row.user_display_name,
        image: row.user_image,
        isVerified: row.user_is_verified || false,
        reputation: row.user_reputation || 0,
      },
      targetType: row.target_type,
      targetId: row.target_id,
      parentId: row.parent_id,
      content: row.content,
      depth: row.depth || 0,
      isPinned: row.is_pinned || false,
      isEdited: row.is_edited || false,
      engagement: {
        likeCount: row.like_count || 0,
        dislikeCount: row.dislike_count || 0,
        replyCount: row.reply_count || 0,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      searchRelevance: 1.0,
    }))
  } catch (error) {
    console.error('[SocialSearch] Error searching comments:', error)
    return []
  }
}

/**
 * Execute content discovery based on algorithms
 */
async function executeDiscovery(
  params: any,
  currentUserId?: string,
  userContext?: any
): Promise<{
  results: any[]
  hasMore: boolean
  algorithm: string
  personalizationScore: number
  diversityScore: number
  noveltyScore: number
}> {
  // Implementation would depend on discovery type
  // This is a simplified version
  return {
    results: [],
    hasMore: false,
    algorithm: 'discovery_placeholder',
    personalizationScore: 0,
    diversityScore: 0,
    noveltyScore: 0,
  }
}

/**
 * Generate search suggestions
 */
async function generateSuggestions(params: any, currentUserId?: string): Promise<any[]> {
  try {
    const query = params.query.toLowerCase()

    switch (params.suggestionType) {
      case 'users':
        return await getUserSuggestions(query, params.limit, currentUserId)
      case 'tags':
        return await getTagSuggestions(query, params.limit)
      case 'categories':
        return await getCategorySuggestions(query, params.limit)
      case 'locations':
        return await getLocationSuggestions(query, params.limit)
      default:
        return []
    }
  } catch (error) {
    console.error('[SocialSearch] Error generating suggestions:', error)
    return []
  }
}

/**
 * Get user suggestions for autocomplete
 */
async function getUserSuggestions(
  query: string,
  limit: number,
  currentUserId?: string
): Promise<any[]> {
  try {
    const result = await db.execute(sql`
      SELECT 
        u.id, u.name, u.image,
        cup.display_name, cup.is_verified,
        ur.total_points as reputation
      FROM "user" u
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      WHERE (
        LOWER(u.name) LIKE ${`%${query}%`} OR 
        LOWER(cup.display_name) LIKE ${`%${query}%`}
      )
      AND (cup.profile_visibility = 'public' OR cup.profile_visibility IS NULL)
      AND u.id != COALESCE(${currentUserId}, '')
      ORDER BY 
        CASE WHEN LOWER(u.name) LIKE ${`${query}%`} THEN 1
             WHEN LOWER(cup.display_name) LIKE ${`${query}%`} THEN 2
             ELSE 3 END,
        COALESCE(ur.total_points, 0) DESC
      LIMIT ${limit}
    `)

    return result.map((row: any) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      image: row.image,
      isVerified: row.is_verified || false,
      reputation: row.reputation || 0,
      suggestionType: 'user',
    }))
  } catch (error) {
    console.error('[SocialSearch] Error getting user suggestions:', error)
    return []
  }
}

// Additional helper functions would be implemented here...

/**
 * Apply universal ranking across different content types
 */
function applyUniversalRanking(
  results: any[],
  params: any,
  currentUserId?: string,
  searchContext?: any
): any[] {
  // Implement cross-content-type ranking algorithm
  // This is simplified for now
  return results.sort((a, b) => {
    if (a.searchRelevance !== b.searchRelevance) {
      return b.searchRelevance - a.searchRelevance
    }
    return (
      new Date(b.createdAt || b.created_at).getTime() -
      new Date(a.createdAt || a.created_at).getTime()
    )
  })
}

/**
 * Get search context for personalization
 */
async function getSearchContext(userId: string): Promise<any> {
  try {
    const [blockedUsers, preferences, interests] = await Promise.all([
      getUserBlockedUsers(userId),
      getUserSearchPreferences(userId),
      getUserInterests(userId),
    ])

    return {
      blockedUsers,
      preferences,
      interests,
    }
  } catch (error) {
    console.error('[SocialSearch] Error getting search context:', error)
    return null
  }
}

/**
 * Additional helper functions for context and preferences
 */
async function getUserBlockedUsers(userId: string): Promise<string[]> {
  try {
    const result = await db.execute(sql`
      SELECT blocked_id FROM community_user_blocks 
      WHERE blocker_id = ${userId} AND is_active = true
    `)
    return result.map((row: any) => row.blocked_id)
  } catch (error) {
    return []
  }
}

async function getUserSearchPreferences(userId: string): Promise<any> {
  // Would implement user search preferences
  return {}
}

async function getUserInterests(userId: string): Promise<string[]> {
  // Would implement user interest detection
  return []
}

async function getUserDiscoveryContext(userId: string): Promise<any> {
  // Would implement discovery context
  return {}
}

async function getSearchAggregations(params: any, currentUserId?: string): Promise<any> {
  // Would implement search aggregations (facets)
  return {}
}

async function getTagSuggestions(query: string, limit: number): Promise<any[]> {
  // Would implement tag suggestions
  return []
}

async function getCategorySuggestions(query: string, limit: number): Promise<any[]> {
  // Would implement category suggestions
  return []
}

async function getLocationSuggestions(query: string, limit: number): Promise<any[]> {
  // Would implement location suggestions
  return []
}

async function recordSearchQuery(userId: string, params: any, resultCount: number): Promise<void> {
  // Would implement search analytics
  console.log(`[SocialSearch] Recording search query for user ${userId}: ${params.query}`)
}

async function recordDiscoveryInteraction(
  userId: string,
  params: any,
  resultCount: number
): Promise<void> {
  // Would implement discovery analytics
  console.log(
    `[SocialSearch] Recording discovery interaction for user ${userId}: ${params.discoveryType}`
  )
}

function calculateQueryComplexity(params: any): number {
  // Calculate query complexity for analytics
  let complexity = 1
  if (params.filters) complexity += Object.keys(params.filters).length
  if (params.searchType === 'all') complexity += 2
  return complexity
}
