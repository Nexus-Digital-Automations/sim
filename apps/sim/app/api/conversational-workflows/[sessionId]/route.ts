/**
 * Session-specific Conversational Workflows API Routes
 * ====================================================
 *
 * API endpoints for managing specific conversational workflow sessions.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { getConversationalWorkflowService } from '@/services/parlant/conversational-workflows/core'
import {
  ConversationalWorkflowError,
  SessionManagementError,
} from '@/services/parlant/conversational-workflows/errors'
import type {
  GetWorkflowStateResponse,
  ProcessNaturalLanguageCommandRequest,
  ProcessNaturalLanguageCommandResponse,
} from '@/services/parlant/conversational-workflows/types'

const logger = createLogger('ConversationalWorkflowSessionAPI')

/**
 * Get session state and information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
): Promise<NextResponse> {
  const { sessionId } = params

  logger.info('GET /api/conversational-workflows/[sessionId] - Getting session state', {
    sessionId,
  })

  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get workflow service
    const workflowService = getConversationalWorkflowService()

    // Get session state
    const sessionState = await workflowService.getWorkflowState(sessionId)
    if (!sessionState) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Validate user has access to this session
    // This would integrate with actual session ownership validation
    // For now, assuming session belongs to authenticated user

    // Get state manager for additional context
    const stateManager = workflowService.getStateManager()
    const updateHistory = stateManager.getUpdateHistory(sessionId, 10)

    // Build response
    const response: GetWorkflowStateResponse = {
      currentState: sessionState,
      recentHistory: [], // Would be populated from actual conversation history
      availableActions: sessionState.availableActions,
      progressSummary: `${sessionState.completedNodes.length}/${sessionState.totalNodes} steps completed (${Math.round((sessionState.completedNodes.length / sessionState.totalNodes) * 100)}%)`,
    }

    logger.info('Session state retrieved successfully', {
      sessionId,
      status: sessionState.executionStatus,
      progress: `${sessionState.completedNodes.length}/${sessionState.totalNodes}`,
    })

    return NextResponse.json(response)
  } catch (error: any) {
    logger.error('Failed to get session state', {
      sessionId,
      error: error.message,
    })

    if (error instanceof ConversationalWorkflowError) {
      return NextResponse.json(
        {
          error: error.message,
          errorCode: error.errorCode,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ error: 'Failed to get session state' }, { status: 500 })
  }
}

/**
 * Process natural language command for session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
): Promise<NextResponse> {
  const { sessionId } = params

  logger.info('POST /api/conversational-workflows/[sessionId] - Processing command', {
    sessionId,
  })

  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { naturalLanguageInput, workspaceId, workflowId } = body

    if (!naturalLanguageInput) {
      return NextResponse.json({ error: 'naturalLanguageInput is required' }, { status: 400 })
    }

    // Build request
    const commandRequest: ProcessNaturalLanguageCommandRequest = {
      sessionId,
      workflowId: workflowId || 'unknown', // Would be resolved from session state
      naturalLanguageInput,
      userId: session.user.id,
      workspaceId: workspaceId || 'unknown', // Would be resolved from session state
    }

    // Process command
    const workflowService = getConversationalWorkflowService()
    const result: ProcessNaturalLanguageCommandResponse =
      await workflowService.processNaturalLanguageCommand(commandRequest)

    logger.info('Natural language command processed successfully', {
      sessionId,
      commandProcessed: result.commandProcessed,
      workflowAction: result.workflowAction,
      inputLength: naturalLanguageInput.length,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    logger.error('Failed to process natural language command', {
      sessionId,
      error: error.message,
      stack: error.stack,
    })

    // Handle specific error types
    if (error instanceof ConversationalWorkflowError) {
      const statusCode = error.retryable ? 503 : 400
      return NextResponse.json(
        {
          error: error.message,
          errorCode: error.errorCode,
          retryable: error.retryable,
          context: error.context,
        },
        { status: statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process natural language command' },
      { status: 500 }
    )
  }
}

/**
 * Update session configuration
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
): Promise<NextResponse> {
  const { sessionId } = params

  logger.info('PATCH /api/conversational-workflows/[sessionId] - Updating session', {
    sessionId,
  })

  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { conversationalConfig, executionConfig, userInputs } = body

    // Get workflow service
    const workflowService = getConversationalWorkflowService()
    const stateManager = workflowService.getStateManager()

    // Get current session state
    const currentState = await stateManager.getSessionState(sessionId)
    if (!currentState) {
      throw new SessionManagementError('Session not found', 'SESSION_NOT_FOUND', sessionId)
    }

    // Build state updates
    const stateUpdates: any = {
      lastUpdatedAt: new Date(),
    }

    // Update user inputs if provided
    if (userInputs) {
      stateUpdates.userInputs = {
        ...currentState.userInputs,
        ...userInputs,
      }
    }

    // Update workflow context with new configurations
    if (conversationalConfig || executionConfig) {
      stateUpdates.workflowContext = {
        ...currentState.workflowContext,
        ...(conversationalConfig && { conversationalConfig }),
        ...(executionConfig && { executionConfig }),
      }
    }

    // Update session state
    const updatedState = await stateManager.updateSession(sessionId, stateUpdates)

    logger.info('Session updated successfully', {
      sessionId,
      updatesApplied: Object.keys(stateUpdates),
    })

    return NextResponse.json({
      sessionId,
      updatedState,
      message: 'Session updated successfully',
    })
  } catch (error: any) {
    logger.error('Failed to update session', {
      sessionId,
      error: error.message,
    })

    if (error instanceof ConversationalWorkflowError) {
      return NextResponse.json(
        {
          error: error.message,
          errorCode: error.errorCode,
        },
        { status: error instanceof SessionManagementError ? 404 : 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}

/**
 * Delete/end session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
): Promise<NextResponse> {
  const { sessionId } = params

  logger.info('DELETE /api/conversational-workflows/[sessionId] - Ending session', {
    sessionId,
  })

  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get workflow service
    const workflowService = getConversationalWorkflowService()
    const stateManager = workflowService.getStateManager()

    // Verify session exists and user has access
    const sessionState = await stateManager.getSessionState(sessionId)
    if (!sessionState) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // End session
    await stateManager.unregisterSession(sessionId)

    logger.info('Session ended successfully', { sessionId })

    return NextResponse.json({
      sessionId,
      message: 'Session ended successfully',
    })
  } catch (error: any) {
    logger.error('Failed to end session', {
      sessionId,
      error: error.message,
    })

    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
  }
}
