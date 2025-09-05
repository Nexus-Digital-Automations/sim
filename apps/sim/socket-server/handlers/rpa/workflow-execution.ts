/**
 * RPA Workflow Execution Handler
 * 
 * Handles real-time workflow execution orchestration between Sim platform
 * and Desktop Agents. Manages workflow lifecycle, operation sequencing,
 * error recovery, and progress tracking.
 * 
 * Key Features:
 * - Workflow execution orchestration
 * - Real-time progress tracking
 * - Operation sequencing and dependencies
 * - Error handling and recovery
 * - Pause/Resume/Cancel capabilities
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { RoomManager } from '@/socket-server/rooms/manager'
import { workflowStartEventSchema } from '@/socket-server/validation/rpa-schemas'
import type { RPASocket } from './index'
import type { RPAWorkflowExecution } from '@/types/rpa'

const logger = createLogger('RPAWorkflowExecution')

/**
 * Setup workflow execution event handlers for a socket
 * 
 * @param socket - RPA-enabled socket connection
 * @param roomManager - Room management instance
 */
export function setupWorkflowExecutionHandlers(socket: RPASocket, roomManager: RoomManager) {
  logger.debug(`Setting up workflow execution handlers for socket ${socket.id}`)

  // Handle workflow start requests (from users)
  socket.on('rpa:workflow:start', async (data) => {
    await handleWorkflowStart(socket, roomManager, data)
  })

  // Handle workflow pause requests (from users)
  socket.on('rpa:workflow:pause', async (data) => {
    await handleWorkflowPause(socket, roomManager, data)
  })

  // Handle workflow resume requests (from users)
  socket.on('rpa:workflow:resume', async (data) => {
    await handleWorkflowResume(socket, roomManager, data)
  })

  // Handle workflow cancel requests (from users)
  socket.on('rpa:workflow:cancel', async (data) => {
    await handleWorkflowCancel(socket, roomManager, data)
  })

  // Handle workflow status updates (from agents)
  socket.on('rpa:workflow:status', async (data) => {
    await handleWorkflowStatus(socket, roomManager, data)
  })

  // Handle workflow completion (from orchestrator)
  socket.on('rpa:workflow:completed', async (data) => {
    await handleWorkflowCompleted(socket, roomManager, data)
  })

  logger.debug(`Workflow execution handlers setup completed for socket ${socket.id}`)
}

/**
 * Handle workflow start request from user
 */
async function handleWorkflowStart(socket: RPASocket, roomManager: RoomManager, data: any) {
  logger.info(`Processing workflow start request`, {
    socketId: socket.id,
    userId: socket.userId,
    executionId: data.execution?.id
  })

  try {
    // Validate workflow data
    const validationResult = workflowStartEventSchema.safeParse(data)
    if (!validationResult.success) {
      logger.warn(`Invalid workflow start data from socket ${socket.id}`, {
        errors: validationResult.error.errors
      })
      
      socket.emit('rpa:workflow:error', {
        executionId: data.execution?.id || 'unknown',
        error: 'Invalid workflow data',
        details: validationResult.error.errors,
        timestamp: new Date()
      })
      return
    }

    const { execution } = validationResult.data

    // Verify user permissions
    if (!socket.userId || execution.userId !== socket.userId) {
      socket.emit('rpa:workflow:error', {
        executionId: execution.id,
        error: 'Insufficient permissions',
        timestamp: new Date()
      })
      return
    }

    // Join workflow room for updates
    const workflowRoom = `rpa:workflow:${execution.id}`
    socket.join(workflowRoom)

    // Set current execution on socket
    socket.currentExecution = execution.id

    // Forward to agent
    const { agentStore } = require('@/app/api/rpa/agents/route')
    const agent = agentStore.get(execution.agentId)
    
    if (!agent || agent.status !== 'online') {
      socket.emit('rpa:workflow:error', {
        executionId: execution.id,
        error: 'Agent is not available',
        timestamp: new Date()
      })
      return
    }

    const agentSocket = roomManager.getSocketById(agent.connectionId)
    if (agentSocket) {
      agentSocket.emit('rpa:workflow:assigned', {
        executionId: execution.id,
        execution: execution,
        timestamp: new Date()
      })
    }

    logger.info(`Workflow assigned to agent`, {
      executionId: execution.id,
      agentId: execution.agentId,
      userId: socket.userId
    })

    // Confirm assignment to user
    socket.emit('rpa:workflow:assigned', {
      executionId: execution.id,
      agentId: execution.agentId,
      status: 'assigned',
      timestamp: new Date()
    })

  } catch (error) {
    logger.error(`Error processing workflow start request`, {
      socketId: socket.id,
      userId: socket.userId,
      error: error instanceof Error ? error.message : String(error)
    })

    socket.emit('rpa:workflow:error', {
      executionId: data.execution?.id || 'unknown',
      error: 'Failed to start workflow',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    })
  }
}

