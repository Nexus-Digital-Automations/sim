/**
 * Workflow Version Revert API Endpoint
 *
 * Handles reverting a workflow to a specific version, providing safe rollback
 * functionality with comprehensive change tracking and validation.
 *
 * Features:
 * - Safe revert with backup creation
 * - Version validation and compatibility checks
 * - Change impact analysis before revert
 * - Comprehensive logging and audit trail
 * - Rollback confirmation and dry-run mode
 */

import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { verifyInternalToken } from '@/lib/auth/internal'
import { createLogger } from '@/lib/logs/console/logger'
import { getUserEntityPermissions } from '@/lib/permissions/utils'
import { loadWorkflowFromNormalizedTables } from '@/lib/workflows/db-helpers'
import { type WorkflowVersion, WorkflowVersionManager } from '@/lib/workflows/versioning'
import { db } from '@/db'
import { workflowBlocks, workflowEdges, workflow as workflowTable } from '@/db/schema'

const logger = createLogger('WorkflowVersionRevertAPI')

// Revert request schema
const RevertRequestSchema = z.object({
  // Revert options
  createBackup: z.boolean().default(true),
  backupName: z.string().max(100).optional(),
  backupDescription: z.string().max(500).optional(),

  // Safety options
  dryRun: z.boolean().default(false),
  force: z.boolean().default(false), // Skip compatibility checks

  // Change tracking
  reason: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
})

/**
 * Analyze changes between current workflow and target version
 */
