/**
 * Conversational Workflow API Endpoints
 * ===================================
 *
 * REST API endpoints for creating and managing conversational workflow sessions
 */

import { createLogger } from '@/lib/logs/console/logger'
import { getConversationalWorkflowService } from './core'
import {
  CommandProcessingError,
  ConversationalWorkflowError,
  SessionManagementError,
} from './errors'
import type {
  ConversationalWorkflowState,
  CreateConversationalWorkflowRequest,
  CreateConversationalWorkflowResponse,
  GetWorkflowStateRequest,
  GetWorkflowStateResponse,
  ProcessNaturalLanguageCommandRequest,
  ProcessNaturalLanguageCommandResponse,
} from './types'

const logger = createLogger('ConversationalWorkflowAPI')

/**
 * API handler for creating conversational workflow sessions
 */
export async function createConversationalWorkflowHandler(
  request: CreateConversationalWorkflowRequest,
  context: {
    userId: string
    workspaceId: string
    requestId?: string
  }
): Promise<CreateConversationalWorkflowResponse> {
  const startTime = Date.now()
  const { userId, workspaceId, requestId } = context

  logger.info('Creating conversational workflow', {
    workflowId: request.workflowId,
    userId,
    workspaceId,
    requestId,
  })

  try {
    // Validate request
    validateCreateWorkflowRequest(request)

    // Get service instance
    const service = getConversationalWorkflowService()

    // Create conversational workflow session
    const response = await service.createConversationalWorkflow({
      ...request,
      workspaceId,
      userId,
    })

    const executionTime = Date.now() - startTime

    logger.info('Conversational workflow created successfully', {
      sessionId: response.sessionId,
      journeyId: response.journeyId,
      workflowId: request.workflowId,
      executionTime,
      requestId,
    })

    return response
  } catch (error: any) {
    const executionTime = Date.now() - startTime

    logger.error('Failed to create conversational workflow', {
      workflowId: request.workflowId,
      error: error.message,
      errorType: error.constructor.name,
      executionTime,
      requestId,
    })

    if (error instanceof ConversationalWorkflowError) {
      throw error
    }

    throw new ConversationalWorkflowError(
      'Failed to create conversational workflow session',
      'CREATION_FAILED',
      {
        workflowId: request.workflowId,
        userId,
        workspaceId,
        originalError: error.message,
      },
      true
    )
  }
}

/**
 * API handler for processing natural language commands
 */
export async function processNaturalLanguageCommandHandler(
  request: ProcessNaturalLanguageCommandRequest,
  context: {
    userId: string
    workspaceId: string
    requestId?: string
  }
): Promise<ProcessNaturalLanguageCommandResponse> {
  const startTime = Date.now()
  const { userId, workspaceId, requestId } = context

  logger.info('Processing natural language command', {
    sessionId: request.sessionId,
    workflowId: request.workflowId,
    inputLength: request.naturalLanguageInput?.length || 0,
    userId,
    requestId,
  })

  try {
    // Validate request
    validateNLPCommandRequest(request, context)

    // Get service instance
    const service = getConversationalWorkflowService()

    // Process the natural language command
    const response = await service.processNaturalLanguageCommand({
      ...request,
      userId,
      workspaceId,
    })

    const executionTime = Date.now() - startTime

    logger.info('Natural language command processed successfully', {
      sessionId: request.sessionId,
      commandProcessed: response.commandProcessed,
      workflowAction: response.workflowAction,
      executionTime,
      requestId,
    })

    return response
  } catch (error: any) {
    const executionTime = Date.now() - startTime

    logger.error('Failed to process natural language command', {
      sessionId: request.sessionId,
      error: error.message,
      errorType: error.constructor.name,
      executionTime,
      requestId,
    })

    if (error instanceof CommandProcessingError) {
      throw error
    }

    throw new CommandProcessingError(
      'Failed to process natural language command',
      'COMMAND_PROCESSING_FAILED',
      {
        sessionId: request.sessionId,
        naturalLanguageInput: request.naturalLanguageInput?.substring(0, 100),
        originalError: error.message,
      },
      true,
      'I had trouble understanding your request. Could you try rephrasing it?'
    )
  }
}

