/**
 * Workflow History API Endpoints
 *
 * Comprehensive API for retrieving workflow change history with the following capabilities:
 * - GET /api/workflows/[id]/history - Get complete change history with filtering and pagination
 *
 * This API provides detailed historical tracking of all workflow changes including:
 * - Version creation and modification events
 * - Block and edge changes with before/after states
 * - User activity tracking with context
 * - Performance metrics and timing information
 * - Advanced filtering by time periods, users, change types, and impact levels
 *
 * Features:
 * - Timeline view of all workflow modifications
 * - Granular change tracking at entity level
 * - User attribution and context
 * - Impact analysis and breaking change detection
 * - Export capabilities for audit trails
 * - Real-time activity feed integration
 */

import crypto from 'crypto'
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { createLogger } from '@/lib/logs/console/logger'
import { getUserEntityPermissions } from '@/lib/permissions/utils'
import { db } from '@/db'
import {
  apiKey as apiKeyTable,
  user,
  workflow as workflowTable,
  workflowVersionActivity,
  workflowVersionChanges,
  workflowVersions,
} from '@/db/schema'

const logger = createLogger('WorkflowHistoryAPI')

// History query schema with comprehensive filtering options
const HistoryQuerySchema = z.object({
  // Pagination
  limit: z.string().regex(/^\d+$/).transform(Number).default('100').optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0').optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),

  // Time filtering
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  period: z.enum(['1h', '24h', '7d', '30d', '90d', 'all']).default('30d').optional(),

  // User and activity filtering
  userId: z.string().uuid().optional(),
  activityType: z.string().optional(),
  changeType: z.string().optional(),
  entityType: z.enum(['block', 'edge', 'loop', 'parallel', 'metadata', 'variable']).optional(),

  // Impact and severity filtering
  impactLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  breakingChanges: z
    .string()
    .transform((val) => val === 'true')
    .optional(),

  // Data inclusion options
  includeDetails: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  includeUserInfo: z
    .string()
    .transform((val) => val !== 'false')
    .optional(), // Default true
  includeChangeData: z
    .string()
    .transform((val) => val === 'true')
    .optional(),

  // Output format
  format: z.enum(['timeline', 'summary', 'detailed']).default('timeline').optional(),
  groupBy: z.enum(['date', 'user', 'type', 'version']).optional(),
})

