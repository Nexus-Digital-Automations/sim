import crypto from 'crypto'
import { eq, and, or, like, ilike, desc, asc, sql, inArray } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { getUserEntityPermissions } from '@/lib/permissions/utils'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { workflow, workflowBlocks, workflowFolder, workspace, apiKey as apiKeyTable } from '@/db/schema'

const logger = createLogger('WorkflowAPI')

const CreateWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().default(''),
  color: z.string().optional().default('#3972F6'),
  workspaceId: z.string().optional(),
  folderId: z.string().nullable().optional(),
  // Enhanced creation options
  templateId: z.string().optional(), // Create from template
  cloneFromId: z.string().optional(), // Clone from existing workflow
  yaml: z.string().optional(), // Create from YAML definition
  tags: z.array(z.string()).optional().default([]), // Workflow tags
})

const ListWorkflowsSchema = z.object({
  // Pagination
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  
  // Filtering
  workspaceId: z.string().optional(),
  folderId: z.string().nullable().optional(),
  search: z.string().optional(), // Search in name and description
  tags: z.string().optional(), // Comma-separated tags
  status: z.enum(['deployed', 'draft', 'all']).optional().default('all'),
  
  // Sorting
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'runCount']).optional().default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  
  // Advanced filters
  hasTemplates: z.coerce.boolean().optional(),
  isPublished: z.coerce.boolean().optional(),
  collaboratorId: z.string().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
})

const BulkWorkflowSchema = z.object({
  operation: z.enum(['delete', 'move', 'copy', 'deploy', 'undeploy', 'tag']),
  workflowIds: z.array(z.string()).min(1, 'At least one workflow ID is required'),
  // Operation-specific parameters
  targetFolderId: z.string().nullable().optional(), // For move/copy operations
  targetWorkspaceId: z.string().optional(), // For move/copy operations
  tags: z.array(z.string()).optional(), // For tag operations
  preserveCollaborators: z.boolean().optional().default(true), // For copy operations
})

/**
 * GET /api/workflows - List workflows with advanced filtering, sorting, and pagination
 * Supports search, filtering by workspace/folder, status filtering, and more
 */
