import { eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import {
  apiKey as apiKeyTable,
  templates,
  workflow,
  workflowBlocks,
  workflowEdges,
} from '@/db/schema'

const logger = createLogger('TemplateUseAPI')

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Enhanced schema for template usage with comprehensive options
const UseTemplateSchema = z.object({
  // Required fields
  workspaceId: z.string().min(1, 'Workspace ID is required'),

  // Optional customizations
  workflowName: z.string().optional(), // Custom name for the new workflow
  folderId: z.string().nullable().optional(), // Target folder for the workflow

  // Template usage options
  preserveOriginalName: z.boolean().optional().default(false), // Keep original template name
  addCopySuffix: z.boolean().optional().default(true), // Add "(copy)" suffix
  customSuffix: z.string().optional(), // Custom suffix instead of "(copy)"

  // Workflow customization
  customDescription: z.string().optional(), // Override template description
  customColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(), // Override template color

  // Usage tracking
  trackUsage: z.boolean().optional().default(true), // Track this usage for analytics
  usageContext: z.string().optional(), // Context for usage (e.g., "tutorial", "production")

  // Advanced options
  updateBlockIds: z.boolean().optional().default(true), // Generate new block IDs
  preserveMetadata: z.boolean().optional().default(false), // Preserve original metadata
})

// POST /api/templates/[id]/use - Comprehensive template usage with enhanced workflow creation
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id } = await params

  // Parse request body outside try block for error handling access
  let body: any = {}
  try {
    body = await request.json()
  } catch (parseError) {
    logger.warn(`[${requestId}] Failed to parse request body for template use: ${id}`)
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
  }

  try {
    // Authentication - support both session and API key
    let userId: string | null = null
    let isInternalCall = false

    // Check for internal JWT token for server-side calls
    const authHeader = request.headers.get('authorization')
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
        logger.warn(`[${requestId}] Unauthorized use attempt for template: ${id}`)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      userId = authenticatedUserId
    }

    // Validate request body
    const usageData = UseTemplateSchema.parse(body)

    logger.info(`[${requestId}] Using template with comprehensive options:`, {
      templateId: id,
      userId,
      workspaceId: usageData.workspaceId,
      customizations: {
        workflowName: usageData.workflowName,
        preserveOriginalName: usageData.preserveOriginalName,
        customSuffix: usageData.customSuffix,
        trackUsage: usageData.trackUsage,
        usageContext: usageData.usageContext,
      },
    })

    // Get the template with comprehensive data
    const template = await db
      .select({
        id: templates.id,
        workflowId: templates.workflowId,
        userId: templates.userId,
        name: templates.name,
        description: templates.description,
        author: templates.author,
        state: templates.state,
        color: templates.color,
        icon: templates.icon,
        category: templates.category,
        views: templates.views,
        stars: templates.stars,
        createdAt: templates.createdAt,
      })
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1)

    if (template.length === 0) {
      logger.warn(`[${requestId}] Template not found: ${id}`)
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const templateData = template[0]

    // Determine workflow name with comprehensive naming logic
    let workflowName: string
    if (usageData.workflowName) {
      workflowName = usageData.workflowName
    } else if (usageData.preserveOriginalName) {
      workflowName = templateData.name
    } else {
      const suffix = usageData.customSuffix || 'copy'
      workflowName = `${templateData.name} (${suffix})`
    }

    // Determine workflow description and color
    const workflowDescription = usageData.customDescription || templateData.description
    const workflowColor = usageData.customColor || templateData.color

    // Create a new workflow ID
    const newWorkflowId = uuidv4()

    // Use a comprehensive transaction to ensure consistency
    const result = await db.transaction(async (tx) => {
      // Increment the template views and usage stats (if tracking enabled)
      if (usageData.trackUsage) {
        await tx
          .update(templates)
          .set({
            views: sql`${templates.views} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(templates.id, id))
      }

      const now = new Date()

      // Create a comprehensive workflow from the template
      const workflowData = {
        id: newWorkflowId,
        workspaceId: usageData.workspaceId,
        folderId: usageData.folderId || null,
        name: workflowName,
        description: workflowDescription,
        color: workflowColor,
        userId: userId || 'system', // Fallback for internal calls
        createdAt: now,
        updatedAt: now,
        lastSynced: now,
        isDeployed: false,
        runCount: 0,
        variables: {},
        collaborators: [],
        isPublished: false,
        marketplaceData: usageData.preserveMetadata
          ? {
              sourceTemplate: {
                id: templateData.id,
                name: templateData.name,
                author: templateData.author,
                category: templateData.category,
                usedAt: now,
                usageContext: usageData.usageContext,
              },
            }
          : null,
      }

      const newWorkflow = await tx
        .insert(workflow)
        .values(workflowData)
        .returning({ id: workflow.id })

      // Create workflow_blocks entries from the template state
      const templateState = templateData.state as any
      if (templateState?.blocks) {
        // Create a mapping from old block IDs to new block IDs for reference updates
        const blockIdMap = new Map<string, string>()

        const blockEntries = Object.values(templateState.blocks).map((block: any) => {
          // Generate new block ID only if requested (default: true)
          const newBlockId = usageData.updateBlockIds ? uuidv4() : block.id
          if (usageData.updateBlockIds) {
            blockIdMap.set(block.id, newBlockId)
          }

          return {
            id: newBlockId,
            workflowId: newWorkflowId,
            type: block.type,
            name: block.name,
            positionX: block.position?.x?.toString() || '0',
            positionY: block.position?.y?.toString() || '0',
            enabled: block.enabled !== false,
            horizontalHandles: block.horizontalHandles !== false,
            isWide: block.isWide || false,
            advancedMode: block.advancedMode || false,
            height: block.height?.toString() || '0',
            subBlocks: block.subBlocks || {},
            outputs: block.outputs || {},
            data: block.data || {},
            parentId: block.parentId ? blockIdMap.get(block.parentId) || null : null,
            extent: block.extent || null,
            createdAt: now,
            updatedAt: now,
          }
        })

        // Create edge entries with new IDs
        const edgeEntries = (templateState.edges || []).map((edge: any) => ({
          id: uuidv4(),
          workflowId: newWorkflowId,
          sourceBlockId: blockIdMap.get(edge.source) || edge.source,
          targetBlockId: blockIdMap.get(edge.target) || edge.target,
          sourceHandle: edge.sourceHandle || null,
          targetHandle: edge.targetHandle || null,
          createdAt: now,
        }))

        // Update the workflow state with new block IDs
        const updatedState = { ...templateState }
        if (updatedState.blocks) {
          const newBlocks: any = {}
          Object.entries(updatedState.blocks).forEach(([oldId, blockData]: [string, any]) => {
            const newId = blockIdMap.get(oldId)
            if (newId) {
              newBlocks[newId] = {
                ...blockData,
                id: newId,
              }
            }
          })
          updatedState.blocks = newBlocks
        }

        // Update edges to use new block IDs (if updating IDs)
        if (updatedState.edges) {
          updatedState.edges = updatedState.edges.map((edge: any) => ({
            ...edge,
            id: usageData.updateBlockIds ? uuidv4() : edge.id,
            source: usageData.updateBlockIds
              ? blockIdMap.get(edge.source) || edge.source
              : edge.source,
            target: usageData.updateBlockIds
              ? blockIdMap.get(edge.target) || edge.target
              : edge.target,
          }))
        }

        // Add usage metadata to the workflow state
        if (!updatedState.metadata) updatedState.metadata = {}
        updatedState.metadata.createdFromTemplate = {
          templateId: id,
          templateName: templateData.name,
          templateAuthor: templateData.author,
          templateCategory: templateData.category,
          usedAt: now.toISOString(),
          usageContext: usageData.usageContext,
          preservedOriginalIds: !usageData.updateBlockIds,
        }

        // Insert blocks and edges
        if (blockEntries.length > 0) {
          await tx.insert(workflowBlocks).values(blockEntries)
        }
        if (edgeEntries.length > 0) {
          await tx.insert(workflowEdges).values(edgeEntries)
        }
      }

      return newWorkflow[0]
    })

    const elapsed = Date.now() - startTime

    logger.info(
      `[${requestId}] Successfully used template: ${id}, created workflow: ${newWorkflowId} in ${elapsed}ms`,
      {
        templateId: id,
        workflowId: newWorkflowId,
        workflowName,
        usageTracked: usageData.trackUsage,
        customizations: {
          preserveOriginalName: usageData.preserveOriginalName,
          customSuffix: usageData.customSuffix,
          customColor: usageData.customColor,
          updateBlockIds: usageData.updateBlockIds,
        },
      }
    )

    // Verify the workflow was actually created
    const verifyWorkflow = await db
      .select({ id: workflow.id })
      .from(workflow)
      .where(eq(workflow.id, newWorkflowId))
      .limit(1)

    if (verifyWorkflow.length === 0) {
      logger.error(`[${requestId}] Workflow was not created properly: ${newWorkflowId}`)
      return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
    }

    return NextResponse.json(
      {
        message: 'Template used successfully',
        workflowId: newWorkflowId,
        workflowName,
        workspaceId: usageData.workspaceId,
        folderId: usageData.folderId,
        template: {
          id: templateData.id,
          name: templateData.name,
          author: templateData.author,
          category: templateData.category,
        },
        customizations: {
          preserveOriginalName: usageData.preserveOriginalName,
          customSuffix: usageData.customSuffix,
          customColor: usageData.customColor,
          updateBlockIds: usageData.updateBlockIds,
          usageTracked: usageData.trackUsage,
        },
        meta: {
          requestId,
          processingTime: elapsed,
          blocksCreated: Object.keys((templateData.state as any)?.blocks || {}).length,
          edgesCreated: ((templateData.state as any)?.edges || []).length,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid template usage data for ${id} after ${elapsed}ms`, {
        errors: error.errors,
        receivedData: Object.keys(body || {}),
      })
      return NextResponse.json(
        { error: 'Invalid usage parameters', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error using template: ${id} after ${elapsed}ms`, error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        requestId,
        templateId: id,
      },
      { status: 500 }
    )
  }
}
