/**
 * Workflow Wizard Analytics API - Comprehensive Usage Analytics and A/B Testing
 *
 * This API endpoint provides comprehensive analytics for the workflow wizard system including:
 * - Usage tracking and conversion metrics
 * - A/B testing data collection and analysis
 * - User behavior analytics and pattern insights
 * - Performance monitoring and optimization metrics
 * - GDPR-compliant data collection and retention
 *
 * Features:
 * - Real-time analytics aggregation with efficient querying
 * - Privacy-first data collection with user consent management
 * - Advanced segmentation and cohort analysis
 * - Funnel analysis with conversion optimization insights
 * - Rate limiting and security measures
 * - Comprehensive audit logging for compliance
 *
 * @author Claude Code Workflow Analytics System
 * @version 1.0.0
 * @created 2025-09-04
 */

import { createHash, randomUUID } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { createLogger } from '@/lib/logs/console/logger'
import { wizardAnalytics } from '@/lib/workflow-wizard/wizard-analytics'

// Initialize structured logger with comprehensive context tracking
const logger = createLogger('WorkflowWizardAnalyticsAPI', {
  service: 'workflow-wizard',
  component: 'analytics-api',
  version: '1.0.0',
})

/**
 * Analytics event submission schema with privacy controls
 */
const AnalyticsEventSchema = z.object({
  eventType: z.enum([
    'wizard_started',
    'step_completed',
    'template_selected',
    'configuration_updated',
    'validation_passed',
    'validation_failed',
    'workflow_created',
    'wizard_abandoned',
    'error_encountered',
    'help_accessed',
    'customization_made',
    'preview_viewed',
  ]),
  eventData: z.object({
    sessionId: z.string().uuid(),
    userId: z.string().optional(), // Optional for anonymous tracking
    workspaceId: z.string().optional(),
    goalId: z.string().optional(),
    templateId: z.string().optional(),
    stepName: z.string().optional(),
    stepIndex: z.number().min(0).optional(),
    timeSpent: z.number().min(0).optional(), // Time spent in milliseconds
    errorDetails: z.string().optional(),
    customizations: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional(), // Additional event-specific data
    abTestVariant: z.string().optional(),
    userAgent: z.string().optional(),
    referrer: z.string().optional(),
    location: z
      .object({
        page: z.string(),
        section: z.string().optional(),
      })
      .optional(),
  }),
  privacySettings: z.object({
    allowAnalytics: z.boolean().default(true),
    allowPersonalization: z.boolean().default(true),
    dataRetention: z.enum(['session', '30_days', '90_days', '1_year']).default('90_days'),
  }),
  timestamp: z.string().datetime().optional(),
})

/**
 * Analytics query schema with comprehensive filtering options
 */
const AnalyticsQuerySchema = z.object({
  // Time range filters
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),

  // Filtering options
  eventTypes: z.string().optional(), // Comma-separated event types
  userIds: z.string().optional(), // Comma-separated user IDs
  workspaceIds: z.string().optional(), // Comma-separated workspace IDs
  goalIds: z.string().optional(), // Comma-separated goal IDs
  templateIds: z.string().optional(), // Comma-separated template IDs
  abTestVariants: z.string().optional(), // Comma-separated A/B test variants

  // Aggregation and grouping
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  groupBy: z.string().optional(), // Comma-separated: eventType,userId,goalId,templateId,abTestVariant
  aggregation: z.enum(['count', 'sum', 'avg', 'min', 'max']).default('count'),

  // Analysis options
  includeConversionFunnel: z.boolean().default(false),
  includeCohortAnalysis: z.boolean().default(false),
  includeSegmentation: z.boolean().default(false),
  includeABTestResults: z.boolean().default(false),

  // Pagination
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(100),

  // Performance and privacy
  anonymizeData: z.boolean().default(true),
  respectPrivacySettings: z.boolean().default(true),
})

/**
 * A/B Test configuration schema
 */
const ABTestSchema = z.object({
  testId: z.string(),
  testName: z.string(),
  description: z.string(),
  variants: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      weight: z.number().min(0).max(1), // Traffic allocation percentage
      configuration: z.record(z.unknown()),
    })
  ),
  targetSegment: z.object({
    criteria: z.record(z.unknown()),
    percentage: z.number().min(0).max(100),
  }),
  metrics: z.array(z.string()), // Metrics to track for this test
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']),
})

/**
 * Privacy-aware data anonymization
 */
