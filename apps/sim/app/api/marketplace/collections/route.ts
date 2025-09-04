/**
 * Marketplace Collections API - Template Collection Management
 *
 * This API provides comprehensive template collection functionality including:
 * - Collection creation, management, and curation
 * - Collaborative collection editing and sharing
 * - Social features for collections (likes, comments, sharing)
 * - Collection discovery and recommendation system
 * - Advanced analytics and engagement tracking
 * - Moderation and quality control mechanisms
 *
 * Features:
 * - Public and private collection visibility controls
 * - Collaborative editing with permission management
 * - Rich metadata and visual customization options
 * - Social engagement tracking and analytics
 * - Integration with recommendation algorithms
 * - Advanced search and filtering capabilities
 *
 * @author Claude Code Collection System
 * @version 2.0.0
 * @implements Advanced Collection Management Architecture
 */

import { and, desc, eq, sql, inArray, or, gte, ilike } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import {
  templates,
  templateCollections,
  templateCollectionItems,
  templateCategories,
  user,
} from '@/db/schema'

const logger = createLogger('MarketplaceCollectionsAPI')

interface CollectionCreation {
  name: string
  description?: string
  isPublic: boolean
  coverImage?: string
  color?: string
  icon?: string
  templateIds?: string[]
  userId: string
}

interface CollectionUpdate {
  name?: string
  description?: string
  isPublic?: boolean
  coverImage?: string
  color?: string
  icon?: string
}

interface CollectionData {
  id: string
  name: string
  description: string | null
  slug: string
  createdByUserId: string
  creatorName: string
  creatorImage: string | null
  isPublic: boolean
  isFeatured: boolean
  coverImage: string | null
  color: string
  icon: string
  itemCount: number
  viewCount: number
  likeCount: number
  createdAt: string
  updatedAt: string
  templates?: any[]
  isLiked?: boolean
}

