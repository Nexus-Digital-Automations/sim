/**
 * Workflow to Journey Mapping API Routes
 * ======================================
 *
 * API endpoints for managing workflow-to-journey mappings.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { WorkflowJourneyMapper } from '@/services/parlant/conversational-workflows/mapper'
import type {
  WorkflowToJourneyMapping,
  ConversationalConfig,
  WorkflowExecutionConfig,
} from '@/services/parlant/conversational-workflows/types'
import { WorkflowMappingError } from '@/services/parlant/conversational-workflows/errors'
import { auth } from '@/lib/auth'

const logger = createLogger('WorkflowMappingAPI')

/**
 * Create a new workflow-to-journey mapping
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  logger.info('POST /api/conversational-workflows/mappings - Creating workflow mapping')

  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      workflowId,
      workspaceId,
      conversationalConfig,
      executionConfig,
      forceParsing = false,
    } = body

    // Validate required fields
    if (!workflowId || !workspaceId) {
      return NextResponse.json(
        { error: 'workflowId and workspaceId are required' },
        { status: 400 }
      )
    }

    // Validate user has access to workspace
    // This would integrate with actual workspace authorization
    const userWorkspaceId = workspaceId

    // Create mapper instance
    const mapper = new WorkflowJourneyMapper()

    // Create mapping
    const mapping: WorkflowToJourneyMapping = await mapper.createWorkflowToJourneyMapping(
      workflowId,
      userWorkspaceId,
      session.user.id,
      {
        conversationalConfig,
        executionConfig,
        forceParsing,
      }
    )

    logger.info('Workflow-to-journey mapping created successfully', {
      workflowId,
      journeyId: mapping.journeyId,
      mappingVersion: mapping.mappingVersion,
      nodeCount: mapping.nodeStateMappings.length,
      edgeCount: mapping.edgeTransitionMappings.length,
    })

    return NextResponse.json(mapping, { status: 201 })
  } catch (error: any) {
    logger.error('Failed to create workflow-to-journey mapping', {
      error: error.message,
      stack: error.stack,
    })

    // Handle specific error types
    if (error instanceof WorkflowMappingError) {
      return NextResponse.json(
        {
          error: error.message,
          errorCode: error.errorCode,
          retryable: error.retryable,
          context: error.context,
        },
        { status: error.retryable ? 503 : 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create workflow-to-journey mapping' },
      { status: 500 }
    )
  }
}

/**
 * Get workflow mappings for user/workspace
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  logger.info('GET /api/conversational-workflows/mappings - Listing mappings')

  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const workflowId = searchParams.get('workflowId')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Validate workspace access if specified
    if (workspaceId) {
      // This would integrate with actual workspace authorization
    }

    // This would query actual database for mappings
    // For now, returning mock structure
    const mappings: WorkflowToJourneyMapping[] = []

    const response = {
      mappings,
      pagination: {
        limit,
        offset,
        total: mappings.length,
        hasMore: false,
      },
      filters: {
        workspaceId,
        workflowId,
      },
    }

    logger.info('Mappings retrieved successfully', {
      userId: session.user.id,
      workspaceId,
      workflowId,
      mappingsCount: mappings.length,
    })

    return NextResponse.json(response)
  } catch (error: any) {
    logger.error('Failed to get workflow mappings', {
      error: error.message,
    })

    return NextResponse.json(
      { error: 'Failed to retrieve mappings' },
      { status: 500 }
    )
  }
}