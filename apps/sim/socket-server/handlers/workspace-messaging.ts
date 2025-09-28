/**
 * Workspace Messaging Socket.io Handler
 * ====================================
 *
 * This module integrates the workspace messaging system with Socket.io
 * providing real-time messaging capabilities with enterprise-grade isolation.
 *
 * Features:
 * - Workspace-scoped message routing and delivery
 * - Real-time presence management and status updates
 * - Message encryption and secure transmission
 * - Comprehensive audit logging and compliance
 * - Integration with existing Socket.io infrastructure
 */

import type { Server, Socket } from 'socket.io'
import { auditLog } from '@/lib/audit/logger'
import { type SimSession, verifySocketSession } from '@/lib/auth/socket-auth'
import { encrypt } from '@/lib/crypto/encryption'
import { prisma } from '@/lib/database'
import { createLogger } from '@/lib/logs/console/logger'
import { redis } from '@/lib/redis'

const logger = createLogger('WorkspaceMessaging')

interface WorkspaceMessage {
  id: string
  workspaceId: string
  senderId: string
  recipientId?: string
  channelId?: string
  agentId?: string
  type: 'chat' | 'system' | 'presence' | 'status' | 'file' | 'notification' | 'agent_response'
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical'
  content: string
  encryptedContent?: string
  metadata: Record<string, any>
  createdAt: Date
  threadId?: string
  replyToMessageId?: string
  securityLabels: string[]
  complianceFlags: string[]
}

interface PresenceInfo {
  userId: string
  workspaceId: string
  status: 'online' | 'away' | 'busy' | 'offline' | 'invisible'
  lastSeen: Date
  socketId: string
  customStatus?: string
  deviceInfo: Record<string, any>
}

interface ConnectionContext {
  socket: Socket
  session: SimSession
  workspaceId: string
  connectionId: string
  connectedAt: Date
  subscribedChannels: Set<string>
  messageFilters: Record<string, any>
  isActive: boolean
}

class WorkspaceMessagingHandler {
  private io: Server
  private workspaceConnections: Map<string, Map<string, ConnectionContext>> = new Map()
  private userPresence: Map<string, Map<string, PresenceInfo>> = new Map()
  private rateLimiters: Map<string, { count: number; windowStart: Date }> = new Map()
  private encryptionKeys: Map<string, string> = new Map()

  constructor(io: Server) {
    this.io = io
    this.setupEventHandlers()
  }

  /**
   * Set up Socket.io event handlers for workspace messaging
   */
  private setupEventHandlers() {
    this.io.on('connection', async (socket: Socket) => {
      try {
        // Verify authentication and get session
        const session = await verifySocketSession(socket)
        if (!session) {
          socket.disconnect(true)
          return
        }

        logger.info('New workspace messaging connection', {
          socketId: socket.id,
          userId: session.user.id,
          userEmail: session.user.email,
        })

        // Set up workspace-specific handlers
        this.setupWorkspaceHandlers(socket, session)

        // Handle disconnection
        socket.on('disconnect', async (reason) => {
          await this.handleDisconnection(socket, session, reason)
        })
      } catch (error) {
        logger.error('Failed to handle new connection', error)
        socket.disconnect(true)
      }
    })
  }

