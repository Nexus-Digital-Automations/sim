/**
 * RPA Agent Connection Handler
 * 
 * Manages Desktop Agent connections, authentication, and lifecycle events
 * through Socket.io. Handles agent registration, heartbeat monitoring,
 * status updates, and graceful disconnection.
 * 
 * Key Features:
 * - Secure agent authentication with API keys
 * - Real-time heartbeat monitoring 
 * - Agent capability verification
 * - Connection state management
 * - Automatic failover and recovery
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { RoomManager } from '@/socket-server/rooms/manager'
import { 
  agentRegisterEventSchema,
  agentHeartbeatEventSchema,
  agentAuthSchema 
} from '@/socket-server/validation/rpa-schemas'
import type { RPASocket, RPA_ROOMS, RPASocketUtils } from './index'
import type { DesktopAgent, AgentMetrics } from '@/types/rpa'

const logger = createLogger('RPAAgentConnection')

// Import agent stores (using require to avoid circular dependencies)
let agentStore: Map<string, DesktopAgent>
let agentAuthStore: Map<string, { apiKey: string; userId: string; workspaceId?: string }>

try {
  const agentModule = require('@/app/api/rpa/agents/route')
  agentStore = agentModule.agentStore
  agentAuthStore = agentModule.agentAuthStore
} catch (error) {
  logger.error('Failed to import agent stores:', error)
  // Initialize empty maps as fallback
  agentStore = new Map()
  agentAuthStore = new Map()
}

/**
 * Setup agent connection event handlers for a socket
 * 
 * @param socket - RPA-enabled socket connection
 * @param roomManager - Room management instance
 */
export function setupAgentConnectionHandlers(socket: RPASocket, roomManager: RoomManager) {
  logger.debug(`Setting up agent connection handlers for socket ${socket.id}`)

  // Handle agent registration
  socket.on('rpa:agent:register', async (data) => {
    await handleAgentRegistration(socket, roomManager, data)
  })

  // Handle agent heartbeat
  socket.on('rpa:agent:heartbeat', async (data) => {
    await handleAgentHeartbeat(socket, roomManager, data)
  })

  // Handle explicit agent disconnect
  socket.on('rpa:agent:disconnect', async (data) => {
    await handleAgentDisconnect(socket, roomManager, data)
  })

  // Handle agent status updates
  socket.on('rpa:agent:status-update', async (data) => {
    await handleAgentStatusUpdate(socket, roomManager, data)
  })

  // Handle agent capability updates
  socket.on('rpa:agent:capabilities-update', async (data) => {
    await handleAgentCapabilitiesUpdate(socket, roomManager, data)
  })

  logger.debug(`Agent connection handlers setup completed for socket ${socket.id}`)
}

/**
 * Handle Desktop Agent registration
 * Authenticates agent, validates capabilities, and establishes connection
 */
