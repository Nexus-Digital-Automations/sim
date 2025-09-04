/**
 * Collection Template Management API - Individual Template Operations in Collections
 *
 * This API provides management of specific templates within collections:
 * - Remove templates from collections with proper permission checks
 * - Update template metadata within collections (sort order, notes)
 * - Template reordering and collection organization
 * - Analytics tracking for template collection operations
 *
 * Features:
 * - Remove templates from collections with validation
 * - Update template sort order and notes
 * - Permission-based access control
 * - Analytics integration and tracking
 * - Automatic collection template count updates
 *
 * @author Claude Development System
 * @version 2.0.0
 */

import crypto from 'crypto'
import { and, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { templateCollectionItems, templateCollections } from '@/db/schema'

// Initialize structured logger with request tracking
const logger = createLogger('CollectionTemplateManagementAPI')

// Request validation schemas
const UpdateTemplateInCollectionSchema = z.object({
  sortOrder: z.number().int().min(0).optional().describe('Updated sort position'),
  notes: z.string().max(500).optional().describe('Updated notes about template'),
})

/**
 * DELETE /api/templates/v2/collections/[collectionId]/templates/[templateId] - Remove template from collection
 *
 * Features:
 * - Remove template from collection with permission validation
 * - Update collection template count automatically
 * - Analytics tracking for template removals
 * - Proper error handling and response formatting
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { collectionId: string; templateId: string } }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const { collectionId, templateId } = params

  logger.info(
    `[${requestId}] DELETE /collections/${collectionId}/templates/${templateId} - Remove template from collection`,
    {
      collectionId,
      templateId,
      userAgent: request.headers.get('user-agent')?.substring(0, 100),
    }
  )

  try {
    // Authenticate user
    const session = await auth(request)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id

    // Check collection ownership
    const [existingCollection] = await db
      .select({
        createdByUserId: templateCollections.createdByUserId,
        name: templateCollections.name,
        templateCount: templateCollections.templateCount,
      })
      .from(templateCollections)
      .where(eq(templateCollections.id, collectionId))

    if (!existingCollection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (existingCollection.createdByUserId !== userId) {
      return NextResponse.json(
        { error: 'Permission denied: not collection owner' },
        { status: 403 }
      )
    }

    // Check if template exists in collection
    const [existingItem] = await db
      .select({
        templateId: templateCollectionItems.templateId,
        sortOrder: templateCollectionItems.sortOrder,
        addedAt: templateCollectionItems.addedAt,
      })
      .from(templateCollectionItems)
      .where(
        and(
          eq(templateCollectionItems.collectionId, collectionId),
          eq(templateCollectionItems.templateId, templateId)
        )
      )

    if (!existingItem) {
      return NextResponse.json({ error: 'Template not found in collection' }, { status: 404 })
    }

    logger.debug(`[${requestId}] Template found in collection`, {
      templateId,
      sortOrder: existingItem.sortOrder,
      addedAt: existingItem.addedAt,
    })

    // Remove template from collection using transaction
    await db.transaction(async (tx) => {
      // Delete collection item
      await tx
        .delete(templateCollectionItems)
        .where(
          and(
            eq(templateCollectionItems.collectionId, collectionId),
            eq(templateCollectionItems.templateId, templateId)
          )
        )

      // Update collection template count
      await tx
        .update(templateCollections)
        .set({
          templateCount: Math.max(0, existingCollection.templateCount - 1),
          updatedAt: new Date(),
        })
        .where(eq(templateCollections.id, collectionId))
    })

    // Record analytics for template removal
    try {
      logger.debug(`[${requestId}] Template removed from collection`, {
        collectionId,
        templateId,
        previousSortOrder: existingItem.sortOrder,
        newTemplateCount: Math.max(0, existingCollection.templateCount - 1),
      })
    } catch (analyticsError) {
      logger.warn(`[${requestId}] Analytics recording failed`, {
        error: analyticsError instanceof Error ? analyticsError.message : String(analyticsError),
      })
    }

    const response = {
      success: true,
      message: 'Template removed from collection successfully',
      data: {
        collectionId,
        templateId,
        removedAt: new Date().toISOString(),
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        newTemplateCount: Math.max(0, existingCollection.templateCount - 1),
      },
    }

    logger.info(`[${requestId}] Template removal completed`, {
      collectionId,
      templateId,
      newTemplateCount: Math.max(0, existingCollection.templateCount - 1),
      processingTime: Date.now() - Number.parseInt(requestId, 16),
    })

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    logger.error(`[${requestId}] Template removal failed`, {
      collectionId,
      templateId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      { error: 'Failed to remove template from collection' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/templates/v2/collections/[collectionId]/templates/[templateId] - Update template in collection
 *
 * Features:
 * - Update template sort order and notes within collection
 * - Permission checks for collection ownership
 * - Analytics tracking for template updates
 * - Comprehensive validation and error handling
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { collectionId: string; templateId: string } }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const { collectionId, templateId } = params

  logger.info(
    `[${requestId}] PUT /collections/${collectionId}/templates/${templateId} - Update template in collection`,
    {
      collectionId,
      templateId,
      userAgent: request.headers.get('user-agent')?.substring(0, 100),
    }
  )

  try {
    // Authenticate user
    const session = await auth(request)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id

    // Parse and validate request body
    const body = await request.json()
    const validatedData = UpdateTemplateInCollectionSchema.parse(body)

    logger.debug(`[${requestId}] Validated update data`, {
      updateFields: Object.keys(validatedData),
      userId,
    })

    // Check collection ownership
    const [existingCollection] = await db
      .select({
        createdByUserId: templateCollections.createdByUserId,
        name: templateCollections.name,
      })
      .from(templateCollections)
      .where(eq(templateCollections.id, collectionId))

    if (!existingCollection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (existingCollection.createdByUserId !== userId) {
      return NextResponse.json(
        { error: 'Permission denied: not collection owner' },
        { status: 403 }
      )
    }

    // Check if template exists in collection
    const [existingItem] = await db
      .select({
        templateId: templateCollectionItems.templateId,
        sortOrder: templateCollectionItems.sortOrder,
        notes: templateCollectionItems.notes,
        addedAt: templateCollectionItems.addedAt,
      })
      .from(templateCollectionItems)
      .where(
        and(
          eq(templateCollectionItems.collectionId, collectionId),
          eq(templateCollectionItems.templateId, templateId)
        )
      )

    if (!existingItem) {
      return NextResponse.json({ error: 'Template not found in collection' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}

    if (validatedData.sortOrder !== undefined) {
      updateData.sortOrder = validatedData.sortOrder
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }

    // If no updates provided, return current data
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No updates provided',
        data: existingItem,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      })
    }

    // Update template in collection
    const [updatedItem] = await db
      .update(templateCollectionItems)
      .set(updateData)
      .where(
        and(
          eq(templateCollectionItems.collectionId, collectionId),
          eq(templateCollectionItems.templateId, templateId)
        )
      )
      .returning({
        collectionId: templateCollectionItems.collectionId,
        templateId: templateCollectionItems.templateId,
        sortOrder: templateCollectionItems.sortOrder,
        notes: templateCollectionItems.notes,
        addedAt: templateCollectionItems.addedAt,
      })

    // Update collection's updated timestamp if sort order changed
    if (validatedData.sortOrder !== undefined) {
      await db
        .update(templateCollections)
        .set({ updatedAt: new Date() })
        .where(eq(templateCollections.id, collectionId))
    }

    // Record analytics for template update
    try {
      logger.debug(`[${requestId}] Template updated in collection`, {
        collectionId,
        templateId,
        updatedFields: Object.keys(updateData),
        newSortOrder: updatedItem.sortOrder,
      })
    } catch (analyticsError) {
      logger.warn(`[${requestId}] Analytics recording failed`, {
        error: analyticsError instanceof Error ? analyticsError.message : String(analyticsError),
      })
    }

    const response = {
      success: true,
      message: 'Template updated in collection successfully',
      data: updatedItem,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        updatedFields: Object.keys(updateData),
      },
    }

    logger.info(`[${requestId}] Template update completed`, {
      collectionId,
      templateId,
      updatedFields: Object.keys(updateData).length,
      newSortOrder: updatedItem.sortOrder,
      processingTime: Date.now() - Number.parseInt(requestId, 16),
    })

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    logger.error(`[${requestId}] Template update failed`, {
      collectionId,
      templateId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update template in collection' }, { status: 500 })
  }
}

/**
 * GET /api/templates/v2/collections/[collectionId]/templates/[templateId] - Get template details in collection
 *
 * Features:
 * - Retrieve template metadata within collection context
 * - Include collection-specific data (sort order, notes, added date)
 * - Permission checks for collection access
 * - Analytics tracking for template views
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { collectionId: string; templateId: string } }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const { collectionId, templateId } = params

  logger.info(
    `[${requestId}] GET /collections/${collectionId}/templates/${templateId} - Get template in collection`,
    {
      collectionId,
      templateId,
      userAgent: request.headers.get('user-agent')?.substring(0, 100),
    }
  )

  try {
    // Get authenticated user context
    const session = await auth(request)
    const currentUserId = session?.user?.id

    // Check collection access
    const [existingCollection] = await db
      .select({
        createdByUserId: templateCollections.createdByUserId,
        name: templateCollections.name,
        isPublic: templateCollections.isPublic,
      })
      .from(templateCollections)
      .where(eq(templateCollections.id, collectionId))

    if (!existingCollection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Check collection access permissions
    if (!existingCollection.isPublic && existingCollection.createdByUserId !== currentUserId) {
      return NextResponse.json({ error: 'Collection not accessible' }, { status: 403 })
    }

    // Get template details within collection
    const [templateItem] = await db
      .select({
        collectionId: templateCollectionItems.collectionId,
        templateId: templateCollectionItems.templateId,
        sortOrder: templateCollectionItems.sortOrder,
        notes: templateCollectionItems.notes,
        addedAt: templateCollectionItems.addedAt,
      })
      .from(templateCollectionItems)
      .where(
        and(
          eq(templateCollectionItems.collectionId, collectionId),
          eq(templateCollectionItems.templateId, templateId)
        )
      )

    if (!templateItem) {
      return NextResponse.json({ error: 'Template not found in collection' }, { status: 404 })
    }

    logger.debug(`[${requestId}] Template found in collection`, {
      templateId,
      sortOrder: templateItem.sortOrder,
      addedAt: templateItem.addedAt,
      hasNotes: !!templateItem.notes,
    })

    // Record analytics for template view
    try {
      logger.debug(`[${requestId}] Template viewed in collection context`, {
        collectionId,
        templateId,
        viewerId: currentUserId,
        isOwner: existingCollection.createdByUserId === currentUserId,
      })
    } catch (analyticsError) {
      logger.warn(`[${requestId}] Analytics recording failed`, {
        error: analyticsError instanceof Error ? analyticsError.message : String(analyticsError),
      })
    }

    const response = {
      success: true,
      data: {
        ...templateItem,
        collection: {
          id: collectionId,
          name: existingCollection.name,
          isPublic: existingCollection.isPublic,
          isOwner: existingCollection.createdByUserId === currentUserId,
        },
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - Number.parseInt(requestId, 16),
      },
    }

    logger.info(`[${requestId}] Template detail retrieval completed`, {
      collectionId,
      templateId,
      sortOrder: templateItem.sortOrder,
      processingTime: Date.now() - Number.parseInt(requestId, 16),
    })

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    logger.error(`[${requestId}] Template detail retrieval failed`, {
      collectionId,
      templateId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      { error: 'Failed to retrieve template from collection' },
      { status: 500 }
    )
  }
}
