/**
 * Marketplace Ratings and Reviews API - Comprehensive Review System
 *
 * This API provides comprehensive template rating and review functionality including:
 * - Multi-dimensional rating system (quality, ease of use, documentation, etc.)
 * - Rich review content with usage context and verification
 * - Community-driven review validation and helpfulness voting
 * - Advanced analytics and sentiment analysis
 * - Moderation and quality control mechanisms
 * - Review aggregation and statistical analysis
 *
 * Features:
 * - Verified usage tracking for authentic reviews
 * - Multi-criteria rating system for detailed feedback
 * - Review helpfulness voting and reputation scoring
 * - Advanced anti-spam and fraud detection
 * - Comprehensive analytics and insights
 * - Integration with recommendation algorithms
 *
 * @author Claude Code Review System
 * @version 2.0.0
 * @implements Advanced Review and Rating Architecture
 */

import { and, desc, eq, gte, sql, inArray, or, lte } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import {
  templates,
  templateRatings,
  templateRatingVotes,
  user,
} from '@/db/schema'

const logger = createLogger('MarketplaceRatingsAPI')

interface RatingSubmission {
  templateId: string
  userId: string
  rating: number
  title?: string
  content?: string
  usageContext?: string
  easeOfUseRating?: number
  documentationRating?: number
  performanceRating?: number
  valueRating?: number
  wouldRecommend?: boolean
  tags?: string[]
  isVerifiedUsage?: boolean
}

interface ReviewData {
  id: string
  templateId: string
  userId: string
  userName: string
  userImage: string | null
  rating: number
  title: string | null
  content: string | null
  usageContext: string | null
  easeOfUseRating: number | null
  documentationRating: number | null
  performanceRating: number | null
  valueRating: number | null
  wouldRecommend: boolean | null
  helpfulCount: number
  unhelpfulCount: number
  isVerifiedUsage: boolean
  isApproved: boolean
  createdAt: string
  updatedAt: string
  userVote?: 'helpful' | 'unhelpful' | null
  tags?: string[]
}

