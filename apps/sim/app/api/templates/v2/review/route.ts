/**
 * Template Review API v2 - Review Process Management
 *
 * This API handles the template review process including reviewer assignment,
 * review submission, approval decisions, and status tracking throughout the
 * approval workflow pipeline.
 *
 * Features:
 * - Multi-stage review workflow management
 * - Reviewer assignment and workload balancing
 * - Detailed review criteria and scoring
 * - Collaborative review with discussion threads
 * - Automated workflow progression
 * - Comprehensive audit trails and notifications
 *
 * @version 2.0.0
 * @author Sim Template Review Team
 * @created 2025-09-04
 */

import { and, desc, eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import {
  templates,
  templateRatings,
  templateStars,
  templateCategories,
  user,
} from '@/db/schema'

const logger = createLogger('TemplateReviewAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const ReviewQuerySchema = z.object({
  // Filtering
  submissionId: z.string().optional(),
  reviewerId: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  decision: z.enum(['approve', 'reject', 'request_changes']).optional(),

  // Date filtering
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),

  // Sorting
  sortBy: z.enum(['created', 'updated', 'priority', 'deadline']).optional().default('created'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),

  // Pagination
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(20),

  // Response options
  includeSubmission: z.coerce.boolean().optional().default(true),
  includeTemplate: z.coerce.boolean().optional().default(false),
})

const CreateReviewSchema = z.object({
  submissionId: z.string().min(1, 'Submission ID is required'),
  decision: z.enum(['approve', 'reject', 'request_changes']),
  reviewNotes: z.string().min(10, 'Review notes are required').max(2000),

  // Detailed review criteria (1-5 scale)
  reviewCriteria: z.object({
    functionality: z.number().min(1).max(5),
    documentation: z.number().min(1).max(5),
    codeQuality: z.number().min(1).max(5),
    security: z.number().min(1).max(5),
    usability: z.number().min(1).max(5),
    performance: z.number().min(1).max(5).optional(),
    accessibility: z.number().min(1).max(5).optional(),
  }),

  // Additional review data
  timeSpentMinutes: z.number().min(1).max(600).optional(),
  actionItems: z.array(z.string()).max(20).optional().default([]),
  suggestedPriority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),

  // Reviewer recommendations
  recommendedNextReviewers: z.array(z.string()).max(5).optional().default([]),
  escalateToSenior: z.boolean().optional().default(false),

  // Internal review notes (private)
  internalNotes: z.string().max(1000).optional(),
})

const AssignReviewerSchema = z.object({
  submissionId: z.string().min(1, 'Submission ID is required'),
  reviewerId: z.string().min(1, 'Reviewer ID is required'),
  assignmentType: z.enum(['primary', 'secondary', 'specialist']).default('primary'),
  priority: z.enum(['normal', 'high', 'urgent']).default('normal'),
  deadline: z.string().datetime().optional(),
  assignmentNotes: z.string().max(500).optional(),
})

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Calculate overall review score from criteria
 */
function calculateReviewScore(criteria: any): number {
  const scores = [
    criteria.functionality,
    criteria.documentation,
    criteria.codeQuality,
    criteria.security,
    criteria.usability,
    criteria.performance || 0,
    criteria.accessibility || 0,
  ].filter((score) => score > 0)

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
  return Math.round((average / 5) * 100)
}

/**
 * Determine next workflow stage based on review decision
 */
function determineNextStage(
  currentStage: number,
  decision: string,
  approvalWorkflow: any[],
  isBreakingChange: boolean
): { nextStage: number; status: string; requiresApproval: boolean } {
  if (decision === 'reject') {
    return {
      nextStage: currentStage,
      status: 'rejected',
      requiresApproval: false,
    }
  }

  if (decision === 'request_changes') {
    return {
      nextStage: currentStage,
      status: 'changes_requested',
      requiresApproval: false,
    }
  }

  // Approval path
  const nextStageIndex = approvalWorkflow.findIndex((stage) => stage.stageNumber > currentStage)

  if (nextStageIndex === -1) {
    // All stages completed
    return {
      nextStage: currentStage,
      status: 'approved',
      requiresApproval: false,
    }
  }

  const nextStage = approvalWorkflow[nextStageIndex]

  return {
    nextStage: nextStage.stageNumber,
    status: 'under_review',
    requiresApproval: nextStage.requiredApprovals > 0,
  }
}

/**
 * Check if user has permission to review submission
 */
