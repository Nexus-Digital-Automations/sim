/**
 * Parlant Agent API - Individual Agent Endpoints
 *
 * REST API endpoints for managing individual Parlant agents.
 * Provides get, update, and delete operations for specific agents.
 *
 * Endpoints:
 * - GET /api/v1/agents/:id - Get agent details
 * - PUT /api/v1/agents/:id - Update agent configuration
 * - DELETE /api/v1/agents/:id - Delete agent (soft delete)
 */

import { type NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createLogger } from '@/lib/logs/console/logger'
import { checkRateLimit, createRateLimitResponse } from '../../middleware'
import { authenticateV1Request } from '../../auth'
import { agentService } from '@/lib/api/v1/agents/service'
import {
  UpdateAgentRequestSchema,
  type UpdateAgentRequest,
  type ErrorResponse,
  type SuccessResponse,
} from '@/lib/api/v1/agents/schemas'

const logger = createLogger('AgentAPI')

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
 * Create a standardized success response
 */
function createSuccessResponse(
  message: string,
  requestId?: string
): NextResponse<SuccessResponse> {
  return NextResponse.json(
    {
      success: true,
      message,
      requestId,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId || 'unknown',
      }
    }
  )
}

/**
 * GET /api/v1/agents/:id
 *
 * Retrieves detailed information about a specific agent.
 * Includes configuration, status, and usage metrics.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `get-agent-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  const agentId = params.id

  try {
    logger.info('Agent details request received', {
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

    // Get agent details
    const agent = await agentService.getAgent(agentId, auth.userId!)

    if (!agent) {
      return createErrorResponse(
        'AGENT_NOT_FOUND',
        'The specified agent does not exist or you do not have access',
        404,
        undefined,
        requestId
      )
    }

    const duration = performance.now() - startTime

    logger.info('Agent details retrieved successfully', {
      requestId,
      agentId,
      userId: auth.userId,
      duration: `${duration}ms`,
    })

    return NextResponse.json(agent, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        'X-Response-Time': `${duration}ms`,
        'Cache-Control': 'private, no-cache',
      },
    })

  } catch (error) {
    const duration = performance.now() - startTime

    logger.error('Agent details retrieval failed', {
      requestId,
      agentId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    })

    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to retrieve agent details',
      500,
      undefined,
      requestId
    )
  }
}

/**
 * PUT /api/v1/agents/:id
 *
 * Updates an existing agent's configuration.
 * Supports partial updates - only provided fields are modified.
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `update-agent-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  const agentId = params.id

  try {
    logger.info('Agent update request received', {
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
    let requestBody: UpdateAgentRequest
    try {
      const rawBody = await request.json()
      requestBody = UpdateAgentRequestSchema.parse(rawBody)
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

    // Check if request body is empty
    if (Object.keys(requestBody).length === 0) {
      return createErrorResponse(
        'EMPTY_UPDATE',
        'At least one field must be provided for update',
        400,
        undefined,
        requestId
      )
    }

    // Update the agent
    const updatedAgent = await agentService.updateAgent(agentId, requestBody, auth.userId!)

    if (!updatedAgent) {
      return createErrorResponse(
        'AGENT_NOT_FOUND',
        'The specified agent does not exist or you do not have access',
        404,
        undefined,
        requestId
      )
    }

    const duration = performance.now() - startTime

    logger.info('Agent updated successfully', {
      requestId,
      agentId,
      userId: auth.userId,
      updatedFields: Object.keys(requestBody),
      duration: `${duration}ms`,
    })

    return NextResponse.json(updatedAgent, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        'X-Response-Time': `${duration}ms`,
      },
    })

  } catch (error) {
    const duration = performance.now() - startTime

    logger.error('Agent update failed', {
      requestId,
      agentId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    })

    // Handle specific database errors
    if (error instanceof Error) {
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
      'Failed to update agent',
      500,
      undefined,
      requestId
    )
  }
}

/**
 * DELETE /api/v1/agents/:id
 *
 * Soft deletes an agent by marking it as archived and setting deletedAt timestamp.
 * This preserves historical data while making the agent inaccessible.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `delete-agent-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  const agentId = params.id

  try {
    logger.info('Agent deletion request received', {
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

    // Delete the agent
    const success = await agentService.deleteAgent(agentId, auth.userId!)

    if (!success) {
      return createErrorResponse(
        'AGENT_NOT_FOUND',
        'The specified agent does not exist or you do not have access',
        404,
        undefined,
        requestId
      )
    }

    const duration = performance.now() - startTime

    logger.info('Agent deleted successfully', {
      requestId,
      agentId,
      userId: auth.userId,
      duration: `${duration}ms`,
    })

    return createSuccessResponse(
      `Agent ${agentId} has been successfully deleted`,
      requestId
    )

  } catch (error) {
    const duration = performance.now() - startTime

    logger.error('Agent deletion failed', {
      requestId,
      agentId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    })

    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to delete agent',
      500,
      undefined,
      requestId
    )
  }
}