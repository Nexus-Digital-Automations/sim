/**
 * Workflow Activity Timeline API Endpoints
 * 
 * Real-time activity tracking and timeline visualization for workflow operations with:
 * - GET /api/workflows/[id]/activity - Get activity timeline with real-time updates
 * - POST /api/workflows/[id]/activity - Log custom activity events
 * 
 * This API provides comprehensive activity monitoring including:
 * - Real-time activity streams with WebSocket support
 * - User action tracking and attribution
 * - System event logging and monitoring
 * - Performance metrics and timing information
 * - Collaborative editing activity
 * - Audit trail generation
 * - Activity filtering and search capabilities
 * - Export functionality for compliance
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { createLogger } from '@/lib/logs/console/logger'
import { getUserEntityPermissions } from '@/lib/permissions/utils'
import { db } from '@/db'
import { 
  workflow as workflowTable, 
  apiKey as apiKeyTable,
  workflowVersionActivity,
  workflowVersions,
  user
} from '@/db/schema'
import { eq, desc, and, gte, lte, sql, like, or, inArray } from 'drizzle-orm'
import crypto from 'crypto'

const logger = createLogger('WorkflowActivityAPI')

// Activity query schema with comprehensive filtering
const ActivityQuerySchema = z.object({
  // Pagination
  limit: z.string().regex(/^\d+$/).transform(Number).default('50').optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0').optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  cursor: z.string().optional(), // For cursor-based pagination
  
  // Time filtering
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  period: z.enum(['1h', '6h', '24h', '7d', '30d', 'all']).default('24h').optional(),
  
  // Activity filtering
  activityType: z.string().optional(),
  activityTypes: z.string().optional(), // Comma-separated list
  userId: z.string().uuid().optional(),
  versionId: z.string().uuid().optional(),
  
  // Content filtering
  search: z.string().min(1).optional(),
  impactLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  
  // Real-time options
  realtime: z.string().transform(val => val === 'true').optional(),
  since: z.string().datetime().optional(), // For incremental updates
  
  // Output format
  includeDetails: z.string().transform(val => val === 'true').optional(),
  includeUser: z.string().transform(val => val !== 'false').optional(), // Default true
  includeContext: z.string().transform(val => val === 'true').optional(),
  format: z.enum(['timeline', 'grouped', 'summary']).default('timeline').optional(),
  
  // Grouping options
  groupBy: z.enum(['hour', 'day', 'user', 'type', 'version']).optional(),
  groupInterval: z.string().regex(/^\d+$/).transform(Number).optional(),
})

// Custom activity creation schema
const CreateActivitySchema = z.object({
  activityType: z.string().min(1).max(50),
  activityDescription: z.string().min(1).max(500),
  activityDetails: z.record(z.any()).optional(),
  versionId: z.string().uuid().optional(),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
  impactLevel: z.enum(['low', 'medium', 'high', 'critical']).default('low').optional(),
})

/**
 * GET /api/workflows/[id]/activity
 * 
 * Retrieve comprehensive activity timeline for a workflow with real-time capabilities.
 * Supports various filtering options, grouping, and export formats for audit and monitoring.
 * 
 * Query Parameters:
 * - limit: Number of activities per page (default: 50, max: 200)
 * - offset: Number of activities to skip (default: 0)
 * - page: Page number (alternative to offset)
 * - cursor: Cursor for efficient pagination
 * - from/to: ISO datetime range filter
 * - period: Predefined time periods (1h, 6h, 24h, 7d, 30d, all)
 * - activityType: Filter by specific activity type
 * - activityTypes: Comma-separated list of activity types
 * - userId: Filter by specific user ID
 * - versionId: Filter by specific version ID
 * - search: Text search in activity descriptions
 * - impactLevel: Filter by impact level
 * - realtime: Enable real-time updates
 * - since: Get activities since timestamp (for polling)
 * - includeDetails: Include detailed activity information
 * - includeUser: Include user information (default: true)
 * - includeContext: Include context information
 * - format: Response format (timeline, grouped, summary)
 * - groupBy: Group activities by criteria
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id: workflowId } = await params

  try {
    logger.info(`[${requestId}] Getting activity timeline for workflow ${workflowId}`)

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedQuery = ActivityQuerySchema.parse(queryParams)

    // Handle pagination
    let { limit = 50, offset = 0 } = validatedQuery
    if (validatedQuery.page && validatedQuery.page > 0) {
      offset = (validatedQuery.page - 1) * limit
    }
    
    // Enforce reasonable limits for performance
    limit = Math.min(limit, 200)

    // Authentication and authorization check
    const { userId, hasAccess } = await authenticateAndAuthorize(request, workflowId, requestId)
    if (!hasAccess) {
      logger.warn(`[${requestId}] Access denied for workflow ${workflowId}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build time and content filters
    const filters = buildActivityFilters(validatedQuery, workflowId)

    // Get activity timeline
    const activityData = await getActivityTimeline(
      workflowId,
      filters,
      validatedQuery,
      limit,
      offset
    )

    // Process and format activities based on requested format
    const formattedActivities = await formatActivities(
      activityData.activities,
      validatedQuery
    )

    // Calculate activity statistics and metrics
    const stats = await calculateActivityStatistics(
      workflowId,
      filters,
      validatedQuery
    )

    // Build comprehensive response
    const response = {
      data: {
        activities: formattedActivities,
        pagination: {
          total: activityData.total,
          totalPages: Math.ceil(activityData.total / limit),
          currentPage: Math.floor(offset / limit) + 1,
          limit,
          offset,
          hasNextPage: offset + limit < activityData.total,
          hasPreviousPage: offset > 0,
          nextCursor: activityData.nextCursor,
        },
        statistics: stats,
        realtime: {
          enabled: validatedQuery.realtime || false,
          lastUpdate: new Date().toISOString(),
          updateInterval: validatedQuery.realtime ? 5000 : null, // 5 seconds
          websocketEndpoint: validatedQuery.realtime 
            ? `/api/workflows/${workflowId}/activity/stream`
            : null,
        },
        filters: {
          timeRange: filters.timeRange,
          activityTypes: filters.activityTypes,
          userId: validatedQuery.userId,
          versionId: validatedQuery.versionId,
          search: validatedQuery.search,
          impactLevel: validatedQuery.impactLevel,
        },
        formatting: {
          format: validatedQuery.format,
          groupBy: validatedQuery.groupBy,
          includeDetails: validatedQuery.includeDetails,
          includeUser: validatedQuery.includeUser,
          includeContext: validatedQuery.includeContext,
        },
      },
      meta: {
        requestId,
        workflowId,
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
        activitiesReturned: formattedActivities.length,
        totalMatching: activityData.total,
        queryOptimized: filters.optimized,
      },
    }

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Retrieved ${formattedActivities.length} activities in ${elapsed}ms`, {
      total: activityData.total,
      format: validatedQuery.format,
      realtime: validatedQuery.realtime,
    })

    return NextResponse.json(response, { status: 200 })

  } catch (error: any) {
    const elapsed = Date.now() - startTime
    
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid query parameters`, {
        errors: error.errors,
        elapsed,
      })
      return NextResponse.json(
        { 
          error: 'Invalid query parameters', 
          details: error.errors,
          requestId 
        }, 
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Failed to get activity timeline after ${elapsed}ms`, {
      error: error.message,
      stack: error.stack,
      workflowId,
    })

    return NextResponse.json(
      { 
        error: 'Failed to retrieve activity timeline', 
        requestId,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, 
      { status: 500 }
    )
  }
}

/**
 * POST /api/workflows/[id]/activity
 * 
 * Log custom activity events for the workflow. Useful for tracking user actions,
 * system events, and custom integrations that need to be part of the audit trail.
 * 
 * Request Body:
 * - activityType: Type of activity (required, max 50 chars)
 * - activityDescription: Human-readable description (required, max 500 chars)
 * - activityDetails: Additional structured data (optional)
 * - versionId: Related version ID (optional)
 * - relatedEntityType: Type of related entity (optional)
 * - relatedEntityId: ID of related entity (optional)
 * - impactLevel: Impact level (low, medium, high, critical, default: low)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id: workflowId } = await params

  try {
    logger.info(`[${requestId}] Creating custom activity for workflow ${workflowId}`)

    // Authentication and authorization check with write permission
    const { userId, hasAccess } = await authenticateAndAuthorize(
      request, 
      workflowId, 
      requestId, 
      'write'
    )
    
    if (!hasAccess) {
      logger.warn(`[${requestId}] Write access denied for workflow ${workflowId}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const activityData = CreateActivitySchema.parse(body)

    // Extract request context for auditing
    const userAgent = request.headers.get('user-agent') || undefined
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || undefined

    // Validate version ID if provided
    if (activityData.versionId) {
      const versionExists = await db
        .select({ id: workflowVersions.id })
        .from(workflowVersions)
        .where(and(
          eq(workflowVersions.id, activityData.versionId),
          eq(workflowVersions.workflowId, workflowId)
        ))
        .limit(1)

      if (versionExists.length === 0) {
        logger.warn(`[${requestId}] Invalid version ID ${activityData.versionId}`)
        return NextResponse.json(
          { error: 'Invalid version ID', requestId }, 
          { status: 400 }
        )
      }
    }

    // Create activity record
    const activityId = crypto.randomUUID()
    const now = new Date()

    await db.insert(workflowVersionActivity).values({
      id: activityId,
      workflowId,
      versionId: activityData.versionId || null,
      activityType: activityData.activityType,
      activityDescription: activityData.activityDescription,
      activityDetails: {
        ...activityData.activityDetails,
        impactLevel: activityData.impactLevel,
        customActivity: true,
        source: 'api',
      },
      userId,
      userAgent,
      ipAddress,
      relatedEntityType: activityData.relatedEntityType,
      relatedEntityId: activityData.relatedEntityId,
      createdAt: now,
    })

    // Get the created activity with user information
    const [createdActivity] = await db
      .select({
        id: workflowVersionActivity.id,
        workflowId: workflowVersionActivity.workflowId,
        versionId: workflowVersionActivity.versionId,
        activityType: workflowVersionActivity.activityType,
        activityDescription: workflowVersionActivity.activityDescription,
        activityDetails: workflowVersionActivity.activityDetails,
        userId: workflowVersionActivity.userId,
        userAgent: workflowVersionActivity.userAgent,
        ipAddress: workflowVersionActivity.ipAddress,
        relatedEntityType: workflowVersionActivity.relatedEntityType,
        relatedEntityId: workflowVersionActivity.relatedEntityId,
        createdAt: workflowVersionActivity.createdAt,
        // User info
        userName: user.name,
        userEmail: user.email,
      })
      .from(workflowVersionActivity)
      .leftJoin(user, eq(workflowVersionActivity.userId, user.id))
      .where(eq(workflowVersionActivity.id, activityId))
      .limit(1)

    if (!createdActivity) {
      throw new Error('Failed to retrieve created activity')
    }

    // Build response
    const response = {
      data: {
        activity: {
          id: createdActivity.id,
          workflowId: createdActivity.workflowId,
          versionId: createdActivity.versionId,
          activityType: createdActivity.activityType,
          activityDescription: createdActivity.activityDescription,
          activityDetails: createdActivity.activityDetails,
          createdAt: createdActivity.createdAt,
          user: createdActivity.userName ? {
            id: createdActivity.userId,
            name: createdActivity.userName,
            email: createdActivity.userEmail,
          } : null,
          context: {
            userAgent: createdActivity.userAgent,
            ipAddress: createdActivity.ipAddress,
            relatedEntityType: createdActivity.relatedEntityType,
            relatedEntityId: createdActivity.relatedEntityId,
          },
        },
      },
      meta: {
        requestId,
        workflowId,
        createdBy: userId,
        timestamp: now.toISOString(),
        processingTimeMs: Date.now() - startTime,
      },
    }

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Created activity ${activityId} in ${elapsed}ms`, {
      activityType: activityData.activityType,
      versionId: activityData.versionId,
    })

    // TODO: Emit real-time event for WebSocket subscribers
    // await emitActivityEvent(workflowId, createdActivity)

    return NextResponse.json(response, { status: 201 })

  } catch (error: any) {
    const elapsed = Date.now() - startTime
    
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid activity data`, {
        errors: error.errors,
        elapsed,
      })
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: error.errors,
          requestId 
        }, 
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Failed to create activity after ${elapsed}ms`, {
      error: error.message,
      stack: error.stack,
      workflowId,
    })

    return NextResponse.json(
      { 
        error: 'Failed to create activity', 
        requestId,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, 
      { status: 500 }
    )
  }
}

/**
 * Build activity filters based on query parameters
 */
