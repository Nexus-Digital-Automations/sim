/**
 * Parlant Agent Sessions API - Session Management Endpoints
 *
 * REST API endpoints for managing agent sessions.
 * Provides session creation and listing for specific agents.
 *
 * Endpoints:
 * - POST /api/v1/agents/:id/sessions - Create new session with agent
 * - GET /api/v1/agents/:id/sessions - List sessions for agent
 */

import { type NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createLogger } from '@/lib/logs/console/logger'
import { checkRateLimit, createRateLimitResponse } from '../../../middleware'
import { authenticateV1Request } from '../../../auth'
import { agentService } from '@/lib/api/v1/agents/service'
import {
  CreateSessionRequestSchema,
  SessionListQuerySchema,
  type CreateSessionRequest,
  type SessionListQuery,
  type ErrorResponse,
} from '@/lib/api/v1/agents/schemas'

const logger = createLogger('AgentSessionsAPI')

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * Create a standardized error response
 */
function createErrorResponse(
  error: string,
  message: string,
  status: number = 400,
  details?: Record<string, any>,
  requestId?: string
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error,
      message,
      details,
      requestId,
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId || 'unknown',
      }
    }
  )
}

/**
 * POST /api/v1/agents/:id/sessions
 *
 * Creates a new session with the specified agent.
 * Sessions provide isolated conversation contexts with workspace boundaries.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `create-session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  const agentId = params.id

  try {
    logger.info('Session creation request received', {
      url: request.url,
      requestId,
      agentId,
      userAgent: request.headers.get('user-agent'),
    })

    // Validate agent ID format
    if (!agentId || typeof agentId !== 'string') {
      return createErrorResponse(
        'INVALID_AGENT_ID',
        'Agent ID is required and must be a valid UUID',
        400,
        undefined,
        requestId
      )
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'agent-sessions')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    // Authenticate request
    const auth = await authenticateV1Request(request)
    if (!auth.authenticated) {
      return createErrorResponse(
        'AUTHENTICATION_FAILED',
        auth.error || 'Authentication required',
        401,
        undefined,
        requestId
      )
    }

    // Parse and validate request body
    let requestBody: CreateSessionRequest
    try {
      const rawBody = await request.json()
      // Set the agent ID from the URL parameter
      requestBody = CreateSessionRequestSchema.parse({
        ...rawBody,
        agentId,
      })
    } catch (error) {
      if (error instanceof ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid request data',
          400,
          { validationErrors: error.errors },
          requestId
        )
      }
      return createErrorResponse(
        'INVALID_JSON',
        'Request body must be valid JSON',
        400,
        undefined,
        requestId
      )
    }

    // Create the session
    const session = await agentService.createSession(agentId, requestBody, auth.userId!)

    const duration = performance.now() - startTime

    logger.info('Session created successfully', {
      requestId,
      sessionId: session.id,
      agentId,
      userId: auth.userId,
      mode: session.mode,
      duration: `${duration}ms`,
    })

    return NextResponse.json(session, {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        'X-Response-Time': `${duration}ms`,
        'Location': `/api/v1/sessions/${session.id}`,
      },
    })

  } catch (error) {
    const duration = performance.now() - startTime

    logger.error('Session creation failed', {
      requestId,
      agentId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    })

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Agent not found')) {
        return createErrorResponse(
          'AGENT_NOT_FOUND',
          'The specified agent does not exist or you do not have access',
          404,
          undefined,
          requestId
        )
      }

      if (error.message.includes('workspace')) {
        return createErrorResponse(
          'WORKSPACE_ACCESS_DENIED',
          'You do not have access to the agent\'s workspace',
          403,
          undefined,
          requestId
        )
      }
    }

    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to create session',
      500,
      undefined,
      requestId
    )
  }
}

/**
 * GET /api/v1/agents/:id/sessions
 *
 * Lists sessions for the specified agent with optional filtering and pagination.
 * Supports status filtering, sorting, and standard pagination.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `list-sessions-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  const agentId = params.id

  try {
    logger.info('Sessions list request received', {
      url: request.url,
      requestId,
      agentId,
      userAgent: request.headers.get('user-agent'),
    })

    // Validate agent ID format
    if (!agentId || typeof agentId !== 'string') {
      return createErrorResponse(
        'INVALID_AGENT_ID',
        'Agent ID is required and must be a valid UUID',
        400,
        undefined,
        requestId
      )
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'agent-sessions')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    // Authenticate request
    const auth = await authenticateV1Request(request)
    if (!auth.authenticated) {
      return createErrorResponse(
        'AUTHENTICATION_FAILED',
        auth.error || 'Authentication required',
        401,
        undefined,
        requestId
      )
    }

    // Parse and validate query parameters
    let query: SessionListQuery
    try {
      const { searchParams } = new URL(request.url)
      const queryParams = Object.fromEntries(searchParams)
      query = SessionListQuerySchema.parse(queryParams)
    } catch (error) {
      if (error instanceof ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid query parameters',
          400,
          { validationErrors: error.errors },
          requestId
        )
      }
      return createErrorResponse(
        'INVALID_QUERY',
        'Invalid query parameters',
        400,
        undefined,
        requestId
      )
    }

    // Get sessions list
    const result = await agentService.listSessions(agentId, query, auth.userId!)

    const duration = performance.now() - startTime

    logger.info('Sessions listed successfully', {
      requestId,
      agentId,
      userId: auth.userId,
      count: result.sessions.length,
      total: result.pagination.total,
      duration: `${duration}ms`,
    })

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        'X-Response-Time': `${duration}ms`,
        'X-Total-Count': result.pagination.total.toString(),
        'X-Page-Size': result.pagination.limit.toString(),
        'X-Page-Offset': result.pagination.offset.toString(),
      },
    })

  } catch (error) {
    const duration = performance.now() - startTime

    logger.error('Sessions listing failed', {
      requestId,
      agentId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    })

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Agent not found')) {
        return createErrorResponse(
          'AGENT_NOT_FOUND',
          'The specified agent does not exist or you do not have access',
          404,
          undefined,
          requestId
        )
      }
    }

    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to list sessions',
      500,
      undefined,
      requestId
    )
  }
}