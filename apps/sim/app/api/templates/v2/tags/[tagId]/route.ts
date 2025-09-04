/**
 * Individual Template Tag API v2 - Single tag operations
 *
 * Features:
 * - Individual tag retrieval with usage analytics
 * - Tag update with slug regeneration
 * - Tag deletion with dependency checks
 * - Tag merging capabilities for consolidation
 * - Templates associated with specific tags
 *
 * @version 2.0.0
 * @author Sim Template Library Team
 * @created 2025-09-04
 */

import { and, eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { templateTags, templateTagAssociations, templates, user } from '@/db/schema'

const logger = createLogger('IndividualTagAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const TagDetailsSchema = z.object({
  includeTemplates: z.coerce.boolean().optional().default(false),
  includeAnalytics: z.coerce.boolean().optional().default(false),
  templateLimit: z.coerce.number().min(1).max(50).optional().default(10),
})

const UpdateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  tagType: z.enum(['skill', 'integration', 'industry', 'use_case', 'general']).optional(),
  displayName: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
})

const MergeTagSchema = z.object({
  targetTagId: z.string().min(1),
  mergeReason: z.string().max(500).optional(),
  preserveHistory: z.boolean().optional().default(true),
})

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Generate URL-friendly slug from tag name
 */
function generateTagSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim()
}

/**
 * Update tag usage statistics
 */
async function updateTagUsageStats(tagId: string) {
  try {
    const usageData = await db
      .select({ count: sql<number>`count(*)` })
      .from(templateTagAssociations)
      .where(eq(templateTagAssociations.tagId, tagId))

    const usageCount = usageData[0]?.count || 0

    await db
      .update(templateTags)
      .set({
        usageCount,
        updatedAt: new Date(),
      })
      .where(eq(templateTags.id, tagId))
  } catch (error) {
    logger.warn('Failed to update tag usage stats', { tagId, error })
  }
}

// ========================
// API ENDPOINTS
// ========================

/**
 * GET /api/templates/v2/tags/[tagId] - Get individual tag with associated data
 */
