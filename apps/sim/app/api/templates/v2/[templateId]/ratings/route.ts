/**
 * Template Ratings API v2 - Comprehensive rating and review system
 * 
 * Features:
 * - 5-star rating system with detailed feedback
 * - Multi-dimensional rating (ease of use, documentation, performance, value)
 * - Community-driven review quality through helpful/unhelpful voting
 * - Verified usage tracking
 * - Moderation and quality control
 * - Advanced analytics for template improvement
 * 
 * @version 2.0.0
 * @author Sim Template Library Team  
 * @created 2025-09-04
 */

import { and, avg, count, desc, eq, gte, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import {
  templates,
  templateRatings,
  templateRatingVotes,
  user,
} from '@/db/schema'

const logger = createLogger('TemplateRatingsAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const RatingQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(10),

  // Filtering
  rating: z.coerce.number().min(1).max(5).optional(), // Filter by specific rating
  minRating: z.coerce.number().min(1).max(5).optional(), // Minimum rating
  verified: z.coerce.boolean().optional(), // Verified usage only
  featured: z.coerce.boolean().optional(), // Featured reviews only
  userExpertise: z.enum(['beginner', 'intermediate', 'advanced']).optional(),

  // Sorting
  sortBy: z.enum(['rating', 'helpful', 'created', 'updated']).optional().default('helpful'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),

  // Response options
  includeVotes: z.coerce.boolean().optional().default(false),
  includeAuthor: z.coerce.boolean().optional().default(true),
})

const CreateRatingSchema = z.object({
  // Core rating (required)
  rating: z.number().int().min(1).max(5),
  
  // Review content (optional)
  reviewTitle: z.string().max(200).optional(),
  reviewContent: z.string().max(2000).optional(),
  
  // Context information
  usageContext: z.string().max(500).optional(),
  userExpertiseLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
  
  // Multi-dimensional ratings (optional)
  easeOfUseRating: z.number().int().min(1).max(5).optional(),
  documentationRating: z.number().int().min(1).max(5).optional(),
  performanceRating: z.number().int().min(1).max(5).optional(),
  valueRating: z.number().int().min(1).max(5).optional(),
  
  // Usage verification
  isVerifiedUsage: z.boolean().optional().default(false),
})

const VoteSchema = z.object({
  isHelpful: z.boolean(),
})

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Update template rating aggregates after rating changes
 */
async function updateTemplateRatingAggregates(templateId: string) {
  try {
    // Calculate new aggregates
    const aggregates = await db
      .select({
        avgRating: avg(templateRatings.rating),
        ratingCount: count(templateRatings.id),
      })
      .from(templateRatings)
      .where(
        and(
          eq(templateRatings.templateId, templateId),
          eq(templateRatings.isApproved, true)
        )
      )

    const avgRating = aggregates[0]?.avgRating || 0
    const ratingCount = aggregates[0]?.ratingCount || 0

    // Update template
    await db
      .update(templates)
      .set({
        ratingAverage: Math.round(Number(avgRating) * 100) / 100,
        ratingCount: Number(ratingCount),
        updatedAt: new Date(),
      })
      .where(eq(templates.id, templateId))

  } catch (error) {
    logger.warn('Failed to update template rating aggregates', { templateId, error })
  }
}

/**
 * Calculate community score for a template based on ratings and engagement
 */
async function calculateCommunityScore(templateId: string): Promise<number> {
  try {
    const stats = await db
      .select({
        avgRating: avg(templateRatings.rating),
        totalRatings: count(templateRatings.id),
        verifiedRatings: sql<number>`count(*) filter (where ${templateRatings.isVerifiedUsage} = true)`,
        avgHelpfulVotes: avg(templateRatings.helpfulCount),
        detailedReviews: sql<number>`count(*) filter (where length(${templateRatings.reviewContent}) > 100)`,
      })
      .from(templateRatings)
      .where(
        and(
          eq(templateRatings.templateId, templateId),
          eq(templateRatings.isApproved, true)
        )
      )

    const {
      avgRating = 0,
      totalRatings = 0,
      verifiedRatings = 0,
      avgHelpfulVotes = 0,
      detailedReviews = 0,
    } = stats[0] || {}

    // Calculate community score (0-100)
    const ratingScore = Number(avgRating) * 15 // Max 75 points
    const volumeScore = Math.min(Number(totalRatings) / 2, 10) // Max 10 points
    const verificationScore = (Number(verifiedRatings) / Math.max(Number(totalRatings), 1)) * 5 // Max 5 points
    const engagementScore = Math.min(Number(avgHelpfulVotes) / 2, 5) // Max 5 points
    const qualityScore = (Number(detailedReviews) / Math.max(Number(totalRatings), 1)) * 5 // Max 5 points

    const communityScore = Math.round(ratingScore + volumeScore + verificationScore + engagementScore + qualityScore)

    // Update template with new community score
    await db
      .update(templates)
      .set({
        communityScore,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, templateId))

    return communityScore

  } catch (error) {
    logger.warn('Failed to calculate community score', { templateId, error })
    return 0
  }
}

