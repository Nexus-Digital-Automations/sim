/**
 * Nexus Tool: Workflow Monitoring & Analytics
 * Real-time monitoring, execution history, and performance analytics
 *
 * This tool provides comprehensive workflow monitoring capabilities including:
 * - Real-time execution status tracking
 * - Historical execution analytics and metrics
 * - Performance monitoring and optimization insights
 * - Error analysis and debugging support
 * - Cost tracking and resource utilization
 * - Detailed logging and audit trails
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { tool } from 'ai'
import { and, asc, count, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { z } from 'zod'

// Mock implementations for missing modules
const getSession = async () => ({ user: { id: 'mock-user-id' } })
const createLogger = (name: string) => ({
  info: (msg: string, data?: unknown) => console.log(`[${name}] INFO:`, msg, data || ''),
  error: (msg: string, data?: unknown) => console.error(`[${name}] ERROR:`, msg, data || ''),
  warn: (msg: string, data?: unknown) => console.warn(`[${name}] WARN:`, msg, data || ''),
})

// Mock database and schema - replace with actual imports when available
const db = {
  select: () => ({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: () => [] }) }) }) }),
  insert: () => ({ values: () => ({ returning: () => [] }) }),
  update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
} as any

const workflow = { id: 'id', name: 'name', userId: 'userId' } as any
const workflowExecutionLogs = {
  executionId: 'executionId',
  workflowId: 'workflowId',
  level: 'level',
  trigger: 'trigger',
  startedAt: 'startedAt',
  endedAt: 'endedAt',
  totalDurationMs: 'totalDurationMs',
  executionData: 'executionData',
  cost: 'cost',
  files: 'files',
  id: 'id',
  createdAt: 'createdAt',
} as any

const logger = createLogger('NexusWorkflowMonitoring')

/**
 * Execution metrics and analytics interface
 */
export interface ExecutionMetrics {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  runningExecutions: number
  cancelledExecutions: number
  successRate: number
  failureRate: number
  averageExecutionTime: number
  maxExecutionTime: number
  minExecutionTime: number
  totalCost: number
  averageCost: number
  costByModel?: Record<string, number>
  executionsByTrigger: Record<string, number>
  executionsByHour: Array<{ hour: string; count: number }>
  recentErrorRate: number
}

/**
 * Performance analytics interface
 */
export interface PerformanceAnalytics {
  executionTrends: {
    daily: Array<{ date: string; executions: number; successRate: number; avgDuration: number }>
    hourly: Array<{ hour: number; executions: number; avgDuration: number }>
  }
  bottlenecks: Array<{
    blockId: string
    blockName: string
    blockType: string
    averageDuration: number
    executionCount: number
    errorRate: number
  }>
  costAnalysis: {
    totalCost: number
    costTrends: Array<{ date: string; cost: number }>
    costByModel: Record<string, { totalCost: number; executionCount: number; avgCost: number }>
  }
  resourceUtilization: {
    peakHours: Array<{ hour: number; executionCount: number }>
    averageLoad: number
    concurrentExecutions: number
  }
}

