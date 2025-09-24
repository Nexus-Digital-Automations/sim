/**
 * Individual Parlant Agent API Route
 * ==================================
 *
 * RESTful API endpoint for individual agent operations:
 * - GET: Retrieve specific agent by ID
 * - PUT: Update specific agent
 * - DELETE: Delete specific agent
 * - Workspace-scoped access control
 * - Performance monitoring and logging
 */

import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { deleteAgent, getAgent, updateAgent } from '@/services/parlant/agents'
import type { AgentUpdateRequest, AuthContext } from '@/services/parlant/types'

const logger = createLogger('ParlantAgentAPI')

interface RouteContext {
  params: Promise<{ agentId: string }>
}

/**
 * GET /api/parlant/agents/[agentId]
 * Retrieve a specific agent by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const startTime = performance.now()
  const { agentId } = await context.params

  try {
    // Get authentication context
    const session = await getSession()
    if (!session?.user) {
      logger.warn('Unauthorized request to get agent', { agent_id: agentId })
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      )
    }

    // Build auth context
    const authContext: AuthContext = {
      user_id: session.user.id,
      workspace_id: session.session?.activeOrganizationId,
      key_type: 'workspace',
      permissions: [], // TODO: Get user permissions from session
    }

    logger.info('Retrieving agent', {
      user_id: authContext.user_id,
      agent_id: agentId,
    })

    // Call service layer
    const result = await getAgent(agentId, authContext)

    // Log performance
    const duration = performance.now() - startTime
    logger.info('Agent retrieved successfully', {
      duration_ms: Math.round(duration),
      agent_id: result.id,
      name: result.name,
    })

    return NextResponse.json({
      data: result,
      success: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Failed to retrieve agent', {
      duration_ms: Math.round(duration),
      agent_id: agentId,
      error: (error as Error).message,
    })

    // Handle specific error types
    if ((error as any).name === 'ParlantNotFoundError') {
      return NextResponse.json(
        {
          error: 'Agent not found',
          success: false,
        },
        { status: 404 }
      )
    }

    if ((error as any).name === 'ParlantWorkspaceError') {
      return NextResponse.json(
        {
          error: 'Workspace access denied',
          success: false,
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/parlant/agents/[agentId]
 * Update a specific agent
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const startTime = performance.now()
  const { agentId } = await context.params

  try {
    // Get authentication context
    const session = await getSession()
    if (!session?.user) {
      logger.warn('Unauthorized request to update agent', { agent_id: agentId })
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const updateRequest: AgentUpdateRequest = {
      name: body.name,
      description: body.description,
      guidelines: body.guidelines,
      config: body.config,
      status: body.status,
    }

    // Build auth context
    const authContext: AuthContext = {
      user_id: session.user.id,
      workspace_id: session.session?.activeOrganizationId,
      key_type: 'workspace',
      permissions: [], // TODO: Get user permissions from session
    }

    logger.info('Updating agent', {
      user_id: authContext.user_id,
      agent_id: agentId,
      fields: Object.keys(updateRequest).filter((k) => updateRequest[k] !== undefined),
    })

    // Call service layer
    const result = await updateAgent(agentId, updateRequest, authContext)

    // Log performance
    const duration = performance.now() - startTime
    logger.info('Agent updated successfully', {
      duration_ms: Math.round(duration),
      agent_id: result.id,
      name: result.name,
    })

    return NextResponse.json({
      data: result,
      success: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Failed to update agent', {
      duration_ms: Math.round(duration),
      agent_id: agentId,
      error: (error as Error).message,
    })

    // Handle specific error types
    if ((error as any).name === 'ParlantValidationError') {
      return NextResponse.json(
        {
          error: 'Invalid agent data',
          details: (error as any).details,
          success: false,
        },
        { status: 400 }
      )
    }

    if ((error as any).name === 'ParlantNotFoundError') {
      return NextResponse.json(
        {
          error: 'Agent not found',
          success: false,
        },
        { status: 404 }
      )
    }

    if ((error as any).name === 'ParlantWorkspaceError') {
      return NextResponse.json(
        {
          error: 'Workspace access denied',
          success: false,
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/parlant/agents/[agentId]
 * Delete a specific agent
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const startTime = performance.now()
  const { agentId } = await context.params

  try {
    // Get authentication context
    const session = await getSession()
    if (!session?.user) {
      logger.warn('Unauthorized request to delete agent', { agent_id: agentId })
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      )
    }

    // Build auth context
    const authContext: AuthContext = {
      user_id: session.user.id,
      workspace_id: session.session?.activeOrganizationId,
      key_type: 'workspace',
      permissions: [], // TODO: Get user permissions from session
    }

    logger.info('Deleting agent', {
      user_id: authContext.user_id,
      agent_id: agentId,
    })

    // Call service layer
    await deleteAgent(agentId, authContext)

    // Log performance
    const duration = performance.now() - startTime
    logger.info('Agent deleted successfully', {
      duration_ms: Math.round(duration),
      agent_id: agentId,
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Failed to delete agent', {
      duration_ms: Math.round(duration),
      agent_id: agentId,
      error: (error as Error).message,
    })

    // Handle specific error types
    if ((error as any).name === 'ParlantNotFoundError') {
      return NextResponse.json(
        {
          error: 'Agent not found',
          success: false,
        },
        { status: 404 }
      )
    }

    if ((error as any).name === 'ParlantWorkspaceError') {
      return NextResponse.json(
        {
          error: 'Workspace access denied',
          success: false,
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
