/**
 * Parlant Agents API Route
 * ========================
 *
 * RESTful API endpoint for managing Parlant agents with:
 * - Full CRUD operations (GET, POST, PUT, DELETE)
 * - Workspace-scoped access control
 * - Input validation and sanitization
 * - Structured error handling
 * - Performance monitoring and logging
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import {
  listAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgent
} from '@/services/parlant/agents'
import type { AgentCreateRequest, AgentUpdateRequest, AgentListQuery, AuthContext } from '@/services/parlant/types'
import { withAgentAccessControl } from '@/services/parlant/middleware/access-control'

const logger = createLogger('ParlantAgentsAPI')

/**
 * GET /api/parlant/agents
 * List agents with filtering and pagination
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now()

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const query: AgentListQuery = {
      workspace_id: searchParams.get('workspace_id') || undefined,
      status: searchParams.get('status') as any || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      search: searchParams.get('search') || undefined
    }

    // Validate access control
    const { context: authContext, accessResult } = await withAgentAccessControl(
      'list',
      query.workspace_id
    )

    if (!authContext || !accessResult.allowed) {
      logger.warn('Access denied for list agents request', {
        reason: accessResult.reason,
        workspace_id: query.workspace_id
      })
      return NextResponse.json(
        {
          error: accessResult.reason || 'Access denied',
          success: false,
          rate_limit: accessResult.rate_limit
        },
        { status: accessResult.reason?.includes('Authentication') ? 401 : 403 }
      )
    }

    logger.info('Listing agents', {
      user_id: authContext.user_id,
      workspace_id: authContext.workspace_id,
      query
    })

    // Call service layer
    const result = await listAgents(query, authContext)

    // Log performance
    const duration = performance.now() - startTime
    logger.info('Agents listed successfully', {
      duration_ms: Math.round(duration),
      count: result.data.length,
      total: result.pagination.total
    })

    return NextResponse.json(result)

  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Failed to list agents', {
      duration_ms: Math.round(duration),
      error: (error as Error).message,
      stack: (error as Error).stack
    })

    // Handle specific error types
    if ((error as any).name === 'ParlantValidationError') {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: (error as any).details,
          success: false
        },
        { status: 400 }
      )
    }

    if ((error as any).name === 'ParlantWorkspaceError') {
      return NextResponse.json(
        {
          error: 'Workspace access denied',
          success: false
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/parlant/agents
 * Create a new agent
 */
export async function POST(request: NextRequest) {
  const startTime = performance.now()

  try {
    // Get authentication context
    const session = await getSession()
    if (!session?.user) {
      logger.warn('Unauthorized request to create agent')
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const createRequest: AgentCreateRequest = {
      name: body.name,
      description: body.description,
      workspace_id: body.workspace_id || session.session?.activeOrganizationId,
      guidelines: body.guidelines,
      config: body.config
    }

    // Build auth context
    const authContext: AuthContext = {
      user_id: session.user.id,
      workspace_id: createRequest.workspace_id,
      key_type: 'workspace',
      permissions: [] // TODO: Get user permissions from session
    }

    logger.info('Creating new agent', {
      user_id: authContext.user_id,
      workspace_id: authContext.workspace_id,
      name: createRequest.name
    })

    // Call service layer
    const result = await createAgent(createRequest, authContext)

    // Log performance
    const duration = performance.now() - startTime
    logger.info('Agent created successfully', {
      duration_ms: Math.round(duration),
      agent_id: result.id,
      name: result.name
    })

    return NextResponse.json({
      data: result,
      success: true,
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Failed to create agent', {
      duration_ms: Math.round(duration),
      error: (error as Error).message,
      stack: (error as Error).stack
    })

    // Handle specific error types
    if ((error as any).name === 'ParlantValidationError') {
      return NextResponse.json(
        {
          error: 'Invalid agent data',
          details: (error as any).details,
          success: false
        },
        { status: 400 }
      )
    }

    if ((error as any).name === 'ParlantWorkspaceError') {
      return NextResponse.json(
        {
          error: 'Workspace access denied',
          success: false
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/parlant/agents
 * Update multiple agents (batch operation)
 */
export async function PUT(request: NextRequest) {
  const startTime = performance.now()

  try {
    // Get authentication context
    const session = await getSession()
    if (!session?.user) {
      logger.warn('Unauthorized request to update agents')
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      )
    }

    // Parse request body for batch updates
    const body = await request.json()
    const updates = body.agents as Array<{ id: string } & AgentUpdateRequest>

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Expected array of agent updates', success: false },
        { status: 400 }
      )
    }

    // Build auth context
    const authContext: AuthContext = {
      user_id: session.user.id,
      workspace_id: session.session?.activeOrganizationId,
      key_type: 'workspace',
      permissions: [] // TODO: Get user permissions from session
    }

    logger.info('Batch updating agents', {
      user_id: authContext.user_id,
      count: updates.length
    })

    // Process updates
    const results = []
    const errors = []

    for (const update of updates) {
      try {
        const { id, ...updateData } = update
        const result = await updateAgent(id, updateData, authContext)
        results.push(result)
      } catch (error) {
        errors.push({
          agent_id: update.id,
          error: (error as Error).message
        })
      }
    }

    // Log performance
    const duration = performance.now() - startTime
    logger.info('Batch agent update completed', {
      duration_ms: Math.round(duration),
      successful: results.length,
      failed: errors.length
    })

    return NextResponse.json({
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      success: true,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Failed to batch update agents', {
      duration_ms: Math.round(duration),
      error: (error as Error).message
    })

    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/parlant/agents
 * Delete multiple agents (batch operation)
 */
export async function DELETE(request: NextRequest) {
  const startTime = performance.now()

  try {
    // Get authentication context
    const session = await getSession()
    if (!session?.user) {
      logger.warn('Unauthorized request to delete agents')
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      )
    }

    // Parse request body for batch deletions
    const body = await request.json()
    const agentIds = body.agent_ids as string[]

    if (!Array.isArray(agentIds)) {
      return NextResponse.json(
        { error: 'Expected array of agent IDs', success: false },
        { status: 400 }
      )
    }

    // Build auth context
    const authContext: AuthContext = {
      user_id: session.user.id,
      workspace_id: session.session?.activeOrganizationId,
      key_type: 'workspace',
      permissions: [] // TODO: Get user permissions from session
    }

    logger.info('Batch deleting agents', {
      user_id: authContext.user_id,
      count: agentIds.length
    })

    // Process deletions
    const results = []
    const errors = []

    for (const agentId of agentIds) {
      try {
        await deleteAgent(agentId, authContext)
        results.push({ agent_id: agentId, deleted: true })
      } catch (error) {
        errors.push({
          agent_id: agentId,
          error: (error as Error).message
        })
      }
    }

    // Log performance
    const duration = performance.now() - startTime
    logger.info('Batch agent deletion completed', {
      duration_ms: Math.round(duration),
      successful: results.length,
      failed: errors.length
    })

    return NextResponse.json({
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      success: true,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Failed to batch delete agents', {
      duration_ms: Math.round(duration),
      error: (error as Error).message
    })

    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}