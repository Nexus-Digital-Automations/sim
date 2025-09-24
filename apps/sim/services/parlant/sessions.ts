/**
 * Session Management APIs for Sim-Parlant Integration Bridge
 * =========================================================
 *
 * Comprehensive session and conversation management system providing:
 * - Session lifecycle management (create, retrieve, list)
 * - Real-time event handling and streaming
 * - Message sending and event retrieval
 * - Long polling support for real-time updates
 * - Workspace-scoped access controls
 *
 * This module handles all conversational session operations while
 * maintaining proper isolation and integration with Sim's patterns.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { getParlantClient } from './client'
import { getAgent } from './agents'
import {
  ParlantValidationError,
  ParlantNotFoundError,
  ParlantWorkspaceError,
  ParlantErrorHandler
} from './errors'
import type {
  Session,
  SessionCreateRequest,
  SessionListQuery,
  Event,
  EventCreateRequest,
  EventListQuery,
  PaginatedResponse,
  AuthContext
} from './types'

const logger = createLogger('ParlantSessionService')

/**
 * Create a new conversation session
 */
export async function createSession(
  request: SessionCreateRequest,
  context: AuthContext
): Promise<Session> {
  logger.info(`Creating new session`, {
    agent_id: request.agent_id,
    workspace_id: request.workspace_id,
    user_id: context.user_id
  })

  // Validate request data
  validateSessionCreateRequest(request)

  try {
    // Validate agent exists and user has access
    await getAgent(request.agent_id, context)

    const client = getParlantClient()

    // Prepare session data with user context
    const sessionData = {
      ...request,
      user_id: request.user_id || context.user_id,
      status: 'active' as const
    }

    // Create session via Parlant server
    const session = await client.post<Session>('/api/sessions', sessionData)

    logger.info(`Session created successfully`, {
      session_id: session.id,
      agent_id: session.agent_id,
      workspace_id: session.workspace_id,
      user_id: session.user_id
    })

    return session
  } catch (error) {
    logger.error(`Failed to create session`, {
      agent_id: request.agent_id,
      workspace_id: request.workspace_id,
      error: (error as Error).message
    })

    throw ParlantErrorHandler.normalize(error)
  }
}

/**
 * Retrieve a session by ID with access validation
 */
export async function getSession(
  sessionId: string,
  context: AuthContext
): Promise<Session> {
  logger.info(`Retrieving session`, { session_id: sessionId, user_id: context.user_id })

  // Validate session ID format
  validateSessionId(sessionId)

  try {
    const client = getParlantClient()
    const session = await client.get<Session>(`/api/sessions/${sessionId}`)

    // Validate workspace and user access
    await validateSessionAccess(session, context)

    logger.info(`Session retrieved successfully`, {
      session_id: session.id,
      agent_id: session.agent_id,
      status: session.status
    })

    return session
  } catch (error) {
    if ((error as any).statusCode === 404) {
      throw new ParlantNotFoundError('Session', sessionId)
    }

    logger.error(`Failed to retrieve session`, {
      session_id: sessionId,
      error: (error as Error).message
    })

    throw ParlantErrorHandler.normalize(error)
  }
}

/**
 * List sessions with filtering and pagination
 */
export async function listSessions(
  query: SessionListQuery,
  context: AuthContext
): Promise<PaginatedResponse<Session>> {
  logger.info(`Listing sessions`, {
    workspace_id: query.workspace_id,
    agent_id: query.agent_id,
    user_id: context.user_id
  })

  // Validate query parameters
  validateSessionListQuery(query)

  try {
    const client = getParlantClient()

    // Build query parameters with user context
    const params = {
      ...query,
      // Ensure workspace filtering if specified
      ...(query.workspace_id && { workspace_id: query.workspace_id }),
      // If no specific user filter, include user's sessions
      ...((!query.user_id && !hasAdminPermission(context)) && {
        user_id: context.user_id
      })
    }

    // If agent_id is specified, validate access to the agent
    if (query.agent_id) {
      await getAgent(query.agent_id, context)
    }

    // Get sessions from Parlant server
    const sessions = await client.get<Session[]>('/api/sessions', params)

    // Filter sessions based on access controls
    const accessibleSessions = await filterSessionsByAccess(sessions, context)

    // Calculate pagination
    const total = accessibleSessions.length
    const limit = query.limit || 50
    const offset = query.offset || 0
    const paginatedSessions = accessibleSessions.slice(offset, offset + limit)

    const response: PaginatedResponse<Session> = {
      data: paginatedSessions,
      success: true,
      timestamp: new Date().toISOString(),
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total
      }
    }

    logger.info(`Sessions listed successfully`, {
      total,
      returned: paginatedSessions.length,
      workspace_id: query.workspace_id
    })

    return response
  } catch (error) {
    logger.error(`Failed to list sessions`, {
      query,
      error: (error as Error).message
    })

    throw ParlantErrorHandler.normalize(error)
  }
}

/**
 * Send a message to a session
 */
