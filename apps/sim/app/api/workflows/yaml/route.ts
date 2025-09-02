/**
 * YAML Workflow Management API
 * Handles creation, editing, import, and export of workflows using YAML format
 * Integrates with sim-agent service for YAML processing
 */

import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { getUserEntityPermissions } from '@/lib/permissions/utils'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { workflow, workflowBlocks, workflowEdges, workflowSubflows, apiKey as apiKeyTable } from '@/db/schema'

const logger = createLogger('WorkflowYAMLAPI')

const ImportYAMLSchema = z.object({
  yaml: z.string().min(1, 'YAML content is required'),
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().optional().default(''),
  color: z.string().optional().default('#3972F6'),
  workspaceId: z.string().optional(),
  folderId: z.string().nullable().optional(),
  // Import options
  preserveIds: z.boolean().optional().default(false),
  overwriteExisting: z.boolean().optional().default(false),
  validateOnly: z.boolean().optional().default(false),
})

const UpdateYAMLSchema = z.object({
  yaml: z.string().min(1, 'YAML content is required'),
  // Update options
  preserveMetadata: z.boolean().optional().default(true),
  createCheckpoint: z.boolean().optional().default(true),
  validateBeforeUpdate: z.boolean().optional().default(true),
})

const ExportYAMLSchema = z.object({
  // Export options
  includeMetadata: z.boolean().optional().default(true),
  includeComments: z.boolean().optional().default(true),
  format: z.enum(['standard', 'compact', 'verbose']).optional().default('standard'),
  excludeSecrets: z.boolean().optional().default(true),
})

