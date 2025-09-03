/**
 * Nexus Tool: Get Workflow Details
 *
 * Retrieves comprehensive details for a specific workflow including
 * blocks, edges, execution history, and collaboration information.
 * Provides deep insights into workflow structure and performance.
 *
 * FEATURES:
 * - Complete workflow structure retrieval
 * - Block and edge relationship mapping
 * - Execution history and performance metrics
 * - Collaboration and permission details
 * - Version history access
 * - Comprehensive logging and monitoring
 */

import { tool } from 'ai'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
  workflow,
  workflowBlocks,
  workflowEdges,
  workflowExecutionLogs,
  workflowFolder,
  workflowVersions,
} from '@/db/schema'
import { BaseNexusTool, type NexusToolResponse } from './base-nexus-tool'

/**
 * Input schema for the Get Workflow Details tool
 */
const GetWorkflowDetailsInputSchema = z.object({
  workflowId: z.string().describe('The ID of the workflow to retrieve'),

  // Data inclusion options
  includeBlocks: z.boolean().optional().default(true).describe('Include workflow blocks data'),
  includeEdges: z.boolean().optional().default(true).describe('Include workflow edges data'),
  includeExecutionHistory: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include recent execution history'),
  includeVersionHistory: z.boolean().optional().default(false).describe('Include version history'),
  includeFolderInfo: z.boolean().optional().default(true).describe('Include folder information'),

  // History limits
  executionHistoryLimit: z
    .number()
    .optional()
    .default(10)
    .describe('Limit for execution history entries'),
  versionHistoryLimit: z
    .number()
    .optional()
    .default(5)
    .describe('Limit for version history entries'),
})

type GetWorkflowDetailsInput = z.infer<typeof GetWorkflowDetailsInputSchema>

/**
 * Block data structure
 */
interface BlockData {
  id: string
  type: string
  name: string
  position: {
    x: number
    y: number
  }
  enabled: boolean
  horizontalHandles: boolean
  isWide: boolean
  advancedMode: boolean
  triggerMode: boolean
  height: number
  subBlocks: Record<string, any>
  outputs: Record<string, any>
  data: Record<string, any>
  parentId: string | null
  extent: string | null
}

/**
 * Edge data structure
 */
interface EdgeData {
  id: string
  sourceBlockId: string
  targetBlockId: string
  sourceHandle: string | null
  targetHandle: string | null
  createdAt: Date
}

/**
 * Execution log data structure
 */
interface ExecutionLogData {
  id: string
  executionId: string
  level: string
  trigger: string
  startedAt: Date
  endedAt: Date | null
  totalDurationMs: number | null
  executionData: Record<string, any>
  cost: Record<string, any> | null
  files: Record<string, any> | null
}

/**
 * Version data structure
 */
interface VersionData {
  id: string
  versionNumber: string
  versionType: string
  versionTag: string | null
  versionDescription: string | null
  changeSummary: Record<string, any>
  createdAt: Date
  createdBy: string
}

/**
 * Response structure for the Get Workflow Details tool
 */
interface GetWorkflowDetailsResponse {
  workflow: {
    id: string
    name: string
    description: string | null
    color: string
    userId: string
    workspaceId: string | null
    folderId: string | null
    createdAt: Date
    updatedAt: Date
    lastSynced: Date
    isDeployed: boolean
    deployedAt: Date | null
    deployedState: any
    pinnedApiKey: string | null
    collaborators: string[]
    runCount: number
    lastRunAt: Date | null
    variables: Record<string, any>
    isPublished: boolean
    marketplaceData: any

    // Optional folder info
    folder?: {
      id: string
      name: string
      color: string
    } | null
  }

  // Optional data sections
  blocks?: BlockData[]
  edges?: EdgeData[]
  executionHistory?: ExecutionLogData[]
  versionHistory?: VersionData[]

  // Metadata and analytics
  analytics: {
    totalBlocks: number
    totalEdges: number
    totalExecutions: number
    lastExecutedAt: Date | null
    averageExecutionTime: number | null
    successRate: number
  }