/**
 * GET /api/workflows/[id]/history
 *
 * Retrieve comprehensive change history for a workflow with advanced filtering and formatting.
 * Provides timeline view of all modifications, version changes, and user activities.
 *
 * Query Parameters:
 * - limit: Number of history entries per page (default: 100, max: 500)
 * - offset: Number of entries to skip (default: 0)
 * - page: Page number (alternative to offset)
 * - from/to: ISO datetime strings for time range filtering
 * - period: Predefined time periods (1h, 24h, 7d, 30d, 90d, all)
 * - userId: Filter by specific user ID
 * - activityType: Filter by activity type (version_created, version_restored, etc.)
 * - changeType: Filter by change type (block_added, edge_modified, etc.)
 * - entityType: Filter by entity type (block, edge, loop, parallel, metadata, variable)
 * - impactLevel: Filter by impact level (low, medium, high, critical)
 * - breakingChanges: Show only breaking changes (true/false)
 * - includeDetails: Include detailed change information
 * - includeUserInfo: Include user information (default: true)
 * - includeChangeData: Include before/after change data
 * - format: Response format (timeline, summary, detailed)
 * - groupBy: Group results by date, user, type, or version
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id: workflowId } = await params

  try {
    logger.info(`[${requestId}] Getting history for workflow ${workflowId}`)

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedQuery = HistoryQuerySchema.parse(queryParams)

    // Handle pagination
    let { limit = 100, offset = 0 } = validatedQuery
    if (validatedQuery.page && validatedQuery.page > 0) {
      offset = (validatedQuery.page - 1) * limit
    }

    // Enforce reasonable limits for performance
    limit = Math.min(limit, 500)

    // Authentication and authorization check
    const { userId, hasAccess } = await authenticateAndAuthorize(request, workflowId, requestId)
    if (!hasAccess) {
      logger.warn(`[${requestId}] Access denied for workflow ${workflowId}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build time range filters
    const timeFilters = buildTimeFilters(validatedQuery)

    // Get activity history with comprehensive filtering
    const activityHistory = await getActivityHistory(
      workflowId,
      validatedQuery,
      timeFilters,
      limit,
      offset
    )

    // Get change history if detailed information is requested
    let changeHistory: any[] = []
    if (validatedQuery.includeDetails || validatedQuery.format === 'detailed') {
      const historyResult = await getChangeHistory(workflowId, validatedQuery, timeFilters, limit)
      changeHistory = historyResult.entries
    }

    // Merge and format history based on requested format
    const formattedHistory = await formatHistoryResponse(
      activityHistory,
      changeHistory,
      validatedQuery
    )

    // Calculate summary statistics
    const stats = await calculateHistoryStatistics(workflowId, timeFilters, validatedQuery)

    // Build comprehensive response
    const response = {
      data: {
        history: Array.isArray(formattedHistory) ? formattedHistory : formattedHistory.entries,
        pagination: {
          total: Array.isArray(formattedHistory) ? formattedHistory.length : formattedHistory.total,
          totalPages: Math.ceil(
            (Array.isArray(formattedHistory) ? formattedHistory.length : formattedHistory.total) /
              limit
          ),
          currentPage: Math.floor(offset / limit) + 1,
          limit,
          offset,
          hasNextPage:
            offset + limit <
            (Array.isArray(formattedHistory) ? formattedHistory.length : formattedHistory.total),
          hasPreviousPage: offset > 0,
        },
        statistics: stats,
        filters: {
          timeRange: timeFilters,
          activityType: validatedQuery.activityType,
          changeType: validatedQuery.changeType,
          entityType: validatedQuery.entityType,
          impactLevel: validatedQuery.impactLevel,
          breakingChanges: validatedQuery.breakingChanges,
          userId: validatedQuery.userId,
        },
        formatting: {
          format: validatedQuery.format,
          groupBy: validatedQuery.groupBy,
          includeDetails: validatedQuery.includeDetails,
          includeUserInfo: validatedQuery.includeUserInfo,
          includeChangeData: validatedQuery.includeChangeData,
        },
      },
      meta: {
        requestId,
        workflowId,
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
        entriesReturned: getFormattedHistoryLength(formattedHistory),
        totalMatching: getFormattedHistoryTotal(formattedHistory),
      },
    }

    const elapsed = Date.now() - startTime
    logger.info(
      `[${requestId}] Retrieved ${getFormattedHistoryLength(formattedHistory)} history entries in ${elapsed}ms`,
      {
        total: getFormattedHistoryTotal(formattedHistory),
        filters: validatedQuery,
      }
    )

    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    // Handle validation errors
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid query parameters`, {
        errors: error.errors,
        elapsed,
      })
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Failed to get history after ${elapsed}ms`, {
      error: error.message,
      stack: error.stack,
      workflowId,
    })

    return NextResponse.json(
      {
        error: 'Failed to retrieve workflow history',
        requestId,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * Build time range filters based on query parameters
 */
function buildTimeFilters(query: z.infer<typeof HistoryQuerySchema>): {
  from?: Date
  to?: Date
  period: string
} {
  const now = new Date()
  let from: Date | undefined
  let to: Date | undefined

  // Handle explicit from/to dates
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
        break
      case '24h':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
    }
  }

  return {
    from,
    to,
    period: query.period || 'all',
  }
}

/**
 * Get activity history with filtering
 */