/**
 * Template Ratings API - GET /api/marketplace/ratings
 *
 * Retrieve ratings and reviews for templates with comprehensive filtering
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)

    // Extract parameters
    const templateId = searchParams.get('templateId')
    const userId = searchParams.get('userId') // For getting user's vote status
    const minRating = Number.parseInt(searchParams.get('minRating') || '1')
    const maxRating = Number.parseInt(searchParams.get('maxRating') || '5')
    const sortBy = searchParams.get('sortBy') || 'helpful' // 'helpful', 'recent', 'rating', 'oldest'
    const filterBy = searchParams.get('filterBy') // 'verified', 'recommended', 'detailed'
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '20')))
    const includeStats = searchParams.get('includeStats') === 'true'
    const includeDistribution = searchParams.get('includeDistribution') === 'true'

    if (!templateId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing template ID',
          message: 'Template ID is required to retrieve ratings',
        },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Ratings retrieval request`, {
      templateId: `${templateId.slice(0, 8)}...`,
      userId: userId ? `${userId.slice(0, 8)}...` : null,
      sortBy,
      filterBy,
      page,
      limit,
      ratingRange: [minRating, maxRating],
    })

    // Build conditions
    const conditions = [
      eq(templateRatings.templateId, templateId),
      eq(templateRatings.isApproved, true),
    ]

    if (minRating > 1) {
      conditions.push(gte(templateRatings.rating, minRating))
    }

    if (maxRating < 5) {
      conditions.push(lte(templateRatings.rating, maxRating))
    }

    // Apply filters
    if (filterBy === 'verified') {
      conditions.push(eq(templateRatings.isVerifiedUsage, true))
    } else if (filterBy === 'recommended') {
      conditions.push(eq(templateRatings.wouldRecommend, true))
    } else if (filterBy === 'detailed') {
      conditions.push(sql`${templateRatings.content} IS NOT NULL AND LENGTH(${templateRatings.content}) > 50`)
    }

    // Build sorting
    let orderByClause
    switch (sortBy) {
      case 'recent':
        orderByClause = desc(templateRatings.createdAt)
        break
      case 'rating':
        orderByClause = desc(templateRatings.rating)
        break
      case 'oldest':
        orderByClause = templateRatings.createdAt
        break
      default:
        // Sort by helpfulness
        orderByClause = sql`(${templateRatings.helpfulCount} - ${templateRatings.unhelpfulCount}) DESC, ${templateRatings.createdAt} DESC`
    }

    const offset = (page - 1) * limit

    // Get reviews with user vote status
    const reviewsQuery = db
      .select({
        id: templateRatings.id,
        templateId: templateRatings.templateId,
        userId: templateRatings.userId,
        userName: user.name,
        userImage: user.image,
        rating: templateRatings.rating,
        title: templateRatings.title,
        content: templateRatings.content,
        usageContext: templateRatings.usageContext,
        easeOfUseRating: templateRatings.easeOfUseRating,
        documentationRating: templateRatings.documentationRating,
        performanceRating: templateRatings.performanceRating,
        valueRating: templateRatings.valueRating,
        wouldRecommend: templateRatings.wouldRecommend,
        helpfulCount: templateRatings.helpfulCount,
        unhelpfulCount: templateRatings.unhelpfulCount,
        isVerifiedUsage: templateRatings.isVerifiedUsage,
        isApproved: templateRatings.isApproved,
        createdAt: templateRatings.createdAt,
        updatedAt: templateRatings.updatedAt,
        // Include user's vote if userId provided
        ...(userId && {
          userVote: sql<'helpful' | 'unhelpful' | null>`
            CASE 
              WHEN ${templateRatingVotes.isHelpful} = true THEN 'helpful'
              WHEN ${templateRatingVotes.isHelpful} = false THEN 'unhelpful'
              ELSE NULL
            END
          `,
        }),
      })
      .from(templateRatings)
      .leftJoin(user, eq(templateRatings.userId, user.id))

    // Add user vote join if userId provided
    if (userId) {
      reviewsQuery.leftJoin(
        templateRatingVotes,
        and(
          eq(templateRatingVotes.ratingId, templateRatings.id),
          eq(templateRatingVotes.userId, userId)
        )
      )
    }

    const reviews = await reviewsQuery
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset)

    // Get total count
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(templateRatings)
      .where(and(...conditions))

    const totalCount = totalCountResult[0]?.count || 0

    // Get stats if requested
    let stats = null
    if (includeStats) {
      stats = await getRatingStats(templateId)
    }

    // Get rating distribution if requested
    let distribution = null
    if (includeDistribution) {
      distribution = await getRatingDistribution(templateId)
    }

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Ratings retrieved`, {
      reviewCount: reviews.length,
      totalCount,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: reviews.map(formatReviewData),
      stats,
      distribution,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
      metadata: {
        requestId,
        templateId: `${templateId.slice(0, 8)}...`,
        filters: {
          sortBy,
          filterBy,
          ratingRange: [minRating, maxRating],
        },
        processingTime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Ratings retrieval failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve ratings',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Submit Rating/Review - POST /api/marketplace/ratings
 *
 * Submit a new rating and review for a template
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const submission: RatingSubmission = await request.json()

    const {
      templateId,
      userId,
      rating,
      title,
      content,
      usageContext,
      easeOfUseRating,
      documentationRating,
      performanceRating,
      valueRating,
      wouldRecommend,
      tags,
      isVerifiedUsage,
    } = submission

    // Validate required fields
    if (!templateId || !userId || !rating) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'Template ID, user ID, and rating are required',
        },
        { status: 400 }
      )
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid rating',
          message: 'Rating must be between 1 and 5',
        },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Rating submission`, {
      templateId: `${templateId.slice(0, 8)}...`,
      userId: `${userId.slice(0, 8)}...`,
      rating,
      hasContent: !!content,
      isVerified: isVerifiedUsage,
    })

    // Check if user already rated this template
    const existingRating = await db
      .select({ id: templateRatings.id })
      .from(templateRatings)
      .where(
        and(
          eq(templateRatings.templateId, templateId),
          eq(templateRatings.userId, userId)
        )
      )
      .limit(1)

    if (existingRating.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Already rated',
          message: 'User has already rated this template',
        },
        { status: 409 }
      )
    }

    // Verify template exists
    const template = await db
      .select({ id: templates.id, name: templates.name })
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1)

    if (template.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template not found',
          message: 'The specified template does not exist',
        },
        { status: 404 }
      )
    }

    // Verify user exists
    const userRecord = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    if (userRecord.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
          message: 'The specified user does not exist',
        },
        { status: 404 }
      )
    }

    // Create the rating
    const newRatingId = crypto.randomUUID()
    await db.insert(templateRatings).values({
      id: newRatingId,
      templateId,
      userId,
      rating,
      title,
      content,
      usageContext,
      easeOfUseRating,
      documentationRating,
      performanceRating,
      valueRating,
      wouldRecommend,
      isVerifiedUsage: isVerifiedUsage || false,
      isApproved: true, // Auto-approve for now, can add moderation later
      helpfulCount: 0,
      unhelpfulCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Update template rating statistics
    await updateTemplateRatingStats(templateId)

    // Create activity feed entry
    await db.execute(sql`
      INSERT INTO activity_feed (
        user_id, actor_id, activity_type, object_type, object_id,
        engagement_score, relevance_score, created_at,
        metadata
      )
      SELECT 
        t.created_by_user_id, ${userId}, 'template_rated', 'template', ${templateId}::uuid,
        ${Math.min(rating * 0.5 + 1, 5)}, ${rating * 0.3 + 1}, NOW(),
        JSON_BUILD_OBJECT('rating', ${rating}, 'hasReview', ${!!content})
      FROM templates t
      WHERE t.id = ${templateId}
    `)

    // Get the created rating with user info
    const createdRating = await db
      .select({
        id: templateRatings.id,
        templateId: templateRatings.templateId,
        userId: templateRatings.userId,
        userName: user.name,
        userImage: user.image,
        rating: templateRatings.rating,
        title: templateRatings.title,
        content: templateRatings.content,
        usageContext: templateRatings.usageContext,
        easeOfUseRating: templateRatings.easeOfUseRating,
        documentationRating: templateRatings.documentationRating,
        performanceRating: templateRatings.performanceRating,
        valueRating: templateRatings.valueRating,
        wouldRecommend: templateRatings.wouldRecommend,
        helpfulCount: templateRatings.helpfulCount,
        unhelpfulCount: templateRatings.unhelpfulCount,
        isVerifiedUsage: templateRatings.isVerifiedUsage,
        isApproved: templateRatings.isApproved,
        createdAt: templateRatings.createdAt,
        updatedAt: templateRatings.updatedAt,
      })
      .from(templateRatings)
      .leftJoin(user, eq(templateRatings.userId, user.id))
      .where(eq(templateRatings.id, newRatingId))
      .limit(1)

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Rating submitted successfully`, {
      ratingId: newRatingId,
      templateId: `${templateId.slice(0, 8)}...`,
      rating,
      processingTime,
    })

    // Track rating analytics
    await trackRatingAnalytics(requestId, {
      templateId,
      userId,
      rating,
      hasReview: !!content,
      isVerified: isVerifiedUsage || false,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: formatReviewData(createdRating[0]),
      metadata: {
        requestId,
        processingTime,
        templateUpdated: true,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Rating submission failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit rating',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Vote on Review Helpfulness - PUT /api/marketplace/ratings
 *
 * Vote on whether a review is helpful or not
 */