  /**
   * Set up workspace-specific event handlers
   */
  private setupWorkspaceHandlers(socket: Socket, session: SimSession) {
    // Join workspace messaging room
    socket.on('join-workspace-messaging', async (data) => {
      await this.handleJoinWorkspaceMessaging(socket, session, data)
    })

    // Leave workspace messaging room
    socket.on('leave-workspace-messaging', async (data) => {
      await this.handleLeaveWorkspaceMessaging(socket, session, data)
    })

    // Send message
    socket.on('send-workspace-message', async (data) => {
      await this.handleSendMessage(socket, session, data)
    })

    // Update presence
    socket.on('update-workspace-presence', async (data) => {
      await this.handleUpdatePresence(socket, session, data)
    })

    // Subscribe to channel
    socket.on('subscribe-to-channel', async (data) => {
      await this.handleSubscribeToChannel(socket, session, data)
    })

    // Unsubscribe from channel
    socket.on('unsubscribe-from-channel', async (data) => {
      await this.handleUnsubscribeFromChannel(socket, session, data)
    })

    // Get message history
    socket.on('get-message-history', async (data) => {
      await this.handleGetMessageHistory(socket, session, data)
    })

    // Mark messages as read
    socket.on('mark-messages-read', async (data) => {
      await this.handleMarkMessagesRead(socket, session, data)
    })

    // Agent interaction events
    socket.on('agent-chat-message', async (data) => {
      await this.handleAgentChatMessage(socket, session, data)
    })

    // File sharing events
    socket.on('share-file', async (data) => {
      await this.handleFileSharing(socket, session, data)
    })
  }

  /**
   * Handle joining workspace messaging room
   */
  private async handleJoinWorkspaceMessaging(
    socket: Socket,
    session: SimSession,
    data: { workspaceId: string; channels?: string[] }
  ) {
    try {
      const { workspaceId, channels = ['general'] } = data

      // Validate workspace access
      const hasAccess = await this.validateWorkspaceAccess(session, workspaceId)
      if (!hasAccess) {
        socket.emit('workspace-messaging-error', {
          error: 'Access denied to workspace',
          workspaceId,
        })
        return
      }

      // Create connection context
      const connectionContext: ConnectionContext = {
        socket,
        session,
        workspaceId,
        connectionId: socket.id,
        connectedAt: new Date(),
        subscribedChannels: new Set(channels),
        messageFilters: {},
        isActive: true,
      }

      // Add to workspace connections
      if (!this.workspaceConnections.has(workspaceId)) {
        this.workspaceConnections.set(workspaceId, new Map())
      }
      this.workspaceConnections.get(workspaceId)!.set(socket.id, connectionContext)

      // Join Socket.io rooms
      await socket.join(`workspace:${workspaceId}`)
      for (const channel of channels) {
        await socket.join(`workspace:${workspaceId}:channel:${channel}`)
      }

      // Update user presence
      await this.updateUserPresence(session.user.id, workspaceId, 'online', socket.id)

      // Send recent messages
      await this.sendRecentMessages(socket, workspaceId, channels)

      // Broadcast user joined event
      socket.to(`workspace:${workspaceId}`).emit('user-joined-messaging', {
        userId: session.user.id,
        userName: session.user.Name || session.user.email,
        timestamp: new Date().toISOString(),
      })

      // Confirm successful join
      socket.emit('workspace-messaging-joined', {
        workspaceId,
        channels,
        connectionId: socket.id,
        timestamp: new Date().toISOString(),
      })

      // Log for audit
      await auditLog.log({
        action: 'workspace_messaging_joined',
        userId: session.user.id,
        workspaceId,
        metadata: { channels, socketId: socket.id },
      })

      logger.info('User joined workspace messaging', {
        userId: session.user.id,
        workspaceId,
        socketId: socket.id,
        channels,
      })
    } catch (error) {
      logger.error('Failed to join workspace messaging', error)
      socket.emit('workspace-messaging-error', {
        error: 'Failed to join workspace messaging',
        details: error.message,
      })
    }
  }