export async function GET(request: NextRequest, { params }: { params: { tagId: string } }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { tagId } = params
    const { searchParams } = new URL(request.url)
    const queryParams = TagDetailsSchema.parse(Object.fromEntries(searchParams.entries()))

    logger.info(`[${requestId}] Fetching tag: ${tagId}`)

    // Get tag details
    const tagQuery = db
      .select({
        id: templateTags.id,
        name: templateTags.name,
        slug: templateTags.slug,
        description: templateTags.description,
        color: templateTags.color,
        tagType: templateTags.tagType,
        displayName: templateTags.displayName,
        isActive: templateTags.isActive,
        isFeatured: templateTags.isFeatured,
        isSystemTag: templateTags.isSystemTag,
        usageCount: templateTags.usageCount,
        trendScore: templateTags.trendScore,
        weeklyGrowth: templateTags.weeklyGrowth,
        createdAt: templateTags.createdAt,
        updatedAt: templateTags.updatedAt,
        createdByUserId: templateTags.createdByUserId,
        
        // Creator info
        createdByUserName: user.name,
        createdByUserImage: user.image,
      })
      .from(templateTags)
      .leftJoin(user, eq(templateTags.createdByUserId, user.id))
      .where(eq(templateTags.id, tagId))
      .limit(1)

    const tagResults = await tagQuery

    if (tagResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' },
        { status: 404 }
      )
    }

    const tag = tagResults[0]

    // Add associated templates if requested
    if (queryParams.includeTemplates) {
      const templatesQuery = await db
        .select({
          templateId: templates.id,
          templateName: templates.name,
          templateSlug: templates.slug,
          templateDescription: templates.description,
          templateStatus: templates.status,
          templateVisibility: templates.visibility,
          coverImageUrl: templates.coverImageUrl,
          ratingAverage: templates.ratingAverage,
          downloadCount: templates.downloadCount,
          createdAt: templates.createdAt,
        })
        .from(templateTagAssociations)
        .innerJoin(templates, eq(templateTagAssociations.templateId, templates.id))
        .where(
          and(
            eq(templateTagAssociations.tagId, tagId),
            eq(templates.status, 'approved'),
            eq(templates.visibility, 'public')
          )
        )
        .limit(queryParams.templateLimit)
        .orderBy(sql`${templates.downloadCount} DESC`)

      tag.associatedTemplates = templatesQuery
    }

    // Add analytics if requested
    if (queryParams.includeAnalytics) {
      // Get usage trends over time
      const analyticsData = await db
        .select({
          totalTemplates: sql<number>`count(*)`,
          activeTemplates: sql<number>`count(*) filter (where ${templates.status} = 'approved')`,
          avgRating: sql<number>`avg(${templates.ratingAverage})`,
          totalDownloads: sql<number>`sum(${templates.downloadCount})`,
          recentTemplates: sql<number>`
            count(*) filter (where ${templates.createdAt} > NOW() - INTERVAL '30 days')
          `,
        })
        .from(templateTagAssociations)
        .innerJoin(templates, eq(templateTagAssociations.templateId, templates.id))
        .where(eq(templateTagAssociations.tagId, tagId))

      const analytics = analyticsData[0] || {}
      tag.analytics = {
        totalTemplates: Number(analytics.totalTemplates) || 0,
        activeTemplates: Number(analytics.activeTemplates) || 0,
        averageRating: Math.round((Number(analytics.avgRating) || 0) * 10) / 10,
        totalDownloads: Number(analytics.totalDownloads) || 0,
        recentTemplates: Number(analytics.recentTemplates) || 0,
        adoptionRate: Number(analytics.totalTemplates) > 0 
          ? Math.round((Number(analytics.activeTemplates) / Number(analytics.totalTemplates)) * 100)
          : 0,
      }
    }

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Tag details fetched in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: tag,
      meta: {
        requestId,
        processingTime: elapsed,
        templatesIncluded: queryParams.includeTemplates,
        analyticsIncluded: queryParams.includeAnalytics,
      },
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid query parameters:`, error.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Tag fetch error after ${elapsed}ms:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/templates/v2/tags/[tagId] - Update tag information
 */
export async function PUT(request: NextRequest, { params }: { params: { tagId: string } }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { tagId } = params
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await request.json()
    const data = UpdateTagSchema.parse(body)

    logger.info(`[${requestId}] Updating tag: ${tagId}`)

    // Verify tag exists and check permissions
    const existingTag = await db
      .select({
        id: templateTags.id,
        name: templateTags.name,
        slug: templateTags.slug,
        isSystemTag: templateTags.isSystemTag,
        createdByUserId: templateTags.createdByUserId,
      })
      .from(templateTags)
      .where(eq(templateTags.id, tagId))
      .limit(1)

    if (existingTag.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' },
        { status: 404 }
      )
    }

    const tag = existingTag[0]

    // Check permissions (system tags can only be modified by admins, user tags by creators)
    if (tag.isSystemTag) {
      // In production, check for admin role here
      return NextResponse.json(
        { success: false, error: 'Cannot modify system tags' },
        { status: 403 }
      )
    } else if (tag.createdByUserId && tag.createdByUserId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    }

    // Handle name and slug updates
    if (data.name && data.name !== tag.name) {
      const newSlug = generateTagSlug(data.name)
      
      // Check if new slug would conflict
      const slugExists = await db
        .select({ id: templateTags.id })
        .from(templateTags)
        .where(and(eq(templateTags.slug, newSlug), sql`${templateTags.id} != ${tagId}`))
        .limit(1)

      if (slugExists.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Tag with similar name already exists',
            suggestion: `${data.name}-${Math.floor(Math.random() * 1000)}`,
          },
          { status: 409 }
        )
      }

      updateData.name = data.name
      updateData.slug = newSlug
    }

    // Add other fields if provided
    if (data.description !== undefined) updateData.description = data.description
    if (data.color !== undefined) updateData.color = data.color
    if (data.tagType !== undefined) updateData.tagType = data.tagType
    if (data.displayName !== undefined) updateData.displayName = data.displayName
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured

    // Update tag
    const updatedTag = await db
      .update(templateTags)
      .set(updateData)
      .where(eq(templateTags.id, tagId))
      .returning()

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Tag updated successfully in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: {
        id: tagId,
        name: updateData.name || tag.name,
        slug: updateData.slug || tag.slug,
        fieldsUpdated: Object.keys(updateData).filter(key => key !== 'updatedAt'),
        message: 'Tag updated successfully',
      },
      meta: {
        requestId,
        processingTime: elapsed,
      },
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid update data:`, error.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid update data',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Tag update error after ${elapsed}ms:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/templates/v2/tags/[tagId] - Delete tag with dependency checks
 */
