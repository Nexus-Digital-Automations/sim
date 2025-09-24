/**
 * Journey Template API Routes
 * ===========================
 *
 * API endpoints for managing workflow templates for journey conversion
 */

import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { validateSession } from '@/lib/auth/validate-session'
import { templateService, conversionService } from '@/services/parlant/journey-conversion'
import { z } from 'zod'

const logger = createLogger('JourneyTemplateAPI')

// Request schemas
const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  workflow_id: z.string().min(1),
  parameters: z.array(z.object({
    name: z.string().min(1),
    type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'json']),
    description: z.string().min(1),
    default_value: z.any().optional(),
    required: z.boolean().default(false),
    validation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      allowed_values: z.array(z.any()).optional(),
      custom_validator: z.string().optional(),
    }).optional(),
    display_order: z.number().optional(),
  })).default([]),
  tags: z.array(z.string()).optional(),
})

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  parameters: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'json']),
    description: z.string().min(1),
    default_value: z.any().optional(),
    required: z.boolean().default(false),
    validation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      allowed_values: z.array(z.any()).optional(),
      custom_validator: z.string().optional(),
    }).optional(),
    display_order: z.number().optional(),
  })).optional(),
  tags: z.array(z.string()).optional(),
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
 * POST /api/v1/journey-templates
 * Create a new workflow template
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
    const validation = CreateTemplateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const templateData = validation.data

    logger.info('Creating workflow template', {
      name: templateData.name,
      workflowId: templateData.workflow_id,
      parametersCount: templateData.parameters.length,
      userId: session.userId,
      workspaceId: session.workspaceId,
    })

    const template = await templateService.createTemplate({
      ...templateData,
      workspace_id: session.workspaceId,
    })

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template created successfully',
    }, { status: 201 })

  } catch (error) {
    logger.error('Template creation failed', { error: error.message })

    const status = error.code === 'VALIDATION_FAILED' ? 400 : 500
    return NextResponse.json(
      {
        error: 'Template creation failed',
        message: error.message,
        code: error.code || 'INTERNAL_ERROR',
      },
      { status }
    )
  }
}

/**
 * GET /api/v1/journey-templates
 * List workflow templates with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await validateSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const tags = searchParams.getAll('tags')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sort_by') as 'name' | 'created_at' | 'updated_at' | 'usage_count' || 'created_at'
    const sortOrder = searchParams.get('sort_order') as 'asc' | 'desc' || 'desc'

    const result = await templateService.listTemplates({
      workspace_id: session.workspaceId,
      search: search || undefined,
      tags: tags.length > 0 ? tags : undefined,
      limit,
      offset,
      sort_by: sortBy,
      sort_order: sortOrder,
    })

    return NextResponse.json({
      success: true,
      data: result.templates,
      pagination: result.pagination,
      total: result.total,
    })

  } catch (error) {
    logger.error('Failed to list templates', { error: error.message })

    return NextResponse.json(
      {
        error: 'Failed to list templates',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/journey-templates/{templateId}
 * Get a specific template
 */
export async function GET_TEMPLATE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const session = await validateSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { templateId } = params

    const template = await templateService.getTemplate(templateId, session.workspaceId)

    return NextResponse.json({
      success: true,
      data: template,
    })

  } catch (error) {
    logger.error('Failed to get template', { error: error.message })

    const status = error.code === 'TEMPLATE_NOT_FOUND' ? 404 : 500
    return NextResponse.json(
      {
        error: 'Failed to get template',
        message: error.message,
        code: error.code || 'INTERNAL_ERROR',
      },
      { status }
    )
  }
}

/**
 * PUT /api/v1/journey-templates/{templateId}
 * Update a template
 */
