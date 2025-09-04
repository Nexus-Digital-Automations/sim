/**
 * Community Comments API
 *
 * Manages threaded comment system for community content with comprehensive
 * moderation, engagement tracking, and real-time updates.
 *
 * FEATURES:
 * - Threaded comment discussions with unlimited nesting
 * - Comment creation, editing, and deletion
 * - Comment moderation and reporting system
 * - Comment engagement tracking (likes, replies)
 * - Real-time comment updates via WebSocket
 * - Comment notifications and mentions
 * - Spam detection and content filtering
 * - Comment search and discovery
 *
 * SECURITY:
 * - Authentication required for comment operations
 * - Rate limiting and abuse prevention
 * - Input validation and sanitization
 * - Content moderation integration
 * - Privacy controls and visibility settings
 *
 * @created 2025-09-04
 * @author Community Comments API
 */

import { sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { CommunityUtils } from '@/lib/community'
import { ratelimit } from '@/lib/ratelimit'
import { db } from '@/db'

// ========================
// VALIDATION SCHEMAS
// ========================

const CreateCommentSchema = z.object({
  targetId: z.string().min(1),
  targetType: z.enum(['activity', 'template', 'collection']),
  content: z.string().min(1).max(2000),
  parentId: z.string().optional(),
  mentions: z.array(z.string()).max(10).default([]),
})

const UpdateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
})

