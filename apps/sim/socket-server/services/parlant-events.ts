import type { Server as SocketIOServer } from 'socket.io'
import { createLogger } from '@/lib/logs/console/logger'
import type { ParlantRoomManager } from '@/socket-server/handlers/parlant'
import {
  type ParlantAgentEvent,
  ParlantAgentStatus,
  ParlantEventType,
  type ParlantMessageEvent,
  ParlantMessageType,
  type ParlantSessionEvent,
  ParlantSessionStatus,
  type ParlantStatusEvent,
} from '@/socket-server/types/parlant-events'

const logger = createLogger('ParlantEventService')

/**
 * Parlant Event Service
 *
 * This service integrates with Parlant API operations to broadcast
 * real-time events to connected Socket.io clients. It acts as a bridge
 * between the Parlant HTTP API and the Socket.io real-time layer.
 */
export class ParlantEventService {
  private roomManager: ParlantRoomManager
  private io: SocketIOServer

  constructor(io: SocketIOServer, roomManager: ParlantRoomManager) {
    this.io = io
    this.roomManager = roomManager
    logger.info('Parlant Event Service initialized')
  }

  /**
   * Broadcast agent created event
   */
  async broadcastAgentCreated(
    agentId: string,
    workspaceId: string,
    userId: string,
    agentData: any
  ): Promise<void> {
    try {
      const event: ParlantAgentEvent = {
        type: ParlantEventType.AGENT_CREATED,
        agentId,
        workspaceId,
        userId,
        timestamp: Date.now(),
        data: {
          name: agentData.name,
          description: agentData.description,
          status: ParlantAgentStatus.OFFLINE,
          configuration: {
            model: agentData.model,
            temperature: agentData.temperature,
          },
        },
        metadata: {
          createdBy: userId,
          version: '1.0.0',
        },
      }

      await this.roomManager.broadcastAgentEvent(event)

      logger.info(
        `Broadcasted agent created event for agent ${agentId} in workspace ${workspaceId}`
      )
    } catch (error) {
      logger.error('Error broadcasting agent created event:', error)
    }
  }

  /**
   * Broadcast agent updated event
   */
  async broadcastAgentUpdated(
    agentId: string,
    workspaceId: string,
    userId: string,
    changes: any
  ): Promise<void> {
    try {
      const event: ParlantAgentEvent = {
        type: ParlantEventType.AGENT_UPDATED,
        agentId,
        workspaceId,
        userId,
        timestamp: Date.now(),
        data: changes,
        metadata: {
          updatedBy: userId,
          changeKeys: Object.keys(changes),
        },
      }

      await this.roomManager.broadcastAgentEvent(event)

      logger.info(
        `Broadcasted agent updated event for agent ${agentId} in workspace ${workspaceId}`
      )
    } catch (error) {
      logger.error('Error broadcasting agent updated event:', error)
    }
  }

  /**
   * Broadcast agent deleted event
   */
  async broadcastAgentDeleted(agentId: string, workspaceId: string, userId: string): Promise<void> {
    try {
      const event: ParlantAgentEvent = {
        type: ParlantEventType.AGENT_DELETED,
        agentId,
        workspaceId,
        userId,
        timestamp: Date.now(),
        metadata: {
          deletedBy: userId,
        },
      }

      await this.roomManager.broadcastAgentEvent(event)

      logger.info(
        `Broadcasted agent deleted event for agent ${agentId} in workspace ${workspaceId}`
      )
    } catch (error) {
      logger.error('Error broadcasting agent deleted event:', error)
    }
  }

