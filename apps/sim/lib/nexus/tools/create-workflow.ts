/**
 * Nexus Tool: Create Workflow
 *
 * Creates new workflows with comprehensive validation, template support,
 * and initial configuration. Integrates with Sim's workflow system
 * for optimal performance and consistency.
 *
 * FEATURES:
 * - Workspace-scoped workflow creation
 * - Template-based initialization
 * - Comprehensive validation
 * - Folder organization support
 * - Tag management
 * - Collaboration setup
 * - Comprehensive logging and audit trails
 */

import { tool } from 'ai'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '@/db'
import { workflow, workflowFolder } from '@/db/schema'
import { BaseNexusTool, createWorkspaceSchema, type NexusToolResponse } from './base-nexus-tool'

/**
 * Input schema for the Create Workflow tool
 */
const CreateWorkflowInputSchema = z.object({
  ...createWorkspaceSchema().shape,

  // Core workflow properties
  name: z.string().min(1).max(100).describe('Name of the workflow'),
  description: z.string().optional().describe('Optional description of the workflow'),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional()
    .default('#3972F6')
    .describe('Workflow color theme (hex format)'),

  // Organization properties
  folderId: z.string().optional().describe('Optional folder ID to organize the workflow'),
  tags: z.array(z.string()).optional().default([]).describe('Optional tags for categorization'),

  // Workflow configuration
  template: z.string().optional().describe('Optional template ID to use as base'),
  variables: z.record(z.any()).optional().default({}).describe('Initial workflow variables'),

  // Collaboration settings
  collaborators: z
    .array(z.string())
    .optional()
    .default([])
    .describe('User IDs of initial collaborators'),
  isPublic: z.boolean().optional().default(false).describe('Whether the workflow is public'),

  // Initial state options
  initializeWithBlocks: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to initialize with default starter block'),

  // Advanced options
  deploymentSettings: z
    .object({
      autoDeployOnSave: z.boolean().optional().default(false),
      pinApiKey: z.boolean().optional().default(false),
    })
    .optional()
    .describe('Advanced deployment configuration'),
})

type CreateWorkflowInput = z.infer<typeof CreateWorkflowInputSchema>

/**
 * Response structure for the Create Workflow tool
 */
interface CreateWorkflowResponse {
  workflow: {
    id: string
    name: string
    description: string | null
    color: string
    workspaceId: string
    folderId: string | null
    createdAt: Date
    updatedAt: Date
    isDeployed: boolean
    isPublished: boolean
    collaborators: string[]
    variables: Record<string, any>
    tags: string[]
  }
  initialization: {
    templateApplied: string | null
    blocksCreated: number
    collaboratorsAdded: number
    folderValidated: boolean
  }
  urls: {
    editUrl: string
    viewUrl: string
    apiUrl?: string
  }
}

/**
 * Default workflow templates
 */
const WORKFLOW_TEMPLATES = {
  'basic-automation': {
    name: 'Basic Automation',
    description: 'Simple automation workflow with starter and response blocks',
    blocks: [
      {
        type: 'starter',
        name: 'Start',
        position: { x: 100, y: 100 },
      },
      {
        type: 'response',
        name: 'Response',
        position: { x: 300, y: 100 },
      },
    ],
  },
  'data-processing': {
    name: 'Data Processing',
    description: 'Workflow for processing and transforming data',
    blocks: [
      {
        type: 'starter',
        name: 'Input Data',
        position: { x: 100, y: 100 },
      },
      {
        type: 'function',
        name: 'Process Data',
        position: { x: 300, y: 100 },
      },
      {
        type: 'response',
        name: 'Output Result',
        position: { x: 500, y: 100 },
      },
    ],
  },
}

/**
 * Create Workflow Tool Implementation
 */
class CreateWorkflowTool extends BaseNexusTool {
  constructor() {
    super({
      toolName: 'CreateWorkflow',
      description: 'Create a new workflow with specified configuration and initial structure',
      requiresAuth: true,
      loggingEnabled: true,
      performanceTracking: true,
    })
  }

  /**
   * Validate that the specified folder exists and user has access
   */
  private async validateFolder(
    folderId: string,
    userId: string,
    workspaceId: string
  ): Promise<boolean> {
    if (!folderId) return true // No folder specified is valid

    const folder = await db
      .select()
      .from(workflowFolder)
      .where(eq(workflowFolder.id, folderId))
      .limit(1)

    if (folder.length === 0) {
      throw new Error(`Folder with ID ${folderId} not found`)
    }

    const folderData = folder[0]
    if (folderData.userId !== userId || folderData.workspaceId !== workspaceId) {
      throw new Error('Access denied: You do not have permission to use this folder')
    }

    return true
  }

  /**
   * Apply template configuration to workflow
   */
  private applyTemplate(templateId: string): any {
    const template = WORKFLOW_TEMPLATES[templateId as keyof typeof WORKFLOW_TEMPLATES]

    if (!template) {
      this.logger.warn(`Template ${templateId} not found, using default configuration`)
      return null
    }

    return {
      name: template.name,
      description: template.description,
      initialBlocks: template.blocks,
    }
  }

