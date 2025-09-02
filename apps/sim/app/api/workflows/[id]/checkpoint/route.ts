/**
 * Workflow Checkpoint API Endpoints
 *
 * Advanced checkpoint management for workflow development and collaboration with:
 * - POST /api/workflows/[id]/checkpoint - Create manual checkpoint/snapshot
 * - GET /api/workflows/[id]/checkpoint - List recent checkpoints with metadata
 *
 * This API provides professional-grade checkpoint functionality including:
 * - Manual checkpoint creation for important milestones
 * - Automatic checkpoint triggers based on significant changes
 * - Checkpoint labeling and categorization
 * - Quick restore points for development workflows
 * - Checkpoint comparison and diff analysis
 * - Collaborative checkpoint sharing
 * - Checkpoint cleanup and retention policies
 * - Integration with CI/CD pipelines
 */

import crypto from 'crypto'
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { createLogger } from '@/lib/logs/console/logger'
import { getUserEntityPermissions } from '@/lib/permissions/utils'
import { loadWorkflowFromNormalizedTables } from '@/lib/workflows/db-helpers'
import { WorkflowVersionManager } from '@/lib/workflows/versioning'
import { db } from '@/db'
import {
  apiKey as apiKeyTable,
  workflow as workflowTable,
  workflowVersions,
  workflowVersionTags,
} from '@/db/schema'

const logger = createLogger('WorkflowCheckpointAPI')

// Checkpoint creation schema
const CreateCheckpointSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['milestone', 'backup', 'experiment', 'release', 'debug']).default('milestone'),
  tags: z.array(z.string().min(1).max(30)).max(5).default([]),
  metadata: z.record(z.any()).optional(),
  autoTag: z.boolean().default(true),
})

// Checkpoint listing schema
const ListCheckpointsSchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).default('20').optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0').optional(),
  category: z.enum(['milestone', 'backup', 'experiment', 'release', 'debug']).optional(),
  since: z.string().datetime().optional(),
  includeAutomatic: z
    .string()
    .transform((val) => val !== 'false')
    .optional(), // Default true
  includeTags: z
    .string()
    .transform((val) => val !== 'false')
    .optional(), // Default true
})