async function getActivityHistory(
  workflowId: string,
  query: z.infer<typeof HistoryQuerySchema>,
  timeFilters: { from?: Date; to?: Date },
  limit: number,
  offset: number
) {
  try {
    // Build where conditions
    const whereConditions = [eq(workflowVersionActivity.workflowId, workflowId)]

    // Add time filters
    if (timeFilters.from) {
      whereConditions.push(gte(workflowVersionActivity.createdAt, timeFilters.from))
    }

    if (timeFilters.to) {
      whereConditions.push(lte(workflowVersionActivity.createdAt, timeFilters.to))
    }

    // Add user filter
    if (query.userId) {
      whereConditions.push(eq(workflowVersionActivity.userId, query.userId))
    }

    // Add activity type filter
    if (query.activityType) {
      whereConditions.push(eq(workflowVersionActivity.activityType, query.activityType))
    }

    // Build the query with optional user join
    const baseQuery = db
      .select({
        // Activity fields
        id: workflowVersionActivity.id,
        workflowId: workflowVersionActivity.workflowId,
        versionId: workflowVersionActivity.versionId,
        activityType: workflowVersionActivity.activityType,
        activityDescription: workflowVersionActivity.activityDescription,
        activityDetails: workflowVersionActivity.activityDetails,
        userId: workflowVersionActivity.userId,
        userAgent: workflowVersionActivity.userAgent,
        ipAddress: workflowVersionActivity.ipAddress,
        relatedVersionId: workflowVersionActivity.relatedVersionId,
        relatedEntityType: workflowVersionActivity.relatedEntityType,
        relatedEntityId: workflowVersionActivity.relatedEntityId,
        createdAt: workflowVersionActivity.createdAt,
        // User fields (if requested)
        ...(query.includeUserInfo
          ? {
              userName: user.name,
              userEmail: user.email,
              userImage: user.image,
            }
          : {}),
        // Version info
        versionNumber: workflowVersions.versionNumber,
      })
      .from(workflowVersionActivity)
      .leftJoin(workflowVersions, eq(workflowVersionActivity.versionId, workflowVersions.id))

    // Add user join conditionally to avoid type reassignment issues
    const activityQuery = query.includeUserInfo
      ? baseQuery.leftJoin(user, eq(workflowVersionActivity.userId, user.id))
      : baseQuery

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

    return {
      entries: activities,
      total: count,
    }
  } catch (error: any) {
    logger.error('Failed to get activity history', {
      error: error.message,
      workflowId,
      filters: query,
    })
    throw new Error(`Failed to get activity history: ${error.message}`)
  }
}

/**
 * Get change history with filtering
 */
async function getChangeHistory(
  workflowId: string,
  query: z.infer<typeof HistoryQuerySchema>,
  timeFilters: { from?: Date; to?: Date },
  limit: number
) {
  try {
    // Get version IDs for the workflow in the time range
    const versionWhereConditions = [eq(workflowVersions.workflowId, workflowId)]

    if (timeFilters.from) {
      versionWhereConditions.push(gte(workflowVersions.createdAt, timeFilters.from))
    }

    if (timeFilters.to) {
      versionWhereConditions.push(lte(workflowVersions.createdAt, timeFilters.to))
    }

    const relevantVersions = await db
      .select({ id: workflowVersions.id })
      .from(workflowVersions)
      .where(and(...versionWhereConditions))
      .orderBy(desc(workflowVersions.createdAt))

    if (relevantVersions.length === 0) {
      return { entries: [], total: 0 }
    }

    const versionIds = relevantVersions.map((v) => v.id)

    // Build change filters
    const changeWhereConditions = [inArray(workflowVersionChanges.versionId, versionIds)]

    if (query.changeType) {
      changeWhereConditions.push(eq(workflowVersionChanges.changeType, query.changeType))
    }

    if (query.entityType) {
      changeWhereConditions.push(eq(workflowVersionChanges.entityType, query.entityType))
    }

    if (query.impactLevel) {
      changeWhereConditions.push(eq(workflowVersionChanges.impactLevel, query.impactLevel))
    }

    if (query.breakingChanges) {
      changeWhereConditions.push(eq(workflowVersionChanges.breakingChange, true))
    }

    // Get changes with version information
    const changes = await db
      .select({
        // Change fields
        id: workflowVersionChanges.id,
        versionId: workflowVersionChanges.versionId,
        changeType: workflowVersionChanges.changeType,
        entityType: workflowVersionChanges.entityType,
        entityId: workflowVersionChanges.entityId,
        entityName: workflowVersionChanges.entityName,
        oldData: query.includeChangeData ? workflowVersionChanges.oldData : sql`NULL`,
        newData: query.includeChangeData ? workflowVersionChanges.newData : sql`NULL`,
        changeDescription: workflowVersionChanges.changeDescription,
        impactLevel: workflowVersionChanges.impactLevel,
        breakingChange: workflowVersionChanges.breakingChange,
        createdAt: workflowVersionChanges.createdAt,
        // Version info
        versionNumber: workflowVersions.versionNumber,
        versionType: workflowVersions.versionType,
      })
      .from(workflowVersionChanges)
      .leftJoin(workflowVersions, eq(workflowVersionChanges.versionId, workflowVersions.id))
      .where(and(...changeWhereConditions))
      .orderBy(desc(workflowVersionChanges.createdAt))
      .limit(limit * 2) // Get more changes since we're joining with activity

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workflowVersionChanges)
      .where(and(...changeWhereConditions))

    return {
      entries: changes,
      total: count,
    }
  } catch (error: any) {
    logger.error('Failed to get change history', {
      error: error.message,
      workflowId,
      filters: query,
    })
    throw new Error(`Failed to get change history: ${error.message}`)
  }
}

