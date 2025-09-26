/**
 * Compliance Reporting API Routes
 * ===============================
 *
 * Next.js API routes for enterprise compliance reporting.
 * Provides endpoints for generating and accessing compliance reports.
 *
 * Endpoints:
 * - GET /api/enterprise/compliance/reports - Generate compliance report
 * - POST /api/enterprise/compliance/reports - Create custom report
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { createAuthContext } from '@/services/parlant'
import { complianceReportingService } from '@/services/parlant/compliance-reporting-service'
import { errorHandler } from '@/services/parlant/error-handler'

const logger = createLogger('ComplianceReportsAPI')

/**
 * Generate compliance report
 * GET /api/enterprise/compliance/reports
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('GET /api/enterprise/compliance/reports - Generating compliance report')

    // Get workspace and user from request headers/auth
    const workspaceId = request.headers.get('x-workspace-id')
    const userId = request.headers.get('x-user-id')

    if (!workspaceId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing workspace ID or user ID',
          code: 'MISSING_AUTH_CONTEXT',
        },
        { status: 400 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'summary'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const includeDetails = searchParams.get('includeDetails') === 'true'

    // Create auth context
    const auth = createAuthContext(userId, workspaceId, 'workspace', ['compliance:reports:read'])

    // Generate report through compliance service
    const report = await complianceReportingService.generateComplianceReport(
      {
        workspaceId,
        reportType: reportType as any,
        dateRange:
          startDate && endDate
            ? {
                start: new Date(startDate),
                end: new Date(endDate),
              }
            : undefined,
        includeDetails,
      },
      auth
    )

    logger.info('Compliance report generated successfully', {
      reportType,
      complianceScore: report.summary.complianceScore,
      violationCount: report.summary.totalViolations,
      workspaceId,
    })

    return NextResponse.json(
      {
        success: true,
        data: report,
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Failed to generate compliance report', { error })

    const handledError = errorHandler.handleError(error, 'api_compliance_reports_get')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'COMPLIANCE_REPORT_GENERATION_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}

/**
 * Create custom compliance report
 * POST /api/enterprise/compliance/reports
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/enterprise/compliance/reports - Creating custom compliance report')

    // Parse request body
    const body = await request.json()

    // Get workspace and user from request headers/auth
    const workspaceId = request.headers.get('x-workspace-id')
    const userId = request.headers.get('x-user-id')

    if (!workspaceId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing workspace ID or user ID',
          code: 'MISSING_AUTH_CONTEXT',
        },
        { status: 400 }
      )
    }

    // Create auth context
    const auth = createAuthContext(userId, workspaceId, 'workspace', ['compliance:reports:create'])

    // Create custom report through compliance service
    const report = await complianceReportingService.createCustomReport(
      {
        ...body,
        workspaceId,
        createdBy: userId,
      },
      auth
    )

    logger.info('Custom compliance report created successfully', {
      reportId: report.id,
      reportType: report.type,
      workspaceId,
    })

    return NextResponse.json(
      {
        success: true,
        data: report,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Failed to create custom compliance report', { error })

    const handledError = errorHandler.handleError(error, 'api_compliance_reports_post')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'CUSTOM_COMPLIANCE_REPORT_CREATION_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}
