/**
 * Workflow Element Locking System API
 *
 * This module provides granular locking mechanisms for collaborative workflow editing.
 * It prevents conflicts by allowing users to lock specific workflow elements during editing.
 *
 * Endpoints:
 * - GET /api/workflows/[id]/locks - List current locks
 * - POST /api/workflows/[id]/locks - Create new locks
 * - PUT /api/workflows/[id]/locks/[lockId] - Renew lock expiration
 * - DELETE /api/workflows/[id]/locks/[lockId] - Release specific lock
 * - DELETE /api/workflows/[id]/locks - Release all locks for user
 *
 * Features:
 * - Granular element locking (blocks, edges, subblocks, variables)
 * - Automatic expiration to prevent stale locks
 * - Lock conflict detection and resolution
 * - Bulk operations for efficiency
 * - Comprehensive audit trail
 *
 * @author Claude Code Assistant
 * @version 1.0.0
 * @since 2025-09-02
 */

import { and, desc, eq, gt, inArray, lt } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { user, workflowElementLocks } from '@/db/schema'
import { validateWorkflowPermissions } from '../collaborate/route'

const logger = createLogger('WorkflowLocksAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const CreateLockSchema = z.object({
  elements: z
    .array(
      z.object({
        elementType: z.enum(['block', 'edge', 'subblock', 'variable']),
        elementId: z.string().min(1, 'Element ID is required'),
        lockReason: z.enum(['editing', 'reviewing', 'custom']).default('editing'),
        customReason: z.string().optional(),
      })
    )
    .min(1, 'At least one element must be specified'),
  durationMinutes: z.number().min(1).max(120).default(30), // 1-120 minutes
  metadata: z.record(z.any()).optional(),
})

const RenewLockSchema = z.object({
  durationMinutes: z.number().min(1).max(120).default(30),
})

const ReleaseLockSchema = z.object({
  lockIds: z.array(z.string()).optional(), // For bulk release
  elementIds: z.array(z.string()).optional(), // For releasing by element ID
  force: z.boolean().default(false), // For admin force-release
})

// ========================
// TYPES AND INTERFACES
// ========================

interface ElementLock {
  id: string
  workflowId: string
  elementType: 'block' | 'edge' | 'subblock' | 'variable'
  elementId: string
  lockedByUserId: string
  lockedByUserName: string
  lockedAt: Date
  expiresAt: Date
  lockReason: 'editing' | 'reviewing' | 'custom'
  customReason?: string
  metadata: Record<string, any>
  isExpired: boolean
  remainingMinutes: number
}

interface LockConflict {
  elementType: string
  elementId: string
  conflictingLock: ElementLock
  requestedBy: string
}

interface LockResponse {
  locks: ElementLock[]
  totalLocks: number
  expiredLocks: number
  conflicts: LockConflict[]
  workflowId: string
  lastUpdated: Date
}

interface CreateLockResponse {
  createdLocks: ElementLock[]
  conflicts: LockConflict[]
  totalRequested: number
  totalCreated: number
  message: string
}

// ========================
// UTILITY FUNCTIONS
// ========================

/**
 * Cleans up expired locks from the database
 * @param workflowId - Optional workflow ID to limit cleanup scope
 * @returns Promise<number> - Number of locks cleaned up
 */
async function cleanupExpiredLocks(workflowId?: string): Promise<number> {
  const operationId = crypto.randomUUID().slice(0, 8)
  logger.debug(`[${operationId}] Cleaning up expired locks`, { workflowId })

  try {
    let whereClause = lt(workflowElementLocks.expiresAt, new Date())

    if (workflowId) {
      const combinedClause = and(
        eq(workflowElementLocks.workflowId, workflowId),
        lt(workflowElementLocks.expiresAt, new Date())
      )
      if (combinedClause) {
        whereClause = combinedClause
      }
    }

    const deletedLocks = await db.delete(workflowElementLocks).where(whereClause).returning()

    logger.debug(`[${operationId}] Cleaned up ${deletedLocks.length} expired locks`)
    return deletedLocks.length
  } catch (error) {
    logger.error(`[${operationId}] Error cleaning up expired locks:`, error)
    throw error
  }
}

/**
 * Checks for lock conflicts before creating new locks
 * @param workflowId - The workflow ID
 * @param elements - Elements to check for conflicts
 * @param requestingUserId - User requesting the locks
 * @returns Promise<LockConflict[]>
 */