/**
 * Format history response based on requested format
 */
async function formatHistoryResponse(
  activityHistory: any,
  changeHistory: any,
  query: z.infer<typeof HistoryQuerySchema>
) {
  const { format = 'timeline', groupBy } = query

  switch (format) {
    case 'timeline':
      return formatTimelineResponse(activityHistory, changeHistory, groupBy)

    case 'summary':
      return formatSummaryResponse(activityHistory, changeHistory)

    case 'detailed':
      return formatDetailedResponse(activityHistory, changeHistory)

    default:
      return formatTimelineResponse(activityHistory, changeHistory, groupBy)
  }
}

/**
 * Format timeline response
 */
function formatTimelineResponse(activityHistory: any, changeHistory: any, groupBy?: string) {
  // Merge activities and changes into timeline
  const allEvents = [
    ...activityHistory.entries.map((activity: any) => ({
      type: 'activity',
      id: activity.id,
      timestamp: activity.createdAt,
      activityType: activity.activityType,
      description: activity.activityDescription,
      details: activity.activityDetails,
      user: activity.userName
        ? {
            id: activity.userId,
            name: activity.userName,
            email: activity.userEmail,
            image: activity.userImage,
          }
        : null,
      version: activity.versionNumber
        ? {
            id: activity.versionId,
            number: activity.versionNumber,
          }
        : null,
      context: {
        userAgent: activity.userAgent,
        ipAddress: activity.ipAddress,
        relatedVersionId: activity.relatedVersionId,
        relatedEntityType: activity.relatedEntityType,
        relatedEntityId: activity.relatedEntityId,
      },
    })),
    ...changeHistory.entries.map((change: any) => ({
      type: 'change',
      id: change.id,
      timestamp: change.createdAt,
      changeType: change.changeType,
      entityType: change.entityType,
      entityId: change.entityId,
      entityName: change.entityName,
      description: change.changeDescription,
      impactLevel: change.impactLevel,
      breakingChange: change.breakingChange,
      oldData: change.oldData,
      newData: change.newData,
      version: {
        id: change.versionId,
        number: change.versionNumber,
        type: change.versionType,
      },
    })),
  ]

  // Sort by timestamp (newest first)
  allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Apply grouping if requested
  if (groupBy) {
    return groupTimelineEvents(allEvents, groupBy, activityHistory.total + changeHistory.total)
  }

  return {
    entries: allEvents,
    total: activityHistory.total + changeHistory.total,
  }
}

/**
 * Format summary response
 */