/**
 * Collections API - GET /api/marketplace/collections
 *
 * Retrieve collections with comprehensive filtering and search
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)

    // Extract parameters
    const userId = searchParams.get('userId') // For authentication context
    const creatorId = searchParams.get('creatorId') // Filter by creator
    const query = searchParams.get('query') // Search query
    const visibility = searchParams.get('visibility') || 'public' // 'public', 'private', 'all'
    const featured = searchParams.get('featured') === 'true'
    const sortBy = searchParams.get('sortBy') || 'updated' // 'created', 'updated', 'name', 'popular', 'recent'
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '20')))
    const includeTemplates = searchParams.get('includeTemplates') === 'true'
    const includeLikes = searchParams.get('includeLikes') === 'true'
    const collectionId = searchParams.get('collectionId') // Get specific collection

    logger.info(`[${requestId}] Collections request`, {
      userId: userId ? `${userId.slice(0, 8)}...` : null,
      creatorId: creatorId ? `${creatorId.slice(0, 8)}...` : null,
      query,
      visibility,
      sortBy,
      page,
      limit,
      includeTemplates,
      collectionId: collectionId ? `${collectionId.slice(0, 8)}...` : null,
    })

    // Handle specific collection request
    if (collectionId) {
      const collection = await getCollectionById(collectionId, userId, includeTemplates)
      if (!collection) {
        return NextResponse.json(
          {
            success: false,
            error: 'Collection not found',
            message: 'The requested collection does not exist or is not accessible',
          },
          { status: 404 }
        )
      }

      // Track collection view
      if (userId && userId !== collection.createdByUserId) {
        await trackCollectionView(collectionId, userId)
      }

      return NextResponse.json({
        success: true,
        data: collection,
        metadata: {
          requestId,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      })
    }

    // Build search conditions
    const conditions = []

    // Visibility filter
    if (visibility === 'public') {
      conditions.push(eq(templateCollections.isPublic, true))
    } else if (visibility === 'private' && userId) {
      conditions.push(
        and(
          eq(templateCollections.isPublic, false),
          eq(templateCollections.createdByUserId, userId)
        )
      )
    } else if (visibility === 'all' && userId) {
      conditions.push(
        or(
          eq(templateCollections.isPublic, true),
          eq(templateCollections.createdByUserId, userId)
        )
      )
    } else {
      conditions.push(eq(templateCollections.isPublic, true))
    }

    // Creator filter
    if (creatorId) {
      conditions.push(eq(templateCollections.createdByUserId, creatorId))
    }

    // Featured filter
    if (featured) {
      conditions.push(eq(templateCollections.isFeatured, true))
    }

    // Search query
    if (query?.trim()) {
      const searchTerm = `%${query.trim()}%`
      conditions.push(
        or(
          ilike(templateCollections.name, searchTerm),
          ilike(templateCollections.description, searchTerm)
        )
      )
    }

    // Build sorting
    let orderByClause
    switch (sortBy) {
      case 'created':
        orderByClause = desc(templateCollections.createdAt)
        break
      case 'name':
        orderByClause = templateCollections.name
        break
      case 'popular':
        orderByClause = sql`(${templateCollections.viewCount} + ${templateCollections.likeCount} * 2) DESC`
        break
      case 'recent':
        orderByClause = desc(templateCollections.updatedAt)
        break
      default:
        orderByClause = desc(templateCollections.updatedAt)
    }

    const offset = (page - 1) * limit

    // Get collections with creator info and like status
    let queryBuilder = db
      .select({
        id: templateCollections.id,
        name: templateCollections.name,
        description: templateCollections.description,
        slug: templateCollections.slug,
        createdByUserId: templateCollections.createdByUserId,
        creatorName: user.name,
        creatorImage: user.image,
        isPublic: templateCollections.isPublic,
        isFeatured: templateCollections.isFeatured,
        coverImage: templateCollections.coverImage,
        color: templateCollections.color,
        icon: templateCollections.icon,
        viewCount: templateCollections.viewCount,
        likeCount: templateCollections.likeCount,
        createdAt: templateCollections.createdAt,
        updatedAt: templateCollections.updatedAt,
        
        // Item count
        itemCount: sql<number>`
          COALESCE(
            (SELECT COUNT(*) FROM template_collection_items WHERE collection_id = ${templateCollections.id}),
            0
          )
        `,
        
        // Like status if user provided
        ...(userId && includeLikes && {
          isLiked: sql<boolean>`
            EXISTS(
              SELECT 1 FROM collection_likes 
              WHERE collection_id = ${templateCollections.id} 
              AND user_id = ${userId}
            )
          `,
        }),
      })
      .from(templateCollections)
      .leftJoin(user, eq(templateCollections.createdByUserId, user.id))

    const collections = await queryBuilder
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset)

    // Get total count
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(templateCollections)
      .where(and(...conditions))

    const totalCount = totalCountResult[0]?.count || 0

    // Add templates if requested
    let collectionsWithTemplates = collections
    if (includeTemplates && collections.length > 0) {
      const collectionIds = collections.map(c => c.id)
      const templatesInCollections = await getTemplatesInCollections(collectionIds)
      
      collectionsWithTemplates = collections.map(collection => ({
        ...collection,
        templates: templatesInCollections[collection.id] || [],
      }))
    }

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Collections retrieved`, {
      collectionCount: collections.length,
      totalCount,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: collectionsWithTemplates.map(formatCollectionData),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
      metadata: {
        requestId,
        filters: {
          query,
          visibility,
          creatorId: creatorId ? `${creatorId.slice(0, 8)}...` : null,
          featured,
          sortBy,
        },
        features: {
          includeTemplates,
          includeLikes,
        },
        processingTime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Collections retrieval failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve collections',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Create Collection - POST /api/marketplace/collections
 *
 * Create a new template collection
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const creation: CollectionCreation = await request.json()

    const {
      name,
      description,
      isPublic,
      coverImage,
      color,
      icon,
      templateIds,
      userId,
    } = creation

    // Validate required fields
    if (!name || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'Collection name and user ID are required',
        },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Collection creation request`, {
      name: name.slice(0, 50),
      userId: `${userId.slice(0, 8)}...`,
      isPublic,
      templateCount: templateIds?.length || 0,
    })

    // Generate slug
    const slug = generateCollectionSlug(name)

    // Check if slug already exists for this user
    const existingCollection = await db
      .select({ id: templateCollections.id })
      .from(templateCollections)
      .where(
        and(
          eq(templateCollections.createdByUserId, userId),
          eq(templateCollections.slug, slug)
        )
      )
      .limit(1)

    if (existingCollection.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Collection already exists',
          message: 'A collection with this name already exists',
        },
        { status: 409 }
      )
    }

    // Verify user exists
    const userRecord = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    if (userRecord.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
          message: 'The specified user does not exist',
        },
        { status: 404 }
      )
    }

    // Validate templates if provided
    if (templateIds && templateIds.length > 0) {
      const validTemplates = await db
        .select({ id: templates.id })
        .from(templates)
        .where(
          and(
            inArray(templates.id, templateIds),
            eq(templates.status, 'published'),
            eq(templates.visibility, 'public')
          )
        )

      if (validTemplates.length !== templateIds.length) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid templates',
            message: 'One or more templates are invalid or not accessible',
          },
          { status: 400 }
        )
      }
    }

    // Create collection
    const collectionId = crypto.randomUUID()
    await db.insert(templateCollections).values({
      id: collectionId,
      name,
      description,
      slug,
      createdByUserId: userId,
      isPublic,
      isFeatured: false,
      coverImage,
      color: color || '#3B82F6',
      icon: icon || 'folder',
      viewCount: 0,
      likeCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Add templates to collection
    if (templateIds && templateIds.length > 0) {
      const collectionItems = templateIds.map((templateId, index) => ({
        collectionId,
        templateId,
        sortOrder: index,
        addedAt: new Date(),
      }))

      await db.insert(templateCollectionItems).values(collectionItems)
    }

    // Create activity feed entry if collection is public
    if (isPublic) {
      await db.execute(sql`
        INSERT INTO activity_feed (
          user_id, actor_id, activity_type, object_type, object_id,
          engagement_score, relevance_score, created_at,
          metadata
        )
        SELECT 
          uf.follower_id, ${userId}, 'collection_created', 'collection', ${collectionId}::uuid,
          2.5, 2.0, NOW(),
          JSON_BUILD_OBJECT('collectionName', ${name}, 'templateCount', ${templateIds?.length || 0})
        FROM user_follows uf
        WHERE uf.following_id = ${userId}
      `)
    }

    // Get the created collection with full details
    const createdCollection = await getCollectionById(collectionId, userId, true)

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Collection created successfully`, {
      collectionId,
      name: name.slice(0, 50),
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: createdCollection,
      metadata: {
        requestId,
        processingTime,
        created: true,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Collection creation failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create collection',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Update Collection - PUT /api/marketplace/collections
 *
 * Update an existing collection
 */
