/**
 * RPA Agents API Endpoint
 * 
 * Handles Desktop Agent registration, listing, and management operations.
 * Provides RESTful API for agents to register with the Sim platform and
 * for users to view and manage their registered Desktop Agents.
 * 
 * Endpoints:
 * - GET /api/rpa/agents - List all agents for authenticated user
 * - POST /api/rpa/agents - Register a new Desktop Agent
 * - DELETE /api/rpa/agents - Bulk operations on agents
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { ratelimit } from '@/lib/ratelimit'
import { agentRegistrationSchema, agentAuthSchema } from '@/socket-server/validation/rpa-schemas'
import type { DesktopAgent, RegisterAgentRequest, RegisterAgentResponse, ListAgentsResponse } from '@/types/rpa'
import crypto from 'crypto'

const logger = createLogger('RPAAgentsAPI')

// In-memory store for agents (in production, use Redis or database)
const agentStore = new Map<string, DesktopAgent>()
const agentAuthStore = new Map<string, { apiKey: string; userId: string; workspaceId?: string }>()

// Rate limiting configuration
const RATE_LIMIT = {
  requests: 20, // requests per window
  window: 60 * 1000, // 1 minute
}

/**
 * Generate secure API key for agent authentication
 */
function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Generate unique agent ID
 */
function generateAgentId(): string {
  return crypto.randomUUID()
}

/**
 * Validate and authenticate request
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
 * GET /api/rpa/agents
 * List all Desktop Agents for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('GET /api/rpa/agents - Listing agents')

    // Authenticate request
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { user, organizationId } = authResult

    // Apply rate limiting
    const rateLimitResult = await ratelimit.limit({
      key: `rpa-agents-${user.id}`,
      requests: RATE_LIMIT.requests,
      window: RATE_LIMIT.window,
    })

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for user:', user.id)
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const platform = searchParams.get('platform')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Filter agents by user and optional filters
    const userAgents = Array.from(agentStore.values()).filter(agent => {
      // Check if agent belongs to user (via auth store)
      const agentAuth = agentAuthStore.get(agent.id)
      if (!agentAuth || agentAuth.userId !== user.id) {
        return false
      }

      // Apply status filter
      if (status && agent.status !== status) {
        return false
      }

      // Apply platform filter
      if (platform && agent.platform !== platform) {
        return false
      }

      return true
    })

    // Apply pagination
    const paginatedAgents = userAgents.slice(offset, offset + limit)

    // Calculate statistics
    const stats = {
      total: userAgents.length,
      online: userAgents.filter(agent => agent.status === 'online').length,
      offline: userAgents.filter(agent => agent.status === 'offline').length,
      busy: userAgents.filter(agent => agent.status === 'busy').length,
      error: userAgents.filter(agent => agent.status === 'error').length,
    }

    const response: ListAgentsResponse = {
      agents: paginatedAgents,
      total: stats.total,
      online: stats.online,
      offline: stats.offline,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < stats.total
      },
      stats
    }

    logger.info('Successfully listed agents:', {
      userId: user.id,
      totalAgents: stats.total,
      onlineAgents: stats.online,
      returnedCount: paginatedAgents.length
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Error listing agents:', error)
    return NextResponse.json(
      { error: 'Failed to list agents', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/rpa/agents  
 * Register a new Desktop Agent
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/rpa/agents - Registering new agent')

    // Authenticate request
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { user, organizationId } = authResult

    // Apply rate limiting for registration (stricter limits)
    const rateLimitResult = await ratelimit.limit({
      key: `rpa-agents-register-${user.id}`,
      requests: 5, // Only 5 registrations per window
      window: 60 * 1000, // 1 minute
    })

    if (!rateLimitResult.success) {
      logger.warn('Registration rate limit exceeded for user:', user.id)
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    logger.debug('Registration request body:', { 
      name: body.name, 
      platform: body.platform,
      version: body.version,
      capabilitiesCount: body.capabilities?.length || 0
    })

    const validationResult = agentRegistrationSchema.safeParse(body)

    if (!validationResult.success) {
      logger.warn('Invalid agent registration data:', validationResult.error.errors)
      return NextResponse.json(
        { 
          error: 'Invalid registration data', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const registrationData = validationResult.data

    // Check for duplicate agent names for this user
    const existingAgents = Array.from(agentStore.values()).filter(agent => {
      const agentAuth = agentAuthStore.get(agent.id)
      return agentAuth?.userId === user.id && agent.name === registrationData.name
    })

    if (existingAgents.length > 0) {
      logger.warn('Agent name already exists for user:', { userId: user.id, name: registrationData.name })
      return NextResponse.json(
        { error: 'An agent with this name already exists' },
        { status: 409 }
      )
    }

    // Generate agent ID and API key
    const agentId = generateAgentId()
    const apiKey = generateApiKey()

    // Create agent record
    const agent: DesktopAgent = {
      id: agentId,
      name: registrationData.name,
      status: 'offline', // Initially offline until first heartbeat
      platform: registrationData.platform,
      version: registrationData.version,
      capabilities: registrationData.capabilities,
      connectionId: '', // Will be set when agent connects via Socket.io
      lastHeartbeat: new Date(),
      metadata: {
        ...registrationData.metadata,
        ip: '', // Will be updated from Socket.io connection
      }
    }

    // Store agent and auth information
    agentStore.set(agentId, agent)
    agentAuthStore.set(agentId, {
      apiKey,
      userId: user.id,
      workspaceId: organizationId
    })

    logger.info('Agent registered successfully:', {
      agentId,
      userId: user.id,
      name: agent.name,
      platform: agent.platform,
      capabilities: agent.capabilities.length
    })

    // Prepare response
    const response: RegisterAgentResponse = {
      agentId,
      apiKey,
      status: 'registered',
      connectionInstructions: {
        socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:3002',
        authToken: apiKey, // Agent uses API key as auth token
        heartbeatInterval: 30000, // 30 seconds
      },
      message: 'Agent registered successfully. Use the provided API key and connection instructions to establish real-time communication.'
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    logger.error('Error registering agent:', error)
    return NextResponse.json(
      { 
        error: 'Failed to register agent', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/rpa/agents
 * Bulk delete agents or clean up offline agents
 */
