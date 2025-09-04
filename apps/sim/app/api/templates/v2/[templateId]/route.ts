/**
 * Individual Template Management API v2 - Single template CRUD operations
 *
 * Features:
 * - Comprehensive template retrieval with analytics
 * - Template update with version tracking
 * - Template deletion with dependency checks
 * - Access control and permission management
 * - Usage analytics recording
 * - SEO optimization and metadata management
 *
 * @version 2.0.0
 * @author Sim Template Library Team
 * @created 2025-09-04
 */

import { and, eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { 
  withTemplateDetailsMiddleware,
  withTemplateUpdateMiddleware,
  withTemplateDeleteMiddleware,
  type TemplateAuthResult,
  getValidatedData,
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/auth/template-api-middleware'
import { auditTemplateOperation } from '@/lib/auth/template-middleware'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import {
  templateCategories,
  templateFavorites,
  templates,
  templateTagAssociations,
  templateTags,
  templateUsageAnalytics,
  user,
} from '@/db/schema'

const logger = createLogger('IndividualTemplateAPI')

export const revalidate = 0

// ========================
// VALIDATION SCHEMAS
// ========================

const TemplateQuerySchema = z.object({
  includeAnalytics: z.coerce.boolean().optional().default(false),
  includeRatings: z.coerce.boolean().optional().default(false),
  includeTags: z.coerce.boolean().optional().default(true),
  includeCategory: z.coerce.boolean().optional().default(true),
  includeAuthor: z.coerce.boolean().optional().default(true),
  includeWorkflowTemplate: z.coerce.boolean().optional().default(false),
  trackView: z.coerce.boolean().optional().default(true), // Track view analytics
})

const UpdateTemplateSchema = z.object({
  // Core template information
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(10).max(2000).optional(),
  longDescription: z.string().max(10000).optional(),

  // Workflow definition
  workflowTemplate: z.record(z.any()).optional(), // JSONB workflow definition
  templateVersion: z.string().optional(),
  minSimVersion: z.string().optional(),

  // Categorization
  categoryId: z.string().min(1).optional(),
  tagIds: z.array(z.string()).optional(),

  // Template metadata
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  estimatedSetupTime: z.number().positive().optional(), // Minutes
  estimatedExecutionTime: z.number().positive().optional(), // Seconds

  // Publishing
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
  isFeatured: z.boolean().optional(),

  // SEO and presentation
  metaTitle: z.string().max(100).optional(),
  metaDescription: z.string().max(200).optional(),
  coverImageUrl: z.string().url().optional(),
  previewImages: z.array(z.string().url()).optional(),

  // Business value
  estimatedCostSavings: z.number().positive().optional(),
  estimatedTimeSavings: z.number().positive().optional(),
  businessValueDescription: z.string().max(1000).optional(),

  // Integration requirements
  requiredIntegrations: z.array(z.string()).optional(),
  supportedIntegrations: z.array(z.string()).optional(),
  technicalRequirements: z.string().max(2000).optional(),
})

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Record template usage analytics
 */
async function recordUsageAnalytics(
  templateId: string,
  eventType: string,
  userId?: string,
  context: Record<string, any> = {}
) {
  try {
    await db.insert(templateUsageAnalytics).values({
      id: crypto.randomUUID(),
      templateId,
      userId,
      eventType,
      eventContext: context,
      usageTimestamp: new Date(),
      createdAt: new Date(),
    })
  } catch (error) {
    logger.warn('Failed to record usage analytics', { templateId, eventType, error })
  }
}

/**
 * Generate URL-friendly slug from template name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim()
}

/**
 * Sanitize workflow template to remove sensitive data
 */
function sanitizeWorkflowTemplate(workflowTemplate: any): any {
  const sanitized = JSON.parse(JSON.stringify(workflowTemplate))

  // Remove common sensitive fields
  const sensitivePatterns = [
    /api[_-]?key/i,
    /secret/i,
    /password/i,
    /token/i,
    /credential/i,
    /oauth/i,
    /bearer/i,
  ]

  function cleanObject(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return

    for (const [key, value] of Object.entries(obj)) {
      if (sensitivePatterns.some((pattern) => pattern.test(key))) {
        obj[key] = '[REDACTED]'
      } else if (typeof value === 'object') {
        cleanObject(value)
      }
    }
  }

  cleanObject(sanitized)
  return sanitized
}

// ========================
// API ENDPOINTS
// ========================

/**
 * GET /api/templates/v2/[templateId] - Get individual template with comprehensive data
 * Enhanced with role-based access control and security middleware
 */
async function getTemplateHandler(request: NextRequest, auth: TemplateAuthResult) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const templateId = auth.context.templateId!
    const { searchParams } = new URL(request.url)
    const queryParams = TemplateQuerySchema.parse(Object.fromEntries(searchParams.entries()))
    const userId = auth.context.userId

    logger.info(`[${requestId}] Fetching template: ${templateId}`, {
      userId,
      userRole: auth.context.userRole,
      templateId,
    })

    // Build comprehensive query
    const query = db
      .select({
        // Core template data
        id: templates.id,
        name: templates.name,
        slug: templates.slug,
        description: templates.description,
        longDescription: templates.longDescription,
        templateVersion: templates.templateVersion,
        minSimVersion: templates.minSimVersion,
        difficultyLevel: templates.difficultyLevel,
        estimatedSetupTime: templates.estimatedSetupTime,
        estimatedExecutionTime: templates.estimatedExecutionTime,

        // Analytics
        viewCount: templates.viewCount,
        downloadCount: templates.downloadCount,
        likeCount: templates.likeCount,
        ratingAverage: templates.ratingAverage,
        ratingCount: templates.ratingCount,
        communityScore: templates.communityScore,

        // Status and visibility
        status: templates.status,
        visibility: templates.visibility,
        isFeatured: templates.isFeatured,
        isCommunityTemplate: templates.isCommunityTemplate,

        // Business value
        estimatedCostSavings: templates.estimatedCostSavings,
        estimatedTimeSavings: templates.estimatedTimeSavings,
        businessValueDescription: templates.businessValueDescription,

        // Media
        coverImageUrl: templates.coverImageUrl,
        previewImages: templates.previewImages,

        // Integrations
        requiredIntegrations: templates.requiredIntegrations,
        supportedIntegrations: templates.supportedIntegrations,
        technicalRequirements: templates.technicalRequirements,

        // SEO
        metaTitle: templates.metaTitle,
        metaDescription: templates.metaDescription,

        // Timestamps
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
        publishedAt: templates.publishedAt,
        lastModifiedAt: templates.lastModifiedAt,

        // Conditional fields
        ...(queryParams.includeWorkflowTemplate
          ? { workflowTemplate: templates.workflowTemplate }
          : {}),

        // Category info
        ...(queryParams.includeCategory
          ? {
              categoryId: templates.categoryId,
              categoryName: templateCategories.name,
              categorySlug: templateCategories.slug,
              categoryColor: templateCategories.color,
              categoryIcon: templateCategories.icon,
              categoryPath: templateCategories.path,
            }
          : { categoryId: templates.categoryId }),

        // Author info
        ...(queryParams.includeAuthor
          ? {
              authorId: templates.createdByUserId,
              authorName: user.name,
              authorImage: user.image,
            }
          : { authorId: templates.createdByUserId }),

        // User-specific data
        ...(userId
          ? {
              isFavorited: sql<boolean>`CASE WHEN ${templateFavorites.templateId} IS NOT NULL THEN true ELSE false END`,
            }
          : {}),
      })
      .from(templates)

    // Add joins based on requested data
    if (queryParams.includeCategory) {
      query.leftJoin(templateCategories, eq(templates.categoryId, templateCategories.id))
    }

    if (queryParams.includeAuthor) {
      query.leftJoin(user, eq(templates.createdByUserId, user.id))
    }

    if (userId) {
      query.leftJoin(
        templateFavorites,
        and(eq(templateFavorites.templateId, templates.id), eq(templateFavorites.userId, userId))
      )
    }

    // Execute main query
    const results = await query.where(eq(templates.id, templateId)).limit(1)

    if (results.length === 0) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 })
    }

    const template = results[0]

    // Access permissions are already handled by middleware
    // No additional permission checks needed here since middleware validates access

    // Add tags if requested
    if (queryParams.includeTags) {
      const tagsData = await db
        .select({
          tagId: templateTags.id,
          tagName: templateTags.name,
          tagSlug: templateTags.slug,
          tagColor: templateTags.color,
          tagType: templateTags.tagType,
        })
        .from(templateTagAssociations)
        .innerJoin(templateTags, eq(templateTagAssociations.tagId, templateTags.id))
        .where(eq(templateTagAssociations.templateId, templateId))

      template.tags = tagsData.map((tag) => ({
        id: tag.tagId,
        name: tag.tagName,
        slug: tag.tagSlug,
        color: tag.tagColor,
        type: tag.tagType,
      }))
    }

    // Record view analytics if requested
    if (queryParams.trackView && userId) {
      await recordUsageAnalytics(templateId, 'view', userId, {
        includeWorkflowTemplate: queryParams.includeWorkflowTemplate,
        userAgent: request.headers.get('user-agent'),
        referrer: request.headers.get('referer'),
        userRole: auth.context.userRole,
      })

      // Increment view count
      await db
        .update(templates)
        .set({
          viewCount: sql`${templates.viewCount} + 1`,
        })
        .where(eq(templates.id, templateId))
    }

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Template fetched successfully in ${elapsed}ms`)

    return createSuccessResponse(
      template,
      200,
      {
        requestId,
        processingTime: elapsed,
        authenticated: !!userId,
        viewTracked: queryParams.trackView && !!userId,
        userRole: auth.context.userRole,
        permissions: auth.permissions,
      },
      requestId
    )
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid query parameters:`, error.errors)
      return createErrorResponse(
        'Invalid query parameters',
        400,
        error.errors,
        requestId
      )
    }

    logger.error(`[${requestId}] Template fetch error after ${elapsed}ms:`, error)
    return createErrorResponse(
      'Internal server error',
      500,
      undefined,
      requestId
    )
  }
}