export async function sendMessage(
  sessionId: string,
  message: EventCreateRequest,
  context: AuthContext
): Promise<Event> {
  logger.info(`Sending message to session`, {
    session_id: sessionId,
    type: message.type,
    user_id: context.user_id
  })

  // Validate inputs
  validateSessionId(sessionId)
  validateEventCreateRequest(message)

  try {
    // Validate session access
    const session = await getSession(sessionId, context)

    // Ensure session is active
    if (session.status !== 'active') {
      throw new ParlantValidationError(
        `Cannot send message to ${session.status} session`
      )
    }

    const client = getParlantClient()

    // Send message via Parlant server
    const event = await client.post<Event>(
      `/api/sessions/${sessionId}/events`,
      message
    )

    logger.info(`Message sent successfully`, {
      session_id: sessionId,
      event_id: event.id,
      type: event.type,
      offset: event.offset
    })

    return event
  } catch (error) {
    logger.error(`Failed to send message`, {
      session_id: sessionId,
      type: message.type,
      error: (error as Error).message
    })

    throw ParlantErrorHandler.normalize(error)
  }
}

/**
 * Get events from a session with optional long polling
 */
export async function getEvents(
  sessionId: string,
  query: EventListQuery,
  context: AuthContext
): Promise<Event[]> {
  logger.info(`Getting events from session`, {
    session_id: sessionId,
    wait_for_data: query.wait_for_data,
    user_id: context.user_id
  })

  // Validate inputs
  validateSessionId(sessionId)
  validateEventListQuery(query)

  try {
    // Validate session access
    await getSession(sessionId, context)

    const client = getParlantClient()

    // If long polling is requested
    if (query.wait_for_data) {
      const timeout = query.timeout || 30000 // Default 30 seconds
      const events = await client.longPoll<Event[]>(
        `/api/sessions/${sessionId}/events`,
        query,
        timeout
      )

      logger.info(`Events retrieved via long polling`, {
        session_id: sessionId,
        events_count: events.length,
        timeout
      })

      return events
    }

    // Standard event retrieval
    const events = await client.get<Event[]>(
      `/api/sessions/${sessionId}/events`,
      query
    )

    logger.info(`Events retrieved successfully`, {
      session_id: sessionId,
      events_count: events.length,
      offset: query.offset
    })

    return events
  } catch (error) {
    logger.error(`Failed to get events`, {
      session_id: sessionId,
      error: (error as Error).message
    })

    throw ParlantErrorHandler.normalize(error)
  }
}

/**
 * End a session
 */
export async function endSession(
  sessionId: string,
  context: AuthContext
): Promise<Session> {
  logger.info(`Ending session`, { session_id: sessionId, user_id: context.user_id })

  try {
    // Validate session access
    const session = await getSession(sessionId, context)

    // Check if user can end this session
    if (session.user_id !== context.user_id && !hasAdminPermission(context)) {
      throw new ParlantWorkspaceError(
        'Insufficient permissions to end this session',
        session.workspace_id
      )
    }

    const client = getParlantClient()

    // Update session status
    const updatedSession = await client.put<Session>(`/api/sessions/${sessionId}`, {
      status: 'ended'
    })

    logger.info(`Session ended successfully`, {
      session_id: sessionId,
      agent_id: updatedSession.agent_id
    })

    return updatedSession
  } catch (error) {
    logger.error(`Failed to end session`, {
      session_id: sessionId,
      error: (error as Error).message
    })

    throw ParlantErrorHandler.normalize(error)
  }
}

/**
 * Pause a session
 */
export async function pauseSession(
  sessionId: string,
  context: AuthContext
): Promise<Session> {
  logger.info(`Pausing session`, { session_id: sessionId, user_id: context.user_id })

  try {
    // Validate session access
    const session = await getSession(sessionId, context)

    // Check if user can pause this session
    if (session.user_id !== context.user_id && !hasAdminPermission(context)) {
      throw new ParlantWorkspaceError(
        'Insufficient permissions to pause this session',
        session.workspace_id
      )
    }

    const client = getParlantClient()

    // Update session status
    const updatedSession = await client.put<Session>(`/api/sessions/${sessionId}`, {
      status: 'paused'
    })

    logger.info(`Session paused successfully`, {
      session_id: sessionId,
      agent_id: updatedSession.agent_id
    })

    return updatedSession
  } catch (error) {
    logger.error(`Failed to pause session`, {
      session_id: sessionId,
      error: (error as Error).message
    })

    throw ParlantErrorHandler.normalize(error)
  }
}

/**
 * Resume a paused session
 */
export async function resumeSession(
  sessionId: string,
  context: AuthContext
): Promise<Session> {
  logger.info(`Resuming session`, { session_id: sessionId, user_id: context.user_id })

  try {
    // Validate session access
    const session = await getSession(sessionId, context)

    if (session.status !== 'paused') {
      throw new ParlantValidationError('Can only resume paused sessions')
    }

    // Check if user can resume this session
    if (session.user_id !== context.user_id && !hasAdminPermission(context)) {
      throw new ParlantWorkspaceError(
        'Insufficient permissions to resume this session',
        session.workspace_id
      )
    }

    const client = getParlantClient()

    // Update session status
    const updatedSession = await client.put<Session>(`/api/sessions/${sessionId}`, {
      status: 'active'
    })

    logger.info(`Session resumed successfully`, {
      session_id: sessionId,
      agent_id: updatedSession.agent_id
    })

    return updatedSession
  } catch (error) {
    logger.error(`Failed to resume session`, {
      session_id: sessionId,
      error: (error as Error).message
    })

    throw ParlantErrorHandler.normalize(error)
  }
}