  /**
   * Broadcast agent status update
   */
  async broadcastAgentStatusUpdate(
    agentId: string,
    workspaceId: string,
    status: ParlantAgentStatus,
    data?: any
  ): Promise<void> {
    try {
      const event: ParlantStatusEvent = {
        type: ParlantEventType.AGENT_STATUS_UPDATE,
        agentId,
        workspaceId,
        status,
        timestamp: Date.now(),
        data,
        metadata: {
          previousStatus: data?.previousStatus,
          reason: data?.reason,
        },
      }

      await this.roomManager.broadcastStatusEvent(event)

      logger.info(`Broadcasted agent status update for agent ${agentId}: ${status}`)
    } catch (error) {
      logger.error('Error broadcasting agent status update:', error)
    }
  }

  /**
   * Broadcast session started event
   */
  async broadcastSessionStarted(
    sessionId: string,
    agentId: string,
    workspaceId: string,
    userId?: string,
    customerId?: string,
    sessionData?: any
  ): Promise<void> {
    try {
      const event: ParlantSessionEvent = {
        type: ParlantEventType.SESSION_STARTED,
        sessionId,
        agentId,
        workspaceId,
        userId,
        customerId,
        timestamp: Date.now(),
        data: {
          status: ParlantSessionStatus.ACTIVE,
          title: sessionData?.title,
          messageCount: 0,
        },
        metadata: {
          startedBy: userId || customerId,
          sessionType: userId ? 'authenticated' : 'anonymous',
        },
      }

      await this.roomManager.broadcastSessionEvent(event)

      logger.info(
        `Broadcasted session started event for session ${sessionId} with agent ${agentId}`
      )
    } catch (error) {
      logger.error('Error broadcasting session started event:', error)
    }
  }

  /**
   * Broadcast session ended event
   */
  async broadcastSessionEnded(
    sessionId: string,
    agentId: string,
    workspaceId: string,
    endReason: string,
    analytics?: any
  ): Promise<void> {
    try {
      const event: ParlantSessionEvent = {
        type: ParlantEventType.SESSION_ENDED,
        sessionId,
        agentId,
        workspaceId,
        timestamp: Date.now(),
        data: {
          status: ParlantSessionStatus.COMPLETED,
          endReason,
          analytics,
        },
        metadata: {
          endedAt: Date.now(),
        },
      }

      await this.roomManager.broadcastSessionEvent(event)

      logger.info(`Broadcasted session ended event for session ${sessionId}: ${endReason}`)
    } catch (error) {
      logger.error('Error broadcasting session ended event:', error)
    }
  }

  /**
   * Broadcast session status change event
   */
  async broadcastSessionStatusChanged(
    sessionId: string,
    agentId: string,
    workspaceId: string,
    newStatus: ParlantSessionStatus,
    previousStatus?: ParlantSessionStatus
  ): Promise<void> {
    try {
      const event: ParlantSessionEvent = {
        type: ParlantEventType.SESSION_STATUS_CHANGED,
        sessionId,
        agentId,
        workspaceId,
        timestamp: Date.now(),
        data: {
          status: newStatus,
        },
        metadata: {
          previousStatus,
          statusChangedAt: Date.now(),
        },
      }

      await this.roomManager.broadcastSessionEvent(event)

      logger.info(
        `Broadcasted session status change for session ${sessionId}: ${previousStatus} -> ${newStatus}`
      )
    } catch (error) {
      logger.error('Error broadcasting session status change:', error)
    }
  }

  /**
   * Broadcast message sent event
   */
  async broadcastMessageSent(
    sessionId: string,
    messageId: string,
    workspaceId: string,
    content: string,
    messageType: ParlantMessageType,
    userId?: string,
    metadata?: any
  ): Promise<void> {
    try {
      const event: ParlantMessageEvent = {
        type: ParlantEventType.MESSAGE_SENT,
        sessionId,
        messageId,
        messageType,
        content,
        workspaceId,
        userId,
        timestamp: Date.now(),
        data: {
          messageIndex: metadata?.messageIndex,
          processingTime: metadata?.processingTime,
          tokens: metadata?.tokens,
        },
        metadata,
      }

      await this.roomManager.broadcastMessageEvent(event)

      logger.debug(`Broadcasted message sent event for session ${sessionId}`)
    } catch (error) {
      logger.error('Error broadcasting message sent event:', error)
    }
  }