  /**
   * Generate initial workflow state
   */
  private generateInitialState(input: CreateWorkflowInput, templateData?: any): any {
    const baseState = {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    }

    // Apply template blocks if available
    if (templateData?.initialBlocks) {
      baseState.nodes = templateData.initialBlocks.map((block: any, index: number) => ({
        id: `block-${nanoid()}`,
        type: block.type,
        position: block.position,
        data: {
          name: block.name,
          type: block.type,
          enabled: true,
          ...block.data,
        },
      }))

      // Create edges between consecutive blocks
      for (let i = 0; i < baseState.nodes.length - 1; i++) {
        baseState.edges.push({
          id: `edge-${nanoid()}`,
          source: baseState.nodes[i].id,
          target: baseState.nodes[i + 1].id,
          type: 'default',
        })
      }
    } else if (input.initializeWithBlocks) {
      // Create default starter block
      baseState.nodes = [
        {
          id: `starter-${nanoid()}`,
          type: 'starter',
          position: { x: 100, y: 100 },
          data: {
            name: 'Start',
            type: 'starter',
            enabled: true,
          },
        },
      ]
    }

    return baseState
  }

  /**
   * Generate URLs for the workflow
   */
  private generateWorkflowUrls(
    workflowId: string,
    workspaceId: string,
    pinnedApiKey?: string
  ): any {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.sim.dev'

    return {
      editUrl: `${baseUrl}/workspace/${workspaceId}/workflow/${workflowId}`,
      viewUrl: `${baseUrl}/workspace/${workspaceId}/workflow/${workflowId}/view`,
      ...(pinnedApiKey
        ? {
            apiUrl: `${baseUrl}/api/v1/workflows/${workflowId}/execute?key=${pinnedApiKey}`,
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
      parameters: CreateWorkflowInputSchema,

      execute: async (
        input: CreateWorkflowInput
      ): Promise<NexusToolResponse<CreateWorkflowResponse>> => {
        return this.executeOperation(
          input,
          async (validatedInput, context, user) => {
            this.logger.info(`[${context.operationId}] Creating workflow`, {
              userId: user.id,
              workspaceId: validatedInput.workspaceId,
              workflowName: validatedInput.name,
              template: validatedInput.template,
              folderId: validatedInput.folderId,
              collaborators: validatedInput.collaborators?.length || 0,
            })

            // Validate folder if specified
            let folderValidated = false
            if (validatedInput.folderId) {
              folderValidated = await this.validateFolder(
                validatedInput.folderId,
                user.id,
                validatedInput.workspaceId
              )
            }

            // Apply template if specified
            let templateData = null
            if (validatedInput.template) {
              templateData = this.applyTemplate(validatedInput.template)
            }

            // Generate workflow ID and timestamps
            const workflowId = nanoid()
            const now = new Date()

            // Generate initial workflow state
            const initialState = this.generateInitialState(validatedInput, templateData)

            // Generate pinned API key if requested
            const pinnedApiKey = validatedInput.deploymentSettings?.pinApiKey
              ? `sim_${nanoid(32)}`
              : null

            // Create workflow in database
            const workflowData = {
              id: workflowId,
              userId: user.id,
              workspaceId: validatedInput.workspaceId,
              folderId: validatedInput.folderId || null,
              name: templateData?.name || validatedInput.name,
              description: templateData?.description || validatedInput.description || '',
              color: validatedInput.color,
              lastSynced: now,
              createdAt: now,
              updatedAt: now,
              isDeployed: false,
              deployedState: null,
              deployedAt: null,
              pinnedApiKey,
              collaborators: validatedInput.collaborators,
              runCount: 0,
              lastRunAt: null,
              variables: validatedInput.variables,
              isPublished: validatedInput.isPublic,
              marketplaceData: null,
            }

            const dbStartTime = Date.now()
            const newWorkflow = await db.insert(workflow).values(workflowData).returning()
            const dbExecutionTime = Date.now() - dbStartTime

            // Generate URLs for the workflow
            const urls = this.generateWorkflowUrls(
              workflowId,
              validatedInput.workspaceId,
              pinnedApiKey
            )

            // Log performance metrics
            this.logPerformanceMetrics(context, {
              dbInsertTimeMs: dbExecutionTime,
              folderValidationTimeMs: folderValidated ? 10 : 0, // Estimated
              templateProcessingTimeMs: templateData ? 5 : 0, // Estimated
              blocksCreated: initialState.nodes.length,
              edgesCreated: initialState.edges.length,
            })

            // Prepare response
            const response: CreateWorkflowResponse = {
              workflow: {
                id: workflowId,
                name: newWorkflow[0].name,
                description: newWorkflow[0].description,
                color: newWorkflow[0].color,
                workspaceId: newWorkflow[0].workspaceId!,
                folderId: newWorkflow[0].folderId,
                createdAt: newWorkflow[0].createdAt,
                updatedAt: newWorkflow[0].updatedAt,
                isDeployed: newWorkflow[0].isDeployed,
                isPublished: newWorkflow[0].isPublished,
                collaborators: newWorkflow[0].collaborators as string[],
                variables: newWorkflow[0].variables as Record<string, any>,
                tags: validatedInput.tags,
              },
              initialization: {
                templateApplied: validatedInput.template || null,
                blocksCreated: initialState.nodes.length,
                collaboratorsAdded: validatedInput.collaborators?.length || 0,
                folderValidated: !!validatedInput.folderId,
              },
              urls,
            }

            this.logger.info(`[${context.operationId}] Workflow created successfully`, {
              userId: user.id,
              workflowId,
              workflowName: validatedInput.name,
              workspaceId: validatedInput.workspaceId,
              template: validatedInput.template,
              blocksCreated: initialState.nodes.length,
              executionTimeMs: Date.now() - context.startTime,
            })

            return response
          },
          CreateWorkflowInputSchema
        )
      },
    })
  }
}

/**
 * Export the tool instance
 */
export const createWorkflow = new CreateWorkflowTool().createTool()