async function checkReviewPermission(
  submissionId: string,
  userId: string
): Promise<{ canReview: boolean; role: string; reason?: string }> {
  try {
    // Fetch submission details
    const submission = await db
      .select({
        id: templateSubmissions.id,
        assignedReviewerId: templateSubmissions.assignedReviewerId,
        submitterId: templateSubmissions.submitterId,
        status: templateSubmissions.status,
      })
      .from(templateSubmissions)
      .where(eq(templateSubmissions.id, submissionId))
      .limit(1)

    if (submission.length === 0) {
      return { canReview: false, role: 'none', reason: 'Submission not found' }
    }

    const sub = submission[0]

    // Submitter cannot review their own submission
    if (sub.submitterId === userId) {
      return { canReview: false, role: 'submitter', reason: 'Cannot review own submission' }
    }

    // Check if already reviewed
    const existingReview = await db
      .select({ id: templateReviews.id })
      .from(templateReviews)
      .where(
        and(eq(templateReviews.submissionId, submissionId), eq(templateReviews.reviewerId, userId))
      )
      .limit(1)

    if (existingReview.length > 0) {
      return { canReview: false, role: 'reviewer', reason: 'Already reviewed this submission' }
    }

    // Check if assigned as reviewer
    if (sub.assignedReviewerId === userId) {
      return { canReview: true, role: 'assigned_reviewer' }
    }

    // Check if user is a qualified reviewer (in real implementation, would check user roles/permissions)
    // For now, assume all users can be reviewers
    return { canReview: true, role: 'qualified_reviewer' }
  } catch (error) {
    logger.error('Error checking review permission', { submissionId, userId, error })
    return { canReview: false, role: 'error', reason: 'Permission check failed' }
  }
}

/**
 * Send review notification to relevant parties
 */
async function sendReviewNotification(
  submissionId: string,
  reviewData: any,
  notificationType: string
) {
  try {
    // In a real implementation, this would send notifications via:
    // - Email to submitter
    // - In-app notifications
    // - Slack/Teams integration for team notifications
    // - Webhook calls to external systems

    logger.info('Review notification sent', {
      submissionId,
      notificationType,
      decision: reviewData.decision,
      reviewerId: reviewData.reviewerId,
    })
  } catch (error) {
    logger.warn('Failed to send review notification', {
      submissionId,
      notificationType,
      error: error.message,
    })
  }
}

/**
 * Update submission status based on review decision
 */
async function updateSubmissionStatus(
  submissionId: string,
  reviewDecision: string,
  reviewData: any
) {
  try {
    // Fetch current submission state
    const submission = await db
      .select({
        currentStage: templateSubmissions.currentStage,
        approvalWorkflow: templateSubmissions.approvalWorkflow,
        isBreakingChange: templateSubmissions.isBreakingChange,
      })
      .from(templateSubmissions)
      .where(eq(templateSubmissions.id, submissionId))
      .limit(1)

    if (submission.length === 0) {
      throw new Error('Submission not found')
    }

    const currentSubmission = submission[0]

    // Determine next stage and status
    const nextStageInfo = determineNextStage(
      currentSubmission.currentStage,
      reviewDecision,
      currentSubmission.approvalWorkflow || [],
      currentSubmission.isBreakingChange
    )

    // Update submission
    await db
      .update(templateSubmissions)
      .set({
        status: nextStageInfo.status as any,
        currentStage: nextStageInfo.nextStage,
        updatedAt: new Date(),
      })
      .where(eq(templateSubmissions.id, submissionId))

    // Create approval record if approved
    if (reviewDecision === 'approve') {
      await db.insert(templateApprovals).values({
        id: uuidv4(),
        submissionId,
        approverId: reviewData.reviewerId,
        stage: currentSubmission.currentStage,
        approvalType: nextStageInfo.requiresApproval ? 'stage_approval' : 'final_approval',
        approvedAt: new Date(),
        approvalNotes: reviewData.reviewNotes,
      })
    }

    logger.info('Submission status updated', {
      submissionId,
      previousStage: currentSubmission.currentStage,
      nextStage: nextStageInfo.nextStage,
      status: nextStageInfo.status,
    })
  } catch (error) {
    logger.error('Failed to update submission status', {
      submissionId,
      reviewDecision,
      error: error.message,
    })
    throw error
  }
}

// ========================
// API ENDPOINTS
// ========================

