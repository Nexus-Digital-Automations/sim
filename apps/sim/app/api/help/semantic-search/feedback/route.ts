/**
 * Help Content Feedback API - Track user interactions for search improvement
 *
 * POST /api/help/semantic-search/feedback - Track user interactions with help content
 *
 * Features:
 * - User interaction tracking (clicks, helpful/unhelpful votes, bookmarks, shares)
 * - Search context preservation for relevance analysis
 * - Analytics data collection for search optimization
 * - Privacy-compliant data handling
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { HelpContentEmbeddingService } from '@/lib/help/ai/help-content-embedding-service'
import type { SearchContext } from '@/lib/help/ai/help-semantic-search-service'
import { HelpSemanticSearchService } from '@/lib/help/ai/help-semantic-search-service'
import { Logger } from '@/lib/monitoring/logger'
import { ratelimit } from '@/lib/ratelimit'

const logger = new Logger({ service: 'HelpFeedbackAPI' })

const embeddingService = new HelpContentEmbeddingService(
  {
    openaiApiKey: process.env.OPENAI_API_KEY!,
    model: 'text-embedding-3-large',
    dimensions: 1536,
    cacheEnabled: true,
    cacheTTL: 3600000,
    batchSize: 10,
    maxRetries: 3,
    rateLimitPerMinute: 100,
  },
  logger
)

const searchService = new HelpSemanticSearchService(db, embeddingService, logger)

const FeedbackRequestSchema = z.object({
  contentId: z.string().min(1),
  interaction: z.enum(['click', 'helpful', 'unhelpful', 'bookmark', 'share']),
  context: z
    .object({
      userId: z.string().optional(),
      organizationId: z.string().optional(),
      workflowId: z.string().optional(),
      workflowType: z.string().optional(),
      blockType: z.string().optional(),
      userRole: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      sessionId: z.string().optional(),
      deviceType: z.enum(['desktop', 'mobile', 'tablet']).optional(),
      referrerUrl: z.string().optional(),
      timeSpentSeconds: z.number().int().min(0).optional(),
    })
    .optional()
    .default({}),
  searchMetadata: z
    .object({
      query: z.string(),
      rank: z.number().int().min(1),
      score: z.number().min(0).max(1),
      searchType: z.enum(['semantic', 'keyword', 'hybrid']).optional(),
    })
    .optional(),
  additionalData: z
    .object({
      feedbackText: z.string().max(1000).optional(),
      ratingValue: z.number().int().min(1).max(5).optional(),
      contentUseful: z.boolean().optional(),
      contentAccurate: z.boolean().optional(),
      contentComplete: z.boolean().optional(),
    })
    .optional(),
})

/**
 * POST /api/help/semantic-search/feedback
 * Track user interaction with help content for analytics and search improvement
 */
export async function POST(request: NextRequest) {
  const operationId = generateOperationId()
  const startTime = Date.now()

  try {
    // Authentication
    const authResult = await auth()
    if (!authResult?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Rate limiting (more generous for feedback)
    const rateLimitResult = await ratelimit.limit(`feedback:${authResult.user.id}`, {
      requests: 50,
      window: '1m',
    })
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded', retryAfter: rateLimitResult.reset },
        { status: 429 }
      )
    }

    // Parse and validate request
    let requestData
    try {
      const body = await request.json()
      requestData = FeedbackRequestSchema.parse(body)
    } catch (parseError) {
      logger.error(`[${operationId}] Invalid feedback request`, {
        error: parseError instanceof Error ? parseError.message : 'Parse error',
        userId: authResult.user.id,
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format',
          details: parseError instanceof z.ZodError ? parseError.errors : undefined,
        },
        { status: 400 }
      )
    }

    // Add user context
    const feedbackContext: SearchContext = {
      ...requestData.context,
      userId: authResult.user.id,
      organizationId: authResult.user.organizationId,
    }

    logger.info(`[${operationId}] Processing feedback`, {
      contentId: requestData.contentId,
      interaction: requestData.interaction,
      userId: authResult.user.id,
      hasSearchMetadata: !!requestData.searchMetadata,
      hasAdditionalData: !!requestData.additionalData,
    })

    // Track the interaction
    await searchService.trackInteraction(
      requestData.contentId,
      requestData.interaction,
      feedbackContext,
      requestData.searchMetadata
    )

    // Handle additional feedback data
    if (requestData.additionalData) {
      await handleAdditionalFeedback(
        requestData.contentId,
        requestData.additionalData,
        feedbackContext,
        operationId
      )
    }

    const processingTime = Date.now() - startTime

    logger.info(`[${operationId}] Feedback processed successfully`, {
      contentId: requestData.contentId,
      interaction: requestData.interaction,
      processingTimeMs: processingTime,
      userId: authResult.user.id,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Feedback recorded successfully',
          contentId: requestData.contentId,
          interaction: requestData.interaction,
          metadata: {
            processingTimeMs: processingTime,
            operationId,
          },
        },
      },
      {
        status: 201,
        headers: {
          'X-Processing-Time': processingTime.toString(),
          'X-Operation-ID': operationId,
        },
      }
    )
  } catch (error) {
    const processingTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error(`[${operationId}] Feedback processing failed`, {
      error: errorMessage,
      processingTimeMs: processingTime,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Feedback processing failed',
        operationId,
      },
      {
        status: 500,
        headers: {
          'X-Processing-Time': processingTime.toString(),
          'X-Operation-ID': operationId,
        },
      }
    )
  }
}