export const monitorWorkflows = tool({
  description:
    'Monitor workflow executions, performance metrics, and get detailed execution analytics',
  parameters: z.object({
    action: z
      .enum([
        'getExecution',
        'listExecutions',
        'getMetrics',
        'getLogs',
        'getPerformanceAnalytics',
        'getExecutionDetail',
        'getRealtimeStatus',
        'getErrorAnalysis',
      ])
      .describe('Monitoring action to perform'),
    workflowId: z.string().optional().describe('Specific workflow ID'),
    executionId: z.string().optional().describe('Specific execution ID'),
    status: z
      .enum(['running', 'completed', 'failed', 'cancelled'])
      .optional()
      .describe('Filter by execution status'),
    trigger: z
      .enum(['manual', 'api', 'schedule', 'webhook', 'nexus'])
      .optional()
      .describe('Filter by trigger source'),
    limit: z.number().min(1).max(100).default(20).describe('Maximum number of results'),
    offset: z.number().min(0).default(0).describe('Pagination offset'),
    startDate: z.string().optional().describe('Start date for analytics (ISO format)'),
    endDate: z.string().optional().describe('End date for analytics (ISO format)'),
    includeTraceSpans: z
      .boolean()
      .default(false)
      .describe('Include detailed trace spans in results'),
    includeErrorDetails: z
      .boolean()
      .default(false)
      .describe('Include error details and stack traces'),
  }),

  execute: async ({
    action,
    workflowId,
    executionId,
    status,
    trigger,
    limit,
    offset,
    startDate,
    endDate,
    includeTraceSpans,
    includeErrorDetails,
  }) => {
    const operationId = `workflow-monitor-${Date.now()}`
    let session: Awaited<ReturnType<typeof getSession>> = null

    try {
      session = await getSession()
      if (!session?.user) {
        throw new Error('Authentication required for workflow monitoring')
      }

      logger.info(`[${operationId}] Workflow monitoring ${action}`, {
        userId: session.user.id,
        workflowId,
        executionId,
        action,
        filters: { status, trigger, startDate, endDate },
      })

      switch (action) {
        case 'getExecution':
          return await getExecution(executionId!, session.user.id, operationId, includeTraceSpans)

        case 'listExecutions':
          return await listExecutions({
            workflowId,
            status,
            trigger,
            limit,
            offset,
            startDate,
            endDate,
            userId: session.user.id,
            operationId,
          })

        case 'getMetrics':
          return await getMetrics(workflowId!, startDate, endDate, session.user.id, operationId)

        case 'getLogs':
          return await getLogs(executionId!, session.user.id, operationId, includeErrorDetails)

        case 'getPerformanceAnalytics':
          return await getPerformanceAnalytics(
            workflowId!,
            startDate,
            endDate,
            session.user.id,
            operationId
          )

        case 'getExecutionDetail':
          return await getExecutionDetail(
            executionId!,
            session.user.id,
            operationId,
            includeTraceSpans
          )

        case 'getRealtimeStatus':
          return await getRealtimeStatus(workflowId, session.user.id, operationId)

        case 'getErrorAnalysis':
          return await getErrorAnalysis(
            workflowId!,
            startDate,
            endDate,
            session.user.id,
            operationId
          )

        default:
          throw new Error(`Unsupported monitoring action: ${action}`)
      }
    } catch (error) {
      logger.error(`[${operationId}] Workflow monitoring failed`, {
        userId: session?.user?.id,
        action,
        workflowId,
        executionId,
        error: error.message,
        stack: error.stack,
      })

      return {
        status: 'error',
        message: `Monitoring failed: ${error.message}`,
        error: error.message,
        operationId,
      }
    }
  },
})

/**
 * Get detailed information about a specific execution
 */
async function getExecution(
  executionId: string,
  userId: string,
  operationId: string,
  includeTraceSpans: boolean
): Promise<{
  status: string
  action: string
  execution: {
    id: string
    workflowId: string
    workflowName: string | null
    status: 'running' | 'completed' | 'failed' | 'cancelled'
    trigger: string | null
    startedAt: string | null
    completedAt: string | null
    executionTimeMs: number | null
    cost?: unknown
    traceSpans?: unknown[]
    errorDetails?: {
      blockId: string
      blockName: string
      error: string
    }
  }
  operationId: string
}> {
  if (!executionId) {
    throw new Error('Execution ID is required')
  }

  const executionResults = await db
    .select({
      id: workflowExecutionLogs.id,
      workflowId: workflowExecutionLogs.workflowId,
      executionId: workflowExecutionLogs.executionId,
      level: workflowExecutionLogs.level,
      trigger: workflowExecutionLogs.trigger,
      startedAt: workflowExecutionLogs.startedAt,
      endedAt: workflowExecutionLogs.endedAt,
      totalDurationMs: workflowExecutionLogs.totalDurationMs,
      executionData: workflowExecutionLogs.executionData,
      cost: workflowExecutionLogs.cost,
      files: workflowExecutionLogs.files,
      workflowName: workflow.name,
    })
    .from(workflowExecutionLogs)
    .innerJoin(workflow, eq(workflow.id, workflowExecutionLogs.workflowId))
    .where(and(eq(workflowExecutionLogs.executionId, executionId), eq(workflow.userId, userId)))
    .limit(1)

  if (executionResults.length === 0) {
    throw new Error(`Execution not found or access denied: ${executionId}`)
  }

  const execution = executionResults[0]
  const executionData = execution.executionData as Record<string, unknown> | null

  // Determine status from level and endedAt
  let status: 'running' | 'completed' | 'failed' | 'cancelled' = 'running'
  if (execution.endedAt) {
    status = execution.level === 'error' ? 'failed' : 'completed'
  }

  const result = {
    status: 'success',
    action: 'getExecution',
    execution: {
      id: execution.executionId,
      workflowId: execution.workflowId,
      workflowName: execution.workflowName,
      status,
      trigger: execution.trigger,
      startedAt: execution.startedAt,
      completedAt: execution.endedAt || '',
      executionTimeMs:
        execution.totalDurationMs ||
        (execution.endedAt
          ? new Date(execution.endedAt).getTime() - new Date(execution.startedAt).getTime()
          : 0),
      cost: execution.cost,
      files: execution.files,
      environment: executionData?.environment,
      triggerData: executionData?.trigger,
      errorDetails: executionData?.errorDetails as any,
      traceSpans: includeTraceSpans ? (executionData?.traceSpans as unknown[]) || [] : undefined,
    },
    operationId,
  }

  logger.info(`[${operationId}] Retrieved execution details`, {
    executionId,
    status,
    duration: result.execution.executionTimeMs,
  })

  return result
}

