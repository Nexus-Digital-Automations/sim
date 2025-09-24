/**
 * Agent Lifecycle Management API Route
 * ====================================
 *
 * RESTful API endpoint for agent lifecycle operations:
 * - POST: Execute lifecycle operations (start, stop, pause, resume)
 * - GET: Get current lifecycle status
 * - Real-time status updates and monitoring
 * - Performance tracking and logging
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { getAgent } from '@/services/parlant/agents'
import type { AuthContext } from '@/services/parlant/types'

const logger = createLogger('ParlantAgentLifecycleAPI')

interface RouteContext {
  params: Promise<{ agentId: string }>
}

interface LifecycleOperation {
  action: 'start' | 'stop' | 'pause' | 'resume' | 'restart'
  options?: {
    force?: boolean
    timeout?: number
    graceful?: boolean
    reason?: string
  }
}

interface LifecycleStatus {
  agent_id: string
  status: 'online' | 'offline' | 'paused' | 'starting' | 'stopping' | 'error'
  last_action: string
  last_action_at: string
  uptime?: number
  active_sessions: number
  performance_metrics: {
    cpu_usage?: number
    memory_usage?: number
    response_time_avg: number
    response_time_p95: number
    total_requests: number
    error_rate: number
  }
  health_checks: {
    connectivity: boolean
    ai_provider: boolean
    database: boolean
    last_health_check: string
  }
}

/**
 * GET /api/parlant/agents/[agentId]/lifecycle
 * Get current agent lifecycle status and metrics
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const startTime = performance.now()
  const { agentId } = await context.params

  try {
    // Get authentication context
    const session = await getSession()
    if (!session?.user) {
      logger.warn('Unauthorized request to get agent lifecycle status', { agent_id: agentId })
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
      permissions: []
    }

    logger.info('Getting agent lifecycle status', {
      user_id: authContext.user_id,
      agent_id: agentId
    })

    // Validate agent access first
    const agent = await getAgent(agentId, authContext)

    // Get lifecycle status (mock implementation for now)
    const lifecycleStatus: LifecycleStatus = {
      agent_id: agentId,
      status: agent.status === 'active' ? 'online' : 'offline',
      last_action: 'started',
      last_action_at: agent.updated_at,
      uptime: Math.floor((Date.now() - new Date(agent.updated_at).getTime()) / 1000),
      active_sessions: Math.floor(Math.random() * 5),
      performance_metrics: {
        cpu_usage: Math.floor(Math.random() * 100),
        memory_usage: Math.floor(Math.random() * 100),
        response_time_avg: Math.floor(Math.random() * 1000) + 200,
        response_time_p95: Math.floor(Math.random() * 2000) + 500,
        total_requests: Math.floor(Math.random() * 10000),
        error_rate: Math.random() * 5
      },
      health_checks: {
        connectivity: true,
        ai_provider: true,
        database: true,
        last_health_check: new Date().toISOString()
      }
    }

    const duration = performance.now() - startTime
    logger.info('Agent lifecycle status retrieved', {
      duration_ms: Math.round(duration),
      agent_id: agentId,
      status: lifecycleStatus.status
    })

    return NextResponse.json({
      data: lifecycleStatus,
      success: true,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Failed to get agent lifecycle status', {
      duration_ms: Math.round(duration),
      agent_id: agentId,
      error: (error as Error).message
    })

    if ((error as any).name === 'ParlantNotFoundError') {
      return NextResponse.json(
        { error: 'Agent not found', success: false },
        { status: 404 }
      )
    }

    if ((error as any).name === 'ParlantWorkspaceError') {
      return NextResponse.json(
        { error: 'Workspace access denied', success: false },
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
 * POST /api/parlant/agents/[agentId]/lifecycle
 * Execute agent lifecycle operations
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const startTime = performance.now()
  const { agentId } = await context.params

  try {
    // Get authentication context
    const session = await getSession()
    if (!session?.user) {
      logger.warn('Unauthorized request to execute agent lifecycle operation', { agent_id: agentId })
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const operation: LifecycleOperation = {
      action: body.action,
      options: body.options || {}
    }

    // Validate operation
    const validActions = ['start', 'stop', 'pause', 'resume', 'restart']
    if (!validActions.includes(operation.action)) {
      return NextResponse.json(
        { error: 'Invalid lifecycle action', success: false },
        { status: 400 }
      )
    }

    // Build auth context
    const authContext: AuthContext = {
      user_id: session.user.id,
      workspace_id: session.session?.activeOrganizationId,
      key_type: 'workspace',
      permissions: []
    }

    logger.info('Executing agent lifecycle operation', {
      user_id: authContext.user_id,
      agent_id: agentId,
      action: operation.action,
      options: operation.options
    })

    // Validate agent access first
    const agent = await getAgent(agentId, authContext)

    // Execute lifecycle operation (mock implementation for now)
    let newStatus: string
    let message: string

    switch (operation.action) {
      case 'start':
        if (agent.status === 'active') {
          message = 'Agent is already running'
        } else {
          // TODO: Implement actual agent start logic
          newStatus = 'active'
          message = 'Agent started successfully'
        }
        break

      case 'stop':
        if (agent.status === 'inactive') {
          message = 'Agent is already stopped'
        } else {
          // TODO: Implement actual agent stop logic
          newStatus = 'inactive'
          message = 'Agent stopped successfully'
        }
        break

      case 'pause':
        if (agent.status !== 'active') {
          message = 'Agent must be running to pause'
        } else {
          // TODO: Implement actual agent pause logic
          newStatus = 'inactive'
          message = 'Agent paused successfully'
        }
        break

      case 'resume':
        if (agent.status === 'active') {
          message = 'Agent is already running'
        } else {
          // TODO: Implement actual agent resume logic
          newStatus = 'active'
          message = 'Agent resumed successfully'
        }
        break

      case 'restart':
        // TODO: Implement actual agent restart logic
        newStatus = 'active'
        message = 'Agent restarted successfully'
        break

      default:
        throw new Error(`Unsupported action: ${operation.action}`)
    }

    // TODO: Update agent status in database if newStatus is set
    // if (newStatus) {
    //   await updateAgent(agentId, { status: newStatus as any }, authContext)
    // }

    const duration = performance.now() - startTime
    logger.info('Agent lifecycle operation completed', {
      duration_ms: Math.round(duration),
      agent_id: agentId,
      action: operation.action,
      new_status: newStatus || agent.status
    })

    return NextResponse.json({
      data: {
        agent_id: agentId,
        action: operation.action,
        status: newStatus || agent.status,
        message,
        executed_at: new Date().toISOString(),
        execution_time_ms: Math.round(duration)
      },
      success: true,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Failed to execute agent lifecycle operation', {
      duration_ms: Math.round(duration),
      agent_id: agentId,
      error: (error as Error).message
    })

    if ((error as any).name === 'ParlantNotFoundError') {
      return NextResponse.json(
        { error: 'Agent not found', success: false },
        { status: 404 }
      )
    }

    if ((error as any).name === 'ParlantWorkspaceError') {
      return NextResponse.json(
        { error: 'Workspace access denied', success: false },
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