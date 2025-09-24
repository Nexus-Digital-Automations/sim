/**
 * Parlant Integration Hooks
 *
 * This module provides integration points between the Parlant HTTP API
 * and the Socket.io real-time layer. These hooks should be called from
 * the Parlant API endpoints to trigger real-time events.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { Server as SocketIOServer } from 'socket.io'
import { ParlantEventService } from '@/socket-server/services/parlant-events'
import { ParlantRoomManager } from '@/socket-server/handlers/parlant'
import { ParlantAgentStatus, ParlantSessionStatus, ParlantMessageType } from '@/socket-server/types/parlant-events'

const logger = createLogger('ParlantHooks')

/**
 * Global Parlant event service instance
 * This will be initialized when the Socket.io server starts
 */
let parlantEventService: ParlantEventService | null = null

/**
 * Initialize Parlant hooks with Socket.io server instance
 * This should be called during Socket.io server startup
 */
export function initializeParlantHooks(io: SocketIOServer, roomManager: any): void {
  const parlantRoomManager = new ParlantRoomManager(roomManager)
  parlantEventService = new ParlantEventService(io, parlantRoomManager)

  logger.info('Parlant integration hooks initialized')
}

/**
 * Get the Parlant event service instance
 * Throws error if not initialized
 */
function getEventService(): ParlantEventService {
  if (!parlantEventService) {
    throw new Error('Parlant event service not initialized. Call initializeParlantHooks() first.')
  }
  return parlantEventService
}

/**
 * Hook: Agent lifecycle events
 */
export const ParlantAgentHooks = {
  /**
   * Called when a new agent is created
   */
  async onAgentCreated(agentData: {
    id: string
    workspaceId: string
    name: string
    description?: string
    model: string
    temperature: number
    createdBy: string
  }): Promise<void> {
    try {
      const eventService = getEventService()
      await eventService.broadcastAgentCreated(
        agentData.id,
        agentData.workspaceId,
        agentData.createdBy,
        agentData
      )

      // Also broadcast initial status update
      await eventService.broadcastAgentStatusUpdate(
        agentData.id,
        agentData.workspaceId,
        ParlantAgentStatus.OFFLINE,
        { reason: 'Agent created' }
      )

      logger.info(`Triggered real-time events for agent creation: ${agentData.id}`)
    } catch (error) {
      logger.error('Error in onAgentCreated hook:', error)
    }
  },

  /**
   * Called when an agent is updated
   */
  async onAgentUpdated(
    agentId: string,
    workspaceId: string,
    changes: any,
    updatedBy: string
  ): Promise<void> {
    try {
      const eventService = getEventService()
      await eventService.broadcastAgentUpdated(
        agentId,
        workspaceId,
        updatedBy,
        changes
      )

      logger.info(`Triggered real-time events for agent update: ${agentId}`)
    } catch (error) {
      logger.error('Error in onAgentUpdated hook:', error)
    }
  },

  /**
   * Called when an agent is deleted
   */
  async onAgentDeleted(
    agentId: string,
    workspaceId: string,
    deletedBy: string
  ): Promise<void> {
    try {
      const eventService = getEventService()
      await eventService.broadcastAgentDeleted(
        agentId,
        workspaceId,
        deletedBy
      )

      logger.info(`Triggered real-time events for agent deletion: ${agentId}`)
    } catch (error) {
      logger.error('Error in onAgentDeleted hook:', error)
    }
  },

  /**
   * Called when an agent's status changes
   */
  async onAgentStatusChanged(
    agentId: string,
    workspaceId: string,
    newStatus: ParlantAgentStatus,
    data?: any
  ): Promise<void> {
    try {
      const eventService = getEventService()
      await eventService.broadcastAgentStatusUpdate(
        agentId,
        workspaceId,
        newStatus,
        data
      )

      logger.debug(`Triggered status update for agent ${agentId}: ${newStatus}`)
    } catch (error) {
      logger.error('Error in onAgentStatusChanged hook:', error)
    }
  },

  /**
   * Called when agent performance metrics are updated
   */
  async onAgentPerformanceUpdate(
    agentId: string,
    workspaceId: string,
    performance: {
      totalSessions: number
      totalMessages: number
      averageResponseTime: number
      successRate: number
    }
  ): Promise<void> {
    try {
      const eventService = getEventService()
      await eventService.broadcastAgentPerformanceUpdate(
        agentId,
        workspaceId,
        performance
      )

      logger.debug(`Triggered performance update for agent ${agentId}`)
    } catch (error) {
      logger.error('Error in onAgentPerformanceUpdate hook:', error)
    }
  }
}

