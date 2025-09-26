/**
 * Canned Response Matching API Route
 * ==================================
 *
 * Next.js API route for intelligent canned response matching.
 * Provides context-aware response recommendations.
 *
 * Endpoints:
 * - POST /api/enterprise/canned-responses/match - Find matching responses
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { createAuthContext } from '@/services/parlant'
import { cannedResponseService } from '@/services/parlant/canned-response-service'
import { errorHandler } from '@/services/parlant/error-handler'

const logger = createLogger('CannedResponseMatchAPI')

/**
 * Find matching canned responses
 * POST /api/enterprise/canned-responses/match
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/enterprise/canned-responses/match - Finding matching responses')

    // Parse request body
    const body = await request.json()
    const { query, context = {}, maxResults = 5 } = body

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query is required for response matching',
          code: 'MISSING_QUERY',
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
    const auth = createAuthContext(userId, workspaceId, 'workspace', ['canned_responses:match'])

    // Find matching responses through service
    const matches = await cannedResponseService.findMatchingResponses(
      query,
      { ...context, workspaceId, userId },
      maxResults,
      auth
    )

    logger.info('Canned response matching completed', {
      query: query.substring(0, 100),
      matchCount: matches.length,
      workspaceId,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          query,
          matches,
          matchCount: matches.length,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Failed to find matching canned responses', { error })

    const handledError = errorHandler.handleError(error, 'api_canned_response_match_post')

    return NextResponse.json(
      {
        success: false,
        error: handledError.message,
        code: handledError.code || 'CANNED_RESPONSE_MATCH_FAILED',
      },
      { status: handledError.statusCode || 500 }
    )
  }
}