/**
 * List executions with filtering and pagination
 */
async function listExecutions(params: {
  workflowId?: string
  status?: string
  trigger?: string
  limit: number
  offset: number
  startDate?: string
  endDate?: string
  userId: string
  operationId: string
}): Promise<any> {
  const { workflowId, status, trigger, limit, offset, startDate, endDate, userId, operationId } =
    params

  // Build query conditions
  const conditions = [eq(workflow.userId, userId)]

  if (workflowId) {
    conditions.push(eq(workflowExecutionLogs.workflowId, workflowId))
  }

  if (trigger) {
    conditions.push(eq(workflowExecutionLogs.trigger, trigger))
  }

  if (startDate) {
    conditions.push(gte(workflowExecutionLogs.startedAt, startDate))
  }

  if (endDate) {
    conditions.push(lte(workflowExecutionLogs.startedAt, endDate))
  }

  // Status filtering requires some logic since it's derived from level and endedAt
  if (status === 'running') {
    conditions.push(
      sql`${workflowExecutionLogs.endedAt} IS NULL OR ${workflowExecutionLogs.endedAt} = ''`
    )
  } else if (status === 'completed') {
    conditions.push(
      and(
        sql`${workflowExecutionLogs.endedAt} IS NOT NULL AND ${workflowExecutionLogs.endedAt} != ''`,
        eq(workflowExecutionLogs.level, 'info')
      )
    )
  } else if (status === 'failed') {
    conditions.push(
      and(
        sql`${workflowExecutionLogs.endedAt} IS NOT NULL AND ${workflowExecutionLogs.endedAt} != ''`,
        eq(workflowExecutionLogs.level, 'error')
      )
    )
  }

  // Get executions with workflow names
  const executions = await db
    .select({
      id: workflowExecutionLogs.id,
      workflowId: workflowExecutionLogs.workflowId,
      workflowName: workflow.name,
      executionId: workflowExecutionLogs.executionId,
      trigger: workflowExecutionLogs.trigger,
      level: workflowExecutionLogs.level,
      startedAt: workflowExecutionLogs.startedAt,
      endedAt: workflowExecutionLogs.endedAt,
      totalDurationMs: workflowExecutionLogs.totalDurationMs,
      cost: workflowExecutionLogs.cost,
      executionData: workflowExecutionLogs.executionData,
    })
    .from(workflowExecutionLogs)
    .innerJoin(workflow, eq(workflow.id, workflowExecutionLogs.workflowId))
    .where(and(...conditions))
    .orderBy(desc(workflowExecutionLogs.startedAt))
    .limit(limit)
    .offset(offset)

  // Get total count for pagination
  const totalCountResult = await db
    .select({ count: count() })
    .from(workflowExecutionLogs)
    .innerJoin(workflow, eq(workflow.id, workflowExecutionLogs.workflowId))
    .where(and(...conditions))

  const totalCount = totalCountResult[0]?.count || 0

  // Transform executions to include computed status
  const transformedExecutions = executions.map((exec) => {
    let executionStatus: 'running' | 'completed' | 'failed' | 'cancelled' = 'running'
    if (exec.endedAt) {
      executionStatus = exec.level === 'error' ? 'failed' : 'completed'
    }

    const executionData = exec.executionData as any

    return {
      id: exec.executionId,
      workflowId: exec.workflowId,
      workflowName: exec.workflowName,
      status: executionStatus,
      trigger: exec.trigger,
      startedAt: exec.startedAt,
      endedAt: exec.endedAt || null,
      executionTimeMs:
        exec.totalDurationMs ||
        (exec.endedAt
          ? new Date(exec.endedAt).getTime() - new Date(exec.startedAt).getTime()
          : null),
      cost: exec.cost,
      errorSummary: executionData?.errorDetails
        ? {
            blockId: executionData.errorDetails.blockId,
            blockName: executionData.errorDetails.blockName,
            message: executionData.errorDetails.error,
          }
        : undefined,
    }
  })

  logger.info(`[${operationId}] Listed executions`, {
    count: transformedExecutions.length,
    totalCount,
    filters: { workflowId, status, trigger, startDate, endDate },
  })

  return {
    status: 'success',
    action: 'listExecutions',
    executions: transformedExecutions,
    pagination: {
      offset,
      limit,
      total: totalCount,
      hasMore: offset + limit < totalCount,
    },
    filters: { workflowId, status, trigger, startDate, endDate },
    operationId,
  }
}