  /**
   * Handle leaving workspace messaging room
   */
  private async handleLeaveWorkspaceMessaging(
    socket: Socket,
    session: SimSession,
    data: { workspaceId: string }
  ) {
    try {
      const { workspaceId } = data

      // Remove from workspace connections
      const workspaceConns = this.workspaceConnections.get(workspaceId)
      if (workspaceConns) {
        workspaceConns.delete(socket.id)
        if (workspaceConns.size === 0) {
          this.workspaceConnections.delete(workspaceId)
        }
      }

      // Leave Socket.io rooms
      await socket.leave(`workspace:${workspaceId}`)
      const rooms = Array.from(socket.rooms)
      for (const room of rooms) {
        if (room.startsWith(`workspace:${workspaceId}:`)) {
          await socket.leave(room)
        }
      }

      // Update user presence
      await this.updateUserPresence(session.user.id, workspaceId, 'offline', socket.id)

      // Broadcast user left event
      socket.to(`workspace:${workspaceId}`).emit('user-left-messaging', {
        userId: session.user.id,
        userName: session.user.Name || session.user.email,
        timestamp: new Date().toISOString(),
      })

      // Confirm successful leave
      socket.emit('workspace-messaging-left', {
        workspaceId,
        timestamp: new Date().toISOString(),
      })

      logger.info('User left workspace messaging', {
        userId: session.user.id,
        workspaceId,
        socketId: socket.id,
      })
    } catch (error) {
      logger.error('Failed to leave workspace messaging', error)
    }
  }

  /**
   * Handle sending workspace message
   */
  private async handleSendMessage(
    socket: Socket,
    session: SimSession,
    data: {
      workspaceId: string
      content: string
      type?: string
      priority?: string
      recipientId?: string
      channelId?: string
      threadId?: string
      replyToMessageId?: string
      metadata?: Record<string, any>
    }
  ) {
    try {
      const {
        workspaceId,
        content,
        type = 'chat',
        priority = 'normal',
        recipientId,
        channelId = 'general',
        threadId,
        replyToMessageId,
        metadata = {},
      } = data

      // Validate workspace access
      const hasAccess = await this.validateWorkspaceAccess(session, workspaceId)
      if (!hasAccess) {
        socket.emit('message-error', {
          error: 'Access denied to workspace',
          workspaceId,
        })
        return
      }

      // Apply rate limiting
      if (!(await this.checkRateLimit(session.user.id))) {
        socket.emit('message-error', {
          error: 'Message rate limit exceeded',
        })
        return
      }

      // Create message object
      const message: WorkspaceMessage = {
        id: crypto.randomUUID(),
        workspaceId,
        senderId: session.user.id,
        recipientId,
        channelId,
        type: type as any,
        priority: priority as any,
        content,
        metadata: {
          ...metadata,
          senderName: session.user.Name || session.user.email,
          senderEmail: session.user.email,
        },
        createdAt: new Date(),
        threadId,
        replyToMessageId,
        securityLabels: [],
        complianceFlags: [],
      }

      // Apply security validation
      await this.validateMessageSecurity(message)

      // Encrypt message if required
      if (await this.shouldEncryptMessage(workspaceId)) {
        message.encryptedContent = await this.encryptMessage(message.content, workspaceId)
        message.content = '[ENCRYPTED]'
      }

      // Store message in database
      await this.storeMessage(message)

      // Route message to appropriate recipients
      await this.routeMessage(message)

      // Confirm message sent
      socket.emit('message-sent', {
        messageId: message.id,
        timestamp: message.createdAt.toISOString(),
      })

      // Log for audit
      await auditLog.log({
        action: 'workspace_message_sent',
        userId: session.user.id,
        workspaceId,
        metadata: {
          messageId: message.id,
          type,
          recipientId,
          channelId,
          hasEncryption: !!message.encryptedContent,
        },
      })

      logger.debug('Message sent successfully', {
        messageId: message.id,
        workspaceId,
        senderId: session.user.id,
        type,
        channelId,
      })
    } catch (error) {
      logger.error('Failed to send message', error)
      socket.emit('message-error', {
        error: 'Failed to send message',
        details: error.message,
      })
    }
  }