/**
 * Handle workflow pause request
 */
async function handleWorkflowPause(socket: RPASocket, roomManager: RoomManager, data: any) {
  const { executionId, reason } = data

  logger.info(`Workflow pause requested`, {
    executionId,
    userId: socket.userId,
    reason
  })

  try {
    // Broadcast pause request to workflow room
    const workflowRoom = `rpa:workflow:${executionId}`
    socket.to(workflowRoom).emit('rpa:workflow:pause-requested', {
      executionId,
      reason: reason || 'Paused by user',
      requestedBy: socket.userId,
      timestamp: new Date()
    })

    socket.emit('rpa:workflow:pause-requested', {
      executionId,
      status: 'pause_requested',
      timestamp: new Date()
    })

  } catch (error) {
    logger.error(`Error processing workflow pause`, {
      executionId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Handle workflow resume request
 */
async function handleWorkflowResume(socket: RPASocket, roomManager: RoomManager, data: any) {
  const { executionId } = data

  logger.info(`Workflow resume requested`, {
    executionId,
    userId: socket.userId
  })

  try {
    // Broadcast resume request to workflow room
    const workflowRoom = `rpa:workflow:${executionId}`
    socket.to(workflowRoom).emit('rpa:workflow:resume-requested', {
      executionId,
      requestedBy: socket.userId,
      timestamp: new Date()
    })

    socket.emit('rpa:workflow:resume-requested', {
      executionId,
      status: 'resume_requested',
      timestamp: new Date()
    })

  } catch (error) {
    logger.error(`Error processing workflow resume`, {
      executionId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Handle workflow cancel request
 */
async function handleWorkflowCancel(socket: RPASocket, roomManager: RoomManager, data: any) {
  const { executionId, reason } = data

  logger.info(`Workflow cancel requested`, {
    executionId,
    userId: socket.userId,
    reason
  })

  try {
    // Clear current execution from socket
    if (socket.currentExecution === executionId) {
      socket.currentExecution = undefined
    }

    // Broadcast cancel request to workflow room
    const workflowRoom = `rpa:workflow:${executionId}`
    socket.to(workflowRoom).emit('rpa:workflow:cancel-requested', {
      executionId,
      reason: reason || 'Cancelled by user',
      requestedBy: socket.userId,
      timestamp: new Date()
    })

    socket.emit('rpa:workflow:cancel-requested', {
      executionId,
      status: 'cancel_requested',
      timestamp: new Date()
    })

    // Leave workflow room
    socket.leave(workflowRoom)

  } catch (error) {
    logger.error(`Error processing workflow cancel`, {
      executionId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Handle workflow status updates from agent
 */
async function handleWorkflowStatus(socket: RPASocket, roomManager: RoomManager, data: any) {
  if (!socket.isDesktopAgent || !socket.agentId) return

  try {
    const { executionId, status, progress, currentOperation, message } = data

    logger.debug(`Workflow status update`, {
      executionId,
      agentId: socket.agentId,
      status,
      progress,
      currentOperation
    })

    // Broadcast status to workflow room
    const workflowRoom = `rpa:workflow:${executionId}`
    socket.to(workflowRoom).emit('rpa:workflow:status-updated', {
      executionId,
      agentId: socket.agentId,
      status,
      progress,
      currentOperation,
      message,
      timestamp: new Date()
    })

  } catch (error) {
    logger.error(`Error processing workflow status update`, {
      executionId: data.executionId,
      agentId: socket.agentId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Handle workflow completion
 */
async function handleWorkflowCompleted(socket: RPASocket, roomManager: RoomManager, data: any) {
  if (!socket.isDesktopAgent || !socket.agentId) return

  try {
    const { executionId, results, summary, duration } = data

    logger.info(`Workflow completed`, {
      executionId,
      agentId: socket.agentId,
      resultCount: results?.length || 0,
      duration
    })

    // Clear current execution from socket
    if (socket.currentExecution === executionId) {
      socket.currentExecution = undefined
    }

    // Broadcast completion to workflow room
    const workflowRoom = `rpa:workflow:${executionId}`
    socket.to(workflowRoom).emit('rpa:workflow:completed', {
      executionId,
      agentId: socket.agentId,
      results,
      summary,
      duration,
      timestamp: new Date()
    })

    // Clean up workflow room after delay
    setTimeout(() => {
      roomManager.clearRoom(workflowRoom)
    }, 600000) // 10 minutes

  } catch (error) {
    logger.error(`Error processing workflow completion`, {
      executionId: data.executionId,
      agentId: socket.agentId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}