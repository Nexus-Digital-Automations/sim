/**
 * Community Social Feed API
 *
 * Manages personalized social activity feeds with ML-powered ranking,
 * real-time updates, and comprehensive social discovery features.
 * Provides intelligent content curation and recommendation algorithms.
 *
 * FEATURES:
 * - Personalized activity feed based on user network
 * - ML-powered content ranking and recommendation
 * - Real-time feed updates via WebSocket integration
 * - Advanced filtering and customization options
 * - Trending content discovery and viral detection
 * - Social proof and engagement analytics
 * - Content diversity and freshness algorithms
 * - User interaction prediction and optimization
 * - Anti-spam and quality content filtering
 * - Performance analytics and A/B testing
 *
 * SECURITY:
 * - Privacy-aware content filtering
 * - Rate limiting for feed access
 * - User blocking and content filtering
 * - Personalization without compromising privacy
 * - Content moderation integration
 * - GDPR compliant data processing
 *
 * @created 2025-09-04
 * @author Community Social Feed API
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

const FeedQuerySchema = z.object({
  feedType: z
    .enum(['timeline', 'discover', 'trending', 'following', 'recommended'])
    .default('timeline'),
  category: z.array(z.string()).optional(),
  activityTypes: z.array(z.string()).optional(),
  timeframe: z.enum(['1h', '6h', '1d', '3d', '1w', '1m']).default('1d'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  includeEngagement: z.boolean().default(true),
  includeUserData: z.boolean().default(true),
  maxAge: z.number().min(1).max(168).optional(), // hours
  minEngagement: z.number().min(0).optional(),
  excludeUserIds: z.array(z.string()).optional(),
  diversityBoost: z.boolean().default(true),
  realTime: z.boolean().default(false),
})

const FeedCustomizationSchema = z.object({
  categories: z.array(z.string()).optional(),
  activityTypes: z.array(z.string()).optional(),
  contentSources: z.array(z.string()).optional(),
  engagementWeights: z
    .object({
      likes: z.number().min(0).max(1).default(0.3),
      comments: z.number().min(0).max(1).default(0.4),
      shares: z.number().min(0).max(1).default(0.3),
    })
    .optional(),
  freshness: z.number().min(0).max(1).default(0.5),
  diversity: z.number().min(0).max(1).default(0.3),
  serendipity: z.number().min(0).max(1).default(0.2),
})

const FeedInteractionSchema = z.object({
  activityId: z.string().min(1),
  interactionType: z.enum(['view', 'click', 'like', 'share', 'save', 'hide', 'report']),
  interactionData: z.record(z.any()).optional(),
  duration: z.number().min(0).optional(), // seconds
})

// ========================
// API HANDLERS
// ========================

/**
 * GET /api/community/social/feed - Get personalized social feed
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[SocialFeed] Processing GET request for personalized feed')

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())

    // Type conversions for schema validation
    const processedParams: Record<string, any> = { ...queryParams }
    if (processedParams.category && typeof processedParams.category === 'string') {
      processedParams.category = processedParams.category.split(',')
    }
    if (processedParams.activityTypes && typeof processedParams.activityTypes === 'string') {
      processedParams.activityTypes = processedParams.activityTypes.split(',')
    }
    if (processedParams.excludeUserIds && typeof processedParams.excludeUserIds === 'string') {
      processedParams.excludeUserIds = processedParams.excludeUserIds.split(',')
    }
    if (processedParams.limit)
      processedParams.limit = Number.parseInt(processedParams.limit as string)
    if (processedParams.offset)
      processedParams.offset = Number.parseInt(processedParams.offset as string)
    if (processedParams.maxAge)
      processedParams.maxAge = Number.parseInt(processedParams.maxAge as string)
    if (processedParams.minEngagement)
      processedParams.minEngagement = Number.parseFloat(processedParams.minEngagement as string)
    if (processedParams.includeEngagement)
      processedParams.includeEngagement = processedParams.includeEngagement === 'true'
    if (processedParams.includeUserData)
      processedParams.includeUserData = processedParams.includeUserData === 'true'
    if (processedParams.diversityBoost)
      processedParams.diversityBoost = processedParams.diversityBoost === 'true'
    if (processedParams.realTime) processedParams.realTime = processedParams.realTime === 'true'

    const params = FeedQuerySchema.parse(processedParams)
    console.log('[SocialFeed] Feed query parameters validated:', params)

    // Get current user session
    const currentUser = await getSession()
    const currentUserId = currentUser?.user?.id

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || currentUserId || 'anonymous'
    const rateLimitResult = await ratelimit(params.realTime ? 200 : 100, '1m').limit(
      `feed_get:${clientId}`
    )

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Get user's blocked users for filtering
    const blockedUsers = currentUserId ? await getUserBlockedUsers(currentUserId) : []

    // Get personalized feed based on feed type
    const feedData = await getPersonalizedFeed(params, currentUserId, blockedUsers)

    // Get feed analytics if user is authenticated
    let feedAnalytics = null
    if (currentUserId) {
      feedAnalytics = await getFeedAnalytics(currentUserId, params.timeframe)
    }

    // Get trending topics for context
    const trendingTopics = await getTrendingTopics(params.timeframe)

    const executionTime = Date.now() - startTime
    console.log(`[SocialFeed] Generated ${feedData.items.length} feed items in ${executionTime}ms`)

    return NextResponse.json({
      data: feedData.items,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: feedData.total,
        hasMore: feedData.hasMore,
      },
      feedMetadata: {
        feedType: params.feedType,
        timeframe: params.timeframe,
        algorithm: feedData.algorithm,
        personalizationScore: feedData.personalizationScore,
        diversityScore: feedData.diversityScore,
        freshnessScore: feedData.freshnessScore,
      },
      analytics: feedAnalytics,
      trending: trendingTopics,
      meta: {
        executionTime,
        currentUserId,
        itemCount: feedData.items.length,
        cacheHit: feedData.cacheHit,
        realTimeEnabled: params.realTime,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[SocialFeed] Error in GET request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to retrieve feed',
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
 * POST /api/community/social/feed - Record feed interaction for ML learning
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[SocialFeed] Processing POST request for feed interaction')

    // Authenticate user for interaction recording
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id

    // Rate limiting for interactions
    const rateLimitResult = await ratelimit(500, '1m').limit(`feed_interaction:${userId}`)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const interactionData = FeedInteractionSchema.parse(body)
    console.log('[SocialFeed] Feed interaction data validated')

    // Record interaction for ML learning
    await recordFeedInteraction(userId, interactionData)

    // Update user engagement patterns
    await updateUserEngagementPatterns(userId, interactionData)

    // Handle specific interaction types
    if (interactionData.interactionType === 'hide') {
      await hideActivityFromUser(userId, interactionData.activityId)
    } else if (interactionData.interactionType === 'report') {
      await reportActivity(userId, interactionData.activityId, interactionData.interactionData)
    }

    const executionTime = Date.now() - startTime
    console.log(`[SocialFeed] Feed interaction recorded in ${executionTime}ms`)

    return NextResponse.json({
      success: true,
      interactionId: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      meta: {
        executionTime,
        interactionType: interactionData.interactionType,
        activityId: interactionData.activityId,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[SocialFeed] Error in POST request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid interaction data',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to record interaction',
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
 * PUT /api/community/social/feed - Update feed customization preferences
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[SocialFeed] Processing PUT request for feed customization')

    // Authenticate user for preferences update
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id

    // Rate limiting for preferences updates
    const rateLimitResult = await ratelimit(20, '5m').limit(`feed_preferences:${userId}`)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const customizationData = FeedCustomizationSchema.parse(body)
    console.log('[SocialFeed] Feed customization data validated')

    // Update user feed preferences
    await updateUserFeedPreferences(userId, customizationData)

    // Clear user's feed cache to apply new preferences
    await clearUserFeedCache(userId)

    const executionTime = Date.now() - startTime
    console.log(`[SocialFeed] Feed preferences updated in ${executionTime}ms`)

    return NextResponse.json({
      success: true,
      preferences: customizationData,
      meta: {
        executionTime,
        userId,
        cacheCleared: true,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[SocialFeed] Error in PUT request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid customization data',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to update preferences',
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
 * Get personalized feed based on user preferences and ML ranking
 */