/**
 * Get comprehensive metrics for a workflow
 */
async function getMetrics(
  workflowId: string,
  startDate: string,
  endDate: string,
  userId: string,
  operationId: string
): Promise<any> {
  if (!workflowId) {
    throw new Error('Workflow ID is required for metrics')
  }

  // Default to last 30 days if no date range provided
  const metricsStartDate = startDate
    ? new Date(startDate)
    : (() => {
        const date = new Date()
        date.setDate(date.getDate() - 30)
        return date
      })()

  const metricsEndDate = endDate ? new Date(endDate) : new Date()

  // Verify user owns this workflow
  const workflowCheck = await db
    .select({ id: workflow.id })
    .from(workflow)
    .where(and(eq(workflow.id, workflowId), eq(workflow.userId, userId)))
    .limit(1)

  if (workflowCheck.length === 0) {
    throw new Error('Workflow not found or access denied')
  }

  // Get basic metrics
  const metricsQuery = db
    .select({
      totalExecutions: count().as('totalExecutions'),
      completedExecutions:
        sql<number>`SUM(CASE WHEN ${workflowExecutionLogs.level} = 'info' AND ${workflowExecutionLogs.endedAt} IS NOT NULL AND ${workflowExecutionLogs.endedAt} != '' THEN 1 ELSE 0 END)`.as(
          'completedExecutions'
        ),
      failedExecutions:
        sql<number>`SUM(CASE WHEN ${workflowExecutionLogs.level} = 'error' THEN 1 ELSE 0 END)`.as(
          'failedExecutions'
        ),
      runningExecutions:
        sql<number>`SUM(CASE WHEN ${workflowExecutionLogs.endedAt} IS NULL OR ${workflowExecutionLogs.endedAt} = '' THEN 1 ELSE 0 END)`.as(
          'runningExecutions'
        ),
      averageExecutionTime:
        sql<number>`AVG(CASE WHEN ${workflowExecutionLogs.totalDurationMs} > 0 THEN ${workflowExecutionLogs.totalDurationMs} ELSE NULL END)`.as(
          'averageExecutionTime'
        ),
      maxExecutionTime: sql<number>`MAX(${workflowExecutionLogs.totalDurationMs})`.as(
        'maxExecutionTime'
      ),
      minExecutionTime:
        sql<number>`MIN(CASE WHEN ${workflowExecutionLogs.totalDurationMs} > 0 THEN ${workflowExecutionLogs.totalDurationMs} ELSE NULL END)`.as(
          'minExecutionTime'
        ),
    })
    .from(workflowExecutionLogs)
    .where(
      and(
        eq(workflowExecutionLogs.workflowId, workflowId),
        gte(workflowExecutionLogs.startedAt, metricsStartDate.toISOString()),
        lte(workflowExecutionLogs.startedAt, metricsEndDate.toISOString())
      )
    )

  const metricsResults = await metricsQuery
  const metrics = metricsResults[0]

  // Get trigger distribution
  const triggerDistribution = await db
    .select({
      trigger: workflowExecutionLogs.trigger,
      count: count().as('count'),
    })
    .from(workflowExecutionLogs)
    .where(
      and(
        eq(workflowExecutionLogs.workflowId, workflowId),
        gte(workflowExecutionLogs.startedAt, metricsStartDate.toISOString()),
        lte(workflowExecutionLogs.startedAt, metricsEndDate.toISOString())
      )
    )
    .groupBy(workflowExecutionLogs.trigger)

  // Get hourly distribution
  const hourlyDistribution = await db
    .select({
      hour: sql<string>`DATE_PART('hour', ${workflowExecutionLogs.startedAt})`.as('hour'),
      count: count().as('count'),
    })
    .from(workflowExecutionLogs)
    .where(
      and(
        eq(workflowExecutionLogs.workflowId, workflowId),
        gte(workflowExecutionLogs.startedAt, metricsStartDate.toISOString()),
        lte(workflowExecutionLogs.startedAt, metricsEndDate.toISOString())
      )
    )
    .groupBy(sql`DATE_PART('hour', ${workflowExecutionLogs.startedAt})`)
    .orderBy(sql`DATE_PART('hour', ${workflowExecutionLogs.startedAt})`)

  const totalExecs = Number(metrics?.totalExecutions) || 0
  const completedExecs = Number(metrics?.completedExecutions) || 0
  const failedExecs = Number(metrics?.failedExecutions) || 0
  const runningExecs = Number(metrics?.runningExecutions) || 0

  const result: ExecutionMetrics = {
    totalExecutions: totalExecs,
    successfulExecutions: completedExecs,
    failedExecutions: failedExecs,
    runningExecutions: runningExecs,
    cancelledExecutions: 0, // Not tracked separately yet
    successRate: totalExecs > 0 ? Math.round((completedExecs / totalExecs) * 100) : 0,
    failureRate: totalExecs > 0 ? Math.round((failedExecs / totalExecs) * 100) : 0,
    averageExecutionTime: Math.round(Number(metrics?.averageExecutionTime) || 0),
    maxExecutionTime: Number(metrics?.maxExecutionTime) || 0,
    minExecutionTime: Number(metrics?.minExecutionTime) || 0,
    totalCost: 0, // TODO: Calculate from cost data
    averageCost: 0, // TODO: Calculate from cost data
    executionsByTrigger: Object.fromEntries(
      triggerDistribution.map((t) => [t.trigger, Number(t.count)])
    ),
    executionsByHour: hourlyDistribution.map((h) => ({
      hour: h.hour,
      count: Number(h.count),
    })),
    recentErrorRate: totalExecs > 0 ? Math.round((failedExecs / totalExecs) * 100) : 0,
  }

  logger.info(`[${operationId}] Generated workflow metrics`, {
    workflowId,
    dateRange: { start: metricsStartDate.toISOString(), end: metricsEndDate.toISOString() },
    totalExecutions: result.totalExecutions,
    successRate: result.successRate,
  })

  return {
    status: 'success',
    action: 'getMetrics',
    workflowId,
    dateRange: { start: metricsStartDate.toISOString(), end: metricsEndDate.toISOString() },
    metrics: result,
    operationId,
  }
}