/**
 * POST /api/workflows/[id]/checkpoint
 *
 * Create a manual checkpoint/snapshot of the current workflow state.
 * Checkpoints are special versions designed for quick restore points and milestones.
 *
 * Request Body:
 * - name: Checkpoint name (required, max 100 chars)
 * - description: Optional description (max 500 chars)
 * - category: Checkpoint category (milestone, backup, experiment, release, debug)
 * - tags: Array of custom tags (max 5 tags, 30 chars each)
 * - metadata: Additional metadata object
 * - autoTag: Automatically add system tags based on changes (default: true)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id: workflowId } = await params

  try {
    logger.info(`[${requestId}] Creating checkpoint for workflow ${workflowId}`)

    // Authentication and authorization check with write permission
    const { userId, hasAccess } = await authenticateAndAuthorize(
      request,
      workflowId,
      requestId,
      'write'
    )

    if (!hasAccess) {
      logger.warn(`[${requestId}] Write access denied for workflow ${workflowId}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const checkpointData = CreateCheckpointSchema.parse(body)

    logger.debug(`[${requestId}] Creating checkpoint with options`, checkpointData)

    // Get current workflow state from normalized tables
    const currentState = await loadWorkflowFromNormalizedTables(workflowId)

    if (!currentState) {
      logger.error(`[${requestId}] No workflow state found for ${workflowId}`)
      return NextResponse.json({ error: 'Workflow state not found', requestId }, { status: 404 })
    }

    // Extract request context for auditing
    const userAgent = request.headers.get('user-agent') || undefined
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || undefined

    // Prepare version creation options for checkpoint
    const versionOptions = {
      versionType: 'checkpoint' as const,
      versionTag: checkpointData.category,
      description: `Checkpoint: ${checkpointData.name}${checkpointData.description ? ` - ${checkpointData.description}` : ''}`,
      incrementType: 'patch' as const, // Checkpoints are typically patch increments
      branchName: 'main', // Checkpoints typically stay on main branch
    }

    // Initialize version manager and create checkpoint version
    const versionManager = new WorkflowVersionManager()

    const checkpointVersion = await versionManager.createVersion(
      workflowId,
      {
        blocks: currentState.blocks,
        edges: currentState.edges,
        loops: currentState.loops,
        parallels: currentState.parallels,
      },
      versionOptions,
      userId,
      userAgent,
      ipAddress
    )

    // Add checkpoint-specific tags
    const tagsToAdd = [...checkpointData.tags]

    // Add automatic tags based on category and analysis if enabled
    if (checkpointData.autoTag) {
      tagsToAdd.push('checkpoint', checkpointData.category)

      // Add contextual tags based on change analysis
      const changeSummary = checkpointVersion.changeSummary || {}
      if (changeSummary.breakingChanges > 0) {
        tagsToAdd.push('breaking')
      }
      if (changeSummary.totalChanges > 10) {
        tagsToAdd.push('major-changes')
      }
    }

    // Create checkpoint tags (avoid duplicates)
    const uniqueTags = [...new Set(tagsToAdd)]
    const tagPromises = uniqueTags.map(
      (tagName) =>
        db
          .insert(workflowVersionTags)
          .values({
            id: crypto.randomUUID(),
            versionId: checkpointVersion.id,
            tagName,
            tagColor: getTagColorForCategory(checkpointData.category, tagName),
            tagDescription: getTagDescription(tagName, checkpointData.category),
            isSystemTag:
              checkpointData.autoTag && ['checkpoint', checkpointData.category].includes(tagName),
            createdByUserId: userId,
            createdAt: new Date(),
          })
          .onConflictDoNothing() // Ignore conflicts if tag already exists
    )

    await Promise.all(tagPromises)

    // Build comprehensive checkpoint metadata
    const checkpointMetadata = {
      ...checkpointData.metadata,
      checkpointName: checkpointData.name,
      checkpointCategory: checkpointData.category,
      workflowState: {
        blockCount: Object.keys(currentState.blocks).length,
        edgeCount: currentState.edges.length,
        loopCount: Object.keys(currentState.loops).length,
        parallelCount: Object.keys(currentState.parallels).length,
      },
      creationContext: {
        manual: true,
        trigger: 'user_action',
        userAgent,
        ipAddress,
      },
      performance: {
        creationTime: checkpointVersion.creationDurationMs,
        serializationTime: checkpointVersion.serializationTimeMs,
        stateSize: checkpointVersion.stateSize,
      },
    }

    // Get the created checkpoint with tags
    const checkpointTags = await db
      .select({
        tagName: workflowVersionTags.tagName,
        tagColor: workflowVersionTags.tagColor,
        tagDescription: workflowVersionTags.tagDescription,
        isSystemTag: workflowVersionTags.isSystemTag,
      })
      .from(workflowVersionTags)
      .where(eq(workflowVersionTags.versionId, checkpointVersion.id))

    // Build comprehensive response
    const response = {
      data: {
        checkpoint: {
          id: checkpointVersion.id,
          name: checkpointData.name,
          description: checkpointData.description,
          category: checkpointData.category,
          version: {
            number: checkpointVersion.versionNumber,
            type: checkpointVersion.versionType,
            created: checkpointVersion.createdAt,
            hash: checkpointVersion.stateHash,
            size: checkpointVersion.stateSize,
          },
          tags: checkpointTags.map((tag) => ({
            name: tag.tagName,
            color: tag.tagColor,
            description: tag.tagDescription,
            isSystem: tag.isSystemTag,
          })),
          metadata: checkpointMetadata,
          statistics: {
            changeCount: Object.keys(checkpointVersion.changeSummary).length,
            creationTime: checkpointVersion.creationDurationMs,
            serializationTime: checkpointVersion.serializationTimeMs,
          },
        },
        workflow: {
          id: workflowId,
          currentVersion: checkpointVersion.versionNumber,
          totalCheckpoints: await getCheckpointCount(workflowId),
        },
      },
      meta: {
        requestId,
        workflowId,
        createdBy: userId,
        timestamp: checkpointVersion.createdAt.toISOString(),
        processingTimeMs: Date.now() - startTime,
        checkpointType: 'manual',
      },
    }

    const elapsed = Date.now() - startTime
    logger.info(
      `[${requestId}] Checkpoint '${checkpointData.name}' created successfully in ${elapsed}ms`,
      {
        checkpointId: checkpointVersion.id,
        category: checkpointData.category,
        tagCount: uniqueTags.length,
        stateSize: checkpointVersion.stateSize,
      }
    )

    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid checkpoint data`, {
        errors: error.errors,
        elapsed,
      })
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    // Handle specific checkpoint creation errors
    if (error.message.includes('No changes detected')) {
      logger.info(`[${requestId}] No changes detected for checkpoint creation`)
      return NextResponse.json(
        {
          error: 'No changes to checkpoint',
          message: 'Cannot create checkpoint with no changes from current state',
          suggestion: 'Make changes to the workflow before creating a checkpoint',
          requestId,
        },
        { status: 409 }
      )
    }

    logger.error(`[${requestId}] Failed to create checkpoint after ${elapsed}ms`, {
      error: error.message,
      stack: error.stack,
      workflowId,
    })

    return NextResponse.json(
      {
        error: 'Failed to create checkpoint',
        requestId,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/workflows/[id]/checkpoint
 *
 * List recent checkpoints for the workflow with metadata and filtering options.
 * Provides quick access to restore points and milestone tracking.
 *
 * Query Parameters:
 * - limit: Number of checkpoints to return (default: 20, max: 100)
 * - offset: Number of checkpoints to skip (default: 0)
 * - category: Filter by checkpoint category
 * - since: ISO datetime to get checkpoints since
 * - includeAutomatic: Include automatic checkpoints (default: true)
 * - includeTags: Include checkpoint tags (default: true)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id: workflowId } = await params

  try {
    logger.info(`[${requestId}] Listing checkpoints for workflow ${workflowId}`)

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedQuery = ListCheckpointsSchema.parse(queryParams)

    // Authentication and authorization check
    const { userId, hasAccess } = await authenticateAndAuthorize(request, workflowId, requestId)
    if (!hasAccess) {
      logger.warn(`[${requestId}] Access denied for workflow ${workflowId}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build query filters
    const { limit = 20, offset = 0 } = validatedQuery
    const actualLimit = Math.min(limit, 100) // Enforce maximum

    // Build where conditions for checkpoint versions
    const whereConditions = [
      eq(workflowVersions.workflowId, workflowId),
      eq(workflowVersions.versionType, 'checkpoint'),
    ]

    // Add time filter if specified
    if (validatedQuery.since) {
      whereConditions.push(gte(workflowVersions.createdAt, new Date(validatedQuery.since)))
    }

    // Get checkpoint versions
    const checkpointVersions = await db
      .select({
        id: workflowVersions.id,
        versionNumber: workflowVersions.versionNumber,
        versionTag: workflowVersions.versionTag,
        versionDescription: workflowVersions.versionDescription,
        changeSummary: workflowVersions.changeSummary,
        stateHash: workflowVersions.stateHash,
        stateSize: workflowVersions.stateSize,
        isCurrent: workflowVersions.isCurrent,
        isDeployed: workflowVersions.isDeployed,
        deployedAt: workflowVersions.deployedAt,
        createdByUserId: workflowVersions.createdByUserId,
        createdAt: workflowVersions.createdAt,
        creationDurationMs: workflowVersions.creationDurationMs,
        serializationTimeMs: workflowVersions.serializationTimeMs,
      })
      .from(workflowVersions)
      .where(and(...whereConditions))
      .orderBy(desc(workflowVersions.createdAt))
      .limit(actualLimit)
      .offset(offset)

    // Get tags for all checkpoints if requested
    const checkpointTags: Record<string, any[]> = {}
    if (validatedQuery.includeTags && checkpointVersions.length > 0) {
      const versionIds = checkpointVersions.map((v) => v.id)
      const tags = await db
        .select({
          versionId: workflowVersionTags.versionId,
          tagName: workflowVersionTags.tagName,
          tagColor: workflowVersionTags.tagColor,
          tagDescription: workflowVersionTags.tagDescription,
          isSystemTag: workflowVersionTags.isSystemTag,
          tagOrder: workflowVersionTags.tagOrder,
        })
        .from(workflowVersionTags)
        .where(
          inArray(
            workflowVersionTags.versionId,
            checkpointVersions.map((v) => v.id)
          )
        )
        .orderBy(workflowVersionTags.tagOrder)

      // Group tags by version ID
      tags.forEach((tag) => {
        if (!checkpointTags[tag.versionId]) {
          checkpointTags[tag.versionId] = []
        }
        checkpointTags[tag.versionId].push({
          name: tag.tagName,
          color: tag.tagColor,
          description: tag.tagDescription,
          isSystem: tag.isSystemTag,
          order: tag.tagOrder,
        })
      })
    }

    // Process and enhance checkpoint data
    const checkpoints = checkpointVersions
      .filter((version) => {
        // Apply category filter based on tags or version tag
        if (validatedQuery.category) {
          const versionTags = checkpointTags[version.id] || []
          const hasCategory =
            versionTags.some((tag) => tag.name === validatedQuery.category) ||
            version.versionTag === validatedQuery.category
          if (!hasCategory) return false
        }

        // Apply automatic checkpoint filter
        if (!validatedQuery.includeAutomatic) {
          const versionTags = checkpointTags[version.id] || []
          const isAutomatic = versionTags.some((tag) => tag.name === 'automatic' || tag.isSystem)
          if (isAutomatic) return false
        }

        return true
      })
      .map((version) => {
        // Extract checkpoint name from description
        const checkpointName = extractCheckpointName(version.versionDescription)
        const checkpointCategory = extractCheckpointCategory(version, checkpointTags[version.id])

        return {
          id: version.id,
          name: checkpointName,
          category: checkpointCategory,
          version: {
            number: version.versionNumber,
            description: version.versionDescription,
            created: version.createdAt,
            hash: version.stateHash,
            size: version.stateSize,
          },
          status: {
            isCurrent: version.isCurrent,
            isDeployed: version.isDeployed,
            deployedAt: version.deployedAt,
          },
          tags: validatedQuery.includeTags ? checkpointTags[version.id] || [] : undefined,
          metadata: {
            changeCount: Object.keys(version.changeSummary || {}).length,
            createdByUserId: version.createdByUserId,
            performance: {
              creationTime: version.creationDurationMs,
              serializationTime: version.serializationTimeMs,
            },
          },
          actions: {
            canRestore: !version.isCurrent,
            canCompare: true,
            canDelete: !version.isCurrent && !version.isDeployed,
            restoreUrl: `/api/workflows/${workflowId}/versions/${version.id}/restore`,
            compareUrl: `/api/workflows/${workflowId}/versions/${version.id}/compare`,
          },
        }
      })

    // Get total count for pagination
    const [{ count: totalCheckpoints }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workflowVersions)
      .where(and(...whereConditions))

    // Calculate checkpoint statistics
    const stats = {
      totalCheckpoints: Number(totalCheckpoints),
      checkpointsReturned: checkpoints.length,
      categories: await getCheckpointCategoriesStats(workflowId),
      recentActivity: {
        lastCheckpoint: checkpoints[0]?.version.created || null,
        checkpointsLast24h: await getRecentCheckpointCount(workflowId, 24),
        checkpointsLast7d: await getRecentCheckpointCount(workflowId, 7 * 24),
      },
    }

    // Build comprehensive response
    const response = {
      data: {
        checkpoints,
        pagination: {
          total: Number(totalCheckpoints),
          totalPages: Math.ceil(Number(totalCheckpoints) / actualLimit),
          currentPage: Math.floor(offset / actualLimit) + 1,
          limit: actualLimit,
          offset,
          hasNextPage: offset + actualLimit < Number(totalCheckpoints),
          hasPreviousPage: offset > 0,
        },
        statistics: stats,
        filters: {
          category: validatedQuery.category,
          since: validatedQuery.since,
          includeAutomatic: validatedQuery.includeAutomatic,
          includeTags: validatedQuery.includeTags,
        },
      },
      meta: {
        requestId,
        workflowId,
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
        checkpointsReturned: checkpoints.length,
        totalCheckpoints: Number(totalCheckpoints),
      },
    }

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Listed ${checkpoints.length} checkpoints in ${elapsed}ms`, {
      total: totalCheckpoints,
      category: validatedQuery.category,
    })

    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    const elapsed = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid query parameters`, {
        errors: error.errors,
        elapsed,
      })
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Failed to list checkpoints after ${elapsed}ms`, {
      error: error.message,
      stack: error.stack,
      workflowId,
    })

    return NextResponse.json(
      {
        error: 'Failed to list checkpoints',
        requestId,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * Get tag color based on category and tag name
 */
