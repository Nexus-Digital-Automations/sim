/**
 * Community Template Collections API
 *
 * Manages template collections with comprehensive social features including creation,
 * sharing, following, and collaborative management. Provides powerful organization
 * and discovery capabilities for community templates.
 *
 * FEATURES:
 * - Template collection creation and management
 * - Collection sharing with privacy controls
 * - Collection following and social features
 * - Collaborative collection management
 * - Collection analytics and insights
 * - Template organization and categorization
 * - Collection discovery and recommendations
 * - Import/export functionality
 *
 * SECURITY:
 * - Authentication required for collection management
 * - Privacy controls and visibility settings
 * - Permission-based collaboration
 * - Rate limiting and abuse prevention
 * - Input validation and sanitization
 *
 * @created 2025-09-04
 * @author Community Collections API
 */

import { sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { CommunityUtils } from '@/lib/community'
import { ratelimit } from '@/lib/ratelimit'
import { db } from '@/db'

// ========================
// VALIDATION SCHEMAS
// ========================

const CreateCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).default('public'),
  tags: z.array(z.string()).max(10).default([]),
  coverImage: z.string().url().optional(),
  templateIds: z.array(z.string()).max(50).default([]),
  isCollaborative: z.boolean().default(false),
  collaborators: z.array(z.string()).max(10).default([]),
})

const UpdateCollectionSchema = CreateCollectionSchema.partial().omit({ templateIds: true })

const CollectionQuerySchema = z.object({
  userId: z.string().optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
  isFeatured: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['created', 'updated', 'name', 'templates', 'followers']).default('updated'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
  includeTemplates: z.boolean().default(false),
  includeCollaborators: z.boolean().default(false),
})

const ManageTemplatesSchema = z.object({
  action: z.enum(['add', 'remove', 'reorder']),
  templateIds: z.array(z.string()).min(1),
  positions: z.array(z.number()).optional(), // For reordering
})

// ========================
// API HANDLERS
// ========================