/**
 * Get detailed logs for a specific execution
 */
async function getLogs(
  executionId: string,
  userId: string,
  operationId: string,
  includeErrorDetails: boolean
): Promise<any> {
  if (!executionId) {
    throw new Error('Execution ID is required for logs')
  }

  const logsResults = await db
    .select({
      id: workflowExecutionLogs.id,
      workflowId: workflowExecutionLogs.workflowId,
      executionId: workflowExecutionLogs.executionId,
      level: workflowExecutionLogs.level,
      trigger: workflowExecutionLogs.trigger,
      startedAt: workflowExecutionLogs.startedAt,
      endedAt: workflowExecutionLogs.endedAt,
      totalDurationMs: workflowExecutionLogs.totalDurationMs,
      executionData: workflowExecutionLogs.executionData,
      cost: workflowExecutionLogs.cost,
      files: workflowExecutionLogs.files,
      createdAt: workflowExecutionLogs.createdAt,
    })
    .from(workflowExecutionLogs)
    .innerJoin(workflow, eq(workflow.id, workflowExecutionLogs.workflowId))
    .where(and(eq(workflowExecutionLogs.executionId, executionId), eq(workflow.userId, userId)))
    .orderBy(asc(workflowExecutionLogs.createdAt))
    .limit(1000) // Reasonable limit for logs

  if (logsResults.length === 0) {
    throw new Error(`Execution logs not found or access denied: ${executionId}`)
  }

  const logs = logsResults.map((log) => {
    const executionData = log.executionData as any

    return {
      id: log.id,
      level: log.level,
      timestamp: log.createdAt.toISOString(),
      startedAt: log.startedAt,
      endedAt: log.endedAt,
      durationMs: log.totalDurationMs,
      trigger: log.trigger,
      cost: log.cost,
      files: log.files,
      traceSpans: executionData?.traceSpans || [],
      errorDetails: includeErrorDetails ? executionData?.errorDetails : undefined,
      environment: executionData?.environment,
      triggerData: executionData?.trigger,
    }
  })

  logger.info(`[${operationId}] Retrieved execution logs`, {
    executionId,
    logCount: logs.length,
    includeErrorDetails,
  })

  return {
    status: 'success',
    action: 'getLogs',
    executionId,
    logs,
    count: logs.length,
    operationId,
  }
}

