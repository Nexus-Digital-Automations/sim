/**
 * RPA Error Handling Handler
 * 
 * Centralized error handling, recovery, and diagnostics for RPA operations
 * and workflows. Provides comprehensive error reporting, automatic recovery
 * attempts, and diagnostic information collection.
 * 
 * Key Features:
 * - Centralized error processing and classification
 * - Automatic retry and recovery mechanisms
 * - Error diagnostics and screenshot capture
 * - Error pattern analysis and alerting
 * - Graceful degradation strategies
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { RoomManager } from '@/socket-server/rooms/manager'
import type { RPASocket } from './index'
import type { RPAError } from '@/types/rpa'

const logger = createLogger('RPAErrorHandling')

/**
 * RPA Error Classifications
 */
enum ErrorCategory {
  AGENT_CONNECTION = 'agent_connection',
  AUTHENTICATION = 'authentication',
  OPERATION_EXECUTION = 'operation_execution',
  WORKFLOW_ORCHESTRATION = 'workflow_orchestration',
  VALIDATION = 'validation',
  TIMEOUT = 'timeout',
  CAPABILITY_MISMATCH = 'capability_mismatch',
  SYSTEM_ERROR = 'system_error'
}

/**
 * Error severity levels
 */
enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Setup error handling event handlers for a socket
 * 
 * @param socket - RPA-enabled socket connection
 * @param roomManager - Room management instance
 */
export function setupErrorHandlingHandlers(socket: RPASocket, roomManager: RoomManager) {
  logger.debug(`Setting up error handling handlers for socket ${socket.id}`)

  // Handle general RPA system errors
  socket.on('rpa:system:error', async (data) => {
    await handleSystemError(socket, roomManager, data)
  })

  // Handle agent-specific errors
  socket.on('rpa:agent:error', async (data) => {
    await handleAgentError(socket, roomManager, data)
  })

  // Handle operation errors with recovery attempts
  socket.on('rpa:operation:error', async (data) => {
    await handleOperationError(socket, roomManager, data)
  })

  // Handle workflow errors
  socket.on('rpa:workflow:error', async (data) => {
    await handleWorkflowError(socket, roomManager, data)
  })

  // Handle connection errors
  socket.on('rpa:connection:error', async (data) => {
    await handleConnectionError(socket, roomManager, data)
  })

  // Handle validation errors
  socket.on('rpa:validation:error', async (data) => {
    await handleValidationError(socket, roomManager, data)
  })

  // Handle timeout errors
  socket.on('rpa:timeout:error', async (data) => {
    await handleTimeoutError(socket, roomManager, data)
  })

  // Handle recovery requests
  socket.on('rpa:recovery:request', async (data) => {
    await handleRecoveryRequest(socket, roomManager, data)
  })

  logger.debug(`Error handling handlers setup completed for socket ${socket.id}`)
}

/**
 * Handle system-level errors
 */
async function handleSystemError(socket: RPASocket, roomManager: RoomManager, data: any) {
  const rpaError = createRPAError({
    code: 'SYSTEM_ERROR',
    message: data.error || 'System error occurred',
    details: data.details,
    agentId: socket.agentId,
    socketId: socket.id,
    category: ErrorCategory.SYSTEM_ERROR,
    severity: ErrorSeverity.HIGH
  })

  logger.error(`RPA System Error`, {
    socketId: socket.id,
    agentId: socket.agentId,
    userId: socket.userId,
    error: rpaError
  })

  // Broadcast to system status room
  socket.to('rpa:system:status').emit('rpa:system:alert', {
    type: 'system_error',
    error: rpaError,
    timestamp: new Date(),
    requiresAttention: true
  })

  // Notify user if applicable
  if (socket.userId) {
    const userRoom = `rpa:monitoring:${socket.userId}`
    socket.to(userRoom).emit('rpa:system:error', {
      error: rpaError,
      timestamp: new Date(),
      recovery: getRecoveryRecommendations(rpaError)
    })
  }

  // Attempt automatic recovery if possible
  await attemptSystemRecovery(socket, roomManager, rpaError)
}

/**
 * Handle agent-specific errors
 */
