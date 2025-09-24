/**
 * Journey Conversion API Routes
 * =============================
 *
 * API endpoints for workflow-to-journey conversion system
 */

import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { validateSession } from '@/lib/auth/validate-session'
import { conversionService, templateService } from '@/services/parlant/journey-conversion'
import { z } from 'zod'

const logger = createLogger('JourneyConversionAPI')

// Request schemas
const ConvertWorkflowSchema = z.object({
  workflow_id: z.string().min(1),
  agent_id: z.string().min(1),
  journey_name: z.string().optional(),
  journey_description: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  config: z.object({
    preserve_block_names: z.boolean().optional(),
    generate_descriptions: z.boolean().optional(),
    enable_parameter_substitution: z.boolean().optional(),
    include_error_handling: z.boolean().optional(),
    optimization_level: z.enum(['basic', 'standard', 'advanced']).optional(),
    cache_duration_ms: z.number().optional(),
  }).optional(),
})

const ConvertTemplateSchema = z.object({
  template_id: z.string().min(1),
  agent_id: z.string().min(1),
  parameters: z.record(z.any()),
  journey_name: z.string().optional(),
  journey_description: z.string().optional(),
  config: z.object({
    preserve_block_names: z.boolean().optional(),
    generate_descriptions: z.boolean().optional(),
    enable_parameter_substitution: z.boolean().optional(),
    include_error_handling: z.boolean().optional(),
    optimization_level: z.enum(['basic', 'standard', 'advanced']).optional(),
    cache_duration_ms: z.number().optional(),
  }).optional(),
})

/**
 * POST /api/v1/journey-conversion/convert-workflow
 * Convert workflow directly to journey
 */
export async function POST(request: NextRequest) {
  try {
    const session = await validateSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = ConvertWorkflowSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { workflow_id, agent_id, journey_name, journey_description, parameters, config } = validation.data

    logger.info('Converting workflow to journey', {
      workflowId: workflow_id,
      agentId: agent_id,
      userId: session.userId,
      workspaceId: session.workspaceId,
    })

    const result = await conversionService.convertWorkflowDirectlyToJourney({
      workflow_id,
      agent_id,
      workspace_id: session.workspaceId,
      journey_name,
      journey_description,
      parameters,
      config,
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Workflow converted to journey successfully',
    })

  } catch (error) {
    logger.error('Workflow conversion failed', { error: error.message })

    const status = error.code === 'VALIDATION_FAILED' ? 400 : 500
    return NextResponse.json(
      {
        error: 'Conversion failed',
        message: error.message,
        code: error.code || 'INTERNAL_ERROR',
      },
      { status }
    )
  }
}

/**
 * GET /api/v1/journey-conversion/progress/{conversionId}
 * Get conversion progress
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversionId: string } }
) {
  try {
    const session = await validateSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { conversionId } = params

    const progress = await conversionService.getConversionProgress(conversionId)

    return NextResponse.json({
      success: true,
      data: progress,
    })

  } catch (error) {
    logger.error('Failed to get conversion progress', { error: error.message })

    return NextResponse.json(
      {
        error: 'Failed to get progress',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/journey-conversion/cache
 * Clear conversion cache
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await validateSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('template_id')

    await conversionService.clearCache(session.workspaceId, templateId || undefined)

    return NextResponse.json({
      success: true,
      message: templateId
        ? `Cache cleared for template ${templateId}`
        : 'All cache cleared for workspace',
    })

  } catch (error) {
    logger.error('Failed to clear cache', { error: error.message })

    return NextResponse.json(
      {
        error: 'Failed to clear cache',
        message: error.message,
      },
      { status: 500 }
    )
  }
}