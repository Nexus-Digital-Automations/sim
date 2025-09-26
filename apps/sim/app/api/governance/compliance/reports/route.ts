/**
 * Compliance Reports API Endpoint
 * ===============================
 *
 * RESTful API for compliance reporting, audit trail management, and
 * regulatory compliance tracking. Provides automated report generation
 * with multiple export formats and comprehensive analytics.
 *
 * Endpoints:
 * - POST /api/governance/compliance/reports - Generate compliance report
 * - GET /api/governance/compliance/reports - List and retrieve reports
 * - GET /api/governance/compliance/dashboard - Get compliance dashboard data
 * - POST /api/governance/compliance/export - Export audit trail
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import {
  complianceReportingService,
  generateComplianceSummary,
} from '@/services/parlant/compliance-reporting-service'
import type {
  ComplianceReportRequest,
  ReportFormat,
  ReportType,
} from '@/services/parlant/governance-compliance-types'

const logger = createLogger('ComplianceReportsAPI')

/**
 * POST /api/governance/compliance/reports
 *
 * Generate a new compliance report
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    // Parse request body
    const body = (await request.json()) as ComplianceReportRequest & { workspace_id: string }

    // Validate required fields
    if (!body.workspace_id || !body.report_type || !body.title) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['workspace_id', 'report_type', 'title'],
        },
        { status: 400 }
      )
    }

    // Validate date range
    if (!body.period_start || !body.period_end) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['period_start', 'period_end'],
        },
        { status: 400 }
      )
    }

    const startDate = new Date(body.period_start)
    const endDate = new Date(body.period_end)

    if (startDate >= endDate) {
      return NextResponse.json({ error: 'period_start must be before period_end' }, { status: 400 })
    }

    // Limit report period to prevent excessive data processing
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysDiff > 365) {
      return NextResponse.json({ error: 'Report period cannot exceed 365 days' }, { status: 400 })
    }

    // Get authentication context
    const userId = request.headers.get('x-user-id') || 'anonymous'
    const auth = {
      user_id: userId,
      workspace_id: body.workspace_id,
      key_type: 'workspace' as const,
    }

    // Generate compliance report
    const report = await complianceReportingService.generateComplianceReport(
      {
        report_type: body.report_type,
        title: body.title,
        description: body.description,
        period_start: body.period_start,
        period_end: body.period_end,
        format: body.format || 'json',
        include_recommendations: body.include_recommendations !== false,
        include_raw_data: body.include_raw_data === true,
        filters: body.filters,
      },
      body.workspace_id,
      auth
    )

    const responseTime = performance.now() - startTime

    logger.info('Compliance report generated', {
      reportId: report.id,
      workspaceId: body.workspace_id,
      reportType: report.report_type,
      format: report.format,
      violationsFound: report.metrics.violations_detected,
      complianceScore: report.metrics.compliance_score,
      responseTime,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          report,
          summary: {
            compliance_score: report.metrics.compliance_score,
            violations_detected: report.metrics.violations_detected,
            findings_count: report.findings.length,
            recommendations_count: report.recommendations.length,
            data_points_analyzed: report.metadata?.data_points_analyzed || 0,
          },
        },
        metadata: {
          responseTime: Math.round(responseTime),
          timestamp: new Date().toISOString(),
          report_generation_time: report.metadata?.generation_duration_ms || 0,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const responseTime = performance.now() - startTime

    logger.error('Failed to generate compliance report', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate compliance report',
        details: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Math.round(responseTime),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/governance/compliance/reports
 *
 * List and retrieve compliance reports
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    // Extract query parameters
    const url = new URL(request.url)
    const workspaceId = url.searchParams.get('workspace_id')
    const reportId = url.searchParams.get('report_id')
    const reportType = url.searchParams.get('report_type') as ReportType | null
    const status = url.searchParams.get('status')
    const limit = Number.parseInt(url.searchParams.get('limit') || '20', 10)
    const offset = Number.parseInt(url.searchParams.get('offset') || '0', 10)

    // Validate required parameters
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    // Get authentication context
    const userId = request.headers.get('x-user-id') || 'anonymous'
    const auth = {
      user_id: userId,
      workspace_id: workspaceId,
      key_type: 'workspace' as const,
    }

    let result: any

    if (reportId) {
      // Get specific report (simulated - in production would query database)
      result = {
        report_id: reportId,
        message: 'Specific report retrieval not fully implemented in this demo',
        note: 'This would return the complete report data including file paths and download links',
      }
    } else {
      // List reports with filtering
      result = {
        reports: [
          {
            id: 'report_001',
            workspace_id: workspaceId,
            report_type: 'policy_compliance',
            title: 'Monthly Policy Compliance Report',
            status: 'completed',
            generated_at: new Date().toISOString(),
            format: 'pdf',
            file_size: 2048576,
            compliance_score: 87,
          },
          {
            id: 'report_002',
            workspace_id: workspaceId,
            report_type: 'security_assessment',
            title: 'Weekly Security Assessment',
            status: 'completed',
            generated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            format: 'json',
            file_size: 1024000,
            compliance_score: 92,
          },
        ]
          .filter((report) => {
            if (reportType && report.report_type !== reportType) return false
            if (status && report.status !== status) return false
            return true
          })
          .slice(offset, offset + limit),
        filters_applied: {
          report_type: reportType,
          status,
          limit,
          offset,
        },
        total_reports: 15, // Would be calculated from database
      }
    }

    const responseTime = performance.now() - startTime

    logger.info('Compliance reports retrieved', {
      workspaceId,
      queryType: reportId ? 'single' : 'list',
      count: Array.isArray(result.reports) ? result.reports.length : 1,
      responseTime,
    })

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        responseTime: Math.round(responseTime),
        timestamp: new Date().toISOString(),
        query_type: reportId ? 'single_report' : 'report_list',
      },
    })
  } catch (error) {
    const responseTime = performance.now() - startTime

    logger.error('Failed to retrieve compliance reports', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve compliance reports',
        details: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Math.round(responseTime),
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/governance/compliance/reports
 *
 * Get compliance dashboard data with analytics
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    // Extract query parameters from body or URL
    const url = new URL(request.url)
    const body = await request.json().catch(() => ({}))

    const workspaceId = body.workspace_id || url.searchParams.get('workspace_id')
    const timeframe = body.timeframe || url.searchParams.get('timeframe') || 'month'

    // Validate required parameters
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    // Get authentication context
    const userId = request.headers.get('x-user-id') || 'anonymous'
    const auth = {
      user_id: userId,
      workspace_id: workspaceId,
      key_type: 'workspace' as const,
    }

    // Get dashboard data
    const dashboard = await complianceReportingService.getComplianceDashboard(
      workspaceId,
      timeframe as 'day' | 'week' | 'month' | 'year',
      auth
    )

    // Get compliance metrics
    const metrics = await complianceReportingService.getComplianceMetrics(workspaceId)

    // Generate quick compliance summary
    const summary = await generateComplianceSummary(workspaceId, timeframe === 'week' ? 7 : 30)

    const responseTime = performance.now() - startTime

    logger.info('Compliance dashboard generated', {
      workspaceId,
      timeframe,
      complianceScore: dashboard.overview.compliance_score,
      totalPolicies: dashboard.overview.total_policies,
      recentViolations: dashboard.overview.recent_violations,
      responseTime,
    })

    return NextResponse.json({
      success: true,
      data: {
        dashboard,
        metrics,
        summary,
        insights: {
          compliance_trend:
            dashboard.overview.compliance_score >= 80
              ? 'good'
              : dashboard.overview.compliance_score >= 60
                ? 'fair'
                : 'needs_attention',
          top_risk_areas: dashboard.top_violations.slice(0, 3).map((v) => v.type),
          improvement_opportunities: summary.recommendations.slice(0, 3),
          performance_indicators: {
            policies_active: dashboard.overview.active_policies,
            violations_this_period: dashboard.overview.recent_violations,
            compliance_score_change: '+2%', // Would be calculated from historical data
          },
        },
      },
      metadata: {
        responseTime: Math.round(responseTime),
        timestamp: new Date().toISOString(),
        timeframe,
        dashboard_version: '1.0.0',
      },
    })
  } catch (error) {
    const responseTime = performance.now() - startTime

    logger.error('Failed to generate compliance dashboard', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate compliance dashboard',
        details: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Math.round(responseTime),
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/governance/compliance/reports
 *
 * Export audit trail for specified period
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    // Parse request body
    const body = (await request.json()) as {
      workspace_id: string
      start_date: string
      end_date: string
      format: ReportFormat
      include_sensitive?: boolean
    }

    // Validate required fields
    if (!body.workspace_id || !body.start_date || !body.end_date || !body.format) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['workspace_id', 'start_date', 'end_date', 'format'],
        },
        { status: 400 }
      )
    }

    // Validate date range
    const startDate = new Date(body.start_date)
    const endDate = new Date(body.end_date)

    if (startDate >= endDate) {
      return NextResponse.json({ error: 'start_date must be before end_date' }, { status: 400 })
    }

    // Limit export period to prevent excessive data processing
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysDiff > 90) {
      return NextResponse.json({ error: 'Export period cannot exceed 90 days' }, { status: 400 })
    }

    // Validate format
    const supportedFormats = ['json', 'csv', 'xlsx']
    if (!supportedFormats.includes(body.format)) {
      return NextResponse.json(
        {
          error: 'Unsupported format',
          supported: supportedFormats,
        },
        { status: 400 }
      )
    }

    // Get authentication context
    const userId = request.headers.get('x-user-id') || 'anonymous'
    const auth = {
      user_id: userId,
      workspace_id: body.workspace_id,
      key_type: 'workspace' as const,
    }

    // Export audit trail
    const exportResult = await complianceReportingService.exportAuditTrail(
      body.workspace_id,
      body.start_date,
      body.end_date,
      body.format,
      auth
    )

    const responseTime = performance.now() - startTime

    logger.info('Audit trail exported', {
      workspaceId: body.workspace_id,
      format: body.format,
      eventsExported: exportResult.events_exported,
      fileSize: exportResult.file_size,
      exportDuration: exportResult.export_duration_ms,
      responseTime,
    })

    return NextResponse.json({
      success: true,
      data: {
        export_result: exportResult,
        download_info: {
          file_name: exportResult.file_path.split('/').pop(),
          file_size_mb: Math.round((exportResult.file_size / 1024 / 1024) * 100) / 100,
          estimated_download_time: Math.round(exportResult.file_size / 1024 / 128), // Assume 128KB/s connection
        },
        export_summary: {
          period: {
            start: body.start_date,
            end: body.end_date,
            days_covered: daysDiff,
          },
          data_exported: {
            total_events: exportResult.events_exported,
            format: body.format,
            includes_sensitive: body.include_sensitive || false,
          },
        },
      },
      metadata: {
        responseTime: Math.round(responseTime),
        timestamp: new Date().toISOString(),
        export_version: '1.0.0',
      },
    })
  } catch (error) {
    const responseTime = performance.now() - startTime

    logger.error('Failed to export audit trail', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export audit trail',
        details: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Math.round(responseTime),
      },
      { status: 500 }
    )
  }
}