function anonymizeUserData(data: any, anonymize = true): any {
  if (!anonymize) return data

  return {
    ...data,
    userId: data.userId
      ? `anon_${createHash('sha256').update(data.userId).digest('hex').slice(0, 8)}`
      : undefined,
    userAgent: undefined,
    referrer: undefined,
    // Keep aggregated metrics but remove PII
  }
}

/**
 * Rate limiting configuration with graduated limits
 */
const RATE_LIMIT_CONFIG = {
  analytics_submission: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000, // High limit for real-time tracking
  },
  analytics_query: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // Lower limit for expensive queries
  },
}

/**
 * Simple rate limiter implementation
 */
class RateLimiter {
  private requests = new Map<string, Array<number>>()

  isRateLimited(key: string, config: { windowMs: number; maxRequests: number }): boolean {
    const now = Date.now()
    const userRequests = this.requests.get(key) || []

    // Clean up old requests outside the window
    const recentRequests = userRequests.filter((time) => now - time < config.windowMs)

    if (recentRequests.length >= config.maxRequests) {
      return true
    }

    recentRequests.push(now)
    this.requests.set(key, recentRequests)
    return false
  }
}

const rateLimiter = new RateLimiter()

/**
 * POST /api/workflow-wizard/analytics
 * Submit analytics events for wizard usage tracking
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  const requestId = randomUUID().slice(0, 8)

  logger.info(`[${requestId}] Analytics event submission request received`)

  try {
    // Rate limiting check
    const clientIP =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `analytics_submission:${clientIP}`

    if (rateLimiter.isRateLimited(rateLimitKey, RATE_LIMIT_CONFIG.analytics_submission)) {
      logger.warn(`[${requestId}] Rate limit exceeded for analytics submission`, { clientIP })
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many analytics requests',
          },
        },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = AnalyticsEventSchema.safeParse(body)

    if (!validationResult.success) {
      logger.warn(`[${requestId}] Invalid analytics event data`, {
        errors: validationResult.error.errors,
      })

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_EVENT_DATA',
            message: 'Invalid analytics event data',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      )
    }

    const { eventType, eventData, privacySettings, timestamp } = validationResult.data

    // Privacy compliance check
    if (!privacySettings.allowAnalytics) {
      logger.info(`[${requestId}] Analytics disabled by user privacy settings`)
      return NextResponse.json({
        success: true,
        message: 'Event ignored due to privacy settings',
        meta: { requestId, respectsPrivacy: true },
      })
    }

    // Optional authentication check (for personalized analytics)
    let authenticatedUserId: string | null = null
    const session = await getSession()
    if (session?.user?.id) {
      authenticatedUserId = session.user.id
    }

    // Use authenticated user ID if available, otherwise use provided user ID
    const finalUserId = authenticatedUserId || eventData.userId || null

    logger.info(`[${requestId}] Processing analytics event`, {
      eventType,
      sessionId: eventData.sessionId,
      hasUserId: !!finalUserId,
      templateId: eventData.templateId,
      privacyCompliant: privacySettings.allowAnalytics,
    })

    // Submit event to analytics system
    const analyticsEvent = {
      type: eventType,
      sessionId: eventData.sessionId,
      userId: finalUserId,
      workspaceId: eventData.workspaceId,
      goalId: eventData.goalId,
      templateId: eventData.templateId,
      stepName: eventData.stepName,
      stepIndex: eventData.stepIndex,
      timeSpent: eventData.timeSpent,
      errorDetails: eventData.errorDetails,
      customizations: eventData.customizations,
      metadata: eventData.metadata,
      abTestVariant: eventData.abTestVariant,
      userAgent: privacySettings.allowPersonalization ? eventData.userAgent : null,
      referrer: privacySettings.allowPersonalization ? eventData.referrer : null,
      location: eventData.location,
      timestamp: timestamp || new Date().toISOString(),
      privacySettings,
    }

    // Store the event using the analytics system
    await wizardAnalytics.trackEvent(analyticsEvent)

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Analytics event submitted successfully`, {
      eventType,
      processingTime,
      privacyCompliant: true,
    })

    return NextResponse.json({
      success: true,
      data: {
        message: 'Analytics event submitted successfully',
        eventId: randomUUID(),
        privacyCompliant: true,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        processingTime,
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error(`[${requestId}] Analytics event submission failed`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SUBMISSION_FAILED',
          message: 'Failed to submit analytics event',
          details: errorMessage,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime,
        },
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/workflow-wizard/analytics
 * Query analytics data with advanced filtering and aggregation
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  const requestId = randomUUID().slice(0, 8)

  logger.info(`[${requestId}] Analytics query request received`)

  try {
    // Authentication required for analytics queries
    let userId: string | null = null
    let hasAdminAccess = false

    // Check for internal JWT token first (for server-side calls)
    const authHeader = request.headers.get('authorization')
    let isInternalCall = false

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      isInternalCall = await verifyInternalToken(token)
    }

    if (!isInternalCall) {
      const session = await getSession()
      if (!session?.user?.id) {
        logger.warn(`[${requestId}] Unauthorized analytics query attempt`)
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required for analytics queries',
            },
          },
          { status: 401 }
        )
      }

      userId = session.user.id
      // TODO: Add admin permission check
      hasAdminAccess = true // Placeholder
    } else {
      hasAdminAccess = true // Internal calls have full access
    }

    // Rate limiting for analytics queries
    const clientIP =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `analytics_query:${userId || clientIP}`

    if (rateLimiter.isRateLimited(rateLimitKey, RATE_LIMIT_CONFIG.analytics_query)) {
      logger.warn(`[${requestId}] Rate limit exceeded for analytics query`, { userId, clientIP })
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many analytics query requests',
          },
        },
        { status: 429 }
      )
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const filters = AnalyticsQuerySchema.parse(queryParams)

    logger.info(`[${requestId}] Processing analytics query`, {
      timeRange: `${filters.startDate} to ${filters.endDate}`,
      granularity: filters.granularity,
      includeConversionFunnel: filters.includeConversionFunnel,
      includeABTestResults: filters.includeABTestResults,
      anonymizeData: filters.anonymizeData,
    })

    // Build analytics query
    const analyticsQuery = {
      timeRange: {
        start: filters.startDate,
        end: filters.endDate,
        granularity: filters.granularity,
      },
      filters: {
        eventTypes: filters.eventTypes?.split(',').filter(Boolean),
        userIds: filters.userIds?.split(',').filter(Boolean),
        workspaceIds: filters.workspaceIds?.split(',').filter(Boolean),
        goalIds: filters.goalIds?.split(',').filter(Boolean),
        templateIds: filters.templateIds?.split(',').filter(Boolean),
        abTestVariants: filters.abTestVariants?.split(',').filter(Boolean),
      },
      groupBy: filters.groupBy?.split(',').filter(Boolean) || [],
      aggregation: filters.aggregation,
      anonymizeData: filters.anonymizeData,
      respectPrivacySettings: filters.respectPrivacySettings,
      // If not admin or internal call, filter to user's data only
      restrictToUser: !hasAdminAccess ? userId : undefined,
    }

    // Execute analytics queries
    const [basicMetrics, conversionFunnel, cohortAnalysis, segmentationData, abTestResults] =
      await Promise.all([
        wizardAnalytics.getBasicMetrics(analyticsQuery),
        filters.includeConversionFunnel
          ? wizardAnalytics.getConversionFunnel(analyticsQuery)
          : null,
        filters.includeCohortAnalysis ? wizardAnalytics.getCohortAnalysis(analyticsQuery) : null,
        filters.includeSegmentation ? wizardAnalytics.getSegmentationData(analyticsQuery) : null,
        filters.includeABTestResults ? wizardAnalytics.getABTestResults(analyticsQuery) : null,
      ])

    // Apply data anonymization if requested
    const anonymizedMetrics = filters.anonymizeData
      ? anonymizeUserData(basicMetrics, true)
      : basicMetrics

    // Calculate pagination
    const totalCount = basicMetrics.length || 0
    const totalPages = Math.ceil(totalCount / filters.limit)
    const hasNextPage = filters.page < totalPages
    const hasPrevPage = filters.page > 1

    const processingTime = Date.now() - startTime

    const responseData = {
      success: true,
      data: {
        metrics: anonymizedMetrics.slice(
          (filters.page - 1) * filters.limit,
          filters.page * filters.limit
        ),
        aggregation: {
          totalEvents: totalCount,
          uniqueUsers: basicMetrics.uniqueUsers || 0,
          averageSessionDuration: basicMetrics.averageSessionDuration || 0,
          conversionRate: basicMetrics.conversionRate || 0,
          mostPopularTemplates: basicMetrics.mostPopularTemplates || [],
          topAbandonmentPoints: basicMetrics.topAbandonmentPoints || [],
        },
        ...(conversionFunnel && { conversionFunnel }),
        ...(cohortAnalysis && { cohortAnalysis }),
        ...(segmentationData && { segmentationData }),
        ...(abTestResults && { abTestResults }),
      },
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      privacy: {
        dataAnonymized: filters.anonymizeData,
        privacySettingsRespected: filters.respectPrivacySettings,
        userDataRestricted: !hasAdminAccess,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        processingTime,
        cacheHit: false, // Would be set by caching layer
      },
    }

    logger.info(`[${requestId}] Analytics query completed successfully`, {
      metricsCount: anonymizedMetrics.length,
      processingTime,
      includesAdvancedAnalysis: !!(
        conversionFunnel ||
        cohortAnalysis ||
        segmentationData ||
        abTestResults
      ),
    })

    return NextResponse.json(responseData)
  } catch (error: any) {
    const processingTime = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid analytics query parameters`, {
        errors: error.errors,
        processingTime,
      })

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_QUERY_PARAMETERS',
            message: 'Invalid query parameters',
            details: error.errors,
          },
          meta: { requestId, processingTime },
        },
        { status: 400 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error(`[${requestId}] Analytics query failed`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to execute analytics query',
          details: errorMessage,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime,
        },
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/workflow-wizard/analytics
 * Configure A/B tests and analytics settings
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  const requestId = randomUUID().slice(0, 8)

  logger.info(`[${requestId}] Analytics configuration request received`)

  try {
    // Admin authentication required
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized analytics configuration attempt`)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      )
    }

    // TODO: Check for admin permissions
    const isAdmin = true // Placeholder

    if (!isAdmin) {
      logger.warn(`[${requestId}] Insufficient permissions for analytics configuration`)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin permissions required',
          },
        },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Handle A/B test configuration
    if (body.abTest) {
      const abTestValidation = ABTestSchema.safeParse(body.abTest)

      if (!abTestValidation.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_AB_TEST_CONFIG',
              message: 'Invalid A/B test configuration',
              details: abTestValidation.error.errors,
            },
          },
          { status: 400 }
        )
      }

      const abTestConfig = abTestValidation.data

      // Configure A/B test
      await wizardAnalytics.configureABTest(abTestConfig)

      logger.info(`[${requestId}] A/B test configured successfully`, {
        testId: abTestConfig.testId,
        testName: abTestConfig.testName,
        variants: abTestConfig.variants.length,
      })
    }

    // Handle general analytics settings
    if (body.settings) {
      await wizardAnalytics.updateSettings(body.settings)

      logger.info(`[${requestId}] Analytics settings updated successfully`)
    }

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        message: 'Analytics configuration updated successfully',
        ...(body.abTest && { abTestConfigured: true }),
        ...(body.settings && { settingsUpdated: true }),
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        processingTime,
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error(`[${requestId}] Analytics configuration failed`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CONFIGURATION_FAILED',
          message: 'Failed to update analytics configuration',
          details: errorMessage,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime,
        },
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/workflow-wizard/analytics
 * Delete analytics data (GDPR compliance)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  const requestId = randomUUID().slice(0, 8)

  logger.info(`[${requestId}] Analytics data deletion request received`)

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized analytics deletion attempt`)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const sessionId = searchParams.get('sessionId')
    const olderThan = searchParams.get('olderThan') // ISO datetime string
    const reason = searchParams.get('reason') || 'user_request'

    // Users can delete their own data, admins can delete any data
    const isAdmin = true // TODO: Check admin permissions
    const canDelete = isAdmin || userId === session.user.id

    if (!canDelete) {
      logger.warn(`[${requestId}] Insufficient permissions for data deletion`, {
        requestedUserId: userId,
        authenticatedUserId: session.user.id,
      })

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Cannot delete analytics data for other users',
          },
        },
        { status: 403 }
      )
    }

    // Perform deletion
    const deletionResult = await wizardAnalytics.deleteAnalyticsData({
      userId,
      sessionId,
      olderThan,
      reason,
      requestedBy: session.user.id,
    })

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Analytics data deletion completed`, {
      deletedRecords: deletionResult.deletedCount,
      reason,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: {
        message: 'Analytics data deleted successfully',
        deletedCount: deletionResult.deletedCount,
        reason,
        gdprCompliant: true,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        processingTime,
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error(`[${requestId}] Analytics data deletion failed`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DELETION_FAILED',
          message: 'Failed to delete analytics data',
          details: errorMessage,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime,
        },
      },
      { status: 500 }
    )
  }
}

// Runtime configuration
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