/**
 * GET /api/community/social/collections - Retrieve collections
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[Collections] Processing GET request for collections')

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())

    // Convert string parameters to proper types for validation schema
    // Handle type conversions to prevent TypeScript errors in schema validation
    const processedParams: Record<string, any> = { ...queryParams }
    if (processedParams.tags) {
      processedParams.tags = (processedParams.tags as string)
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    }
    if (processedParams.isFeatured) processedParams.isFeatured = (processedParams.isFeatured as string) === 'true'
    if (processedParams.includeTemplates)
      processedParams.includeTemplates = (processedParams.includeTemplates as string) === 'true'
    if (processedParams.includeCollaborators)
      processedParams.includeCollaborators = (processedParams.includeCollaborators as string) === 'true'
    if (processedParams.limit) processedParams.limit = Number.parseInt(processedParams.limit as string)
    if (processedParams.offset) processedParams.offset = Number.parseInt(processedParams.offset as string)

    const params = CollectionQuerySchema.parse(processedParams)
    console.log('[Collections] Query parameters validated:', params)

    // Get current user session for authentication and permission checks
    // Uses getSession() for consistent authentication handling
    const currentUser = await getSession()
    const currentUserId = currentUser?.user?.id

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || currentUserId || 'anonymous'
    const rateLimitResult = await ratelimit(60, '1m').limit(`collections_get:${clientId}`)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Build query conditions
    const whereConditions: string[] = []
    const queryValues: any[] = []

    // User filter
    if (params.userId) {
      whereConditions.push(`tc.user_id = $${queryValues.length + 1}`)
      queryValues.push(params.userId)
    }

    // Visibility filter - consider user permissions
    if (currentUserId) {
      if (params.visibility) {
        whereConditions.push(`tc.visibility = $${queryValues.length + 1}`)
        queryValues.push(params.visibility)
      } else {
        // Show all collections the user can see
        whereConditions.push(`
          (tc.visibility = 'public' OR
           tc.user_id = $${queryValues.length + 1} OR
           EXISTS(SELECT 1 FROM collection_collaborators cc WHERE cc.collection_id = tc.id AND cc.user_id = $${queryValues.length + 2}))
        `)
        queryValues.push(currentUserId, currentUserId)
      }
    } else {
      // Non-authenticated users only see public collections
      whereConditions.push(`tc.visibility = 'public'`)
    }

    // Featured filter
    if (params.isFeatured !== undefined) {
      whereConditions.push(`tc.is_featured = $${queryValues.length + 1}`)
      queryValues.push(params.isFeatured)
    }

    // Tags filter
    if (params.tags && params.tags.length > 0) {
      whereConditions.push(`tc.tags ? ANY($${queryValues.length + 1})`)
      queryValues.push(params.tags)
    }

    // Search filter
    if (params.search) {
      whereConditions.push(`
        (LOWER(tc.name) LIKE LOWER($${queryValues.length + 1}) OR
         LOWER(tc.description) LIKE LOWER($${queryValues.length + 2}))
      `)
      queryValues.push(`%${params.search}%`, `%${params.search}%`)
    }

    // Build sort clause
    const sortMappings = {
      created: 'tc.created_at',
      updated: 'tc.updated_at',
      name: 'tc.name',
      templates: 'tc.template_count',
      followers: 'tc.follower_count',
    }
    const sortColumn = sortMappings[params.sortBy] || 'tc.updated_at'
    const sortDirection = params.sortOrder.toUpperCase()

    // Main query
    const mainQuery = `
      SELECT 
        tc.id,
        tc.user_id,
        tc.name,
        tc.description,
        tc.visibility,
        tc.tags,
        tc.cover_image,
        tc.is_featured,
        tc.is_collaborative,
        tc.template_count,
        tc.follower_count,
        tc.created_at,
        tc.updated_at,
        -- User information
        u.name as creator_name,
        u.image as creator_image,
        cup.display_name as creator_display_name,
        cup.is_verified as creator_is_verified,
        -- Collection statistics
        COALESCE(view_stats.view_count, 0) as view_count,
        COALESCE(like_stats.like_count, 0) as like_count,
        -- User context
        ${
          currentUserId
            ? `
        CASE WHEN cf.follower_id IS NOT NULL THEN true ELSE false END as is_following,
        CASE WHEN cl.user_id IS NOT NULL THEN true ELSE false END as is_liked,
        CASE WHEN cc.user_id IS NOT NULL THEN true ELSE false END as is_collaborator
        `
            : `
        false as is_following,
        false as is_liked,
        false as is_collaborator
        `
        }
      FROM template_collections tc
      INNER JOIN "user" u ON tc.user_id = u.id
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      LEFT JOIN (
        SELECT collection_id, COUNT(*) as view_count
        FROM collection_views
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY collection_id
      ) view_stats ON tc.id = view_stats.collection_id
      LEFT JOIN (
        SELECT target_id as collection_id, COUNT(*) as like_count
        FROM community_activity_engagement
        WHERE target_type = 'collection' AND engagement_type = 'like'
        GROUP BY target_id
      ) like_stats ON tc.id = like_stats.collection_id
      ${
        currentUserId
          ? `
      LEFT JOIN collection_followers cf ON tc.id = cf.collection_id AND cf.follower_id = $${queryValues.length + 1}
      LEFT JOIN (
        SELECT target_id as collection_id, user_id
        FROM community_activity_engagement
        WHERE target_type = 'collection' AND engagement_type = 'like' AND user_id = $${queryValues.length + 2}
      ) cl ON tc.id = cl.collection_id
      LEFT JOIN collection_collaborators cc ON tc.id = cc.collection_id AND cc.user_id = $${queryValues.length + 3}
      `
          : ''
      }
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
      ORDER BY ${sortColumn} ${sortDirection} NULLS LAST
      LIMIT $${queryValues.length + (currentUserId ? 4 : 1)} OFFSET $${queryValues.length + (currentUserId ? 5 : 2)}
    `

    // Add user context parameters and pagination
    if (currentUserId) {
      queryValues.push(currentUserId, currentUserId, currentUserId, params.limit, params.offset)
    } else {
      queryValues.push(params.limit, params.offset)
    }

    console.log('[Collections] Executing collections query')
    // Execute collections query with proper parameter binding
    // Database results return direct array, not .rows property
    const result = await db.execute(sql.raw(mainQuery, queryValues))

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM template_collections tc
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
    `

    const countValues = queryValues.slice(0, -(currentUserId ? 5 : 2))
    // Execute count query for pagination metadata
    // Access result directly as array, not via .rows property
    const countResult = await db.execute(sql.raw(countQuery, countValues))
    const totalCollections = (countResult[0] as any)?.total || 0

    // Format collections from database result array
    // Result is direct array, not nested in .rows property
    const collections = await Promise.all(
      result.map(async (row: any) => {
        const collection = {
          id: row.id,
          userId: row.user_id,
          name: row.name,
          description: row.description,
          visibility: row.visibility,
          tags: row.tags || [],
          coverImage: row.cover_image,
          isFeatured: row.is_featured,
          isCollaborative: row.is_collaborative,
          templateCount: row.template_count || 0,
          followerCount: row.follower_count || 0,
          viewCount: row.view_count || 0,
          likeCount: row.like_count || 0,
          creator: {
            id: row.user_id,
            name: row.creator_name,
            displayName: row.creator_display_name,
            image: row.creator_image,
            isVerified: row.creator_is_verified || false,
          },
          userContext: {
            isFollowing: row.is_following || false,
            isLiked: row.is_liked || false,
            isCollaborator: row.is_collaborator || false,
            canEdit: row.user_id === currentUserId || row.is_collaborator || false,
          },
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          templates: [],
          collaborators: [],
        }

        // Load templates if requested
        if (params.includeTemplates) {
          collection.templates = await getCollectionTemplates(row.id)
        }

        // Load collaborators if requested
        if (params.includeCollaborators && row.is_collaborative) {
          collection.collaborators = await getCollectionCollaborators(row.id)
        }

        return collection
      })
    )

    const executionTime = Date.now() - startTime
    console.log(`[Collections] Retrieved ${collections.length} collections in ${executionTime}ms`)

    return NextResponse.json({
      data: collections,
      pagination: {
        total: totalCollections,
        limit: params.limit,
        offset: params.offset,
        hasMore: params.offset + params.limit < totalCollections,
      },
      filters: {
        userId: params.userId,
        visibility: params.visibility,
        isFeatured: params.isFeatured,
        tags: params.tags,
        search: params.search,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      },
      meta: {
        executionTime,
        collectionCount: collections.length,
        currentUserId,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[Collections] Error in GET request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to retrieve collections',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/community/social/collections - Create new collection
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[Collections] Processing POST request for collection creation')

    // Authenticate user for collection creation
    // Uses getSession() for proper session handling
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    console.log(`[Collections] Creating collection for user: ${userId}`)

    // Rate limiting
    const rateLimitResult = await ratelimit(10, '1h').limit(`collection_create:${userId}`)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const collectionData = CreateCollectionSchema.parse(body)
    console.log('[Collections] Collection data validated')

    // Sanitize inputs
    collectionData.name = CommunityUtils.sanitizeInput(collectionData.name)
    if (collectionData.description) {
      collectionData.description = CommunityUtils.sanitizeInput(collectionData.description)
    }

    // Validate template IDs if provided
    if (collectionData.templateIds.length > 0) {
      const templateCheck = await db.execute(sql`
        SELECT id FROM templates 
        WHERE id = ANY(${collectionData.templateIds}) 
          AND status = 'approved' 
          AND (visibility = 'public' OR created_by_user_id = ${userId})
      `)

      // Template validation - direct array access, not .rows
      const validTemplateIds = templateCheck.map((row: any) => row.id)
      const invalidCount = collectionData.templateIds.length - validTemplateIds.length

      if (invalidCount > 0) {
        console.warn(`[Collections] ${invalidCount} invalid template IDs provided`)
      }

      collectionData.templateIds = validTemplateIds
    }

    // Validate collaborators
    if (collectionData.isCollaborative && collectionData.collaborators.length > 0) {
      const collaboratorCheck = await db.execute(sql`
        SELECT id FROM "user" WHERE id = ANY(${collectionData.collaborators})
      `)

      // Collaborator validation - direct array access, not .rows
      const validCollaborators = collaboratorCheck.map((row: any) => row.id)
      collectionData.collaborators = validCollaborators
    }

    // Generate collection ID
    const collectionId = `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create collection
    await db.execute(sql`
      INSERT INTO template_collections (
        id, user_id, name, description, visibility, tags, cover_image,
        is_featured, is_collaborative, template_count, follower_count,
        created_at, updated_at
      ) VALUES (
        ${collectionId}, ${userId}, ${collectionData.name}, 
        ${collectionData.description}, ${collectionData.visibility},
        ${JSON.stringify(collectionData.tags)}::jsonb, ${collectionData.coverImage},
        false, ${collectionData.isCollaborative}, ${collectionData.templateIds.length}, 0,
        NOW(), NOW()
      )
    `)

    // Add templates to collection
    if (collectionData.templateIds.length > 0) {
      const templateInserts = collectionData.templateIds
        .map((templateId, index) => `('${collectionId}', '${templateId}', NOW(), ${index})`)
        .join(', ')

      await db.execute(
        sql.raw(`
        INSERT INTO template_collection_items (collection_id, template_id, added_at, sort_order)
        VALUES ${templateInserts}
      `)
      )
    }

    // Add collaborators
    if (collectionData.isCollaborative && collectionData.collaborators.length > 0) {
      const collaboratorInserts = collectionData.collaborators
        .map((collaboratorId) => `('${collectionId}', '${collaboratorId}', 'editor', NOW())`)
        .join(', ')

      await db.execute(
        sql.raw(`
        INSERT INTO collection_collaborators (collection_id, user_id, role, added_at)
        VALUES ${collaboratorInserts}
      `)
      )
    }

    // Create activity for collection creation
    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await db.execute(sql`
      INSERT INTO community_user_activities (
        id, user_id, activity_type, activity_data, target_type, target_id, target_title,
        visibility, is_featured, like_count, comment_count, created_at
      ) VALUES (
        ${activityId}, ${userId}, 'collection_created',
        ${JSON.stringify({
          collectionName: collectionData.name,
          templateCount: collectionData.templateIds.length,
          isCollaborative: collectionData.isCollaborative,
        })}::jsonb,
        'collection', ${collectionId}, ${collectionData.name},
        ${collectionData.visibility === 'private' ? 'followers' : 'public'}, 
        false, 0, 0, NOW()
      )
    `)

    // Award reputation points
    const pointsAwarded = 25 + collectionData.templateIds.length * 2 // Base + template bonus
    await db.execute(sql`
      UPDATE user_reputation 
      SET 
        community_contribution_points = community_contribution_points + ${pointsAwarded},
        total_points = total_points + ${pointsAwarded},
        updated_at = NOW()
      WHERE user_id = ${userId}
    `)

    // Get created collection with full details
    const createdCollection = await getCollectionById(collectionId, userId)

    const executionTime = Date.now() - startTime
    console.log(
      `[Collections] Collection created successfully: ${collectionId} in ${executionTime}ms`
    )

    return NextResponse.json(
      {
        success: true,
        data: createdCollection,
        pointsAwarded,
        meta: {
          executionTime,
          collectionId,
          templateCount: collectionData.templateIds.length,
          collaboratorCount: collectionData.collaborators.length,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[Collections] Error in POST request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid collection data',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create collection',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/community/social/collections - Update collection
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[Collections] Processing PUT request for collection update')

    // Authenticate user for collection updates
    // Uses getSession() for consistent authentication handling
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    const url = new URL(request.url)
    const collectionId = url.searchParams.get('id')

    if (!collectionId) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 })
    }

    // Check if user can edit collection
    const permission = await checkCollectionPermission(collectionId, userId, 'edit')
    if (!permission.canEdit) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const updateData = UpdateCollectionSchema.parse(body)

    // Sanitize inputs
    if (updateData.name) {
      updateData.name = CommunityUtils.sanitizeInput(updateData.name)
    }
    if (updateData.description) {
      updateData.description = CommunityUtils.sanitizeInput(updateData.description)
    }

    // Build update query
    const updateFields: string[] = []
    const updateValues: any[] = []

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbColumn =
          key === 'isCollaborative'
            ? 'is_collaborative'
            : key === 'coverImage'
              ? 'cover_image'
              : key

        updateFields.push(`${dbColumn} = $${updateValues.length + 1}`)

        if (key === 'tags') {
          updateValues.push(JSON.stringify(value))
        } else {
          updateValues.push(value)
        }
      }
    })

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(collectionId)

    const updateQuery = `
      UPDATE template_collections 
      SET ${updateFields.join(', ')}
      WHERE id = $${updateValues.length}
      RETURNING id, updated_at
    `

    await db.execute(sql.raw(updateQuery, updateValues))

    // Get updated collection
    const updatedCollection = await getCollectionById(collectionId, userId)

    const executionTime = Date.now() - startTime
    console.log(
      `[Collections] Collection updated successfully: ${collectionId} in ${executionTime}ms`
    )

    return NextResponse.json({
      success: true,
      data: updatedCollection,
      meta: {
        executionTime,
        collectionId,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[Collections] Error in PUT request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid update data',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to update collection',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Get collection templates
 */