export async function DELETE(request: NextRequest) {
  try {
    logger.info('DELETE /api/rpa/agents - Bulk agent operations')

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
      key: `rpa-agents-delete-${user.id}`,
      requests: 10,
      window: 60 * 1000,
    })

    if (!rateLimitResult.success) {
      logger.warn('Delete rate limit exceeded for user:', user.id)
      return NextResponse.json(
        { error: 'Too many delete requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse request body for bulk operations
    const body = await request.json()
    const { agentIds, deleteOffline = false, deleteAll = false } = body

    let deletedCount = 0
    const deletedAgents: string[] = []
    const errors: string[] = []

    if (deleteAll) {
      // Delete all agents for the user
      for (const [agentId, agent] of agentStore.entries()) {
        const agentAuth = agentAuthStore.get(agentId)
        if (agentAuth?.userId === user.id) {
          agentStore.delete(agentId)
          agentAuthStore.delete(agentId)
          deletedAgents.push(agentId)
          deletedCount++
        }
      }
    } else if (deleteOffline) {
      // Delete only offline agents for the user
      for (const [agentId, agent] of agentStore.entries()) {
        const agentAuth = agentAuthStore.get(agentId)
        if (agentAuth?.userId === user.id && agent.status === 'offline') {
          agentStore.delete(agentId)
          agentAuthStore.delete(agentId)
          deletedAgents.push(agentId)
          deletedCount++
        }
      }
    } else if (agentIds && Array.isArray(agentIds)) {
      // Delete specific agents
      for (const agentId of agentIds) {
        const agentAuth = agentAuthStore.get(agentId)
        
        if (!agentAuth) {
          errors.push(`Agent ${agentId} not found`)
          continue
        }
        
        if (agentAuth.userId !== user.id) {
          errors.push(`Insufficient permissions to delete agent ${agentId}`)
          continue
        }

        agentStore.delete(agentId)
        agentAuthStore.delete(agentId)
        deletedAgents.push(agentId)
        deletedCount++
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid delete operation. Specify agentIds, deleteOffline, or deleteAll.' },
        { status: 400 }
      )
    }

    logger.info('Bulk delete completed:', {
      userId: user.id,
      deletedCount,
      deletedAgents: deletedAgents.slice(0, 5), // Log first 5 for brevity
      errorCount: errors.length
    })

    return NextResponse.json({
      success: true,
      deletedCount,
      deletedAgents,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully deleted ${deletedCount} agent(s)`
    })

  } catch (error) {
    logger.error('Error in bulk delete operation:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete agents', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Export agent store for use by other modules (Socket.io handlers, etc.)
export { agentStore, agentAuthStore }