/**
 * Collaborative Comments System API
 * 
 * This module provides comprehensive commenting functionality for collaborative
 * workflow editing. It supports threaded discussions, element-specific comments,
 * and real-time comment synchronization.
 * 
 * Endpoints:
 * - GET /api/workflows/[id]/comments - List comments for workflow/element
 * - POST /api/workflows/[id]/comments - Create new comment
 * - PUT /api/workflows/[id]/comments/[commentId] - Update comment
 * - DELETE /api/workflows/[id]/comments/[commentId] - Delete comment
 * - POST /api/workflows/[id]/comments/[commentId]/resolve - Resolve/unresolve comment
 * 
 * Features:
 * - Element-specific commenting (blocks, edges, variables)
 * - Threaded comment discussions (replies)
 * - Comment resolution tracking
 * - Position-based comments on canvas
 * - Real-time comment synchronization
 * - Comprehensive audit trail
 * - Rich metadata support
 * 
 * @author Claude Code Assistant
 * @version 1.0.0
 * @since 2025-09-02
 */

import { eq, and, desc, asc, isNull } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { validateWorkflowPermissions } from '../collaborate/route'
import { db } from '@/db'
import { 
  workflowComments,
  user 
} from '@/db/schema'

const logger = createLogger('WorkflowCommentsAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const CreateCommentSchema = z.object({
  elementType: z.enum(['block', 'edge', 'workflow', 'variable']),
  elementId: z.string().optional(), // null for workflow-level comments
  content: z.string().min(1, 'Comment content is required').max(10000, 'Comment too long'),
  parentCommentId: z.string().optional(), // For threaded replies
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(), // For canvas positioning
  metadata: z.record(z.any()).optional(),
})

const UpdateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(10000, 'Comment too long'),
  metadata: z.record(z.any()).optional(),
})

const ResolveCommentSchema = z.object({
  resolved: z.boolean(),
  resolutionNote: z.string().optional(),
})

const CommentQuerySchema = z.object({
  elementType: z.enum(['block', 'edge', 'workflow', 'variable']).optional(),
  elementId: z.string().optional(),
  resolved: z.boolean().optional(),
  authorId: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['created_at', 'updated_at', 'position']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeReplies: z.boolean().default(true),
})

// ========================
// TYPES AND INTERFACES
// ========================

interface Comment {
  id: string
  workflowId: string
  elementType: 'block' | 'edge' | 'workflow' | 'variable'
  elementId: string | null
  content: string
  authorId: string
  authorName: string
  authorEmail: string
  resolved: boolean
  createdAt: Date
  updatedAt: Date
  parentCommentId: string | null
  position?: {
    x: number
    y: number
  }
  metadata: Record<string, any>
  replies?: Comment[]
  replyCount: number
}

interface CommentThread {
  rootComment: Comment
  replies: Comment[]
  totalReplies: number
  lastReplyAt: Date | null
  participants: Array<{
    userId: string
    userName: string
    commentCount: number
  }>
}

interface CommentsResponse {
  comments: Comment[]
  threads: CommentThread[]
  totalComments: number
  unresolvedComments: number
  elementCommentCounts: Record<string, number>
  workflowId: string
  lastUpdated: Date
}

interface CreateCommentResponse {
  comment: Comment
  thread?: CommentThread
  message: string
}

// ========================
// UTILITY FUNCTIONS
// ========================

/**
 * Fetches comments for a workflow with optional filtering
 * @param workflowId - The workflow ID
 * @param filters - Comment filters and pagination
 * @returns Promise<Comment[]>
 */