async function handleAgentError(socket: RPASocket, roomManager: RoomManager, data: any) {
  const rpaError = createRPAError({
    code: data.code || 'AGENT_ERROR',
    message: data.error || 'Agent error occurred',
    details: data.details,
    agentId: socket.agentId,
    socketId: socket.id,
    category: ErrorCategory.AGENT_CONNECTION,
    severity: determineSeverity(data.error)
  })

  logger.error(`RPA Agent Error`, {
    agentId: socket.agentId,
    socketId: socket.id,
    error: rpaError
  })

  // Update agent status if it's an agent connection
  if (socket.isDesktopAgent && socket.agentId) {
    await updateAgentErrorStatus(socket.agentId, rpaError)
  }

  // Notify users monitoring this agent
  const agentAuth = socket.agentId ? getAgentAuth(socket.agentId) : null
  if (agentAuth) {
    const userRoom = `rpa:agents:user:${agentAuth.userId}`
    socket.to(userRoom).emit('rpa:agent:error', {
      agentId: socket.agentId,
      error: rpaError,
      timestamp: new Date(),
      recovery: getRecoveryRecommendations(rpaError)
    })
  }

  // Attempt agent recovery
  await attemptAgentRecovery(socket, roomManager, rpaError)
}

/**
 * Handle operation execution errors with retry logic
 */
async function handleOperationError(socket: RPASocket, roomManager: RoomManager, data: any) {
  const { operationId, error, details, screenshot, retryable } = data

  const rpaError = createRPAError({
    code: 'OPERATION_FAILED',
    message: error || 'Operation execution failed',
    details: { ...details, screenshot, retryable },
    agentId: socket.agentId,
    operationId,
    socketId: socket.id,
    category: ErrorCategory.OPERATION_EXECUTION,
    severity: retryable ? ErrorSeverity.MEDIUM : ErrorSeverity.HIGH
  })

  logger.error(`RPA Operation Error`, {
    operationId,
    agentId: socket.agentId,
    retryable,
    hasScreenshot: !!screenshot,
    error: rpaError
  })

  // Broadcast to operation room
  if (operationId) {
    const operationRoom = `rpa:operation:${operationId}`
    socket.to(operationRoom).emit('rpa:operation:error', {
      operationId,
      error: rpaError,
      screenshot,
      retryable,
      timestamp: new Date(),
      recovery: retryable ? 'Retry available' : 'Manual intervention required'
    })
  }

  // Attempt operation recovery if retryable
  if (retryable && operationId) {
    await attemptOperationRecovery(socket, roomManager, operationId, rpaError)
  }

  // Store error for analysis
  await storeErrorForAnalysis(rpaError)
}

/**
 * Handle workflow execution errors
 */
async function handleWorkflowError(socket: RPASocket, roomManager: RoomManager, data: any) {
  const { executionId, error, details, affectedOperations } = data

  const rpaError = createRPAError({
    code: 'WORKFLOW_ERROR',
    message: error || 'Workflow execution error',
    details: { ...details, affectedOperations },
    agentId: socket.agentId,
    executionId,
    socketId: socket.id,
    category: ErrorCategory.WORKFLOW_ORCHESTRATION,
    severity: ErrorSeverity.HIGH
  })

  logger.error(`RPA Workflow Error`, {
    executionId,
    agentId: socket.agentId,
    affectedOperations: affectedOperations?.length || 0,
    error: rpaError
  })

  // Broadcast to workflow room
  if (executionId) {
    const workflowRoom = `rpa:workflow:${executionId}`
    socket.to(workflowRoom).emit('rpa:workflow:error', {
      executionId,
      error: rpaError,
      affectedOperations,
      timestamp: new Date(),
      recovery: getWorkflowRecoveryOptions(rpaError)
    })
  }

  // Clear current execution from socket
  if (socket.currentExecution === executionId) {
    socket.currentExecution = undefined
  }

  // Attempt workflow recovery
  await attemptWorkflowRecovery(socket, roomManager, executionId, rpaError)
}

/**
 * Handle connection errors
 */