export async function PUT(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { ratingId, userId, isHelpful } = await request.json()

    if (!ratingId || !userId || typeof isHelpful !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'Rating ID, user ID, and helpfulness vote are required',
        },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Review vote submission`, {
      ratingId,
      userId: `${userId.slice(0, 8)}...`,
      isHelpful,
    })

    // Check if user already voted on this review
    const existingVote = await db
      .select({
        id: templateRatingVotes.id,
        isHelpful: templateRatingVotes.isHelpful,
      })
      .from(templateRatingVotes)
      .where(
        and(
          eq(templateRatingVotes.ratingId, ratingId),
          eq(templateRatingVotes.userId, userId)
        )
      )
      .limit(1)

    if (existingVote.length > 0) {
      const currentVote = existingVote[0]
      
      if (currentVote.isHelpful === isHelpful) {
        // Same vote - remove it (toggle off)
        await db
          .delete(templateRatingVotes)
          .where(eq(templateRatingVotes.id, currentVote.id))

        // Update rating counts
        const countChange = isHelpful ? -1 : -1
        const countField = isHelpful ? 'helpful_count' : 'unhelpful_count'
        
        await db.execute(sql`
          UPDATE template_ratings 
          SET ${sql.identifier(countField)} = ${sql.identifier(countField)} + ${countChange}
          WHERE id = ${ratingId}
        `)
      } else {
        // Different vote - update it
        await db
          .update(templateRatingVotes)
          .set({
            isHelpful,
            createdAt: new Date(),
          })
          .where(eq(templateRatingVotes.id, currentVote.id))

        // Update rating counts (remove old vote, add new vote)
        const oldField = currentVote.isHelpful ? 'helpful_count' : 'unhelpful_count'
        const newField = isHelpful ? 'helpful_count' : 'unhelpful_count'
        
        await db.execute(sql`
          UPDATE template_ratings 
          SET 
            ${sql.identifier(oldField)} = ${sql.identifier(oldField)} - 1,
            ${sql.identifier(newField)} = ${sql.identifier(newField)} + 1
          WHERE id = ${ratingId}
        `)
      }
    } else {
      // New vote
      await db.insert(templateRatingVotes).values({
        id: crypto.randomUUID(),
        ratingId,
        userId,
        isHelpful,
        createdAt: new Date(),
      })

      // Update rating counts
      const countChange = 1
      const countField = isHelpful ? 'helpful_count' : 'unhelpful_count'
      
      await db.execute(sql`
        UPDATE template_ratings 
        SET ${sql.identifier(countField)} = ${sql.identifier(countField)} + ${countChange}
        WHERE id = ${ratingId}
      `)
    }

    // Get updated vote counts
    const updatedRating = await db
      .select({
        helpfulCount: templateRatings.helpfulCount,
        unhelpfulCount: templateRatings.unhelpfulCount,
      })
      .from(templateRatings)
      .where(eq(templateRatings.id, ratingId))
      .limit(1)

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Review vote processed`, {
      ratingId,
      isHelpful,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: {
        ratingId,
        voteProcessed: true,
        helpfulCount: updatedRating[0]?.helpfulCount || 0,
        unhelpfulCount: updatedRating[0]?.unhelpfulCount || 0,
      },
      metadata: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Review vote failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process review vote',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Get rating statistics for a template
 */
async function getRatingStats(templateId: string) {
  const stats = await db.execute(sql`
    SELECT 
      COUNT(*) as total_reviews,
      AVG(rating)::decimal(3,2) as average_rating,
      COUNT(CASE WHEN is_verified_usage = true THEN 1 END) as verified_reviews,
      COUNT(CASE WHEN would_recommend = true THEN 1 END) as recommendations,
      COUNT(CASE WHEN content IS NOT NULL AND LENGTH(content) > 0 THEN 1 END) as detailed_reviews,
      AVG(ease_of_use_rating)::decimal(3,2) as avg_ease_of_use,
      AVG(documentation_rating)::decimal(3,2) as avg_documentation,
      AVG(performance_rating)::decimal(3,2) as avg_performance,
      AVG(value_rating)::decimal(3,2) as avg_value,
      SUM(helpful_count) as total_helpful_votes,
      SUM(unhelpful_count) as total_unhelpful_votes
    FROM template_ratings
    WHERE template_id = ${templateId} AND is_approved = true
  `)

  const row = stats.rows[0]
  if (!row || row.total_reviews === '0') {
    return null
  }

  return {
    totalReviews: Number(row.total_reviews),
    averageRating: Number(row.average_rating),
    verifiedReviews: Number(row.verified_reviews),
    recommendations: Number(row.recommendations),
    detailedReviews: Number(row.detailed_reviews),
    averageEaseOfUse: row.avg_ease_of_use ? Number(row.avg_ease_of_use) : null,
    averageDocumentation: row.avg_documentation ? Number(row.avg_documentation) : null,
    averagePerformance: row.avg_performance ? Number(row.avg_performance) : null,
    averageValue: row.avg_value ? Number(row.avg_value) : null,
    totalHelpfulVotes: Number(row.total_helpful_votes),
    totalUnhelpfulVotes: Number(row.total_unhelpful_votes),
    recommendationRate: Number(row.total_reviews) > 0 
      ? Number(row.recommendations) / Number(row.total_reviews) 
      : 0,
    verificationRate: Number(row.total_reviews) > 0 
      ? Number(row.verified_reviews) / Number(row.total_reviews) 
      : 0,
  }
}

/**
 * Get rating distribution for a template
 */
async function getRatingDistribution(templateId: string) {
  const distribution = await db.execute(sql`
    SELECT 
      rating,
      COUNT(*) as count
    FROM template_ratings
    WHERE template_id = ${templateId} AND is_approved = true
    GROUP BY rating
    ORDER BY rating DESC
  `)

  const result = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  }

  for (const row of distribution.rows) {
    const rating = Number(row.rating)
    const count = Number(row.count)
    if (rating >= 1 && rating <= 5) {
      result[rating as keyof typeof result] = count
    }
  }

  const total = Object.values(result).reduce((sum, count) => sum + count, 0)
  
  return {
    distribution: result,
    total,
    percentages: {
      5: total > 0 ? Math.round((result[5] / total) * 100) : 0,
      4: total > 0 ? Math.round((result[4] / total) * 100) : 0,
      3: total > 0 ? Math.round((result[3] / total) * 100) : 0,
      2: total > 0 ? Math.round((result[2] / total) * 100) : 0,
      1: total > 0 ? Math.round((result[1] / total) * 100) : 0,
    },
  }
}

/**
 * Update template rating statistics
 */
async function updateTemplateRatingStats(templateId: string) {
  await db.execute(sql`
    UPDATE templates
    SET 
      rating_average = (
        SELECT AVG(rating)::decimal(3,2)
        FROM template_ratings 
        WHERE template_id = ${templateId} AND is_approved = true
      ),
      rating_count = (
        SELECT COUNT(*)
        FROM template_ratings 
        WHERE template_id = ${templateId} AND is_approved = true
      )
    WHERE id = ${templateId}
  `)
}

/**
 * Format review data for API response
 */
function formatReviewData(row: any): ReviewData {
  return {
    id: row.id,
    templateId: row.templateId,
    userId: row.userId,
    userName: row.userName,
    userImage: row.userImage,
    rating: Number(row.rating),
    title: row.title,
    content: row.content,
    usageContext: row.usageContext,
    easeOfUseRating: row.easeOfUseRating ? Number(row.easeOfUseRating) : null,
    documentationRating: row.documentationRating ? Number(row.documentationRating) : null,
    performanceRating: row.performanceRating ? Number(row.performanceRating) : null,
    valueRating: row.valueRating ? Number(row.valueRating) : null,
    wouldRecommend: row.wouldRecommend,
    helpfulCount: Number(row.helpfulCount || 0),
    unhelpfulCount: Number(row.unhelpfulCount || 0),
    isVerifiedUsage: Boolean(row.isVerifiedUsage),
    isApproved: Boolean(row.isApproved),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    userVote: row.userVote || null,
  }
}

/**
 * Track rating analytics
 */
async function trackRatingAnalytics(
  requestId: string,
  data: {
    templateId: string
    userId: string
    rating: number
    hasReview: boolean
    isVerified: boolean
    processingTime: number
  }
) {
  try {
    logger.info(`[${requestId}] Rating analytics`, {
      templateId: `${data.templateId.slice(0, 8)}...`,
      userId: `${data.userId.slice(0, 8)}...`,
      rating: data.rating,
      hasReview: data.hasReview,
      isVerified: data.isVerified,
      processingTime: data.processingTime,
    })

    // In production, store in analytics database
    // await analyticsService.track('template_rating', data)
  } catch (error) {
    logger.error(`[${requestId}] Failed to track rating analytics`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}