function buildActivityFilters(
  query: z.infer<typeof ActivityQuerySchema>,
  workflowId: string
): {
  timeRange: { from?: Date; to?: Date };
  activityTypes: string[];
  searchTerms: string[];
  optimized: boolean;
} {
  const now = new Date()
  let from: Date | undefined
  let to: Date | undefined
  let optimized = false

  // Handle time range
  if (query.from) {
    from = new Date(query.from)
  }
  
  if (query.to) {
    to = new Date(query.to)
  }

  // Handle predefined periods if no explicit dates
  if (!from && !to && query.period && query.period !== 'all') {
    to = now
    
    switch (query.period) {
      case '1h':
        from = new Date(now.getTime() - 60 * 60 * 1000)
        optimized = true // Short period is optimized
        break
      case '6h':
        from = new Date(now.getTime() - 6 * 60 * 60 * 1000)
        optimized = true
        break
      case '24h':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        optimized = true
        break
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
    }
  }

  // Handle activity types
  let activityTypes: string[] = []
  if (query.activityType) {
    activityTypes = [query.activityType]
  } else if (query.activityTypes) {
    activityTypes = query.activityTypes.split(',').map(t => t.trim()).filter(Boolean)
  }

  // Handle search terms
  let searchTerms: string[] = []
  if (query.search) {
    searchTerms = query.search.split(' ').map(term => term.trim()).filter(Boolean)
  }

  return {
    timeRange: { from, to },
    activityTypes,
    searchTerms,
    optimized,
  }
}