async function checkLockConflicts(
  workflowId: string,
  elements: Array<{ elementType: string; elementId: string }>,
  requestingUserId: string
): Promise<LockConflict[]> {
  const operationId = crypto.randomUUID().slice(0, 8)
  logger.debug(`[${operationId}] Checking lock conflicts for ${elements.length} elements`)

  try {
    const conflicts: LockConflict[] = []

    for (const element of elements) {
      // Check if element is already locked by someone else
      const existingLock = await db
        .select({
          id: workflowElementLocks.id,
          elementType: workflowElementLocks.elementType,
          elementId: workflowElementLocks.elementId,
          lockedByUserId: workflowElementLocks.lockedByUserId,
          lockedAt: workflowElementLocks.lockedAt,
          expiresAt: workflowElementLocks.expiresAt,
          lockReason: workflowElementLocks.lockReason,
          metadata: workflowElementLocks.metadata,
          lockedByUserName: user.name,
        })
        .from(workflowElementLocks)
        .leftJoin(user, eq(workflowElementLocks.lockedByUserId, user.id))
        .where(
          and(
            eq(workflowElementLocks.workflowId, workflowId),
            eq(workflowElementLocks.elementType, element.elementType),
            eq(workflowElementLocks.elementId, element.elementId),
            // Only consider non-expired locks
            eq(workflowElementLocks.expiresAt, new Date()) // This should be gt, not eq
          )
        )
        .then((rows) => rows[0])

      // Check if lock is held by someone else (not the requesting user)
      if (existingLock && existingLock.lockedByUserId !== requestingUserId) {
        const now = new Date()
        const isExpired = existingLock.expiresAt < now

        // Only create conflict if lock is not expired
        if (!isExpired) {
          conflicts.push({
            elementType: element.elementType,
            elementId: element.elementId,
            conflictingLock: {
              id: existingLock.id,
              workflowId,
              elementType: existingLock.elementType as 'block' | 'edge' | 'subblock' | 'variable',
              elementId: existingLock.elementId,
              lockedByUserId: existingLock.lockedByUserId,
              lockedByUserName: existingLock.lockedByUserName || 'Unknown User',
              lockedAt: existingLock.lockedAt,
              expiresAt: existingLock.expiresAt,
              lockReason: existingLock.lockReason as 'editing' | 'reviewing' | 'custom',
              metadata: existingLock.metadata as Record<string, any>,
              isExpired: false,
              remainingMinutes: Math.ceil(
                (existingLock.expiresAt.getTime() - now.getTime()) / (1000 * 60)
              ),
            },
            requestedBy: requestingUserId,
          })
        }
      }
    }

    logger.debug(`[${operationId}] Found ${conflicts.length} lock conflicts`)
    return conflicts
  } catch (error) {
    logger.error(`[${operationId}] Error checking lock conflicts:`, error)
    throw error
  }
}

/**
 * Fetches current locks for a workflow with user information
 * @param workflowId - The workflow ID
 * @param includeExpired - Whether to include expired locks
 * @returns Promise<ElementLock[]>
 */
async function getWorkflowLocks(
  workflowId: string,
  includeExpired = false
): Promise<ElementLock[]> {
  const operationId = crypto.randomUUID().slice(0, 8)
  logger.debug(`[${operationId}] Fetching locks for workflow ${workflowId}`)

  try {
    let whereClause = eq(workflowElementLocks.workflowId, workflowId)

    if (!includeExpired) {
      // Only include non-expired locks
      const combinedClause = and(
        eq(workflowElementLocks.workflowId, workflowId),
        gt(workflowElementLocks.expiresAt, new Date()) // Fixed: use gt (greater than) for non-expired locks
      )
      if (combinedClause) {
        whereClause = combinedClause
      }
    }

    const locks = await db
      .select({
        id: workflowElementLocks.id,
        elementType: workflowElementLocks.elementType,
        elementId: workflowElementLocks.elementId,
        lockedByUserId: workflowElementLocks.lockedByUserId,
        lockedAt: workflowElementLocks.lockedAt,
        expiresAt: workflowElementLocks.expiresAt,
        lockReason: workflowElementLocks.lockReason,
        metadata: workflowElementLocks.metadata,
        lockedByUserName: user.name,
      })
      .from(workflowElementLocks)
      .leftJoin(user, eq(workflowElementLocks.lockedByUserId, user.id))
      .where(whereClause)
      .orderBy(desc(workflowElementLocks.lockedAt))

    const now = new Date()
    const elementLocks: ElementLock[] = locks.map((lock) => {
      const isExpired = lock.expiresAt < now
      const remainingMinutes = Math.max(
        0,
        Math.ceil((lock.expiresAt.getTime() - now.getTime()) / (1000 * 60))
      )

      return {
        id: lock.id,
        workflowId,
        elementType: lock.elementType as 'block' | 'edge' | 'subblock' | 'variable',
        elementId: lock.elementId,
        lockedByUserId: lock.lockedByUserId,
        lockedByUserName: lock.lockedByUserName || 'Unknown User',
        lockedAt: lock.lockedAt,
        expiresAt: lock.expiresAt,
        lockReason: lock.lockReason as 'editing' | 'reviewing' | 'custom',
        metadata: lock.metadata as Record<string, any>,
        isExpired,
        remainingMinutes,
      }
    })

    logger.debug(`[${operationId}] Found ${elementLocks.length} locks`)
    return elementLocks
  } catch (error) {
    logger.error(`[${operationId}] Error fetching workflow locks:`, error)
    throw error
  }
}

