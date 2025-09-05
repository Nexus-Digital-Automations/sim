/**
 * RPA Agent Status API Endpoint
 * 
 * Provides real-time status monitoring and health metrics for Desktop Agents.
 * This endpoint is optimized for frequent polling and provides detailed
 * operational metrics for monitoring dashboards and health checks.
 * 
 * Endpoints:
 * - GET /api/rpa/agents/[agentId]/status - Get real-time agent status and metrics
 * - POST /api/rpa/agents/[agentId]/status - Update agent status (for agent-initiated updates)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { ratelimit } from '@/lib/ratelimit'
import { agentStore, agentAuthStore } from '@/app/api/rpa/agents/route'
import { agentStatusSchema, agentMetricsSchema } from '@/socket-server/validation/rpa-schemas'
import type { DesktopAgent, AgentMetrics } from '@/types/rpa'

const logger = createLogger('RPAAgentStatusAPI')

// Status update schema for POST requests
const statusUpdateSchema = z.object({
  status: agentStatusSchema.optional(),
  metrics: agentMetricsSchema.partial().optional(),
  metadata: z.object({
    hostname: z.string().optional(),
    ip: z.string().ip().optional(),
    userAgent: z.string().optional(),
    screenResolution: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive()
    }).optional(),
    availableEngines: z.array(z.string()).optional()
  }).optional(),
  error: z.string().optional()
})

/**
 * Validate agent access permissions
 */
async function validateAgentAccess(agentId: string, userId?: string, apiKey?: string) {
  const agent = agentStore.get(agentId)
  if (!agent) {
    return { error: 'Agent not found', status: 404 }
  }

  const agentAuth = agentAuthStore.get(agentId)
  if (!agentAuth) {
    return { error: 'Agent authentication not found', status: 404 }
  }

  // Allow access via user authentication OR agent API key
  if (userId && agentAuth.userId === userId) {
    return { agent, agentAuth, accessType: 'user' }
  }
  
  if (apiKey && agentAuth.apiKey === apiKey) {
    return { agent, agentAuth, accessType: 'agent' }
  }

  return { error: 'Insufficient permissions', status: 403 }
}

/**
 * Authenticate request - supports both user sessions and agent API keys
 */
async function authenticateRequest(request: NextRequest) {
  // Check for agent API key in headers first
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (apiKey) {
    return { apiKey, accessType: 'agent' }
  }

  // Fallback to user session authentication
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return { error: 'Authentication required', status: 401 }
    }

    return { 
      user: session.user, 
      organizationId: session.session?.activeOrganizationId,
      accessType: 'user'
    }
  } catch (error) {
    logger.error('Authentication error:', error)
    return { error: 'Authentication failed', status: 401 }
  }
}

/**
 * Generate mock real-time metrics for demonstration
 * In production, this would fetch from monitoring systems
 */
function generateMockMetrics(agentId: string, agent: DesktopAgent): AgentMetrics {
  const now = new Date()
  const timeSinceLastHeartbeat = now.getTime() - agent.lastHeartbeat.getTime()
  
  return {
    agentId,
    timestamp: now,
    cpuUsage: Math.random() * 100,
    memoryUsage: Math.random() * 100,
    activeOperations: agent.status === 'busy' ? Math.floor(Math.random() * 3) + 1 : 0,
    totalOperationsCompleted: Math.floor(Math.random() * 1000) + 100,
    averageResponseTime: Math.random() * 1000 + 200,
    errorRate: agent.status === 'error' ? Math.random() * 50 + 10 : Math.random() * 5,
    lastError: agent.status === 'error' ? 'Operation timeout after 30 seconds' : undefined
  }
}