export async function DELETE(request: NextRequest, { params }: { params: { tagId: string } }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { tagId } = params
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    logger.info(`[${requestId}] Deleting tag: ${tagId}`)

    // Verify tag exists and check permissions
    const existingTag = await db
      .select({
        id: templateTags.id,
        name: templateTags.name,
        isSystemTag: templateTags.isSystemTag,
        createdByUserId: templateTags.createdByUserId,
        usageCount: templateTags.usageCount,
      })
      .from(templateTags)
      .where(eq(templateTags.id, tagId))
      .limit(1)

    if (existingTag.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' },
        { status: 404 }
      )
    }

    const tag = existingTag[0]

    // Check permissions
    if (tag.isSystemTag) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete system tags' },
        { status: 403 }
      )
    } else if (tag.createdByUserId && tag.createdByUserId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if tag is in use
    if (tag.usageCount && tag.usageCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete tag that is currently in use',
          details: {
            usageCount: tag.usageCount,
            suggestion: 'Consider merging with another tag or deactivating instead',
          },
        },
        { status: 400 }
      )
    }

    // Delete tag (cascade will handle associations)
    await db.delete(templateTags).where(eq(templateTags.id, tagId))

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Tag deleted successfully in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: {
        id: tagId,
        name: tag.name,
        message: 'Tag deleted successfully',
      },
      meta: {
        requestId,
        processingTime: elapsed,
      },
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    logger.error(`[${requestId}] Tag deletion error after ${elapsed}ms:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates/v2/tags/[tagId]/merge - Merge tag with another tag
 */
export async function POST(request: NextRequest, { params }: { params: { tagId: string } }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { tagId } = params
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await request.json()
    const data = MergeTagSchema.parse(body)

    logger.info(`[${requestId}] Merging tag ${tagId} with ${data.targetTagId}`)

    // Verify both tags exist
    const tags = await db
      .select({
        id: templateTags.id,
        name: templateTags.name,
        isSystemTag: templateTags.isSystemTag,
        createdByUserId: templateTags.createdByUserId,
        usageCount: templateTags.usageCount,
      })
      .from(templateTags)
      .where(sql`${templateTags.id} IN (${tagId}, ${data.targetTagId})`)

    if (tags.length !== 2) {
      return NextResponse.json(
        { success: false, error: 'One or both tags not found' },
        { status: 404 }
      )
    }

    const sourceTag = tags.find(t => t.id === tagId)!
    const targetTag = tags.find(t => t.id === data.targetTagId)!

    // Check permissions
    if (sourceTag.isSystemTag || targetTag.isSystemTag) {
      return NextResponse.json(
        { success: false, error: 'Cannot merge system tags' },
        { status: 403 }
      )
    }

    // Get all template associations for source tag
    const associations = await db
      .select({ templateId: templateTagAssociations.templateId })
      .from(templateTagAssociations)
      .where(eq(templateTagAssociations.tagId, tagId))

    // Move associations to target tag (avoiding duplicates)
    for (const association of associations) {
      try {
        await db
          .insert(templateTagAssociations)
          .values({
            templateId: association.templateId,
            tagId: data.targetTagId,
            createdAt: new Date(),
          })
          .onConflictDoNothing()
      } catch (error) {
        // Ignore duplicate key errors
      }
    }

    // Remove old associations
    await db.delete(templateTagAssociations).where(eq(templateTagAssociations.tagId, tagId))

    // Delete source tag
    await db.delete(templateTags).where(eq(templateTags.id, tagId))

    // Update target tag usage count
    await updateTagUsageStats(data.targetTagId)

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Tag merge completed in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: {
        mergedTagId: tagId,
        mergedTagName: sourceTag.name,
        targetTagId: data.targetTagId,
        targetTagName: targetTag.name,
        templatesTransferred: associations.length,
        message: `Tag "${sourceTag.name}" merged into "${targetTag.name}"`,
      },
      meta: {
        requestId,
        processingTime: elapsed,
      },
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid merge data:`, error.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid merge data',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Tag merge error after ${elapsed}ms:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        requestId,
      },
      { status: 500 }
    )
  }
}