function getTagColorForCategory(category: string, tagName: string): string {
  // Category-based colors
  const categoryColors: Record<string, string> = {
    milestone: '#10B981', // green
    backup: '#6B7280', // gray
    experiment: '#8B5CF6', // purple
    release: '#059669', // dark green
    debug: '#EF4444', // red
  }

  // Special tag colors
  const specialColors: Record<string, string> = {
    checkpoint: '#3B82F6', // blue
    breaking: '#DC2626', // red
    'major-changes': '#F59E0B', // amber
    automatic: '#9CA3AF', // gray
  }

  return specialColors[tagName] || categoryColors[category] || '#6B7280'
}

/**
 * Get tag description based on tag name and category
 */
function getTagDescription(tagName: string, category: string): string | undefined {
  const descriptions: Record<string, string> = {
    checkpoint: 'Manual checkpoint created by user',
    milestone: 'Important milestone in development',
    backup: 'Safety backup before major changes',
    experiment: 'Experimental feature checkpoint',
    release: 'Release candidate or version',
    debug: 'Debug session checkpoint',
    breaking: 'Contains breaking changes',
    'major-changes': 'Contains significant changes',
    automatic: 'Automatically created checkpoint',
  }

  return descriptions[tagName] || descriptions[category]
}

/**
 * Extract checkpoint name from version description
 */
