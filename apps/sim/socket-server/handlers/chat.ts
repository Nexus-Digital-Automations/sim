import { createLogger } from '@/lib/logs/console/logger'
import type { AuthenticatedSocket } from '@/socket-server/middleware/auth'
import { validateParlantAccess } from '@/socket-server/middleware/parlant-permissions'
import {
  checkRateLimit,
  connectionTracker,
  logSecurityEvent,
  validateMessageContent,
} from '@/socket-server/middleware/parlant-security'
import type { RoomManager } from '@/socket-server/rooms/manager'
import {
  ParlantEventType,
  type ParlantMessageEvent,
  ParlantMessageType,
  type ParlantSessionEvent,
  type ParlantSessionStatus,
} from '@/socket-server/types/parlant-events'

const logger = createLogger('ChatHandlers')

/**
 * Real-time chat message interface
 */
interface ChatMessage {
  id: string
  content: string
  type: 'user' | 'assistant' | 'system'
  timestamp: number
  sessionId: string
  userId?: string
  agentId?: string
  metadata?: {
    isStreaming?: boolean
    isComplete?: boolean
    processingTime?: number
    tokens?: number
    toolCalls?: Array<{
      id: string
      name: string
      parameters: any
      result?: any
    }>
  }
}

/**
 * Typing indicator interface
 */
interface TypingIndicator {
  sessionId: string
  userId?: string
  agentId?: string
  isTyping: boolean
  timestamp: number
}

/**
 * Chat presence interface
 */
interface ChatPresence {
  sessionId: string
  userId: string
  userName: string
  socketId: string
  joinedAt: number
  lastActivity: number
  status: 'active' | 'idle' | 'away'
}

/**
 * Enhanced Socket.io chat handlers for real-time messaging with workspace isolation
 * Integrates with existing Parlant infrastructure for agent communication
 */