/**
 * API handler for getting workflow state
 */
export async function getWorkflowStateHandler(
  request: GetWorkflowStateRequest,
  context: {
    userId: string
    workspaceId: string
    requestId?: string
  }
): Promise<GetWorkflowStateResponse> {
  const startTime = Date.now()
  const { userId, workspaceId, requestId } = context

  logger.info('Getting workflow state', {
    sessionId: request.sessionId,
    workflowId: request.workflowId,
    userId,
    requestId,
  })

  try {
    // Validate request
    validateGetStateRequest(request, context)

    // Get service instance
    const service = getConversationalWorkflowService()

    // Get current workflow state
    const currentState = await service.getWorkflowState(request.sessionId)

    if (!currentState) {
      throw new SessionManagementError(
        'Workflow session not found',
        'SESSION_NOT_FOUND',
        request.sessionId,
        { workflowId: request.workflowId },
        false
      )
    }

    // Generate progress summary
    const progressSummary = generateProgressSummary(currentState)

    // Get recent conversation history (this would integrate with conversation storage)
    const recentHistory = await getRecentConversationHistory(request.sessionId, 10)

    // Extract available actions from current state
    const availableActions = currentState.availableActions

    const response: GetWorkflowStateResponse = {
      currentState,
      recentHistory,
      availableActions,
      progressSummary,
    }

    const executionTime = Date.now() - startTime

    logger.info('Workflow state retrieved successfully', {
      sessionId: request.sessionId,
      executionStatus: currentState.executionStatus,
      progressPercentage: Math.round(
        (currentState.completedNodes.length / currentState.totalNodes) * 100
      ),
      executionTime,
      requestId,
    })

    return response
  } catch (error: any) {
    const executionTime = Date.now() - startTime

    logger.error('Failed to get workflow state', {
      sessionId: request.sessionId,
      error: error.message,
      errorType: error.constructor.name,
      executionTime,
      requestId,
    })

    if (error instanceof SessionManagementError) {
      throw error
    }

    throw new SessionManagementError(
      'Failed to retrieve workflow state',
      'STATE_RETRIEVAL_FAILED',
      request.sessionId,
      {
        workflowId: request.workflowId,
        originalError: error.message,
      },
      true
    )
  }
}

/**
 * API handler for terminating a conversational workflow session
 */
export async function terminateWorkflowSessionHandler(
  sessionId: string,
  context: {
    userId: string
    workspaceId: string
    requestId?: string
  }
): Promise<{ success: boolean; message: string; sessionId: string }> {
  const startTime = Date.now()
  const { userId, workspaceId, requestId } = context

  logger.info('Terminating workflow session', {
    sessionId,
    userId,
    workspaceId,
    requestId,
  })

  try {
    // Get service instance
    const service = getConversationalWorkflowService()

    // Get current state before termination
    const currentState = await service.getWorkflowState(sessionId)

    if (!currentState) {
      throw new SessionManagementError(
        'Session not found',
        'SESSION_NOT_FOUND',
        sessionId,
        {},
        false
      )
    }

    // Perform graceful termination
    await service.processNaturalLanguageCommand({
      sessionId,
      workflowId: currentState.workflowId,
      naturalLanguageInput: 'cancel workflow',
      userId,
      workspaceId,
    })

    const executionTime = Date.now() - startTime

    logger.info('Workflow session terminated successfully', {
      sessionId,
      previousStatus: currentState.executionStatus,
      executionTime,
      requestId,
    })

    return {
      success: true,
      message: 'Workflow session terminated successfully',
      sessionId,
    }
  } catch (error: any) {
    const executionTime = Date.now() - startTime

    logger.error('Failed to terminate workflow session', {
      sessionId,
      error: error.message,
      errorType: error.constructor.name,
      executionTime,
      requestId,
    })

    // Return success even if there are issues - session termination should be forgiving
    return {
      success: true,
      message: 'Session termination completed with warnings',
      sessionId,
    }
  }
}

/**
 * API handler for getting session metrics and analytics
 */