function extractCheckpointName(description?: string): string {
  if (!description) return 'Unnamed Checkpoint'

  // Look for pattern "Checkpoint: Name - Description" or "Checkpoint: Name"
  const match = description.match(/^Checkpoint: (.+?)(?:\s-\s.*)?$/)
  if (match) {
    return match[1].trim()
  }

  // Fallback to description or default
  return description.length > 50 ? `${description.substring(0, 47)}...` : description
}

/**
 * Extract checkpoint category from version and tags
 */
function extractCheckpointCategory(version: any, tags: any[] = []): string {
  // Check tags first
  const categoryTag = tags.find((tag) =>
    ['milestone', 'backup', 'experiment', 'release', 'debug'].includes(tag.name)
  )

  if (categoryTag) {
    return categoryTag.name
  }

  // Check version tag
  if (
    version.versionTag &&
    ['milestone', 'backup', 'experiment', 'release', 'debug'].includes(version.versionTag)
  ) {
    return version.versionTag
  }

  // Default category
  return 'milestone'
}

/**
 * Get total checkpoint count for a workflow
 */
async function getCheckpointCount(workflowId: string): Promise<number> {
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workflowVersions)
      .where(
        and(
          eq(workflowVersions.workflowId, workflowId),
          eq(workflowVersions.versionType, 'checkpoint')
        )
      )

    return Number(count)
  } catch (error: any) {
    logger.error('Failed to get checkpoint count', { workflowId, error: error.message })
    return 0
  }
}

