/**
 * Parlant Agent Status API - Agent Health Monitoring
 *
 * REST API endpoint for monitoring agent health and performance metrics.
 * Provides comprehensive status information including health checks,
 * performance metrics, and configuration summary.
 *
 * Endpoints:
 * - GET /api/v1/agents/:id/status - Get agent status and metrics
 */

import { type NextRequest, NextResponse } from 'next/server'
import type { ErrorResponse } from '@/lib/api/v1/agents/schemas'
import { agentService } from '@/lib/api/v1/agents/service'
import { createLogger } from '@/lib/logs/console/logger'
import { authenticateV1Request } from '../../../auth'
import { checkRateLimit, createRateLimitResponse } from '../../../middleware'

const logger = createLogger('AgentStatusAPI')

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
 * GET /api/v1/agents/:id/status
 *
 * Retrieves comprehensive status information for a specific agent including:
 * - Health status and last health check
 * - Performance metrics (response times, success rates, etc.)
 * - Active session counts
 * - Configuration summary
 * - Usage statistics
 */
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `agent-status-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  const agentId = params.id

  try {
    logger.info('Agent status request received', {
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

    // Check rate limit (more permissive for status checks)
    const rateLimitResult = await checkRateLimit(request, 'agent-status')
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

    // Get agent status and metrics
    const status = await agentService.getAgentStatus(agentId, auth.userId!)

    if (!status) {
      return createErrorResponse(
        'AGENT_NOT_FOUND',
        'The specified agent does not exist or you do not have access',
        404,
        undefined,
        requestId
      )
    }

    const duration = performance.now() - startTime

    logger.info('Agent status retrieved successfully', {
      requestId,
      agentId,
      userId: auth.userId,
      isHealthy: status.isHealthy,
      activeSessions: status.metrics.activeSessions,
      duration: `${duration}ms`,
    })

    // Set appropriate HTTP status based on agent health
    const httpStatus = status.isHealthy ? 200 : 503

    return NextResponse.json(status, {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        'X-Response-Time': `${duration}ms`,
        'X-Agent-Health': status.isHealthy ? 'healthy' : 'unhealthy',
        'X-Agent-Status': status.status,
        'X-Active-Sessions': status.metrics.activeSessions.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime

    logger.error('Agent status retrieval failed', {
      requestId,
      agentId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    })

    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to retrieve agent status',
      500,
      undefined,
      requestId
    )
  }
}