  /**
   * Handle presence update
   */
  private async handleUpdatePresence(
    socket: Socket,
    session: SimSession,
    data: {
      workspaceId: string
      status: 'online' | 'away' | 'busy' | 'offline' | 'invisible'
      customStatus?: string
    }
  ) {
    try {
      const { workspaceId, status, customStatus } = data

      // Update user presence
      await this.updateUserPresence(session.user.id, workspaceId, status, socket.id, customStatus)

      // Broadcast presence update
      socket.to(`workspace:${workspaceId}`).emit('presence-updated', {
        userId: session.user.id,
        userName: session.user.Name || session.user.email,
        status,
        customStatus,
        timestamp: new Date().toISOString(),
      })

      logger.debug('Presence updated', {
        userId: session.user.id,
        workspaceId,
        status,
        customStatus,
      })
    } catch (error) {
      logger.error('Failed to update presence', error)
    }
  }

  /**
   * Handle agent chat message
   */
  private async handleAgentChatMessage(
    socket: Socket,
    session: SimSession,
    data: {
      workspaceId: string
      agentId: string
      message: string
      conversationId?: string
    }
  ) {
    try {
      const { workspaceId, agentId, message, conversationId } = data

      // Validate workspace and agent access
      const hasAccess = await this.validateWorkspaceAccess(session, workspaceId)
      if (!hasAccess) {
        socket.emit('agent-chat-error', {
          error: 'Access denied to workspace',
        })
        return
      }

      // Forward message to Parlant agent
      const agentResponse = await this.forwardToAgent(
        workspaceId,
        agentId,
        message,
        session.user.id
      )

      // Create agent response message
      const responseMessage: WorkspaceMessage = {
        id: crypto.randomUUID(),
        workspaceId,
        senderId: 'system',
        agentId,
        type: 'agent_response',
        priority: 'normal',
        content: agentResponse.content,
        metadata: {
          agentName: agentResponse.agentName,
          conversationId,
          tools: agentResponse.toolsUsed,
          confidence: agentResponse.confidence,
        },
        createdAt: new Date(),
        securityLabels: ['agent_generated'],
        complianceFlags: [],
      }

      // Store and route agent response
      await this.storeMessage(responseMessage)
      await this.routeMessage(responseMessage)

      logger.debug('Agent chat processed', {
        workspaceId,
        agentId,
        userId: session.user.id,
        conversationId,
      })
    } catch (error) {
      logger.error('Failed to process agent chat', error)
      socket.emit('agent-chat-error', {
        error: 'Failed to process agent message',
        details: error.message,
      })
    }
  }

  /**
   * Handle disconnection
   */
  private async handleDisconnection(socket: Socket, session: SimSession, reason: string) {
    try {
      logger.info('User disconnected from workspace messaging', {
        userId: session.user.id,
        socketId: socket.id,
        reason,
      })

      // Find workspaces this connection was part of
      const affectedWorkspaces: string[] = []
      for (const [workspaceId, connections] of this.workspaceConnections) {
        if (connections.has(socket.id)) {
          connections.delete(socket.id)
          affectedWorkspaces.push(workspaceId)

          // Update presence to offline
          await this.updateUserPresence(session.user.id, workspaceId, 'offline', socket.id)

          // Broadcast user left event
          socket.to(`workspace:${workspaceId}`).emit('user-left-messaging', {
            userId: session.user.id,
            userName: session.user.Name || session.user.email,
            timestamp: new Date().toISOString(),
          })
        }
      }

      // Clean up empty workspace collections
      for (const workspaceId of affectedWorkspaces) {
        const connections = this.workspaceConnections.get(workspaceId)
        if (connections && connections.size === 0) {
          this.workspaceConnections.delete(workspaceId)
        }
      }
    } catch (error) {
      logger.error('Error handling disconnection', error)
    }
  }

  /**
   * Validate workspace access for user
   */
  private async validateWorkspaceAccess(
    session: SimSession,
    workspaceId: string
  ): Promise<boolean> {
    try {
      // Check if user has access to the workspace
      const workspace = session.user.workspaces?.find((w) => w.id === workspaceId)
      return !!workspace && workspace.permissions?.includes('messaging')
    } catch (error) {
      logger.error('Failed to validate workspace access', error)
      return false
    }
  }

