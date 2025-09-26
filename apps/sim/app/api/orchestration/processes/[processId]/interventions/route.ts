/**
 * Human Intervention API Routes
 * ==============================
 *
 * Next.js API routes for human intervention requests in orchestrated processes.
 * Provides endpoints for requesting and managing human interventions.
 *
 * Endpoints:
 * - POST /api/orchestration/processes/[processId]/interventions - Request human intervention
 * - GET /api/orchestration/processes/[processId]/interventions - List interventions for process
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { createAuthContext } from '@/services/parlant'
import { errorHandler } from '@/services/parlant/error-handler'
import type { RequestInterventionRequest } from '@/services/parlant/orchestration-api-service'
import { orchestrationAPIService } from '@/services/parlant/orchestration-api-service'

const logger = createLogger('HumanInterventionAPI')

interface RouteParams {
  params: {
    processId: string
  }
}

/**
 * Request human intervention
 * POST /api/orchestration/processes/[processId]/interventions
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { processId } = params
    logger.info(
      `POST /api/orchestration/processes/${processId}/interventions - Requesting human intervention`
    )

    // Parse request body
    const body: RequestInterventionRequest = await request.json()

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
      'orchestration:interventions:create',
    ])

    // Request intervention through API service
    const result = await orchestrationAPIService.requestIntervention(processId, body, auth)

    logger.info('Human intervention requested successfully', {
      interventionId: result.data.id,
      processId,
      type: result.data.type,
      workspaceId,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    logger.error('Failed to request human intervention', { error, processId: params.processId })

    const handledError = errorHandler.handleError(error, 'api_interventions_post')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'INTERVENTION_REQUEST_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}

/**
 * List human interventions for process
 * GET /api/orchestration/processes/[processId]/interventions
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { processId } = params
    logger.info(
      `GET /api/orchestration/processes/${processId}/interventions - Listing interventions`
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
      'orchestration:interventions:list',
    ])

    // Get process details which includes interventions
    const processResult = await orchestrationAPIService.getProcess(processId, auth)
    const process = processResult.data

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = searchParams.get('limit')
      ? Number.parseInt(searchParams.get('limit')!, 10)
      : undefined
    const offset = searchParams.get('offset')
      ? Number.parseInt(searchParams.get('offset')!, 10)
      : undefined

    // Filter interventions
    let interventions = process.humanInterventions

    if (status) {
      interventions = interventions.filter((i) => i.status === status)
    }

    if (type) {
      interventions = interventions.filter((i) => i.type === type)
    }

    // Apply pagination
    const total = interventions.length
    if (offset !== undefined) {
      interventions = interventions.slice(offset)
    }
    if (limit !== undefined) {
      interventions = interventions.slice(0, limit)
    }

    const hasMore = offset !== undefined && limit !== undefined ? offset + limit < total : false

    logger.info('Human interventions listed successfully', {
      count: interventions.length,
      total,
      processId,
      workspaceId,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          interventions,
          total,
          hasMore,
        },
        message: 'Human interventions retrieved successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Failed to list human interventions', { error, processId: params.processId })

    const handledError = errorHandler.handleError(error, 'api_interventions_get')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'INTERVENTION_LIST_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}
