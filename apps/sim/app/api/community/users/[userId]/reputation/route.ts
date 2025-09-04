/**
 * User Reputation API Endpoint
 *
 * API for retrieving and managing user reputation data including:
 * - Detailed reputation breakdown and history
 * - Level progression and benefits
 * - Reputation calculation triggers
 * - Anti-gaming detection and monitoring
 *
 * FEATURES:
 * - Complete reputation summary with metrics
 * - Historical reputation changes and audit trail
 * - Reputation recalculation for administrators
 * - Anti-gaming analysis and suspicious activity detection
 * - Level progression tracking and benefits
 *
 * SECURITY:
 * - Privacy-aware reputation display
 * - Rate limiting for reputation calculations
 * - Admin-only sensitive operations
 * - Comprehensive audit logging
 *
 * @created 2025-09-04
 * @author User Reputation API
 */

import { sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { CommunityReputationSystem, REPUTATION_LEVELS } from '@/lib/community/reputation-system'
import { ratelimit } from '@/lib/ratelimit'
import { db } from '@/db'

// ========================
// VALIDATION SCHEMAS
// ========================

const UserIdParamSchema = z.object({
  userId: z.string().min(1),
})

const ReputationHistoryQuerySchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  changeType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

// ========================
// API HANDLERS
// ========================

/**
 * GET /api/community/users/[userId]/reputation - Get user reputation summary
 */
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const startTime = Date.now()

  try {
    console.log(`[ReputationAPI] Processing GET request for user reputation: ${params.userId}`)

    // Validate user ID parameter
    const { userId } = UserIdParamSchema.parse(params)

    // Get viewer's authentication status
    const session = await getSession()
    const viewerId = session?.user?.id
    const isOwnReputation = userId === viewerId

    console.log(`[ReputationAPI] Reputation request from viewer: ${viewerId || 'anonymous'}`)

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || viewerId || 'anonymous'
    const rateLimitResult = await ratelimit(20, '1m').limit(`reputation_view:${clientId}`)

    if (!rateLimitResult.success) {
      console.warn(`[ReputationAPI] Rate limit exceeded for ${clientId}`)
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    /**
     * Database Access Pattern: Check user existence and privacy settings
     * Using direct array access pattern [0] instead of .rows[0] for consistency
     * Includes comprehensive profile privacy validation for reputation visibility
     */
    const userCheck = await db.execute(sql`
      SELECT 
        u.id,
        u.name,
        cup.profile_visibility,
        cup.show_activity
      FROM "user" u
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      WHERE u.id = ${userId}
    `)

    if (!userCheck[0]) {
      console.warn(`[ReputationAPI] User not found: ${userId}`)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userCheck[0] as any

    // Check privacy settings
    const profileVisibility = userData.profile_visibility || 'public'
    if (!isOwnReputation && profileVisibility === 'private') {
      console.warn(
        `[ReputationAPI] Private profile reputation access denied for ${userId} by ${viewerId}`
      )
      return NextResponse.json({ error: "This user's reputation is private" }, { status: 403 })
    }

    /**
     * Enhanced Reputation System Integration:
     * Using singleton pattern for consistent reputation calculations across the application
     * Integrates with new reputationLevel property from enhanced schema
     */
    const reputationSystem = CommunityReputationSystem.getInstance()

    // Get comprehensive reputation summary
    const reputationSummary = await reputationSystem.getUserReputationSummary(userId)

    // Get detailed breakdown with history if user has access
    let detailedBreakdown = null
    let recentHistory = null
    let antiGamingData = null

    if (isOwnReputation || profileVisibility === 'public') {
      // Get recent reputation history
      const historyResult = await db.execute(sql`
        SELECT 
          id,
          change_type,
          points_change,
          previous_total,
          new_total,
          source_type,
          source_id,
          reason,
          triggered_by,
          created_at
        FROM user_reputation_history
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 10
      `)

      recentHistory = historyResult.map((row: any) => ({
        id: row.id,
        changeType: row.change_type,
        pointsChange: row.points_change,
        previousTotal: row.previous_total,
        newTotal: row.new_total,
        source: {
          type: row.source_type,
          id: row.source_id,
        },
        reason: row.reason,
        triggeredBy: row.triggered_by,
        date: row.created_at,
      }))

      // Get detailed statistics
      const statsResult = await db.execute(sql`
        SELECT 
          -- Template statistics
          COUNT(CASE WHEN t.id IS NOT NULL THEN 1 END) as template_count,
          AVG(CASE WHEN t.rating_average IS NOT NULL THEN t.rating_average END) as avg_template_rating,
          SUM(CASE WHEN t.download_count IS NOT NULL THEN t.download_count ELSE 0 END) as total_downloads,
          
          -- Review statistics
          COUNT(CASE WHEN tr.id IS NOT NULL THEN 1 END) as reviews_written,
          COUNT(CASE WHEN tr.helpful_count > tr.unhelpful_count THEN 1 END) as helpful_reviews,
          
          -- Badge statistics
          COUNT(CASE WHEN cub.id IS NOT NULL THEN 1 END) as total_badges,
          COUNT(CASE WHEN cub.is_featured = true THEN 1 END) as featured_badges
        FROM "user" u
        LEFT JOIN templates t ON u.id = t.created_by_user_id AND t.status = 'approved'
        LEFT JOIN template_ratings tr ON u.id = tr.user_id AND tr.is_approved = true
        LEFT JOIN community_user_badges cub ON u.id = cub.user_id AND cub.show_on_profile = true
        WHERE u.id = ${userId}
        GROUP BY u.id
      `)

      const stats = statsResult[0] as any
      detailedBreakdown = {
        templates: {
          count: stats?.template_count || 0,
          avgRating: stats?.avg_template_rating || 0,
          totalDownloads: stats?.total_downloads || 0,
        },
        reviews: {
          written: stats?.reviews_written || 0,
          helpful: stats?.helpful_reviews || 0,
          helpfulPercentage:
            stats?.reviews_written > 0
              ? (stats?.helpful_reviews / stats?.reviews_written) * 100
              : 0,
        },
        badges: {
          total: stats?.total_badges || 0,
          featured: stats?.featured_badges || 0,
        },
      }
    }

    // Get anti-gaming analysis for own profile or admins
    if (isOwnReputation) {
      try {
        antiGamingData = await reputationSystem.detectSuspiciousActivity(userId)
      } catch (error) {
        console.error(`[ReputationAPI] Error in anti-gaming detection for ${userId}:`, error)
        // Don't fail the whole request for anti-gaming analysis errors
      }
    }

    // Get level information and benefits
    const currentLevel = REPUTATION_LEVELS.find((level) => level.level === reputationSummary.level)
    const nextLevel = REPUTATION_LEVELS.find((level) => level.level > reputationSummary.level)

    const response = {
      userId,
      reputation: reputationSummary,
      level: {
        current: currentLevel
          ? {
              level: currentLevel.level,
              name: currentLevel.name,
              minPoints: currentLevel.minPoints,
              benefits: currentLevel.benefits,
            }
          : null,
        next: nextLevel
          ? {
              level: nextLevel.level,
              name: nextLevel.name,
              minPoints: nextLevel.minPoints,
              pointsRequired: nextLevel.minPoints - reputationSummary.totalPoints,
              benefits: nextLevel.benefits,
            }
          : null,
        progress: {
          current: reputationSummary.levelProgress,
          percentage: Math.min(100, Math.max(0, reputationSummary.levelProgress)),
        },
      },
      statistics: detailedBreakdown,
      history: recentHistory,
      antiGaming: antiGamingData,
      meta: {
        isOwnReputation,
        hasFullAccess: isOwnReputation || profileVisibility === 'public',
        lastCalculated: reputationSummary.lastCalculated,
        calculationAge: reputationSummary.lastCalculated
          ? Date.now() - new Date(reputationSummary.lastCalculated).getTime()
          : null,
      },
    }

    const executionTime = Date.now() - startTime
    console.log(
      `[ReputationAPI] Reputation data retrieved successfully for user ${userId} in ${executionTime}ms`
    )

    return NextResponse.json({
      ...response,
      executionTime,
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[ReputationAPI] Error in GET request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid user ID',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to retrieve reputation data',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/community/users/[userId]/reputation - Recalculate user reputation
 */
export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  const startTime = Date.now()

  try {
    console.log(
      `[ReputationAPI] Processing POST request for reputation recalculation: ${params.userId}`
    )

    // Validate user ID parameter
    const { userId } = UserIdParamSchema.parse(params)

    // Authenticate user
    const session = await getSession()
    if (!session?.user?.id) {
      console.warn('[ReputationAPI] Unauthorized reputation recalculation request')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const requesterId = session.user.id

    // Check authorization - user can recalculate own reputation or admin can recalculate any
    const isOwnReputation = userId === requesterId
    const isAdmin = false // TODO: Implement admin role check when role system is ready

    if (!isOwnReputation && !isAdmin) {
      console.warn(
        `[ReputationAPI] User ${requesterId} attempted to recalculate reputation for ${userId}`
      )
      return NextResponse.json(
        { error: 'You can only recalculate your own reputation' },
        { status: 403 }
      )
    }

    // Rate limiting for reputation recalculation
    const rateLimitKey = isAdmin
      ? `admin_reputation_recalc:${requesterId}`
      : `reputation_recalc:${userId}`
    const rateLimit = isAdmin ? ratelimit(10, '1h') : ratelimit(3, '1h') // More lenient for admins
    const rateLimitResult = await rateLimit.limit(rateLimitKey)

    if (!rateLimitResult.success) {
      console.warn(
        `[ReputationAPI] Rate limit exceeded for reputation recalculation: ${rateLimitKey}`
      )
      return NextResponse.json(
        { error: 'Rate limit exceeded. Reputation can only be recalculated a few times per hour.' },
        { status: 429 }
      )
    }

    // Parse request body for options
    const body = await request.json().catch(() => ({}))
    const forceRecalculation = body.force === true
    const fromScratch = body.fromScratch === true

    console.log(
      `[ReputationAPI] Recalculation options - force: ${forceRecalculation}, fromScratch: ${fromScratch}`
    )

    // Check if user exists
    const userExists = await db.execute(sql`
      SELECT id FROM "user" WHERE id = ${userId}
    `)

    if (!userExists[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get reputation system instance and recalculate
    const reputationSystem = CommunityReputationSystem.getInstance()
    const calculationResult = await reputationSystem.calculateUserReputation(userId, fromScratch)

    // Log the recalculation activity
    await db.execute(sql`
      INSERT INTO community_user_activities (
        id, user_id, activity_type, activity_data, visibility, created_at
      ) VALUES (
        gen_random_uuid()::TEXT, ${userId}, 'reputation_recalculated',
        ${JSON.stringify({
          requestedBy: requesterId,
          isOwnRequest: isOwnReputation,
          fromScratch,
          oldPoints: calculationResult.previousPoints,
          newPoints: calculationResult.newPoints,
          pointsChange: calculationResult.pointsChange,
          levelChange: calculationResult.levelChanged,
        })}::jsonb,
        ${isOwnReputation ? 'public' : 'private'}, NOW()
      )
    `)

    const executionTime = Date.now() - startTime
    console.log(
      `[ReputationAPI] Reputation recalculated successfully for user ${userId} in ${executionTime}ms`
    )

    return NextResponse.json({
      success: true,
      message: 'Reputation recalculated successfully',
      calculation: {
        userId: calculationResult.userId,
        previousPoints: calculationResult.previousPoints,
        newPoints: calculationResult.newPoints,
        pointsChange: calculationResult.pointsChange,
        previousLevel: calculationResult.previousLevel,
        newLevel: calculationResult.newLevel,
        levelChanged: calculationResult.levelChanged,
        badgesAwarded: calculationResult.badgesAwarded,
        breakdown: calculationResult.calculationDetails,
      },
      meta: {
        executionTime,
        requestedBy: requesterId,
        isOwnRequest: isOwnReputation,
        fromScratch,
        calculatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[ReputationAPI] Error in POST request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to recalculate reputation',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/community/users/[userId]/reputation/history - Get detailed reputation history
 */
export async function GET_HISTORY(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const startTime = Date.now()

  try {
    console.log(`[ReputationAPI] Processing reputation history request for user: ${params.userId}`)

    // Validate user ID parameter
    const { userId } = UserIdParamSchema.parse(params)

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())

    /**
     * Query Parameter Type Safety Enhancement:
     * Convert string parameters to appropriate types for validation
     * Handles numeric conversions with proper type casting for pagination
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

    const historyParams = ReputationHistoryQuerySchema.parse(processedParams)

    // Get viewer's authentication status
    const session = await getSession()
    const viewerId = session?.user?.id
    const isOwnReputation = userId === viewerId

    // Check user privacy settings
    const userCheck = await db.execute(sql`
      SELECT 
        u.id,
        cup.profile_visibility,
        cup.show_activity
      FROM "user" u
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      WHERE u.id = ${userId}
    `)

    if (!userCheck[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userCheck[0] as any
    const profileVisibility = userData.profile_visibility || 'public'
    const showActivity = userData.show_activity !== false

    // Check access permissions
    if (!isOwnReputation && (profileVisibility === 'private' || !showActivity)) {
      return NextResponse.json(
        { error: 'Reputation history is not accessible for this user' },
        { status: 403 }
      )
    }

    // Build history query using drizzle sql template
    let baseCondition = sql`user_id = ${userId}`
    
    if (historyParams.changeType) {
      baseCondition = sql`${baseCondition} AND change_type = ${historyParams.changeType}`
    }
    
    if (historyParams.startDate) {
      baseCondition = sql`${baseCondition} AND created_at >= ${historyParams.startDate}`
    }
    
    if (historyParams.endDate) {
      baseCondition = sql`${baseCondition} AND created_at <= ${historyParams.endDate}`
    }

    // Get history records
    const historyResult = await db.execute(sql`
      SELECT 
        id,
        change_type,
        points_change,
        previous_total,
        new_total,
        source_type,
        source_id,
        source_context,
        reason,
        triggered_by,
        algorithm_version,
        is_validated,
        moderator_id,
        created_at
      FROM user_reputation_history
      WHERE ${baseCondition}
      ORDER BY created_at DESC
      LIMIT ${historyParams.limit} OFFSET ${historyParams.offset}
    `)

    // Get total count
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM user_reputation_history
      WHERE ${baseCondition}
    `)
    const totalRecords = Number((countResult[0] as any)?.total || 0)

    // Format history records
    const history = historyResult.map((row: any) => ({
      id: row.id,
      changeType: row.change_type,
      pointsChange: row.points_change,
      previousTotal: row.previous_total,
      newTotal: row.new_total,
      source: {
        type: row.source_type,
        id: row.source_id,
        context: row.source_context,
      },
      reason: row.reason,
      triggeredBy: row.triggered_by,
      algorithmVersion: row.algorithm_version,
      isValidated: row.is_validated,
      moderatorId: row.moderator_id,
      date: row.created_at,
    }))

    const executionTime = Date.now() - startTime
    console.log(
      `[ReputationAPI] Reputation history retrieved successfully for user ${userId} in ${executionTime}ms`
    )

    return NextResponse.json({
      userId,
      history,
      pagination: {
        total: totalRecords,
        limit: historyParams.limit,
        offset: historyParams.offset,
        hasMore: historyParams.offset + historyParams.limit < totalRecords,
      },
      filters: historyParams,
      meta: {
        executionTime,
        isOwnReputation,
        recordCount: history.length,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[ReputationAPI] Error in reputation history request:', error)

    return NextResponse.json(
      {
        error: 'Failed to retrieve reputation history',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}
