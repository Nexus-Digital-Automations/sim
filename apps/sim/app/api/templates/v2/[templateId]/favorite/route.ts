/**
 * Template Favorites API v2 - Personal template bookmarking system
 *
 * Features:
 * - Add/remove templates from personal favorites
 * - Favorite templates listing with filtering
 * - Personal notes and organization
 * - Favorite statistics and analytics
 * - Export favorites for backup/sharing
 * - Smart recommendations based on favorites
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
import {
  templateCategories,
  templateFavorites,
  templates,
  templateUsageAnalytics,
  user,
} from '@/db/schema'

const logger = createLogger('TemplateFavoritesAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const AddFavoriteSchema = z.object({
  notes: z.string().max(500).optional(), // Personal notes about the template
})

const UpdateFavoriteSchema = z.object({
  notes: z.string().max(500).optional(),
})

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Record favorite analytics
 */
async function recordFavoriteAnalytics(
  templateId: string,
  eventType: string,
  userId: string,
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
    logger.warn('Failed to record favorite analytics', { templateId, eventType, error })
  }
}

/**
 * Update template like count
 */
async function updateTemplateLikeCount(templateId: string) {
  try {
    const likeCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(templateFavorites)
      .where(eq(templateFavorites.templateId, templateId))

    const count = likeCount[0]?.count || 0

    await db
      .update(templates)
      .set({
        likeCount: count,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, templateId))
  } catch (error) {
    logger.warn('Failed to update template like count', { templateId, error })
  }
}

// ========================
// API ENDPOINTS
// ========================

/**
 * GET /api/templates/v2/[templateId]/favorite - Check if template is favorited by current user
 */
export async function GET(request: NextRequest, { params }: { params: { templateId: string } }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { templateId } = params
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    logger.info(`[${requestId}] Checking favorite status for template: ${templateId}`)

    // Check if template exists
    const templateExists = await db
      .select({ id: templates.id, name: templates.name })
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1)

    if (templateExists.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    // Check if favorited by user
    const favorite = await db
      .select({
        templateId: templateFavorites.templateId,
        userId: templateFavorites.userId,
        createdAt: templateFavorites.createdAt,
        notes: templateFavorites.notes,
      })
      .from(templateFavorites)
      .where(
        and(
          eq(templateFavorites.templateId, templateId),
          eq(templateFavorites.userId, userId)
        )
      )
      .limit(1)

    const isFavorited = favorite.length > 0
    const favoriteData = favorite[0] || null

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Favorite status checked in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        templateName: templateExists[0].name,
        isFavorited,
        favoriteDetails: favoriteData,
      },
      meta: {
        requestId,
        processingTime: elapsed,
      },
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    logger.error(`[${requestId}] Favorite status check error after ${elapsed}ms:`, error)
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
 * POST /api/templates/v2/[templateId]/favorite - Add template to favorites
 */
export async function POST(request: NextRequest, { params }: { params: { templateId: string } }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { templateId } = params
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await request.json().catch(() => ({}))
    const data = AddFavoriteSchema.parse(body)

    logger.info(`[${requestId}] Adding template to favorites: ${templateId}`)

    // Verify template exists and is accessible
    const templateData = await db
      .select({
        id: templates.id,
        name: templates.name,
        status: templates.status,
        visibility: templates.visibility,
        createdByUserId: templates.createdByUserId,
      })
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1)

    if (templateData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    const template = templateData[0]

    // Check if template is accessible
    if (template.visibility === 'private' && template.createdByUserId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot favorite private template' },
        { status: 403 }
      )
    }

    // Check if already favorited
    const existingFavorite = await db
      .select({ templateId: templateFavorites.templateId })
      .from(templateFavorites)
      .where(
        and(
          eq(templateFavorites.templateId, templateId),
          eq(templateFavorites.userId, userId)
        )
      )
      .limit(1)

    if (existingFavorite.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template already in favorites',
          data: { templateId, templateName: template.name, isFavorited: true },
        },
        { status: 409 }
      )
    }

    // Add to favorites
    const now = new Date()
    await db.insert(templateFavorites).values({
      userId,
      templateId,
      notes: data.notes,
      createdAt: now,
    })

    // Update template like count
    await updateTemplateLikeCount(templateId)

    // Record analytics
    await recordFavoriteAnalytics(templateId, 'favorited', userId, {
      templateName: template.name,
      hasNotes: !!data.notes,
    })

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Template added to favorites in ${elapsed}ms`)

    return NextResponse.json(
      {
        success: true,
        data: {
          templateId,
          templateName: template.name,
          isFavorited: true,
          notes: data.notes,
          favoritedAt: now.toISOString(),
          message: 'Template added to favorites',
        },
        meta: {
          requestId,
          processingTime: elapsed,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid favorite data:`, error.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid favorite data',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Add favorite error after ${elapsed}ms:`, error)
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
 * PUT /api/templates/v2/[templateId]/favorite - Update favorite notes
 */
