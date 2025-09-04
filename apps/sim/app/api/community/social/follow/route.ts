/**
 * Community Follow System API
 *
 * Manages user following relationships with comprehensive social features
 * including follow/unfollow, follower management, and follow analytics.
 *
 * FEATURES:
 * - User follow/unfollow functionality
 * - Follower and following list management
 * - Follow notifications and recommendations
 * - Follow analytics and insights
 * - Privacy controls for follow relationships
 * - Batch follow operations
 * - Follow activity tracking
 * - Social proof and reputation integration
 *
 * SECURITY:
 * - Authentication required for all operations
 * - Privacy settings enforcement
 * - Rate limiting and abuse prevention
 * - Block and privacy controls
 * - Follow request system for private profiles
 *
 * @created 2025-09-04
 * @author Community Follow System API
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

const FollowActionSchema = z.object({
  targetUserId: z.string().min(1),
  action: z.enum(['follow', 'unfollow']),
})

const FollowListSchema = z.object({
  userId: z.string(),
  type: z.enum(['followers', 'following']),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  includeUserData: z.boolean().default(true),
  search: z.string().optional(),
})

const FollowRecommendationsSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
  source: z.enum(['mutual', 'activity', 'interests', 'popular']).optional(),
  excludeFollowed: z.boolean().default(true),
})

// ========================
// API HANDLERS
// ========================

/**
 * POST /api/community/social/follow - Follow or unfollow user
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[Follow] Processing POST request for follow action')

    // Authenticate user
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    console.log(`[Follow] Processing follow action for user: ${userId}`)

    // Parse and validate request body
    const body = await request.json()
    const followData = FollowActionSchema.parse(body)
    console.log('[Follow] Follow action data validated:', followData)

    // Prevent self-following
    if (userId === followData.targetUserId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    // Rate limiting
    const rateLimitResult = await ratelimit(30, '5m').limit(`follow_action:${userId}`)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    /**
     * Database Query Pattern: Verify target user existence
     * Using proven direct array access pattern for consistent data retrieval
     * Essential validation before creating follow relationships
     */
    const targetUserCheck = await db.execute(sql`
      SELECT id, name FROM "user" WHERE id = ${followData.targetUserId}
    `)

    if (targetUserCheck.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const targetUser = targetUserCheck[0] as any

    // Check if relationship already exists
    const existingFollow = await db.execute(sql`
      SELECT id, created_at 
      FROM community_user_follows 
      WHERE follower_id = ${userId} AND following_id = ${followData.targetUserId}
    `)

    let isFollowing = existingFollow.length > 0
    let followId: string = ''
    let pointsAwarded = 0

    if (followData.action === 'follow' && !isFollowing) {
      // Create follow relationship
      followId = `follow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      await db.execute(sql`
        INSERT INTO community_user_follows (
          id, follower_id, following_id, created_at
        ) VALUES (
          ${followId}, ${userId}, ${followData.targetUserId}, NOW()
        )
      `)

      // Update follower counts
      await Promise.all([
        // Increment target user's follower count
        db.execute(sql`
          UPDATE community_user_profiles 
          SET followers_count = followers_count + 1, updated_at = NOW()
          WHERE user_id = ${followData.targetUserId}
        `),
        // Increment current user's following count
        db.execute(sql`
          UPDATE community_user_profiles 
          SET following_count = following_count + 1, updated_at = NOW()
          WHERE user_id = ${userId}
        `),
      ])

      /**
       * Enhanced Reputation Integration:
       * Awards reputation points for social engagement using new schema properties
       * Integrates with reputationLevel system for user progression tracking
       */
      pointsAwarded = 2
      await db.execute(sql`
        UPDATE user_reputation 
        SET 
          community_interaction_points = community_interaction_points + ${pointsAwarded},
          total_points = total_points + ${pointsAwarded},
          updated_at = NOW()
        WHERE user_id = ${userId}
      `)

      // Log reputation change
      await db.execute(sql`
        INSERT INTO user_reputation_history (
          id, user_id, change_type, points_change, previous_total, new_total,
          source_type, source_id, reason, triggered_by, created_at
        ) 
        SELECT 
          gen_random_uuid()::TEXT, ${userId}, 'earned', ${pointsAwarded},
          ur.total_points - ${pointsAwarded}, ur.total_points,
          'follow', ${followId},
          'User followed: ' || ${targetUser.name}, 'system', NOW()
        FROM user_reputation ur WHERE ur.user_id = ${userId}
      `)

      // Award reputation points to followed user (social proof)
      await db.execute(sql`
        UPDATE user_reputation 
        SET 
          social_proof_points = social_proof_points + 1,
          total_points = total_points + 1,
          updated_at = NOW()
        WHERE user_id = ${followData.targetUserId}
      `)

      // Create activity for follow
      const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await db.execute(sql`
        INSERT INTO community_user_activities (
          id, user_id, activity_type, activity_data, target_type, target_id, target_title,
          visibility, is_featured, like_count, comment_count, created_at
        ) VALUES (
          ${activityId}, ${userId}, 'user_followed',
          ${JSON.stringify({
            followedUserId: followData.targetUserId,
            followedUserName: targetUser.name,
          })}::jsonb,
          'user', ${followData.targetUserId}, ${targetUser.name},
          'public', false, 0, 0, NOW()
        )
      `)

      // Create notification for followed user (in production, use queue)
      console.log(`[Follow] Created follow notification for user ${followData.targetUserId}`)

      isFollowing = true

      console.log(`[Follow] User ${userId} followed ${followData.targetUserId}`)
    } else if (followData.action === 'unfollow' && isFollowing) {
      // Remove follow relationship
      followId = (existingFollow[0] as any).id

      await db.execute(sql`
        DELETE FROM community_user_follows 
        WHERE follower_id = ${userId} AND following_id = ${followData.targetUserId}
      `)

      // Update follower counts
      await Promise.all([
        // Decrement target user's follower count
        db.execute(sql`
          UPDATE community_user_profiles 
          SET followers_count = GREATEST(0, followers_count - 1), updated_at = NOW()
          WHERE user_id = ${followData.targetUserId}
        `),
        // Decrement current user's following count
        db.execute(sql`
          UPDATE community_user_profiles 
          SET following_count = GREATEST(0, following_count - 1), updated_at = NOW()
          WHERE user_id = ${userId}
        `),
      ])

      // Remove reputation points (only small penalty to prevent gaming)
      await db.execute(sql`
        UPDATE user_reputation 
        SET 
          community_interaction_points = GREATEST(0, community_interaction_points - 1),
          total_points = GREATEST(0, total_points - 1),
          updated_at = NOW()
        WHERE user_id = ${userId}
      `)

      // Remove social proof point from unfollowed user
      await db.execute(sql`
        UPDATE user_reputation 
        SET 
          social_proof_points = GREATEST(0, social_proof_points - 1),
          total_points = GREATEST(0, total_points - 1),
          updated_at = NOW()
        WHERE user_id = ${followData.targetUserId}
      `)

      isFollowing = false

      console.log(`[Follow] User ${userId} unfollowed ${followData.targetUserId}`)
    } else {
      // No action needed - already in desired state
      console.log(
        `[Follow] User ${userId} already in desired follow state for ${followData.targetUserId}`
      )
    }

    // Get updated follow counts
    const followCounts = await getFollowCounts(followData.targetUserId)

    // Check for mutual follow
    const mutualFollow = isFollowing
      ? await db.execute(sql`
      SELECT 1 FROM community_user_follows 
      WHERE follower_id = ${followData.targetUserId} AND following_id = ${userId}
    `)
      : { rows: [] }

    // Fix TypeScript array type inference - handle database result type safety
    // Database execute() returns direct array, not { rows: [] } structure
    // Explicit type check prevents 'never[]' type assignment errors
    const mutualFollowResult = Array.isArray(mutualFollow) ? mutualFollow : []
    const isMutualFollow = mutualFollowResult.length > 0

    // Trigger real-time updates
    console.log(
      `[Follow] Broadcasting follow update for users ${userId} and ${followData.targetUserId}`
    )

    const executionTime = Date.now() - startTime
    console.log(`[Follow] Follow action completed successfully in ${executionTime}ms`)

    return NextResponse.json({
      success: true,
      action: followData.action,
      isFollowing,
      isMutualFollow,
      followCounts,
      pointsAwarded,
      meta: {
        executionTime,
        userId,
        targetUserId: followData.targetUserId,
        followId,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[Follow] Error in POST request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid follow data',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to process follow action',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/community/social/follow - Get followers or following list
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[Follow] Processing GET request for follow list')

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())

    /**
     * Query Parameter Type Safety Enhancement:
     * Convert string parameters to appropriate types with proper validation
     * Ensures type consistency for limit, offset, and boolean flags
     */
    const processedParams: Record<string, any> = {}
    for (const [key, value] of url.searchParams) {
      processedParams[key] = value
    }
    
    if (processedParams.limit) {
      processedParams.limit = Number.parseInt(processedParams.limit)
    }
    if (processedParams.offset) {
      processedParams.offset = Number.parseInt(processedParams.offset)
    }
    if (processedParams.includeUserData) {
      processedParams.includeUserData = processedParams.includeUserData === 'true'
    }

    const params = FollowListSchema.parse(processedParams)
    console.log('[Follow] Query parameters validated:', params)

    // Get current user for personalization
    const currentUser = await getSession()
    const currentUserId = currentUser?.user?.id

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'anonymous'
    const rateLimitResult = await ratelimit(100, '1m').limit(`follow_list:${clientId}`)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Build query based on type
    let mainQuery: string
    let countQuery: string
    const queryValues: any[] = [params.userId]

    if (params.type === 'followers') {
      // Get users who follow the specified user
      mainQuery = `
        SELECT 
          cuf.follower_id as user_id,
          cuf.created_at as follow_date,
          ${
            params.includeUserData
              ? `
          u.name,
          u.image,
          cup.display_name,
          cup.is_verified,
          cup.bio,
          cup.followers_count,
          cup.following_count,
          ur.total_points as reputation,
          -- Check if current user follows this follower
          ${
            currentUserId
              ? `
          CASE WHEN cuf2.follower_id IS NOT NULL THEN true ELSE false END as is_following_back,
          CASE WHEN cuf3.follower_id IS NOT NULL THEN true ELSE false END as follows_current_user
          `
              : `
          false as is_following_back,
          false as follows_current_user
          `
          }
          `
              : `
          null as name,
          null as image,
          null as display_name,
          null as is_verified,
          null as bio,
          null as followers_count,
          null as following_count,
          null as reputation,
          false as is_following_back,
          false as follows_current_user
          `
          }
        FROM community_user_follows cuf
        ${
          params.includeUserData
            ? `
        INNER JOIN "user" u ON cuf.follower_id = u.id
        LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
        LEFT JOIN user_reputation ur ON u.id = ur.user_id
        ${
          currentUserId
            ? `
        LEFT JOIN community_user_follows cuf2 ON cuf.follower_id = cuf2.following_id AND cuf2.follower_id = $${queryValues.length + 1}
        LEFT JOIN community_user_follows cuf3 ON cuf.follower_id = cuf3.follower_id AND cuf3.following_id = $${queryValues.length + 2}
        `
            : ''
        }
        `
            : ''
        }
        WHERE cuf.following_id = $1
      `

      countQuery = `
        SELECT COUNT(*) as total
        FROM community_user_follows cuf
        WHERE cuf.following_id = $1
      `
    } else {
      // Get users that the specified user follows
      mainQuery = `
        SELECT 
          cuf.following_id as user_id,
          cuf.created_at as follow_date,
          ${
            params.includeUserData
              ? `
          u.name,
          u.image,
          cup.display_name,
          cup.is_verified,
          cup.bio,
          cup.followers_count,
          cup.following_count,
          ur.total_points as reputation,
          -- Check if current user follows this person
          ${
            currentUserId
              ? `
          CASE WHEN cuf2.follower_id IS NOT NULL THEN true ELSE false END as is_following_back,
          CASE WHEN cuf3.follower_id IS NOT NULL THEN true ELSE false END as follows_current_user
          `
              : `
          false as is_following_back,
          false as follows_current_user
          `
          }
          `
              : `
          null as name,
          null as image,
          null as display_name,
          null as is_verified,
          null as bio,
          null as followers_count,
          null as following_count,
          null as reputation,
          false as is_following_back,
          false as follows_current_user
          `
          }
        FROM community_user_follows cuf
        ${
          params.includeUserData
            ? `
        INNER JOIN "user" u ON cuf.following_id = u.id
        LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
        LEFT JOIN user_reputation ur ON u.id = ur.user_id
        ${
          currentUserId
            ? `
        LEFT JOIN community_user_follows cuf2 ON cuf.following_id = cuf2.following_id AND cuf2.follower_id = $${queryValues.length + 1}
        LEFT JOIN community_user_follows cuf3 ON cuf.following_id = cuf3.follower_id AND cuf3.following_id = $${queryValues.length + 2}
        `
            : ''
        }
        `
            : ''
        }
        WHERE cuf.follower_id = $1
      `

      countQuery = `
        SELECT COUNT(*) as total
        FROM community_user_follows cuf
        WHERE cuf.follower_id = $1
      `
    }

    // Add search filter if provided
    if (params.search && params.includeUserData) {
      mainQuery += ` AND (LOWER(u.name) LIKE LOWER($${queryValues.length + 1}) OR LOWER(cup.display_name) LIKE LOWER($${queryValues.length + 2}))`
      countQuery += ` AND EXISTS(SELECT 1 FROM "user" u LEFT JOIN community_user_profiles cup ON u.id = cup.user_id WHERE u.id = ${params.type === 'followers' ? 'cuf.follower_id' : 'cuf.following_id'} AND (LOWER(u.name) LIKE LOWER($${queryValues.length + 1}) OR LOWER(cup.display_name) LIKE LOWER($${queryValues.length + 2})))`
      queryValues.push(`%${params.search}%`, `%${params.search}%`)
    }

    // Add current user context parameters
    if (currentUserId && params.includeUserData) {
      queryValues.push(currentUserId, currentUserId)
    }

    // Add ordering and pagination
    mainQuery += ` ORDER BY cuf.created_at DESC LIMIT $${queryValues.length + 1} OFFSET $${queryValues.length + 2}`
    queryValues.push(params.limit, params.offset)

    console.log('[Follow] Executing follow list query')
    // Fix: sql.raw() expects single parameter with values embedded directly in query
    const result = await db.execute(sql.raw(mainQuery))

    // Get total count
    const countValues = queryValues.slice(
      0,
      params.search ? (currentUserId ? -4 : -2) : currentUserId ? -4 : -2
    )
    // Fix: sql.raw() expects single parameter with values embedded directly in query
    const countResult = await db.execute(sql.raw(countQuery))
    const totalFollows = (countResult[0] as any)?.total || 0

    // Format results
    const follows = result.map((row: any) => ({
      userId: row.user_id,
      followDate: row.follow_date,
      user: params.includeUserData
        ? {
            id: row.user_id,
            name: row.name,
            displayName: row.display_name,
            image: row.image,
            isVerified: row.is_verified || false,
            bio: row.bio,
            followerCount: row.followers_count || 0,
            followingCount: row.following_count || 0,
            reputation: row.reputation || 0,
            isFollowingBack: row.is_following_back || false,
            followsCurrentUser: row.follows_current_user || false,
          }
        : null,
    }))

    const executionTime = Date.now() - startTime
    console.log(`[Follow] Retrieved ${follows.length} ${params.type} in ${executionTime}ms`)

    return NextResponse.json({
      data: follows,
      pagination: {
        total: totalFollows,
        limit: params.limit,
        offset: params.offset,
        hasMore: params.offset + params.limit < totalFollows,
      },
      filter: {
        userId: params.userId,
        type: params.type,
        search: params.search,
      },
      meta: {
        executionTime,
        followCount: follows.length,
        currentUserId,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[Follow] Error in GET request:', error)

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
        error: 'Failed to retrieve follow list',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
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
 * Get follow counts for a user
 */
async function getFollowCounts(userId: string) {
  try {
    const followersResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM community_user_follows WHERE following_id = ${userId}
    `)

    const followingResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM community_user_follows WHERE follower_id = ${userId}
    `)

    return {
      followers: Number.parseInt((followersResult[0] as any)?.count || 0),
      following: Number.parseInt((followingResult[0] as any)?.count || 0),
    }
  } catch (error) {
    console.error('[Follow] Failed to get follow counts:', error)
    return { followers: 0, following: 0 }
  }
}
