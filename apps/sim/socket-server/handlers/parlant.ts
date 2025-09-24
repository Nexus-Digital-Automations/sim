import { createLogger } from '@/lib/logs/console/logger'
import type { AuthenticatedSocket } from '@/socket-server/middleware/auth'
import type { RoomManager } from '@/socket-server/rooms/manager'
import { validateParlantAccess } from '@/socket-server/middleware/parlant-permissions'
import {
  checkRateLimit,
  connectionTracker,
  logSecurityEvent,
  validateMessageContent
} from '@/socket-server/middleware/parlant-security'
import {
  ParlantAgentStatus,
  ParlantSessionStatus,
  ParlantEventType,
  type ParlantAgentEvent,
  type ParlantSessionEvent,
  type ParlantMessageEvent,
  type ParlantStatusEvent
} from '@/socket-server/types/parlant-events'

const logger = createLogger('ParlantHandlers')

/**
 * Parlant-specific Socket.io event handlers for real-time agent communication
 * Handles agent lifecycle, session management, and workspace-scoped broadcasting
 */
export function setupParlantHandlers(socket: AuthenticatedSocket, roomManager: RoomManager) {
  logger.info(`Setting up Parlant handlers for socket ${socket.id}`)

  // Track this connection for security monitoring
  if (socket.userId) {
    const trackingResult = connectionTracker.trackConnection(socket.userId, socket.id)
    if (!trackingResult.allowed) {
      logSecurityEvent('Connection denied', socket.userId, socket.id, { reason: trackingResult.reason })
      socket.disconnect(true)
      return
    }
    logSecurityEvent('Connection established', socket.userId, socket.id)
  }

  /**
   * Join agent room for real-time agent updates
   * Enables receiving agent lifecycle events (status changes, configuration updates)
   */
  socket.on('parlant:join-agent-room', async ({ agentId, workspaceId }) => {
    try {
      const userId = socket.userId
      const userName = socket.userName

      if (!userId || !userName) {
        logger.warn(`Parlant agent room join rejected: Socket ${socket.id} not authenticated`)
        socket.emit('parlant:join-agent-room-error', { error: 'Authentication required' })
        return
      }

      // Rate limiting check
      const rateLimit = checkRateLimit(socket, 'joinRoom')
      if (!rateLimit.allowed) {
        logSecurityEvent('Rate limit exceeded', userId, socket.id, { action: 'join-agent-room', agentId })
        socket.emit('parlant:join-agent-room-error', {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        })
        return
      }

      // Validate message content
      const validation = validateMessageContent({ agentId, workspaceId })
      if (!validation.isValid) {
        logSecurityEvent('Invalid message content', userId, socket.id, { errors: validation.errors })
        socket.emit('parlant:join-agent-room-error', { error: 'Invalid request data' })
        return
      }

      logger.info(`Parlant agent room join request from ${userId} (${userName}) for agent ${agentId} in workspace ${workspaceId}`)

      // Validate workspace access and agent permissions
      try {
        const access = await validateParlantAccess(userId, workspaceId, agentId)
        if (!access.canAccessAgent) {
          logger.warn(`User ${userId} (${userName}) denied access to agent ${agentId} in workspace ${workspaceId}`)
          socket.emit('parlant:join-agent-room-error', {
            error: 'Access denied to agent',
            agentId,
            workspaceId
          })
          return
        }
      } catch (error) {
        logger.warn(`Error verifying Parlant agent access for ${userId}:`, error)
        socket.emit('parlant:join-agent-room-error', { error: 'Failed to verify agent access' })
        return
      }

      // Join agent-specific room for real-time updates
      const agentRoomId = `parlant:agent:${agentId}`
      socket.join(agentRoomId)

      // Also join workspace room for workspace-level agent events
      const workspaceRoomId = `parlant:workspace:${workspaceId}`
      socket.join(workspaceRoomId)

      // Store room memberships for cleanup
      if (!socket.data) socket.data = {}
      if (!socket.data.parlantRooms) socket.data.parlantRooms = new Set()
      socket.data.parlantRooms.add(agentRoomId)
      socket.data.parlantRooms.add(workspaceRoomId)

      logger.info(`User ${userId} joined Parlant agent room ${agentRoomId} and workspace room ${workspaceRoomId}`)

      socket.emit('parlant:join-agent-room-success', {
        agentId,
        workspaceId,
        roomId: agentRoomId,
        workspaceRoomId,
        timestamp: Date.now()
      })

    } catch (error) {
      logger.error('Error joining Parlant agent room:', error)
      socket.emit('parlant:join-agent-room-error', {
        error: 'Failed to join agent room',
        agentId,
        workspaceId
      })
    }
  })

  /**
   * Join session room for real-time conversation updates
   * Enables receiving message events and session status changes
   */
  socket.on('parlant:join-session-room', async ({ sessionId, agentId, workspaceId }) => {
    try {
      const userId = socket.userId
      const userName = socket.userName

      if (!userId || !userName) {
        logger.warn(`Parlant session room join rejected: Socket ${socket.id} not authenticated`)
        socket.emit('parlant:join-session-room-error', { error: 'Authentication required' })
        return
      }

      logger.info(`Parlant session room join request from ${userId} (${userName}) for session ${sessionId}`)

      // Validate session access
      try {
        const access = await validateParlantAccess(userId, workspaceId, agentId, sessionId)
        if (!access.canAccessSession) {
          logger.warn(`User ${userId} (${userName}) denied access to session ${sessionId}`)
          socket.emit('parlant:join-session-room-error', {
            error: 'Access denied to session',
            sessionId,
            agentId,
            workspaceId
          })
          return
        }
      } catch (error) {
        logger.warn(`Error verifying Parlant session access for ${userId}:`, error)
        socket.emit('parlant:join-session-room-error', { error: 'Failed to verify session access' })
        return
      }

      // Join session-specific room for real-time conversation updates
      const sessionRoomId = `parlant:session:${sessionId}`
      socket.join(sessionRoomId)

      // Store room memberships for cleanup
      if (!socket.data) socket.data = {}
      if (!socket.data.parlantRooms) socket.data.parlantRooms = new Set()
      socket.data.parlantRooms.add(sessionRoomId)

      logger.info(`User ${userId} joined Parlant session room ${sessionRoomId}`)

      socket.emit('parlant:join-session-room-success', {
        sessionId,
        agentId,
        workspaceId,
        roomId: sessionRoomId,
        timestamp: Date.now()
      })

    } catch (error) {
      logger.error('Error joining Parlant session room:', error)
      socket.emit('parlant:join-session-room-error', {
        error: 'Failed to join session room',
        sessionId,
        agentId,
        workspaceId
      })
    }
  })

  /**
   * Leave agent room
   * Stops receiving agent lifecycle events
   */
  socket.on('parlant:leave-agent-room', ({ agentId }) => {
    try {
      const agentRoomId = `parlant:agent:${agentId}`
      socket.leave(agentRoomId)

      // Remove from stored room memberships
      if (socket.data?.parlantRooms) {
        socket.data.parlantRooms.delete(agentRoomId)
      }

      logger.info(`Socket ${socket.id} left Parlant agent room ${agentRoomId}`)

      socket.emit('parlant:leave-agent-room-success', {
        agentId,
        roomId: agentRoomId,
        timestamp: Date.now()
      })
    } catch (error) {
      logger.error('Error leaving Parlant agent room:', error)
      socket.emit('parlant:leave-agent-room-error', {
        error: 'Failed to leave agent room',
        agentId
      })
    }
  })

  /**
   * Leave session room
   * Stops receiving conversation updates
   */
  socket.on('parlant:leave-session-room', ({ sessionId }) => {
    try {
      const sessionRoomId = `parlant:session:${sessionId}`
      socket.leave(sessionRoomId)

      // Remove from stored room memberships
      if (socket.data?.parlantRooms) {
        socket.data.parlantRooms.delete(sessionRoomId)
      }

      logger.info(`Socket ${socket.id} left Parlant session room ${sessionRoomId}`)

      socket.emit('parlant:leave-session-room-success', {
        sessionId,
        roomId: sessionRoomId,
        timestamp: Date.now()
      })
    } catch (error) {
      logger.error('Error leaving Parlant session room:', error)
      socket.emit('parlant:leave-session-room-error', {
        error: 'Failed to leave session room',
        sessionId
      })
    }
  })

  /**
   * Request agent status update
   * Triggers broadcasting current agent status to room members
   */
  socket.on('parlant:request-agent-status', async ({ agentId, workspaceId }) => {
    try {
      const userId = socket.userId

      if (!userId) {
        socket.emit('parlant:request-agent-status-error', { error: 'Authentication required' })
        return
      }

      // Validate access
      const access = await validateParlantAccess(userId, workspaceId, agentId)
      if (!access.canAccessAgent) {
        socket.emit('parlant:request-agent-status-error', {
          error: 'Access denied to agent',
          agentId,
          workspaceId
        })
        return
      }

      // Emit current agent status (this would be populated from database/cache in real implementation)
      const statusEvent: ParlantStatusEvent = {
        type: ParlantEventType.AGENT_STATUS_UPDATE,
        agentId,
        workspaceId,
        status: ParlantAgentStatus.ONLINE, // This would come from actual status tracking
        timestamp: Date.now(),
        metadata: {
          requestedBy: userId
        }
      }

      socket.emit('parlant:agent-status-update', statusEvent)

      logger.info(`Sent agent status update for ${agentId} to user ${userId}`)

    } catch (error) {
      logger.error('Error requesting agent status:', error)
      socket.emit('parlant:request-agent-status-error', {
        error: 'Failed to get agent status',
        agentId,
        workspaceId
      })
    }
  })

  /**
   * Handle socket disconnection cleanup
   * Removes socket from all Parlant rooms and cleans up resources
   */
  socket.on('disconnect', (reason) => {
    try {
      const userId = socket.userId
      const parlantRooms = socket.data?.parlantRooms

      if (parlantRooms && parlantRooms.size > 0) {
        logger.info(`Cleaning up Parlant rooms for disconnected socket ${socket.id} (user: ${userId})`, {
          roomCount: parlantRooms.size,
          rooms: Array.from(parlantRooms),
          reason
        })

        // Leave all Parlant rooms
        parlantRooms.forEach((roomId: string) => {
          socket.leave(roomId)
        })

        // Clear stored room memberships
        parlantRooms.clear()
      }

      // Remove from connection tracking
      if (userId) {
        connectionTracker.removeConnection(userId, socket.id)
        logSecurityEvent('Connection disconnected', userId, socket.id, { reason })
      }
    } catch (error) {
      logger.error('Error during Parlant room cleanup on disconnect:', error)
    }
  })

  logger.info(`Parlant handlers setup completed for socket ${socket.id}`)
}

