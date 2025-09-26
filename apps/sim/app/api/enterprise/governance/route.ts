/**
 * Enterprise Governance API Routes
 * ================================
 *
 * Next.js API routes for enterprise governance and compliance management.
 * Provides endpoints for policy management, compliance checking, and audit trails.
 *
 * Endpoints:
 * - POST /api/enterprise/governance/policies - Create governance policy
 * - GET /api/enterprise/governance/health - System health check
 * - POST /api/enterprise/governance/check - Compliance check
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { createAuthContext } from '@/services/parlant'
import { errorHandler } from '@/services/parlant/error-handler'
import { governanceComplianceService } from '@/services/parlant/governance-compliance-service'

const logger = createLogger('EnterpriseGovernanceAPI')

/**
 * Create governance policy
 * POST /api/enterprise/governance/policies
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/enterprise/governance/policies - Creating governance policy')

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
    const auth = createAuthContext(userId, workspaceId, 'workspace', ['governance:policies:create'])

    // Create policy through governance service
    const result = await governanceComplianceService.createPolicy(body, auth)

    logger.info('Governance policy created successfully', {
      policyId: result.id,
      type: result.type,
      workspaceId,
    })

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Failed to create governance policy', { error })

    const handledError = errorHandler.handleError(error, 'api_governance_post')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'GOVERNANCE_POLICY_CREATION_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}

/**
 * Get governance health check
 * GET /api/enterprise/governance/health
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('GET /api/enterprise/governance/health - Governance health check')

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
    const auth = createAuthContext(userId, workspaceId, 'workspace', ['governance:health:read'])

    // Get health check through governance service
    const healthResult = await governanceComplianceService.healthCheck()

    logger.info('Governance health check completed', {
      status: healthResult.overall_status,
      workspaceId,
    })

    return NextResponse.json(
      {
        success: true,
        data: healthResult,
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Failed to get governance health check', { error })

    const handledError = errorHandler.handleError(error, 'api_governance_health_get')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'GOVERNANCE_HEALTH_CHECK_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}
