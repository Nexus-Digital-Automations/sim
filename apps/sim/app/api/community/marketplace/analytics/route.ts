/**
 * Marketplace Analytics API - Usage Tracking and Performance Metrics
 *
 * This API provides comprehensive analytics functionality including:
 * - User interaction tracking (searches, views, downloads, shares)
 * - Template performance metrics and usage patterns
 * - Community engagement analytics and trend analysis
 * - Real-time event processing with batching optimization
 * - GDPR-compliant data collection and privacy protection
 *
 * Features:
 * - High-throughput event ingestion with async processing
 * - Aggregated metrics calculation for dashboards
 * - Privacy-preserving analytics with data anonymization
 * - Performance monitoring and optimization insights
 * - Integration with business intelligence and reporting
 *
 * @author Claude Code Template Marketplace System
 * @version 1.0.0
 */

import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { templateAnalyticsEvents, templatePerformanceMetrics, templates } from '@/db/schema'

const logger = createLogger('MarketplaceAnalyticsAPI')

/**
 * Analytics Event Types
 */
type AnalyticsEventType =
  | 'marketplace_view'
  | 'search_query'
  | 'template_view'
  | 'template_click'
  | 'template_download'
  | 'template_star'
  | 'template_share'
  | 'template_instantiate'
  | 'category_click'
  | 'tag_click'
  | 'author_click'
  | 'filter_apply'
  | 'sort_change'

/**
 * Analytics Event Interface
 */
interface AnalyticsEvent {
  eventType: AnalyticsEventType
  templateId?: string
  userId?: string
  sessionId?: string
  data: Record<string, any>
  timestamp: string
  userAgent?: string
  ipAddress?: string
  referrer?: string
}

/**
 * Track Analytics Event - POST /api/community/marketplace/analytics
 *
 * Record user interaction events for analytics processing
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const body = (await request.json()) as AnalyticsEvent | AnalyticsEvent[]

    // Support both single events and batch events
    const events = Array.isArray(body) ? body : [body]

    if (events.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'No events provided',
          requestId,
        },
        { status: 400 }
      )
    }

    // Validate and sanitize events
    const validatedEvents = await Promise.all(
      events.map((event) => validateAndSanitizeEvent(event, request))
    )

    // Filter out invalid events with comprehensive type definition
    // Type assertion ensures all validated events have required properties
    // for database insertion and analytics processing
    const validEvents = validatedEvents.filter(Boolean) as Array<{
      id: string
      templateId: string | null
      userId: string | null
      sessionId: string | null
      eventType: string
      eventCategory: string
      eventAction: string
      eventLabel: string | null
      source: string | null
      referrerUrl: string | null
      userAgent: string | null
      ipAddress: string | null
      properties: Record<string, any>
      createdAt: Date
    }>

    if (validEvents.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'No valid events found',
          requestId,
        },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Analytics events received`, {
      totalEvents: events.length,
      validEvents: validEvents.length,
      eventTypes: [...new Set(validEvents.map((e) => e.eventType))],
    })

    // Batch insert events into database
    // Transform validated events to match database schema exactly
    // Each event requires proper type mapping to avoid database insertion errors
    const eventsForDatabase = validEvents.map((event) => ({
      id: event.id || crypto.randomUUID(),
      templateId: event.templateId,
      userId: event.userId,
      sessionId: event.sessionId,
      eventType: event.eventType,
      eventCategory: event.eventCategory,
      properties: event.properties || {},
      userAgent: event.userAgent,
      ipAddress: event.ipAddress,
      referrer: event.referrerUrl,
      createdAt: event.createdAt,
    }))

    await db.insert(templateAnalyticsEvents).values(eventsForDatabase)

    // Process events asynchronously (update counters, trigger aggregations)
    processEventsAsync(validEvents, requestId)

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Analytics events processed`, {
      processedEvents: validEvents.length,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      processed: validEvents.length,
      metadata: {
        requestId,
        processingTime,
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Analytics event tracking failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to track analytics events',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Get Analytics Data - GET /api/community/marketplace/analytics
 *
 * Retrieve aggregated analytics data for dashboards and reporting
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)

    // Extract parameters
    const metric = searchParams.get('metric') || 'overview'
    const templateId = searchParams.get('templateId')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const groupBy = searchParams.get('groupBy') || 'day'
    const limit = Math.min(1000, Math.max(1, Number.parseInt(searchParams.get('limit') || '100')))

    logger.info(`[${requestId}] Analytics data request`, {
      metric,
      templateId: `${templateId?.slice(0, 8)}...`,
      userId: `${userId?.slice(0, 8)}...`,
      startDate,
      endDate,
      groupBy,
    })

    let analyticsData

    switch (metric) {
      case 'overview':
        analyticsData = await getOverviewAnalytics(startDate, endDate)
        break
      case 'templates':
        analyticsData = await getTemplateAnalytics(templateId, startDate, endDate, groupBy, limit)
        break
      case 'search':
        analyticsData = await getSearchAnalytics(startDate, endDate, groupBy, limit)
        break
      case 'engagement':
        analyticsData = await getEngagementAnalytics(startDate, endDate, groupBy)
        break
      case 'performance':
        analyticsData = await getPerformanceAnalytics(templateId, startDate, endDate)
        break
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid metric',
            message: 'Supported metrics: overview, templates, search, engagement, performance',
            requestId,
          },
          { status: 400 }
        )
    }

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Analytics data retrieved`, {
      metric,
      dataPoints: Array.isArray(analyticsData)
        ? analyticsData.length
        : Object.keys(analyticsData || {}).length,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: analyticsData,
      metadata: {
        requestId,
        processingTime,
        metric,
        dateRange: startDate && endDate ? { startDate, endDate } : undefined,
        groupBy,
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Analytics data retrieval failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve analytics data',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Validate and sanitize analytics event
 */