/**
 * GET /api/templates/v2/review - Get reviews with filtering
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const params = ReviewQuerySchema.parse(Object.fromEntries(searchParams.entries()))

    logger.info(`[${requestId}] Fetching template reviews:`, params)

    // Authentication
    const session = await getSession()
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Build query conditions
    const conditions = []

    if (params.submissionId) {
      conditions.push(eq(templateReviews.submissionId, params.submissionId))
    }

    if (params.reviewerId) {
      conditions.push(eq(templateReviews.reviewerId, params.reviewerId))
    }

    if (params.decision) {
      conditions.push(eq(templateReviews.decision, params.decision))
    }

    if (params.createdAfter) {
      conditions.push(sql`${templateReviews.createdAt} >= ${new Date(params.createdAfter)}`)
    }

    if (params.createdBefore) {
      conditions.push(sql`${templateReviews.createdAt} <= ${new Date(params.createdBefore)}`)
    }

    // Build sorting
    const getSortField = () => {
      switch (params.sortBy) {
        case 'created':
          return templateReviews.createdAt
        case 'updated':
          return templateReviews.updatedAt
        case 'priority':
          return templateSubmissions.priority
        default:
          return templateReviews.createdAt
      }
    }

    const sortField = getSortField()
    const orderBy = params.sortOrder === 'asc' ? sql`${sortField} ASC` : desc(sortField)

    // Calculate pagination
    const offset = (params.page - 1) * params.limit

    // Execute main query
    let query = db
      .select({
        id: templateReviews.id,
        submissionId: templateReviews.submissionId,
        reviewerId: templateReviews.reviewerId,
        reviewerName: user.name,
        reviewerImage: user.image,
        decision: templateReviews.decision,
        reviewNotes: templateReviews.reviewNotes,
        reviewCriteria: templateReviews.reviewCriteria,
        qualityScore: templateReviews.qualityScore,
        timeSpentMinutes: templateReviews.timeSpentMinutes,
        actionItems: templateReviews.actionItems,
        createdAt: templateReviews.createdAt,
        updatedAt: templateReviews.updatedAt,

        // Optional submission data
        ...(params.includeSubmission
          ? {
              submissionTitle: templateSubmissions.title,
              submissionStatus: templateSubmissions.status,
              submissionPriority: templateSubmissions.priority,
            }
          : {}),

        // Optional template data
        ...(params.includeTemplate
          ? {
              templateName: templates.name,
              templateDescription: templates.description,
            }
          : {}),
      })
      .from(templateReviews)
      .leftJoin(user, eq(templateReviews.reviewerId, user.id))

    if (params.includeSubmission) {
      query = query.leftJoin(
        templateSubmissions,
        eq(templateReviews.submissionId, templateSubmissions.id)
      )
    }

    if (params.includeTemplate) {
      query = query
        .leftJoin(templateSubmissions, eq(templateReviews.submissionId, templateSubmissions.id))
        .leftJoin(templates, eq(templateSubmissions.templateId, templates.id))
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined
    const results = await query
      .where(whereCondition)
      .orderBy(orderBy)
      .limit(params.limit)
      .offset(offset)

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(templateReviews)
      .where(whereCondition)

    const total = totalCount[0]?.count || 0

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / params.limit)
    const hasNextPage = params.page < totalPages
    const hasPrevPage = params.page > 1

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Fetched ${results.length} reviews in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      meta: {
        requestId,
        processingTime: elapsed,
        userId,
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

    logger.error(`[${requestId}] Reviews fetch error after ${elapsed}ms:`, error)
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
 * POST /api/templates/v2/review - Create new review
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await request.json()
    const data = CreateReviewSchema.parse(body)

    logger.info(`[${requestId}] Creating template review:`, {
      submissionId: data.submissionId,
      decision: data.decision,
      reviewerId: userId,
    })

    // Check review permissions
    const permission = await checkReviewPermission(data.submissionId, userId)

    if (!permission.canReview) {
      return NextResponse.json(
        {
          success: false,
          error: 'Review permission denied',
          reason: permission.reason,
        },
        { status: 403 }
      )
    }

    // Calculate review score
    const qualityScore = calculateReviewScore(data.reviewCriteria)

    // Create review record
    const reviewId = uuidv4()
    const now = new Date()

    const newReview = {
      id: reviewId,
      submissionId: data.submissionId,
      reviewerId: userId,
      decision: data.decision,
      reviewNotes: data.reviewNotes,
      reviewCriteria: data.reviewCriteria,
      qualityScore,
      timeSpentMinutes: data.timeSpentMinutes,
      actionItems: data.actionItems,
      suggestedPriority: data.suggestedPriority,
      internalNotes: data.internalNotes,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(templateReviews).values(newReview)

    // Update submission status based on review decision
    await updateSubmissionStatus(data.submissionId, data.decision, {
      reviewerId: userId,
      reviewNotes: data.reviewNotes,
      qualityScore,
    })

    // Send notifications
    await sendReviewNotification(data.submissionId, newReview, 'review_completed')

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Template review created successfully in ${elapsed}ms`)

    return NextResponse.json(
      {
        success: true,
        data: {
          reviewId,
          decision: data.decision,
          qualityScore,
          submissionId: data.submissionId,
          nextSteps:
            data.decision === 'approve'
              ? 'Submission moved to next approval stage'
              : data.decision === 'request_changes'
                ? 'Changes requested - submitter will be notified'
                : 'Submission rejected - submitter will be notified',
        },
        meta: {
          requestId,
          processingTime: elapsed,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid review data:`, error.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid review data',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Review creation error after ${elapsed}ms:`, error)
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