/**
 * GET /api/rpa/agents/[agentId]/status
 * Get real-time agent status and performance metrics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params
    logger.debug('GET /api/rpa/agents/[agentId]/status - Getting agent status:', { agentId })

    // Authenticate request
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { user, apiKey, accessType } = authResult

    // Apply rate limiting (higher limits for status checks)
    const rateLimitKey = accessType === 'agent' ? `rpa-agent-status-agent-${agentId}` : `rpa-agent-status-user-${user?.id}`
    const rateLimitResult = await ratelimit.limit({
      key: rateLimitKey,
      requests: accessType === 'agent' ? 120 : 60, // Agents can poll more frequently
      window: 60 * 1000,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many status requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Validate agent access
    const accessResult = await validateAgentAccess(agentId, user?.id, apiKey)
    if ('error' in accessResult) {
      return NextResponse.json(
        { error: accessResult.error },
        { status: accessResult.status }
      )
    }

    const { agent } = accessResult

    // Generate real-time metrics
    const metrics = generateMockMetrics(agentId, agent)

    // Calculate connection health
    const now = new Date()
    const timeSinceLastHeartbeat = now.getTime() - agent.lastHeartbeat.getTime()
    const isHealthy = timeSinceLastHeartbeat < 60000 // Healthy if heartbeat within 1 minute
    
    const connectionHealth = {
      isConnected: agent.status !== 'offline',
      isHealthy,
      lastHeartbeat: agent.lastHeartbeat,
      timeSinceLastHeartbeat,
      connectionDuration: agent.status !== 'offline' ? timeSinceLastHeartbeat : 0,
      heartbeatInterval: 30000, // Expected heartbeat interval
      reconnectAttempts: 0 // Would track reconnection attempts
    }

    // Current operations (mock data - in production, fetch from operation queue)
    const currentOperations = agent.status === 'busy' ? [
      {
        id: 'op-' + Math.random().toString(36).substr(2, 9),
        type: 'click',
        status: 'running',
        progress: Math.floor(Math.random() * 80) + 10,
        startedAt: new Date(Date.now() - Math.random() * 30000),
        estimatedCompletion: new Date(Date.now() + Math.random() * 10000)
      }
    ] : []

    const response = {
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        platform: agent.platform,
        version: agent.version,
        capabilities: agent.capabilities,
        lastHeartbeat: agent.lastHeartbeat
      },
      metrics,
      connectionHealth,
      currentOperations,
      systemInfo: agent.metadata,
      timestamp: now
    }

    // Only log detailed info for user requests to avoid spam from agent polling
    if (accessType === 'user') {
      logger.info('Successfully retrieved agent status:', {
        agentId,
        userId: user?.id,
        agentStatus: agent.status,
        isHealthy,
        activeOperations: currentOperations.length
      })
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Error getting agent status:', error)
    return NextResponse.json(
      { error: 'Failed to get agent status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/rpa/agents/[agentId]/status
 * Update agent status and metrics (typically called by Desktop Agent)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params
    logger.debug('POST /api/rpa/agents/[agentId]/status - Updating agent status:', { agentId })

    // Authenticate request
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { user, apiKey, accessType } = authResult

    // Apply rate limiting (more lenient for agent heartbeats)
    const rateLimitKey = accessType === 'agent' ? `rpa-agent-update-status-agent-${agentId}` : `rpa-agent-update-status-user-${user?.id}`
    const rateLimitResult = await ratelimit.limit({
      key: rateLimitKey,
      requests: accessType === 'agent' ? 120 : 20, // Agents can update status more frequently
      window: 60 * 1000,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many status update requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Validate agent access
    const accessResult = await validateAgentAccess(agentId, user?.id, apiKey)
    if ('error' in accessResult) {
      return NextResponse.json(
        { error: accessResult.error },
        { status: accessResult.status }
      )
    }

    const { agent } = accessResult

    // Parse and validate request body
    const body = await request.json()
    const validationResult = statusUpdateSchema.safeParse(body)

    if (!validationResult.success) {
      logger.warn('Invalid status update data:', validationResult.error.errors)
      return NextResponse.json(
        { error: 'Invalid status update data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    // Update agent with new status and metadata
    const updatedAgent: DesktopAgent = {
      ...agent,
      ...(updateData.status && { status: updateData.status }),
      lastHeartbeat: new Date(), // Always update heartbeat on status update
      ...(updateData.metadata && {
        metadata: {
          ...agent.metadata,
          ...updateData.metadata
        }
      })
    }

    // Save updated agent
    agentStore.set(agentId, updatedAgent)

    // Log status changes (but not routine heartbeats to avoid spam)
    if (updateData.status && updateData.status !== agent.status) {
      logger.info('Agent status changed:', {
        agentId,
        accessType,
        fromStatus: agent.status,
        toStatus: updateData.status,
        agentName: agent.name
      })
    }

    const response = {
      success: true,
      agent: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        status: updatedAgent.status,
        lastHeartbeat: updatedAgent.lastHeartbeat
      },
      acknowledged: true,
      timestamp: new Date(),
      nextHeartbeatDue: new Date(Date.now() + 30000), // 30 seconds from now
      message: 'Status updated successfully'
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Error updating agent status:', error)
    return NextResponse.json(
      { error: 'Failed to update agent status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}