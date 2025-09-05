/**
 * RPA Socket.io Handlers - Main Entry Point
 * 
 * Coordinates all RPA-related Socket.io event handling between Sim platform
 * and Desktop Agents. Provides real-time communication, operation execution,
 * workflow orchestration, and status monitoring.
 * 
 * Handlers organized by functionality:
 * - Agent Connection & Authentication
 * - Operation Execution & Streaming  
 * - Workflow Orchestration
 * - Error Handling & Recovery
 * - Real-time Monitoring & Metrics
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { AuthenticatedSocket } from '@/socket-server/middleware/auth'
import type { RoomManager } from '@/socket-server/rooms/manager'

import { setupAgentConnectionHandlers } from './agent-connection'
import { setupWorkflowExecutionHandlers } from './workflow-execution'
import { setupOperationStreamingHandlers } from './operation-streaming'
import { setupErrorHandlingHandlers } from './error-handling'

const logger = createLogger('RPASocketHandlers')

/**
 * Socket.io interface extension for RPA-specific properties
 * Extends the base AuthenticatedSocket with RPA agent information
 */
export interface RPASocket extends AuthenticatedSocket {
  // Agent-specific properties (set during agent authentication)
  agentId?: string
  agentInfo?: {
    id: string
    name: string
    platform: 'windows' | 'macos' | 'linux'
    version: string
    capabilities: string[]
  }
  isDesktopAgent?: boolean
  
  // Connection metadata
  connectionType?: 'user' | 'agent'
  authenticatedAt?: Date
  lastHeartbeat?: Date
  
  // Operation tracking
  activeOperations?: Set<string>
  currentExecution?: string
}

/**
 * RPA Room Types for Socket.io room management
 * Organized rooms for different types of RPA communication
 */
export interface RPARooms {
  // Agent-specific rooms
  agent: (agentId: string) => string           // Individual agent room
  agentUser: (userId: string) => string        // All agents for a user
  agentOrg: (orgId: string) => string         // All agents for an organization
  
  // Workflow execution rooms
  workflow: (executionId: string) => string    // Individual workflow execution
  workflowUser: (userId: string) => string     // All workflows for a user
  
  // Operation rooms
  operation: (operationId: string) => string   // Individual operation
  
  // Monitoring rooms
  monitoring: (userId: string) => string       // User monitoring dashboard
  systemStatus: string                         // System-wide status updates
}

/**
 * RPA Room naming conventions
 * Consistent room naming for easy management and debugging
 */
export const RPA_ROOMS: RPARooms = {
  agent: (agentId: string) => `rpa:agent:${agentId}`,
  agentUser: (userId: string) => `rpa:agents:user:${userId}`,
  agentOrg: (orgId: string) => `rpa:agents:org:${orgId}`,
  workflow: (executionId: string) => `rpa:workflow:${executionId}`,
  workflowUser: (userId: string) => `rpa:workflows:user:${userId}`,
  operation: (operationId: string) => `rpa:operation:${operationId}`,
  monitoring: (userId: string) => `rpa:monitoring:${userId}`,
  systemStatus: 'rpa:system:status'
}

/**
 * Setup all RPA Socket.io handlers for an authenticated socket
 * 
 * This is the main entry point called by the Socket.io server when a new
 * connection is established. It determines the connection type (user vs agent)
 * and sets up the appropriate event handlers.
 * 
 * @param socket - Authenticated Socket.io connection
 * @param roomManager - Room management instance
 */