// Validation Functions

/**
 * Validate session creation request
 */
function validateSessionCreateRequest(request: SessionCreateRequest): void {
  const errors: string[] = []

  if (!request.agent_id || request.agent_id.trim().length === 0) {
    errors.push('Agent ID is required')
  }

  if (!request.workspace_id || request.workspace_id.trim().length === 0) {
    errors.push('Workspace ID is required')
  }

  // Validate UUID formats
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  if (request.agent_id && !uuidRegex.test(request.agent_id)) {
    errors.push('Invalid agent ID format')
  }

  if (request.workspace_id && !uuidRegex.test(request.workspace_id)) {
    errors.push('Invalid workspace ID format')
  }

  if (request.user_id && !uuidRegex.test(request.user_id)) {
    errors.push('Invalid user ID format')
  }

  if (errors.length > 0) {
    const validationErrors = errors.map(error => ({
      field: 'general',
      message: error,
      code: 'VALIDATION_ERROR'
    }))

    throw new ParlantValidationError('Session creation validation failed', validationErrors)
  }
}

/**
 * Validate session list query
 */
function validateSessionListQuery(query: SessionListQuery): void {
  if (query.limit && (query.limit < 1 || query.limit > 100)) {
    throw new ParlantValidationError('Limit must be between 1 and 100')
  }

  if (query.offset && query.offset < 0) {
    throw new ParlantValidationError('Offset must be non-negative')
  }

  if (query.status && !['active', 'ended', 'paused'].includes(query.status)) {
    throw new ParlantValidationError('Invalid status filter')
  }
}

/**
 * Validate event creation request
 */
function validateEventCreateRequest(request: EventCreateRequest): void {
  const errors: string[] = []

  if (!request.type) {
    errors.push('Event type is required')
  }

  const validTypes = [
    'customer_message',
    'agent_message',
    'system_message',
    'action_executed',
    'guideline_triggered',
    'session_started',
    'session_ended',
    'session_paused',
    'error'
  ]

  if (request.type && !validTypes.includes(request.type)) {
    errors.push('Invalid event type')
  }

  if (!request.content) {
    errors.push('Event content is required')
  }

  if (request.source && !['customer', 'agent', 'system'].includes(request.source)) {
    errors.push('Invalid event source')
  }

  if (errors.length > 0) {
    const validationErrors = errors.map(error => ({
      field: 'general',
      message: error,
      code: 'VALIDATION_ERROR'
    }))

    throw new ParlantValidationError('Event creation validation failed', validationErrors)
  }
}

/**
 * Validate event list query
 */
function validateEventListQuery(query: EventListQuery): void {
  if (query.limit && (query.limit < 1 || query.limit > 1000)) {
    throw new ParlantValidationError('Limit must be between 1 and 1000')
  }

  if (query.offset && query.offset < 0) {
    throw new ParlantValidationError('Offset must be non-negative')
  }

  if (query.timeout && (query.timeout < 1000 || query.timeout > 60000)) {
    throw new ParlantValidationError('Timeout must be between 1000ms and 60000ms')
  }
}

/**
 * Validate session ID format
 */
function validateSessionId(sessionId: string): void {
  if (!sessionId || sessionId.trim().length === 0) {
    throw new ParlantValidationError('Session ID is required')
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(sessionId)) {
    throw new ParlantValidationError('Invalid session ID format')
  }
}

// Access Control Functions

/**
 * Validate session access for the given context
 */
async function validateSessionAccess(
  session: Session,
  context: AuthContext
): Promise<void> {
  // Users can access their own sessions
  if (session.user_id === context.user_id) {
    return
  }

  // Admin users can access all sessions in their workspace
  if (hasAdminPermission(context) && session.workspace_id === context.workspace_id) {
    return
  }

  // Check workspace access
  if (session.workspace_id !== context.workspace_id && !hasAdminPermission(context)) {
    throw new ParlantWorkspaceError(
      'Access denied: insufficient session permissions',
      session.workspace_id
    )
  }
}

/**
 * Filter sessions by access permissions
 */
async function filterSessionsByAccess(
  sessions: Session[],
  context: AuthContext
): Promise<Session[]> {
  // Admin users get all sessions in their workspace
  if (hasAdminPermission(context)) {
    return sessions.filter(session => session.workspace_id === context.workspace_id)
  }

  // Regular users get their own sessions in their workspace
  return sessions.filter(session =>
    session.user_id === context.user_id &&
    session.workspace_id === context.workspace_id
  )
}

/**
 * Check if user has admin permissions
 */
function hasAdminPermission(context: AuthContext): boolean {
  return context.permissions?.includes('workspace:admin') ||
         context.permissions?.includes('sessions:admin') ||
         false
}