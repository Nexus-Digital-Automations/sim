/**
 * RPA Operation Streaming Handler
 * 
 * Handles real-time streaming of RPA operation execution, progress updates,
 * and results between Desktop Agents and the Sim platform. Provides live
 * feedback for operation monitoring and debugging.
 * 
 * Key Features:
 * - Real-time operation progress streaming
 * - Live screenshot and log streaming
 * - Operation result broadcasting
 * - Error reporting and diagnostics
 * - Performance metrics collection
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { RoomManager } from '@/socket-server/rooms/manager'
import { 
  operationExecuteEventSchema,
  operationProgressEventSchema,
  operationCompleteEventSchema
} from '@/socket-server/validation/rpa-schemas'
import type { RPASocket } from './index'
import type { RPAOperationResult, RPAExecutionLog } from '@/types/rpa'

const logger = createLogger('RPAOperationStreaming')

/**
 * Setup operation streaming event handlers for a socket
 * 
 * @param socket - RPA-enabled socket connection
 * @param roomManager - Room management instance
 */
export function setupOperationStreamingHandlers(socket: RPASocket, roomManager: RoomManager) {
  logger.debug(`Setting up operation streaming handlers for socket ${socket.id}`)

  // Handle operation execution requests (from users to agents)
  socket.on('rpa:operation:execute', async (data) => {
    await handleOperationExecute(socket, roomManager, data)
  })

  // Handle operation progress updates (from agents)
  socket.on('rpa:operation:progress', async (data) => {
    await handleOperationProgress(socket, roomManager, data)
  })

  // Handle operation completion (from agents)
  socket.on('rpa:operation:complete', async (data) => {
    await handleOperationComplete(socket, roomManager, data)
  })

  // Handle operation errors (from agents)
  socket.on('rpa:operation:error', async (data) => {
    await handleOperationError(socket, roomManager, data)
  })

  // Handle operation cancellation requests (from users)
  socket.on('rpa:operation:cancel', async (data) => {
    await handleOperationCancel(socket, roomManager, data)
  })

  // Handle live screenshot streaming (from agents)
  socket.on('rpa:stream:screenshot', async (data) => {
    await handleScreenshotStream(socket, roomManager, data)
  })

  // Handle live log streaming (from agents)
  socket.on('rpa:stream:logs', async (data) => {
    await handleLogStream(socket, roomManager, data)
  })

  // Handle metrics streaming (from agents)
  socket.on('rpa:stream:metrics', async (data) => {
    await handleMetricsStream(socket, roomManager, data)
  })

  logger.debug(`Operation streaming handlers setup completed for socket ${socket.id}`)
}

/**
 * Handle operation execution request from user to agent
 */