export async function PUT_TEMPLATE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const session = await validateSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { templateId } = params
    const body = await request.json()
    const validation = UpdateTemplateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const updateData = validation.data

    logger.info('Updating template', {
      templateId,
      userId: session.userId,
      workspaceId: session.workspaceId,
    })

    const template = await templateService.updateTemplate(templateId, updateData)

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template updated successfully',
    })

  } catch (error) {
    logger.error('Template update failed', { error: error.message })

    const status = error.code === 'TEMPLATE_NOT_FOUND' ? 404 : 500
    return NextResponse.json(
      {
        error: 'Template update failed',
        message: error.message,
        code: error.code || 'INTERNAL_ERROR',
      },
      { status }
    )
  }
}

/**
 * DELETE /api/v1/journey-templates/{templateId}
 * Delete a template
 */
export async function DELETE_TEMPLATE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const session = await validateSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { templateId } = params

    logger.info('Deleting template', {
      templateId,
      userId: session.userId,
      workspaceId: session.workspaceId,
    })

    await templateService.deleteTemplate(templateId, session.workspaceId)

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    })

  } catch (error) {
    logger.error('Template deletion failed', { error: error.message })

    const status = error.code === 'TEMPLATE_NOT_FOUND' ? 404 : 500
    return NextResponse.json(
      {
        error: 'Template deletion failed',
        message: error.message,
        code: error.code || 'INTERNAL_ERROR',
      },
      { status }
    )
  }
}

/**
 * POST /api/v1/journey-templates/{templateId}/convert
 * Convert template to journey
 */
export async function POST_CONVERT(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const session = await validateSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { templateId } = params
    const body = await request.json()
    const validation = ConvertTemplateSchema.safeParse({
      ...body,
      template_id: templateId,
    })

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { template_id, agent_id, parameters, journey_name, journey_description, config } = validation.data

    logger.info('Converting template to journey', {
      templateId: template_id,
      agentId: agent_id,
      parametersCount: Object.keys(parameters).length,
      userId: session.userId,
      workspaceId: session.workspaceId,
    })

    const result = await conversionService.convertTemplateToJourney({
      template_id,
      agent_id,
      workspace_id: session.workspaceId,
      parameters,
      journey_name,
      journey_description,
      config,
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Template converted to journey successfully',
    })

  } catch (error) {
    logger.error('Template conversion failed', { error: error.message })

    const status = error.code === 'TEMPLATE_NOT_FOUND' ? 404 :
                   error.code === 'PARAMETER_VALIDATION_FAILED' ? 400 : 500

    return NextResponse.json(
      {
        error: 'Template conversion failed',
        message: error.message,
        code: error.code || 'INTERNAL_ERROR',
      },
      { status }
    )
  }
}

/**
 * POST /api/v1/journey-templates/{templateId}/validate
 * Validate template parameters
 */
export async function POST_VALIDATE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const session = await validateSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { templateId } = params
    const body = await request.json()
    const { parameters } = body

    if (!parameters || typeof parameters !== 'object') {
      return NextResponse.json(
        { error: 'Parameters object required' },
        { status: 400 }
      )
    }

    const validation = await templateService.validateParameters(templateId, parameters)

    return NextResponse.json({
      success: true,
      data: validation,
    })

  } catch (error) {
    logger.error('Parameter validation failed', { error: error.message })

    const status = error.code === 'TEMPLATE_NOT_FOUND' ? 404 : 500
    return NextResponse.json(
      {
        error: 'Parameter validation failed',
        message: error.message,
        code: error.code || 'INTERNAL_ERROR',
      },
      { status }
    )
  }
}

/**
 * GET /api/v1/journey-templates/stats
 * Get template usage statistics
 */
export async function GET_STATS(request: NextRequest) {
  try {
    const session = await validateSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const cacheStats = await conversionService.getCacheStats(session.workspaceId)

    return NextResponse.json({
      success: true,
      data: {
        cache: cacheStats,
      },
    })

  } catch (error) {
    logger.error('Failed to get template stats', { error: error.message })

    return NextResponse.json(
      {
        error: 'Failed to get stats',
        message: error.message,
      },
      { status: 500 }
    )
  }
}