/**
 * Parlant room management utilities
 */
export class ParlantRoomManager {
  constructor(private roomManager: RoomManager) {}

  /**
   * Broadcast agent event to all users with access to the agent
   */
  async broadcastAgentEvent(event: ParlantAgentEvent): Promise<void> {
    try {
      const { agentId, workspaceId } = event

      // Broadcast to agent-specific room
      const agentRoomId = `parlant:agent:${agentId}`
      this.roomManager.emitToWorkflow(agentRoomId, 'parlant:agent-event', event)

      // Also broadcast to workspace room for workspace-level listeners
      const workspaceRoomId = `parlant:workspace:${workspaceId}`
      this.roomManager.emitToWorkflow(workspaceRoomId, 'parlant:workspace-agent-event', event)

      logger.info(`Broadcasted agent event ${event.type} for agent ${agentId} to rooms ${agentRoomId} and ${workspaceRoomId}`)

    } catch (error) {
      logger.error('Error broadcasting agent event:', error)
      throw error
    }
  }

  /**
   * Broadcast session event to all users with access to the session
   */
  async broadcastSessionEvent(event: ParlantSessionEvent): Promise<void> {
    try {
      const { sessionId, agentId, workspaceId } = event

      // Broadcast to session-specific room
      const sessionRoomId = `parlant:session:${sessionId}`
      this.roomManager.emitToWorkflow(sessionRoomId, 'parlant:session-event', event)

      // Also broadcast to agent room for users monitoring the agent
      const agentRoomId = `parlant:agent:${agentId}`
      this.roomManager.emitToWorkflow(agentRoomId, 'parlant:agent-session-event', event)

      logger.info(`Broadcasted session event ${event.type} for session ${sessionId} to rooms ${sessionRoomId} and ${agentRoomId}`)

    } catch (error) {
      logger.error('Error broadcasting session event:', error)
      throw error
    }
  }