  /**
   * Check rate limiting for user
   */
  private async checkRateLimit(userId: string): Promise<boolean> {
    const now = new Date()
    const windowMs = 60 * 1000 // 1 minute
    const maxMessages = 100 // 100 messages per minute

    const current = this.rateLimiters.get(userId)
    if (!current) {
      this.rateLimiters.set(userId, { count: 1, windowStart: now })
      return true
    }

    // Reset if window has passed
    if (now.getTime() - current.windowStart.getTime() > windowMs) {
      this.rateLimiters.set(userId, { count: 1, windowStart: now })
      return true
    }

    // Check if under limit
    if (current.count < maxMessages) {
      current.count++
      return true
    }

    return false
  }

  /**
   * Validate message security
   */
  private async validateMessageSecurity(message: WorkspaceMessage) {
    // Check content length
    if (message.content.length > 10000) {
      throw new Error('Message content too long')
    }

    // Scan for potential security threats
    const securityPatterns = [
      /<script.*?>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:image\/svg\+xml/gi,
    ]

    for (const pattern of securityPatterns) {
      if (pattern.test(message.content)) {
        message.securityLabels.push('potential_xss')
        logger.warning('Potential XSS detected in message', {
          messageId: message.id,
          senderId: message.senderId,
        })
      }
    }

    // Check for sensitive content
    const sensitiveWords = ['password', 'token', 'secret', 'key', 'confidential']
    if (sensitiveWords.some((word) => message.content.toLowerCase().includes(word))) {
      message.complianceFlags.push('sensitive_content')
    }
  }

  /**
   * Route message to appropriate recipients
   */
  private async routeMessage(message: WorkspaceMessage) {
    const { workspaceId, recipientId, channelId = 'general' } = message

    // Prepare message data for transmission
    const messageData = {
      id: message.id,
      workspaceId,
      senderId: message.senderId,
      recipientId,
      channelId,
      agentId: message.agentId,
      type: message.type,
      priority: message.priority,
      content: message.content,
      metadata: message.metadata,
      createdAt: message.createdAt.toISOString(),
      threadId: message.threadId,
      replyToMessageId: message.replyToMessageId,
    }

    if (recipientId) {
      // Direct message - send to specific recipient
      const recipientConnections = this.getRecipientConnections(workspaceId, recipientId)
      for (const connection of recipientConnections) {
        connection.socket.emit('direct-message', messageData)
      }
    } else {
      // Channel message - broadcast to channel subscribers
      this.io
        .to(`workspace:${workspaceId}:channel:${channelId}`)
        .emit('channel-message', messageData)
    }

    // Also send to workspace general room for presence/system messages
    if (['presence', 'system', 'notification'].includes(message.type)) {
      this.io.to(`workspace:${workspaceId}`).emit('workspace-notification', messageData)
    }
  }

  /**
   * Get recipient connections for direct messaging
   */
  private getRecipientConnections(workspaceId: string, recipientId: string): ConnectionContext[] {
    const workspaceConns = this.workspaceConnections.get(workspaceId)
    if (!workspaceConns) return []

    return Array.from(workspaceConns.values()).filter(
      (conn) => conn.session.user.id === recipientId && conn.isActive
    )
  }

  /**
   * Update user presence information
   */
  private async updateUserPresence(
    userId: string,
    workspaceId: string,
    status: 'online' | 'away' | 'busy' | 'offline' | 'invisible',
    socketId: string,
    customStatus?: string
  ) {
    if (!this.userPresence.has(workspaceId)) {
      this.userPresence.set(workspaceId, new Map())
    }

    const workspacePresence = this.userPresence.get(workspaceId)!
    workspacePresence.set(userId, {
      userId,
      workspaceId,
      status,
      lastSeen: new Date(),
      socketId,
      customStatus,
      deviceInfo: { userAgent: 'browser', platform: 'web' },
    })

    // Persist to Redis for cross-instance synchronization
    await redis.hset(
      `workspace_presence:${workspaceId}`,
      userId,
      JSON.stringify(workspacePresence.get(userId))
    )
  }

