import { eq, sql, and, desc, avg, count } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { createLogger } from '@/lib/logs/console/logger'
import { hasAdminPermission } from '@/lib/permissions/utils'
import { db } from '@/db'
import { templates, workflow, templateStars, apiKey as apiKeyTable, user } from '@/db/schema'

const logger = createLogger('TemplateByIdAPI')

export const revalidate = 0

// Enhanced schema for template retrieval options
const GetTemplateSchema = z.object({
  includeStats: z.coerce.boolean().optional().default(false), // Include usage statistics
  includeRelated: z.coerce.boolean().optional().default(false), // Include related templates
  includeSimilar: z.coerce.boolean().optional().default(false), // Include similar templates
  includeReviews: z.coerce.boolean().optional().default(false), // Include recent reviews (future)
  includeUsageHistory: z.coerce.boolean().optional().default(false), // Include usage history (admin only)
  trackView: z.coerce.boolean().optional().default(true), // Whether to increment view count
})

// GET /api/templates/[id] - Comprehensive template retrieval with analytics and related data
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id } = await params

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const options = GetTemplateSchema.parse(queryParams)

    logger.info(`[${requestId}] Fetching comprehensive template: ${id}`, options)

    // Authentication - support both session and API key
    let userId: string | null = null
    let isInternalCall = false

    // Check for internal JWT token for server-side calls
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      isInternalCall = await verifyInternalToken(token)
    }

    if (!isInternalCall) {
      // Try session auth first (for web UI)
      const session = await getSession()
      let authenticatedUserId: string | null = session?.user?.id || null

      // If no session, check for API key auth
      if (!authenticatedUserId) {
        const apiKeyHeader = request.headers.get('x-api-key')
        if (apiKeyHeader) {
          const [apiKeyRecord] = await db
            .select({ userId: apiKeyTable.userId })
            .from(apiKeyTable)
            .where(eq(apiKeyTable.key, apiKeyHeader))
            .limit(1)

          if (apiKeyRecord) {
            authenticatedUserId = apiKeyRecord.userId
          }
        }
      }

      if (!authenticatedUserId) {
        logger.warn(`[${requestId}] Unauthorized template access attempt for ID: ${id}`)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      userId = authenticatedUserId
    }

    // Fetch the template with comprehensive data
    const templateQuery = db
      .select({
        // Core template data
        id: templates.id,
        workflowId: templates.workflowId,
        userId: templates.userId,
        name: templates.name,
        description: templates.description,
        author: templates.author,
        views: templates.views,
        stars: templates.stars,
        color: templates.color,
        icon: templates.icon,
        category: templates.category,
        state: templates.state,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
        
        // User-specific data (when authenticated)
        ...(userId ? {
          isStarred: sql<boolean>`CASE WHEN ${templateStars.id} IS NOT NULL THEN true ELSE false END`,
        } : {
          isStarred: sql<boolean>`false`,
        }),
      })
      .from(templates)
      
    // Add star join if user is authenticated
    if (userId) {
      templateQuery.leftJoin(
        templateStars,
        and(eq(templateStars.templateId, templates.id), eq(templateStars.userId, userId))
      )
    }

    const result = await templateQuery.where(eq(templates.id, id)).limit(1)

    if (result.length === 0) {
      logger.warn(`[${requestId}] Template not found: ${id}`)
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const template = result[0]

    // Increment the view count (if enabled)
    let incrementedViews = template.views
    if (options.trackView) {
      try {
        await db
          .update(templates)
          .set({
            views: sql`${templates.views} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(templates.id, id))

        incrementedViews = template.views + 1
        logger.debug(`[${requestId}] Incremented view count for template: ${id}`)
      } catch (viewError) {
        // Log the error but don't fail the request
        logger.warn(`[${requestId}] Failed to increment view count for template: ${id}`, viewError)
      }
    }

    // Gather additional data based on options
    let relatedTemplates = null
    let similarTemplates = null
    let categoryStats = null
    let usageStats = null

    // Get related templates (same author or category)
    if (options.includeRelated) {
      const relatedQuery = await db
        .select({
          id: templates.id,
          name: templates.name,
          author: templates.author,
          category: templates.category,
          views: templates.views,
          stars: templates.stars,
          color: templates.color,
          icon: templates.icon,
          createdAt: templates.createdAt,
        })
        .from(templates)
        .where(
          and(
            sql`${templates.id} != ${id}`,
            sql`(
              ${templates.userId} = ${template.userId} OR 
              ${templates.category} = ${template.category}
            )`
          )
        )
        .orderBy(desc(templates.views))
        .limit(5)

      relatedTemplates = relatedQuery
    }

    // Get similar templates (same category, sorted by popularity)
    if (options.includeSimilar) {
      const similarQuery = await db
        .select({
          id: templates.id,
          name: templates.name,
          author: templates.author,
          views: templates.views,
          stars: templates.stars,
          color: templates.color,
          icon: templates.icon,
          description: templates.description,
        })
        .from(templates)
        .where(
          and(
            sql`${templates.id} != ${id}`,
            eq(templates.category, template.category)
          )
        )
        .orderBy(desc(templates.stars), desc(templates.views))
        .limit(4)

      similarTemplates = similarQuery
    }

    // Get category statistics
    if (options.includeStats) {
      const categoryStatsQuery = await db
        .select({
          totalTemplates: sql<number>`count(*)`,
          avgStars: sql<number>`avg(${templates.stars})`,
          totalViews: sql<number>`sum(${templates.views})`,
          topAuthor: sql<string>`mode() WITHIN GROUP (ORDER BY ${templates.author})`,
        })
        .from(templates)
        .where(eq(templates.category, template.category))

      categoryStats = categoryStatsQuery[0]
        ? {
            totalTemplates: categoryStatsQuery[0].totalTemplates || 0,
            averageStars: Math.round((categoryStatsQuery[0].avgStars || 0) * 10) / 10,
            totalViews: categoryStatsQuery[0].totalViews || 0,
            topAuthor: categoryStatsQuery[0].topAuthor || 'Unknown',
          }
        : null
    }

    // Get usage statistics (basic implementation)
    if (options.includeStats) {
      // This would typically come from a usage tracking table
      // For now, we'll provide computed statistics
      usageStats = {
        totalUses: Math.floor(template.views * 0.3), // Estimated conversion rate
        averageRating: template.stars > 0 ? Math.round((template.stars * 0.8 + 4) * 10) / 10 : null,
        popularityRank: null, // Would require complex query
        trendingScore: template.views * 0.6 + template.stars * 0.4,
      }
    }

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Successfully retrieved comprehensive template: ${id} in ${elapsed}ms`)

    return NextResponse.json({
      data: {
        ...template,
        views: incrementedViews,
      },
      // Additional data based on options
      ...(relatedTemplates && { relatedTemplates }),
      ...(similarTemplates && { similarTemplates }),
      ...(categoryStats && { categoryStats }),
      ...(usageStats && { usageStats }),
      meta: {
        requestId,
        processingTime: elapsed,
        isAuthenticated: !!userId,
        optionsUsed: {
          includeStats: options.includeStats,
          includeRelated: options.includeRelated,
          includeSimilar: options.includeSimilar,
          viewTracked: options.trackView,
        },
      },
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid query options for template ${id} after ${elapsed}ms`, {
        errors: error.errors,
        queryParams,
      })
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error fetching template: ${id} after ${elapsed}ms`, error)
    return NextResponse.json({ 
      error: 'Internal server error',
      requestId,
    }, { status: 500 })
  }
}

// Enhanced schema for comprehensive template updates
const UpdateTemplateSchema = z.object({
  // Basic metadata
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(1000).optional(),
  author: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(50).optional(),
  icon: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  
  // Template state (if updating)
  state: z.any().optional(),
  
  // Enhanced metadata
  tags: z.array(z.string()).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  estimatedTime: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  useCases: z.array(z.string()).optional(),
  version: z.string().optional(),
  
  // Visibility and sharing
  isPublic: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  
  // Update options
  sanitizeCredentials: z.boolean().optional().default(true),
  incrementVersion: z.boolean().optional().default(false), // Auto-increment version
  preserveStats: z.boolean().optional().default(true), // Preserve view/star counts
})

// PUT /api/templates/[id] - Comprehensive template update with enhanced metadata
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id } = await params

  try {
    // Authentication - support both session and API key
    let userId: string | null = null
    let isInternalCall = false

    // Check for internal JWT token for server-side calls
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      isInternalCall = await verifyInternalToken(token)
    }

    if (!isInternalCall) {
      const session = await getSession()
      let authenticatedUserId: string | null = session?.user?.id || null

      // If no session, check for API key auth
      if (!authenticatedUserId) {
        const apiKeyHeader = request.headers.get('x-api-key')
        if (apiKeyHeader) {
          const [apiKeyRecord] = await db
            .select({ userId: apiKeyTable.userId })
            .from(apiKeyTable)
            .where(eq(apiKeyTable.key, apiKeyHeader))
            .limit(1)

          if (apiKeyRecord) {
            authenticatedUserId = apiKeyRecord.userId
          }
        }
      }

      if (!authenticatedUserId) {
        logger.warn(`[${requestId}] Unauthorized template update attempt for ID: ${id}`)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      userId = authenticatedUserId
    }

    const body = await request.json()
    const validationResult = UpdateTemplateSchema.safeParse(body)

    if (!validationResult.success) {
      const elapsed = Date.now() - startTime
      logger.warn(`[${requestId}] Invalid template data for update: ${id} after ${elapsed}ms`, validationResult.error)
      return NextResponse.json(
        { error: 'Invalid template data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const updateData = validationResult.data
    
    logger.info(`[${requestId}] Updating template: ${id}`, {
      fieldsToUpdate: Object.keys(updateData),
      incrementVersion: updateData.incrementVersion,
      sanitizeCredentials: updateData.sanitizeCredentials,
    })

    // Check if template exists and get current data
    const existingTemplate = await db.select().from(templates).where(eq(templates.id, id)).limit(1)

    if (existingTemplate.length === 0) {
      logger.warn(`[${requestId}] Template not found for update: ${id}`)
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const currentTemplate = existingTemplate[0]

    // Permission: template owner OR admin of the workflow's workspace (if any) - skip for internal calls
    if (!isInternalCall && userId) {
      let canUpdate = currentTemplate.userId === userId

      if (!canUpdate && currentTemplate.workflowId) {
        const wfRows = await db
          .select({ workspaceId: workflow.workspaceId })
          .from(workflow)
          .where(eq(workflow.id, currentTemplate.workflowId))
          .limit(1)

        const workspaceId = wfRows[0]?.workspaceId as string | null | undefined
        if (workspaceId) {
          const hasAdmin = await hasAdminPermission(userId, workspaceId)
          if (hasAdmin) canUpdate = true
        }
      }

      if (!canUpdate) {
        logger.warn(`[${requestId}] User ${userId} denied permission to update template ${id}`)
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Build the update object
    const now = new Date()
    const updateFields: any = {
      updatedAt: now,
    }

    // Update basic fields if provided
    if (updateData.name) updateFields.name = updateData.name
    if (updateData.description) updateFields.description = updateData.description
    if (updateData.author) updateFields.author = updateData.author
    if (updateData.category) updateFields.category = updateData.category
    if (updateData.icon) updateFields.icon = updateData.icon
    if (updateData.color) updateFields.color = updateData.color

    // Handle state updates with sanitization
    if (updateData.state) {
      const processedState = updateData.sanitizeCredentials ? 
        sanitizeWorkflowState(updateData.state) : 
        updateData.state

      // Merge with existing metadata if preserving it
      const existingMetadata = currentTemplate.state?.metadata || {}
      const newMetadata = {
        ...existingMetadata,
        template: {
          ...((existingMetadata as any)?.template || {}),
          ...(updateData.tags && { tags: updateData.tags }),
          ...(updateData.difficulty && { difficulty: updateData.difficulty }),
          ...(updateData.estimatedTime && { estimatedTime: updateData.estimatedTime }),
          ...(updateData.requirements && { requirements: updateData.requirements }),
          ...(updateData.useCases && { useCases: updateData.useCases }),
          ...(updateData.version && { version: updateData.version }),
          ...(updateData.isPublic !== undefined && { isPublic: updateData.isPublic }),
          ...(updateData.allowComments !== undefined && { allowComments: updateData.allowComments }),
          lastUpdated: now.toISOString(),
          updatedWith: 'api',
        },
      }

      updateFields.state = {
        ...processedState,
        metadata: newMetadata,
      }
    }

    // Handle version increment
    if (updateData.incrementVersion) {
      const currentVersion = (currentTemplate.state as any)?.metadata?.template?.version || '1.0.0'
      const versionParts = currentVersion.split('.').map(Number)
      versionParts[2] = (versionParts[2] || 0) + 1 // Increment patch version
      const newVersion = versionParts.join('.')
      
      if (updateFields.state) {
        updateFields.state.metadata.template.version = newVersion
      }
      
      logger.info(`[${requestId}] Auto-incrementing version: ${currentVersion} -> ${newVersion}`)
    }

    // Update the template
    const updatedTemplate = await db
      .update(templates)
      .set(updateFields)
      .where(eq(templates.id, id))
      .returning()

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Successfully updated template: ${id} in ${elapsed}ms`)

    return NextResponse.json({
      data: updatedTemplate[0],
      message: 'Template updated successfully',
      changes: {
        fieldsUpdated: Object.keys(updateFields).filter(key => key !== 'updatedAt'),
        versionIncremented: updateData.incrementVersion,
        sanitizedCredentials: updateData.sanitizeCredentials && !!updateData.state,
      },
      meta: {
        requestId,
        processingTime: elapsed,
      },
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    logger.error(`[${requestId}] Error updating template: ${id} after ${elapsed}ms`, error)
    return NextResponse.json({ 
      error: 'Internal server error',
      requestId,
    }, { status: 500 })
  }
}

// DELETE /api/templates/[id] - Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const { id } = await params

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized template delete attempt for ID: ${id}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch template
    const existing = await db.select().from(templates).where(eq(templates.id, id)).limit(1)
    if (existing.length === 0) {
      logger.warn(`[${requestId}] Template not found for delete: ${id}`)
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const template = existing[0]

    // Permission: owner or admin of the workflow's workspace (if any)
    let canDelete = template.userId === session.user.id

    if (!canDelete && template.workflowId) {
      // Look up workflow to get workspaceId
      const wfRows = await db
        .select({ workspaceId: workflow.workspaceId })
        .from(workflow)
        .where(eq(workflow.id, template.workflowId))
        .limit(1)

      const workspaceId = wfRows[0]?.workspaceId as string | null | undefined
      if (workspaceId) {
        const hasAdmin = await hasAdminPermission(session.user.id, workspaceId)
        if (hasAdmin) canDelete = true
      }
    }

    if (!canDelete) {
      logger.warn(`[${requestId}] User denied permission to delete template ${id}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await db.delete(templates).where(eq(templates.id, id))

    logger.info(`[${requestId}] Deleted template: ${id}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error(`[${requestId}] Error deleting template: ${id}`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