  // URLs and access
  urls: {
    editUrl: string
    viewUrl: string
    apiUrl?: string
    shareUrl?: string
  }
}

/**
 * Get Workflow Details Tool Implementation
 */
class GetWorkflowDetailsTool extends BaseNexusTool {
  constructor() {
    super({
      toolName: 'GetWorkflowDetails',
      description:
        'Get comprehensive details for a specific workflow including structure and analytics',
      requiresAuth: true,
      loggingEnabled: true,
      performanceTracking: true,
    })
  }

  /**
   * Fetch the main workflow data
   */
  private async fetchWorkflowData(workflowId: string, userId: string, includeFolderInfo: boolean) {
    let query = db.select({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      color: workflow.color,
      userId: workflow.userId,
      workspaceId: workflow.workspaceId,
      folderId: workflow.folderId,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      lastSynced: workflow.lastSynced,
      isDeployed: workflow.isDeployed,
      deployedAt: workflow.deployedAt,
      deployedState: workflow.deployedState,
      pinnedApiKey: workflow.pinnedApiKey,
      collaborators: workflow.collaborators,
      runCount: workflow.runCount,
      lastRunAt: workflow.lastRunAt,
      variables: workflow.variables,
      isPublished: workflow.isPublished,
      marketplaceData: workflow.marketplaceData,

      // Folder info if requested
      ...(includeFolderInfo
        ? {
            folderName: workflowFolder.name,
            folderColor: workflowFolder.color,
          }
        : {}),
    })

    if (includeFolderInfo) {
      query = query.leftJoin(workflowFolder, eq(workflow.folderId, workflowFolder.id)) as any
    }

    query = query.where(eq(workflow.id, workflowId)) as any

    const results = await query

    if (results.length === 0) {
      throw new Error('Workflow not found')
    }

    const workflowData = results[0]

    // Check permissions - user must own the workflow or be a collaborator
    const collaborators = (workflowData.collaborators as string[]) || []
    if (workflowData.userId !== userId && !collaborators.includes(userId)) {
      throw new Error('Access denied: You do not have permission to view this workflow')
    }

    return workflowData
  }

  /**
   * Fetch workflow blocks
   */
  private async fetchWorkflowBlocks(workflowId: string): Promise<BlockData[]> {
    const blocks = await db
      .select()
      .from(workflowBlocks)
      .where(eq(workflowBlocks.workflowId, workflowId))
      .orderBy(workflowBlocks.positionY, workflowBlocks.positionX)

    return blocks.map((block) => ({
      id: block.id,
      type: block.type,
      name: block.name,
      position: {
        x: Number(block.positionX),
        y: Number(block.positionY),
      },
      enabled: block.enabled,
      horizontalHandles: block.horizontalHandles,
      isWide: block.isWide,
      advancedMode: block.advancedMode,
      triggerMode: block.triggerMode,
      height: Number(block.height),
      subBlocks: block.subBlocks as Record<string, any>,
      outputs: block.outputs as Record<string, any>,
      data: block.data as Record<string, any>,
      parentId: block.parentId,
      extent: block.extent,
    }))
  }

  /**
   * Fetch workflow edges
   */
  private async fetchWorkflowEdges(workflowId: string): Promise<EdgeData[]> {
    const edges = await db
      .select()
      .from(workflowEdges)
      .where(eq(workflowEdges.workflowId, workflowId))
      .orderBy(workflowEdges.createdAt)

    return edges.map((edge) => ({
      id: edge.id,
      sourceBlockId: edge.sourceBlockId,
      targetBlockId: edge.targetBlockId,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      createdAt: edge.createdAt,
    }))
  }