/**
 * Get checkpoint statistics by category
 */
async function getCheckpointCategoriesStats(workflowId: string): Promise<Record<string, number>> {
  try {
    // Get all checkpoint tags
    const tagStats = await db
      .select({
        tagName: workflowVersionTags.tagName,
        count: sql<number>`count(*)`,
      })
      .from(workflowVersionTags)
      .innerJoin(workflowVersions, eq(workflowVersionTags.versionId, workflowVersions.id))
      .where(
        and(
          eq(workflowVersions.workflowId, workflowId),
          eq(workflowVersions.versionType, 'checkpoint')
        )
      )
      .groupBy(workflowVersionTags.tagName)

    // Filter for category tags
    const categories: Record<string, number> = {
      milestone: 0,
      backup: 0,
      experiment: 0,
      release: 0,
      debug: 0,
    }

    tagStats.forEach((stat) => {
      if (Object.hasOwn(categories, stat.tagName)) {
        categories[stat.tagName] = Number(stat.count)
      }
    })

    return categories
  } catch (error: any) {
    logger.error('Failed to get checkpoint categories stats', { workflowId, error: error.message })
    return { milestone: 0, backup: 0, experiment: 0, release: 0, debug: 0 }
  }
}

/**
 * Get recent checkpoint count
 */