export function setupChatHandlers(socket: AuthenticatedSocket, roomManager: RoomManager) {
  logger.info(`Setting up enhanced chat handlers for socket ${socket.id}`)

  // Track this connection for security monitoring
  if (socket.userId) {
    const trackingResult = connectionTracker.trackConnection(socket.userId, socket.id)
    if (!trackingResult.allowed) {
      logSecurityEvent('Chat connection denied', socket.userId, socket.id, {
        reason: trackingResult.reason,
      })
      socket.disconnect(true)
      return
    }
    logSecurityEvent('Chat connection established', socket.userId, socket.id)
  }

  /**
   * Join chat session room for real-time messaging
   * Enables bidirectional chat communication with workspace isolation
   */
  socket.on('chat:join-session', async ({ sessionId, agentId, workspaceId }) => {
    try {
      const userId = socket.userId
      const userName = socket.userName

      if (!userId || !userName) {
        logger.warn(`Chat session join rejected: Socket ${socket.id} not authenticated`)
        socket.emit('chat:join-session-error', { error: 'Authentication required' })
        return
      }

      // Rate limiting check
      const rateLimit = checkRateLimit(socket, 'joinRoom')
      if (!rateLimit.allowed) {
        logSecurityEvent('Chat rate limit exceeded', userId, socket.id, {
          action: 'join-session',
          sessionId,
        })
        socket.emit('chat:join-session-error', {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        })
        return
      }

      // Validate message content
      const validation = validateMessageContent({ sessionId, agentId, workspaceId })
      if (!validation.isValid) {
        logSecurityEvent('Invalid chat session data', userId, socket.id, {
          errors: validation.errors,
        })
        socket.emit('chat:join-session-error', { error: 'Invalid request data' })
        return
      }

      logger.info(
        `Chat session join request from ${userId} (${userName}) for session ${sessionId} with agent ${agentId} in workspace ${workspaceId}`
      )

      // Validate workspace access and session permissions
      try {
        const access = await validateParlantAccess(userId, workspaceId, agentId, sessionId)
        if (!access.canAccessSession) {
          logger.warn(`User ${userId} (${userName}) denied access to chat session ${sessionId}`)
          socket.emit('chat:join-session-error', {
            error: 'Access denied to chat session',
            sessionId,
            agentId,
            workspaceId,
          })
          return
        }
      } catch (error) {
        logger.warn(`Error verifying chat session access for ${userId}:`, error)
        socket.emit('chat:join-session-error', { error: 'Failed to verify session access' })
        return
      }

      // Join chat session room for real-time messaging
      const sessionRoomId = `chat:session:${sessionId}`
      const workspaceRoomId = `chat:workspace:${workspaceId}`

      socket.join(sessionRoomId)
      socket.join(workspaceRoomId)

      // Store room memberships for cleanup
      if (!socket.data) socket.data = {}
      if (!socket.data.chatRooms) socket.data.chatRooms = new Set()
      socket.data.chatRooms.add(sessionRoomId)
      socket.data.chatRooms.add(workspaceRoomId)

      // Store chat session metadata
      socket.data.currentChatSession = {
        sessionId,
        agentId,
        workspaceId,
        joinedAt: Date.now(),
      }

      // Broadcast user presence to session room
      const presence: ChatPresence = {
        sessionId,
        userId,
        userName,
        socketId: socket.id,
        joinedAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
      }

      socket.to(sessionRoomId).emit('chat:user-joined', presence)

      logger.info(
        `User ${userId} joined chat session room ${sessionRoomId} and workspace room ${workspaceRoomId}`
      )

      socket.emit('chat:join-session-success', {
        sessionId,
        agentId,
        workspaceId,
        roomId: sessionRoomId,
        workspaceRoomId,
        timestamp: Date.now(),
        presence,
      })
    } catch (error) {
      logger.error('Error joining chat session:', error)
      socket.emit('chat:join-session-error', {
        error: 'Failed to join chat session',
        sessionId,
        agentId,
        workspaceId,
      })
    }
  })

  /**
   * Send chat message with real-time broadcasting
   */
  socket.on('chat:send-message', async ({ message }: { message: ChatMessage }) => {
    try {
      const userId = socket.userId
      const userName = socket.userName

      if (!userId || !userName) {
        socket.emit('chat:send-message-error', { error: 'Authentication required' })
        return
      }

      // Rate limiting check for message sending
      const rateLimit = checkRateLimit(socket, 'sendMessage')
      if (!rateLimit.allowed) {
        logSecurityEvent('Chat message rate limit exceeded', userId, socket.id, {
          sessionId: message.sessionId,
        })
        socket.emit('chat:send-message-error', {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        })
        return
      }

      // Validate message content
      const validation = validateMessageContent({
        content: message.content,
        sessionId: message.sessionId,
      })
      if (!validation.isValid) {
        logSecurityEvent('Invalid chat message content', userId, socket.id, {
          errors: validation.errors,
        })
        socket.emit('chat:send-message-error', { error: 'Invalid message content' })
        return
      }

      // Validate session access
      const sessionData = socket.data.currentChatSession
      if (!sessionData || sessionData.sessionId !== message.sessionId) {
        socket.emit('chat:send-message-error', {
          error: 'Not joined to this chat session',
          sessionId: message.sessionId,
        })
        return
      }

      // Enhance message with server metadata
      const enhancedMessage: ChatMessage = {
        ...message,
        id: message.id || crypto.randomUUID(),
        userId,
        timestamp: Date.now(),
        metadata: {
          ...message.metadata,
          senderName: userName,
          senderSocketId: socket.id,
        },
      }

      // Broadcast message to session room (excluding sender)
      const sessionRoomId = `chat:session:${message.sessionId}`
      socket.to(sessionRoomId).emit('chat:message-received', enhancedMessage)

      // Confirm message sent to sender
      socket.emit('chat:message-sent', {
        messageId: enhancedMessage.id,
        timestamp: enhancedMessage.timestamp,
        sessionId: message.sessionId,
      })

      // Create Parlant message event for integration
      const parlantEvent: ParlantMessageEvent = {
        type: ParlantEventType.MESSAGE_SENT,
        sessionId: message.sessionId,
        messageId: enhancedMessage.id,
        messageType: ParlantMessageType.USER_MESSAGE,
        content: message.content,
        workspaceId: sessionData.workspaceId,
        userId,
        timestamp: enhancedMessage.timestamp,
        data: {
          messageIndex: 0, // Would be calculated based on session history
          processingTime: 0,
        },
        metadata: enhancedMessage.metadata,
      }

      // Broadcast to Parlant session room if exists
      const parlantSessionRoomId = `parlant:session:${message.sessionId}`
      roomManager.emitToWorkflow(parlantSessionRoomId, 'parlant:message-event', parlantEvent)

      logger.info(
        `Chat message sent by ${userId} in session ${message.sessionId}: ${message.content.substring(0, 100)}...`
      )
    } catch (error) {
      logger.error('Error sending chat message:', error)
      socket.emit('chat:send-message-error', {
        error: 'Failed to send message',
        messageId: message.id,
      })
    }
  })

  /**
   * Handle typing indicators
   */
  socket.on(
    'chat:typing',
    async ({ sessionId, isTyping }: { sessionId: string; isTyping: boolean }) => {
      try {
        const userId = socket.userId
        const userName = socket.userName

        if (!userId || !userName) {
          return
        }

        // Rate limiting for typing indicators
        const rateLimit = checkRateLimit(socket, 'typing')
        if (!rateLimit.allowed) {
          return // Silently ignore typing when rate limited
        }

        // Validate session access
        const sessionData = socket.data.currentChatSession
        if (!sessionData || sessionData.sessionId !== sessionId) {
          return
        }

        const typingIndicator: TypingIndicator = {
          sessionId,
          userId,
          isTyping,
          timestamp: Date.now(),
        }

        // Broadcast typing indicator to session room (excluding sender)
        const sessionRoomId = `chat:session:${sessionId}`
        socket.to(sessionRoomId).emit('chat:typing-indicator', typingIndicator)

        // Create Parlant typing event
        const parlantEvent: ParlantMessageEvent = {
          type: ParlantEventType.MESSAGE_TYPING,
          sessionId,
          messageId: `typing_${Date.now()}`,
          messageType: ParlantMessageType.SYSTEM_MESSAGE,
          content: '',
          workspaceId: sessionData.workspaceId,
          userId,
          timestamp: Date.now(),
          data: {
            isTyping,
          },
          metadata: {
            typingIndicator: true,
            userName,
          },
        }

        // Broadcast to Parlant session room if exists
        const parlantSessionRoomId = `parlant:session:${sessionId}`
        roomManager.emitToWorkflow(parlantSessionRoomId, 'parlant:message-event', parlantEvent)

        logger.debug(`Typing indicator from ${userId} in session ${sessionId}: ${isTyping}`)
      } catch (error) {
        logger.error('Error handling typing indicator:', error)
      }
    }
  )

  /**
   * Update user presence status
   */
  socket.on(
    'chat:update-presence',
    async ({ sessionId, status }: { sessionId: string; status: 'active' | 'idle' | 'away' }) => {
      try {
        const userId = socket.userId
        const userName = socket.userName

        if (!userId || !userName) {
          return
        }

        // Validate session access
        const sessionData = socket.data.currentChatSession
        if (!sessionData || sessionData.sessionId !== sessionId) {
          return
        }

        const presence: ChatPresence = {
          sessionId,
          userId,
          userName,
          socketId: socket.id,
          joinedAt: sessionData.joinedAt || Date.now(),
          lastActivity: Date.now(),
          status,
        }

        // Broadcast presence update to session room
        const sessionRoomId = `chat:session:${sessionId}`
        socket.to(sessionRoomId).emit('chat:presence-updated', presence)

        logger.debug(`Presence updated for ${userId} in session ${sessionId}: ${status}`)
      } catch (error) {
        logger.error('Error updating chat presence:', error)
      }
    }
  )

  /**
   * Leave chat session room
   */
  socket.on('chat:leave-session', ({ sessionId }) => {
    try {
      const userId = socket.userId
      const sessionRoomId = `chat:session:${sessionId}`

      socket.leave(sessionRoomId)

      // Remove from stored room memberships
      if (socket.data?.chatRooms) {
        socket.data.chatRooms.delete(sessionRoomId)
      }

      // Broadcast user left event
      if (userId) {
        socket.to(sessionRoomId).emit('chat:user-left', {
          sessionId,
          userId,
          socketId: socket.id,
          timestamp: Date.now(),
        })
      }

      // Clear current session data
      if (socket.data.currentChatSession?.sessionId === sessionId) {
        socket.data.currentChatSession = null
      }

      logger.info(`Socket ${socket.id} left chat session room ${sessionRoomId}`)

      socket.emit('chat:leave-session-success', {
        sessionId,
        roomId: sessionRoomId,
        timestamp: Date.now(),
      })
    } catch (error) {
      logger.error('Error leaving chat session:', error)
      socket.emit('chat:leave-session-error', {
        error: 'Failed to leave chat session',
        sessionId,
      })
    }
  })

  /**
   * Request session history
   */
  socket.on(
    'chat:request-history',
    async ({
      sessionId,
      limit,
      offset,
    }: {
      sessionId: string
      limit?: number
      offset?: number
    }) => {
      try {
        const userId = socket.userId

        if (!userId) {
          socket.emit('chat:request-history-error', { error: 'Authentication required' })
          return
        }

        // Validate session access
        const sessionData = socket.data.currentChatSession
        if (!sessionData || sessionData.sessionId !== sessionId) {
          socket.emit('chat:request-history-error', {
            error: 'Not joined to this chat session',
            sessionId,
          })
          return
        }

        // Rate limiting for history requests
        const rateLimit = checkRateLimit(socket, 'historyRequest')
        if (!rateLimit.allowed) {
          socket.emit('chat:request-history-error', {
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
          })
          return
        }

        // TODO: Fetch actual chat history from database
        // For now, return empty history as this would be implemented
        // when integrating with the chat storage system
        const history: ChatMessage[] = []

        socket.emit('chat:history-response', {
          sessionId,
          messages: history,
          limit: limit || 50,
          offset: offset || 0,
          hasMore: false,
          timestamp: Date.now(),
        })

        logger.info(`Chat history requested for session ${sessionId} by user ${userId}`)
      } catch (error) {
        logger.error('Error requesting chat history:', error)
        socket.emit('chat:request-history-error', {
          error: 'Failed to fetch chat history',
          sessionId,
        })
      }
    }
  )

  /**
   * Handle agent message streaming (from Parlant to chat)
   */
  socket.on(
    'chat:agent-message-stream',
    async ({
      sessionId,
      messageId,
      chunk,
      isComplete,
    }: {
      sessionId: string
      messageId: string
      chunk: string
      isComplete: boolean
    }) => {
      try {
        // This would typically be called by the Parlant agent service
        // when streaming responses to the chat interface

        const sessionData = socket.data.currentChatSession
        if (!sessionData || sessionData.sessionId !== sessionId) {
          return
        }

        const streamEvent = {
          sessionId,
          messageId,
          chunk,
          isComplete,
          timestamp: Date.now(),
        }

        // Broadcast stream chunk to session room
        const sessionRoomId = `chat:session:${sessionId}`
        roomManager.emitToWorkflow(sessionRoomId, 'chat:agent-stream-chunk', streamEvent)

        if (isComplete) {
          // Create final message event
          const completeMessage: ChatMessage = {
            id: messageId,
            content: chunk, // This would be the complete message content
            type: 'assistant',
            sessionId,
            agentId: sessionData.agentId,
            timestamp: Date.now(),
            metadata: {
              isStreaming: false,
              isComplete: true,
            },
          }

          roomManager.emitToWorkflow(sessionRoomId, 'chat:message-received', completeMessage)
        }

        logger.debug(
          `Agent message stream for session ${sessionId}: ${chunk.length} chars, complete: ${isComplete}`
        )
      } catch (error) {
        logger.error('Error handling agent message stream:', error)
      }
    }
  )

  /**
   * Handle socket disconnection cleanup
   */
  socket.on('disconnect', (reason) => {
    try {
      const userId = socket.userId
      const chatRooms = socket.data?.chatRooms
      const currentSession = socket.data?.currentChatSession

      if (chatRooms && chatRooms.size > 0) {
        logger.info(
          `Cleaning up chat rooms for disconnected socket ${socket.id} (user: ${userId})`,
          {
            roomCount: chatRooms.size,
            rooms: Array.from(chatRooms),
            reason,
          }
        )

        // Broadcast user left events for active sessions
        if (currentSession && userId) {
          const sessionRoomId = `chat:session:${currentSession.sessionId}`
          socket.to(sessionRoomId).emit('chat:user-left', {
            sessionId: currentSession.sessionId,
            userId,
            socketId: socket.id,
            timestamp: Date.now(),
            reason,
          })
        }

        // Leave all chat rooms
        chatRooms.forEach((roomId: string) => {
          socket.leave(roomId)
        })

        chatRooms.clear()
      }

      // Remove from connection tracking
      if (userId) {
        connectionTracker.removeConnection(userId, socket.id)
        logSecurityEvent('Chat connection disconnected', userId, socket.id, { reason })
      }
    } catch (error) {
      logger.error('Error during chat room cleanup on disconnect:', error)
    }
  })

  logger.info(`Enhanced chat handlers setup completed for socket ${socket.id}`)
}