  /**
   * Fetch execution history
   */
  private async fetchExecutionHistory(
    workflowId: string,
    limit: number
  ): Promise<ExecutionLogData[]> {
    const executions = await db
      .select()
      .from(workflowExecutionLogs)
      .where(eq(workflowExecutionLogs.workflowId, workflowId))
      .orderBy(desc(workflowExecutionLogs.startedAt))
      .limit(limit)

    return executions.map((execution) => ({
      id: execution.id,
      executionId: execution.executionId,
      level: execution.level,
      trigger: execution.trigger,
      startedAt: execution.startedAt,
      endedAt: execution.endedAt,
      totalDurationMs: execution.totalDurationMs,
      executionData: execution.executionData as Record<string, any>,
      cost: execution.cost as Record<string, any> | null,
      files: execution.files as Record<string, any> | null,
    }))
  }

  /**
   * Fetch version history
   */
  private async fetchVersionHistory(workflowId: string, limit: number): Promise<VersionData[]> {
    const versions = await db
      .select()
      .from(workflowVersions)
      .where(eq(workflowVersions.workflowId, workflowId))
      .orderBy(desc(workflowVersions.createdAt))
      .limit(limit)

    return versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      versionType: version.versionType,
      versionTag: version.versionTag,
      versionDescription: version.versionDescription,
      changeSummary: version.changeSummary as Record<string, any>,
      createdAt: version.createdAt,
      createdBy: version.createdBy,
    }))
  }

  /**
   * Calculate analytics from execution history
   */
  private calculateAnalytics(
    workflowData: any,
    blocks: BlockData[],
    edges: EdgeData[],
    executions: ExecutionLogData[]
  ) {
    const successfulExecutions = executions.filter((e) => e.level === 'info' || e.level !== 'error')
    const totalExecutions = executions.length
    const successRate =
      totalExecutions > 0 ? (successfulExecutions.length / totalExecutions) * 100 : 0

    const completedExecutions = executions.filter((e) => e.endedAt && e.totalDurationMs)
    const averageExecutionTime =
      completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => sum + (e.totalDurationMs || 0), 0) /
          completedExecutions.length
        : null

    return {
      totalBlocks: blocks.length,
      totalEdges: edges.length,
      totalExecutions: workflowData.runCount || 0,
      lastExecutedAt: workflowData.lastRunAt,
      averageExecutionTime,
      successRate,
    }
  }

  /**
   * Generate URLs for the workflow
   */
  private generateWorkflowUrls(workflowData: any): any {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.sim.dev'
    const workspaceId = workflowData.workspaceId
    const workflowId = workflowData.id

    return {
      editUrl: `${baseUrl}/workspace/${workspaceId}/workflow/${workflowId}`,
      viewUrl: `${baseUrl}/workspace/${workspaceId}/workflow/${workflowId}/view`,
      ...(workflowData.pinnedApiKey
        ? {
            apiUrl: `${baseUrl}/api/v1/workflows/${workflowId}/execute?key=${workflowData.pinnedApiKey}`,
          }
        : {}),
      ...(workflowData.isPublished
        ? {
            shareUrl: `${baseUrl}/public/workflow/${workflowId}`,
          }
        : {}),
    }
  }

  /**
   * Create the AI tool instance
   */
  createTool() {
    return tool({
      description: this.config.description,
      parameters: GetWorkflowDetailsInputSchema,

      execute: async (
        input: GetWorkflowDetailsInput
      ): Promise<NexusToolResponse<GetWorkflowDetailsResponse>> => {
        return this.executeOperation(
          input,
          async (validatedInput, context, user) => {
            this.logger.info(`[${context.operationId}] Fetching workflow details`, {
              userId: user.id,
              workflowId: validatedInput.workflowId,
              includes: {
                blocks: validatedInput.includeBlocks,
                edges: validatedInput.includeEdges,
                executionHistory: validatedInput.includeExecutionHistory,
                versionHistory: validatedInput.includeVersionHistory,
              },
            })

            // Fetch main workflow data
            const workflowStartTime = Date.now()
            const workflowData = await this.fetchWorkflowData(
              validatedInput.workflowId,
              user.id,
              validatedInput.includeFolderInfo || false
            )
            const workflowFetchTime = Date.now() - workflowStartTime

            // Fetch optional data in parallel
            const fetchPromises: Promise<any>[] = []

            if (validatedInput.includeBlocks) {
              fetchPromises.push(this.fetchWorkflowBlocks(validatedInput.workflowId))
            } else {
              fetchPromises.push(Promise.resolve([]))
            }

            if (validatedInput.includeEdges) {
              fetchPromises.push(this.fetchWorkflowEdges(validatedInput.workflowId))
            } else {
              fetchPromises.push(Promise.resolve([]))
            }

            if (validatedInput.includeExecutionHistory) {
              fetchPromises.push(
                this.fetchExecutionHistory(
                  validatedInput.workflowId,
                  validatedInput.executionHistoryLimit || 10
                )
              )
            } else {
              fetchPromises.push(Promise.resolve([]))
            }

            if (validatedInput.includeVersionHistory) {
              fetchPromises.push(
                this.fetchVersionHistory(
                  validatedInput.workflowId,
                  validatedInput.versionHistoryLimit || 5
                )
              )
            } else {
              fetchPromises.push(Promise.resolve([]))
            }

            const dataFetchStartTime = Date.now()
            const [blocks, edges, executions, versions] = await Promise.all(fetchPromises)
            const dataFetchTime = Date.now() - dataFetchStartTime

            // Calculate analytics
            const analytics = this.calculateAnalytics(workflowData, blocks, edges, executions)

            // Generate URLs
            const urls = this.generateWorkflowUrls(workflowData)

            // Log performance metrics
            this.logPerformanceMetrics(context, {
              workflowFetchTimeMs: workflowFetchTime,
              dataFetchTimeMs: dataFetchTime,
              blocksCount: blocks.length,
              edgesCount: edges.length,
              executionsCount: executions.length,
              versionsCount: versions.length,
              dbQueryCount: 1 + fetchPromises.length,
            })

            // Prepare response
            const response: GetWorkflowDetailsResponse = {
              workflow: {
                id: workflowData.id,
                name: workflowData.name,
                description: workflowData.description,
                color: workflowData.color,
                userId: workflowData.userId,
                workspaceId: workflowData.workspaceId,
                folderId: workflowData.folderId,
                createdAt: workflowData.createdAt,
                updatedAt: workflowData.updatedAt,
                lastSynced: workflowData.lastSynced,
                isDeployed: workflowData.isDeployed,
                deployedAt: workflowData.deployedAt,
                deployedState: workflowData.deployedState,
                pinnedApiKey: workflowData.pinnedApiKey,
                collaborators: (workflowData.collaborators as string[]) || [],
                runCount: workflowData.runCount,
                lastRunAt: workflowData.lastRunAt,
                variables: (workflowData.variables as Record<string, any>) || {},
                isPublished: workflowData.isPublished,
                marketplaceData: workflowData.marketplaceData,

                ...(validatedInput.includeFolderInfo && workflowData.folderId
                  ? {
                      folder: {
                        id: workflowData.folderId,
                        name: workflowData.folderName || 'Unknown',
                        color: workflowData.folderColor || '#6B7280',
                      },
                    }
                  : { folder: null }),
              },

              ...(validatedInput.includeBlocks ? { blocks } : {}),
              ...(validatedInput.includeEdges ? { edges } : {}),
              ...(validatedInput.includeExecutionHistory ? { executionHistory: executions } : {}),
              ...(validatedInput.includeVersionHistory ? { versionHistory: versions } : {}),

              analytics,
              urls,
            }

            this.logger.info(`[${context.operationId}] Successfully fetched workflow details`, {
              userId: user.id,
              workflowId: validatedInput.workflowId,
              workflowName: workflowData.name,
              dataIncluded: {
                blocks: blocks.length,
                edges: edges.length,
                executions: executions.length,
                versions: versions.length,
              },
              executionTimeMs: Date.now() - context.startTime,
            })

            return response
          },
          GetWorkflowDetailsInputSchema
        )
      },
    })
  }
}

/**
 * Export the tool instance
 */
export const getWorkflowDetails = new GetWorkflowDetailsTool().createTool()
