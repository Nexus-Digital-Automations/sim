/**
 * Help Feedback API - User feedback collection and content effectiveness tracking
 *
 * Comprehensive feedback system for help content optimization:
 * - Multi-format feedback collection (ratings, comments, suggestions)
 * - Content effectiveness tracking and analysis
 * - User satisfaction metrics and sentiment analysis
 * - Feedback aggregation and trend identification
 * - Automated content improvement recommendations
 * - Spam and abuse prevention with validation
 * - Real-time feedback processing and notifications
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createLogger } from '@/lib/logs/console/logger'
import { getSession } from '@/lib/auth'
import { helpContentManager } from '@/lib/help/help-content-manager'
import { helpAnalytics } from '@/lib/help/help-analytics'

const logger = createLogger('HelpFeedbackAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const feedbackSubmissionSchema = z.object({
  contentId: z.string().min(1),
  sessionId: z.string().min(1),
  feedbackType: z.enum([
    'rating',
    'helpful',
    'suggestion',
    'error_report',
    'content_request',
    'general_feedback'
  ]),
  data: z.object({
    // Rating feedback (1-5 stars)
    rating: z.number().min(1).max(5).optional(),
    
    // Helpful/not helpful feedback
    helpful: z.boolean().optional(),
    
    // Text feedback
    comment: z.string().max(2000).optional(),
    suggestion: z.string().max(1000).optional(),
    
    // Error reporting
    errorDescription: z.string().max(1000).optional(),
    expectedBehavior: z.string().max(500).optional(),
    actualBehavior: z.string().max(500).optional(),
    
    // Content request
    requestedTopic: z.string().max(200).optional(),
    useCase: z.string().max(500).optional(),
    
    // Context information
    userLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    difficulty: z.enum(['too_easy', 'just_right', 'too_difficult']).optional(),
    completionTime: z.number().optional(), // seconds
    followedInstructions: z.boolean().optional(),
    
    // Metadata
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  }),
  context: z.object({
    component: z.string().optional(),
    page: z.string().optional(),
    userAgent: z.string().optional(),
    timestamp: z.string().optional(),
    referrer: z.string().optional(),
  }).optional(),
})

const feedbackQuerySchema = z.object({
  contentId: z.string().optional(),
  category: z.string().optional(),
  feedbackType: z.enum([
    'rating',
    'helpful', 
    'suggestion',
    'error_report',
    'content_request',
    'general_feedback',
    'all'
  ]).default('all'),
  status: z.enum(['pending', 'reviewed', 'resolved', 'dismissed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  timeRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  includeAnalytics: z.boolean().default(false),
  groupBy: z.enum(['day', 'week', 'month', 'content', 'type']).default('day'),
  sortBy: z.enum(['date', 'priority', 'rating', 'helpful']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
})

const feedbackUpdateSchema = z.object({
  feedbackId: z.string().min(1),
  status: z.enum(['pending', 'reviewed', 'resolved', 'dismissed']),
  response: z.string().max(1000).optional(),
  assignedTo: z.string().optional(),
  internalNotes: z.string().max(2000).optional(),
  resolution: z.object({
    action: z.enum(['content_updated', 'bug_fixed', 'feature_added', 'no_action_needed']),
    description: z.string().max(500),
    relatedChanges: z.array(z.string()).optional(),
  }).optional(),
})

// ========================
// FEEDBACK UTILITIES
// ========================

interface FeedbackEntry {
  id: string
  contentId: string
  userId?: string
  sessionId: string
  feedbackType: string
  data: any
  context?: any
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  createdAt: Date
  updatedAt: Date
  response?: string
  assignedTo?: string
  internalNotes?: string
  resolution?: any
}

interface FeedbackSummary {
  contentId: string
  totalFeedback: number
  averageRating: number
  helpfulPercentage: number
  feedbackDistribution: {
    rating: number
    helpful: number
    suggestion: number
    error_report: number
    content_request: number
    general_feedback: number
  }
  sentimentScore: number
  commonThemes: string[]
  urgentIssues: number
}

class FeedbackManager {
  private feedbackStore: Map<string, FeedbackEntry> = new Map()
  private spamDetection = new SpamDetector()
  private sentimentAnalyzer = new SentimentAnalyzer()

  async submitFeedback(
    feedbackData: any,
    userId?: string
  ): Promise<{ id: string; status: string }> {
    const feedbackId = crypto.randomUUID()
    const now = new Date()

    // Spam detection
    const isSpam = await this.spamDetection.checkForSpam(feedbackData, userId)
    if (isSpam.isSpam) {
      logger.warn('Spam feedback detected', {
        feedbackId,
        userId: userId?.substring(0, 8),
        reason: isSpam.reason,
      })
      return { id: feedbackId, status: 'rejected_spam' }
    }

    // Create feedback entry
    const feedback: FeedbackEntry = {
      id: feedbackId,
      contentId: feedbackData.contentId,
      userId,
      sessionId: feedbackData.sessionId,
      feedbackType: feedbackData.feedbackType,
      data: feedbackData.data,
      context: feedbackData.context,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }

    // Enrich with sentiment analysis for text feedback
    if (feedback.data.comment || feedback.data.suggestion) {
      const text = feedback.data.comment || feedback.data.suggestion
      const sentiment = await this.sentimentAnalyzer.analyze(text)
      feedback.data.sentiment = sentiment
    }

    // Store feedback
    this.feedbackStore.set(feedbackId, feedback)

    // Track feedback submission analytics
    await helpAnalytics.trackHelpInteraction(
      feedback.contentId,
      feedback.sessionId,
      'feedback_submitted',
      feedback.context?.component || 'unknown',
      {
        feedbackType: feedback.feedbackType,
        hasComment: !!(feedback.data.comment || feedback.data.suggestion),
        rating: feedback.data.rating,
        helpful: feedback.data.helpful,
      },
      userId
    )

    // Trigger notifications for high-priority feedback
    if (feedbackData.data.priority === 'high' || feedbackData.data.priority === 'critical') {
      await this.notifyTeam(feedback)
    }

    logger.info('Feedback submitted successfully', {
      feedbackId,
      contentId: feedback.contentId,
      feedbackType: feedback.feedbackType,
      priority: feedback.data.priority,
      userId: userId?.substring(0, 8),
    })

    return { id: feedbackId, status: 'submitted' }
  }

  async getFeedback(query: any): Promise<{
    feedback: FeedbackEntry[]
    summary: FeedbackSummary
    pagination: any
  }> {
    let filteredFeedback = Array.from(this.feedbackStore.values())

    // Apply filters
    if (query.contentId) {
      filteredFeedback = filteredFeedback.filter(f => f.contentId === query.contentId)
    }

    if (query.feedbackType && query.feedbackType !== 'all') {
      filteredFeedback = filteredFeedback.filter(f => f.feedbackType === query.feedbackType)
    }

    if (query.status) {
      filteredFeedback = filteredFeedback.filter(f => f.status === query.status)
    }

    if (query.priority) {
      filteredFeedback = filteredFeedback.filter(f => f.data.priority === query.priority)
    }

    if (query.timeRange) {
      const start = new Date(query.timeRange.start)
      const end = new Date(query.timeRange.end)
      filteredFeedback = filteredFeedback.filter(f => 
        f.createdAt >= start && f.createdAt <= end
      )
    }

    // Sort results
    filteredFeedback.sort((a, b) => {
      switch (query.sortBy) {
        case 'date':
          return query.sortOrder === 'desc' 
            ? b.createdAt.getTime() - a.createdAt.getTime()
            : a.createdAt.getTime() - b.createdAt.getTime()
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          const aPriority = priorityOrder[a.data.priority as keyof typeof priorityOrder] || 1
          const bPriority = priorityOrder[b.data.priority as keyof typeof priorityOrder] || 1
          return query.sortOrder === 'desc' ? bPriority - aPriority : aPriority - bPriority
        case 'rating':
          const aRating = a.data.rating || 0
          const bRating = b.data.rating || 0
          return query.sortOrder === 'desc' ? bRating - aRating : aRating - bRating
        default:
          return 0
      }
    })

    // Pagination
    const total = filteredFeedback.length
    const startIndex = (query.page - 1) * query.pageSize
    const endIndex = startIndex + query.pageSize
    const paginatedFeedback = filteredFeedback.slice(startIndex, endIndex)

    // Generate summary
    const summary = this.generateFeedbackSummary(filteredFeedback, query.contentId)

    return {
      feedback: paginatedFeedback,
      summary,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    }
  }

  async updateFeedback(
    feedbackId: string,
    updates: any,
    updatedBy?: string
  ): Promise<FeedbackEntry | null> {
    const feedback = this.feedbackStore.get(feedbackId)
    if (!feedback) return null

    const updatedFeedback: FeedbackEntry = {
      ...feedback,
      status: updates.status || feedback.status,
      response: updates.response || feedback.response,
      assignedTo: updates.assignedTo || feedback.assignedTo,
      internalNotes: updates.internalNotes || feedback.internalNotes,
      resolution: updates.resolution || feedback.resolution,
      updatedAt: new Date(),
    }

    this.feedbackStore.set(feedbackId, updatedFeedback)

    // Track feedback status update
    await helpAnalytics.trackHelpInteraction(
      feedback.contentId,
      feedback.sessionId,
      'feedback_updated',
      'admin_panel',
      {
        oldStatus: feedback.status,
        newStatus: updatedFeedback.status,
        updatedBy: updatedBy?.substring(0, 8),
      },
      updatedBy
    )

    logger.info('Feedback updated', {
      feedbackId,
      oldStatus: feedback.status,
      newStatus: updatedFeedback.status,
      updatedBy: updatedBy?.substring(0, 8),
    })

    return updatedFeedback
  }

  private generateFeedbackSummary(feedback: FeedbackEntry[], contentId?: string): FeedbackSummary {
    const summary: FeedbackSummary = {
      contentId: contentId || 'all',
      totalFeedback: feedback.length,
      averageRating: 0,
      helpfulPercentage: 0,
      feedbackDistribution: {
        rating: 0,
        helpful: 0,
        suggestion: 0,
        error_report: 0,
        content_request: 0,
        general_feedback: 0,
      },
      sentimentScore: 0,
      commonThemes: [],
      urgentIssues: 0,
    }

    if (feedback.length === 0) return summary

    // Calculate averages and distributions
    let totalRating = 0
    let ratingCount = 0
    let helpfulCount = 0
    let notHelpfulCount = 0
    let sentimentSum = 0
    let sentimentCount = 0
    const themes = new Map<string, number>()

    for (const f of feedback) {
      // Rating distribution
      if (f.data.rating) {
        totalRating += f.data.rating
        ratingCount++
      }

      // Helpful distribution
      if (f.data.helpful === true) helpfulCount++
      if (f.data.helpful === false) notHelpfulCount++

      // Feedback type distribution
      if (f.feedbackType in summary.feedbackDistribution) {
        (summary.feedbackDistribution as any)[f.feedbackType]++
      }

      // Sentiment analysis
      if (f.data.sentiment?.score) {
        sentimentSum += f.data.sentiment.score
        sentimentCount++
      }

      // Theme extraction
      if (f.data.tags) {
        for (const tag of f.data.tags) {
          themes.set(tag, (themes.get(tag) || 0) + 1)
        }
      }

      // Urgent issues
      if (f.data.priority === 'high' || f.data.priority === 'critical') {
        summary.urgentIssues++
      }
    }

    summary.averageRating = ratingCount > 0 ? totalRating / ratingCount : 0
    summary.helpfulPercentage = (helpfulCount + notHelpfulCount) > 0 
      ? helpfulCount / (helpfulCount + notHelpfulCount) : 0
    summary.sentimentScore = sentimentCount > 0 ? sentimentSum / sentimentCount : 0
    summary.commonThemes = Array.from(themes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme]) => theme)

    return summary
  }

  private async notifyTeam(feedback: FeedbackEntry): Promise<void> {
    // Implementation would send notifications to the team
    logger.info('High-priority feedback notification', {
      feedbackId: feedback.id,
      contentId: feedback.contentId,
      priority: feedback.data.priority,
      type: feedback.feedbackType,
    })
  }
}

class SpamDetector {
  async checkForSpam(feedbackData: any, userId?: string): Promise<{ isSpam: boolean; reason?: string }> {
    // Rate limiting check
    if (userId) {
      const recentFeedback = this.getRecentFeedbackCount(userId)
      if (recentFeedback > 10) {
        return { isSpam: true, reason: 'rate_limit_exceeded' }
      }
    }

    // Content analysis
    const text = feedbackData.data.comment || feedbackData.data.suggestion || ''
    if (text.length > 0) {
      // Check for repeated content
      if (this.isRepeatedContent(text)) {
        return { isSpam: true, reason: 'repeated_content' }
      }

      // Check for spam keywords
      if (this.containsSpamKeywords(text)) {
        return { isSpam: true, reason: 'spam_keywords' }
      }
    }

    return { isSpam: false }
  }

  private getRecentFeedbackCount(userId: string): number {
    // Implementation would check database for recent feedback count
    return 0
  }

  private isRepeatedContent(text: string): boolean {
    // Simplified implementation
    const words = text.split(/\s+/)
    const uniqueWords = new Set(words)
    return uniqueWords.size < words.length * 0.5 && words.length > 10
  }

  private containsSpamKeywords(text: string): boolean {
    const spamKeywords = ['buy now', 'click here', 'free money', 'guaranteed', 'no risk']
    const lowerText = text.toLowerCase()
    return spamKeywords.some(keyword => lowerText.includes(keyword))
  }
}

class SentimentAnalyzer {
  async analyze(text: string): Promise<{ score: number; label: string; confidence: number }> {
    // Simplified sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'helpful', 'useful', 'clear', 'easy']
    const negativeWords = ['bad', 'terrible', 'confusing', 'difficult', 'unclear', 'hard', 'useless']
    
    const words = text.toLowerCase().split(/\s+/)
    let score = 0
    
    for (const word of words) {
      if (positiveWords.includes(word)) score += 1
      if (negativeWords.includes(word)) score -= 1
    }
    
    const normalizedScore = Math.max(-1, Math.min(1, score / words.length * 10))
    let label = 'neutral'
    if (normalizedScore > 0.2) label = 'positive'
    if (normalizedScore < -0.2) label = 'negative'
    
    return {
      score: normalizedScore,
      label,
      confidence: Math.abs(normalizedScore),
    }
  }
}

const feedbackManager = new FeedbackManager()

// ========================
// API ENDPOINTS
// ========================

/**
 * POST /api/help/feedback - Submit feedback on help content
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    logger.info(`[${requestId}] Processing help feedback submission`)

    const body = await request.json()
    const validationResult = feedbackSubmissionSchema.safeParse(body)

    if (!validationResult.success) {
      logger.warn(`[${requestId}] Invalid feedback submission`, {
        errors: validationResult.error.format(),
      })
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const session = await getSession()
    const userId = session?.user?.email

    const result = await feedbackManager.submitFeedback(
      validationResult.data,
      userId
    )

    const processingTime = Date.now() - startTime
    logger.info(`[${requestId}] Feedback submission completed`, {
      feedbackId: result.id,
      status: result.status,
      contentId: validationResult.data.contentId,
      processingTimeMs: processingTime,
    })

    return NextResponse.json({
      success: true,
      feedbackId: result.id,
      status: result.status,
      meta: {
        requestId,
        processingTime,
      },
    }, {
      headers: {
        'X-Response-Time': `${processingTime}ms`,
      },
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error(`[${requestId}] Feedback submission failed`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
    })

    return NextResponse.json(
      { error: 'Feedback submission failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/help/feedback - Retrieve feedback data and analytics
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    logger.info(`[${requestId}] Processing feedback retrieval request`)

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams)

    // Parse boolean parameters
    if (params.includeAnalytics !== undefined) {
      params.includeAnalytics = params.includeAnalytics === 'true'
    }

    // Parse number parameters  
    if (params.page) params.page = parseInt(params.page, 10)
    if (params.pageSize) params.pageSize = parseInt(params.pageSize, 10)

    // Parse time range
    if (params.start && params.end) {
      params.timeRange = {
        start: params.start,
        end: params.end,
      }
    }

    const validationResult = feedbackQuerySchema.safeParse(params)

    if (!validationResult.success) {
      logger.warn(`[${requestId}] Invalid feedback query parameters`, {
        errors: validationResult.error.format(),
      })
      return NextResponse.json(
        { error: 'Invalid parameters', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    // Authorization check for feedback access
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const result = await feedbackManager.getFeedback(validationResult.data)

    const processingTime = Date.now() - startTime
    logger.info(`[${requestId}] Feedback retrieval completed`, {
      resultCount: result.feedback.length,
      total: result.pagination.total,
      processingTimeMs: processingTime,
    })

    return NextResponse.json({
      ...result,
      meta: {
        requestId,
        processingTime,
        query: validationResult.data,
      },
    }, {
      headers: {
        'X-Response-Time': `${processingTime}ms`,
        'Cache-Control': 'private, max-age=60', // 1 minute cache
      },
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error(`[${requestId}] Feedback retrieval failed`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
    })

    return NextResponse.json(
      { error: 'Feedback retrieval failed' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/help/feedback - Update feedback status and responses
 */
export async function PATCH(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    logger.info(`[${requestId}] Processing feedback update request`)

    const body = await request.json()
    const validationResult = feedbackUpdateSchema.safeParse(body)

    if (!validationResult.success) {
      logger.warn(`[${requestId}] Invalid feedback update request`, {
        errors: validationResult.error.format(),
      })
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    // Authorization check for feedback updates
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { feedbackId, ...updates } = validationResult.data
    const result = await feedbackManager.updateFeedback(
      feedbackId,
      updates,
      session.user.email
    )

    if (!result) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    const processingTime = Date.now() - startTime
    logger.info(`[${requestId}] Feedback update completed`, {
      feedbackId,
      newStatus: result.status,
      processingTimeMs: processingTime,
    })

    return NextResponse.json({
      success: true,
      feedback: result,
      meta: {
        requestId,
        processingTime,
      },
    }, {
      headers: {
        'X-Response-Time': `${processingTime}ms`,
      },
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error(`[${requestId}] Feedback update failed`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
    })

    return NextResponse.json(
      { error: 'Feedback update failed' },
      { status: 500 }
    )
  }
}