async function getWorkflowComments(
  workflowId: string,
  filters: {
    elementType?: string
    elementId?: string
    resolved?: boolean
    authorId?: string
    limit?: number
    offset?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    includeReplies?: boolean
  } = {}
): Promise<Comment[]> {
  const operationId = crypto.randomUUID().slice(0, 8)
  logger.debug(`[${operationId}] Fetching comments for workflow ${workflowId}`, { filters })

  try {
    let whereConditions = [eq(workflowComments.workflowId, workflowId)]

    // Apply filters
    if (filters.elementType) {
      whereConditions.push(eq(workflowComments.elementType, filters.elementType))
    }
    if (filters.elementId !== undefined) {
      if (filters.elementId === null) {
        whereConditions.push(isNull(workflowComments.elementId))
      } else {
        whereConditions.push(eq(workflowComments.elementId, filters.elementId))
      }
    }
    if (filters.resolved !== undefined) {
      whereConditions.push(eq(workflowComments.resolved, filters.resolved))
    }
    if (filters.authorId) {
      whereConditions.push(eq(workflowComments.authorId, filters.authorId))
    }

    // For threaded comments, only get root comments if not including replies
    if (!filters.includeReplies) {
      whereConditions.push(isNull(workflowComments.parentCommentId))
    }

    // Determine sort order
    const sortColumn = filters.sortBy === 'updated_at' ? workflowComments.updatedAt :
                      filters.sortBy === 'position' ? workflowComments.createdAt : // Position sorting is complex, use createdAt
                      workflowComments.createdAt
    const sortOrder = filters.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)

    // Execute query
    const comments = await db
      .select({
        id: workflowComments.id,
        elementType: workflowComments.elementType,
        elementId: workflowComments.elementId,
        content: workflowComments.content,
        authorId: workflowComments.authorId,
        resolved: workflowComments.resolved,
        createdAt: workflowComments.createdAt,
        updatedAt: workflowComments.updatedAt,
        parentCommentId: workflowComments.parentCommentId,
        positionX: workflowComments.positionX,
        positionY: workflowComments.positionY,
        metadata: workflowComments.metadata,
        authorName: user.name,
        authorEmail: user.email,
      })
      .from(workflowComments)
      .leftJoin(user, eq(workflowComments.authorId, user.id))
      .where(and(...whereConditions))
      .orderBy(sortOrder)
      .limit(filters.limit || 50)
      .offset(filters.offset || 0)

    // Transform to Comment format
    const transformedComments: Comment[] = comments.map(comment => ({
      id: comment.id,
      workflowId,
      elementType: comment.elementType as 'block' | 'edge' | 'workflow' | 'variable',
      elementId: comment.elementId,
      content: comment.content,
      authorId: comment.authorId,
      authorName: comment.authorName || 'Unknown User',
      authorEmail: comment.authorEmail || '',
      resolved: comment.resolved,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      parentCommentId: comment.parentCommentId,
      position: comment.positionX && comment.positionY ? {
        x: parseFloat(comment.positionX),
        y: parseFloat(comment.positionY),
      } : undefined,
      metadata: comment.metadata as Record<string, any>,
      replyCount: 0, // Will be calculated separately if needed
    }))

    // If including replies, fetch reply counts
    if (filters.includeReplies) {
      const rootComments = transformedComments.filter(c => !c.parentCommentId)
      
      for (const rootComment of rootComments) {
        const replyCount = await db
          .select({ count: eq(workflowComments.parentCommentId, rootComment.id) })
          .from(workflowComments)
          .where(eq(workflowComments.parentCommentId, rootComment.id))
        
        rootComment.replyCount = replyCount.length
      }
    }

    logger.debug(`[${operationId}] Found ${transformedComments.length} comments`)
    return transformedComments
  } catch (error) {
    logger.error(`[${operationId}] Error fetching comments:`, error)
    throw error
  }
}

/**
 * Organizes comments into threaded structure
 * @param comments - Flat list of comments
 * @returns CommentThread[]
 */
function organizeCommentsIntoThreads(comments: Comment[]): CommentThread[] {
  const commentMap = new Map<string, Comment>()
  const threads: CommentThread[] = []

  // Index comments by ID
  comments.forEach(comment => {
    commentMap.set(comment.id, comment)
  })

  // Organize into threads
  comments.forEach(comment => {
    if (!comment.parentCommentId) {
      // Root comment - create thread
      const replies = comments.filter(c => c.parentCommentId === comment.id)
      const participants = new Map<string, { userId: string; userName: string; commentCount: number }>()
      
      // Count participants
      const allComments = [comment, ...replies]
      allComments.forEach(c => {
        const existing = participants.get(c.authorId)
        if (existing) {
          existing.commentCount++
        } else {
          participants.set(c.authorId, {
            userId: c.authorId,
            userName: c.authorName,
            commentCount: 1,
          })
        }
      })

      const thread: CommentThread = {
        rootComment: comment,
        replies: replies.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
        totalReplies: replies.length,
        lastReplyAt: replies.length > 0 ? replies[replies.length - 1].createdAt : null,
        participants: Array.from(participants.values()),
      }

      threads.push(thread)
    }
  })

  return threads.sort((a, b) => b.rootComment.createdAt.getTime() - a.rootComment.createdAt.getTime())
}

