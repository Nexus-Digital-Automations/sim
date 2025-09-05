/**
 * RPA Agent-Specific API Endpoint
 * 
 * Handles operations for individual Desktop Agents including status retrieval,
 * configuration updates, and agent-specific management operations.
 * 
 * Endpoints:
 * - GET /api/rpa/agents/[agentId] - Get agent details and status
 * - PUT /api/rpa/agents/[agentId] - Update agent configuration  
 * - DELETE /api/rpa/agents/[agentId] - Delete specific agent
 * - POST /api/rpa/agents/[agentId]/regenerate-key - Regenerate API key
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { ratelimit } from '@/lib/ratelimit'
import { agentStore, agentAuthStore } from '@/app/api/rpa/agents/route'
import type { DesktopAgent, AgentMetrics, GetAgentStatusResponse } from '@/types/rpa'
import crypto from 'crypto'

const logger = createLogger('RPAAgentAPI')

// Update agent schema for PUT requests
const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  capabilities: z.array(z.string()).optional(),
  metadata: z.object({
    hostname: z.string().optional(),
    screenResolution: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive()
    }).optional(),
    availableEngines: z.array(z.string()).optional()
  }).optional()
})

/**
 * Validate agent access permissions
 */
async function validateAgentAccess(agentId: string, userId: string) {
  const agent = agentStore.get(agentId)
  if (!agent) {
    return { error: 'Agent not found', status: 404 }
  }

  const agentAuth = agentAuthStore.get(agentId)
  if (!agentAuth || agentAuth.userId !== userId) {
    return { error: 'Insufficient permissions', status: 403 }
  }

  return { agent, agentAuth }
}

/**
 * Authenticate request and extract user info
 */
async function authenticateRequest(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return { error: 'Authentication required', status: 401 }
    }

    return { 
      user: session.user, 
      organizationId: session.session?.activeOrganizationId 
    }
  } catch (error) {
    logger.error('Authentication error:', error)
    return { error: 'Authentication failed', status: 401 }
  }
}

