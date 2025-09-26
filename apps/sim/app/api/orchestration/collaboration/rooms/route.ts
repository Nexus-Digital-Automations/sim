/**
 * Collaboration Rooms API Routes
 * ===============================
 *
 * Next.js API routes for collaboration room management in the Multi-Agent Orchestration System.
 * Provides endpoints for creating and managing real-time collaboration rooms.
 *
 * Endpoints:
 * - POST /api/orchestration/collaboration/rooms - Create collaboration room
 * - GET /api/orchestration/collaboration/rooms - List collaboration rooms
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { createAuthContext } from '@/services/parlant'
import { errorHandler } from '@/services/parlant/error-handler'
import {
  type CreateCollaborationRoomRequest,
  orchestrationAPIService,
} from '@/services/parlant/orchestration-api-service'

const logger = createLogger('CollaborationRoomsAPI')

/**
 * Create collaboration room
 * POST /api/orchestration/collaboration/rooms
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/orchestration/collaboration/rooms - Creating collaboration room')

    // Parse request body
    const body: CreateCollaborationRoomRequest = await request.json()

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
      'orchestration:collaboration:create',
    ])

    // Create collaboration room through API service
    const result = await orchestrationAPIService.createCollaborationRoom(body, auth)

    logger.info('Collaboration room created successfully', {
      roomId: result.data.id,
      name: result.data.name,
      type: result.data.type,
      participantCount: result.data.participants.length,
      workspaceId,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    logger.error('Failed to create collaboration room', { error })

    const handledError = errorHandler.handleError(error, 'api_collaboration_rooms_post')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'ROOM_CREATION_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}

/**
 * List collaboration rooms
 * GET /api/orchestration/collaboration/rooms
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('GET /api/orchestration/collaboration/rooms - Listing collaboration rooms')

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
    const type = searchParams.get('type')
    const processId = searchParams.get('processId')
    const teamId = searchParams.get('teamId')
    const limit = searchParams.get('limit')
      ? Number.parseInt(searchParams.get('limit')!, 10)
      : undefined
    const offset = searchParams.get('offset')
      ? Number.parseInt(searchParams.get('offset')!, 10)
      : undefined

    // Create auth context
    const auth = createAuthContext(userId, workspaceId, 'workspace', [
      'orchestration:collaboration:list',
    ])

    // This would typically list rooms from the collaboration hub
    // For now, returning empty result as a placeholder
    const rooms: any[] = []
    const total = 0
    const hasMore = false

    logger.info('Collaboration rooms listed successfully', {
      count: rooms.length,
      total,
      workspaceId,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          rooms,
          total,
          hasMore,
        },
        message: 'Collaboration rooms retrieved successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Failed to list collaboration rooms', { error })

    const handledError = errorHandler.handleError(error, 'api_collaboration_rooms_get')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'ROOM_LIST_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}