function formatSummaryResponse(activityHistory: any, changeHistory: any) {
  // Group by activity/change types
  const activitySummary = activityHistory.entries.reduce((acc: any, activity: any) => {
    const type = activity.activityType
    if (!acc[type]) {
      acc[type] = { count: 0, latest: null, users: new Set() }
    }
    acc[type].count++
    acc[type].latest = activity.createdAt
    if (activity.userId) {
      acc[type].users.add(activity.userId)
    }
    return acc
  }, {})

  const changeSummary = changeHistory.entries.reduce((acc: any, change: any) => {
    const type = change.changeType
    if (!acc[type]) {
      acc[type] = {
        count: 0,
        breaking: 0,
        latest: null,
        entities: new Set(),
      }
    }
    acc[type].count++
    if (change.breakingChange) {
      acc[type].breaking++
    }
    acc[type].latest = change.createdAt
    acc[type].entities.add(`${change.entityType}:${change.entityId}`)
    return acc
  }, {})

  // Convert Sets to arrays for JSON serialization
  Object.keys(activitySummary).forEach((key) => {
    activitySummary[key].users = Array.from(activitySummary[key].users)
  })

  Object.keys(changeSummary).forEach((key) => {
    changeSummary[key].entities = Array.from(changeSummary[key].entities)
  })

  return {
    entries: {
      activities: activitySummary,
      changes: changeSummary,
      totals: {
        totalActivities: activityHistory.total,
        totalChanges: changeHistory.total,
        totalEvents: activityHistory.total + changeHistory.total,
      },
    },
    total: 1, // Summary is a single entry
  }
}

/**
 * Format detailed response
 */
function formatDetailedResponse(activityHistory: any, changeHistory: any) {
  return {
    entries: {
      activities: activityHistory.entries,
      changes: changeHistory.entries,
    },
    total: activityHistory.total + changeHistory.total,
  }
}

/**
 * Group timeline events
 */
function groupTimelineEvents(events: any[], groupBy: string, total: number) {
  const groups: any = {}

  events.forEach((event) => {
    let groupKey: string

    switch (groupBy) {
      case 'date':
        groupKey = new Date(event.timestamp).toISOString().split('T')[0]
        break
      case 'user':
        groupKey = event.user?.id || 'unknown'
        break
      case 'type':
        groupKey = event.type === 'activity' ? event.activityType : event.changeType
        break
      case 'version':
        groupKey = event.version?.number || 'unknown'
        break
      default:
        groupKey = 'all'
    }

    if (!groups[groupKey]) {
      groups[groupKey] = {
        groupKey,
        events: [],
        count: 0,
      }
    }

    groups[groupKey].events.push(event)
    groups[groupKey].count++
  })

  return {
    entries: Object.values(groups),
    total,
  }
}

/**
 * Calculate history statistics
 */