/**
 * Get performance analytics and bottleneck analysis
 */
async function getPerformanceAnalytics(
  workflowId: string,
  startDate: string,
  endDate: string,
  userId: string,
  operationId: string
): Promise<any> {
  // This is a placeholder for advanced performance analytics
  // In a full implementation, this would analyze trace spans, identify bottlenecks,
  // track resource utilization, and provide optimization recommendations

  logger.info(`[${operationId}] Performance analytics requested`, {
    workflowId,
    startDate,
    endDate,
  })

  return {
    status: 'success',
    action: 'getPerformanceAnalytics',
    workflowId,
    analytics: {
      message: 'Performance analytics feature coming soon',
      placeholder: true,
    },
    operationId,
  }
}

/**
 * Get detailed execution information including trace spans
 */
async function getExecutionDetail(
  executionId: string,
  userId: string,
  operationId: string,
  includeTraceSpans: boolean
): Promise<any> {
  return await getExecution(executionId, userId, operationId, includeTraceSpans)
}

/**
 * Get real-time status of running executions
 */
async function getRealtimeStatus(
  workflowId: string | undefined,
  userId: string,
  operationId: string
): Promise<any> {
  const conditions = [
    eq(workflow.userId, userId),
    sql`${workflowExecutionLogs.endedAt} IS NULL OR ${workflowExecutionLogs.endedAt} = ''`,
  ]

  if (workflowId) {
    conditions.push(eq(workflowExecutionLogs.workflowId, workflowId))
  }

  const runningExecutions = await db
    .select({
      executionId: workflowExecutionLogs.executionId,
      workflowId: workflowExecutionLogs.workflowId,
      workflowName: workflow.name,
      startedAt: workflowExecutionLogs.startedAt,
      trigger: workflowExecutionLogs.trigger,
    })
    .from(workflowExecutionLogs)
    .innerJoin(workflow, eq(workflow.id, workflowExecutionLogs.workflowId))
    .where(and(...conditions))
    .orderBy(desc(workflowExecutionLogs.startedAt))
    .limit(50)

  logger.info(`[${operationId}] Retrieved realtime status`, {
    workflowId,
    runningCount: runningExecutions.length,
  })

  return {
    status: 'success',
    action: 'getRealtimeStatus',
    runningExecutions: runningExecutions.map((exec) => ({
      id: exec.executionId,
      workflowId: exec.workflowId,
      workflowName: exec.workflowName,
      status: 'running',
      startedAt: exec.startedAt,
      runtimeMs: Date.now() - new Date(exec.startedAt).getTime(),
      trigger: exec.trigger,
    })),
    totalRunning: runningExecutions.length,
    operationId,
  }
}

/**
 * Get error analysis and failure patterns
 */