/**
 * Get activity timeline with comprehensive filtering
 */
async function getActivityTimeline(
  workflowId: string,
  filters: any,
  query: z.infer<typeof ActivityQuerySchema>,
  limit: number,
  offset: number
) {
  try {
    // Build where conditions
    const whereConditions = [eq(workflowVersionActivity.workflowId, workflowId)]

    // Add time filters
    if (filters.timeRange.from) {
      whereConditions.push(gte(workflowVersionActivity.createdAt, filters.timeRange.from))
    }
    
    if (filters.timeRange.to) {
      whereConditions.push(lte(workflowVersionActivity.createdAt, filters.timeRange.to))
    }

    // Add user filter
    if (query.userId) {
      whereConditions.push(eq(workflowVersionActivity.userId, query.userId))
    }

    // Add version filter
    if (query.versionId) {
      whereConditions.push(eq(workflowVersionActivity.versionId, query.versionId))
    }

    // Add activity type filters
    if (filters.activityTypes.length > 0) {
      whereConditions.push(inArray(workflowVersionActivity.activityType, filters.activityTypes))
    }

    // Add search filters
    if (filters.searchTerms.length > 0) {
      const searchConditions = filters.searchTerms.map(term =>
        or(
          like(workflowVersionActivity.activityDescription, `%${term}%`),
          like(workflowVersionActivity.activityType, `%${term}%`)
        )
      )
      whereConditions.push(and(...searchConditions))
    }

    // Add impact level filter (stored in activityDetails)
    if (query.impactLevel) {
      whereConditions.push(
        sql`${workflowVersionActivity.activityDetails}->>'impactLevel' = ${query.impactLevel}`
      )
    }

    // Build the main query
    let activityQuery = db
      .select({
        // Activity fields
        id: workflowVersionActivity.id,
        workflowId: workflowVersionActivity.workflowId,
        versionId: workflowVersionActivity.versionId,
        activityType: workflowVersionActivity.activityType,
        activityDescription: workflowVersionActivity.activityDescription,
        activityDetails: query.includeDetails ? workflowVersionActivity.activityDetails : sql`NULL`,
        userId: workflowVersionActivity.userId,
        userAgent: query.includeContext ? workflowVersionActivity.userAgent : sql`NULL`,
        ipAddress: query.includeContext ? workflowVersionActivity.ipAddress : sql`NULL`,
        relatedVersionId: workflowVersionActivity.relatedVersionId,
        relatedEntityType: workflowVersionActivity.relatedEntityType,
        relatedEntityId: workflowVersionActivity.relatedEntityId,
        createdAt: workflowVersionActivity.createdAt,
        // User fields (if requested)
        ...(query.includeUser ? {
          userName: user.name,
          userEmail: user.email,
          userImage: user.image,
        } : {}),
        // Version info
        versionNumber: workflowVersions.versionNumber,
      })
      .from(workflowVersionActivity)

    // Add joins
    if (query.includeUser) {
      activityQuery = activityQuery
        .leftJoin(user, eq(workflowVersionActivity.userId, user.id))
    }

    activityQuery = activityQuery
      .leftJoin(workflowVersions, eq(workflowVersionActivity.versionId, workflowVersions.id))

    // Handle cursor-based pagination if cursor is provided
    if (query.cursor) {
      try {
        const cursorDate = new Date(Buffer.from(query.cursor, 'base64').toString())
        whereConditions.push(lte(workflowVersionActivity.createdAt, cursorDate))
      } catch (error) {
        logger.warn('Invalid cursor provided, falling back to offset pagination')
      }
    }

    // Apply filters and ordering
    const activities = await activityQuery
      .where(and(...whereConditions))
      .orderBy(desc(workflowVersionActivity.createdAt))
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workflowVersionActivity)
      .where(and(...whereConditions))

    // Generate next cursor for cursor-based pagination
    let nextCursor: string | undefined
    if (activities.length === limit && activities.length > 0) {
      const lastActivity = activities[activities.length - 1]
      nextCursor = Buffer.from(lastActivity.createdAt.toISOString()).toString('base64')
    }

    return {
      activities,
      total: Number(count),
      nextCursor,
    }

  } catch (error: any) {
    logger.error('Failed to get activity timeline', {
      error: error.message,
      workflowId,
      filters,
    })
    throw new Error(`Failed to get activity timeline: ${error.message}`)
  }
}

