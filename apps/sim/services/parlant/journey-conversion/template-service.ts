/**
 * Template Management Service
 * ===========================
 *
 * Service for managing workflow templates, parameter validation,
 * and template lifecycle operations.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import {
  workflowTemplates,
  templateParameters,
  templateUsageStats
} from '@/db/schema/parlant'
import { eq, and, desc, asc, like, inArray, sql } from 'drizzle-orm'
import { generateId } from '@/lib/utils'
import {
  type TemplateService as ITemplateService,
  type WorkflowTemplate,
  type TemplateParameter,
  type TemplateCreateRequest,
  type TemplateUpdateRequest,
  type TemplateListQuery,
  type ConversionError,
} from './types'

const logger = createLogger('TemplateService')

export class TemplateService implements ITemplateService {
  /**
   * Create a new workflow template
   */
  async createTemplate(request: TemplateCreateRequest): Promise<WorkflowTemplate> {
    const startTime = Date.now()
    logger.info('Creating workflow template', {
      name: request.name,
      workspaceId: request.workspace_id,
      parametersCount: request.parameters.length,
    })

    try {
      const templateId = generateId('template')

      // Start database transaction
      const template = await db.transaction(async (tx) => {
        // Insert template
        const [insertedTemplate] = await tx
          .insert(workflowTemplates)
          .values({
            id: templateId,
            name: request.name,
            description: request.description,
            workspace_id: request.workspace_id,
            workflow_id: request.workflow_id,
            version: '1.0.0',
            workflow_data: {}, // Will be populated from workflow
            tags: request.tags || [],
            usage_count: 0,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning()

        // Insert parameters
        if (request.parameters.length > 0) {
          const parametersToInsert = request.parameters.map((param, index) => ({
            id: generateId('param'),
            template_id: templateId,
            name: param.name,
            type: param.type,
            description: param.description,
            default_value: param.default_value,
            required: param.required,
            validation: param.validation || {},
            display_order: param.display_order || index,
            created_at: new Date(),
            updated_at: new Date(),
          }))

          await tx.insert(templateParameters).values(parametersToInsert)
        }

        // Initialize usage stats
        await tx.insert(templateUsageStats).values({
          id: generateId('stats'),
          template_id: templateId,
          workspace_id: request.workspace_id,
          conversion_count: 0,
          success_count: 0,
          failure_count: 0,
          average_duration_ms: 0,
          total_duration_ms: 0,
          last_used_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })

        return insertedTemplate
      })

      // Fetch complete template with parameters
      const completeTemplate = await this.getTemplate(template.id, request.workspace_id)

      logger.info('Template created successfully', {
        templateId: template.id,
        duration: Date.now() - startTime,
      })

      return completeTemplate

    } catch (error) {
      logger.error('Failed to create template', { error: error.message, request })
      throw this.createError('template', 'TEMPLATE_CREATE_FAILED', error.message, { request })
    }
  }

  /**
   * Update an existing workflow template
   */
  async updateTemplate(templateId: string, request: TemplateUpdateRequest): Promise<WorkflowTemplate> {
    const startTime = Date.now()
    logger.info('Updating workflow template', { templateId })

    try {
      await db.transaction(async (tx) => {
        // Update template
        const updateData: any = {
          updated_at: new Date(),
        }

        if (request.name !== undefined) updateData.name = request.name
        if (request.description !== undefined) updateData.description = request.description
        if (request.tags !== undefined) updateData.tags = request.tags

        await tx
          .update(workflowTemplates)
          .set(updateData)
          .where(eq(workflowTemplates.id, templateId))

        // Update parameters if provided
        if (request.parameters) {
          // Delete existing parameters
          await tx
            .delete(templateParameters)
            .where(eq(templateParameters.template_id, templateId))

          // Insert new parameters
          if (request.parameters.length > 0) {
            const parametersToInsert = request.parameters.map((param, index) => ({
              id: param.id || generateId('param'),
              template_id: templateId,
              name: param.name,
              type: param.type,
              description: param.description,
              default_value: param.default_value,
              required: param.required,
              validation: param.validation || {},
              display_order: param.display_order || index,
              created_at: new Date(),
              updated_at: new Date(),
            }))

            await tx.insert(templateParameters).values(parametersToInsert)
          }
        }
      })

      // Fetch updated template
      const template = await this.getTemplate(templateId, '')

      logger.info('Template updated successfully', {
        templateId,
        duration: Date.now() - startTime,
      })

      return template

    } catch (error) {
      logger.error('Failed to update template', { error: error.message, templateId, request })
      throw this.createError('template', 'TEMPLATE_UPDATE_FAILED', error.message, { templateId, request })
    }
  }

  /**
   * Get a workflow template by ID
   */
  async getTemplate(templateId: string, workspaceId: string): Promise<WorkflowTemplate> {
    try {
      const template = await db.query.workflowTemplates.findFirst({
        where: workspaceId
          ? and(
              eq(workflowTemplates.id, templateId),
              eq(workflowTemplates.workspace_id, workspaceId)
            )
          : eq(workflowTemplates.id, templateId),
        with: {
          parameters: {
            orderBy: asc(templateParameters.display_order),
          },
        },
      })

      if (!template) {
        throw this.createError('template', 'TEMPLATE_NOT_FOUND', `Template ${templateId} not found`)
      }

      return this.mapDbTemplateToApiTemplate(template)

    } catch (error) {
      logger.error('Failed to get template', { error: error.message, templateId, workspaceId })
      if (error instanceof Error && error.name === 'ConversionError') {
        throw error
      }
      throw this.createError('template', 'TEMPLATE_FETCH_FAILED', error.message, { templateId })
    }
  }

  /**
   * List workflow templates with filtering and pagination
   */
  async listTemplates(query: TemplateListQuery) {
    const startTime = Date.now()
    logger.info('Listing templates', { query })

    try {
      const limit = query.limit || 50
      const offset = query.offset || 0

      // Build where conditions
      const conditions: any[] = [eq(workflowTemplates.workspace_id, query.workspace_id)]

      if (query.search) {
        conditions.push(
          like(workflowTemplates.name, `%${query.search}%`)
        )
      }

      if (query.tags && query.tags.length > 0) {
        // PostgreSQL array overlap operator
        conditions.push(
          sql`${workflowTemplates.tags} && ${query.tags}`
        )
      }

      // Build order by
      const sortField = query.sort_by || 'created_at'
      const sortOrder = query.sort_order || 'desc'
      const orderBy = sortOrder === 'asc'
        ? asc(workflowTemplates[sortField])
        : desc(workflowTemplates[sortField])

      // Get templates with count
      const [templates, [{ count }]] = await Promise.all([
        db.query.workflowTemplates.findMany({
          where: and(...conditions),
          with: {
            parameters: {
              orderBy: asc(templateParameters.display_order),
            },
          },
          orderBy,
          limit,
          offset,
        }),
        db
          .select({ count: sql`count(*)` })
          .from(workflowTemplates)
          .where(and(...conditions)),
      ])

      const mappedTemplates = templates.map(this.mapDbTemplateToApiTemplate)

      logger.info('Templates listed successfully', {
        count: mappedTemplates.length,
        total: Number(count),
        duration: Date.now() - startTime,
      })

      return {
        templates: mappedTemplates,
        total: Number(count),
        pagination: {
          limit,
          offset,
          has_more: offset + templates.length < Number(count),
        },
      }

    } catch (error) {
      logger.error('Failed to list templates', { error: error.message, query })
      throw this.createError('template', 'TEMPLATE_LIST_FAILED', error.message, { query })
    }
  }

  /**
   * Delete a workflow template
   */
  async deleteTemplate(templateId: string, workspaceId: string): Promise<void> {
    const startTime = Date.now()
    logger.info('Deleting template', { templateId, workspaceId })

    try {
      await db.transaction(async (tx) => {
        // Verify ownership
        const template = await tx.query.workflowTemplates.findFirst({
          where: and(
            eq(workflowTemplates.id, templateId),
            eq(workflowTemplates.workspace_id, workspaceId)
          ),
        })

        if (!template) {
          throw this.createError('template', 'TEMPLATE_NOT_FOUND', `Template ${templateId} not found`)
        }

        // Delete parameters
        await tx
          .delete(templateParameters)
          .where(eq(templateParameters.template_id, templateId))

        // Delete usage stats
        await tx
          .delete(templateUsageStats)
          .where(eq(templateUsageStats.template_id, templateId))

        // Delete template
        await tx
          .delete(workflowTemplates)
          .where(eq(workflowTemplates.id, templateId))
      })

      logger.info('Template deleted successfully', {
        templateId,
        duration: Date.now() - startTime,
      })

    } catch (error) {
      logger.error('Failed to delete template', { error: error.message, templateId })
      if (error instanceof Error && error.name === 'ConversionError') {
        throw error
      }
      throw this.createError('template', 'TEMPLATE_DELETE_FAILED', error.message, { templateId })
    }
  }

  /**
   * Validate template parameters
   */
  async validateParameters(templateId: string, parameters: Record<string, any>) {
    logger.info('Validating template parameters', { templateId, parametersCount: Object.keys(parameters).length })

    try {
      const template = await this.getTemplate(templateId, '')
      const errors: Array<{ parameter: string; message: string }> = []

      // Check required parameters
      for (const param of template.parameters) {
        if (param.required && !(param.name in parameters)) {
          errors.push({
            parameter: param.name,
            message: `Required parameter '${param.name}' is missing`,
          })
          continue
        }

        if (param.name in parameters) {
          const value = parameters[param.name]
          const validation = this.validateParameter(param, value)

          if (!validation.valid) {
            errors.push({
              parameter: param.name,
              message: validation.error || `Invalid value for parameter '${param.name}'`,
            })
          }
        }
      }

      // Check for unexpected parameters
      const validParamNames = new Set(template.parameters.map(p => p.name))
      for (const paramName of Object.keys(parameters)) {
        if (!validParamNames.has(paramName)) {
          errors.push({
            parameter: paramName,
            message: `Unknown parameter '${paramName}'`,
          })
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      }

    } catch (error) {
      logger.error('Failed to validate parameters', { error: error.message, templateId })
      throw this.createError('validation', 'PARAMETER_VALIDATION_FAILED', error.message, { templateId })
    }
  }

  /**
   * Update template usage statistics
   */
  async updateUsageStats(
    templateId: string,
    success: boolean,
    durationMs: number
  ): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        // Increment template usage count
        await tx
          .update(workflowTemplates)
          .set({
            usage_count: sql`${workflowTemplates.usage_count} + 1`,
            updated_at: new Date(),
          })
          .where(eq(workflowTemplates.id, templateId))

        // Update usage stats
        await tx
          .update(templateUsageStats)
          .set({
            conversion_count: sql`${templateUsageStats.conversion_count} + 1`,
            success_count: success
              ? sql`${templateUsageStats.success_count} + 1`
              : templateUsageStats.success_count,
            failure_count: !success
              ? sql`${templateUsageStats.failure_count} + 1`
              : templateUsageStats.failure_count,
            total_duration_ms: sql`${templateUsageStats.total_duration_ms} + ${durationMs}`,
            average_duration_ms: sql`(${templateUsageStats.total_duration_ms} + ${durationMs}) / (${templateUsageStats.conversion_count} + 1)`,
            last_used_at: new Date(),
            updated_at: new Date(),
          })
          .where(eq(templateUsageStats.template_id, templateId))
      })

      logger.debug('Usage stats updated', { templateId, success, durationMs })

    } catch (error) {
      logger.error('Failed to update usage stats', { error: error.message, templateId })
      // Don't throw error as this is non-critical
    }
  }

  // Private helper methods

  private mapDbTemplateToApiTemplate(dbTemplate: any): WorkflowTemplate {
    return {
      id: dbTemplate.id,
      name: dbTemplate.name,
      description: dbTemplate.description,
      workspace_id: dbTemplate.workspace_id,
      version: dbTemplate.version,
      workflow_data: dbTemplate.workflow_data,
      parameters: (dbTemplate.parameters || []).map(this.mapDbParameterToApiParameter),
      created_at: dbTemplate.created_at.toISOString(),
      updated_at: dbTemplate.updated_at.toISOString(),
      tags: dbTemplate.tags || [],
      usage_count: dbTemplate.usage_count,
    }
  }

  private mapDbParameterToApiParameter(dbParam: any): TemplateParameter {
    return {
      id: dbParam.id,
      name: dbParam.name,
      type: dbParam.type,
      description: dbParam.description,
      default_value: dbParam.default_value,
      required: dbParam.required,
      validation: dbParam.validation,
      display_order: dbParam.display_order,
    }
  }

  private validateParameter(param: TemplateParameter, value: any): { valid: boolean; error?: string } {
    // Type validation
    if (!this.validateParameterType(param.type, value)) {
      return {
        valid: false,
        error: `Value must be of type ${param.type}`,
      }
    }

    // Custom validation rules
    if (param.validation) {
      const validation = param.validation

      // Min/max validation for numbers
      if (param.type === 'number') {
        if (validation.min !== undefined && value < validation.min) {
          return {
            valid: false,
            error: `Value must be at least ${validation.min}`,
          }
        }
        if (validation.max !== undefined && value > validation.max) {
          return {
            valid: false,
            error: `Value must be at most ${validation.max}`,
          }
        }
      }

      // Pattern validation for strings
      if (param.type === 'string' && validation.pattern) {
        const regex = new RegExp(validation.pattern)
        if (!regex.test(value)) {
          return {
            valid: false,
            error: `Value does not match required pattern`,
          }
        }
      }

      // Allowed values validation
      if (validation.allowed_values && !validation.allowed_values.includes(value)) {
        return {
          valid: false,
          error: `Value must be one of: ${validation.allowed_values.join(', ')}`,
        }
      }
    }

    return { valid: true }
  }

  private validateParameterType(type: TemplateParameter['type'], value: any): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number' && !isNaN(value)
      case 'boolean':
        return typeof value === 'boolean'
      case 'array':
        return Array.isArray(value)
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value)
      case 'json':
        try {
          if (typeof value === 'string') {
            JSON.parse(value)
          }
          return true
        } catch {
          return false
        }
      default:
        return false
    }
  }

  private createError(
    type: ConversionError['type'],
    code: string,
    message: string,
    details?: Record<string, any>
  ): ConversionError {
    const error = new Error(message) as ConversionError
    error.name = 'ConversionError'
    error.type = type
    error.code = code
    error.details = details
    return error
  }
}

// Export singleton instance
export const templateService = new TemplateService()