/**
 * GET /api/rpa/agents/[agentId]
 * Get detailed information about a specific agent
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params
    logger.info('GET /api/rpa/agents/[agentId] - Getting agent details:', { agentId })

    // Authenticate request
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { user } = authResult

    // Apply rate limiting
    const rateLimitResult = await ratelimit.limit({
      key: `rpa-agent-get-${user.id}`,
      requests: 60, // Higher limit for read operations
      window: 60 * 1000,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Validate agent access
    const accessResult = await validateAgentAccess(agentId, user.id)
    if ('error' in accessResult) {
      return NextResponse.json(
        { error: accessResult.error },
        { status: accessResult.status }
      )
    }

    const { agent } = accessResult

    // Mock metrics for demonstration (in production, fetch from monitoring system)
    const mockMetrics: AgentMetrics = {
      agentId: agent.id,
      timestamp: new Date(),
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      activeOperations: Math.floor(Math.random() * 5),
      totalOperationsCompleted: Math.floor(Math.random() * 1000) + 100,
      averageResponseTime: Math.random() * 1000 + 200,
      errorRate: Math.random() * 10,
      lastError: agent.status === 'error' ? 'Connection timeout' : undefined
    }

    // Mock recent executions (in production, fetch from database)
    const mockRecentExecutions = []

    const response: GetAgentStatusResponse = {
      agent,
      metrics: mockMetrics,
      activeOperations: [], // Would contain currently running operations
      recentExecutions: mockRecentExecutions,
      connectionHealth: {
        isConnected: agent.status !== 'offline',
        lastHeartbeat: agent.lastHeartbeat,
        connectionDuration: agent.status !== 'offline' ? Date.now() - agent.lastHeartbeat.getTime() : 0,
        reconnectAttempts: 0
      }
    }

    logger.info('Successfully retrieved agent details:', {
      agentId,
      userId: user.id,
      agentStatus: agent.status,
      capabilities: agent.capabilities.length
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Error getting agent details:', error)
    return NextResponse.json(
      { error: 'Failed to get agent details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/rpa/agents/[agentId] 
 * Update agent configuration and metadata
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params
    logger.info('PUT /api/rpa/agents/[agentId] - Updating agent:', { agentId })

    // Authenticate request
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { user } = authResult

    // Apply rate limiting
    const rateLimitResult = await ratelimit.limit({
      key: `rpa-agent-update-${user.id}`,
      requests: 20,
      window: 60 * 1000,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many update requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Validate agent access
    const accessResult = await validateAgentAccess(agentId, user.id)
    if ('error' in accessResult) {
      return NextResponse.json(
        { error: accessResult.error },
        { status: accessResult.status }
      )
    }

    const { agent } = accessResult

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateAgentSchema.safeParse(body)

    if (!validationResult.success) {
      logger.warn('Invalid agent update data:', validationResult.error.errors)
      return NextResponse.json(
        { error: 'Invalid update data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    // Check for name conflicts if name is being updated
    if (updateData.name && updateData.name !== agent.name) {
      const existingAgents = Array.from(agentStore.values()).filter(existingAgent => {
        if (existingAgent.id === agentId) return false // Skip current agent
        const agentAuth = agentAuthStore.get(existingAgent.id)
        return agentAuth?.userId === user.id && existingAgent.name === updateData.name
      })

      if (existingAgents.length > 0) {
        return NextResponse.json(
          { error: 'An agent with this name already exists' },
          { status: 409 }
        )
      }
    }

    // Update agent properties
    const updatedAgent: DesktopAgent = {
      ...agent,
      ...(updateData.name && { name: updateData.name }),
      ...(updateData.capabilities && { capabilities: updateData.capabilities }),
      ...(updateData.metadata && {
        metadata: {
          ...agent.metadata,
          ...updateData.metadata
        }
      })
    }

    // Save updated agent
    agentStore.set(agentId, updatedAgent)

    logger.info('Agent updated successfully:', {
      agentId,
      userId: user.id,
      updatedFields: Object.keys(updateData)
    })

    return NextResponse.json({
      success: true,
      agent: updatedAgent,
      message: 'Agent updated successfully'
    })

  } catch (error) {
    logger.error('Error updating agent:', error)
    return NextResponse.json(
      { error: 'Failed to update agent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/rpa/agents/[agentId]
 * Delete a specific agent
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params
    logger.info('DELETE /api/rpa/agents/[agentId] - Deleting agent:', { agentId })

    // Authenticate request
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { user } = authResult

    // Apply rate limiting
    const rateLimitResult = await ratelimit.limit({
      key: `rpa-agent-delete-${user.id}`,
      requests: 10,
      window: 60 * 1000,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many delete requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Validate agent access
    const accessResult = await validateAgentAccess(agentId, user.id)
    if ('error' in accessResult) {
      return NextResponse.json(
        { error: accessResult.error },
        { status: accessResult.status }
      )
    }

    const { agent } = accessResult

    // Check if agent has active operations (in production, check database/queue)
    const hasActiveOperations = agent.status === 'busy'
    
    if (hasActiveOperations) {
      return NextResponse.json(
        { 
          error: 'Cannot delete agent with active operations', 
          details: 'Please wait for current operations to complete or cancel them first' 
        },
        { status: 409 }
      )
    }

    // Remove agent from stores
    agentStore.delete(agentId)
    agentAuthStore.delete(agentId)

    logger.info('Agent deleted successfully:', {
      agentId,
      userId: user.id,
      agentName: agent.name
    })

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully',
      deletedAgent: {
        id: agent.id,
        name: agent.name
      }
    })

  } catch (error) {
    logger.error('Error deleting agent:', error)
    return NextResponse.json(
      { error: 'Failed to delete agent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/rpa/agents/[agentId]/regenerate-key
 * Regenerate API key for agent authentication
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params
    logger.info('POST /api/rpa/agents/[agentId]/regenerate-key - Regenerating API key:', { agentId })

    // Authenticate request
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { user } = authResult

    // Apply rate limiting (strict for security operations)
    const rateLimitResult = await ratelimit.limit({
      key: `rpa-agent-regenerate-${user.id}`,
      requests: 5,
      window: 60 * 1000,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many key regeneration requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Validate agent access
    const accessResult = await validateAgentAccess(agentId, user.id)
    if ('error' in accessResult) {
      return NextResponse.json(
        { error: accessResult.error },
        { status: accessResult.status }
      )
    }

    const { agent, agentAuth } = accessResult

    // Generate new API key
    const newApiKey = crypto.randomBytes(32).toString('hex')

    // Update auth store with new API key
    agentAuthStore.set(agentId, {
      ...agentAuth,
      apiKey: newApiKey
    })

    logger.info('API key regenerated successfully:', {
      agentId,
      userId: user.id,
      agentName: agent.name
    })

    return NextResponse.json({
      success: true,
      agentId,
      apiKey: newApiKey,
      message: 'API key regenerated successfully. Please update your agent configuration with the new key.',
      connectionInstructions: {
        socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:3002',
        authToken: newApiKey,
        heartbeatInterval: 30000,
      }
    })

  } catch (error) {
    logger.error('Error regenerating API key:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate API key', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}