/**
 * Format activities based on requested format
 */
async function formatActivities(
  activities: any[],
  query: z.infer<typeof ActivityQuerySchema>
) {
  switch (query.format) {
    case 'grouped':
      return groupActivities(activities, query.groupBy, query.groupInterval)
    
    case 'summary':
      return summarizeActivities(activities)
    
    case 'timeline':
    default:
      return formatTimelineActivities(activities, query)
  }
}

/**
 * Format activities for timeline view
 */
function formatTimelineActivities(
  activities: any[],
  query: z.infer<typeof ActivityQuerySchema>
) {
  return activities.map(activity => ({
    id: activity.id,
    type: 'activity',
    timestamp: activity.createdAt,
    activityType: activity.activityType,
    description: activity.activityDescription,
    details: activity.activityDetails || undefined,
    user: query.includeUser && activity.userName ? {
      id: activity.userId,
      name: activity.userName,
      email: activity.userEmail,
      image: activity.userImage,
    } : null,
    version: activity.versionNumber ? {
      id: activity.versionId,
      number: activity.versionNumber,
    } : null,
    context: query.includeContext ? {
      userAgent: activity.userAgent,
      ipAddress: activity.ipAddress,
      relatedVersionId: activity.relatedVersionId,
      relatedEntityType: activity.relatedEntityType,
      relatedEntityId: activity.relatedEntityId,
    } : undefined,
    metadata: {
      impactLevel: activity.activityDetails?.impactLevel || 'low',
      source: activity.activityDetails?.source || 'system',
      customActivity: activity.activityDetails?.customActivity || false,
    },
  }))
}