async function handleOperationExecute(socket: RPASocket, roomManager: RoomManager, data: any) {
  logger.info(`Processing operation execution request`, {
    socketId: socket.id,
    userId: socket.userId,
    operationType: data.operation?.type,
    targetAgentId: data.operation?.agentId
  })

  try {
    // Validate operation data
    const validationResult = operationExecuteEventSchema.safeParse(data)
    if (!validationResult.success) {
      logger.warn(`Invalid operation execution data from socket ${socket.id}`, {
        errors: validationResult.error.errors
      })
      
      socket.emit('rpa:operation:error', {
        operationId: data.operation?.id || 'unknown',
        error: 'Invalid operation data',
        details: validationResult.error.errors,
        timestamp: new Date()
      })
      return
    }

    const { operation } = validationResult.data

    // Check if user has permission to execute operations on this agent
    if (!socket.userId) {
      socket.emit('rpa:operation:error', {
        operationId: operation.id,
        error: 'Authentication required',
        timestamp: new Date()
      })
      return
    }

    // Verify agent access (import agent stores)
    const { agentStore, agentAuthStore } = require('@/app/api/rpa/agents/route')
    const agent = agentStore.get(operation.agentId)
    const agentAuth = agentAuthStore.get(operation.agentId)

    if (!agent || !agentAuth || agentAuth.userId !== socket.userId) {
      socket.emit('rpa:operation:error', {
        operationId: operation.id,
        error: 'Agent not found or insufficient permissions',
        timestamp: new Date()
      })
      return
    }

    if (agent.status !== 'online' && agent.status !== 'busy') {
      socket.emit('rpa:operation:error', {
        operationId: operation.id,
        error: `Agent is ${agent.status} and cannot execute operations`,
        timestamp: new Date()
      })
      return
    }

    // Find agent socket by connection ID
    const agentSocket = roomManager.getSocketById(agent.connectionId)
    if (!agentSocket) {
      socket.emit('rpa:operation:error', {
        operationId: operation.id,
        error: 'Agent is not connected',
        timestamp: new Date()
      })
      return
    }

    // Add user socket to operation room for updates
    const operationRoom = `rpa:operation:${operation.id}`
    socket.join(operationRoom)

    // Track operation on user socket
    if (!socket.activeOperations) {
      socket.activeOperations = new Set()
    }
    socket.activeOperations.add(operation.id)

    // Forward operation to agent
    agentSocket.emit('rpa:operation:assigned', {
      operationId: operation.id,
      operation: operation,
      requestedBy: {
        userId: socket.userId,
        userName: socket.userName,
        timestamp: new Date()
      }
    })

    logger.info(`Operation forwarded to agent`, {
      operationId: operation.id,
      operationType: operation.type,
      agentId: operation.agentId,
      userId: socket.userId,
      agentSocketId: agentSocket.id
    })

    // Confirm operation assignment to user
    socket.emit('rpa:operation:assigned', {
      operationId: operation.id,
      agentId: operation.agentId,
      status: 'assigned',
      timestamp: new Date()
    })

  } catch (error) {
    logger.error(`Error processing operation execution request`, {
      socketId: socket.id,
      userId: socket.userId,
      error: error instanceof Error ? error.message : String(error)
    })

    socket.emit('rpa:operation:error', {
      operationId: data.operation?.id || 'unknown',
      error: 'Failed to process operation request',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    })
  }
}

/**
 * Handle operation progress updates from agent
 */
