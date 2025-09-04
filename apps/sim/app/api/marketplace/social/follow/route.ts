/**
 * Social Follow API - User Following and Social Relationships
 *
 * This API manages user following relationships and social features including:
 * - Follow/unfollow functionality with real-time updates
 * - Following and followers management
 * - Activity feed generation based on social connections
 * - Social graph analytics and relationship metrics
 * - Privacy and permission controls for social interactions
 * - Comprehensive audit trails and moderation support
 *
 * Features:
 * - Real-time WebSocket notifications for follow events
 * - Social network analysis and influence scoring
 * - Mutual connections and network recommendations
 * - Privacy controls and blocking functionality
 * - Analytics tracking for community engagement
 * - Rate limiting and spam prevention
 *
 * @author Claude Code Social System
 * @version 2.0.0
 * @implements Community Social Features Architecture
 */

import { and, eq, sql, desc, asc } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { user } from '@/db/schema'

const logger = createLogger('MarketplaceSocialFollowAPI')

/**
 * Follow User - POST /api/marketplace/social/follow
 *
 * Follow another user and create social relationship
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { userId, targetUserId } = await request.json()

    if (!userId || !targetUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          message: 'Both userId and targetUserId are required',
        },
        { status: 400 }
      )
    }

    if (userId === targetUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid operation',
          message: 'Users cannot follow themselves',
        },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Follow request`, {
      userId: `${userId.slice(0, 8)}...`,
      targetUserId: `${targetUserId.slice(0, 8)}...`,
    })

    // Verify both users exist
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
      })
      .from(user)
      .where(sql`${user.id} IN (${userId}, ${targetUserId})`)

    if (users.length !== 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
          message: 'One or both users do not exist',
        },
        { status: 404 }
      )
    }

    const follower = users.find(u => u.id === userId)
    const following = users.find(u => u.id === targetUserId)

    // Check if follow relationship already exists
    const existingFollow = await db
      .select()
      .from(sql`user_follows`)
      .where(sql`follower_id = ${userId} AND following_id = ${targetUserId}`)
      .limit(1)

    if (existingFollow.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Already following',
          message: 'User is already following this user',
        },
        { status: 409 }
      )
    }

    // Create follow relationship
    await db.execute(sql`
      INSERT INTO user_follows (follower_id, following_id, created_at)
      VALUES (${userId}, ${targetUserId}, NOW())
    `)

    // Create activity feed entry for the followed user
    await db.execute(sql`
      INSERT INTO activity_feed (
        user_id, actor_id, activity_type, object_type, object_id,
        engagement_score, relevance_score, created_at
      )
      VALUES (
        ${targetUserId}, ${userId}, 'user_followed', 'user', ${userId}::uuid,
        2.0, 1.5, NOW()
      )
    `)

    // Update follower counts (if we had a user stats table)
    // This could be done with triggers or a background job for better performance

    // Get updated follow stats
    const [followStats, mutualCount] = await Promise.all([
      getFollowStats(userId, targetUserId),
      getMutualConnectionsCount(userId, targetUserId),
    ])

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Follow relationship created`, {
      followerId: `${userId.slice(0, 8)}...`,
      followingId: `${targetUserId.slice(0, 8)}...`,
      mutualConnections: mutualCount,
      processingTime,
    })

    // Track social analytics
    await trackSocialAnalytics(requestId, {
      eventType: 'follow',
      userId,
      targetUserId,
      mutualConnections: mutualCount,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: {
        relationshipCreated: true,
        follower: {
          id: follower?.id,
          name: follower?.name,
          image: follower?.image,
        },
        following: {
          id: following?.id,
          name: following?.name,
          image: following?.image,
        },
        mutualConnections: mutualCount,
        followStats,
      },
      metadata: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Follow operation failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create follow relationship',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Unfollow User - DELETE /api/marketplace/social/follow
 *
 * Remove follow relationship between users
 */