  /**
   * Broadcast message received event
   */
  async broadcastMessageReceived(
    sessionId: string,
    messageId: string,
    workspaceId: string,
    content: string,
    messageType: ParlantMessageType,
    metadata?: any
  ): Promise<void> {
    try {
      const event: ParlantMessageEvent = {
        type: ParlantEventType.MESSAGE_RECEIVED,
        sessionId,
        messageId,
        messageType,
        content,
        workspaceId,
        timestamp: Date.now(),
        data: {
          messageIndex: metadata?.messageIndex,
          processingTime: metadata?.processingTime,
        },
        metadata,
      }

      await this.roomManager.broadcastMessageEvent(event)

      logger.debug(`Broadcasted message received event for session ${sessionId}`)
    } catch (error) {
      logger.error('Error broadcasting message received event:', error)
    }
  }

  /**
   * Broadcast typing indicator
   */
  async broadcastTypingIndicator(
    sessionId: string,
    workspaceId: string,
    isTyping: boolean,
    userId?: string,
    agentId?: string
  ): Promise<void> {
    try {
      const event: ParlantMessageEvent = {
        type: ParlantEventType.MESSAGE_TYPING,
        sessionId,
        messageId: `typing_${Date.now()}`,
        messageType: ParlantMessageType.SYSTEM_MESSAGE,
        content: '',
        workspaceId,
        userId,
        timestamp: Date.now(),
        data: {
          isTyping,
        },
        metadata: {
          agentId,
          typingIndicator: true,
        },
      }

      await this.roomManager.broadcastMessageEvent(event)

      logger.debug(`Broadcasted typing indicator for session ${sessionId}: ${isTyping}`)
    } catch (error) {
      logger.error('Error broadcasting typing indicator:', error)
    }
  }

  /**
   * Broadcast tool call started event
   */
  async broadcastToolCallStarted(
    sessionId: string,
    messageId: string,
    workspaceId: string,
    toolCallId: string,
    toolName: string,
    parameters: any
  ): Promise<void> {
    try {
      const event: ParlantMessageEvent = {
        type: ParlantEventType.TOOL_CALL_STARTED,
        sessionId,
        messageId,
        messageType: ParlantMessageType.TOOL_CALL,
        content: `Tool call started: ${toolName}`,
        workspaceId,
        timestamp: Date.now(),
        data: {
          toolCallId,
          toolName,
          toolParameters: parameters,
        },
        metadata: {
          toolCallStarted: Date.now(),
        },
      }

      await this.roomManager.broadcastMessageEvent(event)

      logger.info(`Broadcasted tool call started event for session ${sessionId}: ${toolName}`)
    } catch (error) {
      logger.error('Error broadcasting tool call started event:', error)
    }
  }

  /**
   * Broadcast tool call completed event
   */
  async broadcastToolCallCompleted(
    sessionId: string,
    messageId: string,
    workspaceId: string,
    toolCallId: string,
    toolName: string,
    result: any,
    processingTime: number
  ): Promise<void> {
    try {
      const event: ParlantMessageEvent = {
        type: ParlantEventType.TOOL_CALL_COMPLETED,
        sessionId,
        messageId,
        messageType: ParlantMessageType.TOOL_RESULT,
        content: `Tool call completed: ${toolName}`,
        workspaceId,
        timestamp: Date.now(),
        data: {
          toolCallId,
          toolName,
          toolResult: result,
          processingTime,
        },
        metadata: {
          toolCallCompleted: Date.now(),
        },
      }

      await this.roomManager.broadcastMessageEvent(event)

      logger.info(
        `Broadcasted tool call completed event for session ${sessionId}: ${toolName} (${processingTime}ms)`
      )
    } catch (error) {
      logger.error('Error broadcasting tool call completed event:', error)
    }
  }