async function analyzeRevertChanges(
  currentWorkflow: any,
  targetVersion: WorkflowVersion
): Promise<{
  blocksChanged: number
  blocksAdded: number
  blocksRemoved: number
  edgesChanged: number
  edgesAdded: number
  edgesRemoved: number
  configChanges: string[]
  riskLevel: 'low' | 'medium' | 'high'
}> {
  const currentBlocks = currentWorkflow.blocks || []
  const targetBlocks = targetVersion.state.blocks || []
  const currentEdges = currentWorkflow.edges || []
  const targetEdges = targetVersion.state.edges || []

  // Analyze block changes
  const currentBlockIds = new Set(currentBlocks.map((b: any) => b.id))
  const targetBlockIds = new Set(targetBlocks.map((b: any) => b.id))

  const blocksAdded = targetBlocks.filter((b: any) => !currentBlockIds.has(b.id)).length
  const blocksRemoved = currentBlocks.filter((b: any) => !targetBlockIds.has(b.id)).length

  let blocksChanged = 0
  for (const targetBlock of targetBlocks) {
    const currentBlock = currentBlocks.find((b: any) => b.id === targetBlock.id)
    if (currentBlock && JSON.stringify(currentBlock) !== JSON.stringify(targetBlock)) {
      blocksChanged++
    }
  }

  // Analyze edge changes
  const currentEdgeIds = new Set(
    currentEdges.map((e: any) => `${e.sourceBlockId}-${e.targetBlockId}`)
  )
  const targetEdgeIds = new Set(
    targetEdges.map((e: any) => `${e.sourceBlockId}-${e.targetBlockId}`)
  )

  const edgesAdded = targetEdges.filter(
    (e: any) => !currentEdgeIds.has(`${e.sourceBlockId}-${e.targetBlockId}`)
  ).length
  const edgesRemoved = currentEdges.filter(
    (e: any) => !targetEdgeIds.has(`${e.sourceBlockId}-${e.targetBlockId}`)
  ).length
  const edgesChanged =
    Math.min(currentEdges.length, targetEdges.length) - Math.max(edgesAdded, edgesRemoved)

  // Analyze configuration changes
  const configChanges: string[] = []

  if (currentWorkflow.name !== targetVersion.state.name) {
    configChanges.push('Workflow name changed')
  }

  if (currentWorkflow.description !== targetVersion.state.description) {
    configChanges.push('Workflow description changed')
  }

  if (
    JSON.stringify(currentWorkflow.variables || {}) !==
    JSON.stringify(targetVersion.state.variables || {})
  ) {
    configChanges.push('Workflow variables changed')
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low'

  const totalChanges = blocksAdded + blocksRemoved + blocksChanged + edgesAdded + edgesRemoved

  if (totalChanges > 50 || blocksRemoved > 10) {
    riskLevel = 'high'
  } else if (totalChanges > 20 || blocksRemoved > 5) {
    riskLevel = 'medium'
  }

  return {
    blocksChanged,
    blocksAdded,
    blocksRemoved,
    edgesChanged,
    edgesAdded,
    edgesRemoved,
    configChanges,
    riskLevel,
  }
}

/**
 * Create backup version before revert
 */
async function createRevertBackup(
  workflowId: string,
  userId: string,
  backupName?: string,
  backupDescription?: string
): Promise<WorkflowVersion> {
  const versionManager = new WorkflowVersionManager()

  const backupVersion = await versionManager.createVersion(
    workflowId,
    {
      type: 'checkpoint',
      name: backupName || `Pre-revert backup ${new Date().toISOString()}`,
      description: backupDescription || 'Automatic backup created before version revert',
      tags: ['backup', 'pre-revert'],
      automatic: true,
    },
    userId
  )

  return backupVersion
}

/**
 * Perform the actual workflow revert
 */
async function performRevert(
  workflowId: string,
  targetVersion: WorkflowVersion,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const targetState = targetVersion.state

    // Begin transaction
    await db.transaction(async (tx) => {
      // Update workflow metadata
      await tx
        .update(workflowTable)
        .set({
          name: targetState.name,
          description: targetState.description,
          variables: targetState.variables,
          lastSynced: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workflowTable.id, workflowId))

      // Delete existing blocks and edges
      await tx.delete(workflowEdges).where(eq(workflowEdges.workflowId, workflowId))
      await tx.delete(workflowBlocks).where(eq(workflowBlocks.workflowId, workflowId))

      // Insert blocks from target version
      if (targetState.blocks && targetState.blocks.length > 0) {
        await tx.insert(workflowBlocks).values(
          targetState.blocks.map((block: any) => ({
            ...block,
            workflowId,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        )
      }

      // Insert edges from target version
      if (targetState.edges && targetState.edges.length > 0) {
        await tx.insert(workflowEdges).values(
          targetState.edges.map((edge: any) => ({
            ...edge,
            workflowId,
            createdAt: new Date(),
          }))
        )
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Revert operation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during revert',
    }
  }
}

/**
 * POST /api/workflows/[id]/versions/[versionId]/revert
 * Revert workflow to a specific version
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const { id: workflowId, versionId } = params

    // Authentication check
    let userId: string
    let isInternal = false

    try {
      const session = await auth()
      if (!session?.user?.id) {
        // Try internal token auth
        const authHeader = request.headers.get('authorization')
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.slice(7)
          const internalAuth = await verifyInternalToken(token)
          if (internalAuth.success && internalAuth.userId) {
            userId = internalAuth.userId
            isInternal = true
          } else {
            return NextResponse.json(
              { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
              { status: 401 }
            )
          }
        } else {
          return NextResponse.json(
            { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
            { status: 401 }
          )
        }
      } else {
        userId = session.user.id
      }
    } catch (error) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication failed' } },
        { status: 401 }
      )
    }

    // Check permissions (need write access for revert)
    if (!isInternal) {
      const permissions = await getUserEntityPermissions(userId, 'workflow', workflowId)
      if (!permissions.write) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Insufficient permissions to revert workflow' } },
          { status: 403 }
        )
      }
    }

    // Parse request body
    const body = await request.json()
    const revertOptions = RevertRequestSchema.parse(body)

    logger.info(`[${requestId}] Starting workflow revert`, {
      workflowId,
      versionId,
      userId,
      dryRun: revertOptions.dryRun,
    })

    // Load current workflow
    const currentWorkflow = await loadWorkflowFromNormalizedTables(workflowId)
    if (!currentWorkflow) {
      return NextResponse.json(
        { error: { code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' } },
        { status: 404 }
      )
    }

    // Load target version
    const versionManager = new WorkflowVersionManager()
    const targetVersion = await versionManager.getVersion(workflowId, versionId)

    if (!targetVersion) {
      return NextResponse.json(
        { error: { code: 'VERSION_NOT_FOUND', message: 'Version not found' } },
        { status: 404 }
      )
    }

    // Analyze changes
    const changeAnalysis = await analyzeRevertChanges(currentWorkflow, targetVersion)

    logger.info(`[${requestId}] Change analysis completed`, {
      workflowId,
      versionId,
      riskLevel: changeAnalysis.riskLevel,
      totalChanges: changeAnalysis.blocksChanged + changeAnalysis.edgesChanged,
    })

    // Safety checks (unless forced)
    if (!revertOptions.force) {
      if (changeAnalysis.riskLevel === 'high') {
        return NextResponse.json(
          {
            error: {
              code: 'HIGH_RISK_REVERT',
              message: 'Revert operation has high risk impact. Use force=true to proceed.',
              details: changeAnalysis,
            },
          },
          { status: 400 }
        )
      }

      // Check if target version is too old (more than 30 days)
      const versionAge = Date.now() - new Date(targetVersion.createdAt).getTime()
      const thirtyDays = 30 * 24 * 60 * 60 * 1000

      if (versionAge > thirtyDays) {
        return NextResponse.json(
          {
            error: {
              code: 'VERSION_TOO_OLD',
              message: 'Target version is older than 30 days. Use force=true to proceed.',
              details: { versionAge: Math.floor(versionAge / (24 * 60 * 60 * 1000)) },
            },
          },
          { status: 400 }
        )
      }
    }

    // Return dry run results
    if (revertOptions.dryRun) {
      return NextResponse.json({
        dryRun: true,
        workflowId,
        targetVersion: {
          id: targetVersion.id,
          version: targetVersion.version,
          name: targetVersion.name,
          createdAt: targetVersion.createdAt,
        },
        changeAnalysis,
        estimatedTime: Math.max(changeAnalysis.blocksAdded + changeAnalysis.blocksRemoved, 1) * 100, // ms
        recommendations: [
          ...(changeAnalysis.riskLevel === 'high'
            ? ['Consider creating a backup before proceeding']
            : []),
          ...(changeAnalysis.blocksRemoved > 0
            ? ['Some blocks will be removed in this revert']
            : []),
          ...(changeAnalysis.configChanges.length > 0
            ? ['Workflow configuration will change']
            : []),
        ],
      })
    }

    // Create backup if requested
    let backupVersion: WorkflowVersion | null = null
    if (revertOptions.createBackup) {
      try {
        backupVersion = await createRevertBackup(
          workflowId,
          userId,
          revertOptions.backupName,
          revertOptions.backupDescription
        )
        logger.info(`[${requestId}] Backup version created`, { backupVersionId: backupVersion.id })
      } catch (error) {
        logger.error(`[${requestId}] Failed to create backup`, error)
        return NextResponse.json(
          {
            error: {
              code: 'BACKUP_FAILED',
              message: 'Failed to create backup before revert',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
          },
          { status: 500 }
        )
      }
    }

    // Perform the revert
    const revertResult = await performRevert(workflowId, targetVersion, userId)

    if (!revertResult.success) {
      logger.error(`[${requestId}] Revert failed`, { error: revertResult.error })
      return NextResponse.json(
        {
          error: {
            code: 'REVERT_FAILED',
            message: 'Failed to revert workflow',
            details: revertResult.error,
          },
        },
        { status: 500 }
      )
    }

    // Create new version record for the revert
    try {
      const revertVersion = await versionManager.createVersion(
        workflowId,
        {
          type: 'manual',
          name: `Reverted to v${targetVersion.version}`,
          description: `Reverted workflow to version ${targetVersion.version}${revertOptions.reason ? `: ${revertOptions.reason}` : ''}`,
          tags: ['revert', ...(revertOptions.tags || [])],
          metadata: {
            revertedFrom: currentWorkflow.lastSynced,
            revertedTo: targetVersion.version,
            revertedToId: versionId,
            backupVersionId: backupVersion?.id,
            changeAnalysis,
          },
        },
        userId
      )

      logger.info(`[${requestId}] Revert completed successfully`, {
        workflowId,
        targetVersionId: versionId,
        newVersionId: revertVersion.id,
        backupVersionId: backupVersion?.id,
      })

      return NextResponse.json({
        success: true,
        workflowId,
        revertedTo: {
          versionId: targetVersion.id,
          version: targetVersion.version,
          name: targetVersion.name,
        },
        newVersion: {
          id: revertVersion.id,
          version: revertVersion.version,
        },
        backup: backupVersion
          ? {
              id: backupVersion.id,
              version: backupVersion.version,
            }
          : null,
        changeAnalysis,
        completedAt: new Date(),
      })
    } catch (error) {
      logger.error(`[${requestId}] Failed to create revert version record`, error)

      // Revert was successful, but we couldn't create the version record
      return NextResponse.json({
        success: true,
        workflowId,
        revertedTo: {
          versionId: targetVersion.id,
          version: targetVersion.version,
          name: targetVersion.name,
        },
        backup: backupVersion
          ? {
              id: backupVersion.id,
              version: backupVersion.version,
            }
          : null,
        changeAnalysis,
        completedAt: new Date(),
        warning: 'Revert completed but failed to create version record',
      })
    }
  } catch (error) {
    logger.error(`[${requestId}] Revert request failed`, error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid revert request',
            details: error.errors,
          },
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process revert request',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