  /**
   * Broadcast message event to session participants
   */
  async broadcastMessageEvent(event: ParlantMessageEvent): Promise<void> {
    try {
      const { sessionId } = event

      // Broadcast to session room
      const sessionRoomId = `parlant:session:${sessionId}`
      this.roomManager.emitToWorkflow(sessionRoomId, 'parlant:message-event', event)

      logger.info(`Broadcasted message event for session ${sessionId} to room ${sessionRoomId}`)

    } catch (error) {
      logger.error('Error broadcasting message event:', error)
      throw error
    }
  }

  /**
   * Broadcast status event to appropriate rooms
   */
  async broadcastStatusEvent(event: ParlantStatusEvent): Promise<void> {
    try {
      const { agentId, workspaceId } = event

      // Broadcast to agent room
      const agentRoomId = `parlant:agent:${agentId}`
      this.roomManager.emitToWorkflow(agentRoomId, 'parlant:status-event', event)

      // Also broadcast to workspace room
      const workspaceRoomId = `parlant:workspace:${workspaceId}`
      this.roomManager.emitToWorkflow(workspaceRoomId, 'parlant:workspace-status-event', event)

      logger.info(`Broadcasted status event ${event.type} for agent ${agentId} to rooms ${agentRoomId} and ${workspaceRoomId}`)

    } catch (error) {
      logger.error('Error broadcasting status event:', error)
      throw error
    }
  }

  /**
   * Get active users in agent room
   */
  getActiveUsersInAgentRoom(agentId: string): number {
    const agentRoomId = `parlant:agent:${agentId}`
    // Note: This would need to be implemented with actual room tracking
    // For now, returning 0 as placeholder
    return 0
  }

  /**
   * Get active users in session room
   */
  getActiveUsersInSessionRoom(sessionId: string): number {
    const sessionRoomId = `parlant:session:${sessionId}`
    // Note: This would need to be implemented with actual room tracking
    // For now, returning 0 as placeholder
    return 0
  }
}