async function calculateHistoryStatistics(
  workflowId: string,
  timeFilters: { from?: Date; to?: Date },
  query: z.infer<typeof HistoryQuerySchema>
) {
  try {
    // Get basic activity statistics
    const whereConditions = [eq(workflowVersionActivity.workflowId, workflowId)]

    if (timeFilters.from) {
      whereConditions.push(gte(workflowVersionActivity.createdAt, timeFilters.from))
    }

    if (timeFilters.to) {
      whereConditions.push(lte(workflowVersionActivity.createdAt, timeFilters.to))
    }

    const [activityStats] = await db
      .select({
        totalActivities: sql<number>`count(*)`,
        uniqueUsers: sql<number>`count(distinct ${workflowVersionActivity.userId})`,
        uniqueVersions: sql<number>`count(distinct ${workflowVersionActivity.versionId})`,
      })
      .from(workflowVersionActivity)
      .where(and(...whereConditions))

    // Get change statistics
    const versionIds = await db
      .select({ id: workflowVersions.id })
      .from(workflowVersions)
      .where(eq(workflowVersions.workflowId, workflowId))
      .then((versions) => versions.map((v) => v.id))

    if (versionIds.length === 0) {
      return {
        activities: activityStats,
        changes: {
          totalChanges: 0,
          breakingChanges: 0,
          impactDistribution: {},
          entityDistribution: {},
        },
        period: query.period || 'all',
      }
    }

    const [changeStats] = await db
      .select({
        totalChanges: sql<number>`count(*)`,
        breakingChanges: sql<number>`sum(case when ${workflowVersionChanges.breakingChange} then 1 else 0 end)`,
      })
      .from(workflowVersionChanges)
      .where(inArray(workflowVersionChanges.versionId, versionIds))

    // Get impact level distribution
    const impactDistribution = await db
      .select({
        impactLevel: workflowVersionChanges.impactLevel,
        count: sql<number>`count(*)`,
      })
      .from(workflowVersionChanges)
      .where(inArray(workflowVersionChanges.versionId, versionIds))
      .groupBy(workflowVersionChanges.impactLevel)

    // Get entity type distribution
    const entityDistribution = await db
      .select({
        entityType: workflowVersionChanges.entityType,
        count: sql<number>`count(*)`,
      })
      .from(workflowVersionChanges)
      .where(inArray(workflowVersionChanges.versionId, versionIds))
      .groupBy(workflowVersionChanges.entityType)

    return {
      activities: {
        ...activityStats,
        totalActivities: Number(activityStats.totalActivities),
        uniqueUsers: Number(activityStats.uniqueUsers),
        uniqueVersions: Number(activityStats.uniqueVersions),
      },
      changes: {
        ...changeStats,
        totalChanges: Number(changeStats.totalChanges),
        breakingChanges: Number(changeStats.breakingChanges),
        impactDistribution: impactDistribution.reduce((acc: any, item) => {
          acc[item.impactLevel || 'unknown'] = Number(item.count)
          return acc
        }, {}),
        entityDistribution: entityDistribution.reduce((acc: any, item) => {
          acc[item.entityType] = Number(item.count)
          return acc
        }, {}),
      },
      period: query.period || 'all',
      timeRange: {
        from: timeFilters.from?.toISOString(),
        to: timeFilters.to?.toISOString(),
      },
    }
  } catch (error: any) {
    logger.error('Failed to calculate history statistics', {
      error: error.message,
      workflowId,
    })

    // Return basic stats on error
    return {
      activities: { totalActivities: 0, uniqueUsers: 0, uniqueVersions: 0 },
      changes: {
        totalChanges: 0,
        breakingChanges: 0,
        impactDistribution: {},
        entityDistribution: {},
      },
      period: query.period || 'all',
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
  requestId: string
): Promise<{ userId?: string; hasAccess: boolean }> {
  try {
    // Check for internal JWT token for server-side calls
    const authHeader = request.headers.get('authorization')
    let isInternalCall = false

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      isInternalCall = await verifyInternalToken(token)
    }

    if (isInternalCall) {
      return { hasAccess: true }
    }

    // Try session auth first (for web UI)
    const session = await getSession()
    let authenticatedUserId: string | null = session?.user?.id || null

    // If no session, check for API key auth
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

    // Check workflow access permissions
    const workflowData = await db
      .select()
      .from(workflowTable)
      .where(eq(workflowTable.id, workflowId))
      .then((rows) => rows[0])

    if (!workflowData) {
      return { hasAccess: false }
    }

    let hasAccess = false

    // User owns the workflow
    if (workflowData.userId === authenticatedUserId) {
      hasAccess = true
    }

    // Workflow belongs to workspace with user permissions
    if (!hasAccess && workflowData.workspaceId) {
      const userPermission = await getUserEntityPermissions(
        authenticatedUserId,
        'workspace',
        workflowData.workspaceId
      )

      if (userPermission !== null) {
        hasAccess = true // Read access for history
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

/**
 * Helper function to get the length of formatted history
 */
function getFormattedHistoryLength(formattedHistory: any): number {
  if (Array.isArray(formattedHistory)) {
    return formattedHistory.length
  }
  if (formattedHistory.entries) {
    if (Array.isArray(formattedHistory.entries)) {
      return formattedHistory.entries.length
    }
    // For detailed format where entries is an object
    if (typeof formattedHistory.entries === 'object') {
      const activities = formattedHistory.entries.activities || []
      const changes = formattedHistory.entries.changes || []
      return (
        (Array.isArray(activities) ? activities.length : 0) +
        (Array.isArray(changes) ? changes.length : 0)
      )
    }
  }
  return 0
}

/**
 * Helper function to get the total of formatted history
 */
function getFormattedHistoryTotal(formattedHistory: any): number {
  if (Array.isArray(formattedHistory)) {
    return formattedHistory.length
  }
  return formattedHistory.total || 0
}
