/**
 * Canned Responses API Endpoint
 * =============================
 *
 * RESTful API for managing canned responses including creation, updates,
 * intelligent matching, personalization, and approval workflows.
 * Supports multi-language responses with branding compliance.
 *
 * Endpoints:
 * - GET /api/governance/canned-responses - List and search responses
 * - POST /api/governance/canned-responses - Create new response
 * - PUT /api/governance/canned-responses/:id - Update existing response
 * - DELETE /api/governance/canned-responses/:id - Delete response
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { cannedResponseService } from '@/services/parlant/canned-response-service'
import { logAudit } from '@/services/parlant/compliance-reporting-service'
import type {
  CreateCannedResponseRequest,
  ResponseCategory,
  UpdateCannedResponseRequest,
} from '@/services/parlant/governance-compliance-types'

const logger = createLogger('CannedResponsesAPI')

/**
 * GET /api/governance/canned-responses
 *
 * Retrieve canned responses with optional search and filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    // Extract query parameters
    const url = new URL(request.url)
    const workspaceId = url.searchParams.get('workspace_id')
    const query = url.searchParams.get('query') // For intelligent matching
    const category = url.searchParams.get('category') as ResponseCategory | null
    const language = url.searchParams.get('language')
    const status = url.searchParams.get('status')
    const limit = Number.parseInt(url.searchParams.get('limit') || '20', 10)
    const includePersonalization = url.searchParams.get('include_personalization') === 'true'
    const requireCompliance = url.searchParams.get('require_compliance') === 'true'

    // Validate required parameters
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    // Get authentication context
    const userId = request.headers.get('x-user-id') || 'anonymous'

    let result: any

    if (query) {
      // Intelligent response matching
      const context = {
        user_id: userId,
        workspace_id: workspaceId,
        timestamp: new Date().toISOString(),
      }

      const matches = await cannedResponseService.findMatchingResponses(
        query,
        category || undefined,
        context,
        workspaceId,
        {
          limit,
          language: language || undefined,
          includePersonalization,
          requireCompliance,
        }
      )

      result = {
        matches,
        search_query: query,
        total_matches: matches.length,
      }

      // Log search audit event
      await logAudit('data_access', 'canned_response', 'search', 'read', workspaceId, userId, {
        query,
        matches_found: matches.length,
        category,
        language,
      })
    } else if (category) {
      // Get responses by category
      const responses = await cannedResponseService.getResponsesByCategory(category, workspaceId, {
        language: language || undefined,
        includeInactive: status === 'inactive',
        limit,
      })

      result = {
        responses,
        category,
        total_responses: responses.length,
      }

      // Log category access audit event
      await logAudit('data_access', 'canned_response', 'category', 'read', workspaceId, userId, {
        category,
        responses_count: responses.length,
        language,
      })
    } else {
      return NextResponse.json(
        { error: 'Either query or category parameter is required' },
        { status: 400 }
      )
    }

    const responseTime = performance.now() - startTime

    logger.info('Canned responses retrieved', {
      workspaceId,
      type: query ? 'search' : 'category',
      count: result.matches?.length || result.responses?.length,
      responseTime,
    })

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        responseTime: Math.round(responseTime),
        timestamp: new Date().toISOString(),
        search_type: query ? 'intelligent_matching' : 'category_filter',
      },
    })
  } catch (error) {
    const responseTime = performance.now() - startTime

    logger.error('Failed to retrieve canned responses', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve canned responses',
        details: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Math.round(responseTime),
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/governance/canned-responses
 *
 * Create a new canned response
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    // Parse request body
    const body = (await request.json()) as CreateCannedResponseRequest & { workspace_id: string }

    // Validate required fields
    if (!body.workspace_id) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    if (!body.title || !body.content || !body.category) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['title', 'content', 'category'],
        },
        { status: 400 }
      )
    }

    // Get authentication context
    const userId = request.headers.get('x-user-id') || 'anonymous'
    const auth = {
      user_id: userId,
      workspace_id: body.workspace_id,
      key_type: 'workspace' as const,
    }

    // Create response
    const response = await cannedResponseService.createResponse(body, body.workspace_id, auth)

    // Log audit event
    await logAudit(
      'configuration_change',
      'canned_response',
      response.id,
      'create',
      body.workspace_id,
      userId,
      {
        response_title: response.title,
        category: response.category,
        language: response.language,
        approval_required: response.approval_required,
      }
    )

    const responseTime = performance.now() - startTime

    logger.info('Canned response created', {
      responseId: response.id,
      workspaceId: body.workspace_id,
      title: response.title,
      category: response.category,
      responseTime,
    })

    return NextResponse.json(
      {
        success: true,
        data: response,
        metadata: {
          responseTime: Math.round(responseTime),
          timestamp: new Date().toISOString(),
          needs_approval: response.approval_required,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const responseTime = performance.now() - startTime

    logger.error('Failed to create canned response', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create canned response',
        details: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Math.round(responseTime),
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/governance/canned-responses
 *
 * Update an existing canned response
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    // Parse request body
    const body = (await request.json()) as UpdateCannedResponseRequest & {
      response_id: string
      workspace_id: string
    }

    // Validate required fields
    if (!body.response_id || !body.workspace_id) {
      return NextResponse.json(
        { error: 'response_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Get authentication context
    const userId = request.headers.get('x-user-id') || 'anonymous'
    const auth = {
      user_id: userId,
      workspace_id: body.workspace_id,
      key_type: 'workspace' as const,
    }

    // Update response
    const updatedResponse = await cannedResponseService.updateResponse(body.response_id, body, auth)

    // Log audit event
    await logAudit(
      'configuration_change',
      'canned_response',
      body.response_id,
      'update',
      body.workspace_id,
      userId,
      {
        response_title: updatedResponse.title,
        version: updatedResponse.version,
        changes: Object.keys(body).filter((key) => !['response_id', 'workspace_id'].includes(key)),
      }
    )

    const responseTime = performance.now() - startTime

    logger.info('Canned response updated', {
      responseId: body.response_id,
      workspaceId: body.workspace_id,
      version: updatedResponse.version,
      responseTime,
    })

    return NextResponse.json({
      success: true,
      data: updatedResponse,
      metadata: {
        responseTime: Math.round(responseTime),
        timestamp: new Date().toISOString(),
        version_updated: true,
      },
    })
  } catch (error) {
    const responseTime = performance.now() - startTime

    logger.error('Failed to update canned response', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update canned response',
        details: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Math.round(responseTime),
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/governance/canned-responses
 *
 * Delete a canned response (soft delete - mark as archived)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    // Extract query parameters
    const url = new URL(request.url)
    const responseId = url.searchParams.get('response_id')
    const workspaceId = url.searchParams.get('workspace_id')

    // Validate required parameters
    if (!responseId || !workspaceId) {
      return NextResponse.json(
        { error: 'response_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Get authentication context
    const userId = request.headers.get('x-user-id') || 'anonymous'
    const auth = {
      user_id: userId,
      workspace_id: workspaceId,
      key_type: 'workspace' as const,
    }

    // Soft delete by updating status to archived
    const updatedResponse = await cannedResponseService.updateResponse(
      responseId,
      { status: 'archived' },
      auth
    )

    // Log audit event
    await logAudit(
      'configuration_change',
      'canned_response',
      responseId,
      'delete',
      workspaceId,
      userId,
      {
        response_title: updatedResponse.title,
        deletion_type: 'soft_delete',
        archived_at: new Date().toISOString(),
      }
    )

    const responseTime = performance.now() - startTime

    logger.info('Canned response archived', {
      responseId,
      workspaceId,
      title: updatedResponse.title,
      responseTime,
    })

    return NextResponse.json({
      success: true,
      message: 'Canned response archived successfully',
      data: {
        response_id: responseId,
        status: updatedResponse.status,
        archived_at: updatedResponse.updated_at,
      },
      metadata: {
        responseTime: Math.round(responseTime),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const responseTime = performance.now() - startTime

    logger.error('Failed to archive canned response', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to archive canned response',
        details: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Math.round(responseTime),
      },
      { status: 500 }
    )
  }
}