async function handleOperationProgress(socket: RPASocket, roomManager: RoomManager, data: any) {
  if (!socket.isDesktopAgent || !socket.agentId) {
    logger.warn(`Progress update from non-agent socket ${socket.id}`)
    return
  }

  try {
    // Validate progress data
    const validationResult = operationProgressEventSchema.safeParse(data)
    if (!validationResult.success) {
      logger.debug(`Invalid progress data from agent ${socket.agentId}`, {
        errors: validationResult.error.errors
      })
      return
    }

    const { operationId, progress, message } = validationResult.data

    logger.debug(`Operation progress update`, {
      operationId,
      agentId: socket.agentId,
      progress,
      message
    })

    // Broadcast progress to operation room
    const operationRoom = `rpa:operation:${operationId}`
    socket.to(operationRoom).emit('rpa:operation:progress', {
      operationId,
      agentId: socket.agentId,
      progress,
      message,
      timestamp: new Date()
    })

    // Update any workflow execution rooms if this operation is part of a workflow
    const workflowRoom = `rpa:workflow:${data.executionId}`
    if (data.executionId) {
      socket.to(workflowRoom).emit('rpa:workflow:operation-progress', {
        executionId: data.executionId,
        operationId,
        progress,
        message,
        timestamp: new Date()
      })
    }

  } catch (error) {
    logger.error(`Error processing operation progress update`, {
      agentId: socket.agentId,
      socketId: socket.id,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Handle operation completion from agent
 */
async function handleOperationComplete(socket: RPASocket, roomManager: RoomManager, data: any) {
  if (!socket.isDesktopAgent || !socket.agentId) {
    logger.warn(`Operation completion from non-agent socket ${socket.id}`)
    return
  }

  try {
    // Validate completion data
    const validationResult = operationCompleteEventSchema.safeParse(data)
    if (!validationResult.success) {
      logger.warn(`Invalid operation completion data from agent ${socket.agentId}`, {
        errors: validationResult.error.errors
      })
      return
    }

    const { operationId, result } = validationResult.data

    logger.info(`Operation completed`, {
      operationId,
      agentId: socket.agentId,
      success: result.success,
      executionTime: result.executionTime,
      timestamp: result.timestamp
    })

    // Remove operation from agent's active operations
    if (socket.activeOperations) {
      socket.activeOperations.delete(operationId)
    }

    // Broadcast completion to operation room
    const operationRoom = `rpa:operation:${operationId}`
    socket.to(operationRoom).emit('rpa:operation:completed', {
      operationId,
      agentId: socket.agentId,
      result,
      timestamp: new Date()
    })

    // Update workflow execution if applicable
    if (data.executionId) {
      const workflowRoom = `rpa:workflow:${data.executionId}`
      socket.to(workflowRoom).emit('rpa:workflow:operation-completed', {
        executionId: data.executionId,
        operationId,
        result,
        timestamp: new Date()
      })
    }

    // Store result for later retrieval (in production, use persistent storage)
    const { operationStore } = require('@/app/api/rpa/operations/click/route')
    if (operationStore && operationStore.has(operationId)) {
      const operation = operationStore.get(operationId)
      if (operation) {
        operationStore.set(operationId, {
          ...operation,
          status: 'completed',
          completedAt: new Date()
        })
      }
    }

    // Clean up operation room after a delay
    setTimeout(() => {
      roomManager.clearRoom(operationRoom)
    }, 300000) // 5 minutes

  } catch (error) {
    logger.error(`Error processing operation completion`, {
      agentId: socket.agentId,
      socketId: socket.id,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Handle operation error from agent
 */
async function handleOperationError(socket: RPASocket, roomManager: RoomManager, data: any) {
  if (!socket.isDesktopAgent || !socket.agentId) {
    logger.warn(`Operation error from non-agent socket ${socket.id}`)
    return
  }

  try {
    const { operationId, error, details, screenshot, retryable } = data

    logger.warn(`Operation failed`, {
      operationId,
      agentId: socket.agentId,
      error,
      retryable,
      hasScreenshot: !!screenshot
    })

    // Remove operation from agent's active operations
    if (socket.activeOperations) {
      socket.activeOperations.delete(operationId)
    }

    // Broadcast error to operation room
    const operationRoom = `rpa:operation:${operationId}`
    socket.to(operationRoom).emit('rpa:operation:failed', {
      operationId,
      agentId: socket.agentId,
      error,
      details,
      screenshot,
      retryable,
      timestamp: new Date()
    })

    // Update workflow execution if applicable
    if (data.executionId) {
      const workflowRoom = `rpa:workflow:${data.executionId}`
      socket.to(workflowRoom).emit('rpa:workflow:operation-failed', {
        executionId: data.executionId,
        operationId,
        error,
        details,
        screenshot,
        retryable,
        timestamp: new Date()
      })
    }

  } catch (error) {
    logger.error(`Error processing operation error`, {
      agentId: socket.agentId,
      socketId: socket.id,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Handle operation cancellation request from user
 */
async function handleOperationCancel(socket: RPASocket, roomManager: RoomManager, data: any) {
  if (!socket.userId) {
    logger.warn(`Operation cancel request from unauthenticated socket ${socket.id}`)
    return
  }

  try {
    const { operationId, reason } = data

    logger.info(`Operation cancellation requested`, {
      operationId,
      userId: socket.userId,
      reason
    })

    // Find the operation and agent
    const { agentStore } = require('@/app/api/rpa/agents/route')
    let targetAgent = null
    let agentSocket = null

    // Find which agent is executing this operation
    for (const [agentId, agent] of agentStore.entries()) {
      const candidateSocket = roomManager.getSocketById(agent.connectionId)
      if (candidateSocket?.activeOperations?.has(operationId)) {
        targetAgent = agent
        agentSocket = candidateSocket
        break
      }
    }

    if (!targetAgent || !agentSocket) {
      socket.emit('rpa:operation:cancel-failed', {
        operationId,
        error: 'Operation not found or already completed',
        timestamp: new Date()
      })
      return
    }

    // Send cancellation request to agent
    agentSocket.emit('rpa:operation:cancel-requested', {
      operationId,
      reason: reason || 'Cancelled by user',
      requestedBy: {
        userId: socket.userId,
        userName: socket.userName
      },
      timestamp: new Date()
    })

    // Confirm cancellation request to user
    socket.emit('rpa:operation:cancel-requested', {
      operationId,
      status: 'cancellation_requested',
      timestamp: new Date()
    })

    // Broadcast to operation room
    const operationRoom = `rpa:operation:${operationId}`
    socket.to(operationRoom).emit('rpa:operation:cancel-requested', {
      operationId,
      reason: reason || 'Cancelled by user',
      timestamp: new Date()
    })

  } catch (error) {
    logger.error(`Error processing operation cancellation`, {
      socketId: socket.id,
      userId: socket.userId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Handle live screenshot streaming from agent
 */
async function handleScreenshotStream(socket: RPASocket, roomManager: RoomManager, data: any) {
  if (!socket.isDesktopAgent || !socket.agentId) return

  try {
    const { agentId, imageData, metadata } = data

    if (agentId !== socket.agentId) {
      logger.warn(`Screenshot stream agent ID mismatch`, {
        socketAgentId: socket.agentId,
        streamAgentId: agentId
      })
      return
    }

    // Broadcast screenshot to monitoring rooms
    const agentAuth = require('@/app/api/rpa/agents/route').agentAuthStore.get(socket.agentId)
    if (agentAuth) {
      const monitoringRoom = `rpa:monitoring:${agentAuth.userId}`
      socket.to(monitoringRoom).emit('rpa:stream:screenshot', {
        agentId: socket.agentId,
        imageData,
        metadata: {
          ...metadata,
          timestamp: new Date()
        }
      })
    }

    logger.debug(`Screenshot stream processed`, {
      agentId: socket.agentId,
      imageSize: imageData?.length || 0
    })

  } catch (error) {
    logger.error(`Error processing screenshot stream`, {
      agentId: socket.agentId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Handle live log streaming from agent
 */
async function handleLogStream(socket: RPASocket, roomManager: RoomManager, data: any) {
  if (!socket.isDesktopAgent || !socket.agentId) return

  try {
    const { agentId, logs } = data

    if (agentId !== socket.agentId || !Array.isArray(logs)) {
      return
    }

    // Broadcast logs to monitoring rooms
    const agentAuth = require('@/app/api/rpa/agents/route').agentAuthStore.get(socket.agentId)
    if (agentAuth) {
      const monitoringRoom = `rpa:monitoring:${agentAuth.userId}`
      socket.to(monitoringRoom).emit('rpa:stream:logs', {
        agentId: socket.agentId,
        logs: logs.map((log: any) => ({
          ...log,
          receivedAt: new Date()
        }))
      })
    }

    logger.debug(`Log stream processed`, {
      agentId: socket.agentId,
      logCount: logs.length
    })

  } catch (error) {
    logger.error(`Error processing log stream`, {
      agentId: socket.agentId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Handle live metrics streaming from agent
 */
async function handleMetricsStream(socket: RPASocket, roomManager: RoomManager, data: any) {
  if (!socket.isDesktopAgent || !socket.agentId) return

  try {
    const { agentId, metrics } = data

    if (agentId !== socket.agentId) return

    // Broadcast metrics to monitoring rooms
    const agentAuth = require('@/app/api/rpa/agents/route').agentAuthStore.get(socket.agentId)
    if (agentAuth) {
      const monitoringRoom = `rpa:monitoring:${agentAuth.userId}`
      socket.to(monitoringRoom).emit('rpa:stream:metrics', {
        agentId: socket.agentId,
        metrics: {
          ...metrics,
          timestamp: new Date()
        }
      })
    }

  } catch (error) {
    logger.error(`Error processing metrics stream`, {
      agentId: socket.agentId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}