async function getCollectionTemplates(collectionId: string) {
  try {
    const query = `
      SELECT 
        t.id,
        t.name,
        t.description,
        t.rating_average,
        t.download_count,
        t.cover_image_url,
        t.created_by_user_id,
        tci.sort_order,
        tci.added_at
      FROM template_collection_items tci
      INNER JOIN templates t ON tci.template_id = t.id
      WHERE tci.collection_id = $1 AND t.status = 'approved'
      ORDER BY tci.sort_order ASC, tci.added_at ASC
    `

    const result = await db.execute(sql.raw(query, [collectionId]))

    // Map template results from direct array, not .rows property
    return result.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      rating: row.rating_average || 0,
      downloadCount: row.download_count || 0,
      coverImage: row.cover_image_url,
      createdByUserId: row.created_by_user_id,
      sortOrder: row.sort_order,
      addedAt: row.added_at,
    }))
  } catch (error) {
    console.error('[Collections] Failed to get collection templates:', error)
    return []
  }
}

/**
 * Get collection collaborators
 */
async function getCollectionCollaborators(collectionId: string) {
  try {
    const query = `
      SELECT 
        cc.user_id,
        cc.role,
        cc.added_at,
        u.name,
        u.image,
        cup.display_name,
        cup.is_verified
      FROM collection_collaborators cc
      INNER JOIN "user" u ON cc.user_id = u.id
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      WHERE cc.collection_id = $1
      ORDER BY cc.added_at ASC
    `

    const result = await db.execute(sql.raw(query, [collectionId]))

    // Map collaborator results from direct array, not .rows property
    return result.map((row: any) => ({
      userId: row.user_id,
      role: row.role,
      addedAt: row.added_at,
      user: {
        id: row.user_id,
        name: row.name,
        displayName: row.display_name,
        image: row.image,
        isVerified: row.is_verified || false,
      },
    }))
  } catch (error) {
    console.error('[Collections] Failed to get collection collaborators:', error)
    return []
  }
}