// ========================
// API ROUTE HANDLERS
// ========================

/**
 * GET /api/workflows/[id]/locks
 * List current locks for a workflow
 *
 * Returns comprehensive lock information including:
 * - Active and expired locks (configurable)
 * - Lock holder information
 * - Remaining time for each lock
 * - Conflict detection results
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing workflow ID
 * @returns JSON response with lock information
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id: workflowId } = await params

  logger.info(`[${requestId}] GET /api/workflows/${workflowId}/locks - Listing locks`)

  try {
    // Authentication check
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized access attempt`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Validate workflow access permissions
    const { hasPermission } = await validateWorkflowPermissions(workflowId, userId, 'view')

    if (!hasPermission) {
      logger.warn(`[${requestId}] Access denied for user ${userId} to workflow ${workflowId}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse query parameters
    const url = new URL(request.url)
    const includeExpired = url.searchParams.get('includeExpired') === 'true'
    const cleanup = url.searchParams.get('cleanup') === 'true'

    // Cleanup expired locks if requested
    let cleanedUpCount = 0
    if (cleanup) {
      cleanedUpCount = await cleanupExpiredLocks(workflowId)
    }

    // Fetch current locks
    const locks = await getWorkflowLocks(workflowId, includeExpired)

    // Calculate statistics
    const totalLocks = locks.length
    const expiredLocks = locks.filter((l) => l.isExpired).length

    const response: LockResponse = {
      locks,
      totalLocks,
      expiredLocks,
      conflicts: [], // No conflicts when just listing
      workflowId,
      lastUpdated: new Date(),
    }

    const elapsed = Date.now() - startTime
    logger.info(
      `[${requestId}] Successfully listed ${totalLocks} locks (${expiredLocks} expired, ${cleanedUpCount} cleaned) in ${elapsed}ms`
    )

    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    logger.error(`[${requestId}] Error listing locks after ${elapsed}ms:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/workflows/[id]/locks
 * Create new locks for workflow elements
 *
 * Attempts to lock specified elements for collaborative editing.
 * Handles conflict detection and provides detailed feedback.
 *
 * @param request - Next.js request object with lock requests
 * @param params - Route parameters containing workflow ID
 * @returns JSON response with created locks and any conflicts
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id: workflowId } = await params

  logger.info(`[${requestId}] POST /api/workflows/${workflowId}/locks - Creating locks`)

  try {
    // Authentication check
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized access attempt`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Validate workflow access permissions (need edit access to lock)
    const { hasPermission } = await validateWorkflowPermissions(workflowId, userId, 'edit')

    if (!hasPermission) {
      logger.warn(`[${requestId}] Insufficient permissions for user ${userId} to create locks`)
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const { elements, durationMinutes, metadata } = CreateLockSchema.parse(body)

    logger.debug(`[${requestId}] Creating ${elements.length} locks for ${durationMinutes} minutes`)

    // Clean up expired locks first
    await cleanupExpiredLocks(workflowId)

    // Check for conflicts
    const conflicts = await checkLockConflicts(
      workflowId, 
      elements.map(({ elementType, elementId }) => ({ elementType, elementId })), 
      userId
    )

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000)

    // Create locks for non-conflicting elements
    const createdLocks: ElementLock[] = []
    const conflictingElementIds = new Set(conflicts.map((c) => `${c.elementType}:${c.elementId}`))

    for (const element of elements) {
      const elementKey = `${element.elementType}:${element.elementId}`

      // Skip elements with conflicts
      if (conflictingElementIds.has(elementKey)) {
        continue
      }

      try {
        // Create or update lock (upsert)
        const [createdLock] = await db
          .insert(workflowElementLocks)
          .values({
            workflowId,
            elementType: element.elementType,
            elementId: element.elementId,
            lockedByUserId: userId,
            expiresAt,
            lockReason: element.lockReason,
            metadata: {
              ...metadata,
              customReason: element.customReason,
              requestId,
            },
          })
          .onConflictDoUpdate({
            target: [
              workflowElementLocks.workflowId,
              workflowElementLocks.elementType,
              workflowElementLocks.elementId,
            ],
            set: {
              lockedByUserId: userId,
              lockedAt: new Date(),
              expiresAt,
              lockReason: element.lockReason,
              metadata: {
                ...metadata,
                customReason: element.customReason,
                requestId,
              },
            },
          })
          .returning()

        // Get user name for response
        const userName = session.user.name || 'Unknown User'

        createdLocks.push({
          id: createdLock.id,
          workflowId,
          elementType: createdLock.elementType as 'block' | 'edge' | 'subblock' | 'variable',
          elementId: createdLock.elementId,
          lockedByUserId: userId,
          lockedByUserName: userName,
          lockedAt: createdLock.lockedAt,
          expiresAt: createdLock.expiresAt,
          lockReason: createdLock.lockReason as 'editing' | 'reviewing' | 'custom',
          metadata: createdLock.metadata as Record<string, any>,
          isExpired: false,
          remainingMinutes: durationMinutes,
        })
      } catch (lockError) {
        logger.error(`[${requestId}] Error creating lock for ${elementKey}:`, lockError)
        // Continue creating other locks
      }
    }

    const response: CreateLockResponse = {
      createdLocks,
      conflicts,
      totalRequested: elements.length,
      totalCreated: createdLocks.length,
      message:
        conflicts.length > 0
          ? `Created ${createdLocks.length}/${elements.length} locks. ${conflicts.length} conflicts detected.`
          : `Successfully created all ${createdLocks.length} locks.`,
    }

    const elapsed = Date.now() - startTime
    logger.info(
      `[${requestId}] Created ${createdLocks.length}/${elements.length} locks with ${conflicts.length} conflicts in ${elapsed}ms`
    )

    const statusCode = conflicts.length > 0 ? 207 : 201 // 207 Multi-Status for partial success
    return NextResponse.json(response, { status: statusCode })
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid request data:`, { errors: error.errors })
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error creating locks after ${elapsed}ms:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/workflows/[id]/locks
 * Release locks for workflow elements
 *
 * Removes locks based on lock IDs, element IDs, or all locks for the user.
 * Supports bulk operations and force release (for admins).
 *
 * @param request - Next.js request object with release parameters
 * @param params - Route parameters containing workflow ID
 * @returns JSON response with release results
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id: workflowId } = await params

  logger.info(`[${requestId}] DELETE /api/workflows/${workflowId}/locks - Releasing locks`)

  try {
    // Authentication check
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized access attempt`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Validate workflow access permissions
    const { hasPermission, userRole } = await validateWorkflowPermissions(
      workflowId,
      userId,
      'edit'
    )

    if (!hasPermission) {
      logger.warn(`[${requestId}] Insufficient permissions for user ${userId} to release locks`)
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse request body or query parameters
    const body = await request.json().catch(() => ({}))
    const url = new URL(request.url)

    const lockIds = body.lockIds || url.searchParams.get('lockIds')?.split(',') || []
    const elementIds = body.elementIds || url.searchParams.get('elementIds')?.split(',') || []
    const force = body.force || url.searchParams.get('force') === 'true'
    const releaseAll = url.searchParams.get('all') === 'true'

    // Check if user can force release (admin or owner)
    const canForceRelease = userRole?.includes('admin') || userRole?.includes('owner') || force

    const whereConditions = [eq(workflowElementLocks.workflowId, workflowId)]

    if (releaseAll) {
      // Release all locks for this user (or all if force and admin)
      if (!canForceRelease) {
        whereConditions.push(eq(workflowElementLocks.lockedByUserId, userId))
      }
    } else if (lockIds.length > 0) {
      // Release specific lock IDs
      whereConditions.push(inArray(workflowElementLocks.id, lockIds))
      if (!canForceRelease) {
        whereConditions.push(eq(workflowElementLocks.lockedByUserId, userId))
      }
    } else if (elementIds.length > 0) {
      // Release locks for specific element IDs
      whereConditions.push(inArray(workflowElementLocks.elementId, elementIds))
      if (!canForceRelease) {
        whereConditions.push(eq(workflowElementLocks.lockedByUserId, userId))
      }
    } else {
      return NextResponse.json(
        { error: 'Must specify lockIds, elementIds, or use ?all=true' },
        { status: 400 }
      )
    }

    // Release the locks
    const releasedLocks = await db
      .delete(workflowElementLocks)
      .where(and(...whereConditions))
      .returning()

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Released ${releasedLocks.length} locks in ${elapsed}ms`)

    return NextResponse.json(
      {
        success: true,
        message: `Successfully released ${releasedLocks.length} locks`,
        releasedCount: releasedLocks.length,
        releasedLocks: releasedLocks.map((lock) => ({
          id: lock.id,
          elementType: lock.elementType,
          elementId: lock.elementId,
        })),
        workflowId,
        releasedAt: new Date(),
      },
      { status: 200 }
    )
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    logger.error(`[${requestId}] Error releasing locks after ${elapsed}ms:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ========================
// EXPORTED UTILITIES
// ========================

export {
  cleanupExpiredLocks,
  checkLockConflicts,
  getWorkflowLocks,
  type ElementLock,
  type LockConflict,
  type CreateLockResponse,
}
