/**
 * Live Executions API
 * Provides real-time execution monitoring endpoints
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { executionMonitor } from '@/lib/monitoring/real-time/execution-monitor'
import type { LiveExecutionsResponse, MonitoringApiResponse } from '@/lib/monitoring/types'

const logger = createLogger('LiveExecutionsAPI')

const QuerySchema = z.object({
  workspaceId: z.string(),
  status: z.enum(['running', 'queued', 'completed', 'failed', 'cancelled']).optional(),
  workflowIds: z.string().optional(), // Comma-separated
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  includeStats: z.coerce.boolean().optional().default(true),
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized live executions access attempt`)
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        } as MonitoringApiResponse,
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const params = QuerySchema.parse(Object.fromEntries(searchParams.entries()))

    logger.debug(`[${requestId}] Fetching live executions`, {
      workspaceId: params.workspaceId,
      status: params.status,
      workflowIds: params.workflowIds,
    })

    // Get active executions for workspace
    const executions = await executionMonitor.getActiveExecutions(params.workspaceId)

    // Apply filters
    let filteredExecutions = executions

    if (params.status) {
      filteredExecutions = filteredExecutions.filter((exec) => exec.status === params.status)
    }

    if (params.workflowIds) {
      const workflowIdList = params.workflowIds.split(',').map((id) => id.trim())
      filteredExecutions = filteredExecutions.filter((exec) =>
        workflowIdList.includes(exec.workflowId)
      )
    }

    // Apply limit
    filteredExecutions = filteredExecutions.slice(0, params.limit)

    // Generate statistics (always provide default values)
    const allExecutions = executions
    const workspaceStats = params.includeStats ? {
      running: allExecutions.filter((e) => e.status === 'running').length,
      queued: allExecutions.filter((e) => e.status === 'queued').length,
      completed: allExecutions.filter((e) => e.status === 'completed').length,
      failed: allExecutions.filter((e) => e.status === 'failed').length,
    } : {
      running: 0,
      queued: 0,
      completed: 0,
      failed: 0,
    }

    const response: MonitoringApiResponse<LiveExecutionsResponse> = {
      success: true,
      data: {
        executions: filteredExecutions,
        total: filteredExecutions.length,
        workspaceStats,
      },
    }

    logger.info(`[${requestId}] Retrieved ${filteredExecutions.length} live executions`)

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid request parameters`, { errors: error.errors })
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'Invalid request parameters',
            details: { errors: error.errors },
          },
        } as MonitoringApiResponse,
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error fetching live executions:`, error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch live executions',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      } as MonitoringApiResponse,
      { status: 500 }
    )
  }
}

/**
 * Update execution status (for internal use by executor)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        } as MonitoringApiResponse,
        { status: 401 }
      )
    }

    const body = await request.json()
    const { executionId, status } = body

    if (!executionId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'MISSING_EXECUTION_ID', message: 'Execution ID is required' },
        } as MonitoringApiResponse,
        { status: 400 }
      )
    }

    logger.debug(`[${requestId}] Updating execution status`, {
      executionId,
      updates: Object.keys(status),
    })

    await executionMonitor.updateExecutionStatus(executionId, status)

    const response: MonitoringApiResponse = {
      success: true,
      data: { message: 'Execution status updated successfully' },
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    logger.error(`[${requestId}] Error updating execution status:`, error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update execution status',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      } as MonitoringApiResponse,
      { status: 500 }
    )
  }
}
