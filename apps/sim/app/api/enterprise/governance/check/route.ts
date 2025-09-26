/**
 * Governance Compliance Check API Route
 * =====================================
 *
 * Next.js API route for real-time compliance checking of content.
 * Provides content validation against governance policies.
 *
 * Endpoints:
 * - POST /api/enterprise/governance/check - Check content compliance
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { createAuthContext } from '@/services/parlant'
import { errorHandler } from '@/services/parlant/error-handler'
import { governanceComplianceService } from '@/services/parlant/governance-compliance-service'

const logger = createLogger('GovernanceComplianceCheckAPI')

/**
 * Check content compliance
 * POST /api/enterprise/governance/check
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/enterprise/governance/check - Checking content compliance')

    // Parse request body
    const body = await request.json()
    const { content, context = {} } = body

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content is required for compliance check',
          code: 'MISSING_CONTENT',
        },
        { status: 400 }
      )
    }

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
    const auth = createAuthContext(userId, workspaceId, 'workspace', [
      'governance:compliance:check',
    ])

    // Check compliance through governance service
    const complianceResult = await governanceComplianceService.evaluateCompliance(
      content,
      { ...context, workspaceId, userId },
      auth
    )

    logger.info('Content compliance check completed', {
      compliant: complianceResult.compliant,
      riskScore: complianceResult.riskScore,
      violationsCount: complianceResult.violations?.length || 0,
      workspaceId,
    })

    return NextResponse.json(
      {
        success: true,
        data: complianceResult,
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Failed to check content compliance', { error })

    const handledError = errorHandler.handleError(error, 'api_compliance_check_post')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'COMPLIANCE_CHECK_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}
