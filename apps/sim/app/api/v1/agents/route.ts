/**
 * Parlant Agents API - CRUD Endpoints
 *
 * Comprehensive REST API for Parlant agent lifecycle management.
 * Provides endpoints for creating, reading, updating, and deleting agents
 * with proper authentication, validation, and workspace isolation.
 *
 * Endpoints:
 * - POST /api/v1/agents - Create new agent
 * - GET /api/v1/agents - List agents with filtering
 */

import { type NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import {
  type AgentListQuery,
  AgentListQuerySchema,
  type CreateAgentRequest,
  CreateAgentRequestSchema,
  type ErrorResponse,
} from '@/lib/api/v1/agents/schemas'
import { agentService } from '@/lib/api/v1/agents/service'
import { createLogger } from '@/lib/logs/console/logger'
import { authenticateV1Request } from '../auth'
import { checkRateLimit, createRateLimitResponse } from '../middleware'

const logger = createLogger('AgentsAPI')

/**
 * Create a standardized error response
 */
function createErrorResponse(
  error: string,
  message: string,
  status = 400,
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
      },
    }
  )
}

/**
 * POST /api/v1/agents
 *
 * Creates a new Parlant agent in the specified workspace.
 * Requires valid API key authentication and workspace access.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `create-agent-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

  try {
    logger.info('Agent creation request received', {
      url: request.url,
      requestId,
      userAgent: request.headers.get('user-agent'),
    })

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'agents')
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
    let requestBody: CreateAgentRequest
    try {
      const rawBody = await request.json()
      requestBody = CreateAgentRequestSchema.parse(rawBody)
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

    // Create the agent
    const agent = await agentService.createAgent(requestBody, auth.userId!)

    const duration = performance.now() - startTime

    logger.info('Agent created successfully', {
      requestId,
      agentId: agent.id,
      userId: auth.userId,
      workspaceId: agent.workspaceId,
      duration: `${duration}ms`,
    })

    return NextResponse.json(agent, {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        'X-Response-Time': `${duration}ms`,
        Location: `/api/v1/agents/${agent.id}`,
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime

    logger.error('Agent creation failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    })

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('Workspace not found')) {
        return createErrorResponse(
          'WORKSPACE_NOT_FOUND',
          'The specified workspace does not exist or you do not have access',
          404,
          undefined,
          requestId
        )
      }

      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return createErrorResponse(
          'DUPLICATE_AGENT_NAME',
          'An agent with this name already exists in the workspace',
          409,
          undefined,
          requestId
        )
      }
    }

    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to create agent',
      500,
      undefined,
      requestId
    )
  }
}

/**
 * GET /api/v1/agents
 *
 * Lists agents with optional filtering and pagination.
 * Supports workspace filtering, status filtering, search, and sorting.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `list-agents-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

  try {
    logger.info('Agent list request received', {
      url: request.url,
      requestId,
      userAgent: request.headers.get('user-agent'),
    })

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'agents')
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
    let query: AgentListQuery
    try {
      const { searchParams } = new URL(request.url)
      const queryParams = Object.fromEntries(searchParams)
      query = AgentListQuerySchema.parse(queryParams)
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

    // Get agents list
    const result = await agentService.listAgents(query, auth.userId!)

    const duration = performance.now() - startTime

    logger.info('Agents listed successfully', {
      requestId,
      userId: auth.userId,
      count: result.agents.length,
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

    logger.error('Agent listing failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    })

    return createErrorResponse('INTERNAL_ERROR', 'Failed to list agents', 500, undefined, requestId)
  }
}