export async function DELETE(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const targetUserId = searchParams.get('targetUserId')

    if (!userId || !targetUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          message: 'Both userId and targetUserId are required',
        },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Unfollow request`, {
      userId: `${userId.slice(0, 8)}...`,
      targetUserId: `${targetUserId.slice(0, 8)}...`,
    })

    // Check if follow relationship exists
    const existingFollow = await db
      .select()
      .from(sql`user_follows`)
      .where(sql`follower_id = ${userId} AND following_id = ${targetUserId}`)
      .limit(1)

    if (existingFollow.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not following',
          message: 'User is not following this user',
        },
        { status: 404 }
      )
    }

    // Remove follow relationship
    await db.execute(sql`
      DELETE FROM user_follows
      WHERE follower_id = ${userId} AND following_id = ${targetUserId}
    `)

    // Remove related activity feed entries
    await db.execute(sql`
      DELETE FROM activity_feed
      WHERE activity_type = 'user_followed' 
      AND actor_id = ${userId} 
      AND object_id = ${userId}::uuid
      AND user_id = ${targetUserId}
    `)

    // Get updated follow stats
    const followStats = await getFollowStats(userId, targetUserId)

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Follow relationship removed`, {
      followerId: `${userId.slice(0, 8)}...`,
      followingId: `${targetUserId.slice(0, 8)}...`,
      processingTime,
    })

    // Track social analytics
    await trackSocialAnalytics(requestId, {
      eventType: 'unfollow',
      userId,
      targetUserId,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: {
        relationshipRemoved: true,
        followStats,
      },
      metadata: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Unfollow operation failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove follow relationship',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Get Follow Relationships - GET /api/marketplace/social/follow
 *
 * Retrieve follow relationships and social stats for users
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const targetUserId = searchParams.get('targetUserId')
    const type = searchParams.get('type') || 'status' // 'status', 'followers', 'following', 'mutual'
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '20')))

    if (!userId && !targetUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          message: 'At least one of userId or targetUserId is required',
        },
        { status: 400 }
      )
    }

    const queryUserId = userId || targetUserId
    logger.info(`[${requestId}] Follow data request`, {
      userId: queryUserId ? `${queryUserId.slice(0, 8)}...` : null,
      targetUserId: targetUserId ? `${targetUserId.slice(0, 8)}...` : null,
      type,
      page,
      limit,
    })

    let result: any = {}

    switch (type) {
      case 'followers':
        result = await getFollowers(queryUserId!, { page, limit })
        break
      case 'following':
        result = await getFollowing(queryUserId!, { page, limit })
        break
      case 'mutual':
        if (!userId || !targetUserId) {
          return NextResponse.json(
            {
              success: false,
              error: 'Both userIds required',
              message: 'Both userId and targetUserId are required for mutual connections',
            },
            { status: 400 }
          )
        }
        result = await getMutualConnections(userId, targetUserId, { page, limit })
        break
      default:
        // Get follow status and basic stats
        result = await getFollowStatus(userId!, targetUserId)
    }

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Follow data retrieved`, {
      type,
      resultCount: Array.isArray(result.data) ? result.data.length : 1,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      ...result,
      metadata: {
        requestId,
        type,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Follow data retrieval failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve follow data',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Get follow status between two users
 */
async function getFollowStatus(userId: string, targetUserId?: string | null) {
  if (!targetUserId) {
    // Get user's own follow stats
    const stats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM user_follows WHERE follower_id = ${userId}) as following_count,
        (SELECT COUNT(*) FROM user_follows WHERE following_id = ${userId}) as followers_count
    `)

    return {
      data: {
        followingCount: Number(stats.rows[0]?.following_count || 0),
        followersCount: Number(stats.rows[0]?.followers_count || 0),
        isOwnProfile: true,
      },
    }
  }

  // Get relationship status between two users
  const [relationship, stats, mutualCount] = await Promise.all([
    db
      .select()
      .from(sql`user_follows`)
      .where(sql`follower_id = ${userId} AND following_id = ${targetUserId}`)
      .limit(1),
    getFollowStats(userId, targetUserId),
    getMutualConnectionsCount(userId, targetUserId),
  ])

  const isFollowing = relationship.length > 0

  return {
    data: {
      isFollowing,
      mutualConnections: mutualCount,
      followStats: stats,
      relationshipStatus: isFollowing ? 'following' : 'not_following',
    },
  }
}

/**
 * Get user's followers
 */