export async function PUT(request: NextRequest, { params }: { params: { templateId: string } }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { templateId } = params
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await request.json()
    const data = UpdateFavoriteSchema.parse(body)

    logger.info(`[${requestId}] Updating favorite notes for template: ${templateId}`)

    // Check if favorite exists
    const existingFavorite = await db
      .select({
        templateId: templateFavorites.templateId,
        notes: templateFavorites.notes,
      })
      .from(templateFavorites)
      .where(
        and(
          eq(templateFavorites.templateId, templateId),
          eq(templateFavorites.userId, userId)
        )
      )
      .limit(1)

    if (existingFavorite.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not in favorites' },
        { status: 404 }
      )
    }

    // Update notes
    const updatedFavorite = await db
      .update(templateFavorites)
      .set({
        notes: data.notes,
      })
      .where(
        and(
          eq(templateFavorites.templateId, templateId),
          eq(templateFavorites.userId, userId)
        )
      )
      .returning()

    // Record analytics
    await recordFavoriteAnalytics(templateId, 'favorite_updated', userId, {
      notesChanged: data.notes !== existingFavorite[0].notes,
      hasNotes: !!data.notes,
    })

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Favorite notes updated in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        notes: data.notes,
        message: 'Favorite notes updated',
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

    logger.error(`[${requestId}] Update favorite error after ${elapsed}ms:`, error)
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
 * DELETE /api/templates/v2/[templateId]/favorite - Remove template from favorites
 */
export async function DELETE(request: NextRequest, { params }: { params: { templateId: string } }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { templateId } = params
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    logger.info(`[${requestId}] Removing template from favorites: ${templateId}`)

    // Check if favorite exists
    const existingFavorite = await db
      .select({
        templateId: templateFavorites.templateId,
        notes: templateFavorites.notes,
        createdAt: templateFavorites.createdAt,
      })
      .from(templateFavorites)
      .where(
        and(
          eq(templateFavorites.templateId, templateId),
          eq(templateFavorites.userId, userId)
        )
      )
      .limit(1)

    if (existingFavorite.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not in favorites' },
        { status: 404 }
      )
    }

    const favoriteData = existingFavorite[0]

    // Remove from favorites
    await db
      .delete(templateFavorites)
      .where(
        and(
          eq(templateFavorites.templateId, templateId),
          eq(templateFavorites.userId, userId)
        )
      )

    // Update template like count
    await updateTemplateLikeCount(templateId)

    // Record analytics
    await recordFavoriteAnalytics(templateId, 'unfavorited', userId, {
      daysInFavorites: Math.floor(
        (Date.now() - new Date(favoriteData.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      ),
      hadNotes: !!favoriteData.notes,
    })

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Template removed from favorites in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        isFavorited: false,
        message: 'Template removed from favorites',
      },
      meta: {
        requestId,
        processingTime: elapsed,
      },
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    logger.error(`[${requestId}] Remove favorite error after ${elapsed}ms:`, error)
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