/**
 * Chat room management utilities
 */
export class ChatRoomManager {
  constructor(private roomManager: RoomManager) {}

  /**
   * Broadcast message to chat session
   */
  async broadcastMessageToSession(sessionId: string, message: ChatMessage): Promise<void> {
    try {
      const sessionRoomId = `chat:session:${sessionId}`
      this.roomManager.emitToWorkflow(sessionRoomId, 'chat:message-received', message)

      logger.info(`Broadcasted message to chat session ${sessionId}`)
    } catch (error) {
      logger.error('Error broadcasting message to session:', error)
      throw error
    }
  }

  /**
   * Broadcast typing indicator to session
   */
  async broadcastTypingToSession(sessionId: string, indicator: TypingIndicator): Promise<void> {
    try {
      const sessionRoomId = `chat:session:${sessionId}`
      this.roomManager.emitToWorkflow(sessionRoomId, 'chat:typing-indicator', indicator)

      logger.debug(`Broadcasted typing indicator to session ${sessionId}`)
    } catch (error) {
      logger.error('Error broadcasting typing indicator:', error)
      throw error
    }
  }

  /**
   * Get active users in chat session
   */
  getActiveUsersInSession(sessionId: string): number {
    const sessionRoomId = `chat:session:${sessionId}`
    // This would need to be implemented with actual room tracking
    return 0
  }

  /**
   * Broadcast session status change
   */
  async broadcastSessionStatusChange(
    sessionId: string,
    status: ParlantSessionStatus,
    metadata?: any
  ): Promise<void> {
    try {
      const sessionRoomId = `chat:session:${sessionId}`

      const statusEvent: ParlantSessionEvent = {
        type: ParlantEventType.SESSION_STATUS_CHANGED,
        sessionId,
        timestamp: Date.now(),
        data: {
          status,
        },
        metadata,
      }

      this.roomManager.emitToWorkflow(sessionRoomId, 'chat:session-status-changed', statusEvent)

      logger.info(`Broadcasted session status change for ${sessionId}: ${status}`)
    } catch (error) {
      logger.error('Error broadcasting session status change:', error)
      throw error
    }
  }
}

// Export types for use in other modules
export type { ChatMessage, TypingIndicator, ChatPresence }
