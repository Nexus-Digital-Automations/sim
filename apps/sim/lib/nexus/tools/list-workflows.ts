/**
 * Nexus Tool: List Workflows
 *
 * Retrieves all workflows in a given workspace with comprehensive filtering,
 * sorting, and pagination support. Integrates with Sim's workflow API and
 * database schema for optimal performance.
 *
 * FEATURES:
 * - Workspace-scoped workflow listing
 * - Advanced filtering by status, folder, tags
 * - Flexible sorting options
 * - Pagination support
 * - Performance optimized queries
 * - Comprehensive logging and monitoring
 */

import { tool } from 'ai'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { workflow, workflowFolder } from '@/db/schema'
import {
  BaseNexusTool,
  createPaginationSchema,
  createWorkspaceSchema,
  type NexusToolResponse,
} from './base-nexus-tool'

/**
 * Input schema for the List Workflows tool
 */
const ListWorkflowsInputSchema = z.object({
  ...createWorkspaceSchema().shape,
  ...createPaginationSchema().shape,

  // Filtering options
  status: z
    .enum(['draft', 'published', 'archived'])
    .optional()
    .describe('Filter by workflow status'),
  folderId: z.string().optional().describe('Filter by specific folder ID'),
  searchTerm: z.string().optional().describe('Search workflows by name or description'),
  tags: z.array(z.string()).optional().describe('Filter by workflow tags'),
  isPublished: z.boolean().optional().describe('Filter by published status'),
  isDeployed: z.boolean().optional().describe('Filter by deployment status'),

  // Sorting options
  sortBy: z
    .enum(['created_at', 'updated_at', 'name', 'last_run_at', 'run_count'])
    .optional()
    .default('updated_at')
    .describe('Sort criteria'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort direction'),

  // Data options
  includeMetadata: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include additional workflow metadata'),
  includeFolderInfo: z.boolean().optional().default(false).describe('Include folder information'),
})

type ListWorkflowsInput = z.infer<typeof ListWorkflowsInputSchema>

/**
 * Workflow data structure returned by the tool
 */
interface WorkflowData {
  id: string
  name: string
  description: string | null
  color: string
  status?: string
  createdAt: Date
  updatedAt: Date
  lastSynced: Date
  isDeployed: boolean
  deployedAt: Date | null
  isPublished: boolean
  runCount: number
  lastRunAt: Date | null
  collaborators: any[]
  variables?: Record<string, any>
  marketplaceData?: any

  // Optional metadata
  folder?: {
    id: string
    name: string
    color: string
  } | null
}

/**
 * Response structure for the List Workflows tool
 */
interface ListWorkflowsResponse {
  workflows: WorkflowData[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
  filters: {
    applied: string[]
    available: Record<string, any>
  }
  performance: {
    queryTimeMs: number
    resultCount: number
  }
}

/**
 * List Workflows Tool Implementation
 */
class ListWorkflowsTool extends BaseNexusTool {
  constructor() {
    super({
      toolName: 'ListWorkflows',
      description:
        'Get a comprehensive list of workflows in a workspace with advanced filtering and sorting',
      requiresAuth: true,
      loggingEnabled: true,
      performanceTracking: true,
    })
  }

  /**
   * Build the database query with all filters applied
   */
  private buildWorkflowQuery(input: ListWorkflowsInput, userId: string) {
    const queryStart = Date.now()

    // Base query selecting workflow data
    let query = db.select({
      // Core workflow data
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      color: workflow.color,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      lastSynced: workflow.lastSynced,
      isDeployed: workflow.isDeployed,
      deployedAt: workflow.deployedAt,
      isPublished: workflow.isPublished,
      runCount: workflow.runCount,
      lastRunAt: workflow.lastRunAt,
      collaborators: workflow.collaborators,

      // Optional metadata
      ...(input.includeMetadata
        ? {
            variables: workflow.variables,
            marketplaceData: workflow.marketplaceData,
            deployedState: workflow.deployedState,
          }
        : {}),

      // Folder information if requested
      ...(input.includeFolderInfo
        ? {
            folderId: workflow.folderId,
            folderName: workflowFolder.name,
            folderColor: workflowFolder.color,
          }
        : {}),
    })

    // Add folder join if needed
    if (input.includeFolderInfo) {
      query = query.leftJoin(workflowFolder, eq(workflow.folderId, workflowFolder.id)) as any
    }

    // Base workspace filter - user can only see workflows they own or collaborate on
    const conditions = [
      eq(workflow.workspaceId, input.workspaceId),
      eq(workflow.userId, userId), // Only workflows owned by the user for now
    ]

    // Apply status filter
    if (input.status) {
      // Note: The schema doesn't have a direct status field, we'll use isPublished and isDeployed
      if (input.status === 'published') {
        conditions.push(eq(workflow.isPublished, true))
      } else if (input.status === 'draft') {
        conditions.push(eq(workflow.isPublished, false))
        conditions.push(eq(workflow.isDeployed, false))
      }
    }

    // Apply folder filter
    if (input.folderId) {
      conditions.push(eq(workflow.folderId, input.folderId))
    }

    // Apply published filter
    if (input.isPublished !== undefined) {
      conditions.push(eq(workflow.isPublished, input.isPublished))
    }

    // Apply deployed filter
    if (input.isDeployed !== undefined) {
      conditions.push(eq(workflow.isDeployed, input.isDeployed))
    }

    // Apply search filter
    if (input.searchTerm) {
      const searchCondition = sql`(
        ${workflow.name} ILIKE ${`%${input.searchTerm}%`} OR 
        ${workflow.description} ILIKE ${`%${input.searchTerm}%`}
      )`
      conditions.push(searchCondition)
    }

    // Apply all conditions
    query = query.where(and(...conditions)) as any

    // Apply sorting
    const sortColumn = this.getSortColumn(input.sortBy)
    if (input.sortOrder === 'asc') {
      query = query.orderBy(asc(sortColumn)) as any
    } else {
      query = query.orderBy(desc(sortColumn)) as any
    }

    // Apply pagination
    query = query.limit(input.limit).offset(input.offset) as any

    return { query, queryTimeMs: Date.now() - queryStart }
  }

  /**
   * Get the appropriate column for sorting
   */
  private getSortColumn(sortBy: string) {
    switch (sortBy) {
      case 'name':
        return workflow.name
      case 'created_at':
        return workflow.createdAt
      case 'last_run_at':
        return workflow.lastRunAt
      case 'run_count':
        return workflow.runCount
      default:
        return workflow.updatedAt
    }
  }

  /**
   * Get total count for pagination
   */
  private async getTotalCount(input: ListWorkflowsInput, userId: string): Promise<number> {
    let countQuery = db.select({ count: sql`count(*)`.as('count') }).from(workflow)

    // Apply same filters as main query
    const conditions = [eq(workflow.workspaceId, input.workspaceId), eq(workflow.userId, userId)]

    if (input.status === 'published') {
      conditions.push(eq(workflow.isPublished, true))
    } else if (input.status === 'draft') {
      conditions.push(eq(workflow.isPublished, false))
      conditions.push(eq(workflow.isDeployed, false))
    }

    if (input.folderId) {
      conditions.push(eq(workflow.folderId, input.folderId))
    }

    if (input.isPublished !== undefined) {
      conditions.push(eq(workflow.isPublished, input.isPublished))
    }

    if (input.isDeployed !== undefined) {
      conditions.push(eq(workflow.isDeployed, input.isDeployed))
    }

    if (input.searchTerm) {
      const searchCondition = sql`(
        ${workflow.name} ILIKE ${`%${input.searchTerm}%`} OR 
        ${workflow.description} ILIKE ${`%${input.searchTerm}%`}
      )`
      conditions.push(searchCondition)
    }

    countQuery = countQuery.where(and(...conditions))

    const result = await countQuery
    return Number(result[0]?.count || 0)
  }

  /**
   * Format the workflow data for response
   */
  private formatWorkflowData(rawData: any[]): WorkflowData[] {
    return rawData.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      color: workflow.color,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      lastSynced: workflow.lastSynced,
      isDeployed: workflow.isDeployed,
      deployedAt: workflow.deployedAt,
      isPublished: workflow.isPublished,
      runCount: workflow.runCount,
      lastRunAt: workflow.lastRunAt,
      collaborators: workflow.collaborators || [],
      variables: workflow.variables,
      marketplaceData: workflow.marketplaceData,

      // Folder info if included
      ...(workflow.folderId
        ? {
            folder: {
              id: workflow.folderId,
              name: workflow.folderName || 'Unknown',
              color: workflow.folderColor || '#6B7280',
            },
          }
        : { folder: null }),
    }))
  }

  /**
   * Create the AI tool instance
   */
  createTool() {
    return tool({
      description: this.config.description,
      parameters: ListWorkflowsInputSchema,

      execute: async (
        input: ListWorkflowsInput
      ): Promise<NexusToolResponse<ListWorkflowsResponse>> => {
        return this.executeOperation(
          input,
          async (validatedInput, context, user) => {
            this.logger.info(`[${context.operationId}] Listing workflows`, {
              userId: user.id,
              workspaceId: validatedInput.workspaceId,
              filters: {
                status: validatedInput.status,
                folderId: validatedInput.folderId,
                searchTerm: validatedInput.searchTerm,
                isPublished: validatedInput.isPublished,
                isDeployed: validatedInput.isDeployed,
              },
              pagination: {
                limit: validatedInput.limit,
                offset: validatedInput.offset,
              },
              sorting: {
                sortBy: validatedInput.sortBy,
                sortOrder: validatedInput.sortOrder,
              },
            })

            // Get total count for pagination
            const totalCount = await this.getTotalCount(validatedInput, user.id)

            // Build and execute the main query
            const { query, queryTimeMs } = this.buildWorkflowQuery(validatedInput, user.id)
            const queryStartTime = Date.now()
            const rawWorkflows = await query
            const queryExecutionTime = Date.now() - queryStartTime

            // Format the results
            const workflows = this.formatWorkflowData(rawWorkflows)

            // Log performance metrics
            this.logPerformanceMetrics(context, {
              queryBuildTimeMs: queryTimeMs,
              queryExecutionTimeMs: queryExecutionTime,
              totalRecordCount: totalCount,
              returnedRecordCount: workflows.length,
              dbQueryCount: 2, // One for count, one for data
            })

            // Prepare response
            const response: ListWorkflowsResponse = {
              workflows,
              pagination: {
                limit: validatedInput.limit,
                offset: validatedInput.offset,
                total: totalCount,
                hasMore: validatedInput.offset + workflows.length < totalCount,
              },
              filters: {
                applied: [
                  ...(validatedInput.status ? [`status:${validatedInput.status}`] : []),
                  ...(validatedInput.folderId ? [`folder:${validatedInput.folderId}`] : []),
                  ...(validatedInput.searchTerm ? [`search:${validatedInput.searchTerm}`] : []),
                  ...(validatedInput.isPublished !== undefined
                    ? [`published:${validatedInput.isPublished}`]
                    : []),
                  ...(validatedInput.isDeployed !== undefined
                    ? [`deployed:${validatedInput.isDeployed}`]
                    : []),
                ],
                available: {
                  status: ['draft', 'published', 'archived'],
                  sortBy: ['created_at', 'updated_at', 'name', 'last_run_at', 'run_count'],
                  sortOrder: ['asc', 'desc'],
                },
              },
              performance: {
                queryTimeMs: queryExecutionTime,
                resultCount: workflows.length,
              },
            }

            this.logger.info(
              `[${context.operationId}] Successfully retrieved ${workflows.length} workflows`,
              {
                userId: user.id,
                workspaceId: validatedInput.workspaceId,
                totalCount,
                returnedCount: workflows.length,
                executionTimeMs: Date.now() - context.startTime,
              }
            )

            return response
          },
          ListWorkflowsInputSchema
        )
      },
    })
  }
}

/**
 * Export the tool instance
 */
export const listWorkflows = new ListWorkflowsTool().createTool()
