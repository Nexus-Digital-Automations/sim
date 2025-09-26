/**
 * Orchestration Processes API Routes
 * ===================================
 *
 * Next.js API routes for process orchestration in the Multi-Agent Orchestration System.
 * Provides endpoints for creating, listing, and managing orchestrated processes.
 *
 * Endpoints:
 * - POST /api/orchestration/processes - Start new orchestration process
 * - GET /api/orchestration/processes - List orchestration processes with filtering
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { createAuthContext } from '@/services/parlant'
import { errorHandler } from '@/services/parlant/error-handler'
import type {
  ListProcessesRequest,
  StartProcessRequest,
} from '@/services/parlant/orchestration-api-service'
import { orchestrationAPIService } from '@/services/parlant/orchestration-api-service'

const logger = createLogger('OrchestrationProcessesAPI')

/**
 * Start new orchestration process
 * POST /api/orchestration/processes
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/orchestration/processes - Starting orchestration process')

    // Parse request body
    const body: StartProcessRequest = await request.json()

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
      'orchestration:processes:create',
    ])

    // Start process through API service
    const result = await orchestrationAPIService.startProcess(body, auth)

    logger.info('Orchestration process started successfully', {
      processId: result.data.id,
      name: result.data.name,
      teamId: result.data.teamId,
      stepCount: result.data.totalSteps,
      workspaceId,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    logger.error('Failed to start orchestration process', { error })

    const handledError = errorHandler.handleError(error, 'api_processes_post')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'PROCESS_START_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}

/**
 * List orchestration processes
 * GET /api/orchestration/processes
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('GET /api/orchestration/processes - Listing orchestration processes')

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
    const listRequest: ListProcessesRequest = {
      teamId: searchParams.get('teamId') || undefined,
      status: (searchParams.get('status') as any) || undefined,
      limit: searchParams.get('limit') ? Number.parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? Number.parseInt(searchParams.get('offset')!) : undefined,
    }

    // Create auth context
    const auth = createAuthContext(userId, workspaceId, 'workspace', [
      'orchestration:processes:list',
    ])

    // List processes through API service
    const result = await orchestrationAPIService.listProcesses(listRequest, auth)

    logger.info('Orchestration processes listed successfully', {
      count: result.data.processes.length,
      total: result.data.total,
      workspaceId,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    logger.error('Failed to list orchestration processes', { error })

    const handledError = errorHandler.handleError(error, 'api_processes_get')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'PROCESS_LIST_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}