export function setupRPAHandlers(socket: RPASocket, roomManager: RoomManager) {
  logger.info(`Setting up RPA handlers for socket ${socket.id}`, {
    socketId: socket.id,
    userId: socket.userId,
    userEmail: socket.userEmail
  })

  // Initialize RPA-specific socket properties
  socket.activeOperations = new Set()
  socket.connectionType = 'user' // Default, may be overridden during agent auth
  socket.authenticatedAt = new Date()

  try {
    // Setup all RPA handler modules
    setupAgentConnectionHandlers(socket, roomManager)
    setupWorkflowExecutionHandlers(socket, roomManager) 
    setupOperationStreamingHandlers(socket, roomManager)
    setupErrorHandlingHandlers(socket, roomManager)

    // Join user-specific monitoring room for dashboard updates
    if (socket.userId) {
      const userMonitoringRoom = RPA_ROOMS.monitoring(socket.userId)
      socket.join(userMonitoringRoom)
      
      logger.debug(`Socket joined user monitoring room`, {
        socketId: socket.id,
        userId: socket.userId,
        room: userMonitoringRoom
      })
    }

    // Setup cleanup handlers for when socket disconnects
    socket.on('disconnect', (reason) => {
      handleSocketDisconnect(socket, roomManager, reason)
    })

    // Setup error handling for unhandled RPA events
    socket.onAny((eventName, ...args) => {
      if (eventName.startsWith('rpa:') && !isHandledRPAEvent(eventName)) {
        logger.warn(`Unhandled RPA event received`, {
          socketId: socket.id,
          eventName,
          agentId: socket.agentId,
          isAgent: socket.isDesktopAgent,
          argsCount: args.length
        })
      }
    })

    logger.info(`RPA handlers setup completed for socket ${socket.id}`, {
      socketId: socket.id,
      userId: socket.userId,
      agentId: socket.agentId,
      isAgent: socket.isDesktopAgent,
      rooms: Array.from(socket.rooms)
    })

  } catch (error) {
    logger.error(`Error setting up RPA handlers for socket ${socket.id}`, {
      socketId: socket.id,
      userId: socket.userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    // Emit error to client
    socket.emit('rpa:system:error', {
      error: 'Failed to initialize RPA handlers',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
      recovery: 'Please reconnect to retry initialization'
    })
  }
}

/**
 * Handle socket disconnection cleanup
 * Cleans up resources, updates agent status, and notifies other clients
 */
function handleSocketDisconnect(socket: RPASocket, roomManager: RoomManager, reason: string) {
  logger.info(`RPA socket disconnecting`, {
    socketId: socket.id,
    userId: socket.userId,
    agentId: socket.agentId,
    isAgent: socket.isDesktopAgent,
    reason,
    activeOperations: socket.activeOperations?.size || 0,
    currentExecution: socket.currentExecution
  })

  try {
    // If this is a Desktop Agent, update its status and notify clients
    if (socket.isDesktopAgent && socket.agentId) {
      handleAgentDisconnection(socket, roomManager)
    }

    // Cancel any active operations
    if (socket.activeOperations && socket.activeOperations.size > 0) {
      handleActiveOperationsCleanup(socket, roomManager)
    }

    // Handle workflow execution cleanup
    if (socket.currentExecution) {
      handleWorkflowExecutionCleanup(socket, roomManager)
    }

    // Leave all RPA rooms
    const rpaRooms = Array.from(socket.rooms).filter(room => room.startsWith('rpa:'))
    rpaRooms.forEach(room => socket.leave(room))

    logger.info(`RPA socket disconnect cleanup completed`, {
      socketId: socket.id,
      agentId: socket.agentId,
      cleanedRooms: rpaRooms.length
    })

  } catch (error) {
    logger.error(`Error during RPA socket disconnect cleanup`, {
      socketId: socket.id,
      agentId: socket.agentId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Handle Desktop Agent disconnection
 * Updates agent status in store and notifies connected users
 */
function handleAgentDisconnection(socket: RPASocket, roomManager: RoomManager) {
  if (!socket.agentId) return

  try {
    // Import agent store (dynamic import to avoid circular dependencies)
    const { agentStore } = require('@/app/api/rpa/agents/route')
    
    const agent = agentStore.get(socket.agentId)
    if (agent) {
      // Update agent status to offline
      const updatedAgent = {
        ...agent,
        status: 'offline' as const,
        connectionId: '',
        lastHeartbeat: new Date()
      }
      agentStore.set(socket.agentId, updatedAgent)

      // Notify all users monitoring this agent
      const agentAuth = require('@/app/api/rpa/agents/route').agentAuthStore.get(socket.agentId)
      if (agentAuth) {
        const userRoom = RPA_ROOMS.agentUser(agentAuth.userId)
        socket.to(userRoom).emit('rpa:agent:status', {
          agentId: socket.agentId,
          status: 'offline',
          lastSeen: new Date(),
          reason: 'disconnected'
        })

        // Also notify organization room if applicable
        if (agentAuth.workspaceId) {
          const orgRoom = RPA_ROOMS.agentOrg(agentAuth.workspaceId)
          socket.to(orgRoom).emit('rpa:agent:status', {
            agentId: socket.agentId,
            status: 'offline',
            lastSeen: new Date(),
            reason: 'disconnected'
          })
        }
      }

      logger.info(`Agent status updated to offline on disconnect`, {
        agentId: socket.agentId,
        agentName: agent.name
      })
    }
  } catch (error) {
    logger.error(`Error handling agent disconnection`, {
      socketId: socket.id,
      agentId: socket.agentId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Handle cleanup of active operations when socket disconnects
 */
function handleActiveOperationsCleanup(socket: RPASocket, roomManager: RoomManager) {
  if (!socket.activeOperations) return

  for (const operationId of socket.activeOperations) {
    try {
      // Notify operation room that operation was cancelled due to disconnect
      const operationRoom = RPA_ROOMS.operation(operationId)
      socket.to(operationRoom).emit('rpa:operation:cancelled', {
        operationId,
        reason: 'Agent disconnected',
        timestamp: new Date()
      })

      logger.debug(`Cancelled operation due to agent disconnect`, {
        operationId,
        agentId: socket.agentId
      })
    } catch (error) {
      logger.error(`Error cancelling operation on disconnect`, {
        operationId,
        agentId: socket.agentId,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
}

/**
 * Handle workflow execution cleanup when socket disconnects
 */
function handleWorkflowExecutionCleanup(socket: RPASocket, roomManager: RoomManager) {
  if (!socket.currentExecution) return

  try {
    // Notify workflow room that execution was interrupted
    const workflowRoom = RPA_ROOMS.workflow(socket.currentExecution)
    socket.to(workflowRoom).emit('rpa:workflow:interrupted', {
      executionId: socket.currentExecution,
      reason: 'Agent disconnected',
      timestamp: new Date(),
      requiresRecovery: true
    })

    logger.info(`Workflow execution interrupted by agent disconnect`, {
      executionId: socket.currentExecution,
      agentId: socket.agentId
    })
  } catch (error) {
    logger.error(`Error handling workflow execution cleanup`, {
      executionId: socket.currentExecution,
      agentId: socket.agentId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Check if an RPA event is handled by our handlers
 * Used to detect unhandled events for debugging
 */
function isHandledRPAEvent(eventName: string): boolean {
  const handledEvents = [
    // Agent connection events
    'rpa:agent:register',
    'rpa:agent:heartbeat',
    'rpa:agent:disconnect',
    
    // Operation events
    'rpa:operation:execute',
    'rpa:operation:progress',
    'rpa:operation:complete',
    'rpa:operation:error',
    'rpa:operation:cancel',
    
    // Workflow events
    'rpa:workflow:start',
    'rpa:workflow:pause',
    'rpa:workflow:resume',
    'rpa:workflow:cancel',
    'rpa:workflow:status',
    
    // Streaming events
    'rpa:stream:screenshot',
    'rpa:stream:logs',
    'rpa:stream:metrics',
    
    // System events
    'rpa:system:notification',
    'rpa:system:maintenance'
  ]
  
  return handledEvents.includes(eventName)
}

/**
 * Utility functions for room management
 */
export const RPASocketUtils = {
  /**
   * Join agent to all relevant rooms
   */
  joinAgentRooms(socket: RPASocket, agentId: string, userId: string, orgId?: string) {
    socket.join(RPA_ROOMS.agent(agentId))
    socket.join(RPA_ROOMS.agentUser(userId))
    if (orgId) {
      socket.join(RPA_ROOMS.agentOrg(orgId))
    }
  },

  /**
   * Join user to monitoring rooms
   */
  joinUserRooms(socket: AuthenticatedSocket, userId: string, orgId?: string) {
    socket.join(RPA_ROOMS.agentUser(userId))
    socket.join(RPA_ROOMS.workflowUser(userId))
    socket.join(RPA_ROOMS.monitoring(userId))
    if (orgId) {
      socket.join(RPA_ROOMS.agentOrg(orgId))
    }
  },

  /**
   * Broadcast to all agents for a user
   */
  broadcastToUserAgents(socket: AuthenticatedSocket, userId: string, event: string, data: any) {
    socket.to(RPA_ROOMS.agentUser(userId)).emit(event, data)
  },

  /**
   * Broadcast system status update
   */
  broadcastSystemStatus(socket: AuthenticatedSocket, data: any) {
    socket.to(RPA_ROOMS.systemStatus).emit('rpa:system:status', data)
  }
}

// Export room naming for use by other modules
export { RPA_ROOMS }

// Export types
export type { RPASocket, RPARooms }