export async function getSessionMetricsHandler(
  sessionId: string,
  context: {
    userId: string
    workspaceId: string
    requestId?: string
  }
): Promise<{
  sessionId: string
  workflowId: string
  metrics: {
    totalDurationMs: number
    commandsProcessed: number
    stepsCompleted: number
    stepsTotal: number
    progressPercentage: number
    errorCount: number
    averageResponseTimeMs: number
  }
  performance: {
    nlpProcessingTimeMs: number
    workflowExecutionTimeMs: number
    stateUpdateTimeMs: number
  }
}> {
  const { userId, workspaceId, requestId } = context

  logger.info('Getting session metrics', { sessionId, userId, requestId })

  try {
    const service = getConversationalWorkflowService()
    const currentState = await service.getWorkflowState(sessionId)

    if (!currentState) {
      throw new SessionManagementError(
        'Session not found for metrics',
        'SESSION_NOT_FOUND',
        sessionId,
        {},
        false
      )
    }

    const totalDurationMs = Date.now() - currentState.startedAt.getTime()
    const progressPercentage = Math.round(
      (currentState.completedNodes.length / currentState.totalNodes) * 100
    )

    const metrics = {
      sessionId,
      workflowId: currentState.workflowId,
      metrics: {
        totalDurationMs,
        commandsProcessed: 0, // Would be tracked in implementation
        stepsCompleted: currentState.completedNodes.length,
        stepsTotal: currentState.totalNodes,
        progressPercentage,
        errorCount: currentState.errorCount,
        averageResponseTimeMs: 0, // Would be calculated from stored metrics
      },
      performance: {
        nlpProcessingTimeMs: 0, // Would be tracked in implementation
        workflowExecutionTimeMs: 0, // Would be tracked in implementation
        stateUpdateTimeMs: 0, // Would be tracked in implementation
      },
    }

    logger.info('Session metrics retrieved successfully', {
      sessionId,
      progressPercentage,
      totalDurationMs,
      requestId,
    })

    return metrics
  } catch (error: any) {
    logger.error('Failed to get session metrics', {
      sessionId,
      error: error.message,
      requestId,
    })
    throw error
  }
}

// Validation functions

/**
 * Validate create workflow request
 */
function validateCreateWorkflowRequest(request: CreateConversationalWorkflowRequest): void {
  if (!request.workflowId || typeof request.workflowId !== 'string') {
    throw new ConversationalWorkflowError(
      'Missing or invalid workflowId',
      'INVALID_REQUEST',
      { workflowId: request.workflowId },
      false
    )
  }

  if (request.workflowId.trim().length === 0) {
    throw new ConversationalWorkflowError(
      'workflowId cannot be empty',
      'INVALID_REQUEST',
      { workflowId: request.workflowId },
      false
    )
  }

  // Validate optional configuration objects
  if (request.conversationalConfig && typeof request.conversationalConfig !== 'object') {
    throw new ConversationalWorkflowError(
      'Invalid conversationalConfig format',
      'INVALID_REQUEST',
      { conversationalConfig: request.conversationalConfig },
      false
    )
  }

  if (request.executionConfig && typeof request.executionConfig !== 'object') {
    throw new ConversationalWorkflowError(
      'Invalid executionConfig format',
      'INVALID_REQUEST',
      { executionConfig: request.executionConfig },
      false
    )
  }
}

/**
 * Validate NLP command request
 */