// Export GET endpoint with middleware
export const GET = withTemplateDetailsMiddleware(getTemplateHandler)

/**
 * PUT /api/templates/v2/[templateId] - Update template with version tracking
 * Enhanced with role-based access control and security middleware
 */
async function updateTemplateHandler(request: NextRequest, auth: TemplateAuthResult) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const templateId = auth.context.templateId!
    const userId = auth.context.userId!
    const validatedData = getValidatedData(request)

    const data = validatedData

    logger.info(`[${requestId}] Updating template: ${templateId}`, {
      userId,
      userRole: auth.context.userRole,
      fieldsToUpdate: Object.keys(data),
    })

    // Get current template data
    const existingTemplate = await db
      .select({
        id: templates.id,
        name: templates.name,
        slug: templates.slug,
        createdByUserId: templates.createdByUserId,
        status: templates.status,
        categoryId: templates.categoryId,
      })
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1)

    if (existingTemplate.length === 0) {
      return createErrorResponse('Template not found', 404, undefined, requestId)
    }

    const template = existingTemplate[0]
    
    // Permission check is already handled by middleware, but verify ownership for non-admin users
    if (!auth.context.isOwner && !['admin', 'moderator'].includes(auth.context.userRole)) {
      return createErrorResponse('Insufficient permissions to update template', 403, undefined, requestId)
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
      lastModifiedAt: new Date(),
    }

    // Handle name and slug updates
    if (data.name && data.name !== template.name) {
      const newSlug = generateSlug(data.name)

      // Check if new slug would conflict
      const slugExists = await db
        .select({ id: templates.id })
        .from(templates)
        .where(and(eq(templates.slug, newSlug), sql`${templates.id} != ${templateId}`))
        .limit(1)

      if (slugExists.length > 0) {
        return createErrorResponse(
          'Template with similar name already exists',
          409,
          { suggestion: `${data.name} ${Math.floor(Math.random() * 1000)}` },
          requestId
        )
      }

      updateData.name = data.name
      updateData.slug = newSlug
    }

    // Add other fields if provided
    if (data.description !== undefined) updateData.description = data.description
    if (data.longDescription !== undefined) updateData.longDescription = data.longDescription
    if (data.templateVersion !== undefined) updateData.templateVersion = data.templateVersion
    if (data.minSimVersion !== undefined) updateData.minSimVersion = data.minSimVersion
    if (data.difficultyLevel !== undefined) updateData.difficultyLevel = data.difficultyLevel
    if (data.estimatedSetupTime !== undefined)
      updateData.estimatedSetupTime = data.estimatedSetupTime
    if (data.estimatedExecutionTime !== undefined)
      updateData.estimatedExecutionTime = data.estimatedExecutionTime
    if (data.visibility !== undefined) updateData.visibility = data.visibility
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured
    if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle
    if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription
    if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl
    if (data.previewImages !== undefined) updateData.previewImages = data.previewImages
    if (data.estimatedCostSavings !== undefined)
      updateData.estimatedCostSavings = data.estimatedCostSavings
    if (data.estimatedTimeSavings !== undefined)
      updateData.estimatedTimeSavings = data.estimatedTimeSavings
    if (data.businessValueDescription !== undefined)
      updateData.businessValueDescription = data.businessValueDescription
    if (data.requiredIntegrations !== undefined)
      updateData.requiredIntegrations = data.requiredIntegrations
    if (data.supportedIntegrations !== undefined)
      updateData.supportedIntegrations = data.supportedIntegrations
    if (data.technicalRequirements !== undefined)
      updateData.technicalRequirements = data.technicalRequirements

    // Handle workflow template update with sanitization
    if (data.workflowTemplate) {
      updateData.workflowTemplate = sanitizeWorkflowTemplate(data.workflowTemplate)
    }

    // Verify category exists if updating
    if (data.categoryId && data.categoryId !== template.categoryId) {
      const categoryExists = await db
        .select({ id: templateCategories.id })
        .from(templateCategories)
        .where(eq(templateCategories.id, data.categoryId))
        .limit(1)

      if (categoryExists.length === 0) {
        return createErrorResponse('Category not found', 400, undefined, requestId)
      }
      updateData.categoryId = data.categoryId
    }

    // Update template
    const updatedTemplate = await db
      .update(templates)
      .set(updateData)
      .where(eq(templates.id, templateId))
      .returning()

    // Update tags if provided
    if (data.tagIds !== undefined) {
      // Remove existing tag associations
      await db
        .delete(templateTagAssociations)
        .where(eq(templateTagAssociations.templateId, templateId))

      // Add new tag associations
      if (data.tagIds.length > 0) {
        const tagAssociations = data.tagIds.map((tagId) => ({
          templateId,
          tagId,
          createdAt: new Date(),
        }))
        await db.insert(templateTagAssociations).values(tagAssociations)
      }
    }

    // Record update analytics
    await recordUsageAnalytics(templateId, 'update', userId, {
      fieldsUpdated: Object.keys(updateData).filter(
        (key) => key !== 'updatedAt' && key !== 'lastModifiedAt'
      ),
      tagUpdated: data.tagIds !== undefined,
      userRole: auth.context.userRole,
    })

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Template updated successfully in ${elapsed}ms`)

    const fieldsUpdated = Object.keys(updateData).filter(
      (key) => key !== 'updatedAt' && key !== 'lastModifiedAt'
    )

    return createSuccessResponse(
      {
        id: templateId,
        name: updateData.name || template.name,
        slug: updateData.slug || template.slug,
        fieldsUpdated,
        message: 'Template updated successfully',
      },
      200,
      {
        requestId,
        processingTime: elapsed,
        userRole: auth.context.userRole,
        permissions: auth.permissions,
      },
      requestId
    )
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid update data:`, error.errors)
      return createErrorResponse(
        'Invalid update data',
        400,
        error.errors,
        requestId
      )
    }

    logger.error(`[${requestId}] Template update error after ${elapsed}ms:`, error)
    return createErrorResponse(
      'Internal server error',
      500,
      undefined,
      requestId
    )
  }
}

