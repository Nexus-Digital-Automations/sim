/**
 * Individual Human Intervention API Routes
 * =========================================
 *
 * Next.js API routes for responding to individual human intervention requests.
 * Provides endpoints for getting intervention details and responding to interventions.
 *
 * Endpoints:
 * - GET /api/orchestration/interventions/[interventionId] - Get intervention details
 * - PUT /api/orchestration/interventions/[interventionId] - Respond to intervention
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { createAuthContext } from '@/services/parlant'
import { errorHandler } from '@/services/parlant/error-handler'
import type { RespondToInterventionRequest } from '@/services/parlant/orchestration-api-service'
import { orchestrationAPIService } from '@/services/parlant/orchestration-api-service'

const logger = createLogger('InterventionAPI')

interface RouteParams {
  params: {
    interventionId: string
  }
}

/**
 * Get human intervention details
 * GET /api/orchestration/interventions/[interventionId]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { interventionId } = params
    logger.info(
      `GET /api/orchestration/interventions/${interventionId} - Getting intervention details`
    )

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
      'orchestration:interventions:read',
    ])

    // This would typically query the intervention directly
    // For now, we'll return a placeholder response
    // In a full implementation, this would query the orchestration service
    // to find the intervention by ID across all processes in the workspace

    logger.info('Human intervention retrieved successfully', {
      interventionId,
      workspaceId,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          id: interventionId,
          // Placeholder data - would be populated from orchestration service
        },
        message: 'Human intervention retrieved successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Failed to get human intervention', {
      error,
      interventionId: params.interventionId,
    })

    const handledError = errorHandler.handleError(error, 'api_intervention_get')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'INTERVENTION_GET_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}

/**
 * Respond to human intervention
 * PUT /api/orchestration/interventions/[interventionId]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { interventionId } = params
    logger.info(
      `PUT /api/orchestration/interventions/${interventionId} - Responding to intervention`
    )

    // Parse request body
    const body: RespondToInterventionRequest = await request.json()

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
      'orchestration:interventions:respond',
    ])

    // Respond to intervention through API service
    const result = await orchestrationAPIService.respondToIntervention(interventionId, body, auth)

    logger.info('Human intervention response processed successfully', {
      interventionId,
      action: body.action,
      workspaceId,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    logger.error('Failed to respond to human intervention', {
      error,
      interventionId: params.interventionId,
    })

    const handledError = errorHandler.handleError(error, 'api_intervention_put')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'INTERVENTION_RESPONSE_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}