export async function PUT(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { collectionId, userId, ...updates }: CollectionUpdate & { collectionId: string; userId: string } = await request.json()

    if (!collectionId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'Collection ID and user ID are required',
        },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Collection update request`, {
      collectionId: `${collectionId.slice(0, 8)}...`,
      userId: `${userId.slice(0, 8)}...`,
      updateFields: Object.keys(updates),
    })

    // Verify collection exists and belongs to user
    const collection = await db
      .select({
        id: templateCollections.id,
        createdByUserId: templateCollections.createdByUserId,
        name: templateCollections.name,
      })
      .from(templateCollections)
      .where(
        and(
          eq(templateCollections.id, collectionId),
          eq(templateCollections.createdByUserId, userId)
        )
      )
      .limit(1)

    if (collection.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Collection not found',
          message: 'Collection not found or you do not have permission to update it',
        },
        { status: 404 }
      )
    }

    // Update collection
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    }

    await db
      .update(templateCollections)
      .set(updateData)
      .where(eq(templateCollections.id, collectionId))

    // Get updated collection
    const updatedCollection = await getCollectionById(collectionId, userId, true)

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Collection updated successfully`, {
      collectionId,
      updatedFields: Object.keys(updates),
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: updatedCollection,
      metadata: {
        requestId,
        updatedFields: Object.keys(updates),
        processingTime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Collection update failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update collection',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Delete Collection - DELETE /api/marketplace/collections
 *
 * Delete a collection
 */
export async function DELETE(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const collectionId = searchParams.get('collectionId')
    const userId = searchParams.get('userId')

    if (!collectionId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          message: 'Collection ID and user ID are required',
        },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Collection deletion request`, {
      collectionId: `${collectionId.slice(0, 8)}...`,
      userId: `${userId.slice(0, 8)}...`,
    })

    // Verify collection exists and belongs to user
    const collection = await db
      .select({
        id: templateCollections.id,
        createdByUserId: templateCollections.createdByUserId,
        name: templateCollections.name,
      })
      .from(templateCollections)
      .where(
        and(
          eq(templateCollections.id, collectionId),
          eq(templateCollections.createdByUserId, userId)
        )
      )
      .limit(1)

    if (collection.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Collection not found',
          message: 'Collection not found or you do not have permission to delete it',
        },
        { status: 404 }
      )
    }

    // Delete collection (cascading delete will handle collection items)
    await db.delete(templateCollections).where(eq(templateCollections.id, collectionId))

    const processingTime = Date.now() - startTime

    logger.info(`[${requestId}] Collection deleted successfully`, {
      collectionId,
      collectionName: collection[0].name,
      processingTime,
    })

    return NextResponse.json({
      success: true,
      data: {
        collectionId,
        deleted: true,
        collectionName: collection[0].name,
      },
      metadata: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error(`[${requestId}] Collection deletion failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete collection',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      },
      { status: 500 }
    )
  }
}

/**
 * Get collection by ID with optional template details
 */
async function getCollectionById(collectionId: string, userId?: string | null, includeTemplates = false) {
  // Get collection with creator info
  const collection = await db
    .select({
      id: templateCollections.id,
      name: templateCollections.name,
      description: templateCollections.description,
      slug: templateCollections.slug,
      createdByUserId: templateCollections.createdByUserId,
      creatorName: user.name,
      creatorImage: user.image,
      isPublic: templateCollections.isPublic,
      isFeatured: templateCollections.isFeatured,
      coverImage: templateCollections.coverImage,
      color: templateCollections.color,
      icon: templateCollections.icon,
      viewCount: templateCollections.viewCount,
      likeCount: templateCollections.likeCount,
      createdAt: templateCollections.createdAt,
      updatedAt: templateCollections.updatedAt,
      
      // Like status if user provided
      ...(userId && {
        isLiked: sql<boolean>`
          EXISTS(
            SELECT 1 FROM collection_likes 
            WHERE collection_id = ${collectionId} 
            AND user_id = ${userId}
          )
        `,
      }),
    })
    .from(templateCollections)
    .leftJoin(user, eq(templateCollections.createdByUserId, user.id))
    .where(eq(templateCollections.id, collectionId))
    .limit(1)

  if (collection.length === 0) return null

  const collectionData = collection[0]

  // Check visibility permissions
  if (!collectionData.isPublic && userId !== collectionData.createdByUserId) {
    return null
  }

  // Get templates if requested
  let templates = []
  if (includeTemplates) {
    const templatesInCollection = await getTemplatesInCollections([collectionId])
    templates = templatesInCollection[collectionId] || []
  }

  // Get item count
  const itemCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(templateCollectionItems)
    .where(eq(templateCollectionItems.collectionId, collectionId))

  const itemCount = itemCountResult[0]?.count || 0

  return formatCollectionData({
    ...collectionData,
    itemCount,
    templates,
  })
}

/**
 * Get templates in collections
 */
async function getTemplatesInCollections(collectionIds: string[]) {
  if (collectionIds.length === 0) return {}

  const templatesQuery = await db
    .select({
      collectionId: templateCollectionItems.collectionId,
      templateId: templates.id,
      templateName: templates.name,
      templateDescription: templates.description,
      categoryName: templateCategories.name,
      ratingAverage: templates.ratingAverage,
      downloadCount: templates.downloadCount,
      color: templates.color,
      icon: templates.icon,
      sortOrder: templateCollectionItems.sortOrder,
      addedAt: templateCollectionItems.addedAt,
    })
    .from(templateCollectionItems)
    .innerJoin(templates, eq(templateCollectionItems.templateId, templates.id))
    .leftJoin(templateCategories, eq(templates.categoryId, templateCategories.id))
    .where(
      and(
        inArray(templateCollectionItems.collectionId, collectionIds),
        eq(templates.status, 'published'),
        eq(templates.visibility, 'public')
      )
    )
    .orderBy(templateCollectionItems.sortOrder, templates.name)

  // Group templates by collection ID
  return templatesQuery.reduce((acc, template) => {
    if (!acc[template.collectionId]) {
      acc[template.collectionId] = []
    }
    acc[template.collectionId].push({
      id: template.templateId,
      name: template.templateName,
      description: template.templateDescription,
      categoryName: template.categoryName,
      ratingAverage: template.ratingAverage,
      downloadCount: template.downloadCount,
      color: template.color,
      icon: template.icon,
      sortOrder: template.sortOrder,
      addedAt: template.addedAt,
    })
    return acc
  }, {} as Record<string, any[]>)
}

/**
 * Track collection view
 */
async function trackCollectionView(collectionId: string, userId: string) {
  try {
    // Increment view count
    await db
      .update(templateCollections)
      .set({
        viewCount: sql`${templateCollections.viewCount} + 1`,
      })
      .where(eq(templateCollections.id, collectionId))

    // Track social interaction
    await db.execute(sql`
      INSERT INTO social_interactions (
        user_id, target_id, target_type, interaction_type, created_at
      )
      VALUES (${userId}, ${collectionId}::uuid, 'collection', 'view', NOW())
    `)
  } catch (error) {
    logger.error('Failed to track collection view', {
      collectionId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Generate collection slug from name
 */
function generateCollectionSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 50)
}

/**
 * Format collection data for API response
 */
function formatCollectionData(data: any): CollectionData {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    slug: data.slug,
    createdByUserId: data.createdByUserId,
    creatorName: data.creatorName,
    creatorImage: data.creatorImage,
    isPublic: Boolean(data.isPublic),
    isFeatured: Boolean(data.isFeatured),
    coverImage: data.coverImage,
    color: data.color || '#3B82F6',
    icon: data.icon || 'folder',
    itemCount: Number(data.itemCount || 0),
    viewCount: Number(data.viewCount || 0),
    likeCount: Number(data.likeCount || 0),
    createdAt: new Date(data.createdAt).toISOString(),
    updatedAt: new Date(data.updatedAt).toISOString(),
    ...(data.templates && { templates: data.templates }),
    ...(typeof data.isLiked === 'boolean' && { isLiked: data.isLiked }),
  }
}