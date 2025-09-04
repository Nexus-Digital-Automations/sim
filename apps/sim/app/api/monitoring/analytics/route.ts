/**
 * Analytics API
 * Provides comprehensive workflow analytics and business intelligence endpoints
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { analyticsService } from '@/lib/monitoring/analytics/analytics-service'
import type {
  BusinessMetrics,
  MonitoringApiResponse,
  WorkflowAnalytics,
} from '@/lib/monitoring/types'

const logger = createLogger('AnalyticsAPI')

const TimeRangeSchema = z.object({
  start: z.string(),
  end: z.string(),
  granularity: z.enum(['minute', 'hour', 'day', 'week', 'month']).default('day'),
})

const WorkflowAnalyticsQuerySchema = z.object({
  workflowId: z.string(),
  timeRange: TimeRangeSchema,
  includeCostMetrics: z.coerce.boolean().default(true),
  includePerformanceMetrics: z.coerce.boolean().default(true),
  includeErrorAnalysis: z.coerce.boolean().default(true),
  includeBlockPerformance: z.coerce.boolean().default(false),
})

const BusinessMetricsQuerySchema = z.object({
  workspaceId: z.string(),
  timeRange: TimeRangeSchema,
  includeGrowthMetrics: z.coerce.boolean().default(true),
  includeUsageMetrics: z.coerce.boolean().default(true),
  includeCostEfficiency: z.coerce.boolean().default(true),
  includeReliabilityMetrics: z.coerce.boolean().default(true),
})

const ReportGenerationSchema = z.object({
  reportType: z.enum([
    'workflow_performance',
    'cost_analysis',
    'error_summary',
    'resource_utilization',
    'business_overview',
    'sla_compliance',
    'user_activity',
    'trend_analysis',
  ]),
  timeRange: TimeRangeSchema,
  workspaceId: z.string(),
  workflowIds: z.array(z.string()).optional(),
  includeCharts: z.coerce.boolean().default(true),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
  parameters: z.record(z.unknown()).optional(),
})

/**
 * GET /api/monitoring/analytics?type=workflow&workflowId=...
 * GET /api/monitoring/analytics?type=business&workspaceId=...
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized analytics access`)
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        } as MonitoringApiResponse,
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const analyticsType = searchParams.get('type')

    if (!analyticsType || !['workflow', 'business'].includes(analyticsType)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TYPE',
            message: 'Analytics type must be either "workflow" or "business"',
          },
        } as MonitoringApiResponse,
        { status: 400 }
      )
    }

    if (analyticsType === 'workflow') {
      // Workflow Analytics
      const params = WorkflowAnalyticsQuerySchema.parse({
        workflowId: searchParams.get('workflowId'),
        timeRange: {
          start: searchParams.get('startDate'),
          end: searchParams.get('endDate'),
          granularity: searchParams.get('granularity') || 'day',
        },
        includeCostMetrics: searchParams.get('includeCostMetrics') !== 'false',
        includePerformanceMetrics: searchParams.get('includePerformanceMetrics') !== 'false',
        includeErrorAnalysis: searchParams.get('includeErrorAnalysis') !== 'false',
        includeBlockPerformance: searchParams.get('includeBlockPerformance') === 'true',
      })

      logger.debug(`[${requestId}] Fetching workflow analytics`, {
        workflowId: params.workflowId,
        timeRange: `${params.timeRange.start} to ${params.timeRange.end}`,
        granularity: params.timeRange.granularity,
      })

      const analytics = await analyticsService.getWorkflowAnalytics(
        params.workflowId,
        params.timeRange
      )

      // Filter response based on include flags
      const filteredAnalytics: Partial<WorkflowAnalytics> = {
        workflowId: analytics.workflowId,
        workflowName: analytics.workflowName,
        timeRange: analytics.timeRange,
        executionMetrics: analytics.executionMetrics,
      }

      if (params.includeCostMetrics) {
        filteredAnalytics.costMetrics = analytics.costMetrics
      }

      if (params.includePerformanceMetrics) {
        filteredAnalytics.performanceMetrics = analytics.performanceMetrics
      }

      if (params.includeErrorAnalysis) {
        filteredAnalytics.errorAnalysis = analytics.errorAnalysis
      }

      if (params.includeBlockPerformance) {
        filteredAnalytics.blockPerformance = analytics.blockPerformance
      }

      const response: MonitoringApiResponse<Partial<WorkflowAnalytics>> = {
        success: true,
        data: filteredAnalytics,
      }

      logger.info(
        `[${requestId}] Successfully retrieved workflow analytics for ${params.workflowId}`
      )
      return NextResponse.json(response, { status: 200 })
    }
    // Business Analytics
    const params = BusinessMetricsQuerySchema.parse({
      workspaceId: searchParams.get('workspaceId'),
      timeRange: {
        start: searchParams.get('startDate'),
        end: searchParams.get('endDate'),
        granularity: searchParams.get('granularity') || 'day',
      },
      includeGrowthMetrics: searchParams.get('includeGrowthMetrics') !== 'false',
      includeUsageMetrics: searchParams.get('includeUsageMetrics') !== 'false',
      includeCostEfficiency: searchParams.get('includeCostEfficiency') !== 'false',
      includeReliabilityMetrics: searchParams.get('includeReliabilityMetrics') !== 'false',
    })

    logger.debug(`[${requestId}] Fetching business metrics`, {
      workspaceId: params.workspaceId,
      timeRange: `${params.timeRange.start} to ${params.timeRange.end}`,
    })

    const businessMetrics = await analyticsService.getBusinessMetrics(
      params.workspaceId,
      params.timeRange
    )

    // Filter response based on include flags
    const filteredMetrics: Partial<BusinessMetrics> = {
      timeRange: businessMetrics.timeRange,
      workspaceMetrics: businessMetrics.workspaceMetrics,
    }

    if (params.includeGrowthMetrics) {
      filteredMetrics.growthMetrics = businessMetrics.growthMetrics
    }

    if (params.includeUsageMetrics) {
      filteredMetrics.usageMetrics = businessMetrics.usageMetrics
    }

    if (params.includeReliabilityMetrics && businessMetrics.usageMetrics) {
      filteredMetrics.usageMetrics = {
        ...filteredMetrics.usageMetrics!,
        systemReliability: businessMetrics.usageMetrics.systemReliability,
      }
    }

    const response: MonitoringApiResponse<Partial<BusinessMetrics>> = {
      success: true,
      data: filteredMetrics,
    }

    logger.info(`[${requestId}] Successfully retrieved business metrics for ${params.workspaceId}`)
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid analytics request parameters`, { errors: error.errors })
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

    logger.error(`[${requestId}] Error fetching analytics:`, error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch analytics',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      } as MonitoringApiResponse,
      { status: 500 }
    )
  }
}

/**
 * POST /api/monitoring/analytics/reports
 * Generate custom analytics reports
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
    const params = ReportGenerationSchema.parse(body)

    logger.info(`[${requestId}] Generating ${params.reportType} report`, {
      workspaceId: params.workspaceId,
      timeRange: `${params.timeRange.start} to ${params.timeRange.end}`,
      format: params.format,
    })

    // Generate the report
    const reportData = await analyticsService.generateReport(params.reportType, {
      timeRange: params.timeRange,
      workspaceId: params.workspaceId,
      workflowIds: params.workflowIds,
      includeCharts: params.includeCharts,
      format: params.format,
      userId: session.user.id,
      ...params.parameters,
    })

    // For JSON format, return the data directly
    if (params.format === 'json') {
      const response: MonitoringApiResponse<any> = {
        success: true,
        data: {
          reportType: params.reportType,
          generatedAt: new Date().toISOString(),
          timeRange: params.timeRange,
          data: reportData,
        },
      }

      logger.info(`[${requestId}] Successfully generated ${params.reportType} report`)
      return NextResponse.json(response, { status: 200 })
    }

    // For CSV/PDF formats, return download info
    const response: MonitoringApiResponse<{ downloadUrl: string; expires: string }> = {
      success: true,
      data: {
        downloadUrl: `/api/monitoring/reports/download/${requestId}`,
        expires: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      },
    }

    logger.info(`[${requestId}] Generated downloadable ${params.format} report`)
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid report generation parameters`, { errors: error.errors })
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'Invalid report generation parameters',
            details: { errors: error.errors },
          },
        } as MonitoringApiResponse,
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error generating report:`, error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REPORT_GENERATION_ERROR',
          message: 'Failed to generate analytics report',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      } as MonitoringApiResponse,
      { status: 500 }
    )
  }
}

/**
 * PUT /api/monitoring/analytics/cache/invalidate
 * Invalidate analytics cache (admin function)
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
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
    const { workflowId, workspaceId, timeRange } = body

    logger.info(`[${requestId}] Invalidating analytics cache`, {
      workflowId,
      workspaceId,
      timeRange,
    })

    // Invalidate cache in analytics service
    await analyticsService.invalidateCache({
      workflowId,
      workspaceId,
      timeRange,
    })

    const response: MonitoringApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Analytics cache invalidated successfully' },
    }

    logger.info(`[${requestId}] Successfully invalidated analytics cache`)
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    logger.error(`[${requestId}] Error invalidating cache:`, error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CACHE_INVALIDATION_ERROR',
          message: 'Failed to invalidate analytics cache',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      } as MonitoringApiResponse,
      { status: 500 }
    )
  }
}