async function handleAgentRegistration(socket: RPASocket, roomManager: RoomManager, data: any) {
  const startTime = Date.now()
  
  logger.info(`Processing agent registration`, {
    socketId: socket.id,
    hasAgentInfo: !!data.agentInfo,
    hasAuth: !!data.auth
  })

  try {
    // Validate registration data
    const validationResult = agentRegisterEventSchema.safeParse(data)
    if (!validationResult.success) {
      logger.warn(`Invalid agent registration data from socket ${socket.id}`, {
        errors: validationResult.error.errors
      })
      
      socket.emit('rpa:agent:error', {
        error: 'Invalid registration data',
        details: validationResult.error.errors,
        timestamp: new Date()
      })
      return
    }

    const { agentInfo, auth } = validationResult.data

    // Authenticate agent with API key
    const authResult = await authenticateAgent(auth)
    if (!authResult.success) {
      logger.warn(`Agent authentication failed for socket ${socket.id}`, {
        agentId: auth.agentId,
        reason: authResult.error
      })
      
      socket.emit('rpa:agent:error', {
        error: 'Authentication failed',
        details: authResult.error,
        timestamp: new Date()
      })
      return
    }

    const { agent: existingAgent, userId, workspaceId } = authResult

    // Update agent with current connection info
    const updatedAgent: DesktopAgent = {
      ...existingAgent,
      ...agentInfo,
      status: 'online',
      connectionId: socket.id,
      lastHeartbeat: new Date(),
      metadata: {
        ...existingAgent.metadata,
        ...agentInfo.metadata,
        ip: socket.handshake.address || existingAgent.metadata.ip
      }
    }

    // Store updated agent
    agentStore.set(auth.agentId, updatedAgent)

    // Update socket with agent information
    socket.agentId = auth.agentId
    socket.agentInfo = {
      id: updatedAgent.id,
      name: updatedAgent.name,
      platform: updatedAgent.platform,
      version: updatedAgent.version,
      capabilities: updatedAgent.capabilities
    }
    socket.isDesktopAgent = true
    socket.connectionType = 'agent'
    socket.userId = userId // Set for room management

    // Join agent to relevant rooms
    const { RPASocketUtils } = require('./index')
    RPASocketUtils.joinAgentRooms(socket, auth.agentId, userId, workspaceId)

    // Setup heartbeat monitoring
    startHeartbeatMonitoring(socket, auth.agentId)

    const processingTime = Date.now() - startTime

    logger.info(`Agent registered successfully`, {
      socketId: socket.id,
      agentId: auth.agentId,
      agentName: updatedAgent.name,
      platform: updatedAgent.platform,
      capabilities: updatedAgent.capabilities.length,
      processingTime
    })

    // Confirm registration to agent
    socket.emit('rpa:agent:registered', {
      agentId: auth.agentId,
      status: 'registered',
      connectionId: socket.id,
      heartbeatInterval: 30000, // 30 seconds
      timestamp: new Date(),
      serverCapabilities: {
        maxConcurrentOperations: 10,
        supportedOperationTypes: ['click', 'type', 'extract', 'screenshot', 'wait', 'find-element'],
        maxWorkflowOperations: 100
      }
    })

    // Notify user dashboards that agent came online
    const userRoom = `rpa:agents:user:${userId}`
    socket.to(userRoom).emit('rpa:agent:status', {
      agentId: auth.agentId,
      status: 'online',
      agent: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        platform: updatedAgent.platform,
        capabilities: updatedAgent.capabilities,
        version: updatedAgent.version
      },
      connectedAt: new Date(),
      connectionId: socket.id
    })

    // Notify organization room if applicable
    if (workspaceId) {
      const orgRoom = `rpa:agents:org:${workspaceId}`
      socket.to(orgRoom).emit('rpa:agent:status', {
        agentId: auth.agentId,
        status: 'online',
        agent: {
          id: updatedAgent.id,
          name: updatedAgent.name,
          platform: updatedAgent.platform
        },
        connectedAt: new Date()
      })
    }

  } catch (error) {
    logger.error(`Error processing agent registration for socket ${socket.id}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    socket.emit('rpa:agent:error', {
      error: 'Registration failed',
      details: 'Internal server error during registration',
      timestamp: new Date(),
      retry: true
    })
  }
}

/**
 * Handle agent heartbeat to maintain connection health
 */
async function handleAgentHeartbeat(socket: RPASocket, roomManager: RoomManager, data: any) {
  if (!socket.isDesktopAgent || !socket.agentId) {
    logger.warn(`Heartbeat from non-agent socket ${socket.id}`)
    return
  }

  try {
    // Validate heartbeat data
    const validationResult = agentHeartbeatEventSchema.safeParse(data)
    if (!validationResult.success) {
      logger.debug(`Invalid heartbeat data from agent ${socket.agentId}`, {
        errors: validationResult.error.errors
      })
      return
    }

    const { agentId, metrics } = validationResult.data

    if (agentId !== socket.agentId) {
      logger.warn(`Heartbeat agent ID mismatch`, {
        socketAgentId: socket.agentId,
        heartbeatAgentId: agentId,
        socketId: socket.id
      })
      return
    }

    // Update agent heartbeat
    const agent = agentStore.get(agentId)
    if (agent) {
      const updatedAgent = {
        ...agent,
        lastHeartbeat: new Date(),
        status: 'online' as const
      }
      agentStore.set(agentId, updatedAgent)
      socket.lastHeartbeat = new Date()
    }

    // Process metrics if provided
    if (metrics && Object.keys(metrics).length > 0) {
      await processAgentMetrics(socket, metrics)
    }

    // Send heartbeat acknowledgment
    socket.emit('rpa:agent:heartbeat-ack', {
      agentId,
      timestamp: new Date(),
      nextHeartbeatDue: new Date(Date.now() + 30000)
    })

  } catch (error) {
    logger.error(`Error processing heartbeat from agent ${socket.agentId}`, {
      agentId: socket.agentId,
      socketId: socket.id,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Handle explicit agent disconnect
 */
async function handleAgentDisconnect(socket: RPASocket, roomManager: RoomManager, data: any) {
  if (!socket.isDesktopAgent || !socket.agentId) return

  logger.info(`Agent requesting disconnect`, {
    agentId: socket.agentId,
    socketId: socket.id,
    reason: data?.reason
  })

  try {
    // Update agent status
    const agent = agentStore.get(socket.agentId)
    if (agent) {
      const updatedAgent = {
        ...agent,
        status: 'offline' as const,
        connectionId: '',
        lastHeartbeat: new Date()
      }
      agentStore.set(socket.agentId, updatedAgent)
    }

    // Notify connected users
    const agentAuth = agentAuthStore.get(socket.agentId)
    if (agentAuth) {
      const userRoom = `rpa:agents:user:${agentAuth.userId}`
      socket.to(userRoom).emit('rpa:agent:status', {
        agentId: socket.agentId,
        status: 'offline',
        reason: data?.reason || 'requested',
        timestamp: new Date()
      })
    }

    // Acknowledge disconnect
    socket.emit('rpa:agent:disconnect-ack', {
      agentId: socket.agentId,
      timestamp: new Date(),
      message: 'Disconnect acknowledged'
    })

  } catch (error) {
    logger.error(`Error processing agent disconnect`, {
      agentId: socket.agentId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Handle agent status updates
 */
async function handleAgentStatusUpdate(socket: RPASocket, roomManager: RoomManager, data: any) {
  if (!socket.isDesktopAgent || !socket.agentId) return

  try {
    const { status, metadata, error } = data
    
    const agent = agentStore.get(socket.agentId)
    if (!agent) return

    // Update agent with new status
    const updatedAgent = {
      ...agent,
      status: status || agent.status,
      lastHeartbeat: new Date(),
      ...(metadata && {
        metadata: { ...agent.metadata, ...metadata }
      })
    }

    agentStore.set(socket.agentId, updatedAgent)

    // Notify users if status changed significantly
    if (status && status !== agent.status) {
      const agentAuth = agentAuthStore.get(socket.agentId)
      if (agentAuth) {
        const userRoom = `rpa:agents:user:${agentAuth.userId}`
        socket.to(userRoom).emit('rpa:agent:status', {
          agentId: socket.agentId,
          status: status,
          previousStatus: agent.status,
          timestamp: new Date(),
          error: error
        })
      }

      logger.info(`Agent status changed`, {
        agentId: socket.agentId,
        from: agent.status,
        to: status,
        error: error
      })
    }

  } catch (error) {
    logger.error(`Error processing agent status update`, {
      agentId: socket.agentId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Handle agent capabilities update
 */
async function handleAgentCapabilitiesUpdate(socket: RPASocket, roomManager: RoomManager, data: any) {
  if (!socket.isDesktopAgent || !socket.agentId) return

  try {
    const { capabilities } = data
    
    if (!Array.isArray(capabilities)) {
      logger.warn(`Invalid capabilities update from agent ${socket.agentId}`)
      return
    }

    const agent = agentStore.get(socket.agentId)
    if (!agent) return

    const updatedAgent = {
      ...agent,
      capabilities,
      lastHeartbeat: new Date()
    }

    agentStore.set(socket.agentId, updatedAgent)

    logger.info(`Agent capabilities updated`, {
      agentId: socket.agentId,
      newCapabilities: capabilities,
      previousCapabilities: agent.capabilities
    })

    // Update socket agent info
    if (socket.agentInfo) {
      socket.agentInfo.capabilities = capabilities
    }

  } catch (error) {
    logger.error(`Error processing agent capabilities update`, {
      agentId: socket.agentId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Authenticate agent with API key
 */
async function authenticateAgent(auth: any): Promise<{
  success: boolean
  agent?: DesktopAgent
  userId?: string
  workspaceId?: string
  error?: string
}> {
  try {
    // Validate auth structure
    const authValidation = agentAuthSchema.safeParse(auth)
    if (!authValidation.success) {
      return { success: false, error: 'Invalid authentication data' }
    }

    const { apiKey, agentId, userId } = authValidation.data

    // Check if agent exists
    const agent = agentStore.get(agentId)
    if (!agent) {
      return { success: false, error: 'Agent not found' }
    }

    // Check API key
    const agentAuth = agentAuthStore.get(agentId)
    if (!agentAuth || agentAuth.apiKey !== apiKey) {
      return { success: false, error: 'Invalid API key' }
    }

    // Verify user ID matches
    if (agentAuth.userId !== userId) {
      return { success: false, error: 'User ID mismatch' }
    }

    return {
      success: true,
      agent,
      userId: agentAuth.userId,
      workspaceId: agentAuth.workspaceId
    }

  } catch (error) {
    logger.error('Error during agent authentication', {
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: 'Authentication failed' }
  }
}

/**
 * Process agent performance metrics
 */
async function processAgentMetrics(socket: RPASocket, metrics: Partial<AgentMetrics>) {
  if (!socket.agentId) return

  try {
    // In production, this would store metrics in a time-series database
    // For now, we'll just log and potentially broadcast to monitoring dashboards
    
    logger.debug(`Received metrics from agent ${socket.agentId}`, {
      cpuUsage: metrics.cpuUsage,
      memoryUsage: metrics.memoryUsage,
      activeOperations: metrics.activeOperations,
      errorRate: metrics.errorRate
    })

    // Broadcast metrics to monitoring dashboards
    const agentAuth = agentAuthStore.get(socket.agentId)
    if (agentAuth) {
      const monitoringRoom = `rpa:monitoring:${agentAuth.userId}`
      socket.to(monitoringRoom).emit('rpa:agent:metrics', {
        agentId: socket.agentId,
        metrics: {
          ...metrics,
          timestamp: new Date()
        }
      })
    }

    // Check for concerning metrics and alert if needed
    if (metrics.errorRate && metrics.errorRate > 20) {
      logger.warn(`High error rate detected for agent ${socket.agentId}`, {
        agentId: socket.agentId,
        errorRate: metrics.errorRate,
        lastError: metrics.lastError
      })
    }

  } catch (error) {
    logger.error('Error processing agent metrics', {
      agentId: socket.agentId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Start heartbeat monitoring for an agent
 * Monitors for missed heartbeats and marks agent offline if needed
 */
function startHeartbeatMonitoring(socket: RPASocket, agentId: string) {
  const heartbeatInterval = 30000 // 30 seconds
  const heartbeatTimeout = 90000 // 1.5 minutes (3 missed heartbeats)

  const checkHeartbeat = () => {
    const agent = agentStore.get(agentId)
    if (!agent || agent.connectionId !== socket.id) {
      // Agent disconnected or connection changed
      return
    }

    const timeSinceLastHeartbeat = Date.now() - agent.lastHeartbeat.getTime()
    
    if (timeSinceLastHeartbeat > heartbeatTimeout) {
      logger.warn(`Agent heartbeat timeout`, {
        agentId,
        timeSinceLastHeartbeat,
        timeout: heartbeatTimeout
      })

      // Mark agent as offline due to heartbeat timeout
      const updatedAgent = {
        ...agent,
        status: 'error' as const,
        connectionId: ''
      }
      agentStore.set(agentId, updatedAgent)

      // Notify users
      const agentAuth = agentAuthStore.get(agentId)
      if (agentAuth) {
        const userRoom = `rpa:agents:user:${agentAuth.userId}`
        socket.to(userRoom).emit('rpa:agent:status', {
          agentId,
          status: 'error',
          reason: 'heartbeat_timeout',
          timestamp: new Date()
        })
      }

      // Disconnect the socket
      socket.disconnect(true)
    } else {
      // Schedule next heartbeat check
      setTimeout(checkHeartbeat, heartbeatInterval)
    }
  }

  // Start monitoring after initial heartbeat interval
  setTimeout(checkHeartbeat, heartbeatInterval)
}