/**
 * Hook: Session lifecycle events
 */
export const ParlantSessionHooks = {
  /**
   * Called when a new session is started
   */
  async onSessionStarted(sessionData: {
    sessionId: string
    agentId: string
    workspaceId: string
    userId?: string
    customerId?: string
    title?: string
    metadata?: any
  }): Promise<void> {
    try {
      const eventService = getEventService()
      await eventService.broadcastSessionStarted(
        sessionData.sessionId,
        sessionData.agentId,
        sessionData.workspaceId,
        sessionData.userId,
        sessionData.customerId,
        sessionData
      )

      logger.info(`Triggered real-time events for session start: ${sessionData.sessionId}`)
    } catch (error) {
      logger.error('Error in onSessionStarted hook:', error)
    }
  },

  /**
   * Called when a session is ended
   */
  async onSessionEnded(
    sessionId: string,
    agentId: string,
    workspaceId: string,
    endReason: string,
    analytics?: {
      duration: number
      messagesExchanged: number
      toolCallsExecuted: number
      averageResponseTime: number
    }
  ): Promise<void> {
    try {
      const eventService = getEventService()
      await eventService.broadcastSessionEnded(
        sessionId,
        agentId,
        workspaceId,
        endReason,
        analytics
      )

      logger.info(`Triggered real-time events for session end: ${sessionId}`)
    } catch (error) {
      logger.error('Error in onSessionEnded hook:', error)
    }
  },

  /**
   * Called when a session status changes
   */
  async onSessionStatusChanged(
    sessionId: string,
    agentId: string,
    workspaceId: string,
    newStatus: ParlantSessionStatus,
    previousStatus?: ParlantSessionStatus
  ): Promise<void> {
    try {
      const eventService = getEventService()
      await eventService.broadcastSessionStatusChanged(
        sessionId,
        agentId,
        workspaceId,
        newStatus,
        previousStatus
      )

      logger.debug(`Triggered status change for session ${sessionId}: ${previousStatus} -> ${newStatus}`)
    } catch (error) {
      logger.error('Error in onSessionStatusChanged hook:', error)
    }
  },

  /**
   * Called when session analytics are updated
   */
  async onSessionAnalyticsUpdate(
    sessionId: string,
    agentId: string,
    workspaceId: string,
    analytics: {
      messagesExchanged: number
      toolCallsExecuted: number
      averageResponseTime: number
      userSatisfaction?: number
    }
  ): Promise<void> {
    try {
      const eventService = getEventService()
      await eventService.broadcastSessionAnalyticsUpdate(
        sessionId,
        agentId,
        workspaceId,
        analytics
      )

      logger.debug(`Triggered analytics update for session ${sessionId}`)
    } catch (error) {
      logger.error('Error in onSessionAnalyticsUpdate hook:', error)
    }
  }
}

/**
 * Hook: Message and conversation events
 */
export const ParlantMessageHooks = {
  /**
   * Called when a user sends a message
   */
  async onMessageSent(messageData: {
    sessionId: string
    messageId: string
    workspaceId: string
    content: string
    messageType: ParlantMessageType
    userId?: string
    metadata?: any
  }): Promise<void> {
    try {
      const eventService = getEventService()
      await eventService.broadcastMessageSent(
        messageData.sessionId,
        messageData.messageId,
        messageData.workspaceId,
        messageData.content,
        messageData.messageType,
        messageData.userId,
        messageData.metadata
      )

      logger.debug(`Triggered message sent event for session ${messageData.sessionId}`)
    } catch (error) {
      logger.error('Error in onMessageSent hook:', error)
    }
  },

  /**
   * Called when an agent responds with a message
   */
  async onMessageReceived(messageData: {
    sessionId: string
    messageId: string
    workspaceId: string
    content: string
    messageType: ParlantMessageType
    metadata?: any
  }): Promise<void> {
    try {
      const eventService = getEventService()
      await eventService.broadcastMessageReceived(
        messageData.sessionId,
        messageData.messageId,
        messageData.workspaceId,
        messageData.content,
        messageData.messageType,
        messageData.metadata
      )

      logger.debug(`Triggered message received event for session ${messageData.sessionId}`)
    } catch (error) {
      logger.error('Error in onMessageReceived hook:', error)
    }
  },

  /**
   * Called when typing indicator should be updated
   */
  async onTypingIndicator(
    sessionId: string,
    workspaceId: string,
    isTyping: boolean,
    options?: {
      userId?: string
      agentId?: string
    }
  ): Promise<void> {
    try {
      const eventService = getEventService()
      await eventService.broadcastTypingIndicator(
        sessionId,
        workspaceId,
        isTyping,
        options?.userId,
        options?.agentId
      )

      logger.debug(`Triggered typing indicator for session ${sessionId}: ${isTyping}`)
    } catch (error) {
      logger.error('Error in onTypingIndicator hook:', error)
    }
  }
}