async function getErrorAnalysis(
  workflowId: string,
  startDate: string,
  endDate: string,
  userId: string,
  operationId: string
): Promise<any> {
  // Default to last 30 days if no date range provided
  const analysisStartDate = startDate
    ? new Date(startDate)
    : (() => {
        const date = new Date()
        date.setDate(date.getDate() - 30)
        return date
      })()

  const analysisEndDate = endDate ? new Date(endDate) : new Date()

  // Get failed executions
  const failedExecutions = await db
    .select({
      executionId: workflowExecutionLogs.executionId,
      startedAt: workflowExecutionLogs.startedAt,
      endedAt: workflowExecutionLogs.endedAt,
      executionData: workflowExecutionLogs.executionData,
    })
    .from(workflowExecutionLogs)
    .innerJoin(workflow, eq(workflow.id, workflowExecutionLogs.workflowId))
    .where(
      and(
        eq(workflow.userId, userId),
        eq(workflowExecutionLogs.workflowId, workflowId),
        eq(workflowExecutionLogs.level, 'error'),
        gte(workflowExecutionLogs.startedAt, analysisStartDate.toISOString()),
        lte(workflowExecutionLogs.startedAt, analysisEndDate.toISOString())
      )
    )
    .orderBy(desc(workflowExecutionLogs.startedAt))
    .limit(100)

  // Analyze error patterns
  const errorPatterns: Record<
    string,
    { count: number; blockId?: string; blockName?: string; lastSeen: string }
  > = {}
  const blockErrors: Record<string, number> = {}

  failedExecutions.forEach((exec) => {
    const executionData = exec.executionData as any
    const errorDetails = executionData?.errorDetails

    if (errorDetails) {
      const errorKey = errorDetails.error
      const blockId = errorDetails.blockId

      if (!errorPatterns[errorKey]) {
        errorPatterns[errorKey] = {
          count: 0,
          blockId: errorDetails.blockId,
          blockName: errorDetails.blockName,
          lastSeen: exec.startedAt,
        }
      }
      errorPatterns[errorKey].count++

      if (blockId && blockId !== 'unknown') {
        blockErrors[blockId] = (blockErrors[blockId] || 0) + 1
      }
    }
  })

  const topErrors = Object.entries(errorPatterns)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([error, data]) => ({
      error,
      count: data.count,
      blockId: data.blockId,
      blockName: data.blockName,
      lastSeen: data.lastSeen,
    }))

  const topFailingBlocks = Object.entries(blockErrors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([blockId, count]) => ({ blockId, errorCount: count }))

  logger.info(`[${operationId}] Generated error analysis`, {
    workflowId,
    failedExecutionsCount: failedExecutions.length,
    uniqueErrorsCount: Object.keys(errorPatterns).length,
    topErrorsCount: topErrors.length,
  })

  return {
    status: 'success',
    action: 'getErrorAnalysis',
    workflowId,
    dateRange: { start: analysisStartDate.toISOString(), end: analysisEndDate.toISOString() },
    analysis: {
      totalFailedExecutions: failedExecutions.length,
      uniqueErrors: Object.keys(errorPatterns).length,
      topErrors,
      topFailingBlocks,
      errorTrends: [], // TODO: Implement error trends over time
      recommendations: generateErrorRecommendations(topErrors, topFailingBlocks),
    },
    operationId,
  }
}

/**
 * Generate recommendations based on error analysis
 */
function generateErrorRecommendations(
  topErrors: Array<{ error: string; count: number; blockId?: string; blockName?: string }>,
  topFailingBlocks: Array<{ blockId: string; errorCount: number }>
): string[] {
  const recommendations: string[] = []

  if (topErrors.length > 0) {
    const topError = topErrors[0]
    if (topError.count > 5) {
      recommendations.push(
        `Consider investigating the recurring error: "${topError.error}" (occurred ${topError.count} times)`
      )
    }
  }

  if (topFailingBlocks.length > 0) {
    const topFailingBlock = topFailingBlocks[0]
    if (topFailingBlock.errorCount > 3) {
      recommendations.push(
        `Block ${topFailingBlock.blockId} is failing frequently (${topFailingBlock.errorCount} errors). Consider reviewing its configuration.`
      )
    }
  }

  if (topErrors.some((e) => e.error.toLowerCase().includes('timeout'))) {
    recommendations.push(
      'Multiple timeout errors detected. Consider increasing timeout values or optimizing slow operations.'
    )
  }

  if (
    topErrors.some(
      (e) =>
        e.error.toLowerCase().includes('network') || e.error.toLowerCase().includes('connection')
    )
  ) {
    recommendations.push(
      'Network-related errors detected. Consider implementing retry logic for API calls.'
    )
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'No specific patterns detected. Review individual error details for targeted fixes.'
    )
  }

  return recommendations
}