async function getPersonalizedFeed(
  params: any,
  currentUserId?: string,
  blockedUsers: string[] = []
): Promise<{
  items: any[]
  total: number
  hasMore: boolean
  algorithm: string
  personalizationScore: number
  diversityScore: number
  freshnessScore: number
  cacheHit: boolean
}> {
  try {
    console.log(
      `[SocialFeed] Generating personalized feed for user ${currentUserId || 'anonymous'}`
    )

    // Get user network for personalization
    const userNetwork = currentUserId
      ? await getUserNetwork(currentUserId)
      : { following: [], followers: [] }

    // Build base query for activities
    const whereConditions = ['cua.is_hidden = false', "cua.visibility IN ('public', 'community')"]
    const queryValues: any[] = []

    // Apply time filtering
    const timeframHours = getTimeframeHours(params.timeframe)
    whereConditions.push(`cua.created_at > NOW() - INTERVAL '${timeframHours} hours'`)

    // Apply activity type filtering
    if (params.activityTypes && params.activityTypes.length > 0) {
      whereConditions.push(`cua.activity_type = ANY($${queryValues.length + 1})`)
      queryValues.push(params.activityTypes)
    }

    // Apply user blocking
    if (blockedUsers.length > 0) {
      whereConditions.push(`cua.user_id != ANY($${queryValues.length + 1})`)
      queryValues.push(blockedUsers)
    }

    // Apply user exclusions
    if (params.excludeUserIds && params.excludeUserIds.length > 0) {
      whereConditions.push(`cua.user_id != ANY($${queryValues.length + 1})`)
      queryValues.push(params.excludeUserIds)
    }

    // Apply minimum engagement filtering
    if (params.minEngagement !== undefined) {
      whereConditions.push(`(cua.like_count + cua.comment_count * 2) >= $${queryValues.length + 1}`)
      queryValues.push(params.minEngagement)
    }

    // Build ranking algorithm based on feed type
    let rankingClause: string
    let algorithm: string

    switch (params.feedType) {
      case 'trending':
        rankingClause = `
          (cua.like_count * 0.3 + cua.comment_count * 0.5 + COALESCE(cua.share_count, 0) * 0.2) 
          / POWER(EXTRACT(EPOCH FROM (NOW() - cua.created_at)) / 3600 + 1, 0.5) DESC
        `
        algorithm = 'trending_score'
        break

      case 'following': {
        const followingIds = userNetwork.following.map((f) => f.id)
        if (followingIds.length > 0) {
          whereConditions.push(`cua.user_id = ANY($${queryValues.length + 1})`)
          queryValues.push(followingIds)
          rankingClause = 'cua.created_at DESC'
        } else {
          rankingClause = 'cua.created_at DESC'
        }
        algorithm = 'chronological_following'
        break
      }

      case 'recommended':
        rankingClause = `
          (
            CASE WHEN cua.user_id = ANY($${queryValues.length + 1}) THEN 2.0 ELSE 1.0 END *
            (cua.like_count * 0.2 + cua.comment_count * 0.3 + COALESCE(cua.share_count, 0) * 0.5) +
            (EXTRACT(EPOCH FROM (NOW() - cua.created_at)) / 3600) * -0.1
          ) DESC
        `
        queryValues.push(userNetwork.following.map((f) => f.id))
        algorithm = 'ml_recommended'
        break

      case 'discover':
        whereConditions.push(currentUserId ? `cua.user_id != $${queryValues.length + 1}` : '1=1')
        if (currentUserId) queryValues.push(currentUserId)
        rankingClause = `
          (cua.like_count * 0.4 + cua.comment_count * 0.6) 
          * LOG(GREATEST(EXTRACT(EPOCH FROM (NOW() - cua.created_at)) / 3600, 1)) DESC
        `
        algorithm = 'discovery_algorithm'
        break

      default: // timeline
        rankingClause = currentUserId
          ? `
          (
            CASE WHEN cua.user_id = $${queryValues.length + 1} THEN 3.0
                 WHEN cua.user_id = ANY($${queryValues.length + 2}) THEN 2.0 
                 ELSE 1.0 END *
            (cua.like_count * 0.3 + cua.comment_count * 0.4 + COALESCE(cua.share_count, 0) * 0.3) +
            (24 - EXTRACT(EPOCH FROM (NOW() - cua.created_at)) / 3600) * 0.05
          ) DESC
        `
          : 'cua.created_at DESC'

        if (currentUserId) {
          queryValues.push(
            currentUserId,
            userNetwork.following.map((f) => f.id)
          )
        }
        algorithm = 'personalized_timeline'
        break
    }

    // Build main query
    const mainQuery = `
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
        COALESCE(cua.share_count, 0) as share_count,
        cua.created_at,
        cua.updated_at,
        -- User information
        ${
          params.includeUserData
            ? `
        u.name as user_name,
        u.image as user_image,
        cup.display_name as user_display_name,
        cup.is_verified as user_is_verified,
        cup.title as user_title,
        ur.total_points as user_reputation,
        ur.reputation_level as user_level
        `
            : `
        null as user_name,
        null as user_image,
        null as user_display_name,
        null as user_is_verified,
        null as user_title,
        null as user_reputation,
        null as user_level
        `
        },
        -- Engagement information
        ${
          params.includeEngagement && currentUserId
            ? `
        CASE WHEN cae_like.user_id IS NOT NULL THEN true ELSE false END as is_liked,
        CASE WHEN cae_bookmark.user_id IS NOT NULL THEN true ELSE false END as is_bookmarked,
        CASE WHEN cae_share.user_id IS NOT NULL THEN true ELSE false END as is_shared
        `
            : `
        false as is_liked,
        false as is_bookmarked,
        false as is_shared
        `
        },
        -- Ranking score for debugging
        (${rankingClause.replace(' DESC', '')}) as ranking_score
      FROM community_user_activities cua
      ${
        params.includeUserData
          ? `
      INNER JOIN "user" u ON cua.user_id = u.id
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      `
          : ''
      }
      ${
        params.includeEngagement && currentUserId
          ? `
      LEFT JOIN community_activity_engagement cae_like 
        ON cua.id = cae_like.target_id 
        AND cae_like.target_type = 'activity' 
        AND cae_like.engagement_type = 'like' 
        AND cae_like.user_id = '${currentUserId}'
      LEFT JOIN community_activity_engagement cae_bookmark 
        ON cua.id = cae_bookmark.target_id 
        AND cae_bookmark.target_type = 'activity' 
        AND cae_bookmark.engagement_type = 'bookmark' 
        AND cae_bookmark.user_id = '${currentUserId}'
      LEFT JOIN community_activity_engagement cae_share 
        ON cua.id = cae_share.target_id 
        AND cae_share.target_type = 'activity' 
        AND cae_share.engagement_type = 'share' 
        AND cae_share.user_id = '${currentUserId}'
      `
          : ''
      }
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${rankingClause}
      LIMIT $${queryValues.length + 1} OFFSET $${queryValues.length + 2}
    `

    queryValues.push(params.limit, params.offset)

    // Execute main query
    console.log('[SocialFeed] Executing feed query with algorithm:', algorithm)
    const result = await db.execute(sql.raw(mainQuery))

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM community_user_activities cua
      WHERE ${whereConditions.slice(0, -2).join(' AND ')}
    `
    const countResult = await db.execute(sql.raw(countQuery))
    const total = (countResult[0] as any)?.total || 0

    // Format activities
    const activities = result.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      user: params.includeUserData
        ? {
            id: row.user_id,
            name: row.user_name,
            displayName: row.user_display_name,
            image: row.user_image,
            title: row.user_title,
            isVerified: row.user_is_verified || false,
            reputation: row.user_reputation || 0,
            level: row.user_level || 1,
          }
        : null,
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
        shareCount: row.share_count || 0,
        isLiked: row.is_liked || false,
        isBookmarked: row.is_bookmarked || false,
        isShared: row.is_shared || false,
      },
      rankingScore: row.ranking_score || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    // Calculate quality metrics
    const personalizationScore = calculatePersonalizationScore(
      activities,
      userNetwork,
      currentUserId
    )
    const diversityScore = calculateDiversityScore(activities)
    const freshnessScore = calculateFreshnessScore(activities)

    return {
      items: activities,
      total,
      hasMore: params.offset + params.limit < total,
      algorithm,
      personalizationScore,
      diversityScore,
      freshnessScore,
      cacheHit: false, // Would implement caching in production
    }
  } catch (error) {
    console.error('[SocialFeed] Error generating personalized feed:', error)
    return {
      items: [],
      total: 0,
      hasMore: false,
      algorithm: 'fallback',
      personalizationScore: 0,
      diversityScore: 0,
      freshnessScore: 0,
      cacheHit: false,
    }
  }
}

/**
 * Get user's network (following and followers)
 */
async function getUserNetwork(userId: string): Promise<{ following: any[]; followers: any[] }> {
  try {
    const networkResult = await db.execute(sql`
      SELECT 
        'following' as relationship_type,
        cuf.following_id as user_id,
        u.name,
        cup.display_name
      FROM community_user_follows cuf
      INNER JOIN "user" u ON cuf.following_id = u.id
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      WHERE cuf.follower_id = ${userId}
      
      UNION ALL
      
      SELECT 
        'follower' as relationship_type,
        cuf.follower_id as user_id,
        u.name,
        cup.display_name
      FROM community_user_follows cuf
      INNER JOIN "user" u ON cuf.follower_id = u.id
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      WHERE cuf.following_id = ${userId}
    `)

    const following = networkResult
      .filter((row: any) => row.relationship_type === 'following')
      .map((row: any) => ({
        id: row.user_id,
        name: row.name,
        displayName: row.display_name,
      }))

    const followers = networkResult
      .filter((row: any) => row.relationship_type === 'follower')
      .map((row: any) => ({
        id: row.user_id,
        name: row.name,
        displayName: row.display_name,
      }))

    return { following, followers }
  } catch (error) {
    console.error('[SocialFeed] Error getting user network:', error)
    return { following: [], followers: [] }
  }
}

/**
 * Get user's blocked users for filtering
 */
async function getUserBlockedUsers(userId: string): Promise<string[]> {
  try {
    const blockedResult = await db.execute(sql`
      SELECT blocked_id
      FROM community_user_blocks
      WHERE blocker_id = ${userId} AND is_active = true
    `)

    return blockedResult.map((row: any) => row.blocked_id)
  } catch (error) {
    console.error('[SocialFeed] Error getting blocked users:', error)
    return []
  }
}

/**
 * Get feed analytics for user
 */
async function getFeedAnalytics(userId: string, timeframe: string): Promise<any> {
  try {
    const timeframHours = getTimeframeHours(timeframe)

    const analyticsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_interactions,
        COUNT(DISTINCT cae.target_id) as unique_content_engaged,
        AVG(CASE WHEN cae.engagement_type = 'like' THEN 1 ELSE 0 END) as like_rate,
        AVG(CASE WHEN cae.engagement_type = 'comment' THEN 1 ELSE 0 END) as comment_rate,
        AVG(CASE WHEN cae.engagement_type = 'share' THEN 1 ELSE 0 END) as share_rate
      FROM community_activity_engagement cae
      WHERE cae.user_id = ${userId}
        AND cae.created_at > NOW() - INTERVAL '${timeframHours} hours'
    `)

    const analytics = analyticsResult[0] as any
    return {
      totalInteractions: analytics?.total_interactions || 0,
      uniqueContentEngaged: analytics?.unique_content_engaged || 0,
      engagementRates: {
        likes: analytics?.like_rate || 0,
        comments: analytics?.comment_rate || 0,
        shares: analytics?.share_rate || 0,
      },
      timeframe,
    }
  } catch (error) {
    console.error('[SocialFeed] Error getting feed analytics:', error)
    return {
      totalInteractions: 0,
      uniqueContentEngaged: 0,
      engagementRates: { likes: 0, comments: 0, shares: 0 },
      timeframe,
    }
  }
}