async function handleConnectionError(socket: RPASocket, roomManager: RoomManager, data: any) {
  const rpaError = createRPAError({
    code: 'CONNECTION_ERROR',
    message: data.error || 'Connection error occurred',
    details: data.details,
    agentId: socket.agentId,
    socketId: socket.id,
    category: ErrorCategory.AGENT_CONNECTION,
    severity: ErrorSeverity.MEDIUM
  })

  logger.warn(`RPA Connection Error`, {
    socketId: socket.id,
    agentId: socket.agentId,
    error: rpaError
  })

  // Attempt connection recovery
  await attemptConnectionRecovery(socket, roomManager, rpaError)
}

/**
 * Handle validation errors
 */
async function handleValidationError(socket: RPASocket, roomManager: RoomManager, data: any) {
  const rpaError = createRPAError({
    code: 'VALIDATION_ERROR',
    message: data.error || 'Validation error',
    details: data.details,
    agentId: socket.agentId,
    socketId: socket.id,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW
  })

  logger.warn(`RPA Validation Error`, {
    socketId: socket.id,
    agentId: socket.agentId,
    error: rpaError
  })

  // Send validation guidance to client
  socket.emit('rpa:validation:guidance', {
    error: rpaError,
    timestamp: new Date(),
    corrections: getValidationCorrections(rpaError)
  })
}

/**
 * Handle timeout errors
 */
async function handleTimeoutError(socket: RPASocket, roomManager: RoomManager, data: any) {
  const { operationId, executionId, timeout, elapsed } = data

  const rpaError = createRPAError({
    code: 'TIMEOUT_ERROR',
    message: `Operation timed out after ${elapsed}ms (limit: ${timeout}ms)`,
    details: { timeout, elapsed },
    agentId: socket.agentId,
    operationId,
    executionId,
    socketId: socket.id,
    category: ErrorCategory.TIMEOUT,
    severity: ErrorSeverity.MEDIUM
  })

  logger.warn(`RPA Timeout Error`, {
    operationId,
    executionId,
    agentId: socket.agentId,
    timeout,
    elapsed,
    error: rpaError
  })

  // Notify relevant rooms
  if (operationId) {
    socket.to(`rpa:operation:${operationId}`).emit('rpa:operation:timeout', {
      operationId,
      error: rpaError,
      timestamp: new Date()
    })
  }

  if (executionId) {
    socket.to(`rpa:workflow:${executionId}`).emit('rpa:workflow:timeout', {
      executionId,
      error: rpaError,
      timestamp: new Date()
    })
  }
}

/**
 * Handle recovery requests
 */
async function handleRecoveryRequest(socket: RPASocket, roomManager: RoomManager, data: any) {
  const { type, targetId, strategy } = data

  logger.info(`RPA Recovery Request`, {
    type,
    targetId,
    strategy,
    socketId: socket.id,
    agentId: socket.agentId
  })

  try {
    switch (type) {
      case 'operation':
        await executeOperationRecovery(socket, roomManager, targetId, strategy)
        break
      case 'workflow':
        await executeWorkflowRecovery(socket, roomManager, targetId, strategy)
        break
      case 'agent':
        await executeAgentRecovery(socket, roomManager, targetId, strategy)
        break
      default:
        socket.emit('rpa:recovery:unsupported', {
          type,
          message: 'Recovery type not supported',
          timestamp: new Date()
        })
    }
  } catch (error) {
    logger.error(`Recovery execution failed`, {
      type,
      targetId,
      strategy,
      error: error instanceof Error ? error.message : String(error)
    })

    socket.emit('rpa:recovery:failed', {
      type,
      targetId,
      strategy,
      error: error instanceof Error ? error.message : 'Recovery failed',
      timestamp: new Date()
    })
  }
}

/**
 * Create standardized RPA error object
 */
function createRPAError(params: {
  code: string
  message: string
  details?: any
  agentId?: string
  operationId?: string
  executionId?: string
  socketId: string
  category: ErrorCategory
  severity: ErrorSeverity
}): RPAError {
  return {
    code: params.code,
    message: params.message,
    details: params.details,
    agentId: params.agentId,
    operationId: params.operationId,
    executionId: params.executionId,
    timestamp: new Date(),
    category: params.category,
    severity: params.severity,
    stack: new Error().stack
  }
}