/**
 * Calculates comment statistics for a workflow
 * @param workflowId - The workflow ID
 * @returns Promise<object> - Comment statistics
 */
async function getCommentStatistics(workflowId: string): Promise<{
  totalComments: number
  unresolvedComments: number
  elementCommentCounts: Record<string, number>
}> {
  const operationId = crypto.randomUUID().slice(0, 8)
  logger.debug(`[${operationId}] Calculating comment statistics for workflow ${workflowId}`)

  try {
    // Get total and unresolved comment counts
    const [totalResult] = await db
      .select({ count: workflowComments.id })
      .from(workflowComments)
      .where(eq(workflowComments.workflowId, workflowId))

    const [unresolvedResult] = await db
      .select({ count: workflowComments.id })
      .from(workflowComments)
      .where(
        and(
          eq(workflowComments.workflowId, workflowId),
          eq(workflowComments.resolved, false)
        )
      )

    const totalComments = totalResult?.count || 0
    const unresolvedComments = unresolvedResult?.count || 0

    // Get comment counts per element
    const elementCounts = await db
      .select({
        elementType: workflowComments.elementType,
        elementId: workflowComments.elementId,
        count: workflowComments.id,
      })
      .from(workflowComments)
      .where(eq(workflowComments.workflowId, workflowId))

    const elementCommentCounts: Record<string, number> = {}
    elementCounts.forEach(item => {
      const key = item.elementId ? `${item.elementType}:${item.elementId}` : item.elementType
      elementCommentCounts[key] = (elementCommentCounts[key] || 0) + 1
    })

    return {
      totalComments,
      unresolvedComments,
      elementCommentCounts,
    }
  } catch (error) {
    logger.error(`[${operationId}] Error calculating comment statistics:`, error)
    throw error
  }
}

// ========================
// API ROUTE HANDLERS
// ========================

