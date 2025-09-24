/**
 * Conversational Workflows API Routes
 * ==================================
 *
 * Main API endpoints for creating and managing conversational workflow sessions.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { getConversationalWorkflowService } from '@/services/parlant/conversational-workflows/core'
import { ConversationalWorkflowError } from '@/services/parlant/conversational-workflows/errors'
import type {
  CreateConversationalWorkflowRequest,
  CreateConversationalWorkflowResponse,
} from '@/services/parlant/conversational-workflows/types'

const logger = createLogger('ConversationalWorkflowsAPI')

/**
 * Create a new conversational workflow session
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  logger.info('POST /api/conversational-workflows - Creating new session')

  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse request body
    const body: CreateConversationalWorkflowRequest = await request.json()

    // Validate required fields
    const { workflowId, workspaceId } = body
    if (!workflowId || !workspaceId) {
      return NextResponse.json(
        { error: 'workflowId and workspaceId are required' },
        { status: 400 }
      )
    }

    // Validate user has access to workspace
    // This would integrate with actual workspace authorization
    const userWorkspaceId = workspaceId // In real implementation, validate user access

    // Set defaults and add user context
    const createRequest: CreateConversationalWorkflowRequest = {
      ...body,
      workspaceId: userWorkspaceId,
      userId: session.user.id,
      conversationalConfig: {
        personalityProfile: 'helpful-assistant',
        communicationStyle: 'friendly',
        verbosityLevel: 'normal',
        showProgress: true,
        explainSteps: true,
        askForConfirmation: false,
        provideSuggestions: true,
        gracefulDegradation: true,
        fallbackToVisual: true,
        ...body.conversationalConfig,
      },
      executionConfig: {
        mode: 'step-by-step',
        pausePoints: [],
        autoApproval: false,
        timeoutMs: 30000,
        retryPolicy: {
          maxAttempts: 3,
          backoffStrategy: 'exponential',
          backoffMs: 1000,
          retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'TEMPORARY_FAILURE'],
        },
        ...body.executionConfig,
      },
    }

    // Create conversational workflow session
    const workflowService = getConversationalWorkflowService()
    const result: CreateConversationalWorkflowResponse =
      await workflowService.createConversationalWorkflow(createRequest)

    logger.info('Conversational workflow session created successfully', {
      sessionId: result.sessionId,
      journeyId: result.journeyId,
      workflowId,
      userId: session.user.id,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    logger.error('Failed to create conversational workflow session', {
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

    // Generic error response
    return NextResponse.json(
      { error: 'Failed to create conversational workflow session' },
      { status: 500 }
    )
  }
}

/**
 * Get all conversational workflow sessions for user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  logger.info('GET /api/conversational-workflows - Listing user sessions')

  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const status = searchParams.get('status') // active, completed, failed, etc.
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10)
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10)

    // Validate workspace access if specified
    if (workspaceId) {
      // This would integrate with actual workspace authorization
      // For now, assuming user has access
    }

    // Get conversational workflow service
    const workflowService = getConversationalWorkflowService()
    const stateManager = workflowService.getStateManager()

    // Get session statistics
    const stats = stateManager.getSessionStatistics()

    // This would be replaced with actual database query
    // For now, returning mock data structure
    const sessions = []

    const response = {
      sessions,
      pagination: {
        limit,
        offset,
        total: stats.activeSessions,
        hasMore: false,
      },
      statistics: {
        totalSessions: stats.activeSessions,
        activeSessions: stats.activeSessions,
        completedSessions: 0,
        failedSessions: 0,
      },
    }

    logger.info('Sessions retrieved successfully', {
      userId: session.user.id,
      workspaceId,
      sessionsCount: sessions.length,
    })

    return NextResponse.json(response)
  } catch (error: any) {
    logger.error('Failed to get conversational workflow sessions', {
      error: error.message,
    })

    return NextResponse.json({ error: 'Failed to retrieve sessions' }, { status: 500 })
  }
}
