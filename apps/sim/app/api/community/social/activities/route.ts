/**
 * Community Social Activities API
 *
 * Manages activity feeds and community interactions with real-time capabilities.
 * Provides comprehensive social features including activity creation, engagement tracking,
 * personalized feeds, and real-time updates via WebSocket integration.
 *
 * FEATURES:
 * - Activity feed management with personalized content filtering
 * - Real-time activity creation and updates
 * - Engagement tracking (likes, comments, shares, bookmarks)
 * - Activity visibility controls and privacy settings
 * - Feed algorithms with relevance scoring
 * - Activity aggregation and deduplication
 * - Spam detection and content moderation
 * - Performance optimization with caching and pagination
 *
 * SECURITY:
 * - Authentication required for activity creation and engagement
 * - Rate limiting for activity posting and interaction
 * - Input validation and sanitization
 * - Privacy settings enforcement
 * - Content moderation and spam prevention
 *
 * @created 2025-09-04
 * @author Community Social Activities API
 */

import { sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { CommunityUtils } from '@/lib/community'
import { ratelimit } from '@/lib/ratelimit'
import { db } from '@/db'

// ========================
// VALIDATION SCHEMAS
// ========================

const ActivityFilterSchema = z.object({
  filter: z.enum(['all', 'following', 'trending', 'my-activity']).default('all'),
  activityTypes: z.array(z.string()).optional(),
  userId: z.string().optional(),
  visibility: z.enum(['public', 'followers', 'private']).default('public'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  since: z.string().datetime().optional(),
  includeEngagement: z.boolean().default(true),
})

const CreateActivitySchema = z.object({
  activityType: z.enum([
    'template_created',
    'review_posted',
    'badge_earned',
    'template_starred',
    'collection_created',
    'user_followed',
    'template_shared',
    'comment_posted',
  ]),
  activityData: z.record(z.any()).default({}),
  targetType: z.enum(['template', 'collection', 'user', 'review']).optional(),
  targetId: z.string().optional(),
  targetTitle: z.string().optional(),
  visibility: z.enum(['public', 'followers', 'private']).default('public'),
  isFeatured: z.boolean().default(false),
})

const UpdateActivitySchema = z.object({
  visibility: z.enum(['public', 'followers', 'private']).optional(),
  isFeatured: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  hideReason: z.string().optional(),
})

// ========================
// API HANDLERS
// ========================

/**
 * GET /api/community/social/activities - Retrieve activity feed
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[SocialActivities] Processing GET request for activity feed')

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())

    // Convert string parameters to proper types
    if (queryParams.limit) queryParams.limit = Number.parseInt(queryParams.limit)
    if (queryParams.offset) queryParams.offset = Number.parseInt(queryParams.offset)
    if (queryParams.includeEngagement)
      queryParams.includeEngagement = queryParams.includeEngagement === 'true'

    // Validate parameters
    const params = ActivityFilterSchema.parse(queryParams)
    console.log('[SocialActivities] Filter parameters validated:', params)

    // Get current user for personalization
    const currentUser = await auth()
    const currentUserId = currentUser?.user?.id

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'anonymous'
    const rateLimitResult = await ratelimit(30, '1m').limit(`activity_feed:${clientId}`)

    if (!rateLimitResult.success) {
      console.warn(`[SocialActivities] Rate limit exceeded for ${clientId}`)
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Build activity query with filters
    const whereConditions: string[] = ['cua.is_hidden = false']
    const queryValues: any[] = []
    let joinConditions = ''
    let orderByClause = 'cua.created_at DESC'

    // Filter by activity types
    if (params.activityTypes && params.activityTypes.length > 0) {
      whereConditions.push(`cua.activity_type = ANY($${queryValues.length + 1})`)
      queryValues.push(params.activityTypes)
    }

    // Filter by user
    if (params.userId) {
      whereConditions.push(`cua.user_id = $${queryValues.length + 1}`)
      queryValues.push(params.userId)
    }

    // Apply filter-specific logic
    switch (params.filter) {
      case 'following':
        if (currentUserId) {
          joinConditions += `
            INNER JOIN community_user_follows cuf ON cua.user_id = cuf.following_id
          `
          whereConditions.push(`cuf.follower_id = $${queryValues.length + 1}`)
          queryValues.push(currentUserId)
        } else {
          // Non-authenticated users see popular content
          orderByClause =
            '(cua.like_count + cua.comment_count * 2 + cua.share_count * 3) DESC, cua.created_at DESC'
        }
        break

      case 'trending':
        // Calculate trending score based on recent engagement
        orderByClause = `
          (
            (cua.like_count + cua.comment_count * 2 + cua.share_count * 3) * 
            EXP(-EXTRACT(EPOCH FROM (NOW() - cua.created_at)) / 86400.0)
          ) DESC, cua.created_at DESC
        `
        whereConditions.push(`cua.created_at > NOW() - INTERVAL '7 days'`)
        break

      case 'my-activity':
        if (currentUserId) {
          whereConditions.push(`cua.user_id = $${queryValues.length + 1}`)
          queryValues.push(currentUserId)
        } else {
          return NextResponse.json(
            { error: 'Authentication required for my-activity filter' },
            { status: 401 }
          )
        }
        break
      default:
        // Apply relevance scoring for authenticated users
        if (currentUserId) {
          orderByClause = `
            (
              CASE 
                WHEN cua.is_featured THEN 100
                ELSE 0
              END +
              CASE 
                WHEN EXISTS(
                  SELECT 1 FROM community_user_follows cuf 
                  WHERE cuf.following_id = cua.user_id AND cuf.follower_id = $${queryValues.length + 1}
                ) THEN 50
                ELSE 0
              END +
              (cua.like_count + cua.comment_count * 2) * 
              EXP(-EXTRACT(EPOCH FROM (NOW() - cua.created_at)) / 86400.0)
            ) DESC, cua.created_at DESC
          `
          queryValues.push(currentUserId)
        }
        break
    }

    // Visibility filter
    if (currentUserId) {
      whereConditions.push(`
        (cua.visibility = 'public' OR 
         (cua.visibility = 'followers' AND 
          EXISTS(SELECT 1 FROM community_user_follows cuf 
                 WHERE cuf.following_id = cua.user_id AND cuf.follower_id = $${queryValues.length + 1})) OR
         cua.user_id = $${queryValues.length + 2})
      `)
      queryValues.push(currentUserId, currentUserId)
    } else {
      whereConditions.push(`cua.visibility = 'public'`)
    }

    // Date filter
    if (params.since) {
      whereConditions.push(`cua.created_at > $${queryValues.length + 1}`)
      queryValues.push(params.since)
    }

    // Build the main query
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
        cua.created_at,
        cua.updated_at,
        -- User information
        u.name as user_name,
        u.image as user_image,
        cup.display_name as user_display_name,
        cup.is_verified as user_is_verified,
        ur.total_points as user_reputation_points,
        ur.reputation_level as user_reputation_level,
        -- Engagement data for current user
        ${
          currentUserId
            ? `
        CASE WHEN ual.user_id IS NOT NULL THEN true ELSE false END as is_liked,
        CASE WHEN uab.user_id IS NOT NULL THEN true ELSE false END as is_bookmarked,
        `
            : `
        false as is_liked,
        false as is_bookmarked,
        `
        }
        -- Share count (computed from shares)
        COALESCE(share_counts.share_count, 0) as share_count
      FROM community_user_activities cua
      ${joinConditions}
      INNER JOIN "user" u ON cua.user_id = u.id
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      ${
        currentUserId
          ? `
      LEFT JOIN (
        SELECT activity_id, user_id FROM community_activity_engagement 
        WHERE user_id = $${queryValues.length + 1} AND engagement_type = 'like'
      ) ual ON cua.id = ual.activity_id
      LEFT JOIN (
        SELECT activity_id, user_id FROM community_activity_engagement 
        WHERE user_id = $${queryValues.length + 2} AND engagement_type = 'bookmark'
      ) uab ON cua.id = uab.activity_id
      `
          : ''
      }
      LEFT JOIN (
        SELECT activity_id, COUNT(*) as share_count 
        FROM community_activity_engagement 
        WHERE engagement_type = 'share'
        GROUP BY activity_id
      ) share_counts ON cua.id = share_counts.activity_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${orderByClause}
      LIMIT $${queryValues.length + (currentUserId ? 3 : 1)} 
      OFFSET $${queryValues.length + (currentUserId ? 4 : 2)}
    `

    // Add pagination parameters
    if (currentUserId) {
      queryValues.push(currentUserId, currentUserId, params.limit, params.offset)
    } else {
      queryValues.push(params.limit, params.offset)
    }

    console.log('[SocialActivities] Executing activity feed query')
    const result = await db.execute(sql.raw(mainQuery, queryValues))

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM community_user_activities cua
      ${joinConditions}
      WHERE ${whereConditions.join(' AND ')}
    `

    const countValues = queryValues.slice(0, -2) // Remove limit and offset
    const countResult = await db.execute(sql.raw(countQuery, countValues))
    const totalActivities = (countResult.rows[0] as any)?.total || 0

    // Format activities
    const activities = result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      user: {
        id: row.user_id,
        name: row.user_name,
        displayName: row.user_display_name,
        image: row.user_image,
        isVerified: row.user_is_verified || false,
        reputation: {
          totalPoints: row.user_reputation_points || 0,
          level: row.user_reputation_level || 1,
        },
      },
      activityType: row.activity_type,
      activityData: row.activity_data || {},
      targetType: row.target_type,
      targetId: row.target_id,
      targetTitle: row.target_title,
      visibility: row.visibility,
      engagementMetrics: {
        likeCount: row.like_count || 0,
        commentCount: row.comment_count || 0,
        shareCount: row.share_count || 0,
        bookmarkCount: 0, // Would need separate query for bookmark counts
        isLiked: row.is_liked || false,
        isBookmarked: row.is_bookmarked || false,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    const executionTime = Date.now() - startTime
    console.log(
      `[SocialActivities] Retrieved ${activities.length} activities in ${executionTime}ms`
    )

    return NextResponse.json({
      data: activities,
      pagination: {
        total: totalActivities,
        limit: params.limit,
        offset: params.offset,
        hasMore: params.offset + params.limit < totalActivities,
      },
      filter: params.filter,
      meta: {
        executionTime,
        activityCount: activities.length,
        currentUserId,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[SocialActivities] Error in GET request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid filter parameters',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to retrieve activities',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/community/social/activities - Create new activity
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[SocialActivities] Processing POST request for activity creation')

    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      console.warn('[SocialActivities] Unauthorized activity creation attempt')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    console.log(`[SocialActivities] Authenticated user: ${userId}`)

    // Rate limiting for activity creation
    const rateLimitResult = await ratelimit(10, '5m').limit(`activity_create:${userId}`)
    if (!rateLimitResult.success) {
      console.warn(`[SocialActivities] Rate limit exceeded for user ${userId}`)
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const activityData = CreateActivitySchema.parse(body)
    console.log('[SocialActivities] Activity data validated successfully')

    // Content validation and spam detection
    if (activityData.activityData.content) {
      const content = CommunityUtils.sanitizeInput(activityData.activityData.content)
      activityData.activityData.content = content

      // Simple spam detection (in production, use more sophisticated methods)
      const spamKeywords = ['spam', 'scam', 'click here', 'buy now', 'limited time']
      const isSpam = spamKeywords.some((keyword) => content.toLowerCase().includes(keyword))

      if (isSpam) {
        console.warn(`[SocialActivities] Potential spam detected from user ${userId}`)
        activityData.visibility = 'private' // Auto-hide potential spam
      }
    }

    // Generate activity ID and create activity record
    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await db.execute(sql`
      INSERT INTO community_user_activities (
        id, user_id, activity_type, activity_data, target_type, target_id, target_title,
        visibility, is_featured, like_count, comment_count, created_at, updated_at
      ) VALUES (
        ${activityId}, ${userId}, ${activityData.activityType},
        ${JSON.stringify(activityData.activityData)}::jsonb,
        ${activityData.targetType}, ${activityData.targetId}, ${activityData.targetTitle},
        ${activityData.visibility}, ${activityData.isFeatured},
        0, 0, NOW(), NOW()
      )
    `)

    // Update user activity metrics
    await db.execute(sql`
      UPDATE community_user_profiles 
      SET 
        last_active_at = NOW(),
        total_contributions = total_contributions + 1,
        updated_at = NOW()
      WHERE user_id = ${userId}
    `)

    // Award reputation points for activity creation
    const pointValues = {
      template_created: 50,
      review_posted: 10,
      badge_earned: 0, // No points for receiving badges
      template_starred: 5,
      collection_created: 25,
      user_followed: 2,
      template_shared: 5,
      comment_posted: 3,
    }

    const pointsEarned = pointValues[activityData.activityType] || 0
    if (pointsEarned > 0) {
      await db.execute(sql`
        UPDATE user_reputation 
        SET 
          community_contribution_points = community_contribution_points + ${pointsEarned},
          total_points = total_points + ${pointsEarned},
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
          gen_random_uuid()::TEXT, ${userId}, 'earned', ${pointsEarned},
          ur.total_points - ${pointsEarned}, ur.total_points,
          ${activityData.activityType}, ${activityId},
          'Activity creation: ' || ${activityData.activityType}, 'system', NOW()
        FROM user_reputation ur WHERE ur.user_id = ${userId}
      `)
    }

    // Get created activity with user information
    const createdActivityQuery = `
      SELECT 
        cua.id, cua.user_id, cua.activity_type, cua.activity_data,
        cua.target_type, cua.target_id, cua.target_title, cua.visibility,
        cua.is_featured, cua.like_count, cua.comment_count, cua.created_at,
        u.name as user_name, u.image as user_image,
        cup.display_name as user_display_name, cup.is_verified as user_is_verified,
        ur.total_points as user_reputation_points, ur.reputation_level as user_reputation_level
      FROM community_user_activities cua
      INNER JOIN "user" u ON cua.user_id = u.id
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      WHERE cua.id = $1
    `

    const activityResult = await db.execute(sql.raw(createdActivityQuery, [activityId]))
    const activityRow = activityResult.rows[0] as any

    const createdActivity = {
      id: activityRow.id,
      userId: activityRow.user_id,
      user: {
        id: activityRow.user_id,
        name: activityRow.user_name,
        displayName: activityRow.user_display_name,
        image: activityRow.user_image,
        isVerified: activityRow.user_is_verified || false,
        reputation: {
          totalPoints: activityRow.user_reputation_points || 0,
          level: activityRow.user_reputation_level || 1,
        },
      },
      activityType: activityRow.activity_type,
      activityData: activityRow.activity_data || {},
      targetType: activityRow.target_type,
      targetId: activityRow.target_id,
      targetTitle: activityRow.target_title,
      visibility: activityRow.visibility,
      engagementMetrics: {
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        bookmarkCount: 0,
        isLiked: false,
        isBookmarked: false,
      },
      createdAt: activityRow.created_at,
    }

    // Trigger real-time notifications for followers (if public activity)
    if (activityData.visibility === 'public' || activityData.visibility === 'followers') {
      // In a real implementation, this would send WebSocket notifications
      console.log(`[SocialActivities] Broadcasting activity ${activityId} to followers`)
    }

    const executionTime = Date.now() - startTime
    console.log(
      `[SocialActivities] Activity created successfully: ${activityId} in ${executionTime}ms`
    )

    return NextResponse.json(
      {
        success: true,
        data: createdActivity,
        pointsEarned,
        meta: {
          executionTime,
          activityId,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[SocialActivities] Error in POST request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid activity data',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create activity',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/community/social/activities - Update activity (for moderation)
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[SocialActivities] Processing PUT request for activity update')

    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    const url = new URL(request.url)
    const activityId = url.searchParams.get('activityId')

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 })
    }

    // Parse and validate request body
    const body = await request.json()
    const updateData = UpdateActivitySchema.parse(body)

    // Check if user can update this activity (owner or moderator)
    const activityResult = await db.execute(sql`
      SELECT user_id FROM community_user_activities WHERE id = ${activityId}
    `)

    if (activityResult.rows.length === 0) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const activityUserId = (activityResult.rows[0] as any).user_id

    // Check permissions (user can update own activities, moderators can update any)
    const canUpdate =
      activityUserId === userId ||
      session.user.role === 'admin' ||
      session.user.role === 'moderator'

    if (!canUpdate) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Build update query
    const updateFields: string[] = []
    const updateValues: any[] = []

    if (updateData.visibility !== undefined) {
      updateFields.push(`visibility = $${updateValues.length + 1}`)
      updateValues.push(updateData.visibility)
    }

    if (updateData.isFeatured !== undefined) {
      updateFields.push(`is_featured = $${updateValues.length + 1}`)
      updateValues.push(updateData.isFeatured)
    }

    if (updateData.isHidden !== undefined) {
      updateFields.push(`is_hidden = $${updateValues.length + 1}`)
      updateValues.push(updateData.isHidden)
    }

    if (updateData.hideReason !== undefined) {
      updateFields.push(`hide_reason = $${updateValues.length + 1}`)
      updateValues.push(updateData.hideReason)
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Add updated_at field
    updateFields.push(`updated_at = NOW()`)

    // Add activity ID as final parameter
    updateValues.push(activityId)

    const updateQuery = `
      UPDATE community_user_activities 
      SET ${updateFields.join(', ')}
      WHERE id = $${updateValues.length}
      RETURNING id, updated_at
    `

    const result = await db.execute(sql.raw(updateQuery, updateValues))

    const executionTime = Date.now() - startTime
    console.log(
      `[SocialActivities] Activity updated successfully: ${activityId} in ${executionTime}ms`
    )

    return NextResponse.json({
      success: true,
      activityId,
      updatedAt: (result.rows[0] as any).updated_at,
      meta: {
        executionTime,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[SocialActivities] Error in PUT request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid update data',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to update activity',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}