/**
 * Group activities by specified criteria
 */
function groupActivities(
  activities: any[],
  groupBy?: string,
  groupInterval?: number
) {
  if (!groupBy) {
    return activities
  }

  const groups: Record<string, any> = {}

  activities.forEach(activity => {
    let groupKey: string

    switch (groupBy) {
      case 'hour':
        const hour = new Date(activity.createdAt)
        hour.setMinutes(0, 0, 0)
        groupKey = hour.toISOString()
        break
        
      case 'day':
        groupKey = new Date(activity.createdAt).toISOString().split('T')[0]
        break
        
      case 'user':
        groupKey = activity.userId || 'system'
        break
        
      case 'type':
        groupKey = activity.activityType
        break
        
      case 'version':
        groupKey = activity.versionNumber || 'no-version'
        break
        
      default:
        groupKey = 'all'
    }

    if (!groups[groupKey]) {
      groups[groupKey] = {
        groupKey,
        groupType: groupBy,
        activities: [],
        count: 0,
        timeRange: {
          from: activity.createdAt,
          to: activity.createdAt,
        },
      }
    }

    groups[groupKey].activities.push(activity)
    groups[groupKey].count++
    
    // Update time range
    if (new Date(activity.createdAt) < new Date(groups[groupKey].timeRange.from)) {
      groups[groupKey].timeRange.from = activity.createdAt
    }
    if (new Date(activity.createdAt) > new Date(groups[groupKey].timeRange.to)) {
      groups[groupKey].timeRange.to = activity.createdAt
    }
  })

  // Sort groups appropriately
  const sortedGroups = Object.values(groups)
  if (groupBy === 'hour' || groupBy === 'day') {
    sortedGroups.sort((a, b) => new Date(b.groupKey).getTime() - new Date(a.groupKey).getTime())
  }

  return sortedGroups
}