// ========================
// API ENDPOINTS
// ========================

/**
 * GET /api/templates/v2/[templateId]/ratings - Get template ratings and reviews
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { templateId } = params
    const { searchParams } = new URL(request.url)
    const queryParams = RatingQuerySchema.parse(Object.fromEntries(searchParams.entries()))

    logger.info(`[${requestId}] Fetching ratings for template: ${templateId}`)

    // Verify template exists
    const templateExists = await db
      .select({ id: templates.id })
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1)

    if (templateExists.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    // Get current user for personalized data
    const session = await getSession()
    const userId = session?.user?.id

    // Build query conditions
    const conditions = [
      eq(templateRatings.templateId, templateId),
      eq(templateRatings.isApproved, true),
    ]

    if (queryParams.rating !== undefined) {
      conditions.push(eq(templateRatings.rating, queryParams.rating))
    }

    if (queryParams.minRating !== undefined) {
      conditions.push(gte(templateRatings.rating, queryParams.minRating))
    }

    if (queryParams.verified !== undefined) {
      conditions.push(eq(templateRatings.isVerifiedUsage, queryParams.verified))
    }

    if (queryParams.featured !== undefined) {
      conditions.push(eq(templateRatings.isFeatured, queryParams.featured))
    }

    if (queryParams.userExpertise) {
      conditions.push(eq(templateRatings.userExpertiseLevel, queryParams.userExpertise))
    }

    // Build sorting
    const getSortField = () => {
      switch (queryParams.sortBy) {
        case 'rating':
          return templateRatings.rating
        case 'helpful':
          return templateRatings.helpfulCount
        case 'created':
          return templateRatings.createdAt
        case 'updated':
          return templateRatings.updatedAt
        default:
          return templateRatings.helpfulCount
      }
    }

    const sortField = getSortField()
    const orderBy = queryParams.sortOrder === 'asc' ? sql`${sortField} ASC` : desc(sortField)

    // Calculate pagination
    const offset = (queryParams.page - 1) * queryParams.limit

    // Execute main query
    let query = db
      .select({
        id: templateRatings.id,
        rating: templateRatings.rating,
        reviewTitle: templateRatings.reviewTitle,
        reviewContent: templateRatings.reviewContent,
        usageContext: templateRatings.usageContext,
        userExpertiseLevel: templateRatings.userExpertiseLevel,
        
        // Multi-dimensional ratings
        easeOfUseRating: templateRatings.easeOfUseRating,
        documentationRating: templateRatings.documentationRating,
        performanceRating: templateRatings.performanceRating,
        valueRating: templateRatings.valueRating,
        
        // Engagement metrics
        helpfulCount: templateRatings.helpfulCount,
        unhelpfulCount: templateRatings.unhelpfulCount,
        isVerifiedUsage: templateRatings.isVerifiedUsage,
        isFeatured: templateRatings.isFeatured,
        
        // Timestamps
        createdAt: templateRatings.createdAt,
        updatedAt: templateRatings.updatedAt,
        
        // Author info (if requested)
        ...(queryParams.includeAuthor ? {
          authorId: templateRatings.userId,
          authorName: user.name,
          authorImage: user.image,
        } : {}),
        
        // User's vote on this rating (if authenticated)
        ...(userId ? {
          userVote: templateRatingVotes.isHelpful,
        } : {}),
      })
      .from(templateRatings)

    // Add joins based on requested data
    if (queryParams.includeAuthor) {
      query = query.leftJoin(user, eq(templateRatings.userId, user.id))
    }

    if (userId) {
      query = query.leftJoin(
        templateRatingVotes,
        and(
          eq(templateRatingVotes.ratingId, templateRatings.id),
          eq(templateRatingVotes.userId, userId)
        )
      )
    }

    const results = await query
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(queryParams.limit)
      .offset(offset)

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(templateRatings)
      .where(and(...conditions))

    const total = totalCount[0]?.count || 0

    // Get rating distribution
    const ratingDistribution = await db
      .select({
        rating: templateRatings.rating,
        count: sql<number>`count(*)`,
      })
      .from(templateRatings)
      .where(
        and(
          eq(templateRatings.templateId, templateId),
          eq(templateRatings.isApproved, true)
        )
      )
      .groupBy(templateRatings.rating)
      .orderBy(templateRatings.rating)

    // Get overall statistics
    const overallStats = await db
      .select({
        totalRatings: count(templateRatings.id),
        averageRating: avg(templateRatings.rating),
        verifiedCount: sql<number>`count(*) filter (where ${templateRatings.isVerifiedUsage} = true)`,
        averageEaseOfUse: avg(templateRatings.easeOfUseRating),
        averageDocumentation: avg(templateRatings.documentationRating),
        averagePerformance: avg(templateRatings.performanceRating),
        averageValue: avg(templateRatings.valueRating),
      })
      .from(templateRatings)
      .where(
        and(
          eq(templateRatings.templateId, templateId),
          eq(templateRatings.isApproved, true)
        )
      )

    const stats = overallStats[0] || {}

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / queryParams.limit)
    const hasNextPage = queryParams.page < totalPages
    const hasPrevPage = queryParams.page > 1

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Fetched ${results.length} ratings in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        page: queryParams.page,
        limit: queryParams.limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      statistics: {
        totalRatings: Number(stats.totalRatings) || 0,
        averageRating: Math.round((Number(stats.averageRating) || 0) * 10) / 10,
        verifiedCount: Number(stats.verifiedCount) || 0,
        verificationRate: Number(stats.totalRatings) ? Math.round((Number(stats.verifiedCount) / Number(stats.totalRatings)) * 100) : 0,
        dimensionalAverages: {
          easeOfUse: Math.round((Number(stats.averageEaseOfUse) || 0) * 10) / 10,
          documentation: Math.round((Number(stats.averageDocumentation) || 0) * 10) / 10,
          performance: Math.round((Number(stats.averagePerformance) || 0) * 10) / 10,
          value: Math.round((Number(stats.averageValue) || 0) * 10) / 10,
        },
        distribution: ratingDistribution.map(d => ({
          rating: d.rating,
          count: Number(d.count),
          percentage: Math.round((Number(d.count) / Number(stats.totalRatings || 1)) * 100),
        })),
      },
      meta: {
        requestId,
        processingTime: elapsed,
        authenticated: !!userId,
        templateId,
      },
    })

  } catch (error: any) {
    const elapsed = Date.now() - startTime
    
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid query parameters:`, error.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Ratings fetch error after ${elapsed}ms:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates/v2/[templateId]/ratings - Create or update template rating
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { templateId } = params
    const session = await getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await request.json()
    const data = CreateRatingSchema.parse(body)

    logger.info(`[${requestId}] Creating/updating rating for template: ${templateId}`)

    // Verify template exists and is accessible
    const templateData = await db
      .select({
        id: templates.id,
        name: templates.name,
        status: templates.status,
        visibility: templates.visibility,
      })
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1)

    if (templateData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    const template = templateData[0]

    // Check if template is rateable
    if (template.status !== 'approved' || template.visibility === 'private') {
      return NextResponse.json(
        { success: false, error: 'Template cannot be rated' },
        { status: 400 }
      )
    }

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

    const now = new Date()

    if (existingRating.length > 0) {
      // Update existing rating
      const updatedRating = await db
        .update(templateRatings)
        .set({
          rating: data.rating,
          reviewTitle: data.reviewTitle,
          reviewContent: data.reviewContent,
          usageContext: data.usageContext,
          userExpertiseLevel: data.userExpertiseLevel,
          easeOfUseRating: data.easeOfUseRating,
          documentationRating: data.documentationRating,
          performanceRating: data.performanceRating,
          valueRating: data.valueRating,
          isVerifiedUsage: data.isVerifiedUsage,
          updatedAt: now,
        })
        .where(eq(templateRatings.id, existingRating[0].id))
        .returning()

      logger.info(`[${requestId}] Updated existing rating: ${existingRating[0].id}`)

    } else {
      // Create new rating
      const ratingId = uuidv4()
      
      const newRating = await db.insert(templateRatings).values({
        id: ratingId,
        templateId,
        userId,
        rating: data.rating,
        reviewTitle: data.reviewTitle,
        reviewContent: data.reviewContent,
        usageContext: data.usageContext,
        userExpertiseLevel: data.userExpertiseLevel,
        easeOfUseRating: data.easeOfUseRating,
        documentationRating: data.documentationRating,
        performanceRating: data.performanceRating,
        valueRating: data.valueRating,
        isVerifiedUsage: data.isVerifiedUsage,
        createdAt: now,
        updatedAt: now,
      }).returning()

      logger.info(`[${requestId}] Created new rating: ${ratingId}`)
    }

    // Update template rating aggregates
    await updateTemplateRatingAggregates(templateId)

    // Calculate new community score
    const communityScore = await calculateCommunityScore(templateId)

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Rating processed in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        rating: data.rating,
        isUpdate: existingRating.length > 0,
        communityScore,
        message: existingRating.length > 0 ? 'Rating updated successfully' : 'Rating created successfully',
      },
      meta: {
        requestId,
        processingTime: elapsed,
      },
    })

  } catch (error: any) {
    const elapsed = Date.now() - startTime
    
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid rating data:`, error.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid rating data',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Rating creation error after ${elapsed}ms:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        requestId,
      },
      { status: 500 }
    )
  }
}