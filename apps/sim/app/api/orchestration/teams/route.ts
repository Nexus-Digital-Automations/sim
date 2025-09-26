/**
 * Agent Teams API Routes
 * ======================
 *
 * Next.js API routes for agent team management in the Multi-Agent Orchestration System.
 * Provides endpoints for creating, listing, and managing agent teams within workspaces.
 *
 * Endpoints:
 * - POST /api/orchestration/teams - Create new agent team
 * - GET /api/orchestration/teams - List agent teams with filtering
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { createAuthContext } from '@/services/parlant'
import { errorHandler } from '@/services/parlant/error-handler'
import type {
  CreateTeamRequest,
  ListTeamsRequest,
} from '@/services/parlant/orchestration-api-service'
import { orchestrationAPIService } from '@/services/parlant/orchestration-api-service'

const logger = createLogger('OrchestrationTeamsAPI')

/**
 * Create new agent team
 * POST /api/orchestration/teams
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/orchestration/teams - Creating agent team')

    // Parse request body
    const body: CreateTeamRequest = await request.json()

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
    const auth = createAuthContext(userId, workspaceId, 'workspace', ['orchestration:teams:create'])

    // Create team through API service
    const result = await orchestrationAPIService.createTeam(body, auth)

    logger.info('Agent team created successfully', {
      teamId: result.data.id,
      name: result.data.name,
      workspaceId,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    logger.error('Failed to create agent team', { error })

    const handledError = errorHandler.handleError(error, 'api_teams_post')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'TEAM_CREATION_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}

/**
 * List agent teams
 * GET /api/orchestration/teams
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('GET /api/orchestration/teams - Listing agent teams')

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
    const listRequest: ListTeamsRequest = {
      status: (searchParams.get('status') as any) || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit')
        ? Number.parseInt(searchParams.get('limit')!, 10)
        : undefined,
      offset: searchParams.get('offset')
        ? Number.parseInt(searchParams.get('offset')!, 10)
        : undefined,
    }

    // Create auth context
    const auth = createAuthContext(userId, workspaceId, 'workspace', ['orchestration:teams:list'])

    // List teams through API service
    const result = await orchestrationAPIService.listTeams(listRequest, auth)

    logger.info('Agent teams listed successfully', {
      count: result.data.teams.length,
      total: result.data.total,
      workspaceId,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    logger.error('Failed to list agent teams', { error })

    const handledError = errorHandler.handleError(error, 'api_teams_get')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'TEAM_LIST_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}