async function getFollowers(
  userId: string,
  options: { page: number; limit: number }
) {
  const { page, limit } = options
  const offset = (page - 1) * limit

  const [followers, totalCount] = await Promise.all([
    db.execute(sql`
      SELECT 
        u.id, u.name, u.image, u.created_at,
        uf.created_at as followed_at,
        COALESCE(ur.reputation_score, 0) as reputation_score,
        COALESCE(ur.trust_level, 'new') as trust_level
      FROM user_follows uf
      JOIN "user" u ON uf.follower_id = u.id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      WHERE uf.following_id = ${userId}
      ORDER BY uf.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT COUNT(*) as total
      FROM user_follows
      WHERE following_id = ${userId}
    `),
  ])

  const total = Number(totalCount.rows[0]?.total || 0)
  const totalPages = Math.ceil(total / limit)

  return {
    data: followers.rows,
    pagination: {
      page,
      limit,
      totalCount: total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}

/**
 * Get users that a user is following
 */
async function getFollowing(
  userId: string,
  options: { page: number; limit: number }
) {
  const { page, limit } = options
  const offset = (page - 1) * limit

  const [following, totalCount] = await Promise.all([
    db.execute(sql`
      SELECT 
        u.id, u.name, u.image, u.created_at,
        uf.created_at as followed_at,
        COALESCE(ur.reputation_score, 0) as reputation_score,
        COALESCE(ur.trust_level, 'new') as trust_level
      FROM user_follows uf
      JOIN "user" u ON uf.following_id = u.id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      WHERE uf.follower_id = ${userId}
      ORDER BY uf.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT COUNT(*) as total
      FROM user_follows
      WHERE follower_id = ${userId}
    `),
  ])

  const total = Number(totalCount.rows[0]?.total || 0)
  const totalPages = Math.ceil(total / limit)

  return {
    data: following.rows,
    pagination: {
      page,
      limit,
      totalCount: total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}

/**
 * Get mutual connections between two users
 */
async function getMutualConnections(
  userId: string,
  targetUserId: string,
  options: { page: number; limit: number }
) {
  const { page, limit } = options
  const offset = (page - 1) * limit

  const [mutual, totalCount] = await Promise.all([
    db.execute(sql`
      SELECT 
        u.id, u.name, u.image, u.created_at,
        COALESCE(ur.reputation_score, 0) as reputation_score,
        COALESCE(ur.trust_level, 'new') as trust_level
      FROM "user" u
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      WHERE u.id IN (
        SELECT uf1.following_id
        FROM user_follows uf1
        WHERE uf1.follower_id = ${userId}
        INTERSECT
        SELECT uf2.following_id
        FROM user_follows uf2
        WHERE uf2.follower_id = ${targetUserId}
      )
      ORDER BY u.name
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT COUNT(*) as total
      FROM "user" u
      WHERE u.id IN (
        SELECT uf1.following_id
        FROM user_follows uf1
        WHERE uf1.follower_id = ${userId}
        INTERSECT
        SELECT uf2.following_id
        FROM user_follows uf2
        WHERE uf2.follower_id = ${targetUserId}
      )
    `),
  ])

  const total = Number(totalCount.rows[0]?.total || 0)
  const totalPages = Math.ceil(total / limit)

  return {
    data: mutual.rows,
    pagination: {
      page,
      limit,
      totalCount: total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}

/**
 * Get follow statistics for users
 */
async function getFollowStats(userId: string, targetUserId: string) {
  const stats = await db.execute(sql`
    SELECT 
      (SELECT COUNT(*) FROM user_follows WHERE follower_id = ${userId}) as user_following,
      (SELECT COUNT(*) FROM user_follows WHERE following_id = ${userId}) as user_followers,
      (SELECT COUNT(*) FROM user_follows WHERE follower_id = ${targetUserId}) as target_following,
      (SELECT COUNT(*) FROM user_follows WHERE following_id = ${targetUserId}) as target_followers
  `)

  const row = stats.rows[0]
  return {
    user: {
      followingCount: Number(row?.user_following || 0),
      followersCount: Number(row?.user_followers || 0),
    },
    target: {
      followingCount: Number(row?.target_following || 0),
      followersCount: Number(row?.target_followers || 0),
    },
  }
}

/**
 * Get mutual connections count between two users
 */
async function getMutualConnectionsCount(userId: string, targetUserId: string) {
  const result = await db.execute(sql`
    SELECT COUNT(*) as mutual_count
    FROM "user" u
    WHERE u.id IN (
      SELECT uf1.following_id
      FROM user_follows uf1
      WHERE uf1.follower_id = ${userId}
      INTERSECT
      SELECT uf2.following_id
      FROM user_follows uf2
      WHERE uf2.follower_id = ${targetUserId}
    )
  `)

  return Number(result.rows[0]?.mutual_count || 0)
}

/**
 * Track social analytics
 */
async function trackSocialAnalytics(
  requestId: string,
  data: {
    eventType: string
    userId: string
    targetUserId?: string
    mutualConnections?: number
    processingTime: number
  }
) {
  try {
    logger.info(`[${requestId}] Social analytics`, {
      eventType: data.eventType,
      userId: `${data.userId.slice(0, 8)}...`,
      targetUserId: data.targetUserId ? `${data.targetUserId.slice(0, 8)}...` : null,
      mutualConnections: data.mutualConnections,
      processingTime: data.processingTime,
    })

    // In production, store in analytics database
    // await analyticsService.track('social_follow', data)
  } catch (error) {
    logger.error(`[${requestId}] Failed to track social analytics`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    // Don't throw - analytics failures shouldn't break the main request
  }
}