/**
 * Hook: Tool call events
 */
export const ParlantToolHooks = {
  /**
   * Called when a tool call is started
   */
  async onToolCallStarted(
    sessionId: string,
    messageId: string,
    workspaceId: string,
    toolCallId: string,
    toolName: string,
    parameters: any
  ): Promise<void> {
    try {
      const eventService = getEventService()
      await eventService.broadcastToolCallStarted(
        sessionId,
        messageId,
        workspaceId,
        toolCallId,
        toolName,
        parameters
      )

      logger.debug(`Triggered tool call started for session ${sessionId}: ${toolName}`)
    } catch (error) {
      logger.error('Error in onToolCallStarted hook:', error)
    }
  },

  /**
   * Called when a tool call completes successfully
   */
  async onToolCallCompleted(
    sessionId: string,
    messageId: string,
    workspaceId: string,
    toolCallId: string,
    toolName: string,
    result: any,
    processingTime: number
  ): Promise<void> {
    try {
      const eventService = getEventService()
      await eventService.broadcastToolCallCompleted(
        sessionId,
        messageId,
        workspaceId,
        toolCallId,
        toolName,
        result,
        processingTime
      )

      logger.debug(`Triggered tool call completed for session ${sessionId}: ${toolName}`)
    } catch (error) {
      logger.error('Error in onToolCallCompleted hook:', error)
    }
  },

  /**
   * Called when a tool call fails
   */
  async onToolCallFailed(
    sessionId: string,
    messageId: string,
    workspaceId: string,
    toolCallId: string,
    toolName: string,
    error: {
      code: string
      message: string
      details?: any
    }
  ): Promise<void> {
    try {
      const eventService = getEventService()
      await eventService.broadcastToolCallFailed(
        sessionId,
        messageId,
        workspaceId,
        toolCallId,
        toolName,
        error
      )

      logger.debug(`Triggered tool call failed for session ${sessionId}: ${toolName}`)
    } catch (broadcastError) {
      logger.error('Error in onToolCallFailed hook:', broadcastError)
    }
  }
}

/**
 * Utility functions for health monitoring and debugging
 */
export const ParlantHookUtils = {
  /**
   * Get current connection statistics
   */
  getConnectionStats(): any {
    try {
      const eventService = getEventService()
      return eventService.getConnectionStats()
    } catch (error) {
      logger.error('Error getting connection stats:', error)
      return { error: error.message }
    }
  },

  /**
   * Health check for Parlant hooks
   */
  healthCheck(): any {
    try {
      const eventService = getEventService()
      return eventService.healthCheck()
    } catch (error) {
      logger.error('Error in health check:', error)
      return {
        status: 'unhealthy',
        timestamp: Date.now(),
        error: error.message
      }
    }
  },

  /**
   * Test event broadcasting (for debugging)
   */
  async testBroadcast(
    agentId: string,
    workspaceId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await ParlantAgentHooks.onAgentStatusChanged(
        agentId,
        workspaceId,
        ParlantAgentStatus.ONLINE,
        { reason: 'Test broadcast' }
      )

      return { success: true }
    } catch (error) {
      logger.error('Error in test broadcast:', error)
      return { success: false, error: error.message }
    }
  }
}

/**
 * Export all hooks as a single interface for easier importing
 */
export const ParlantHooks = {
  Agent: ParlantAgentHooks,
  Session: ParlantSessionHooks,
  Message: ParlantMessageHooks,
  Tool: ParlantToolHooks,
  Utils: ParlantHookUtils,
  initialize: initializeParlantHooks
}