  /**
   * Store message in database
   */
  private async storeMessage(message: WorkspaceMessage) {
    try {
      await prisma.workspaceMessage.create({
        data: {
          id: message.id,
          workspaceId: message.workspaceId,
          senderId: message.senderId,
          recipientId: message.recipientId,
          channelId: message.channelId,
          agentId: message.agentId,
          type: message.type,
          priority: message.priority,
          content: message.content,
          encryptedContent: message.encryptedContent,
          metadata: message.metadata,
          createdAt: message.createdAt,
          threadId: message.threadId,
          replyToMessageId: message.replyToMessageId,
          securityLabels: message.securityLabels,
          complianceFlags: message.complianceFlags,
        },
      })
    } catch (error) {
      logger.error('Failed to store message in database', error)
      throw error
    }
  }

  /**
   * Check if message should be encrypted
   */
  private async shouldEncryptMessage(workspaceId: string): Promise<boolean> {
    // Check workspace encryption settings
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    })

    return workspace?.settings?.encryption?.messages === true
  }

  /**
   * Encrypt message content
   */
  private async encryptMessage(content: string, workspaceId: string): Promise<string> {
    // Get or generate encryption key for workspace
    let key = this.encryptionKeys.get(workspaceId)
    if (!key) {
      key = await this.generateWorkspaceEncryptionKey(workspaceId)
      this.encryptionKeys.set(workspaceId, key)
    }

    return encrypt(content, key)
  }

  /**
   * Generate encryption key for workspace
   */
  private async generateWorkspaceEncryptionKey(workspaceId: string): Promise<string> {
    // In production, this would use a proper key management system
    const key = crypto.randomUUID() + crypto.randomUUID()

    // Store in Redis with expiration
    await redis.setex(`workspace_encryption_key:${workspaceId}`, 86400, key) // 24 hours

    return key
  }

  /**
   * Forward message to Parlant agent
   */
  private async forwardToAgent(
    workspaceId: string,
    agentId: string,
    message: string,
    userId: string
  ): Promise<any> {
    // This would integrate with the Parlant agent system
    // For now, return a mock response
    return {
      content: `Agent response to: ${message}`,
      agentName: `Agent-${agentId}`,
      toolsUsed: [],
      confidence: 0.95,
    }
  }

  /**
   * Send recent messages to newly connected client
   */
  private async sendRecentMessages(socket: Socket, workspaceId: string, channels: string[]) {
    try {
      const recentMessages = await prisma.workspaceMessage.findMany({
        where: {
          workspaceId,
          channelId: { in: channels },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      if (recentMessages.length > 0) {
        socket.emit('message-history', {
          workspaceId,
          messages: recentMessages.reverse(), // Send in chronological order
          timestamp: new Date().toISOString(),
        })
      }
    } catch (error) {
      logger.error('Failed to send recent messages', error)
    }
  }

  /**
   * Get workspace messaging analytics
   */
  async getWorkspaceAnalytics(workspaceId: string): Promise<any> {
    const connections = this.workspaceConnections.get(workspaceId)
    const presence = this.userPresence.get(workspaceId)

    return {
      workspaceId,
      activeConnections: connections?.size || 0,
      onlineUsers: presence?.size || 0,
      messagesSentToday: await this.getMessageCount(workspaceId, new Date()),
      averageResponseTime: await this.getAverageResponseTime(workspaceId),
      topChannels: await this.getTopChannels(workspaceId),
      timestamp: new Date().toISOString(),
    }
  }

  private async getMessageCount(workspaceId: string, date: Date): Promise<number> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    return prisma.workspaceMessage.count({
      where: {
        workspaceId,
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    })
  }

  private async getAverageResponseTime(workspaceId: string): Promise<number> {
    // Implement response time calculation logic
    return 0
  }

  private async getTopChannels(workspaceId: string): Promise<string[]> {
    // Implement top channels calculation logic
    return ['general']
  }
}

export { WorkspaceMessagingHandler }
