/**
 * Template Rating Votes API v2 - Community-driven review quality system
 *
 * Features:
 * - Helpful/unhelpful voting on template reviews
 * - Community-driven review quality assessment
 * - Voting analytics and engagement tracking
 * - Anti-gaming measures and vote validation
 * - Reviewer reputation system integration
 *
 * @version 2.0.0
 * @author Sim Template Library Team
 * @created 2025-09-04
 */

import { and, eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import {
  templateRatings,
  templateRatingVotes,
  templates,
  templateUsageAnalytics,
} from '@/db/schema'

const logger = createLogger('TemplateRatingVotesAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const VoteSchema = z.object({
  isHelpful: z.boolean(),
  reason: z.string().max(200).optional(), // Optional reason for the vote
})

const VoteQuerySchema = z.object({
  includeReason: z.coerce.boolean().optional().default(false),
  includeVoter: z.coerce.boolean().optional().default(false), // For moderation purposes
})

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Update rating vote counts
 */
async function updateRatingVoteCounts(ratingId: string) {
  try {
    const voteCounts = await db
      .select({
        helpfulCount: sql<number>`count(*) filter (where ${templateRatingVotes.isHelpful} = true)`,
        unhelpfulCount: sql<number>`count(*) filter (where ${templateRatingVotes.isHelpful} = false)`,
      })
      .from(templateRatingVotes)
      .where(eq(templateRatingVotes.ratingId, ratingId))

    const counts = voteCounts[0] || { helpfulCount: 0, unhelpfulCount: 0 }

    await db
      .update(templateRatings)
      .set({
        helpfulCount: Number(counts.helpfulCount),
        unhelpfulCount: Number(counts.unhelpfulCount),
        updatedAt: new Date(),
      })
      .where(eq(templateRatings.id, ratingId))
  } catch (error) {
    logger.warn('Failed to update rating vote counts', { ratingId, error })
  }
}

/**
 * Calculate review helpfulness score
 */
function calculateHelpfulnessScore(helpfulCount: number, unhelpfulCount: number): number {
  const totalVotes = helpfulCount + unhelpfulCount
  if (totalVotes === 0) return 0

  // Wilson score confidence interval for positive feedback
  const p = helpfulCount / totalVotes
  const n = totalVotes
  const z = 1.96 // 95% confidence interval

  const denominator = 1 + (z * z) / n
  const numerator = p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)

  return Math.max(0, numerator / denominator) * 100
}

/**
 * Record voting analytics
 */
async function recordVotingAnalytics(
  templateId: string,
  ratingId: string,
  eventType: string,
  userId: string,
  context: Record<string, any> = {}
) {
  try {
    await db.insert(templateUsageAnalytics).values({
      id: crypto.randomUUID(),
      templateId,
      userId,
      eventType,
      eventContext: {
        ratingId,
        ...context,
      },
      usageTimestamp: new Date(),
      createdAt: new Date(),
    })
  } catch (error) {
    logger.warn('Failed to record voting analytics', { templateId, ratingId, eventType, error })
  }
}

// ========================
// API ENDPOINTS
// ========================

