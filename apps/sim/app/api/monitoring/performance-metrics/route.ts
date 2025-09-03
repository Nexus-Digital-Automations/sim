/**
 * Performance Metrics API
 * Provides performance metrics collection and retrieval endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { performanceCollector } from '@/lib/monitoring/real-time/performance-collector'
import type { 
  MonitoringApiResponse, 
  PerformanceMetricsResponse,
  MetricsQuery,
  TimeRange 
} from '@/lib/monitoring/types'

const logger = createLogger('PerformanceMetricsAPI')

const QuerySchema = z.object({
  workflowIds: z.string().optional(), // Comma-separated
  executionIds: z.string().optional(), // Comma-separated
  blockIds: z.string().optional(), // Comma-separated
  startDate: z.string(),
  endDate: z.string(),
  granularity: z.enum(['minute', 'hour', 'day', 'week', 'month']).optional().default('hour'),
  aggregation: z.enum(['avg', 'sum', 'max', 'min', 'count']).optional(),
  groupBy: z.string().optional(), // Comma-separated: workflow,block,hour,day
  limit: z.coerce.number().min(1).max(1000).optional().default(100)
})

const MetricsSubmissionSchema = z.object({
  executionId: z.string(),
  workflowId: z.string().optional(),
  blockId: z.string(),
  metrics: z.object({
    executionTime: z.number().min(0),
    resourceUsage: z.object({
      cpu: z.number().min(0).max(100),
      memory: z.number().min(0),
      network: z.number().min(0)
    }),
    throughput: z.number().min(0).optional(),
    latency: z.number().min(0).optional(),
    errorRate: z.number().min(0).max(100).optional()
  })
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID().slice(0, 8)
  
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized performance metrics access`)
      return NextResponse.json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' } 
      } as MonitoringApiResponse, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = QuerySchema.parse(Object.fromEntries(searchParams.entries()))

    logger.debug(`[${requestId}] Fetching performance metrics`, {
      workflowIds: params.workflowIds?.split(',').length || 0,
      timeRange: `${params.startDate} to ${params.endDate}`,
      granularity: params.granularity
    })

    // Build metrics query
    const query: MetricsQuery = {
      timeRange: {
        start: params.startDate,
        end: params.endDate,
        granularity: params.granularity
      },
      aggregation: params.aggregation,
      workflowIds: params.workflowIds?.split(',').map(id => id.trim()).filter(Boolean),
      executionIds: params.executionIds?.split(',').map(id => id.trim()).filter(Boolean),
      blockIds: params.blockIds?.split(',').map(id => id.trim()).filter(Boolean)
    }

    if (params.groupBy) {
      query.groupBy = params.groupBy.split(',').map(g => g.trim()) as any
    }

    // Get metrics from collector
    const metrics = await performanceCollector.getMetrics(query)

    // Calculate aggregated statistics
    const executionTimes = metrics.map(m => m.metrics.executionTime)
    const cpuUsages = metrics.map(m => m.metrics.resourceUsage.cpu)
    const memoryUsages = metrics.map(m => m.metrics.resourceUsage.memory)

    const aggregation = {
      averageExecutionTime: executionTimes.length > 0 ? 
        executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length : 0,
      totalExecutions: metrics.length,
      successRate: metrics.length > 0 ? 
        (metrics.filter(m => !m.metrics.errorRate || m.metrics.errorRate === 0).length / metrics.length) * 100 : 0,
      resourceUtilization: {
        cpu: {
          timestamps: metrics.map(m => m.timestamp),
          values: cpuUsages,
          unit: '%',
          average: cpuUsages.length > 0 ? cpuUsages.reduce((sum, cpu) => sum + cpu, 0) / cpuUsages.length : 0,
          peak: cpuUsages.length > 0 ? Math.max(...cpuUsages) : 0
        },
        memory: {
          timestamps: metrics.map(m => m.timestamp),
          values: memoryUsages,
          unit: 'bytes',
          average: memoryUsages.length > 0 ? memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length : 0,
          peak: memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0
        },
        network: {
          timestamps: metrics.map(m => m.timestamp),
          values: metrics.map(m => m.metrics.resourceUsage.network),
          unit: 'bytes',
          average: 0,
          peak: 0
        },
        storage: {
          timestamps: metrics.map(m => m.timestamp),
          values: [],
          unit: 'GB',
          average: 0,
          peak: 0
        }
      }
    }

    // Apply limit
    const limitedMetrics = metrics.slice(0, params.limit)

    const response: MonitoringApiResponse<PerformanceMetricsResponse> = {
      success: true,
      data: {
        metrics: limitedMetrics,
        aggregation
      },
      pagination: {
        page: 1,
        pageSize: params.limit,
        total: metrics.length,
        totalPages: Math.ceil(metrics.length / params.limit)
      }
    }

    logger.info(`[${requestId}] Retrieved ${limitedMetrics.length} performance metrics`)

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid request parameters`, { errors: error.errors })
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Invalid request parameters',
          details: error.errors
        }
      } as MonitoringApiResponse, { status: 400 })
    }

    logger.error(`[${requestId}] Error fetching performance metrics:`, error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    } as MonitoringApiResponse, { status: 500 })
  }
}

/**
 * Submit performance metrics (for internal use by executor)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      } as MonitoringApiResponse, { status: 401 })
    }

    const body = await request.json()
    const validatedData = MetricsSubmissionSchema.parse(body)

    logger.debug(`[${requestId}] Submitting performance metrics`, {
      executionId: validatedData.executionId,
      blockId: validatedData.blockId,
      executionTime: validatedData.metrics.executionTime
    })

    // Submit metrics to collector
    await performanceCollector.collectMetrics(
      validatedData.executionId,
      validatedData.blockId,
      {
        executionId: validatedData.executionId,
        workflowId: validatedData.workflowId || 'unknown',
        blockId: validatedData.blockId,
        metrics: validatedData.metrics,
        timestamp: new Date().toISOString()
      }
    )

    const response: MonitoringApiResponse = {
      success: true,
      data: { message: 'Performance metrics submitted successfully' }
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid metrics submission`, { errors: error.errors })
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_METRICS',
          message: 'Invalid metrics data',
          details: error.errors
        }
      } as MonitoringApiResponse, { status: 400 })
    }

    logger.error(`[${requestId}] Error submitting performance metrics:`, error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SUBMISSION_ERROR',
        message: 'Failed to submit performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    } as MonitoringApiResponse, { status: 500 })
  }
}