async function getRecentCheckpointCount(workflowId: string, hoursAgo: number): Promise<number> {
  try {
    const sinceDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workflowVersions)
      .where(
        and(
          eq(workflowVersions.workflowId, workflowId),
          eq(workflowVersions.versionType, 'checkpoint'),
          gte(workflowVersions.createdAt, sinceDate)
        )
      )

    return Number(count)
  } catch (error: any) {
    logger.error('Failed to get recent checkpoint count', {
      workflowId,
      hoursAgo,
      error: error.message,
    })
    return 0
  }
}

/**
 * Helper function to authenticate and authorize workflow access
 */
async function authenticateAndAuthorize(
  request: NextRequest,
  workflowId: string,
  requestId: string,
  requiredPermission: 'read' | 'write' = 'read'
): Promise<{ userId?: string; hasAccess: boolean }> {
  try {
    // Check for internal JWT token
    const authHeader = request.headers.get('authorization')
    let isInternalCall = false

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      isInternalCall = await verifyInternalToken(token)
    }

    if (isInternalCall) {
      return { hasAccess: true }
    }

    // Try session auth first
    const session = await getSession()
    let authenticatedUserId: string | null = session?.user?.id || null

    // Check API key auth
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
      return { hasAccess: false }
    }

    // Check workflow access
    const workflowData = await db
      .select()
      .from(workflowTable)
      .where(eq(workflowTable.id, workflowId))
      .then((rows) => rows[0])

    if (!workflowData) {
      return { hasAccess: false }
    }

    let hasAccess = false

    // User owns workflow
    if (workflowData.userId === authenticatedUserId) {
      hasAccess = true
    }

    // Workspace permissions
    if (!hasAccess && workflowData.workspaceId) {
      const userPermission = await getUserEntityPermissions(
        authenticatedUserId,
        'workspace',
        workflowData.workspaceId
      )

      if (userPermission !== null) {
        if (requiredPermission === 'read') {
          hasAccess = true
        } else if (requiredPermission === 'write') {
          hasAccess = userPermission === 'write' || userPermission === 'admin'
        }
      }
    }

    return { userId: authenticatedUserId, hasAccess }
  } catch (error: any) {
    logger.error(`[${requestId}] Authentication error`, {
      error: error.message,
      workflowId,
    })
    return { hasAccess: false }
  }
}
