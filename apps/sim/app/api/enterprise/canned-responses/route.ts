/**
 * Canned Responses API Routes
 * ===========================
 *
 * Next.js API routes for enterprise canned response management.
 * Provides endpoints for creating, managing, and matching canned responses.
 *
 * Endpoints:
 * - POST /api/enterprise/canned-responses - Create canned response
 * - GET /api/enterprise/canned-responses - List canned responses
 * - POST /api/enterprise/canned-responses/match - Find matching responses
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { createAuthContext } from '@/services/parlant'
import { cannedResponseService } from '@/services/parlant/canned-response-service'
import { errorHandler } from '@/services/parlant/error-handler'

const logger = createLogger('CannedResponsesAPI')

/**
 * Create canned response
 * POST /api/enterprise/canned-responses
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/enterprise/canned-responses - Creating canned response')

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
    const auth = createAuthContext(userId, workspaceId, 'workspace', ['canned_responses:create'])

    // Create canned response through service
    const result = await cannedResponseService.createCannedResponse(body, auth)

    logger.info('Canned response created successfully', {
      responseId: result.id,
      category: result.category,
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
    logger.error('Failed to create canned response', { error })

    const handledError = errorHandler.handleError(error, 'api_canned_responses_post')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'CANNED_RESPONSE_CREATION_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}

/**
 * List canned responses
 * GET /api/enterprise/canned-responses
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('GET /api/enterprise/canned-responses - Listing canned responses')

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
    const category = searchParams.get('category') || undefined
    const language = searchParams.get('language') || undefined
    const tags = searchParams.get('tags')?.split(',') || undefined
    const limit = searchParams.get('limit')
      ? Number.parseInt(searchParams.get('limit')!, 10)
      : undefined

    // Create auth context
    const auth = createAuthContext(userId, workspaceId, 'workspace', ['canned_responses:list'])

    // List canned responses through service
    const result = await cannedResponseService.getCannedResponses(
      {
        workspaceId,
        category: category as any,
        language,
        tags,
        limit,
      },
      auth
    )

    logger.info('Canned responses listed successfully', {
      count: result.length,
      workspaceId,
    })

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Failed to list canned responses', { error })

    const handledError = errorHandler.handleError(error, 'api_canned_responses_get')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'CANNED_RESPONSES_LIST_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}