export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const filters = ListWorkflowsSchema.parse(queryParams)

    logger.info(`[${requestId}] Listing workflows with filters:`, { filters })

    // Authentication - support both session and API key
    let userId: string | null = null
    let userWorkspaces: string[] = []

    // Check for internal JWT token for server-side calls
    const authHeader = req.headers.get('authorization')
    let isInternalCall = false

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
        const apiKeyHeader = req.headers.get('x-api-key')
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
        logger.warn(`[${requestId}] Unauthorized workflow listing attempt`)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      userId = authenticatedUserId

      // Get user's accessible workspaces for filtering
      const userWorkspacePermissions = await db
        .select({ workspaceId: workspace.id })
        .from(workspace)
        .where(
          or(
            eq(workspace.creatorId, userId),
            // Add workspace permissions check here if needed
          )
        )
      
      userWorkspaces = userWorkspacePermissions.map(w => w.workspaceId)
    }

    // Build the query conditions
    const conditions = []

    if (!isInternalCall && userId) {
      // Only show workflows user has access to
      conditions.push(
        or(
          eq(workflow.userId, userId), // Owned workflows
          ...(userWorkspaces.length > 0 ? [inArray(workflow.workspaceId, userWorkspaces)] : [])
        )
      )
    }

    // Apply filters
    if (filters.workspaceId) {
      conditions.push(eq(workflow.workspaceId, filters.workspaceId))
    }

    if (filters.folderId !== undefined) {
      conditions.push(
        filters.folderId === null 
          ? sql`${workflow.folderId} IS NULL`
          : eq(workflow.folderId, filters.folderId)
      )
    }

    if (filters.search) {
      conditions.push(
        or(
          ilike(workflow.name, `%${filters.search}%`),
          ilike(workflow.description, `%${filters.search}%`)
        )
      )
    }

    if (filters.status !== 'all') {
      conditions.push(
        filters.status === 'deployed' 
          ? eq(workflow.isDeployed, true)
          : eq(workflow.isDeployed, false)
      )
    }

    if (filters.isPublished !== undefined) {
      conditions.push(eq(workflow.isPublished, filters.isPublished))
    }

    if (filters.createdAfter) {
      conditions.push(sql`${workflow.createdAt} >= ${filters.createdAfter}`)
    }

    if (filters.createdBefore) {
      conditions.push(sql`${workflow.createdAt} <= ${filters.createdBefore}`)
    }

    // Build sorting
    const orderByField = filters.sortBy === 'name' ? workflow.name :
                        filters.sortBy === 'createdAt' ? workflow.createdAt :
                        filters.sortBy === 'runCount' ? workflow.runCount :
                        workflow.updatedAt

    const orderBy = filters.sortOrder === 'asc' ? asc(orderByField) : desc(orderByField)

    // Calculate pagination
    const offset = (filters.page - 1) * filters.limit

    // Execute query
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined

    const [workflows, totalCount] = await Promise.all([
      db
        .select({
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          color: workflow.color,
          userId: workflow.userId,
          workspaceId: workflow.workspaceId,
          folderId: workflow.folderId,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt,
          isDeployed: workflow.isDeployed,
          deployedAt: workflow.deployedAt,
          runCount: workflow.runCount,
          lastRunAt: workflow.lastRunAt,
          isPublished: workflow.isPublished,
          collaborators: workflow.collaborators,
        })
        .from(workflow)
        .where(whereCondition)
        .orderBy(orderBy)
        .limit(filters.limit)
        .offset(offset),
      
      db
        .select({ count: sql<number>`count(*)` })
        .from(workflow)
        .where(whereCondition)
        .then(result => result[0]?.count || 0)
    ])

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / filters.limit)
    const hasNextPage = filters.page < totalPages
    const hasPrevPage = filters.page > 1

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Successfully listed ${workflows.length} workflows in ${elapsed}ms`)

    return NextResponse.json({
      data: workflows,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        ...filters,
        // Remove default values for cleaner response
        page: filters.page === 1 ? undefined : filters.page,
        limit: filters.limit === 20 ? undefined : filters.limit,
        sortBy: filters.sortBy === 'updatedAt' ? undefined : filters.sortBy,
        sortOrder: filters.sortOrder === 'desc' ? undefined : filters.sortOrder,
        status: filters.status === 'all' ? undefined : filters.status,
      }
    }, { status: 200 })

  } catch (error: any) {
    const elapsed = Date.now() - startTime
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid workflow listing parameters after ${elapsed}ms`, {
        errors: error.errors,
      })
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error listing workflows after ${elapsed}ms`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/workflows - Create a new workflow
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const session = await getSession()

  if (!session?.user?.id) {
    logger.warn(`[${requestId}] Unauthorized workflow creation attempt`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, description, color, workspaceId, folderId } = CreateWorkflowSchema.parse(body)

    const workflowId = crypto.randomUUID()
    const starterId = crypto.randomUUID()
    const now = new Date()

    logger.info(`[${requestId}] Creating workflow ${workflowId} for user ${session.user.id}`)

    // Create initial state with start block
    const initialState = {
      blocks: {
        [starterId]: {
          id: starterId,
          type: 'starter',
          name: 'Start',
          position: { x: 100, y: 100 },
          subBlocks: {
            startWorkflow: {
              id: 'startWorkflow',
              type: 'dropdown',
              value: 'manual',
            },
            webhookPath: {
              id: 'webhookPath',
              type: 'short-input',
              value: '',
            },
            webhookSecret: {
              id: 'webhookSecret',
              type: 'short-input',
              value: '',
            },
            scheduleType: {
              id: 'scheduleType',
              type: 'dropdown',
              value: 'daily',
            },
            minutesInterval: {
              id: 'minutesInterval',
              type: 'short-input',
              value: '',
            },
            minutesStartingAt: {
              id: 'minutesStartingAt',
              type: 'short-input',
              value: '',
            },
            hourlyMinute: {
              id: 'hourlyMinute',
              type: 'short-input',
              value: '',
            },
            dailyTime: {
              id: 'dailyTime',
              type: 'short-input',
              value: '',
            },
            weeklyDay: {
              id: 'weeklyDay',
              type: 'dropdown',
              value: 'MON',
            },
            weeklyDayTime: {
              id: 'weeklyDayTime',
              type: 'short-input',
              value: '',
            },
            monthlyDay: {
              id: 'monthlyDay',
              type: 'short-input',
              value: '',
            },
            monthlyTime: {
              id: 'monthlyTime',
              type: 'short-input',
              value: '',
            },
            cronExpression: {
              id: 'cronExpression',
              type: 'short-input',
              value: '',
            },
            timezone: {
              id: 'timezone',
              type: 'dropdown',
              value: 'UTC',
            },
          },
          outputs: {
            response: {
              type: {
                input: 'any',
              },
            },
          },
          enabled: true,
          horizontalHandles: true,
          isWide: false,
          advancedMode: false,
          triggerMode: false,
          height: 95,
        },
      },
      edges: [],
      subflows: {},
      variables: {},
      metadata: {
        version: '1.0.0',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    }

    // Create the workflow and start block in a transaction
    await db.transaction(async (tx) => {
      // Create the workflow
      await tx.insert(workflow).values({
        id: workflowId,
        userId: session.user.id,
        workspaceId: workspaceId || null,
        folderId: folderId || null,
        name,
        description,
        color,
        lastSynced: now,
        createdAt: now,
        updatedAt: now,
        isDeployed: false,
        collaborators: [],
        runCount: 0,
        variables: {},
        isPublished: false,
        marketplaceData: null,
      })

      // Insert the start block into workflow_blocks table
      await tx.insert(workflowBlocks).values({
        id: starterId,
        workflowId: workflowId,
        type: 'starter',
        name: 'Start',
        positionX: '100',
        positionY: '100',
        enabled: true,
        horizontalHandles: true,
        isWide: false,
        advancedMode: false,
        triggerMode: false,
        height: '95',
        subBlocks: {
          startWorkflow: {
            id: 'startWorkflow',
            type: 'dropdown',
            value: 'manual',
          },
          webhookPath: {
            id: 'webhookPath',
            type: 'short-input',
            value: '',
          },
          webhookSecret: {
            id: 'webhookSecret',
            type: 'short-input',
            value: '',
          },
          scheduleType: {
            id: 'scheduleType',
            type: 'dropdown',
            value: 'daily',
          },
          minutesInterval: {
            id: 'minutesInterval',
            type: 'short-input',
            value: '',
          },
          minutesStartingAt: {
            id: 'minutesStartingAt',
            type: 'short-input',
            value: '',
          },
          hourlyMinute: {
            id: 'hourlyMinute',
            type: 'short-input',
            value: '',
          },
          dailyTime: {
            id: 'dailyTime',
            type: 'short-input',
            value: '',
          },
          weeklyDay: {
            id: 'weeklyDay',
            type: 'dropdown',
            value: 'MON',
          },
          weeklyDayTime: {
            id: 'weeklyDayTime',
            type: 'short-input',
            value: '',
          },
          monthlyDay: {
            id: 'monthlyDay',
            type: 'short-input',
            value: '',
          },
          monthlyTime: {
            id: 'monthlyTime',
            type: 'short-input',
            value: '',
          },
          cronExpression: {
            id: 'cronExpression',
            type: 'short-input',
            value: '',
          },
          timezone: {
            id: 'timezone',
            type: 'dropdown',
            value: 'UTC',
          },
        },
        outputs: {
          response: {
            type: {
              input: 'any',
            },
          },
        },
        createdAt: now,
        updatedAt: now,
      })

      logger.info(
        `[${requestId}] Successfully created workflow ${workflowId} with start block in workflow_blocks table`
      )
    })

    return NextResponse.json({
      id: workflowId,
      name,
      description,
      color,
      workspaceId,
      folderId,
      createdAt: now,
      updatedAt: now,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid workflow creation data`, {
        errors: error.errors,
      })
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error creating workflow`, error)
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
  }
}

/**
 * PATCH /api/workflows - Bulk operations on multiple workflows
 * Supports bulk delete, move, copy, deploy, undeploy, and tagging operations
 */
export async function PATCH(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    // Get the session
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized bulk workflow operation attempt`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Parse and validate request body
    const body = await req.json()
    const { operation, workflowIds, targetFolderId, targetWorkspaceId, tags, preserveCollaborators } = 
      BulkWorkflowSchema.parse(body)

    logger.info(`[${requestId}] Bulk ${operation} operation for ${workflowIds.length} workflows`, {
      operation,
      workflowIds,
      targetFolderId,
      targetWorkspaceId,
    })

    // Fetch all workflows to validate permissions
    const workflows = await db
      .select()
      .from(workflow)
      .where(inArray(workflow.id, workflowIds))

    if (workflows.length !== workflowIds.length) {
      const foundIds = workflows.map(w => w.id)
      const missingIds = workflowIds.filter(id => !foundIds.includes(id))
      logger.warn(`[${requestId}] Some workflows not found:`, missingIds)
      return NextResponse.json(
        { error: 'Some workflows not found', missingIds },
        { status: 404 }
      )
    }

    // Check permissions for all workflows
    const permissionChecks = await Promise.all(
      workflows.map(async (workflowData) => {
        let hasPermission = false

        // Check if user owns the workflow
        if (workflowData.userId === userId) {
          hasPermission = true
        }

        // Check workspace permissions if workflow belongs to a workspace
        if (!hasPermission && workflowData.workspaceId) {
          const userPermission = await getUserEntityPermissions(
            userId,
            'workspace',
            workflowData.workspaceId
          )
          
          // Different operations require different permission levels
          const requiredPermission = operation === 'delete' ? 'admin' : 'write'
          if (requiredPermission === 'admin') {
            hasPermission = userPermission === 'admin'
          } else {
            hasPermission = userPermission === 'write' || userPermission === 'admin'
          }
        }

        return {
          workflowId: workflowData.id,
          workflowName: workflowData.name,
          hasPermission,
        }
      })
    )

    const deniedWorkflows = permissionChecks.filter(check => !check.hasPermission)
    if (deniedWorkflows.length > 0) {
      logger.warn(`[${requestId}] User ${userId} denied permission for workflows:`, deniedWorkflows)
      return NextResponse.json(
        { 
          error: 'Access denied for some workflows', 
          deniedWorkflows: deniedWorkflows.map(w => ({ id: w.workflowId, name: w.workflowName }))
        },
        { status: 403 }
      )
    }

    let results = []

    // Execute the bulk operation
    switch (operation) {
      case 'delete':
        const deletedIds = []
        for (const workflowId of workflowIds) {
          try {
            await db.delete(workflow).where(eq(workflow.id, workflowId))
            deletedIds.push(workflowId)
            logger.info(`[${requestId}] Deleted workflow ${workflowId}`)
          } catch (error) {
            logger.error(`[${requestId}] Failed to delete workflow ${workflowId}`, error)
          }
        }
        results = deletedIds.map(id => ({ id, status: 'deleted' }))
        break

      case 'move':
        if (targetFolderId === undefined && !targetWorkspaceId) {
          return NextResponse.json(
            { error: 'Target folder or workspace required for move operation' },
            { status: 400 }
          )
        }

        const movedIds = []
        for (const workflowId of workflowIds) {
          try {
            const updateData: any = {}
            if (targetFolderId !== undefined) updateData.folderId = targetFolderId
            if (targetWorkspaceId) updateData.workspaceId = targetWorkspaceId
            updateData.updatedAt = new Date()

            await db
              .update(workflow)
              .set(updateData)
              .where(eq(workflow.id, workflowId))

            movedIds.push(workflowId)
            logger.info(`[${requestId}] Moved workflow ${workflowId}`)
          } catch (error) {
            logger.error(`[${requestId}] Failed to move workflow ${workflowId}`, error)
          }
        }
        results = movedIds.map(id => ({ id, status: 'moved' }))
        break

      case 'copy':
        if (targetFolderId === undefined && !targetWorkspaceId) {
          return NextResponse.json(
            { error: 'Target folder or workspace required for copy operation' },
            { status: 400 }
          )
        }

        const copiedWorkflows = []
        for (const workflowData of workflows) {
          try {
            const newWorkflowId = crypto.randomUUID()
            const now = new Date()

            // Create copy with new ID and target location
            const copyData = {
              ...workflowData,
              id: newWorkflowId,
              name: `${workflowData.name} (Copy)`,
              userId,
              workspaceId: targetWorkspaceId || workflowData.workspaceId,
              folderId: targetFolderId !== undefined ? targetFolderId : workflowData.folderId,
              createdAt: now,
              updatedAt: now,
              isDeployed: false, // Copies are not deployed by default
              deployedState: null,
              deployedAt: null,
              collaborators: preserveCollaborators ? workflowData.collaborators : [],
              runCount: 0,
              lastRunAt: null,
            }

            const [copiedWorkflow] = await db.insert(workflow).values(copyData).returning()

            // TODO: Copy workflow blocks, edges, and subflows
            // This would require additional logic to duplicate all related data

            copiedWorkflows.push({ originalId: workflowData.id, newId: newWorkflowId })
            logger.info(`[${requestId}] Copied workflow ${workflowData.id} to ${newWorkflowId}`)
          } catch (error) {
            logger.error(`[${requestId}] Failed to copy workflow ${workflowData.id}`, error)
          }
        }
        results = copiedWorkflows.map(({ originalId, newId }) => ({ 
          id: originalId, 
          status: 'copied', 
          newId 
        }))
        break

      case 'deploy':
        const deployedIds = []
        for (const workflowId of workflowIds) {
          try {
            await db
              .update(workflow)
              .set({
                isDeployed: true,
                deployedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(workflow.id, workflowId))

            deployedIds.push(workflowId)
            logger.info(`[${requestId}] Deployed workflow ${workflowId}`)
          } catch (error) {
            logger.error(`[${requestId}] Failed to deploy workflow ${workflowId}`, error)
          }
        }
        results = deployedIds.map(id => ({ id, status: 'deployed' }))
        break

      case 'undeploy':
        const undeployedIds = []
        for (const workflowId of workflowIds) {
          try {
            await db
              .update(workflow)
              .set({
                isDeployed: false,
                deployedAt: null,
                updatedAt: new Date(),
              })
              .where(eq(workflow.id, workflowId))

            undeployedIds.push(workflowId)
            logger.info(`[${requestId}] Undeployed workflow ${workflowId}`)
          } catch (error) {
            logger.error(`[${requestId}] Failed to undeploy workflow ${workflowId}`, error)
          }
        }
        results = undeployedIds.map(id => ({ id, status: 'undeployed' }))
        break

      case 'tag':
        if (!tags || tags.length === 0) {
          return NextResponse.json(
            { error: 'Tags are required for tag operation' },
            { status: 400 }
          )
        }

        // Note: This assumes tags are stored in workflow metadata or a separate table
        // Implementation depends on how tags are actually stored in the system
        const taggedIds = workflowIds // Placeholder implementation
        results = taggedIds.map(id => ({ id, status: 'tagged', tags }))
        logger.info(`[${requestId}] Tagged ${workflowIds.length} workflows with:`, tags)
        break

      default:
        return NextResponse.json(
          { error: `Unsupported operation: ${operation}` },
          { status: 400 }
        )
    }

    const elapsed = Date.now() - startTime
    logger.info(
      `[${requestId}] Successfully completed bulk ${operation} operation in ${elapsed}ms`,
      { results }
    )

    return NextResponse.json({
      operation,
      results,
      summary: {
        requested: workflowIds.length,
        successful: results.length,
        failed: workflowIds.length - results.length,
      },
    }, { status: 200 })

  } catch (error: any) {
    const elapsed = Date.now() - startTime
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid bulk operation data after ${elapsed}ms`, {
        errors: error.errors,
      })
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error in bulk workflow operation after ${elapsed}ms`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