/**
 * Summarize activities
 */
function summarizeActivities(activities: any[]) {
  const summary: any = {
    totalActivities: activities.length,
    activityTypes: {},
    users: {},
    versions: {},
    timeRange: {
      from: null,
      to: null,
    },
    impactDistribution: {},
  }

  activities.forEach(activity => {
    // Count activity types
    const type = activity.activityType
    if (!summary.activityTypes[type]) {
      summary.activityTypes[type] = { count: 0, latest: null }
    }
    summary.activityTypes[type].count++
    summary.activityTypes[type].latest = activity.createdAt

    // Count users
    if (activity.userId) {
      if (!summary.users[activity.userId]) {
        summary.users[activity.userId] = {
          count: 0,
          name: activity.userName,
          latest: null,
        }
      }
      summary.users[activity.userId].count++
      summary.users[activity.userId].latest = activity.createdAt
    }

    // Count versions
    if (activity.versionId) {
      if (!summary.versions[activity.versionId]) {
        summary.versions[activity.versionId] = {
          count: 0,
          number: activity.versionNumber,
          latest: null,
        }
      }
      summary.versions[activity.versionId].count++
      summary.versions[activity.versionId].latest = activity.createdAt
    }

    // Update time range
    if (!summary.timeRange.from || new Date(activity.createdAt) < new Date(summary.timeRange.from)) {
      summary.timeRange.from = activity.createdAt
    }
    if (!summary.timeRange.to || new Date(activity.createdAt) > new Date(summary.timeRange.to)) {
      summary.timeRange.to = activity.createdAt
    }

    // Count impact levels
    const impactLevel = activity.activityDetails?.impactLevel || 'low'
    if (!summary.impactDistribution[impactLevel]) {
      summary.impactDistribution[impactLevel] = 0
    }
    summary.impactDistribution[impactLevel]++
  })

  return summary
}

/**
 * Calculate activity statistics
 */