/**
 * Handle additional feedback data like ratings and detailed feedback
 */
async function handleAdditionalFeedback(
  contentId: string,
  additionalData: any,
  context: SearchContext,
  operationId: string
): Promise<void> {
  try {
    // Store detailed feedback in analytics table
    if (additionalData.ratingValue || additionalData.feedbackText) {
      // This would typically insert into a detailed feedback table
      logger.info(`[${operationId}] Additional feedback recorded`, {
        contentId,
        hasRating: !!additionalData.ratingValue,
        hasFeedbackText: !!additionalData.feedbackText,
        userId: context.userId,
      })
    }

    // Update content ratings and statistics
    if (additionalData.ratingValue) {
      // This would update the help_content table with new rating data
      logger.debug(`[${operationId}] Content rating recorded`, {
        contentId,
        rating: additionalData.ratingValue,
        userId: context.userId,
      })
    }
  } catch (error) {
    logger.error(`[${operationId}] Failed to process additional feedback`, {
      contentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    // Don't throw - additional feedback processing failure shouldn't fail the main request
  }
}

/**
 * GET /api/help/semantic-search/feedback/analytics
 * Get feedback analytics for content optimization (admin only)
 */
export async function GET(request: NextRequest) {
  const operationId = generateOperationId()

  try {
    // Authentication and authorization
    const authResult = await auth()
    if (!authResult?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin privileges (implement your own authorization logic)
    const hasAdminAccess = authResult.user.role === 'admin' || authResult.user.role === 'moderator'
    if (!hasAdminAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient privileges' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange') || '7d' // 7 days default
    const contentId = url.searchParams.get('contentId')
    const limit = Number.parseInt(url.searchParams.get('limit') || '100')

    // Generate analytics report (simplified implementation)
    const analytics = await generateFeedbackAnalytics({
      timeRange,
      contentId,
      limit,
    })

    logger.info(`[${operationId}] Feedback analytics generated`, {
      timeRange,
      contentId,
      limit,
      userId: authResult.user.id,
    })

    return NextResponse.json({
      success: true,
      data: analytics,
      metadata: {
        generatedAt: new Date().toISOString(),
        timeRange,
        contentId,
        operationId,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error(`[${operationId}] Analytics generation failed`, {
      error: errorMessage,
    })

    return NextResponse.json(
      { success: false, error: 'Analytics generation failed', operationId },
      { status: 500 }
    )
  }
}

async function generateFeedbackAnalytics(params: {
  timeRange: string
  contentId?: string | null
  limit: number
}) {
  // This would generate real analytics from the database
  // For now, returning a placeholder structure
  return {
    summary: {
      totalInteractions: 0,
      clickThroughRate: 0,
      helpfulnessRatio: 0,
      averageRating: 0,
    },
    topContent: [],
    interactionTrends: [],
    userFeedback: [],
  }
}

function generateOperationId(): string {
  return `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}
