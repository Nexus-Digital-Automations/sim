/**
 * Community Analytics Engagement API
 *
 * Provides user engagement analytics and behavioral insights.
 * Supports cohort analysis, engagement patterns, and user journey tracking.
 *
 * @created 2025-09-04
 * @author Community Analytics Engagement API
 */

import { sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { ratelimit } from '@/lib/ratelimit'
import { db } from '@/db'

const EngagementAnalyticsSchema = z.object({
  timeRange: z.enum(['24h', '7d', '30d', '90d', '1y']).default('30d'),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  includeDetails: z.boolean().default(true),
  segment: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[EngagementAnalytics] Processing GET request')

    const url = new URL(request.url)
    const queryParams: Record<string, any> = Object.fromEntries(url.searchParams.entries())

    if (queryParams.limit) queryParams.limit = Number.parseInt(queryParams.limit)
    if (queryParams.offset) queryParams.offset = Number.parseInt(queryParams.offset)
    if (queryParams.includeDetails)
      queryParams.includeDetails = queryParams.includeDetails === 'true'

    const params = EngagementAnalyticsSchema.parse(queryParams)

    // Get current user session for authentication and rate limiting
    // Using getSession() instead of auth() to properly handle authentication state
    const currentUser = await getSession()
    const currentUserId = currentUser?.user?.id

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || currentUserId || 'anonymous'
    const rateLimitResult = await ratelimit(60, '1m').limit(`engagement_analytics:${clientId}`)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Calculate time range in days
    const timeRangeDays = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    }
    const daysBack = timeRangeDays[params.timeRange]

    // Get user engagement data
    const engagementQuery = `
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.created_at as join_date,
        cup.display_name,
        cup.is_verified,
        ur.total_points as reputation,
        
        -- Template creation metrics
        COALESCE(template_stats.templates_created, 0) as templates_created,
        COALESCE(template_stats.total_downloads, 0) as total_downloads,
        COALESCE(template_stats.avg_rating, 0) as avg_template_rating,
        
        -- Review and comment activity
        COALESCE(review_stats.reviews_written, 0) as reviews_written,
        COALESCE(comment_stats.comments_posted, 0) as comments_posted,
        
        -- Social engagement
        COALESCE(social_stats.activities_created, 0) as activities_created,
        COALESCE(social_stats.likes_given, 0) as likes_given,
        COALESCE(social_stats.likes_received, 0) as likes_received,
        COALESCE(follow_stats.followers_count, 0) as followers_count,
        COALESCE(follow_stats.following_count, 0) as following_count,
        
        -- Calculate engagement score
        COALESCE(
          (template_stats.templates_created * 10) +
          (review_stats.reviews_written * 3) +
          (comment_stats.comments_posted * 1) +
          (social_stats.activities_created * 2) +
          (social_stats.likes_given * 0.5) +
          (follow_stats.followers_count * 2), 0
        ) as engagement_score,
        
        -- Last activity
        GREATEST(
          cup.last_active_at,
          recent_activity.last_activity
        ) as last_active,
        
        -- Retention metrics
        CASE 
          WHEN GREATEST(cup.last_active_at, recent_activity.last_activity) >= NOW() - INTERVAL '7 days' THEN 100
          WHEN GREATEST(cup.last_active_at, recent_activity.last_activity) >= NOW() - INTERVAL '30 days' THEN 75
          WHEN GREATEST(cup.last_active_at, recent_activity.last_activity) >= NOW() - INTERVAL '90 days' THEN 50
          ELSE 25
        END as retention_score

      FROM "user" u
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      
      -- Template creation statistics
      LEFT JOIN (
        SELECT 
          created_by_user_id as user_id,
          COUNT(*) as templates_created,
          SUM(download_count) as total_downloads,
          AVG(rating_average) as avg_rating
        FROM templates
        WHERE status = 'approved' AND created_at >= NOW() - INTERVAL '${daysBack} days'
        GROUP BY created_by_user_id
      ) template_stats ON u.id = template_stats.user_id
      
      -- Review statistics
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as reviews_written
        FROM template_reviews
        WHERE created_at >= NOW() - INTERVAL '${daysBack} days'
        GROUP BY user_id
      ) review_stats ON u.id = review_stats.user_id
      
      -- Comment statistics
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as comments_posted
        FROM community_comments
        WHERE created_at >= NOW() - INTERVAL '${daysBack} days' AND is_deleted = false
        GROUP BY user_id
      ) comment_stats ON u.id = comment_stats.user_id
      
      -- Social activity statistics
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as activities_created,
          0 as likes_given,
          0 as likes_received
        FROM community_user_activities
        WHERE created_at >= NOW() - INTERVAL '${daysBack} days' AND is_hidden = false
        GROUP BY user_id
      ) social_stats ON u.id = social_stats.user_id
      
      -- Follow statistics
      LEFT JOIN (
        SELECT 
          u.id as user_id,
          COALESCE(followers.count, 0) as followers_count,
          COALESCE(following.count, 0) as following_count
        FROM "user" u
        LEFT JOIN (
          SELECT following_id, COUNT(*) as count
          FROM community_user_follows
          GROUP BY following_id
        ) followers ON u.id = followers.following_id
        LEFT JOIN (
          SELECT follower_id, COUNT(*) as count
          FROM community_user_follows
          GROUP BY follower_id
        ) following ON u.id = following.follower_id
      ) follow_stats ON u.id = follow_stats.user_id
      
      -- Recent activity timestamp
      LEFT JOIN (
        SELECT 
          user_id,
          MAX(created_at) as last_activity
        FROM (
          SELECT user_id, created_at FROM community_user_activities WHERE created_at >= NOW() - INTERVAL '90 days'
          UNION ALL
          SELECT user_id, created_at FROM community_comments WHERE created_at >= NOW() - INTERVAL '90 days'
          UNION ALL
          SELECT user_id, created_at FROM community_activity_engagement WHERE created_at >= NOW() - INTERVAL '90 days'
        ) all_activities
        GROUP BY user_id
      ) recent_activity ON u.id = recent_activity.user_id
      
      WHERE u.created_at >= NOW() - INTERVAL '${daysBack * 3} days'
      ORDER BY engagement_score DESC
      LIMIT $1 OFFSET $2
    `

    // Execute engagement analytics query with proper parameter substitution
    // Using sql.raw() for complex analytical query with dynamic time ranges
    const result = await db.execute(sql.raw(engagementQuery.replace('$1', String(params.limit)).replace('$2', String(params.offset))))

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "user" u
      WHERE u.created_at >= NOW() - INTERVAL '${daysBack * 3} days'
    `
    // Get total count of users for pagination metadata
    // Direct array access for database results (not .rows property)
    const countResult = await db.execute(sql.raw(countQuery))
    const totalUsers = Number((countResult[0] as any)?.total || 0)

    // Transform raw database results into structured engagement data
    // Direct array access for database results (database adapter doesn't use .rows)
    const engagementData = result.map((row: any) => ({
      userId: row.user_id,
      userName: row.user_name,
      displayName: row.display_name,
      isVerified: row.is_verified || false,
      reputation: row.reputation || 0,
      templatesCreated: row.templates_created || 0,
      reviewsWritten: row.reviews_written || 0,
      commentsPosted: row.comments_posted || 0,
      activitiesCreated: row.activities_created || 0,
      likesGiven: row.likes_given || 0,
      likesReceived: row.likes_received || 0,
      followersCount: row.followers_count || 0,
      followingCount: row.following_count || 0,
      engagementScore: Number.parseFloat(row.engagement_score || 0),
      retentionScore: row.retention_score || 0,
      totalDownloads: row.total_downloads || 0,
      avgTemplateRating: Number.parseFloat(row.avg_template_rating || 0),
      joinDate: row.join_date,
      lastActive: row.last_active,
    }))

    const executionTime = Date.now() - startTime
    console.log(
      `[EngagementAnalytics] Retrieved ${engagementData.length} users in ${executionTime}ms`
    )

    return NextResponse.json({
      data: engagementData,
      pagination: {
        total: totalUsers,
        limit: params.limit,
        offset: params.offset,
        hasMore: params.offset + params.limit < totalUsers,
      },
      filters: {
        timeRange: params.timeRange,
        segment: params.segment,
      },
      summary: {
        totalEngagedUsers: engagementData.length,
        avgEngagementScore:
          engagementData.reduce((sum: number, user: any) => sum + user.engagementScore, 0) /
            engagementData.length || 0,
        highEngagementUsers: engagementData.filter((user: any) => user.engagementScore > 50).length,
        activeRetentionRate:
          (engagementData.filter((user: any) => user.retentionScore >= 75).length /
            engagementData.length) *
            100 || 0,
      },
      meta: {
        executionTime,
        userCount: engagementData.length,
        currentUserId,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[EngagementAnalytics] Error in GET request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors, executionTime },
        { status: 400 }
      )
    }

    // Proper error type casting for TypeScript compliance
    // Handle both Error instances and unknown error types safely
    const errorMessage = (error as Error).message || 'Internal server error'
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve engagement analytics',
        message: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}
