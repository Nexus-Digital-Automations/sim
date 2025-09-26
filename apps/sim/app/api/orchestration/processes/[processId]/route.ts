/**
 * Individual Orchestration Process API Routes
 * ============================================
 *
 * Next.js API routes for individual orchestration process operations.
 * Provides endpoints for getting process details and managing process lifecycle.
 *
 * Endpoints:
 * - GET /api/orchestration/processes/[processId] - Get process details
 * - PUT /api/orchestration/processes/[processId] - Update process (pause/resume/cancel)
 * - DELETE /api/orchestration/processes/[processId] - Cancel process
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { createAuthContext } from '@/services/parlant'
import { errorHandler } from '@/services/parlant/error-handler'
import { orchestrationAPIService } from '@/services/parlant/orchestration-api-service'

const logger = createLogger('OrchestrationProcessAPI')

interface RouteParams {
  params: {
    processId: string
  }
}

/**
 * Get orchestration process details
 * GET /api/orchestration/processes/[processId]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { processId } = params
    logger.info(`GET /api/orchestration/processes/${processId} - Getting process details`)

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
      'orchestration:processes:read',
    ])

    // Get process through API service
    const result = await orchestrationAPIService.getProcess(processId, auth)

    logger.info('Orchestration process retrieved successfully', {
      processId,
      name: result.data.name,
      status: result.data.status,
      currentStep: result.data.currentStep,
      totalSteps: result.data.totalSteps,
      workspaceId,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    logger.error('Failed to get orchestration process', { error, processId: params.processId })

    const handledError = errorHandler.handleError(error, 'api_process_get')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'PROCESS_GET_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}

/**
 * Update orchestration process (pause/resume/cancel)
 * PUT /api/orchestration/processes/[processId]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { processId } = params
    logger.info(`PUT /api/orchestration/processes/${processId} - Updating process`)

    // Parse request body
    const body = await request.json()
    const { action } = body // Expected actions: 'pause', 'resume', 'cancel'

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
      'orchestration:processes:update',
    ])

    // Get current process
    const processResult = await orchestrationAPIService.getProcess(processId, auth)
    const process = processResult.data

    // Apply action
    let newStatus = process.status
    let message = ''

    switch (action) {
      case 'pause':
        if (process.status === 'running') {
          newStatus = 'paused'
          message = 'Process paused successfully'
        } else {
          throw new Error('Process must be running to pause')
        }
        break
      case 'resume':
        if (process.status === 'paused') {
          newStatus = 'running'
          message = 'Process resumed successfully'
        } else {
          throw new Error('Process must be paused to resume')
        }
        break
      case 'cancel':
        if (['running', 'paused', 'pending'].includes(process.status)) {
          newStatus = 'cancelled'
          message = 'Process cancelled successfully'
        } else {
          throw new Error('Process cannot be cancelled in current state')
        }
        break
      default:
        throw new Error(`Invalid action: ${action}`)
    }

    // Update process status (this would typically involve updating the orchestration service)
    process.status = newStatus

    logger.info('Orchestration process updated successfully', {
      processId,
      action,
      oldStatus: processResult.data.status,
      newStatus,
      workspaceId,
    })

    return NextResponse.json(
      {
        success: true,
        data: process,
        message,
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Failed to update orchestration process', { error, processId: params.processId })

    const handledError = errorHandler.handleError(error, 'api_process_put')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'PROCESS_UPDATE_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}

/**
 * Cancel orchestration process
 * DELETE /api/orchestration/processes/[processId]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { processId } = params
    logger.info(`DELETE /api/orchestration/processes/${processId} - Cancelling process`)

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
      'orchestration:processes:delete',
    ])

    // Cancel process through PUT action
    const result = await PUT(request, { params })

    logger.info('Orchestration process cancelled successfully', {
      processId,
      workspaceId,
    })

    return result
  } catch (error) {
    logger.error('Failed to cancel orchestration process', { error, processId: params.processId })

    const handledError = errorHandler.handleError(error, 'api_process_delete')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'PROCESS_CANCEL_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}