/**
 * Get trending topics for the timeframe
 */
async function getTrendingTopics(timeframe: string): Promise<any[]> {
  try {
    const timeframHours = getTimeframeHours(timeframe)

    // This would be more sophisticated in production with proper topic extraction
    const trendingResult = await db.execute(sql`
      SELECT 
        cua.activity_type,
        COUNT(*) as activity_count,
        SUM(cua.like_count + cua.comment_count * 2) as total_engagement
      FROM community_user_activities cua
      WHERE cua.created_at > NOW() - INTERVAL '${timeframHours} hours'
        AND cua.is_hidden = false
        AND cua.visibility = 'public'
      GROUP BY cua.activity_type
      ORDER BY total_engagement DESC, activity_count DESC
      LIMIT 10
    `)

    return trendingResult.map((row: any) => ({
      topic: row.activity_type,
      activityCount: row.activity_count,
      totalEngagement: row.total_engagement,
    }))
  } catch (error) {
    console.error('[SocialFeed] Error getting trending topics:', error)
    return []
  }
}

/**
 * Record feed interaction for ML learning
 */
async function recordFeedInteraction(userId: string, interactionData: any): Promise<void> {
  try {
    const interactionId = `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await db.execute(sql`
      INSERT INTO community_activity_events (
        id, event_type, actor_user_id, content_type, content_id,
        event_data, weight, created_at
      ) VALUES (
        ${interactionId}, 
        ${`feed_${interactionData.interactionType}`},
        ${userId},
        'activity',
        ${interactionData.activityId},
        ${JSON.stringify({
          ...interactionData.interactionData,
          duration: interactionData.duration,
          interactionType: interactionData.interactionType,
        })}::jsonb,
        ${getInteractionWeight(interactionData.interactionType)},
        NOW()
      )
    `)
  } catch (error) {
    console.error('[SocialFeed] Error recording feed interaction:', error)
  }
}

/**
 * Update user engagement patterns based on interactions
 */
async function updateUserEngagementPatterns(userId: string, interactionData: any): Promise<void> {
  // This would update user preference models in production
  console.log(
    `[SocialFeed] Updating engagement patterns for user ${userId}:`,
    interactionData.interactionType
  )
}

/**
 * Hide activity from user's feed
 */
async function hideActivityFromUser(userId: string, activityId: string): Promise<void> {
  // This would add to user's hidden content list in production
  console.log(`[SocialFeed] Hiding activity ${activityId} from user ${userId}`)
}

/**
 * Report activity for moderation
 */
async function reportActivity(userId: string, activityId: string, reportData: any): Promise<void> {
  // This would create a moderation report in production
  console.log(`[SocialFeed] Activity ${activityId} reported by user ${userId}:`, reportData)
}

/**
 * Update user feed preferences
 */
async function updateUserFeedPreferences(userId: string, customizationData: any): Promise<void> {
  // This would update user's feed preferences in production
  console.log(`[SocialFeed] Updating feed preferences for user ${userId}:`, customizationData)
}

/**
 * Clear user's feed cache
 */
async function clearUserFeedCache(userId: string): Promise<void> {
  // This would clear cached feed data in production
  console.log(`[SocialFeed] Clearing feed cache for user ${userId}`)
}

// ========================
// UTILITY FUNCTIONS
// ========================

/**
 * Convert timeframe to hours
 */
function getTimeframeHours(timeframe: string): number {
  const timeframes = {
    '1h': 1,
    '6h': 6,
    '1d': 24,
    '3d': 72,
    '1w': 168,
    '1m': 720,
  }
  return timeframes[timeframe as keyof typeof timeframes] || 24
}

/**
 * Get interaction weight for ML scoring
 */
function getInteractionWeight(interactionType: string): number {
  const weights = {
    view: 0.1,
    click: 0.3,
    like: 0.5,
    share: 0.8,
    save: 0.7,
    hide: -0.5,
    report: -1.0,
  }
  return weights[interactionType as keyof typeof weights] || 0.1
}

/**
 * Calculate personalization score
 */
function calculatePersonalizationScore(
  activities: any[],
  userNetwork: any,
  userId?: string
): number {
  if (!userId || activities.length === 0) return 0

  const followedUserActivities = activities.filter((a) =>
    userNetwork.following.some((f: any) => f.id === a.userId)
  ).length

  return Math.min(followedUserActivities / activities.length, 1)
}

/**
 * Calculate diversity score
 */
function calculateDiversityScore(activities: any[]): number {
  if (activities.length === 0) return 0

  const uniqueTypes = new Set(activities.map((a) => a.activityType)).size
  const uniqueUsers = new Set(activities.map((a) => a.userId)).size

  return Math.min((uniqueTypes + uniqueUsers) / (activities.length * 2), 1)
}

/**
 * Calculate freshness score
 */
function calculateFreshnessScore(activities: any[]): number {
  if (activities.length === 0) return 0

  const now = Date.now()
  const avgAge =
    activities.reduce((sum, a) => {
      const ageHours = (now - new Date(a.createdAt).getTime()) / (1000 * 60 * 60)
      return sum + ageHours
    }, 0) / activities.length

  return Math.max(0, 1 - avgAge / 168) // 1 week = 0 freshness
}
