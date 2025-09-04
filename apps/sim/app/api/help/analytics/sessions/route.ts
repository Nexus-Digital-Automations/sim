/**
 * Help Analytics Sessions API - Session data collection and analysis
 *
 * Features:
 * - Video tutorial session tracking and metrics
 * - Interactive guide session completion tracking
 * - User engagement and learning analytics
 * - Session-based performance optimization insights
 *
 * @created 2025-01-04
 * @author Video Tutorials & Interactive Guides Specialist
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('HelpAnalyticsSessionsAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const videoSessionSchema = z.object({
  sessionId: z.string(),
  videoId: z.string(),
  userId: z.string().optional(),
  startTime: z.number(),
  endTime: z.number().optional(),
  totalWatchTime: z.number(),
  actualDuration: z.number(),
  completionRate: z.number().min(0).max(1),
  engagementScore: z.number().min(0).max(100),

  // Playback metrics
  pauseCount: z.number(),
  seekCount: z.number(),
  seekDistance: z.number(),
  averagePlaybackRate: z.number(),
  qualityChanges: z.number(),

  // Interaction metrics
  annotationClicks: z.number(),
  chapterNavigations: z.number(),
  practiceAttempts: z.number(),
  practiceSuccessRate: z.number(),
  hintsRequested: z.number(),
  troubleshootingAccessed: z.boolean(),

  // Attention metrics
  focusLossEvents: z.number(),
  backgroundTime: z.number(),
  inactiveTime: z.number(),

  // Context metrics
  contextType: z.string().optional(),
  workflowState: z.string().optional(),
  userSkillLevel: z.number().optional(),
  deviceType: z.enum(['desktop', 'tablet', 'mobile']).optional(),

  // Outcome metrics
  wasCompleted: z.boolean(),
  wasAbandoned: z.boolean(),
  abandonmentReason: z
    .enum(['early_exit', 'technical_issue', 'content_difficulty', 'external_interrupt'])
    .optional(),
  finalRating: z.number().min(1).max(5).optional(),
  willRecommend: z.boolean().optional(),
})

const guideSessionSchema = z.object({
  sessionId: z.string(),
  guideId: z.string(),
  userId: z.string().optional(),
  startTime: z.number(),
  endTime: z.number().optional(),
  currentStepId: z.string(),
  completedSteps: z.array(z.string()),
  skippedSteps: z.array(z.string()),
  branchPath: z.array(z.string()),
  totalTimeSpent: z.number(),

  // Step-level metrics
  stepCompletionTimes: z.record(z.number()),
  stepErrorCounts: z.record(z.number()),
  hintsUsedPerStep: z.record(z.number()),

  // Engagement metrics
  isCompleted: z.boolean(),
  completionPercent: z.number().min(0).max(100),
  rating: z.number().min(1).max(5).optional(),
  feedback: z.string().optional(),

  // Context
  contextType: z.string().optional(),
  workflowState: z.string().optional(),
  deviceType: z.enum(['desktop', 'tablet', 'mobile']).optional(),
})

const sessionBatchSchema = z.object({
  videoSessions: z.array(videoSessionSchema).optional(),
  guideSessions: z.array(guideSessionSchema).optional(),
  batchId: z.string().optional(),
})

// ========================
// TYPES
// ========================

interface SessionAnalytics {
  totalSessions: number
  averageEngagement: number
  completionRate: number
  averageWatchTime: number
  topDropoffPoints: Array<{
    timestamp: number
    percentage: number
  }>
  deviceBreakdown: Record<string, number>
  performanceInsights: string[]
}

// ========================
// API HANDLERS
// ========================

/**
 * POST /api/help/analytics/sessions
 * Process video tutorial and interactive guide session data
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const body = await request.json()

    logger.info(`[${requestId}] POST /api/help/analytics/sessions`, {
      videoSessions: body.videoSessions?.length || 0,
      guideSessions: body.guideSessions?.length || 0,
      batchId: body.batchId,
    })

    // Validate session data
    const validatedBatch = sessionBatchSchema.parse(body)

    // Process sessions
    const results = await processSessionBatch(validatedBatch, requestId)

    logger.info(`[${requestId}] Session analytics processed successfully`, {
      processedVideoSessions: results.videoSessionsProcessed,
      processedGuideSessions: results.guideSessionsProcessed,
      insights: results.insights.length,
    })

    return NextResponse.json({
      success: true,
      ...results,
      message: 'Session data processed successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid session data`, {
        errors: error.format(),
      })
      return NextResponse.json(
        {
          error: 'Invalid session data',
          details: error.format(),
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error processing session analytics`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/help/analytics/sessions
 * Retrieve session analytics and insights
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const url = new URL(request.url)
    const contentId = url.searchParams.get('contentId')
    const timeframe = url.searchParams.get('timeframe') || 'week'

    logger.info(`[${requestId}] GET /api/help/analytics/sessions`, {
      contentId,
      timeframe,
    })

    // Generate session analytics
    const analytics = await generateSessionAnalytics(contentId, timeframe)

    return NextResponse.json({
      success: true,
      analytics,
      meta: {
        contentId,
        timeframe,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    logger.error(`[${requestId}] Error retrieving session analytics`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Process a batch of session data
 */