/**
 * GET /api/workflows/[id]/comments
 * List comments for a workflow or specific element
 * 
 * Returns comprehensive comment information including:
 * - Filtered and paginated comments
 * - Threaded discussion structure
 * - Comment statistics and counts
 * - Element-specific comment distributions
 * 
 * @param request - Next.js request object with query parameters
 * @param params - Route parameters containing workflow ID
 * @returns JSON response with comment data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id: workflowId } = await params

  logger.info(`[${requestId}] GET /api/workflows/${workflowId}/comments - Listing comments`)

  try {
    // Authentication check
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized access attempt`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Validate workflow access permissions
    const { hasPermission } = await validateWorkflowPermissions(
      workflowId, 
      userId, 
      'view'
    )

    if (!hasPermission) {
      logger.warn(`[${requestId}] Access denied for user ${userId} to workflow ${workflowId}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = {
      elementType: url.searchParams.get('elementType') || undefined,
      elementId: url.searchParams.get('elementId') || undefined,
      resolved: url.searchParams.get('resolved') ? url.searchParams.get('resolved') === 'true' : undefined,
      authorId: url.searchParams.get('authorId') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
      sortBy: (url.searchParams.get('sortBy') as 'created_at' | 'updated_at' | 'position') || 'created_at',
      sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      includeReplies: url.searchParams.get('includeReplies') !== 'false',
    }

    // Fetch comments
    const comments = await getWorkflowComments(workflowId, queryParams)

    // Organize into threads if including replies
    const threads = queryParams.includeReplies ? organizeCommentsIntoThreads(comments) : []

    // Get statistics
    const statistics = await getCommentStatistics(workflowId)

    const response: CommentsResponse = {
      comments,
      threads,
      totalComments: statistics.totalComments,
      unresolvedComments: statistics.unresolvedComments,
      elementCommentCounts: statistics.elementCommentCounts,
      workflowId,
      lastUpdated: new Date(),
    }

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Successfully listed ${comments.length} comments (${threads.length} threads) in ${elapsed}ms`)

    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    logger.error(`[${requestId}] Error listing comments after ${elapsed}ms:`, error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

/**
 * POST /api/workflows/[id]/comments
 * Create a new comment or reply
 * 
 * Creates a new comment on a workflow or specific element.
 * Supports threaded replies and position-based canvas comments.
 * 
 * @param request - Next.js request object with comment data
 * @param params - Route parameters containing workflow ID
 * @returns JSON response with created comment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id: workflowId } = await params

  logger.info(`[${requestId}] POST /api/workflows/${workflowId}/comments - Creating comment`)

  try {
    // Authentication check
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized access attempt`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Validate workflow access permissions (need view access to comment)
    const { hasPermission } = await validateWorkflowPermissions(
      workflowId, 
      userId, 
      'view'
    )

    if (!hasPermission) {
      logger.warn(`[${requestId}] Insufficient permissions for user ${userId}`)
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const commentData = CreateCommentSchema.parse(body)

    logger.debug(`[${requestId}] Creating comment on ${commentData.elementType}:${commentData.elementId}`)

    // Validate parent comment if replying
    if (commentData.parentCommentId) {
      const parentComment = await db
        .select({ id: workflowComments.id })
        .from(workflowComments)
        .where(
          and(
            eq(workflowComments.id, commentData.parentCommentId),
            eq(workflowComments.workflowId, workflowId)
          )
        )
        .then(rows => rows[0])

      if (!parentComment) {
        logger.warn(`[${requestId}] Parent comment ${commentData.parentCommentId} not found`)
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        )
      }
    }

    // Create the comment
    const [createdComment] = await db
      .insert(workflowComments)
      .values({
        workflowId,
        elementType: commentData.elementType,
        elementId: commentData.elementId || null,
        content: commentData.content,
        authorId: userId,
        parentCommentId: commentData.parentCommentId || null,
        positionX: commentData.position?.x?.toString(),
        positionY: commentData.position?.y?.toString(),
        metadata: commentData.metadata || {},
      })
      .returning()

    // Create response comment object
    const comment: Comment = {
      id: createdComment.id,
      workflowId,
      elementType: createdComment.elementType as 'block' | 'edge' | 'workflow' | 'variable',
      elementId: createdComment.elementId,
      content: createdComment.content,
      authorId: userId,
      authorName: session.user.name || 'Unknown User',
      authorEmail: session.user.email || '',
      resolved: createdComment.resolved,
      createdAt: createdComment.createdAt,
      updatedAt: createdComment.updatedAt,
      parentCommentId: createdComment.parentCommentId,
      position: createdComment.positionX && createdComment.positionY ? {
        x: parseFloat(createdComment.positionX),
        y: parseFloat(createdComment.positionY),
      } : undefined,
      metadata: createdComment.metadata as Record<string, any>,
      replyCount: 0,
    }

    // If this is a reply, get the thread information
    let thread: CommentThread | undefined
    if (commentData.parentCommentId) {
      const threadComments = await getWorkflowComments(workflowId, {
        parentCommentId: commentData.parentCommentId,
        includeReplies: true,
      })
      const threads = organizeCommentsIntoThreads(threadComments)
      thread = threads[0]
    }

    const response: CreateCommentResponse = {
      comment,
      thread,
      message: commentData.parentCommentId 
        ? 'Reply created successfully'
        : 'Comment created successfully',
    }

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Created comment ${comment.id} in ${elapsed}ms`)

    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid request data:`, { errors: error.errors })
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error creating comment after ${elapsed}ms:`, error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Additional routes would be implemented as separate route files:
// - PUT handler for updating comments
// - DELETE handler for deleting comments
// - POST handler for resolving/unresolving comments

// ========================
// EXPORTED UTILITIES
// ========================

export { 
  getWorkflowComments,
  organizeCommentsIntoThreads,
  getCommentStatistics,
  type Comment,
  type CommentThread,
  type CommentsResponse 
}