  /**
   * Broadcast tool call failed event
   */
  async broadcastToolCallFailed(
    sessionId: string,
    messageId: string,
    workspaceId: string,
    toolCallId: string,
    toolName: string,
    error: any
  ): Promise<void> {
    try {
      const event: ParlantMessageEvent = {
        type: ParlantEventType.TOOL_CALL_FAILED,
        sessionId,
        messageId,
        messageType: ParlantMessageType.TOOL_RESULT,
        content: `Tool call failed: ${toolName}`,
        workspaceId,
        timestamp: Date.now(),
        data: {
          toolCallId,
          toolName,
          error: {
            code: error.code || 'TOOL_CALL_FAILED',
            message: error.message || 'Unknown error',
            details: error.details,
          },
        },
        metadata: {
          toolCallFailed: Date.now(),
        },
      }

      await this.roomManager.broadcastMessageEvent(event)

      logger.warn(
        `Broadcasted tool call failed event for session ${sessionId}: ${toolName} - ${error.message}`
      )
    } catch (broadcastError) {
      logger.error('Error broadcasting tool call failed event:', broadcastError)
    }
  }

  /**
   * Broadcast agent performance update
   */
  async broadcastAgentPerformanceUpdate(
    agentId: string,
    workspaceId: string,
    performance: any
  ): Promise<void> {
    try {
      const event: ParlantAgentEvent = {
        type: ParlantEventType.AGENT_PERFORMANCE_UPDATE,
        agentId,
        workspaceId,
        timestamp: Date.now(),
        data: {
          performance,
        },
        metadata: {
          performanceUpdate: true,
          calculatedAt: Date.now(),
        },
      }

      await this.roomManager.broadcastAgentEvent(event)

      logger.info(`Broadcasted performance update for agent ${agentId}`)
    } catch (error) {
      logger.error('Error broadcasting agent performance update:', error)
    }
  }

  /**
   * Broadcast session analytics update
   */
  async broadcastSessionAnalyticsUpdate(
    sessionId: string,
    agentId: string,
    workspaceId: string,
    analytics: any
  ): Promise<void> {
    try {
      const event: ParlantSessionEvent = {
        type: ParlantEventType.SESSION_ANALYTICS_UPDATE,
        sessionId,
        agentId,
        workspaceId,
        timestamp: Date.now(),
        data: {
          analytics,
        },
        metadata: {
          analyticsUpdate: true,
          calculatedAt: Date.now(),
        },
      }

      await this.roomManager.broadcastSessionEvent(event)

      logger.info(`Broadcasted analytics update for session ${sessionId}`)
    } catch (error) {
      logger.error('Error broadcasting session analytics update:', error)
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number
    agentRooms: number
    sessionRooms: number
    workspaceRooms: number
  } {
    const totalConnections = this.io.sockets.sockets.size

    // Count different room types
    let agentRooms = 0
    let sessionRooms = 0
    let workspaceRooms = 0

    this.io.sockets.adapter.rooms.forEach((sockets, roomId) => {
      if (roomId.startsWith('parlant:agent:')) agentRooms++
      else if (roomId.startsWith('parlant:session:')) sessionRooms++
      else if (roomId.startsWith('parlant:workspace:')) workspaceRooms++
    })

    return {
      totalConnections,
      agentRooms,
      sessionRooms,
      workspaceRooms,
    }
  }

  /**
   * Health check for the event service
   */
  healthCheck(): {
    status: 'healthy' | 'unhealthy'
    timestamp: number
    stats: any
  } {
    try {
      const stats = this.getConnectionStats()

      return {
        status: 'healthy',
        timestamp: Date.now(),
        stats,
      }
    } catch (error) {
      logger.error('Health check failed:', error)
      return {
        status: 'unhealthy',
        timestamp: Date.now(),
        stats: { error: error.message },
      }
    }
  }
}