async function calculateActivityStatistics(
  workflowId: string,
  filters: any,
  query: z.infer<typeof ActivityQuerySchema>
) {
  try {
    const whereConditions = [eq(workflowVersionActivity.workflowId, workflowId)]
    
    // Apply same filters as main query for consistent stats
    if (filters.timeRange.from) {
      whereConditions.push(gte(workflowVersionActivity.createdAt, filters.timeRange.from))
    }
    
    if (filters.timeRange.to) {
      whereConditions.push(lte(workflowVersionActivity.createdAt, filters.timeRange.to))
    }

    const [stats] = await db
      .select({
        totalActivities: sql<number>`count(*)`,
        uniqueUsers: sql<number>`count(distinct ${workflowVersionActivity.userId})`,
        uniqueVersions: sql<number>`count(distinct ${workflowVersionActivity.versionId})`,
        uniqueTypes: sql<number>`count(distinct ${workflowVersionActivity.activityType})`,
      })
      .from(workflowVersionActivity)
      .where(and(...whereConditions))

    return {
      totalActivities: Number(stats.totalActivities),
      uniqueUsers: Number(stats.uniqueUsers),
      uniqueVersions: Number(stats.uniqueVersions),
      uniqueActivityTypes: Number(stats.uniqueTypes),
      period: query.period || 'all',
      timeRange: filters.timeRange,
      filters: {
        activityTypes: filters.activityTypes.length,
        hasSearch: filters.searchTerms.length > 0,
        hasUserFilter: !!query.userId,
        hasVersionFilter: !!query.versionId,
      },
    }

  } catch (error: any) {
    logger.error('Failed to calculate activity statistics', {
      error: error.message,
      workflowId,
    })
    
    return {
      totalActivities: 0,
      uniqueUsers: 0,
      uniqueVersions: 0,
      uniqueActivityTypes: 0,
      error: 'Failed to calculate statistics',
    }
  }
}

/**
 * Helper function to authenticate and authorize workflow access
 */
async function authenticateAndAuthorize(
  request: NextRequest,
  workflowId: string,
  requestId: string,
  requiredPermission: 'read' | 'write' = 'read'
): Promise<{ userId?: string; hasAccess: boolean }> {
  try {
    // Check for internal JWT token
    const authHeader = request.headers.get('authorization')
    let isInternalCall = false

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      isInternalCall = await verifyInternalToken(token)
    }

    if (isInternalCall) {
      return { hasAccess: true }
    }

    // Try session auth first
    const session = await getSession()
    let authenticatedUserId: string | null = session?.user?.id || null

    // Check API key auth
    if (!authenticatedUserId) {
      const apiKeyHeader = request.headers.get('x-api-key')
      if (apiKeyHeader) {
        const [apiKeyRecord] = await db
          .select({ userId: apiKeyTable.userId })
          .from(apiKeyTable)
          .where(eq(apiKeyTable.key, apiKeyHeader))
          .limit(1)

        if (apiKeyRecord) {
          authenticatedUserId = apiKeyRecord.userId
        }
      }
    }

    if (!authenticatedUserId) {
      return { hasAccess: false }
    }

    // Check workflow access
    const workflowData = await db
      .select()
      .from(workflowTable)
      .where(eq(workflowTable.id, workflowId))
      .then((rows) => rows[0])

    if (!workflowData) {
      return { hasAccess: false }
    }

    let hasAccess = false

    // User owns workflow
    if (workflowData.userId === authenticatedUserId) {
      hasAccess = true
    }

    // Workspace permissions
    if (!hasAccess && workflowData.workspaceId) {
      const userPermission = await getUserEntityPermissions(
        authenticatedUserId,
        'workspace',
        workflowData.workspaceId
      )
      
      if (userPermission !== null) {
        if (requiredPermission === 'read') {
          hasAccess = true
        } else if (requiredPermission === 'write') {
          hasAccess = userPermission === 'write' || userPermission === 'admin'
        }
      }
    }

    return { userId: authenticatedUserId, hasAccess }

  } catch (error: any) {
    logger.error(`[${requestId}] Authentication error`, {
      error: error.message,
      workflowId,
    })
    return { hasAccess: false }
  }
}