/**
 * Determine error severity based on error message
 */
function determineSeverity(error: string): ErrorSeverity {
  if (!error) return ErrorSeverity.LOW

  const errorLower = error.toLowerCase()
  
  if (errorLower.includes('critical') || errorLower.includes('fatal')) {
    return ErrorSeverity.CRITICAL
  }
  if (errorLower.includes('connection') || errorLower.includes('network')) {
    return ErrorSeverity.HIGH
  }
  if (errorLower.includes('timeout') || errorLower.includes('retry')) {
    return ErrorSeverity.MEDIUM
  }
  
  return ErrorSeverity.LOW
}

/**
 * Get recovery recommendations for an error
 */
function getRecoveryRecommendations(error: RPAError): string[] {
  const recommendations: string[] = []

  switch (error.category) {
    case ErrorCategory.AGENT_CONNECTION:
      recommendations.push('Check agent connectivity')
      recommendations.push('Verify agent is running')
      recommendations.push('Restart agent if necessary')
      break
    case ErrorCategory.OPERATION_EXECUTION:
      recommendations.push('Review operation parameters')
      recommendations.push('Check target element availability')
      recommendations.push('Increase timeout if needed')
      break
    case ErrorCategory.WORKFLOW_ORCHESTRATION:
      recommendations.push('Review workflow configuration')
      recommendations.push('Check operation dependencies')
      recommendations.push('Verify agent capabilities')
      break
    case ErrorCategory.TIMEOUT:
      recommendations.push('Increase timeout values')
      recommendations.push('Check system performance')
      recommendations.push('Reduce operation complexity')
      break
    default:
      recommendations.push('Check logs for more details')
      recommendations.push('Contact support if issue persists')
  }

  return recommendations
}

// Placeholder functions for recovery operations
async function attemptSystemRecovery(socket: RPASocket, roomManager: RoomManager, error: RPAError) {
  logger.info('Attempting system recovery', { error: error.code })
}

async function attemptAgentRecovery(socket: RPASocket, roomManager: RoomManager, error: RPAError) {
  logger.info('Attempting agent recovery', { agentId: error.agentId, error: error.code })
}

async function attemptOperationRecovery(socket: RPASocket, roomManager: RoomManager, operationId: string, error: RPAError) {
  logger.info('Attempting operation recovery', { operationId, error: error.code })
}

async function attemptWorkflowRecovery(socket: RPASocket, roomManager: RoomManager, executionId: string, error: RPAError) {
  logger.info('Attempting workflow recovery', { executionId, error: error.code })
}

async function attemptConnectionRecovery(socket: RPASocket, roomManager: RoomManager, error: RPAError) {
  logger.info('Attempting connection recovery', { socketId: socket.id, error: error.code })
}

async function updateAgentErrorStatus(agentId: string, error: RPAError) {
  logger.info('Updating agent error status', { agentId, error: error.code })
}

function getAgentAuth(agentId: string) {
  try {
    const { agentAuthStore } = require('@/app/api/rpa/agents/route')
    return agentAuthStore.get(agentId)
  } catch {
    return null
  }
}

function getWorkflowRecoveryOptions(error: RPAError): string[] {
  return ['Retry failed operations', 'Continue from current point', 'Restart workflow']
}

function getValidationCorrections(error: RPAError): string[] {
  return ['Check parameter types', 'Verify required fields', 'Review value ranges']
}

async function executeOperationRecovery(socket: RPASocket, roomManager: RoomManager, operationId: string, strategy: string) {
  logger.info('Executing operation recovery', { operationId, strategy })
}

async function executeWorkflowRecovery(socket: RPASocket, roomManager: RoomManager, executionId: string, strategy: string) {
  logger.info('Executing workflow recovery', { executionId, strategy })
}

async function executeAgentRecovery(socket: RPASocket, roomManager: RoomManager, agentId: string, strategy: string) {
  logger.info('Executing agent recovery', { agentId, strategy })
}

async function storeErrorForAnalysis(error: RPAError) {
  // In production, store errors in database for analysis
  logger.debug('Storing error for analysis', { code: error.code, category: error.category })
}