// Export PUT endpoint with middleware
export const PUT = withTemplateUpdateMiddleware(updateTemplateHandler)

/**
 * DELETE /api/templates/v2/[templateId] - Delete template with dependency checks
 * Enhanced with role-based access control and security middleware
 */
async function deleteTemplateHandler(request: NextRequest, auth: TemplateAuthResult) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const templateId = auth.context.templateId!
    const userId = auth.context.userId!

    logger.info(`[${requestId}] Deleting template: ${templateId}`, {
      userId,
      userRole: auth.context.userRole,
    })

    // Get template data for safety checks
    const existingTemplate = await db
      .select({
        id: templates.id,
        name: templates.name,
        createdByUserId: templates.createdByUserId,
        status: templates.status,
        downloadCount: templates.downloadCount,
        visibility: templates.visibility,
      })
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1)

    if (existingTemplate.length === 0) {
      return createErrorResponse('Template not found', 404, undefined, requestId)
    }

    const template = existingTemplate[0]
    
    // Permission check is already handled by middleware, but verify ownership for non-admin users
    if (!auth.context.isOwner && !['admin', 'moderator'].includes(auth.context.userRole)) {
      return createErrorResponse('Insufficient permissions to delete template', 403, undefined, requestId)
    }

    // Enhanced safety checks for template deletion
    const safetyChecks = []
    
    // Check significant usage
    if (template.downloadCount && template.downloadCount > 100) {
      safetyChecks.push({
        check: 'high_usage',
        downloadCount: template.downloadCount,
        severity: 'warning',
      })
    }
    
    // Check if template is public and popular
    if (template.visibility === 'public' && template.downloadCount && template.downloadCount > 50) {
      safetyChecks.push({
        check: 'public_template',
        severity: 'warning',
      })
    }
    
    // For non-admin users, prevent deletion of templates with high usage
    if (!['admin'].includes(auth.context.userRole) && template.downloadCount && template.downloadCount > 100) {
      return createErrorResponse(
        'Cannot delete template with significant usage',
        400,
        {
          downloadCount: template.downloadCount,
          suggestion: 'Consider archiving instead of deleting',
          safetyChecks,
        },
        requestId
      )
    }

    // Record deletion analytics before deleting
    await recordUsageAnalytics(templateId, 'delete', userId, {
      templateName: template.name,
      downloadCount: template.downloadCount,
      status: template.status,
      visibility: template.visibility,
      userRole: auth.context.userRole,
      safetyChecks,
    })

    // Delete template (cascade will handle related records)
    await db.delete(templates).where(eq(templates.id, templateId))

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Template deleted successfully in ${elapsed}ms`)

    return createSuccessResponse(
      {
        id: templateId,
        name: template.name,
        message: 'Template deleted successfully',
        safetyChecks,
      },
      200,
      {
        requestId,
        processingTime: elapsed,
        userRole: auth.context.userRole,
        permissions: auth.permissions,
      },
      requestId
    )
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    logger.error(`[${requestId}] Template deletion error after ${elapsed}ms:`, error)
    return createErrorResponse(
      'Internal server error',
      500,
      undefined,
      requestId
    )
  }
}

// Export DELETE endpoint with middleware
export const DELETE = withTemplateDeleteMiddleware(deleteTemplateHandler)