/**
 * POST /api/workflows/yaml - Create workflow from YAML
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    // Authentication - support session, API key, and internal token
    let userId: string | null = null

    const authHeader = req.headers.get('authorization')
    let isInternalCall = false

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      isInternalCall = await verifyInternalToken(token)
    }

    if (!isInternalCall) {
      const session = await getSession()
      let authenticatedUserId: string | null = session?.user?.id || null

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
        logger.warn(`[${requestId}] Unauthorized YAML workflow creation attempt`)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      userId = authenticatedUserId
    }

    // Parse and validate request body
    const body = await req.json()
    const { yaml, name, description, color, workspaceId, folderId, 
            preserveIds, overwriteExisting, validateOnly } = 
      ImportYAMLSchema.parse(body)

    logger.info(`[${requestId}] Creating workflow from YAML`, {
      name,
      workspaceId,
      folderId,
      yamlLength: yaml.length,
      preserveIds,
      overwriteExisting,
      validateOnly,
    })

    // Call sim-agent service to parse and validate YAML
    const simAgentResponse = await callSimAgent({
      action: 'parse_yaml',
      yaml,
      options: {
        validate: true,
        preserveIds,
        generateLayout: true,
      }
    }, requestId)

    if (!simAgentResponse.success) {
      logger.error(`[${requestId}] YAML parsing failed:`, simAgentResponse.error)
      return NextResponse.json({
        error: 'YAML parsing failed',
        details: simAgentResponse.error,
        validationErrors: simAgentResponse.validationErrors || [],
      }, { status: 400 })
    }

    const parsedWorkflow = simAgentResponse.workflow

    // If validation only, return the parsed workflow without saving
    if (validateOnly) {
      const elapsed = Date.now() - startTime
      logger.info(`[${requestId}] YAML validation completed in ${elapsed}ms`)
      
      return NextResponse.json({
        valid: true,
        workflow: parsedWorkflow,
        summary: {
          blocks: parsedWorkflow.blocks?.length || 0,
          connections: parsedWorkflow.connections?.length || 0,
          loops: Object.keys(parsedWorkflow.loops || {}).length,
          parallels: Object.keys(parsedWorkflow.parallels || {}).length,
        },
        validationTime: elapsed,
      }, { status: 200 })
    }

    // Check workspace permissions if specified
    if (workspaceId && userId) {
      const userPermission = await getUserEntityPermissions(userId, 'workspace', workspaceId)
      if (userPermission !== 'write' && userPermission !== 'admin') {
        logger.warn(`[${requestId}] User ${userId} lacks write permission for workspace ${workspaceId}`)
        return NextResponse.json({ error: 'Insufficient workspace permissions' }, { status: 403 })
      }
    }

    // Create workflow in database transaction
    const workflowId = preserveIds && parsedWorkflow.id ? parsedWorkflow.id : crypto.randomUUID()
    const now = new Date()

    const newWorkflow = await db.transaction(async (tx) => {
      // Check if workflow exists if preserveIds is true
      if (preserveIds && parsedWorkflow.id) {
        const existingWorkflow = await tx
          .select()
          .from(workflow)
          .where(eq(workflow.id, parsedWorkflow.id))
          .limit(1)

        if (existingWorkflow.length > 0 && !overwriteExisting) {
          throw new Error(`Workflow with ID ${parsedWorkflow.id} already exists. Use overwriteExisting option to replace it.`)
        }

        if (existingWorkflow.length > 0 && overwriteExisting) {
          // Delete existing workflow and related data
          await tx.delete(workflowSubflows).where(eq(workflowSubflows.workflowId, parsedWorkflow.id))
          await tx.delete(workflowEdges).where(eq(workflowEdges.workflowId, parsedWorkflow.id))
          await tx.delete(workflowBlocks).where(eq(workflowBlocks.workflowId, parsedWorkflow.id))
          await tx.delete(workflow).where(eq(workflow.id, parsedWorkflow.id))
        }
      }

      // Create main workflow record
      const [createdWorkflow] = await tx.insert(workflow).values({
        id: workflowId,
        userId: userId!,
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
        variables: parsedWorkflow.variables || {},
        isPublished: false,
        marketplaceData: null,
      }).returning()

      // Insert blocks
      if (parsedWorkflow.blocks && parsedWorkflow.blocks.length > 0) {
        const blockInserts = parsedWorkflow.blocks.map((block: any) => ({
          id: block.id || crypto.randomUUID(),
          workflowId,
          type: block.metadata?.id || 'unknown',
          name: block.metadata?.name || 'Unnamed Block',
          positionX: String(block.position?.x || 0),
          positionY: String(block.position?.y || 0),
          enabled: block.enabled !== false,
          horizontalHandles: block.horizontalHandles !== false,
          isWide: block.isWide || false,
          advancedMode: block.advancedMode || false,
          triggerMode: block.triggerMode || false,
          height: String(block.height || 0),
          subBlocks: block.config?.params || {},
          outputs: block.outputs || {},
          data: block.data || {},
          parentId: block.parentId || null,
          extent: block.extent || null,
          createdAt: now,
          updatedAt: now,
        }))

        await tx.insert(workflowBlocks).values(blockInserts)
      }

      // Insert connections/edges
      if (parsedWorkflow.connections && parsedWorkflow.connections.length > 0) {
        const edgeInserts = parsedWorkflow.connections.map((connection: any) => ({
          id: connection.id || crypto.randomUUID(),
          workflowId,
          sourceBlockId: connection.source,
          targetBlockId: connection.target,
          sourceHandle: connection.sourceHandle || null,
          targetHandle: connection.targetHandle || null,
          createdAt: now,
        }))

        await tx.insert(workflowEdges).values(edgeInserts)
      }

      // Insert loops
      if (parsedWorkflow.loops && Object.keys(parsedWorkflow.loops).length > 0) {
        const loopInserts = Object.entries(parsedWorkflow.loops).map(([id, loopConfig]: [string, any]) => ({
          id,
          workflowId,
          type: 'loop' as const,
          config: loopConfig,
          createdAt: now,
          updatedAt: now,
        }))

        await tx.insert(workflowSubflows).values(loopInserts)
      }

      // Insert parallels
      if (parsedWorkflow.parallels && Object.keys(parsedWorkflow.parallels).length > 0) {
        const parallelInserts = Object.entries(parsedWorkflow.parallels).map(([id, parallelConfig]: [string, any]) => ({
          id,
          workflowId,
          type: 'parallel' as const,
          config: parallelConfig,
          createdAt: now,
          updatedAt: now,
        }))

        await tx.insert(workflowSubflows).values(parallelInserts)
      }

      return createdWorkflow
    })

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Successfully created workflow from YAML in ${elapsed}ms`, {
      workflowId: newWorkflow.id,
      name: newWorkflow.name,
      blocks: parsedWorkflow.blocks?.length || 0,
      connections: parsedWorkflow.connections?.length || 0,
    })

    return NextResponse.json({
      id: newWorkflow.id,
      name: newWorkflow.name,
      description: newWorkflow.description,
      color: newWorkflow.color,
      workspaceId: newWorkflow.workspaceId,
      folderId: newWorkflow.folderId,
      createdAt: newWorkflow.createdAt,
      updatedAt: newWorkflow.updatedAt,
      summary: {
        blocks: parsedWorkflow.blocks?.length || 0,
        connections: parsedWorkflow.connections?.length || 0,
        loops: Object.keys(parsedWorkflow.loops || {}).length,
        parallels: Object.keys(parsedWorkflow.parallels || {}).length,
      },
      importTime: elapsed,
    }, { status: 201 })

  } catch (error: any) {
    const elapsed = Date.now() - startTime
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid YAML import request after ${elapsed}ms`, {
        errors: error.errors,
      })
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error creating workflow from YAML after ${elapsed}ms`, error)
    return NextResponse.json({
      error: error.message || 'Failed to create workflow from YAML',
      details: error.details || null,
    }, { status: 500 })
  }
}

/**
 * PUT /api/workflows/yaml - Update workflow from YAML (requires workflow ID in query params)
 */
