/**
 * Community Analytics Health API
 *
 * Provides comprehensive community health assessment with scoring,
 * recommendations, and actionable insights for community management.
 *
 * @created 2025-09-04
 * @author Community Analytics Health API
 */

import { sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { ratelimit } from '@/lib/ratelimit'
import { db } from '@/db'

const HealthAnalyticsSchema = z.object({
  includeRecommendations: z.boolean().default(true),
  includeMetrics: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[HealthAnalytics] Processing GET request')

    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())

    if (queryParams.includeRecommendations)
      queryParams.includeRecommendations = queryParams.includeRecommendations === 'true'
    if (queryParams.includeMetrics)
      queryParams.includeMetrics = queryParams.includeMetrics === 'true'

    const params = HealthAnalyticsSchema.parse(queryParams)

    // Get current user
    const currentUser = await auth()
    const currentUserId = currentUser?.user?.id

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || currentUserId || 'anonymous'
    const rateLimitResult = await ratelimit(30, '1m').limit(`health_analytics:${clientId}`)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Calculate comprehensive health metrics
    const healthMetrics = await calculateHealthMetrics()

    // Generate recommendations if requested
    let recommendations: any[] = []
    if (params.includeRecommendations) {
      recommendations = generateHealthRecommendations(healthMetrics)
    }

    const executionTime = Date.now() - startTime
    console.log(`[HealthAnalytics] Generated health analysis in ${executionTime}ms`)

    return NextResponse.json({
      data: {
        overallScore: healthMetrics.overallScore,
        metrics: healthMetrics.metrics,
        recommendations: recommendations,
        lastCalculated: new Date().toISOString(),
      },
      meta: {
        executionTime,
        currentUserId,
        calculationMethod: 'weighted-composite-scoring',
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[HealthAnalytics] Error in GET request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors, executionTime },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to retrieve health analytics',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

// Calculate comprehensive health metrics
async function calculateHealthMetrics() {
  console.log('[HealthAnalytics] Calculating comprehensive health metrics')

  try {
    // Active Users metric (last 7 days)
    const activeUsersQuery = `
      SELECT 
        COUNT(DISTINCT user_id) as active_count,
        (SELECT COUNT(*) FROM "user" WHERE created_at <= NOW() - INTERVAL '7 days') as total_users_week_ago
      FROM (
        SELECT user_id FROM community_user_activities WHERE created_at >= NOW() - INTERVAL '7 days'
        UNION
        SELECT user_id FROM community_comments WHERE created_at >= NOW() - INTERVAL '7 days'
        UNION
        SELECT user_id FROM community_activity_engagement WHERE created_at >= NOW() - INTERVAL '7 days'
      ) active_users
    `
    const activeUsersResult = await db.execute(sql.raw(activeUsersQuery))
    const activeUsersData = activeUsersResult.rows[0] as any

    const activeUsersPercent =
      activeUsersData.total_users_week_ago > 0
        ? (activeUsersData.active_count / activeUsersData.total_users_week_ago) * 100
        : 0

    // Content Quality metric (average template rating)
    const contentQualityQuery = `
      SELECT 
        AVG(rating_average) as avg_rating,
        COUNT(*) as total_rated_templates,
        COUNT(CASE WHEN rating_average >= 4.0 THEN 1 END) as high_quality_templates
      FROM templates
      WHERE status = 'approved' AND rating_count > 0
    `
    const contentQualityResult = await db.execute(sql.raw(contentQualityQuery))
    const contentQualityData = contentQualityResult.rows[0] as any

    const contentQualityScore = (Number.parseFloat(contentQualityData.avg_rating || 0) / 5) * 100
    const highQualityRatio =
      contentQualityData.total_rated_templates > 0
        ? (contentQualityData.high_quality_templates / contentQualityData.total_rated_templates) *
          100
        : 0

    // User Satisfaction metric (engagement and retention)
    const userSatisfactionQuery = `
      WITH user_engagement AS (
        SELECT 
          u.id,
          u.created_at,
          CASE 
            WHEN cup.last_active_at >= NOW() - INTERVAL '7 days' THEN 5
            WHEN cup.last_active_at >= NOW() - INTERVAL '30 days' THEN 4
            WHEN cup.last_active_at >= NOW() - INTERVAL '90 days' THEN 3
            WHEN cup.last_active_at >= NOW() - INTERVAL '180 days' THEN 2
            ELSE 1
          END as engagement_level
        FROM "user" u
        LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
        WHERE u.created_at <= NOW() - INTERVAL '30 days'
      )
      SELECT 
        AVG(engagement_level) * 20 as satisfaction_score,
        COUNT(CASE WHEN engagement_level >= 4 THEN 1 END) as highly_satisfied,
        COUNT(*) as total_eligible_users
      FROM user_engagement
    `
    const userSatisfactionResult = await db.execute(sql.raw(userSatisfactionQuery))
    const userSatisfactionData = userSatisfactionResult.rows[0] as any

    const userSatisfactionScore = Number.parseFloat(userSatisfactionData.satisfaction_score || 70)

    // Growth Rate metric (30-day user growth)
    const growthRateQuery = `
      SELECT 
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days' THEN 1 END) as previous_period_users
      FROM "user"
    `
    const growthRateResult = await db.execute(sql.raw(growthRateQuery))
    const growthRateData = growthRateResult.rows[0] as any

    const growthRate =
      growthRateData.previous_period_users > 0
        ? (growthRateData.new_users / growthRateData.previous_period_users - 1) * 100
        : growthRateData.new_users > 0
          ? 100
          : 0

    // Churn Rate metric (users who haven't been active in 60+ days)
    const churnRateQuery = `
      SELECT 
        COUNT(CASE WHEN cup.last_active_at < NOW() - INTERVAL '60 days' OR cup.last_active_at IS NULL THEN 1 END) as churned_users,
        COUNT(*) as total_users
      FROM "user" u
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      WHERE u.created_at <= NOW() - INTERVAL '60 days'
    `
    const churnRateResult = await db.execute(sql.raw(churnRateQuery))
    const churnRateData = churnRateResult.rows[0] as any

    const churnRate =
      churnRateData.total_users > 0
        ? (churnRateData.churned_users / churnRateData.total_users) * 100
        : 0

    // Calculate overall health score using weighted algorithm
    const weights = {
      activeUsers: 0.25,
      contentQuality: 0.25,
      userSatisfaction: 0.2,
      growthRate: 0.15,
      churnRate: 0.15, // Inverted - lower churn is better
    }

    const normalizedGrowthRate = Math.min(Math.max(growthRate, -50), 100) + 50 // Normalize to 0-100
    const normalizedChurnRate = 100 - Math.min(churnRate, 100) // Invert churn rate

    const overallScore = Math.round(
      activeUsersPercent * weights.activeUsers +
        contentQualityScore * weights.contentQuality +
        userSatisfactionScore * weights.userSatisfaction +
        normalizedGrowthRate * weights.growthRate +
        normalizedChurnRate * weights.churnRate
    )

    return {
      overallScore: Math.min(Math.max(overallScore, 0), 100),
      metrics: {
        activeUsers: {
          value: Math.round(activeUsersPercent),
          trend: activeUsersPercent > 20 ? 'up' : activeUsersPercent > 10 ? 'stable' : 'down',
          count: activeUsersData.active_count,
          total: activeUsersData.total_users_week_ago,
        },
        contentQuality: {
          value: Math.round(contentQualityScore),
          trend: contentQualityScore > 80 ? 'up' : contentQualityScore > 60 ? 'stable' : 'down',
          avgRating: Number.parseFloat(contentQualityData.avg_rating || 0),
          highQualityRatio: Math.round(highQualityRatio),
        },
        userSatisfaction: {
          value: Math.round(userSatisfactionScore),
          trend: userSatisfactionScore > 80 ? 'up' : userSatisfactionScore > 60 ? 'stable' : 'down',
          highlySatisfied: userSatisfactionData.highly_satisfied,
          totalUsers: userSatisfactionData.total_eligible_users,
        },
        growthRate: {
          value: Math.round(normalizedGrowthRate),
          trend: growthRate > 10 ? 'up' : growthRate > -5 ? 'stable' : 'down',
          newUsers: growthRateData.new_users,
          growthPercent: Math.round(growthRate * 100) / 100,
        },
        churnRate: {
          value: Math.round(normalizedChurnRate),
          trend: churnRate < 20 ? 'up' : churnRate < 40 ? 'stable' : 'down',
          churnedUsers: churnRateData.churned_users,
          churnPercent: Math.round(churnRate * 100) / 100,
        },
      },
    }
  } catch (error) {
    console.error('[HealthAnalytics] Error calculating health metrics:', error)
    return {
      overallScore: 50,
      metrics: {
        activeUsers: { value: 50, trend: 'stable' },
        contentQuality: { value: 50, trend: 'stable' },
        userSatisfaction: { value: 50, trend: 'stable' },
        growthRate: { value: 50, trend: 'stable' },
        churnRate: { value: 50, trend: 'stable' },
      },
    }
  }
}

// Generate health recommendations based on metrics
function generateHealthRecommendations(healthMetrics: any) {
  const recommendations = []
  const { overallScore, metrics } = healthMetrics

  // Overall health recommendations
  if (overallScore < 60) {
    recommendations.push({
      priority: 'high',
      category: 'Overall Health',
      title: 'Community Health Needs Attention',
      description:
        'Multiple metrics indicate declining community health that requires immediate action.',
      actionItems: [
        'Conduct user survey to identify pain points',
        'Implement user retention campaigns',
        'Review and improve onboarding process',
        'Increase community engagement initiatives',
      ],
    })
  }

  // Active users recommendations
  if (metrics.activeUsers.value < 25) {
    recommendations.push({
      priority: 'high',
      category: 'User Engagement',
      title: 'Low Active User Engagement',
      description: `Only ${metrics.activeUsers.value}% of users are actively engaging with the community.`,
      actionItems: [
        'Launch re-engagement email campaigns',
        'Create compelling content and challenges',
        'Improve notification and communication strategy',
        'Host live events and community activities',
      ],
    })
  }

  // Content quality recommendations
  if (metrics.contentQuality.value < 70) {
    recommendations.push({
      priority: 'medium',
      category: 'Content Quality',
      title: 'Content Quality Below Standards',
      description:
        'Template quality scores indicate need for better content curation and creator support.',
      actionItems: [
        'Implement enhanced content review process',
        'Provide creator education and guidelines',
        'Introduce quality incentives and recognition',
        'Create template quality feedback system',
      ],
    })
  }

  // Growth rate recommendations
  if (metrics.growthRate.value < 40) {
    recommendations.push({
      priority: 'medium',
      category: 'Growth',
      title: 'Slow User Growth Rate',
      description: 'User acquisition is below healthy growth targets.',
      actionItems: [
        'Optimize referral and invitation programs',
        'Improve SEO and discovery mechanisms',
        'Launch targeted marketing campaigns',
        'Enhance social sharing features',
      ],
    })
  }

  // Churn rate recommendations
  if (metrics.churnRate.value < 60) {
    // Remember: lower churn rate value means higher actual churn
    recommendations.push({
      priority: 'high',
      category: 'User Retention',
      title: 'High User Churn Rate',
      description: 'Too many users are becoming inactive, indicating retention issues.',
      actionItems: [
        'Implement win-back campaigns for inactive users',
        'Analyze churn patterns and root causes',
        'Improve user onboarding and value delivery',
        'Create loyalty programs and engagement loops',
      ],
    })
  }

  // User satisfaction recommendations
  if (metrics.userSatisfaction.value < 75) {
    recommendations.push({
      priority: 'medium',
      category: 'User Experience',
      title: 'User Satisfaction Below Target',
      description: 'User engagement patterns suggest satisfaction could be improved.',
      actionItems: [
        'Conduct user experience research and testing',
        'Implement user feedback collection system',
        'Prioritize UX improvements based on data',
        'Create user success and support programs',
      ],
    })
  }

  // Positive recommendations for high-performing areas
  if (overallScore > 80) {
    recommendations.push({
      priority: 'low',
      category: 'Community Growth',
      title: 'Excellent Community Health',
      description: 'Your community is performing exceptionally well across key metrics.',
      actionItems: [
        'Document successful strategies for scaling',
        'Consider expanding to new user segments',
        'Invest in advanced community features',
        'Share success stories and case studies',
      ],
    })
  }

  return recommendations
}