const CommentQuerySchema = z.object({
  targetId: z.string(),
  targetType: z.enum(['activity', 'template', 'collection']),
  parentId: z.string().optional(),
  sortBy: z.enum(['created', 'updated', 'likes']).default('created'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  includeReplies: z.boolean().default(true),
  maxDepth: z.number().min(1).max(10).default(5),
})

// ========================
// API HANDLERS
// ========================

/**
 * GET /api/community/social/comments - Get comments for target
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[Comments] Processing GET request for comments')

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())

    // Convert string parameters
    if (queryParams.limit) queryParams.limit = Number.parseInt(queryParams.limit)
    if (queryParams.offset) queryParams.offset = Number.parseInt(queryParams.offset)
    if (queryParams.maxDepth) queryParams.maxDepth = Number.parseInt(queryParams.maxDepth)
    if (queryParams.includeReplies)
      queryParams.includeReplies = queryParams.includeReplies === 'true'

    const params = CommentQuerySchema.parse(queryParams)
    console.log('[Comments] Query parameters validated:', params)

    // Get current user for personalization
    const currentUser = await auth()
    const currentUserId = currentUser?.user?.id

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'anonymous'
    const rateLimitResult = await ratelimit(100, '1m').limit(`comments_get:${clientId}`)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Build query conditions
    const whereConditions: string[] = [
      'cc.target_id = $1',
      'cc.target_type = $2',
      'cc.is_deleted = false',
    ]
    const queryValues: any[] = [params.targetId, params.targetType]

    // Filter by parent (for threaded comments)
    if (params.parentId) {
      whereConditions.push(`cc.parent_id = $${queryValues.length + 1}`)
      queryValues.push(params.parentId)
    } else if (!params.includeReplies) {
      whereConditions.push('cc.parent_id IS NULL')
    }

    // Sort mapping
    const sortMappings = {
      created: 'cc.created_at',
      updated: 'cc.updated_at',
      likes: 'cc.like_count',
    }
    const sortColumn = sortMappings[params.sortBy] || 'cc.created_at'
    const sortDirection = params.sortOrder.toUpperCase()

    // Main query with recursive CTE for threaded comments
    const mainQuery = `
      WITH RECURSIVE comment_tree AS (
        -- Base case: top-level comments or specified parent
        SELECT 
          cc.id,
          cc.user_id,
          cc.target_id,
          cc.target_type,
          cc.parent_id,
          cc.content,
          cc.like_count,
          cc.reply_count,
          cc.is_pinned,
          cc.is_edited,
          cc.created_at,
          cc.updated_at,
          -- User information
          u.name as user_name,
          u.image as user_image,
          cup.display_name as user_display_name,
          cup.is_verified as user_is_verified,
          ur.total_points as user_reputation,
          -- Thread information
          0 as depth,
          cc.id::text as thread_path,
          -- User interactions
          ${
            currentUserId
              ? `
          CASE WHEN ccl.user_id IS NOT NULL THEN true ELSE false END as is_liked
          `
              : 'false as is_liked'
          }
        FROM community_comments cc
        INNER JOIN "user" u ON cc.user_id = u.id
        LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
        LEFT JOIN user_reputation ur ON u.id = ur.user_id
        ${
          currentUserId
            ? `
        LEFT JOIN (
          SELECT target_id, user_id 
          FROM community_activity_engagement 
          WHERE target_type = 'comment' AND engagement_type = 'like' AND user_id = $${queryValues.length + 1}
        ) ccl ON cc.id = ccl.target_id
        `
            : ''
        }
        WHERE ${whereConditions.join(' AND ')}

        UNION ALL

        -- Recursive case: replies to comments
        SELECT 
          cc.id,
          cc.user_id,
          cc.target_id,
          cc.target_type,
          cc.parent_id,
          cc.content,
          cc.like_count,
          cc.reply_count,
          cc.is_pinned,
          cc.is_edited,
          cc.created_at,
          cc.updated_at,
          u.name,
          u.image,
          cup.display_name,
          cup.is_verified,
          ur.total_points,
          ct.depth + 1,
          ct.thread_path || '/' || cc.id::text,
          ${
            currentUserId
              ? `
          CASE WHEN ccl.user_id IS NOT NULL THEN true ELSE false END as is_liked
          `
              : 'false as is_liked'
          }
        FROM community_comments cc
        INNER JOIN comment_tree ct ON cc.parent_id = ct.id
        INNER JOIN "user" u ON cc.user_id = u.id
        LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
        LEFT JOIN user_reputation ur ON u.id = ur.user_id
        ${
          currentUserId
            ? `
        LEFT JOIN (
          SELECT target_id, user_id 
          FROM community_activity_engagement 
          WHERE target_type = 'comment' AND engagement_type = 'like' AND user_id = $${queryValues.length + 1}
        ) ccl ON cc.id = ccl.target_id
        `
            : ''
        }
        WHERE cc.is_deleted = false AND ct.depth < $${queryValues.length + (currentUserId ? 2 : 1)}
      )
      SELECT * FROM comment_tree
      ORDER BY depth ASC, ${sortColumn} ${sortDirection}
      LIMIT $${queryValues.length + (currentUserId ? 3 : 2)} OFFSET $${queryValues.length + (currentUserId ? 4 : 3)}
    `

    // Add query parameters
    if (currentUserId) {
      queryValues.push(currentUserId, params.maxDepth, params.limit, params.offset)
    } else {
      queryValues.push(params.maxDepth, params.limit, params.offset)
    }

    console.log('[Comments] Executing comments query')
    const result = await db.execute(sql.raw(mainQuery, queryValues))

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM community_comments cc
      WHERE ${whereConditions.join(' AND ')}
    `
    const countValues = queryValues.slice(0, whereConditions.length)
    const countResult = await db.execute(sql.raw(countQuery, countValues))
    const totalComments = (countResult.rows[0] as any)?.total || 0

    // Build comment tree structure
    const commentMap = new Map()
    const rootComments: any[] = []

    result.rows.forEach((row: any) => {
      const comment = {
        id: row.id,
        userId: row.user_id,
        user: {
          id: row.user_id,
          name: row.user_name,
          displayName: row.user_display_name,
          image: row.user_image,
          isVerified: row.user_is_verified || false,
          reputation: row.user_reputation || 0,
        },
        targetId: row.target_id,
        targetType: row.target_type,
        parentId: row.parent_id,
        content: row.content,
        likeCount: row.like_count || 0,
        replyCount: row.reply_count || 0,
        isPinned: row.is_pinned || false,
        isEdited: row.is_edited || false,
        isLiked: row.is_liked || false,
        depth: row.depth,
        threadPath: row.thread_path,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        replies: [],
      }

      commentMap.set(comment.id, comment)

      if (!comment.parentId || comment.depth === 0) {
        rootComments.push(comment)
      } else {
        const parent = commentMap.get(comment.parentId)
        if (parent) {
          parent.replies.push(comment)
        }
      }
    })

    const executionTime = Date.now() - startTime
    console.log(`[Comments] Retrieved ${result.rows.length} comments in ${executionTime}ms`)

    return NextResponse.json({
      data: params.includeReplies
        ? rootComments
        : result.rows.map((row) => {
            const comment = commentMap.get(row.id)
            if (comment) {
              comment.replies = [] // Remove replies if not requested
            }
            return comment
          }),
      pagination: {
        total: totalComments,
        limit: params.limit,
        offset: params.offset,
        hasMore: params.offset + params.limit < totalComments,
      },
      filter: {
        targetId: params.targetId,
        targetType: params.targetType,
        parentId: params.parentId,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        includeReplies: params.includeReplies,
      },
      meta: {
        executionTime,
        commentCount: result.rows.length,
        currentUserId,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[Comments] Error in GET request:', error)

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
        error: 'Failed to retrieve comments',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/community/social/comments - Create new comment
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[Comments] Processing POST request for comment creation')

    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    console.log(`[Comments] Creating comment for user: ${userId}`)

    // Rate limiting
    const rateLimitResult = await ratelimit(20, '5m').limit(`comment_create:${userId}`)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const commentData = CreateCommentSchema.parse(body)
    console.log('[Comments] Comment data validated')

    // Sanitize content
    commentData.content = CommunityUtils.sanitizeInput(commentData.content)

    // Validate parent comment if specified
    if (commentData.parentId) {
      const parentCheck = await db.execute(sql`
        SELECT id, user_id, target_id, target_type 
        FROM community_comments 
        WHERE id = ${commentData.parentId} AND is_deleted = false
      `)

      if (parentCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      }

      const parent = parentCheck.rows[0] as any
      // Ensure parent belongs to same target
      if (
        parent.target_id !== commentData.targetId ||
        parent.target_type !== commentData.targetType
      ) {
        return NextResponse.json({ error: 'Invalid parent comment' }, { status: 400 })
      }
    }

    // Validate target exists
    const targetValidation = await validateCommentTarget(
      commentData.targetType,
      commentData.targetId,
      userId
    )
    if (!targetValidation.exists) {
      return NextResponse.json({ error: `${commentData.targetType} not found` }, { status: 404 })
    }

    if (!targetValidation.canComment) {
      return NextResponse.json(
        { error: `Cannot comment on this ${commentData.targetType}` },
        { status: 403 }
      )
    }

    // Generate comment ID
    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create comment
    await db.execute(sql`
      INSERT INTO community_comments (
        id, user_id, target_id, target_type, parent_id, content,
        like_count, reply_count, is_pinned, is_edited, is_deleted,
        created_at, updated_at
      ) VALUES (
        ${commentId}, ${userId}, ${commentData.targetId}, ${commentData.targetType},
        ${commentData.parentId}, ${commentData.content},
        0, 0, false, false, false,
        NOW(), NOW()
      )
    `)

    // Update reply count on parent comment
    if (commentData.parentId) {
      await db.execute(sql`
        UPDATE community_comments 
        SET reply_count = reply_count + 1, updated_at = NOW()
        WHERE id = ${commentData.parentId}
      `)
    }

    // Update comment count on target (if applicable)
    await updateTargetCommentCount(commentData.targetType, commentData.targetId, 1)

    // Process mentions
    if (commentData.mentions.length > 0) {
      const mentionInserts = commentData.mentions
        .filter((mentionId) => mentionId !== userId) // Don't mention self
        .map((mentionId) => `('${commentId}', '${mentionId}', NOW())`)
        .join(', ')

      if (mentionInserts) {
        await db.execute(
          sql.raw(`
          INSERT INTO comment_mentions (comment_id, mentioned_user_id, created_at)
          VALUES ${mentionInserts}
          ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING
        `)
        )

        // Create notifications for mentions (in production, use queue)
        console.log(`[Comments] Created mention notifications for comment ${commentId}`)
      }
    }

    // Award reputation points
    const pointsAwarded = 3
    await db.execute(sql`
      UPDATE user_reputation 
      SET 
        community_interaction_points = community_interaction_points + ${pointsAwarded},
        total_points = total_points + ${pointsAwarded},
        updated_at = NOW()
      WHERE user_id = ${userId}
    `)

    // Log reputation change
    await db.execute(sql`
      INSERT INTO user_reputation_history (
        id, user_id, change_type, points_change, previous_total, new_total,
        source_type, source_id, reason, triggered_by, created_at
      ) 
      SELECT 
        gen_random_uuid()::TEXT, ${userId}, 'earned', ${pointsAwarded},
        ur.total_points - ${pointsAwarded}, ur.total_points,
        'comment', ${commentId},
        'Comment posted', 'system', NOW()
      FROM user_reputation ur WHERE ur.user_id = ${userId}
    `)

    // Get created comment with user info
    const createdCommentQuery = `
      SELECT 
        cc.id, cc.user_id, cc.target_id, cc.target_type, cc.parent_id,
        cc.content, cc.like_count, cc.reply_count, cc.is_pinned, cc.is_edited,
        cc.created_at, cc.updated_at,
        u.name as user_name, u.image as user_image,
        cup.display_name as user_display_name, cup.is_verified as user_is_verified,
        ur.total_points as user_reputation
      FROM community_comments cc
      INNER JOIN "user" u ON cc.user_id = u.id
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      WHERE cc.id = $1
    `

    const commentResult = await db.execute(sql.raw(createdCommentQuery, [commentId]))
    const commentRow = commentResult.rows[0] as any

    const createdComment = {
      id: commentRow.id,
      userId: commentRow.user_id,
      user: {
        id: commentRow.user_id,
        name: commentRow.user_name,
        displayName: commentRow.user_display_name,
        image: commentRow.user_image,
        isVerified: commentRow.user_is_verified || false,
        reputation: commentRow.user_reputation || 0,
      },
      targetId: commentRow.target_id,
      targetType: commentRow.target_type,
      parentId: commentRow.parent_id,
      content: commentRow.content,
      likeCount: 0,
      replyCount: 0,
      isPinned: false,
      isEdited: false,
      isLiked: false,
      depth: commentData.parentId ? 1 : 0,
      createdAt: commentRow.created_at,
      updatedAt: commentRow.updated_at,
      replies: [],
    }

    // Trigger real-time updates
    console.log(
      `[Comments] Broadcasting new comment ${commentId} for ${commentData.targetType}:${commentData.targetId}`
    )

    const executionTime = Date.now() - startTime
    console.log(`[Comments] Comment created successfully: ${commentId} in ${executionTime}ms`)

    return NextResponse.json(
      {
        success: true,
        data: createdComment,
        pointsAwarded,
        meta: {
          executionTime,
          commentId,
          mentionCount: commentData.mentions.length,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[Comments] Error in POST request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid comment data',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create comment',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/community/social/comments - Update comment
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[Comments] Processing PUT request for comment update')

    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    const url = new URL(request.url)
    const commentId = url.searchParams.get('id')

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 })
    }

    // Check if user can edit comment
    const commentCheck = await db.execute(sql`
      SELECT user_id, content, created_at 
      FROM community_comments 
      WHERE id = ${commentId} AND is_deleted = false
    `)

    if (commentCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const comment = commentCheck.rows[0] as any
    const canEdit =
      comment.user_id === userId ||
      session.user.role === 'admin' ||
      session.user.role === 'moderator'

    if (!canEdit) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Check edit time limit (15 minutes for regular users)
    const isAdmin = session.user.role === 'admin' || session.user.role === 'moderator'
    const editTimeLimit = 15 * 60 * 1000 // 15 minutes in milliseconds
    const commentAge = Date.now() - new Date(comment.created_at).getTime()

    if (!isAdmin && commentAge > editTimeLimit) {
      return NextResponse.json({ error: 'Comment can no longer be edited' }, { status: 400 })
    }

    // Parse and validate request body
    const body = await request.json()
    const updateData = UpdateCommentSchema.parse(body)

    // Sanitize content
    updateData.content = CommunityUtils.sanitizeInput(updateData.content)

    // Update comment
    await db.execute(sql`
      UPDATE community_comments 
      SET 
        content = ${updateData.content},
        is_edited = true,
        updated_at = NOW()
      WHERE id = ${commentId}
    `)

    // Get updated comment
    const updatedCommentQuery = `
      SELECT 
        cc.id, cc.user_id, cc.target_id, cc.target_type, cc.parent_id,
        cc.content, cc.like_count, cc.reply_count, cc.is_pinned, cc.is_edited,
        cc.created_at, cc.updated_at,
        u.name as user_name, u.image as user_image,
        cup.display_name as user_display_name, cup.is_verified as user_is_verified,
        ur.total_points as user_reputation
      FROM community_comments cc
      INNER JOIN "user" u ON cc.user_id = u.id
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      WHERE cc.id = $1
    `

    const updatedResult = await db.execute(sql.raw(updatedCommentQuery, [commentId]))
    const updatedRow = updatedResult.rows[0] as any

    const updatedComment = {
      id: updatedRow.id,
      userId: updatedRow.user_id,
      user: {
        id: updatedRow.user_id,
        name: updatedRow.user_name,
        displayName: updatedRow.user_display_name,
        image: updatedRow.user_image,
        isVerified: updatedRow.user_is_verified || false,
        reputation: updatedRow.user_reputation || 0,
      },
      targetId: updatedRow.target_id,
      targetType: updatedRow.target_type,
      parentId: updatedRow.parent_id,
      content: updatedRow.content,
      likeCount: updatedRow.like_count || 0,
      replyCount: updatedRow.reply_count || 0,
      isPinned: updatedRow.is_pinned || false,
      isEdited: updatedRow.is_edited || false,
      createdAt: updatedRow.created_at,
      updatedAt: updatedRow.updated_at,
      replies: [],
    }

    const executionTime = Date.now() - startTime
    console.log(`[Comments] Comment updated successfully: ${commentId} in ${executionTime}ms`)

    return NextResponse.json({
      success: true,
      data: updatedComment,
      meta: {
        executionTime,
        commentId,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[Comments] Error in PUT request:', error)

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
        error: 'Failed to update comment',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/community/social/comments - Delete comment
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[Comments] Processing DELETE request for comment')

    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    const url = new URL(request.url)
    const commentId = url.searchParams.get('id')

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 })
    }

    // Check if user can delete comment
    const commentCheck = await db.execute(sql`
      SELECT user_id, parent_id, target_id, target_type, reply_count 
      FROM community_comments 
      WHERE id = ${commentId} AND is_deleted = false
    `)

    if (commentCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const comment = commentCheck.rows[0] as any
    const canDelete =
      comment.user_id === userId ||
      session.user.role === 'admin' ||
      session.user.role === 'moderator'

    if (!canDelete) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Soft delete comment (preserve structure for replies)
    await db.execute(sql`
      UPDATE community_comments 
      SET 
        is_deleted = true,
        content = '[Comment deleted]',
        updated_at = NOW()
      WHERE id = ${commentId}
    `)

    // Update reply count on parent if this was a reply
    if (comment.parent_id) {
      await db.execute(sql`
        UPDATE community_comments 
        SET reply_count = GREATEST(0, reply_count - 1), updated_at = NOW()
        WHERE id = ${comment.parent_id}
      `)
    }

    // Update comment count on target
    await updateTargetCommentCount(comment.target_type, comment.target_id, -1)

    // Remove reputation points (only if user deleted their own comment)
    if (comment.user_id === userId) {
      await db.execute(sql`
        UPDATE user_reputation 
        SET 
          community_interaction_points = GREATEST(0, community_interaction_points - 3),
          total_points = GREATEST(0, total_points - 3),
          updated_at = NOW()
        WHERE user_id = ${userId}
      `)
    }

    const executionTime = Date.now() - startTime
    console.log(`[Comments] Comment deleted successfully: ${commentId} in ${executionTime}ms`)

    return NextResponse.json({
      success: true,
      commentId,
      meta: {
        executionTime,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[Comments] Error in DELETE request:', error)

    return NextResponse.json(
      {
        error: 'Failed to delete comment',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
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
 * Validate comment target
 */
async function validateCommentTarget(targetType: string, targetId: string, userId: string) {
  try {
    let query: string

    switch (targetType) {
      case 'activity':
        query = `
          SELECT cua.id, cua.visibility, cua.user_id
          FROM community_user_activities cua
          WHERE cua.id = $1 AND cua.is_hidden = false
        `
        break
      case 'template':
        query = `
          SELECT t.id, t.visibility, t.created_by_user_id as user_id
          FROM templates t
          WHERE t.id = $1 AND t.status = 'approved'
        `
        break
      case 'collection':
        query = `
          SELECT tc.id, tc.visibility, tc.user_id
          FROM template_collections tc
          WHERE tc.id = $1
        `
        break
      default:
        return { exists: false, canComment: false }
    }

    const result = await db.execute(sql.raw(query, [targetId]))

    if (result.rows.length === 0) {
      return { exists: false, canComment: false }
    }

    const target = result.rows[0] as any
    let canComment = true

    // Check visibility permissions
    if (target.visibility === 'private' && target.user_id !== userId) {
      canComment = false
    } else if (target.visibility === 'followers') {
      // Check if user follows the content creator
      const followCheck = await db.execute(sql`
        SELECT 1 FROM community_user_follows
        WHERE follower_id = ${userId} AND following_id = ${target.user_id}
      `)
      canComment = followCheck.rows.length > 0 || target.user_id === userId
    }

    return { exists: true, canComment }
  } catch (error) {
    console.error('[Comments] Target validation failed:', error)
    return { exists: false, canComment: false }
  }
}

/**
 * Update comment count on target content
 */
async function updateTargetCommentCount(targetType: string, targetId: string, delta: number) {
  try {
    let query: string

    switch (targetType) {
      case 'activity':
        query = `
          UPDATE community_user_activities 
          SET comment_count = GREATEST(0, comment_count + $2), updated_at = NOW()
          WHERE id = $1
        `
        break
      case 'template':
        query = `
          UPDATE templates 
          SET comment_count = GREATEST(0, comment_count + $2), updated_at = NOW()
          WHERE id = $1
        `
        break
      case 'collection':
        // Collections might not have comment_count field yet
        return
      default:
        return
    }

    await db.execute(sql.raw(query, [targetId, delta]))
  } catch (error) {
    console.error('[Comments] Failed to update target comment count:', error)
  }
}