/**
 * GET /api/templates/v2/[templateId]/ratings/[ratingId]/vote - Get current user's vote on rating
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string; ratingId: string } }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { templateId, ratingId } = params
    const { searchParams } = new URL(request.url)
    const queryParams = VoteQuerySchema.parse(Object.fromEntries(searchParams.entries()))

    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    logger.info(`[${requestId}] Checking vote for rating: ${ratingId}`)

    // Verify template and rating exist
    const ratingData = await db
      .select({
        ratingId: templateRatings.id,
        templateId: templateRatings.templateId,
        ratingUserId: templateRatings.userId,
        helpfulCount: templateRatings.helpfulCount,
        unhelpfulCount: templateRatings.unhelpfulCount,
        isApproved: templateRatings.isApproved,
      })
      .from(templateRatings)
      .innerJoin(templates, eq(templateRatings.templateId, templates.id))
      .where(and(eq(templateRatings.id, ratingId), eq(templates.id, templateId)))
      .limit(1)

    if (ratingData.length === 0) {
      return NextResponse.json({ success: false, error: 'Rating not found' }, { status: 404 })
    }

    const rating = ratingData[0]

    // Check if rating is approved and public
    if (!rating.isApproved) {
      return NextResponse.json(
        { success: false, error: 'Rating not available for voting' },
        { status: 400 }
      )
    }

    // Check if user is trying to vote on their own rating
    if (rating.ratingUserId === userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot vote on your own rating' },
        { status: 400 }
      )
    }

    // Get user's current vote
    const userVote = await db
      .select({
        isHelpful: templateRatingVotes.isHelpful,
        createdAt: templateRatingVotes.createdAt,
      })
      .from(templateRatingVotes)
      .where(
        and(eq(templateRatingVotes.ratingId, ratingId), eq(templateRatingVotes.userId, userId))
      )
      .limit(1)

    const hasVoted = userVote.length > 0
    const voteData = userVote[0] || null

    // Calculate helpfulness score
    const helpfulnessScore = calculateHelpfulnessScore(rating.helpfulCount, rating.unhelpfulCount)

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Vote status retrieved in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        ratingId,
        hasVoted,
        userVote: voteData,
        votingStats: {
          helpfulCount: rating.helpfulCount,
          unhelpfulCount: rating.unhelpfulCount,
          totalVotes: rating.helpfulCount + rating.unhelpfulCount,
          helpfulnessScore: Math.round(helpfulnessScore),
        },
      },
      meta: {
        requestId,
        processingTime: elapsed,
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

    logger.error(`[${requestId}] Vote check error after ${elapsed}ms:`, error)
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
 * POST /api/templates/v2/[templateId]/ratings/[ratingId]/vote - Vote on rating helpfulness
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string; ratingId: string } }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { templateId, ratingId } = params
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await request.json()
    const data = VoteSchema.parse(body)

    logger.info(`[${requestId}] Voting on rating: ${ratingId}, helpful: ${data.isHelpful}`)

    // Verify template and rating exist
    const ratingData = await db
      .select({
        ratingId: templateRatings.id,
        templateId: templateRatings.templateId,
        ratingUserId: templateRatings.userId,
        isApproved: templateRatings.isApproved,
        reviewContent: templateRatings.reviewContent,
      })
      .from(templateRatings)
      .innerJoin(templates, eq(templateRatings.templateId, templates.id))
      .where(and(eq(templateRatings.id, ratingId), eq(templates.id, templateId)))
      .limit(1)

    if (ratingData.length === 0) {
      return NextResponse.json({ success: false, error: 'Rating not found' }, { status: 404 })
    }

    const rating = ratingData[0]

    // Validation checks
    if (!rating.isApproved) {
      return NextResponse.json(
        { success: false, error: 'Rating not available for voting' },
        { status: 400 }
      )
    }

    if (rating.ratingUserId === userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot vote on your own rating' },
        { status: 400 }
      )
    }

    // Check if user already voted
    const existingVote = await db
      .select({
        isHelpful: templateRatingVotes.isHelpful,
        createdAt: templateRatingVotes.createdAt,
      })
      .from(templateRatingVotes)
      .where(
        and(eq(templateRatingVotes.ratingId, ratingId), eq(templateRatingVotes.userId, userId))
      )
      .limit(1)

    const now = new Date()
    let voteAction = 'create'
    let previousVote: boolean | null = null

    if (existingVote.length > 0) {
      previousVote = existingVote[0].isHelpful

      // If same vote, remove it (toggle behavior)
      if (previousVote === data.isHelpful) {
        await db
          .delete(templateRatingVotes)
          .where(
            and(eq(templateRatingVotes.ratingId, ratingId), eq(templateRatingVotes.userId, userId))
          )

        voteAction = 'remove'

        // Record analytics
        await recordVotingAnalytics(templateId, ratingId, 'vote_removed', userId, {
          previousVote,
          hadReason: !!data.reason,
        })
      } else {
        // Update existing vote
        await db
          .update(templateRatingVotes)
          .set({
            isHelpful: data.isHelpful,
            createdAt: now,
          })
          .where(
            and(eq(templateRatingVotes.ratingId, ratingId), eq(templateRatingVotes.userId, userId))
          )

        voteAction = 'update'

        // Record analytics
        await recordVotingAnalytics(templateId, ratingId, 'vote_changed', userId, {
          previousVote,
          newVote: data.isHelpful,
          hadReason: !!data.reason,
        })
      }
    } else {
      // Create new vote
      await db.insert(templateRatingVotes).values({
        ratingId,
        userId,
        isHelpful: data.isHelpful,
        createdAt: now,
      })

      voteAction = 'create'

      // Record analytics
      await recordVotingAnalytics(templateId, ratingId, 'vote_cast', userId, {
        voteType: data.isHelpful ? 'helpful' : 'unhelpful',
        hadReason: !!data.reason,
        hasReviewContent: !!rating.reviewContent,
      })
    }

    // Update rating vote counts
    await updateRatingVoteCounts(ratingId)

    // Get updated counts for response
    const updatedRating = await db
      .select({
        helpfulCount: templateRatings.helpfulCount,
        unhelpfulCount: templateRatings.unhelpfulCount,
      })
      .from(templateRatings)
      .where(eq(templateRatings.id, ratingId))
      .limit(1)

    const updatedCounts = updatedRating[0] || { helpfulCount: 0, unhelpfulCount: 0 }
    const helpfulnessScore = calculateHelpfulnessScore(
      updatedCounts.helpfulCount,
      updatedCounts.unhelpfulCount
    )

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Vote ${voteAction} completed in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        ratingId,
        voteAction,
        currentVote: voteAction === 'remove' ? null : data.isHelpful,
        previousVote,
        votingStats: {
          helpfulCount: updatedCounts.helpfulCount,
          unhelpfulCount: updatedCounts.unhelpfulCount,
          totalVotes: updatedCounts.helpfulCount + updatedCounts.unhelpfulCount,
          helpfulnessScore: Math.round(helpfulnessScore),
        },
        message:
          voteAction === 'create'
            ? 'Vote cast successfully'
            : voteAction === 'update'
              ? 'Vote updated successfully'
              : 'Vote removed successfully',
      },
      meta: {
        requestId,
        processingTime: elapsed,
      },
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid vote data:`, error.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid vote data',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Vote submission error after ${elapsed}ms:`, error)
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