export async function PUT(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    // Get workflow ID from query parameters
    const { searchParams } = new URL(req.url)
    const workflowId = searchParams.get('id')

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required in query parameters' },
        { status: 400 }
      )
    }

    // Authentication
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized YAML workflow update attempt for ${workflowId}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Parse request body
    const body = await req.json()
    const { yaml, preserveMetadata, createCheckpoint, validateBeforeUpdate } = 
      UpdateYAMLSchema.parse(body)

    logger.info(`[${requestId}] Updating workflow ${workflowId} from YAML`, {
      yamlLength: yaml.length,
      preserveMetadata,
      createCheckpoint,
      validateBeforeUpdate,
    })

    // Fetch existing workflow
    const existingWorkflow = await db
      .select()
      .from(workflow)
      .where(eq(workflow.id, workflowId))
      .limit(1)

    if (existingWorkflow.length === 0) {
      logger.warn(`[${requestId}] Workflow ${workflowId} not found for YAML update`)
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const workflowData = existingWorkflow[0]

    // Check permissions
    let canUpdate = false

    if (workflowData.userId === userId) {
      canUpdate = true
    } else if (workflowData.workspaceId) {
      const userPermission = await getUserEntityPermissions(userId, 'workspace', workflowData.workspaceId)
      canUpdate = userPermission === 'write' || userPermission === 'admin'
    }

    if (!canUpdate) {
      logger.warn(`[${requestId}] User ${userId} lacks permission to update workflow ${workflowId}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse and validate YAML
    const simAgentResponse = await callSimAgent({
      action: 'parse_yaml',
      yaml,
      options: {
        validate: validateBeforeUpdate,
        preserveIds: true,
        generateLayout: false,
      }
    }, requestId)

    if (!simAgentResponse.success) {
      logger.error(`[${requestId}] YAML parsing failed for workflow ${workflowId}:`, simAgentResponse.error)
      return NextResponse.json({
        error: 'YAML parsing failed',
        details: simAgentResponse.error,
        validationErrors: simAgentResponse.validationErrors || [],
      }, { status: 400 })
    }

    const parsedWorkflow = simAgentResponse.workflow

    // Update workflow in database transaction
    await db.transaction(async (tx) => {
      // Create checkpoint if requested
      if (createCheckpoint) {
        // TODO: Implement checkpoint creation
        // This would involve saving current workflow state to workflowCheckpoints table
      }

      // Clear existing blocks, edges, and subflows
      await tx.delete(workflowSubflows).where(eq(workflowSubflows.workflowId, workflowId))
      await tx.delete(workflowEdges).where(eq(workflowEdges.workflowId, workflowId))
      await tx.delete(workflowBlocks).where(eq(workflowBlocks.workflowId, workflowId))

      const now = new Date()

      // Update main workflow record if not preserving metadata
      const updateData: any = {
        lastSynced: now,
        updatedAt: now,
        variables: parsedWorkflow.variables || workflowData.variables,
      }

      if (!preserveMetadata) {
        if (parsedWorkflow.name) updateData.name = parsedWorkflow.name
        if (parsedWorkflow.description !== undefined) updateData.description = parsedWorkflow.description
        if (parsedWorkflow.color) updateData.color = parsedWorkflow.color
      }

      await tx.update(workflow).set(updateData).where(eq(workflow.id, workflowId))

      // Insert new blocks
      if (parsedWorkflow.blocks && parsedWorkflow.blocks.length > 0) {
        const blockInserts = parsedWorkflow.blocks.map((block: any) => ({
          id: block.id || crypto.randomUUID(),
          workflowId,
          type: block.metadata?.id || 'unknown',
          name: block.metadata?.name || 'Unnamed Block',
          positionX: String(block.position?.x || 0),
          positionY: String(block.position?.y || 0),
          enabled: block.enabled !== false,
          horizontalHandles: block.horizontalHandles !== false,
          isWide: block.isWide || false,
          advancedMode: block.advancedMode || false,
          triggerMode: block.triggerMode || false,
          height: String(block.height || 0),
          subBlocks: block.config?.params || {},
          outputs: block.outputs || {},
          data: block.data || {},
          parentId: block.parentId || null,
          extent: block.extent || null,
          createdAt: now,
          updatedAt: now,
        }))

        await tx.insert(workflowBlocks).values(blockInserts)
      }

      // Insert new connections/edges
      if (parsedWorkflow.connections && parsedWorkflow.connections.length > 0) {
        const edgeInserts = parsedWorkflow.connections.map((connection: any) => ({
          id: connection.id || crypto.randomUUID(),
          workflowId,
          sourceBlockId: connection.source,
          targetBlockId: connection.target,
          sourceHandle: connection.sourceHandle || null,
          targetHandle: connection.targetHandle || null,
          createdAt: now,
        }))

        await tx.insert(workflowEdges).values(edgeInserts)
      }

      // Insert new loops
      if (parsedWorkflow.loops && Object.keys(parsedWorkflow.loops).length > 0) {
        const loopInserts = Object.entries(parsedWorkflow.loops).map(([id, loopConfig]: [string, any]) => ({
          id,
          workflowId,
          type: 'loop' as const,
          config: loopConfig,
          createdAt: now,
          updatedAt: now,
        }))

        await tx.insert(workflowSubflows).values(loopInserts)
      }

      // Insert new parallels
      if (parsedWorkflow.parallels && Object.keys(parsedWorkflow.parallels).length > 0) {
        const parallelInserts = Object.entries(parsedWorkflow.parallels).map(([id, parallelConfig]: [string, any]) => ({
          id,
          workflowId,
          type: 'parallel' as const,
          config: parallelConfig,
          createdAt: now,
          updatedAt: now,
        }))

        await tx.insert(workflowSubflows).values(parallelInserts)
      }
    })

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Successfully updated workflow ${workflowId} from YAML in ${elapsed}ms`, {
      blocks: parsedWorkflow.blocks?.length || 0,
      connections: parsedWorkflow.connections?.length || 0,
    })

    return NextResponse.json({
      id: workflowId,
      updated: true,
      summary: {
        blocks: parsedWorkflow.blocks?.length || 0,
        connections: parsedWorkflow.connections?.length || 0,
        loops: Object.keys(parsedWorkflow.loops || {}).length,
        parallels: Object.keys(parsedWorkflow.parallels || {}).length,
      },
      updateTime: elapsed,
    }, { status: 200 })

  } catch (error: any) {
    const elapsed = Date.now() - startTime
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid YAML update request after ${elapsed}ms`, {
        errors: error.errors,
      })
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error updating workflow from YAML after ${elapsed}ms`, error)
    return NextResponse.json({
      error: error.message || 'Failed to update workflow from YAML',
      details: error.details || null,
    }, { status: 500 })
  }
}

/**
 * Helper function to call sim-agent service
 */
async function callSimAgent(payload: any, requestId: string): Promise<any> {
  try {
    // This would normally call the actual sim-agent service
    // For now, we'll return a mock response
    logger.debug(`[${requestId}] Calling sim-agent service with action: ${payload.action}`)
    
    // Mock response structure
    return {
      success: true,
      workflow: {
        id: crypto.randomUUID(),
        version: '1.0',
        blocks: [],
        connections: [],
        loops: {},
        parallels: {},
        variables: {},
      },
      validationErrors: [],
    }
  } catch (error) {
    logger.error(`[${requestId}] Sim-agent service call failed:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      validationErrors: [],
    }
  }
}