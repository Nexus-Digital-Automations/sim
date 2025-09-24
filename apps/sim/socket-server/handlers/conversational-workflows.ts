/**
 * Conversational Workflow Socket.io Handlers
 * ==========================================
 *
 * Socket.io event handlers for real-time conversational workflow interactions
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { AuthenticatedSocket } from '@/socket-server/middleware/auth'
import type { RoomManager } from '@/socket-server/rooms/manager'
import {
  createConversationalWorkflowHandler,
  processNaturalLanguageCommandHandler,
  getWorkflowStateHandler,
  terminateWorkflowSessionHandler,
  getSessionMetricsHandler,
  formatErrorResponse,
} from '@/services/parlant/conversational-workflows/api'
import { getConversationalWorkflowService } from '@/services/parlant/conversational-workflows/core'
import type {
  CreateConversationalWorkflowRequest,
  ProcessNaturalLanguageCommandRequest,
  GetWorkflowStateRequest,
  ConversationalWorkflowUpdate,
} from '@/services/parlant/conversational-workflows/types'

const logger = createLogger('ConversationalWorkflowSocketHandlers')

/**
 * Setup conversational workflow socket handlers
 */
export function setupConversationalWorkflowHandlers(
  socket: AuthenticatedSocket,
  roomManager: RoomManager
): void {
  logger.info('Setting up conversational workflow handlers', { socketId: socket.id })

  // Handler for creating new conversational workflow sessions
  socket.on('create-conversational-workflow', async (data, callback) => {
    const startTime = Date.now()

    logger.info('Received create-conversational-workflow request', {
      socketId: socket.id,
      userId: socket.userId,
      workflowId: data?.workflowId,
    })

    try {
      // Validate authentication
      if (!socket.userId || !socket.workspaceId) {
        const error = new Error('Authentication required')
        callback?.(formatErrorResponse(error))
        return
      }

      // Validate request data
      if (!data?.workflowId) {
        const error = new Error('Missing workflowId in request')
        callback?.(formatErrorResponse(error))
        return
      }

      // Prepare request
      const request: CreateConversationalWorkflowRequest = {
        workflowId: data.workflowId,
        workspaceId: socket.workspaceId,
        userId: socket.userId,
        conversationalConfig: data.conversationalConfig || {},
        executionConfig: data.executionConfig || {},
        initialInput: data.initialInput || {},
        sessionMetadata: data.sessionMetadata || {},
      }

      // Create conversational workflow
      const response = await createConversationalWorkflowHandler(request, {
        userId: socket.userId,
        workspaceId: socket.workspaceId,
        requestId: generateRequestId(),
      })

      // Join the socket to session room for real-time updates
      const sessionRoom = `conversational-workflow:${response.sessionId}`
      socket.join(sessionRoom)

      // Subscribe to session updates
      const service = getConversationalWorkflowService()
      const unsubscribe = service.getStateManager().subscribeToSession(
        response.sessionId,
        (update: ConversationalWorkflowUpdate) => {
          // Broadcast update to session room
          socket.to(sessionRoom).emit('conversational-workflow-update', update)
        }
      )

      // Store unsubscribe function for cleanup
      socket.data.conversationalWorkflowUnsubscribe = unsubscribe
      socket.data.conversationalWorkflowSessionId = response.sessionId

      const executionTime = Date.now() - startTime

      logger.info('Conversational workflow created successfully', {
        socketId: socket.id,
        sessionId: response.sessionId,
        journeyId: response.journeyId,
        executionTime,
      })

      // Send success response
      callback?.({
        success: true,
        data: response,
        executionTime,
      })

      // Emit session started event to room
      socket.to(sessionRoom).emit('conversational-workflow-session-started', {
        sessionId: response.sessionId,
        workflowId: response.initialState.workflowId,
        userId: socket.userId,
        startedAt: new Date().toISOString(),
      })
    } catch (error: any) {
      const executionTime = Date.now() - startTime

      logger.error('Failed to create conversational workflow', {
        socketId: socket.id,
        userId: socket.userId,
        workflowId: data?.workflowId,
        error: error.message,
        executionTime,
      })

      callback?.(formatErrorResponse(error))
    }
  })

  // Handler for processing natural language commands
  socket.on('process-nl-command', async (data, callback) => {
    const startTime = Date.now()

    logger.info('Received process-nl-command request', {
      socketId: socket.id,
      sessionId: data?.sessionId,
      inputLength: data?.naturalLanguageInput?.length || 0,
    })

    try {
      // Validate authentication
      if (!socket.userId || !socket.workspaceId) {
        const error = new Error('Authentication required')
        callback?.(formatErrorResponse(error))
        return
      }

      // Validate request data
      if (!data?.sessionId || !data?.workflowId || !data?.naturalLanguageInput) {
        const error = new Error('Missing required fields: sessionId, workflowId, naturalLanguageInput')
        callback?.(formatErrorResponse(error))
        return
      }

      // Prepare request
      const request: ProcessNaturalLanguageCommandRequest = {
        sessionId: data.sessionId,
        workflowId: data.workflowId,
        naturalLanguageInput: data.naturalLanguageInput,
        userId: socket.userId,
        workspaceId: socket.workspaceId,
      }

      // Process natural language command
      const response = await processNaturalLanguageCommandHandler(request, {
        userId: socket.userId,
        workspaceId: socket.workspaceId,
        requestId: generateRequestId(),
      })

      const executionTime = Date.now() - startTime

      logger.info('Natural language command processed successfully', {
        socketId: socket.id,
        sessionId: data.sessionId,
        commandProcessed: response.commandProcessed,
        workflowAction: response.workflowAction,
        executionTime,
      })

      // Send success response
      callback?.({
        success: true,
        data: response,
        executionTime,
      })

      // Broadcast command processed event to session room
      const sessionRoom = `conversational-workflow:${data.sessionId}`
      socket.to(sessionRoom).emit('conversational-workflow-command-processed', {
        sessionId: data.sessionId,
        userId: socket.userId,
        naturalLanguageInput: data.naturalLanguageInput,
        workflowAction: response.workflowAction,
        agentResponse: response.agentResponse,
        processedAt: new Date().toISOString(),
      })
    } catch (error: any) {
      const executionTime = Date.now() - startTime

      logger.error('Failed to process natural language command', {
        socketId: socket.id,
        sessionId: data?.sessionId,
        error: error.message,
        executionTime,
      })

      callback?.(formatErrorResponse(error))
    }
  })

  // Handler for getting workflow state
  socket.on('get-workflow-state', async (data, callback) => {
    const startTime = Date.now()

    logger.info('Received get-workflow-state request', {
      socketId: socket.id,
      sessionId: data?.sessionId,
    })

    try {
      // Validate authentication
      if (!socket.userId || !socket.workspaceId) {
        const error = new Error('Authentication required')
        callback?.(formatErrorResponse(error))
        return
      }

      // Validate request data
      if (!data?.sessionId || !data?.workflowId) {
        const error = new Error('Missing required fields: sessionId, workflowId')
        callback?.(formatErrorResponse(error))
        return
      }

      // Prepare request
      const request: GetWorkflowStateRequest = {
        sessionId: data.sessionId,
        workflowId: data.workflowId,
        userId: socket.userId,
        workspaceId: socket.workspaceId,
      }

      // Get workflow state
      const response = await getWorkflowStateHandler(request, {
        userId: socket.userId,
        workspaceId: socket.workspaceId,
        requestId: generateRequestId(),
      })

      const executionTime = Date.now() - startTime

      logger.info('Workflow state retrieved successfully', {
        socketId: socket.id,
        sessionId: data.sessionId,
        executionStatus: response.currentState.executionStatus,
        executionTime,
      })

      // Send success response
      callback?.({
        success: true,
        data: response,
        executionTime,
      })
    } catch (error: any) {
      const executionTime = Date.now() - startTime

      logger.error('Failed to get workflow state', {
        socketId: socket.id,
        sessionId: data?.sessionId,
        error: error.message,
        executionTime,
      })

      callback?.(formatErrorResponse(error))
    }
  })

  // Handler for terminating workflow sessions
  socket.on('terminate-workflow-session', async (data, callback) => {
    const startTime = Date.now()

    logger.info('Received terminate-workflow-session request', {
      socketId: socket.id,
      sessionId: data?.sessionId,
    })

    try {
      // Validate authentication
      if (!socket.userId || !socket.workspaceId) {
        const error = new Error('Authentication required')
        callback?.(formatErrorResponse(error))
        return
      }

      // Validate request data
      if (!data?.sessionId) {
        const error = new Error('Missing sessionId')
        callback?.(formatErrorResponse(error))
        return
      }

      // Terminate session
      const response = await terminateWorkflowSessionHandler(data.sessionId, {
        userId: socket.userId,
        workspaceId: socket.workspaceId,
        requestId: generateRequestId(),
      })

      // Leave session room and cleanup subscription
      const sessionRoom = `conversational-workflow:${data.sessionId}`
      socket.leave(sessionRoom)

      if (socket.data.conversationalWorkflowUnsubscribe) {
        socket.data.conversationalWorkflowUnsubscribe()
        delete socket.data.conversationalWorkflowUnsubscribe
        delete socket.data.conversationalWorkflowSessionId
      }

      const executionTime = Date.now() - startTime

      logger.info('Workflow session terminated successfully', {
        socketId: socket.id,
        sessionId: data.sessionId,
        executionTime,
      })

      // Send success response
      callback?.({
        success: true,
        data: response,
        executionTime,
      })

      // Broadcast session terminated event
      socket.to(sessionRoom).emit('conversational-workflow-session-terminated', {
        sessionId: data.sessionId,
        userId: socket.userId,
        terminatedAt: new Date().toISOString(),
      })
    } catch (error: any) {
      const executionTime = Date.now() - startTime

      logger.error('Failed to terminate workflow session', {
        socketId: socket.id,
        sessionId: data?.sessionId,
        error: error.message,
        executionTime,
      })

      callback?.(formatErrorResponse(error))
    }
  })

  // Handler for getting session metrics
  socket.on('get-session-metrics', async (data, callback) => {
    const startTime = Date.now()

    logger.info('Received get-session-metrics request', {
      socketId: socket.id,
      sessionId: data?.sessionId,
    })

    try {
      // Validate authentication
      if (!socket.userId || !socket.workspaceId) {
        const error = new Error('Authentication required')
        callback?.(formatErrorResponse(error))
        return
      }

      // Validate request data
      if (!data?.sessionId) {
        const error = new Error('Missing sessionId')
        callback?.(formatErrorResponse(error))
        return
      }

      // Get session metrics
      const response = await getSessionMetricsHandler(data.sessionId, {
        userId: socket.userId,
        workspaceId: socket.workspaceId,
        requestId: generateRequestId(),
      })

      const executionTime = Date.now() - startTime

      logger.info('Session metrics retrieved successfully', {
        socketId: socket.id,
        sessionId: data.sessionId,
        progressPercentage: response.metrics.progressPercentage,
        executionTime,
      })

      // Send success response
      callback?.({
        success: true,
        data: response,
        executionTime,
      })
    } catch (error: any) {
      const executionTime = Date.now() - startTime

      logger.error('Failed to get session metrics', {
        socketId: socket.id,
        sessionId: data?.sessionId,
        error: error.message,
        executionTime,
      })

      callback?.(formatErrorResponse(error))
    }
  })

  // Handler for joining workflow session rooms (for observers)
  socket.on('join-workflow-session', async (data, callback) => {
    logger.info('Received join-workflow-session request', {
      socketId: socket.id,
      sessionId: data?.sessionId,
    })

    try {
      // Validate authentication
      if (!socket.userId || !socket.workspaceId) {
        const error = new Error('Authentication required')
        callback?.(formatErrorResponse(error))
        return
      }

      // Validate request data
      if (!data?.sessionId) {
        const error = new Error('Missing sessionId')
        callback?.(formatErrorResponse(error))
        return
      }

      // Verify session exists and user has access
      const service = getConversationalWorkflowService()
      const sessionState = await service.getWorkflowState(data.sessionId)

      if (!sessionState) {
        const error = new Error('Session not found')
        callback?.(formatErrorResponse(error))
        return
      }

      // Join session room
      const sessionRoom = `conversational-workflow:${data.sessionId}`
      socket.join(sessionRoom)

      logger.info('Socket joined workflow session room', {
        socketId: socket.id,
        sessionId: data.sessionId,
        sessionRoom,
      })

      // Send success response with current state
      callback?.({
        success: true,
        data: {
          sessionId: data.sessionId,
          currentState: sessionState,
          joinedAt: new Date().toISOString(),
        },
      })

      // Notify other participants
      socket.to(sessionRoom).emit('conversational-workflow-participant-joined', {
        sessionId: data.sessionId,
        userId: socket.userId,
        socketId: socket.id,
        joinedAt: new Date().toISOString(),
      })
    } catch (error: any) {
      logger.error('Failed to join workflow session', {
        socketId: socket.id,
        sessionId: data?.sessionId,
        error: error.message,
      })

      callback?.(formatErrorResponse(error))
    }
  })

  // Handler for leaving workflow session rooms
  socket.on('leave-workflow-session', async (data, callback) => {
    logger.info('Received leave-workflow-session request', {
      socketId: socket.id,
      sessionId: data?.sessionId,
    })

    try {
      if (data?.sessionId) {
        const sessionRoom = `conversational-workflow:${data.sessionId}`
        socket.leave(sessionRoom)

        // Cleanup subscription if this was the session owner
        if (socket.data.conversationalWorkflowSessionId === data.sessionId) {
          if (socket.data.conversationalWorkflowUnsubscribe) {
            socket.data.conversationalWorkflowUnsubscribe()
            delete socket.data.conversationalWorkflowUnsubscribe
            delete socket.data.conversationalWorkflowSessionId
          }
        }

        logger.info('Socket left workflow session room', {
          socketId: socket.id,
          sessionId: data.sessionId,
          sessionRoom,
        })

        // Notify other participants
        socket.to(sessionRoom).emit('conversational-workflow-participant-left', {
          sessionId: data.sessionId,
          userId: socket.userId,
          socketId: socket.id,
          leftAt: new Date().toISOString(),
        })
      }

      callback?.({ success: true })
    } catch (error: any) {
      logger.error('Failed to leave workflow session', {
        socketId: socket.id,
        sessionId: data?.sessionId,
        error: error.message,
      })

      callback?.(formatErrorResponse(error))
    }
  })

  // Socket disconnect cleanup
  socket.on('disconnect', () => {
    logger.info('Socket disconnecting, cleaning up conversational workflow resources', {
      socketId: socket.id,
      userId: socket.userId,
    })

    // Cleanup subscription if exists
    if (socket.data.conversationalWorkflowUnsubscribe) {
      socket.data.conversationalWorkflowUnsubscribe()
      delete socket.data.conversationalWorkflowUnsubscribe

      if (socket.data.conversationalWorkflowSessionId) {
        const sessionRoom = `conversational-workflow:${socket.data.conversationalWorkflowSessionId}`

        // Notify session room of disconnection
        socket.to(sessionRoom).emit('conversational-workflow-participant-disconnected', {
          sessionId: socket.data.conversationalWorkflowSessionId,
          userId: socket.userId,
          socketId: socket.id,
          disconnectedAt: new Date().toISOString(),
        })

        delete socket.data.conversationalWorkflowSessionId
      }
    }
  })

  logger.info('Conversational workflow handlers setup complete', {
    socketId: socket.id,
    userId: socket.userId,
  })
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
}

/**
 * Broadcast update to all connected sockets in a session room
 */
export function broadcastToSessionRoom(
  roomManager: RoomManager,
  sessionId: string,
  eventName: string,
  data: any
): void {
  const sessionRoom = `conversational-workflow:${sessionId}`

  logger.debug('Broadcasting to session room', {
    sessionRoom,
    eventName,
    dataKeys: Object.keys(data || {}),
  })

  // Use room manager's broadcast capability
  roomManager.getIO().to(sessionRoom).emit(eventName, data)
}