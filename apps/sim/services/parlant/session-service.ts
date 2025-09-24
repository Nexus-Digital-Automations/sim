/**
 * Parlant Session Service
 *
 * This service handles all session-related operations including session creation,
 * management, and event handling for conversations between users and Parlant agents.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  Session,
  SessionCreateRequest,
  SessionListQuery,
  Event,
  EventCreateRequest,
  EventListQuery,
  ApiResponse,
  PaginatedResponse,
  AuthContext,
  LongPollingOptions
} from './types'
import { ParlantClient } from './client'
import { parlantClient } from './client'

const logger = createLogger('SessionService')

/**
 * Enhanced session list parameters
 */
export interface ListSessionsParams extends SessionListQuery {
  sortBy?: 'created_at' | 'updated_at' | 'last_event_at'
  sortOrder?: 'asc' | 'desc'
  includeInactive?: boolean
}

/**
 * Session service class for managing Parlant sessions
 */
export class SessionService {
  private client: ParlantClient

  constructor(client: ParlantClient = parlantClient) {
    this.client = client
    logger.info('Session service initialized')
  }

  /**
   * Create a new session
   */
  async createSession(
    request: SessionCreateRequest,
    auth: AuthContext
  ): Promise<ApiResponse<Session>> {
    logger.info('Creating session', {
      agentId: request.agent_id,
      workspaceId: request.workspace_id,
      customerId: request.customer_id,
      userId: auth.user_id
    })

    try {
      const sessionData = {
        ...request,
        user_id: auth.user_id // Ensure user ID from auth context
      }

      const response = await this.client.post<Session>(
        '/sessions',
        sessionData,
        { auth }
      )

      if (response.success && response.data) {
        logger.info('Session created successfully', {
          sessionId: response.data.id,
          agentId: response.data.agent_id,
          workspaceId: response.data.workspace_id
        })
      }

      // Convert to ApiResponse format
      return {
        success: response.success,
        data: response.data!,
        timestamp: response.timestamp
      }
    } catch (error) {
      logger.error('Failed to create session', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request
      })
      throw error
    }
  }

  /**
   * Get a session by ID
   */
  async getSession(
    sessionId: string,
    auth: AuthContext
  ): Promise<ApiResponse<Session>> {
    logger.debug('Getting session', { sessionId, userId: auth.user_id })

    try {
      const response = await this.client.get<Session>(
        `/sessions/${sessionId}`,
        { auth }
      )

      if (response.success && response.data) {
        logger.debug('Session retrieved successfully', {
          sessionId: response.data.id,
          status: response.data.status
        })
      }

      return {
        success: response.success,
        data: response.data!,
        timestamp: response.timestamp
      }
    } catch (error) {
      logger.error('Failed to get session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * List sessions with filtering and pagination
   */
  async listSessions(
    params: ListSessionsParams,
    auth: AuthContext
  ): Promise<PaginatedResponse<Session>> {
    const {
      agent_id,
      user_id,
      workspace_id,
      status,
      limit = 20,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc',
      includeInactive = false
    } = params

    logger.debug('Listing sessions', {
      agentId: agent_id,
      userId: user_id,
      workspaceId: workspace_id,
      status,
      limit,
      offset,
      authUserId: auth.user_id
    })

    try {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        sortBy,
        sortOrder
      })

      if (agent_id) queryParams.set('agent_id', agent_id)
      if (user_id) queryParams.set('user_id', user_id)
      if (workspace_id) queryParams.set('workspace_id', workspace_id)
      if (status) queryParams.set('status', status)
      if (includeInactive) queryParams.set('include_inactive', 'true')

      const response = await this.client.get<Session[]>(
        `/sessions?${queryParams.toString()}`,
        { auth }
      )

      if (response.success && response.data) {
        logger.debug('Sessions listed successfully', {
          count: response.data.length,
          workspace_id,
          agent_id
        })

        // Convert to paginated response format
        return {
          success: true,
          data: response.data,
          timestamp: response.timestamp,
          pagination: {
            total: response.data.length, // This would come from headers in a real implementation
            limit,
            offset,
            has_more: response.data.length === limit
          }
        }
      }

      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
        pagination: {
          total: 0,
          limit,
          offset,
          has_more: false
        }
      }
    } catch (error) {
      logger.error('Failed to list sessions', {
        params,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * End a session
   */
  async endSession(
    sessionId: string,
    auth: AuthContext
  ): Promise<ApiResponse<Session>> {
    logger.info('Ending session', { sessionId, userId: auth.user_id })

    try {
      const response = await this.client.post<Session>(
        `/sessions/${sessionId}/end`,
        {},
        { auth }
      )

      if (response.success && response.data) {
        logger.info('Session ended successfully', {
          sessionId: response.data.id,
          status: response.data.status
        })
      }

      return {
        success: response.success,
        data: response.data!,
        timestamp: response.timestamp
      }
    } catch (error) {
      logger.error('Failed to end session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Pause a session
   */
  async pauseSession(
    sessionId: string,
    auth: AuthContext
  ): Promise<ApiResponse<Session>> {
    logger.info('Pausing session', { sessionId, userId: auth.user_id })

    try {
      const response = await this.client.post<Session>(
        `/sessions/${sessionId}/pause`,
        {},
        { auth }
      )

      if (response.success && response.data) {
        logger.info('Session paused successfully', {
          sessionId: response.data.id,
          status: response.data.status
        })
      }

      return {
        success: response.success,
        data: response.data!,
        timestamp: response.timestamp
      }
    } catch (error) {
      logger.error('Failed to pause session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Resume a paused session
   */
  async resumeSession(
    sessionId: string,
    auth: AuthContext
  ): Promise<ApiResponse<Session>> {
    logger.info('Resuming session', { sessionId, userId: auth.user_id })

    try {
      const response = await this.client.post<Session>(
        `/sessions/${sessionId}/resume`,
        {},
        { auth }
      )

      if (response.success && response.data) {
        logger.info('Session resumed successfully', {
          sessionId: response.data.id,
          status: response.data.status
        })
      }

      return {
        success: response.success,
        data: response.data!,
        timestamp: response.timestamp
      }
    } catch (error) {
      logger.error('Failed to resume session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Add an event to a session
   */
  async addEvent(
    sessionId: string,
    event: EventCreateRequest,
    auth: AuthContext
  ): Promise<ApiResponse<Event>> {
    logger.info('Adding event to session', {
      sessionId,
      eventType: event.type,
      source: event.source,
      userId: auth.user_id
    })

    try {
      const response = await this.client.post<Event>(
        `/sessions/${sessionId}/events`,
        event,
        { auth }
      )

      if (response.success && response.data) {
        logger.info('Event added successfully', {
          eventId: response.data.id,
          sessionId: response.data.session_id,
          type: response.data.type,
          offset: response.data.offset
        })
      }

      return {
        success: response.success,
        data: response.data!,
        timestamp: response.timestamp
      }
    } catch (error) {
      logger.error('Failed to add event', {
        sessionId,
        event,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Send a customer message
   */
  async sendMessage(
    sessionId: string,
    message: string,
    metadata?: Record<string, any>,
    auth?: AuthContext
  ): Promise<ApiResponse<Event>> {
    logger.info('Sending customer message', {
      sessionId,
      messageLength: message.length,
      hasMetadata: !!metadata,
      userId: auth?.user_id
    })

    const event: EventCreateRequest = {
      type: 'customer_message',
      content: message,
      source: 'customer',
      metadata
    }

    return this.addEvent(sessionId, event, auth!)
  }

  /**
   * Get events for a session
   */
  async getEvents(
    sessionId: string,
    query: Omit<EventListQuery, 'session_id'> = {},
    auth: AuthContext,
    longPoll?: LongPollingOptions
  ): Promise<PaginatedResponse<Event>> {
    const {
      type,
      source,
      offset = 0,
      limit = 50
    } = query

    logger.debug('Getting session events', {
      sessionId,
      type,
      source,
      offset,
      limit,
      longPoll,
      userId: auth.user_id
    })

    try {
      const queryParams = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString()
      })

      if (type) queryParams.set('type', type)
      if (source) queryParams.set('source', source)

      // Add long polling parameters
      if (longPoll?.wait_for_data) queryParams.set('wait_for_data', 'true')
      if (longPoll?.timeout) queryParams.set('timeout', longPoll.timeout.toString())
      if (longPoll?.last_event_id) queryParams.set('last_event_id', longPoll.last_event_id)

      const response = await this.client.get<Event[]>(
        `/sessions/${sessionId}/events?${queryParams.toString()}`,
        {
          auth,
          timeout: longPoll?.timeout || undefined
        }
      )

      if (response.success && response.data) {
        logger.debug('Events retrieved successfully', {
          sessionId,
          count: response.data.length,
          hasMore: response.data.length === limit
        })

        return {
          success: true,
          data: response.data,
          timestamp: response.timestamp,
          pagination: {
            total: response.data.length, // This would come from headers in a real implementation
            limit,
            offset,
            has_more: response.data.length === limit
          }
        }
      }

      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
        pagination: {
          total: 0,
          limit,
          offset,
          has_more: false
        }
      }
    } catch (error) {
      logger.error('Failed to get session events', {
        sessionId,
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(
    sessionId: string,
    auth: AuthContext
  ): Promise<ApiResponse<{
    totalEvents: number
    messageCount: number
    duration?: number
    lastActivity: string
    eventBreakdown: Record<string, number>
  }>> {
    logger.debug('Getting session stats', { sessionId, userId: auth.user_id })

    try {
      const response = await this.client.get(
        `/sessions/${sessionId}/stats`,
        { auth }
      )

      if (response.success) {
        logger.debug('Session stats retrieved successfully', { sessionId })
      }

      return {
        success: response.success,
        data: response.data!,
        timestamp: response.timestamp
      }
    } catch (error) {
      logger.error('Failed to get session stats', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Delete a session and all its events
   */
  async deleteSession(
    sessionId: string,
    auth: AuthContext
  ): Promise<ApiResponse<void>> {
    logger.warn('Deleting session', { sessionId, userId: auth.user_id })

    try {
      const response = await this.client.delete<void>(
        `/sessions/${sessionId}`,
        { auth }
      )

      if (response.success) {
        logger.info('Session deleted successfully', { sessionId })
      }

      return {
        success: response.success,
        data: undefined,
        timestamp: response.timestamp
      }
    } catch (error) {
      logger.error('Failed to delete session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
}

// Export singleton instance
export const sessionService = new SessionService()