async function processSessionBatch(
  batch: z.infer<typeof sessionBatchSchema>,
  requestId: string
): Promise<{
  videoSessionsProcessed: number
  guideSessionsProcessed: number
  insights: string[]
}> {
  let videoSessionsProcessed = 0
  let guideSessionsProcessed = 0
  const insights: string[] = []

  // Process video sessions
  if (batch.videoSessions) {
    for (const session of batch.videoSessions) {
      try {
        await processVideoSession(session, requestId)
        videoSessionsProcessed++

        // Generate insights
        const sessionInsights = analyzeVideoSession(session)
        insights.push(...sessionInsights)
      } catch (error) {
        logger.error(`[${requestId}] Error processing video session`, {
          sessionId: session.sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  }

  // Process guide sessions
  if (batch.guideSessions) {
    for (const session of batch.guideSessions) {
      try {
        await processGuideSession(session, requestId)
        guideSessionsProcessed++

        // Generate insights
        const sessionInsights = analyzeGuideSession(session)
        insights.push(...sessionInsights)
      } catch (error) {
        logger.error(`[${requestId}] Error processing guide session`, {
          sessionId: session.sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  }

  return {
    videoSessionsProcessed,
    guideSessionsProcessed,
    insights: [...new Set(insights)], // Remove duplicates
  }
}

/**
 * Process individual video session
 */
async function processVideoSession(
  session: z.infer<typeof videoSessionSchema>,
  requestId: string
): Promise<void> {
  logger.debug(`[${requestId}] Processing video session`, {
    sessionId: session.sessionId,
    videoId: session.videoId,
    completionRate: session.completionRate,
    engagementScore: session.engagementScore,
  })

  // In production, this would:
  // 1. Store session data in analytics database
  // 2. Update video performance metrics
  // 3. Update user learning progress
  // 4. Trigger recommendation updates
  // 5. Update content optimization insights

  // Mock storage
  await storeVideoSession(session)
}

/**
 * Process individual guide session
 */
async function processGuideSession(
  session: z.infer<typeof guideSessionSchema>,
  requestId: string
): Promise<void> {
  logger.debug(`[${requestId}] Processing guide session`, {
    sessionId: session.sessionId,
    guideId: session.guideId,
    completionPercent: session.completionPercent,
    completedSteps: session.completedSteps.length,
  })

  // Mock storage
  await storeGuideSession(session)
}

/**
 * Analyze video session for insights
 */
function analyzeVideoSession(session: z.infer<typeof videoSessionSchema>): string[] {
  const insights: string[] = []

  // High engagement but low completion
  if (session.engagementScore > 70 && session.completionRate < 0.5) {
    insights.push('High engagement but early abandonment - content may be too long')
  }

  // High seek activity
  if (session.seekCount > 10) {
    insights.push('High seek activity indicates users are looking for specific content')
  }

  // Low engagement with practice exercises
  if (session.practiceAttempts === 0 && session.wasCompleted) {
    insights.push('Users completing video but skipping practice exercises')
  }

  // Frequent quality changes
  if (session.qualityChanges > 5) {
    insights.push('Frequent quality changes suggest network or performance issues')
  }

  // High background time
  if (session.backgroundTime > session.totalWatchTime * 0.3) {
    insights.push('High background time indicates content may not be engaging enough')
  }

  return insights
}

/**
 * Analyze guide session for insights
 */
function analyzeGuideSession(session: z.infer<typeof guideSessionSchema>): string[] {
  const insights: string[] = []

  // High step skip rate
  const skipRate =
    session.skippedSteps.length / (session.completedSteps.length + session.skippedSteps.length)
  if (skipRate > 0.3) {
    insights.push('High step skip rate indicates some steps may be redundant or unclear')
  }

  // Specific steps taking too long
  const avgStepTime = session.totalTimeSpent / (session.completedSteps.length || 1)
  Object.entries(session.stepCompletionTimes).forEach(([stepId, time]) => {
    if (time > avgStepTime * 3) {
      insights.push(
        `Step ${stepId} takes significantly longer than average - may need simplification`
      )
    }
  })

  // High error rates on specific steps
  Object.entries(session.stepErrorCounts).forEach(([stepId, errors]) => {
    if (errors > 3) {
      insights.push(`Step ${stepId} has high error rate - instructions may be unclear`)
    }
  })

  // Heavy hint usage
  const totalHints = Object.values(session.hintsUsedPerStep).reduce((sum, hints) => sum + hints, 0)
  if (totalHints > session.completedSteps.length * 2) {
    insights.push('Heavy hint usage indicates guide content may be too complex')
  }

  return insights
}

/**
 * Generate comprehensive session analytics
 */
async function generateSessionAnalytics(
  contentId: string | null,
  timeframe: string
): Promise<SessionAnalytics> {
  // In production, this would query actual session data
  // For now, return mock analytics

  const mockAnalytics: SessionAnalytics = {
    totalSessions: 1248,
    averageEngagement: 74.5,
    completionRate: 0.68,
    averageWatchTime: 342,
    topDropoffPoints: [
      { timestamp: 120, percentage: 15 },
      { timestamp: 480, percentage: 25 },
      { timestamp: 720, percentage: 12 },
    ],
    deviceBreakdown: {
      desktop: 65,
      mobile: 28,
      tablet: 7,
    },
    performanceInsights: [
      'Peak engagement occurs in first 2 minutes',
      'Major dropoff at 8-minute mark suggests content restructuring needed',
      'Mobile users have 15% higher completion rate',
      'Practice exercises improve retention by 23%',
      'Users who complete guides are 45% more likely to rate content positively',
    ],
  }

  return mockAnalytics
}

/**
 * Store video session data (mock implementation)
 */
async function storeVideoSession(session: z.infer<typeof videoSessionSchema>): Promise<void> {
  // Mock storage implementation
  logger.debug('Video session stored', {
    sessionId: session.sessionId,
    videoId: session.videoId,
    completionRate: session.completionRate,
  })
}

/**
 * Store guide session data (mock implementation)
 */
async function storeGuideSession(session: z.infer<typeof guideSessionSchema>): Promise<void> {
  // Mock storage implementation
  logger.debug('Guide session stored', {
    sessionId: session.sessionId,
    guideId: session.guideId,
    completionPercent: session.completionPercent,
  })
}

export type { SessionAnalytics }