function validateNLPCommandRequest(
  request: ProcessNaturalLanguageCommandRequest,
  context: { userId: string; workspaceId: string }
): void {
  if (!request.sessionId || typeof request.sessionId !== 'string') {
    throw new CommandProcessingError(
      'Missing or invalid sessionId',
      'INVALID_REQUEST',
      { sessionId: request.sessionId },
      false
    )
  }

  if (!request.workflowId || typeof request.workflowId !== 'string') {
    throw new CommandProcessingError(
      'Missing or invalid workflowId',
      'INVALID_REQUEST',
      { workflowId: request.workflowId },
      false
    )
  }

  if (!request.naturalLanguageInput || typeof request.naturalLanguageInput !== 'string') {
    throw new CommandProcessingError(
      'Missing or invalid naturalLanguageInput',
      'INVALID_REQUEST',
      { naturalLanguageInput: request.naturalLanguageInput },
      false,
      'Please provide a valid command or question.'
    )
  }

  if (request.naturalLanguageInput.trim().length === 0) {
    throw new CommandProcessingError(
      'naturalLanguageInput cannot be empty',
      'INVALID_REQUEST',
      {},
      false,
      'Please provide a command or question.'
    )
  }

  if (request.naturalLanguageInput.length > 1000) {
    throw new CommandProcessingError(
      'naturalLanguageInput too long',
      'INVALID_REQUEST',
      { inputLength: request.naturalLanguageInput.length },
      false,
      'Your input is too long. Please keep it under 1000 characters.'
    )
  }

  // Validate context matches request
  if (request.userId !== context.userId) {
    throw new CommandProcessingError(
      'userId mismatch',
      'UNAUTHORIZED',
      { requestUserId: request.userId, contextUserId: context.userId },
      false
    )
  }

  if (request.workspaceId !== context.workspaceId) {
    throw new CommandProcessingError(
      'workspaceId mismatch',
      'UNAUTHORIZED',
      { requestWorkspaceId: request.workspaceId, contextWorkspaceId: context.workspaceId },
      false
    )
  }
}

/**
 * Validate get state request
 */
function validateGetStateRequest(
  request: GetWorkflowStateRequest,
  context: { userId: string; workspaceId: string }
): void {
  if (!request.sessionId || typeof request.sessionId !== 'string') {
    throw new SessionManagementError(
      'Missing or invalid sessionId',
      'INVALID_REQUEST',
      request.sessionId || 'unknown',
      {},
      false
    )
  }

  if (!request.workflowId || typeof request.workflowId !== 'string') {
    throw new SessionManagementError(
      'Missing or invalid workflowId',
      'INVALID_REQUEST',
      request.sessionId,
      { workflowId: request.workflowId },
      false
    )
  }

  // Validate context matches request
  if (request.userId !== context.userId) {
    throw new SessionManagementError(
      'userId mismatch',
      'UNAUTHORIZED',
      request.sessionId,
      { requestUserId: request.userId, contextUserId: context.userId },
      false
    )
  }

  if (request.workspaceId !== context.workspaceId) {
    throw new SessionManagementError(
      'workspaceId mismatch',
      'UNAUTHORIZED',
      request.sessionId,
      { requestWorkspaceId: request.workspaceId, contextWorkspaceId: context.workspaceId },
      false
    )
  }
}

// Helper functions

/**
 * Generate progress summary for workflow state
 */
function generateProgressSummary(state: ConversationalWorkflowState): string {
  const progressPercentage = Math.round((state.completedNodes.length / state.totalNodes) * 100)
  const duration = Date.now() - state.startedAt.getTime()
  const durationMinutes = Math.round(duration / 60000)

  let summary = `Workflow is ${state.executionStatus} (${progressPercentage}% complete). `

  if (state.completedNodes.length > 0) {
    summary += `Completed ${state.completedNodes.length} of ${state.totalNodes} steps. `
  }

  if (state.errorCount > 0) {
    summary += `${state.errorCount} error${state.errorCount === 1 ? '' : 's'} encountered. `
  }

  if (state.awaitingUserInput) {
    summary += 'Waiting for your input to continue. '
  }

  summary += `Running for ${durationMinutes} minute${durationMinutes === 1 ? '' : 's'}.`

  return summary
}

/**
 * Get recent conversation history
 */
async function getRecentConversationHistory(sessionId: string, limit = 10): Promise<any[]> {
  // This would integrate with the conversation storage system
  // For now, returning empty array
  return []
}

/**
 * Error response formatter
 */
export function formatErrorResponse(error: any): {
  success: false
  error: {
    code: string
    message: string
    userMessage?: string
    retryable: boolean
    context?: Record<string, any>
  }
} {
  if (error instanceof ConversationalWorkflowError) {
    return {
      success: false,
      error: {
        code: error.errorCode,
        message: error.message,
        userMessage:
          error instanceof CommandProcessingError ? error.userFriendlyMessage : undefined,
        retryable: error.retryable,
        context: error.context,
      },
    }
  }

  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      retryable: false,
    },
  }
}