/**
 * Check collection permissions
 */
async function checkCollectionPermission(
  collectionId: string,
  userId: string,
  permission: 'view' | 'edit' | 'delete'
) {
  try {
    const query = `
      SELECT 
        tc.user_id,
        tc.visibility,
        cc.role as collaborator_role
      FROM template_collections tc
      LEFT JOIN collection_collaborators cc ON tc.id = cc.collection_id AND cc.user_id = $2
      WHERE tc.id = $1
    `

    const result = await db.execute(sql.raw(query, [collectionId, userId]))

    // Check collection existence - direct array access, not .rows
    if (result.length === 0) {
      return { exists: false, canView: false, canEdit: false, canDelete: false }
    }

    const collection = result[0] as any
    const isOwner = collection.user_id === userId
    const isCollaborator = !!collection.collaborator_role

    let canView = false
    let canEdit = false
    let canDelete = false

    // View permissions
    if (collection.visibility === 'public') {
      canView = true
    } else if (collection.visibility === 'unlisted') {
      canView = true // Anyone with link can view
    } else if (collection.visibility === 'private') {
      canView = isOwner || isCollaborator
    }

    // Edit permissions
    canEdit = isOwner || (isCollaborator && collection.collaborator_role === 'editor')

    // Delete permissions
    canDelete = isOwner

    return {
      exists: true,
      canView,
      canEdit,
      canDelete,
      isOwner,
      isCollaborator,
      collaboratorRole: collection.collaborator_role,
    }
  } catch (error) {
    console.error('[Collections] Failed to check collection permission:', error)
    return { exists: false, canView: false, canEdit: false, canDelete: false }
  }
}