async function validateAndSanitizeEvent(
  event: AnalyticsEvent,
  request: NextRequest
): Promise<any | null> {
  try {
    // Validate required fields
    if (!event.eventType || !event.timestamp) {
      return null
    }

    // Extract client information
    const userAgent = request.headers.get('user-agent') || event.userAgent
    const ipAddress = getClientIP(request) || event.ipAddress
    const referrer = request.headers.get('referer') || event.referrer

    // Categorize event
    const { category, action, label } = categorizeEvent(event)

    // Sanitize and structure event data
    return {
      id: crypto.randomUUID(),
      templateId: event.templateId || null,
      userId: event.userId || null,
      sessionId: event.sessionId || null,
      eventType: event.eventType,
      eventCategory: category,
      eventAction: action,
      eventLabel: label,
      source: extractSource(event.data),
      referrerUrl: referrer,
      userAgent: userAgent?.slice(0, 500), // Limit length
      ipAddress: anonymizeIP(ipAddress || null), // Anonymize for GDPR compliance
      countryCode: null, // Would be populated by IP geolocation service
      region: null,
      city: null,
      timezone: null,
      sessionDuration: null,
      pageViewsInSession: null,
      isReturningUser: null,
      templateVersionId: event.data?.templateVersionId || null,
      deploymentSuccess: event.data?.deploymentSuccess || null,
      errorMessage: event.data?.errorMessage || null,
      experimentId: event.data?.experimentId || null,
      variationId: event.data?.variationId || null,
      properties: sanitizeProperties(event.data),
      createdAt: new Date(event.timestamp),
    }
  } catch (error) {
    logger.warn('Failed to validate analytics event', {
      error: error instanceof Error ? error.message : 'Unknown error',
      eventType: event.eventType,
    })
    return null
  }
}

/**
 * Categorize event for analytics taxonomy
 */