/**
 * Get collection by ID with full details
 */
async function getCollectionById(collectionId: string, currentUserId?: string) {
  try {
    const query = `
      SELECT 
        tc.*,
        u.name as creator_name,
        u.image as creator_image,
        cup.display_name as creator_display_name,
        cup.is_verified as creator_is_verified
      FROM template_collections tc
      INNER JOIN "user" u ON tc.user_id = u.id
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      WHERE tc.id = $1
    `

    const result = await db.execute(sql.raw(query, [collectionId]))

    // Check collection result - direct array access, not .rows
    if (result.length === 0) {
      return null
    }

    const row = result[0] as any

    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      visibility: row.visibility,
      tags: row.tags || [],
      coverImage: row.cover_image,
      isFeatured: row.is_featured,
      isCollaborative: row.is_collaborative,
      templateCount: row.template_count || 0,
      followerCount: row.follower_count || 0,
      creator: {
        id: row.user_id,
        name: row.creator_name,
        displayName: row.creator_display_name,
        image: row.creator_image,
        isVerified: row.creator_is_verified || false,
      },
      templates: await getCollectionTemplates(collectionId),
      collaborators: row.is_collaborative ? await getCollectionCollaborators(collectionId) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  } catch (error) {
    console.error('[Collections] Failed to get collection by ID:', error)
    return null
  }
}