function categorizeEvent(event: AnalyticsEvent): {
  category: string
  action: string
  label: string | null
} {
  switch (event.eventType) {
    case 'marketplace_view':
      return { category: 'engagement', action: 'page_view', label: 'marketplace' }
    case 'search_query':
      return { category: 'search', action: 'query', label: event.data?.query || null }
    case 'template_view':
      return { category: 'engagement', action: 'template_view', label: event.templateId || null }
    case 'template_click':
      return { category: 'engagement', action: 'template_click', label: event.templateId || null }
    case 'template_download':
      return { category: 'conversion', action: 'download', label: event.templateId || null }
    case 'template_star':
      return { category: 'social', action: 'star', label: event.templateId || null }
    case 'template_share':
      return { category: 'social', action: 'share', label: event.templateId || null }
    case 'template_instantiate':
      return { category: 'conversion', action: 'instantiate', label: event.templateId || null }
    default:
      return { category: 'other', action: event.eventType, label: null }
  }
}

/**
 * Extract source information from event data
 */
function extractSource(data: Record<string, any>): string | null {
  return data?.source || data?.utm_source || data?.referrer_type || null
}

/**
 * Anonymize IP address for GDPR compliance
 */
function anonymizeIP(ipAddress: string | null): string | null {
  if (!ipAddress) return null

  // For IPv4, zero out the last octet
  if (ipAddress.includes('.')) {
    const parts = ipAddress.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`
    }
  }

  // For IPv6, zero out the last 64 bits
  if (ipAddress.includes(':')) {
    const parts = ipAddress.split(':')
    if (parts.length >= 4) {
      return `${parts.slice(0, 4).join(':')}::0`
    }
  }

  return ipAddress
}

/**
 * Get client IP address from request headers
 */
function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || null
}

/**
 * Sanitize event properties
 */
function sanitizeProperties(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}

  // Allow only specific property types and limit values
  Object.entries(data || {}).forEach(([key, value]) => {
    if (typeof value === 'string' && value.length <= 1000) {
      sanitized[key] = value
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[key] = value
    } else if (typeof value === 'boolean') {
      sanitized[key] = value
    } else if (Array.isArray(value) && value.length <= 100) {
      sanitized[key] = value.slice(0, 100) // Limit array size
    }
  })

  return sanitized
}

/**
 * Process events asynchronously (counters, aggregations)
 */
async function processEventsAsync(events: any[], requestId: string): Promise<void> {
  try {
    // Update template view/download counters
    const templateEvents = events.filter((e) => e.templateId)
    const templateCounters = new Map<string, { views: number; downloads: number; stars: number }>()

    for (const event of templateEvents) {
      const counter = templateCounters.get(event.templateId!) || {
        views: 0,
        downloads: 0,
        stars: 0,
      }

      switch (event.eventType) {
        case 'template_view':
          counter.views++
          break
        case 'template_download':
        case 'template_instantiate':
          counter.downloads++
          break
        case 'template_star':
          counter.stars += event.eventAction === 'star' ? 1 : -1
          break
      }

      templateCounters.set(event.templateId!, counter)
    }

    // Update template counters in database
    for (const [templateId, counters] of templateCounters) {
      if (counters.views > 0) {
        await db
          .update(templates)
          .set({
            views: sql`${templates.views} + ${counters.views}`,
            updatedAt: new Date(),
          })
          .where(eq(templates.id, templateId))
      }

      if (counters.downloads > 0) {
        await db
          .update(templates)
          .set({
            downloadCount: sql`${templates.downloadCount} + ${counters.downloads}`,
            updatedAt: new Date(),
          })
          .where(eq(templates.id, templateId))
      }

      if (counters.stars !== 0) {
        await db
          .update(templates)
          .set({
            stars: sql`GREATEST(0, ${templates.stars} + ${counters.stars})`,
            updatedAt: new Date(),
          })
          .where(eq(templates.id, templateId))
      }
    }

    logger.info(`[${requestId}] Analytics events processed asynchronously`, {
      updatedTemplates: templateCounters.size,
      totalUpdates: Array.from(templateCounters.values()).reduce(
        (sum, c) => sum + c.views + c.downloads + Math.abs(c.stars),
        0
      ),
    })
  } catch (error) {
    logger.error(`[${requestId}] Async event processing failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get overview analytics
 */
async function getOverviewAnalytics(startDate?: string | null, endDate?: string | null) {
  const conditions = []

  if (startDate) {
    conditions.push(gte(templateAnalyticsEvents.createdAt, new Date(startDate)))
  }
  if (endDate) {
    conditions.push(lte(templateAnalyticsEvents.createdAt, new Date(endDate)))
  }

  const overview = await db
    .select({
      totalEvents: sql<number>`count(*)`,
      uniqueUsers: sql<number>`count(distinct ${templateAnalyticsEvents.userId}) filter (where ${templateAnalyticsEvents.userId} is not null)`,
      uniqueSessions: sql<number>`count(distinct ${templateAnalyticsEvents.sessionId}) filter (where ${templateAnalyticsEvents.sessionId} is not null)`,
      templateViews: sql<number>`count(*) filter (where ${templateAnalyticsEvents.eventType} = 'template_view')`,
      templateDownloads: sql<number>`count(*) filter (where ${templateAnalyticsEvents.eventType} = 'template_download')`,
      searchQueries: sql<number>`count(*) filter (where ${templateAnalyticsEvents.eventType} = 'search_query')`,
    })
    .from(templateAnalyticsEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)

  return overview[0] || {}
}

/**
 * Get template-specific analytics
 */
async function getTemplateAnalytics(
  templateId?: string | null,
  startDate?: string | null,
  endDate?: string | null,
  groupBy = 'day',
  limit = 100
) {
  const conditions = []

  if (templateId) {
    conditions.push(eq(templateAnalyticsEvents.templateId, templateId))
  }
  if (startDate) {
    conditions.push(gte(templateAnalyticsEvents.createdAt, new Date(startDate)))
  }
  if (endDate) {
    conditions.push(lte(templateAnalyticsEvents.createdAt, new Date(endDate)))
  }

  // Group by time period
  let dateGroup
  switch (groupBy) {
    case 'hour':
      dateGroup = sql`date_trunc('hour', ${templateAnalyticsEvents.createdAt})`
      break
    case 'week':
      dateGroup = sql`date_trunc('week', ${templateAnalyticsEvents.createdAt})`
      break
    case 'month':
      dateGroup = sql`date_trunc('month', ${templateAnalyticsEvents.createdAt})`
      break
    default:
      dateGroup = sql`date_trunc('day', ${templateAnalyticsEvents.createdAt})`
  }

  const analytics = await db
    .select({
      date: dateGroup,
      templateId: templateAnalyticsEvents.templateId,
      views: sql<number>`count(*) filter (where ${templateAnalyticsEvents.eventType} = 'template_view')`,
      clicks: sql<number>`count(*) filter (where ${templateAnalyticsEvents.eventType} = 'template_click')`,
      downloads: sql<number>`count(*) filter (where ${templateAnalyticsEvents.eventType} = 'template_download')`,
      instantiations: sql<number>`count(*) filter (where ${templateAnalyticsEvents.eventType} = 'template_instantiate')`,
      stars: sql<number>`count(*) filter (where ${templateAnalyticsEvents.eventType} = 'template_star')`,
      shares: sql<number>`count(*) filter (where ${templateAnalyticsEvents.eventType} = 'template_share')`,
      uniqueUsers: sql<number>`count(distinct ${templateAnalyticsEvents.userId}) filter (where ${templateAnalyticsEvents.userId} is not null)`,
    })
    .from(templateAnalyticsEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(dateGroup, templateAnalyticsEvents.templateId)
    .orderBy(desc(dateGroup))
    .limit(limit)

  return analytics
}

/**
 * Get search analytics
 */
async function getSearchAnalytics(
  startDate?: string | null,
  endDate?: string | null,
  groupBy = 'day',
  limit = 100
) {
  const conditions = [eq(templateAnalyticsEvents.eventType, 'search_query')]

  if (startDate) {
    conditions.push(gte(templateAnalyticsEvents.createdAt, new Date(startDate)))
  }
  if (endDate) {
    conditions.push(lte(templateAnalyticsEvents.createdAt, new Date(endDate)))
  }

  // Get popular search queries
  const popularQueries = await db
    .select({
      query: sql<string>`${templateAnalyticsEvents.properties}->>'query'`,
      count: sql<number>`count(*)`,
      uniqueUsers: sql<number>`count(distinct ${templateAnalyticsEvents.userId}) filter (where ${templateAnalyticsEvents.userId} is not null)`,
    })
    .from(templateAnalyticsEvents)
    .where(and(...conditions))
    .groupBy(sql`${templateAnalyticsEvents.properties}->>'query'`)
    .having(sql`${templateAnalyticsEvents.properties}->>'query' is not null`)
    .orderBy(desc(sql`count(*)`))
    .limit(limit)

  return popularQueries
}

/**
 * Get engagement analytics
 */
async function getEngagementAnalytics(
  startDate?: string | null,
  endDate?: string | null,
  groupBy = 'day'
) {
  const conditions = []

  if (startDate) {
    conditions.push(gte(templateAnalyticsEvents.createdAt, new Date(startDate)))
  }
  if (endDate) {
    conditions.push(lte(templateAnalyticsEvents.createdAt, new Date(endDate)))
  }

  // Group by time period
  let dateGroup
  switch (groupBy) {
    case 'hour':
      dateGroup = sql`date_trunc('hour', ${templateAnalyticsEvents.createdAt})`
      break
    case 'week':
      dateGroup = sql`date_trunc('week', ${templateAnalyticsEvents.createdAt})`
      break
    case 'month':
      dateGroup = sql`date_trunc('month', ${templateAnalyticsEvents.createdAt})`
      break
    default:
      dateGroup = sql`date_trunc('day', ${templateAnalyticsEvents.createdAt})`
  }

  const engagement = await db
    .select({
      date: dateGroup,
      totalEvents: sql<number>`count(*)`,
      uniqueUsers: sql<number>`count(distinct ${templateAnalyticsEvents.userId}) filter (where ${templateAnalyticsEvents.userId} is not null)`,
      uniqueSessions: sql<number>`count(distinct ${templateAnalyticsEvents.sessionId}) filter (where ${templateAnalyticsEvents.sessionId} is not null)`,
      bounceRate: sql<number>`
        (count(*) filter (where ${templateAnalyticsEvents.eventType} = 'marketplace_view')::float / 
         nullif(count(distinct ${templateAnalyticsEvents.sessionId}) filter (where ${templateAnalyticsEvents.sessionId} is not null), 0)) * 100
      `,
    })
    .from(templateAnalyticsEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(dateGroup)
    .orderBy(desc(dateGroup))
    .limit(30) // Last 30 time periods

  return engagement
}

/**
 * Get performance analytics
 */
async function getPerformanceAnalytics(
  templateId?: string | null,
  startDate?: string | null,
  endDate?: string | null
) {
  const conditions = []

  if (startDate) {
    conditions.push(gte(templatePerformanceMetrics.metricDate, new Date(startDate)))
  }
  if (endDate) {
    conditions.push(lte(templatePerformanceMetrics.metricDate, new Date(endDate)))
  }
  if (templateId) {
    conditions.push(eq(templatePerformanceMetrics.templateId, templateId))
  }

  const performance = await db
    .select({
      templateId: templatePerformanceMetrics.templateId,
      metricDate: templatePerformanceMetrics.metricDate,
      metricPeriod: templatePerformanceMetrics.metricPeriod,
      viewCount: templatePerformanceMetrics.viewCount,
      uniqueViews: templatePerformanceMetrics.uniqueViews,
      downloadCount: templatePerformanceMetrics.downloadCount,
      uniqueDownloads: templatePerformanceMetrics.uniqueDownloads,
      deploymentCount: templatePerformanceMetrics.deploymentCount,
      successfulDeployments: templatePerformanceMetrics.successfulDeployments,
      viewToDownloadRate: templatePerformanceMetrics.viewToDownloadRate,
      downloadToDeployRate: templatePerformanceMetrics.downloadToDeployRate,
      deploymentSuccessRate: templatePerformanceMetrics.deploymentSuccessRate,
      trendScore: templatePerformanceMetrics.trendScore,
      popularityRank: templatePerformanceMetrics.popularityRank,
    })
    .from(templatePerformanceMetrics)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(templatePerformanceMetrics.metricDate))
    .limit(100)

  return performance
}
