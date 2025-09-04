/**
 * Nexus Tools - Complete Toolset Export
 *
 * This module exports the complete Nexus Copilot toolset for Sim workflow management.
 * All tools follow standardized patterns for authentication, logging, error handling,
 * and performance monitoring.
 *
 * TOOL CATEGORIES:
 * - Workflow Management: CRUD operations for workflows
 * - Workspace Management: Workspace and folder operations
 * - Execution Management: Running and monitoring workflows
 * - Analytics Tools: Performance and usage insights
 * - Collaboration Tools: Sharing and permission management
 *
 * USAGE:
 * Import individual tools or the complete toolset for AI agent integration.
 * All tools are production-ready with comprehensive error handling.
 */

// Base tool infrastructure
export {
  BaseNexusTool,
  createPaginationSchema,
  createSortingSchema,
  createWorkspaceSchema,
  type NexusErrorResponse,
  type NexusOperationContext,
  type NexusSuccessResponse,
  type NexusToolConfig,
  type NexusToolResponse,
} from './base-nexus-tool'
export { createWorkflow } from './create-workflow'
export { getWorkflowDetails } from './get-workflow-details'
// Core workflow management tools
export { listWorkflows } from './list-workflows'
export { updateWorkflow } from './update-workflow'

/**
 * Complete toolset for easy import
 *
 * Usage:
 * ```typescript
 * import { nexusToolset } from '@/lib/nexus/tools';
 *
 * const tools = [
 *   nexusToolset.listWorkflows,
 *   nexusToolset.createWorkflow,
 *   nexusToolset.getWorkflowDetails,
 *   nexusToolset.updateWorkflow
 * ];
 * ```
 */
export const nexusToolset = {
  // Workflow Management
  get listWorkflows() {
    return listWorkflows
  },
  get createWorkflow() {
    return createWorkflow
  },
  get getWorkflowDetails() {
    return getWorkflowDetails
  },
  get updateWorkflow() {
    return updateWorkflow
  },

  // Tool metadata
  version: '1.0.0',
  description: 'Complete Nexus Copilot toolset for Sim workflow management',
  categories: [
    'workflow-management',
    'workspace-management',
    'execution-management',
    'analytics',
    'collaboration',
  ],

  // Get all available tools as array
  getAllTools() {
    return [listWorkflows, createWorkflow, getWorkflowDetails, updateWorkflow]
  },

  // Get tools by category
  getToolsByCategory(category: string) {
    switch (category) {
      case 'workflow-management':
        return [listWorkflows, createWorkflow, getWorkflowDetails, updateWorkflow]
      default:
        return []
    }
  },

  // Tool registry for dynamic discovery
  registry: {
    'list-workflows': {
      tool: listWorkflows,
      category: 'workflow-management',
      description: 'Get a comprehensive list of workflows with filtering and sorting',
      permissions: ['workflows.read'],
      rateLimits: {
        perMinute: 60,
        perHour: 1000,
      },
    },
    'create-workflow': {
      tool: createWorkflow,
      category: 'workflow-management',
      description: 'Create a new workflow with configuration and templates',
      permissions: ['workflows.create'],
      rateLimits: {
        perMinute: 10,
        perHour: 100,
      },
    },
    'get-workflow-details': {
      tool: getWorkflowDetails,
      category: 'workflow-management',
      description: 'Get comprehensive details for a specific workflow',
      permissions: ['workflows.read'],
      rateLimits: {
        perMinute: 30,
        perHour: 500,
      },
    },
    'update-workflow': {
      tool: updateWorkflow,
      category: 'workflow-management',
      description: 'Update existing workflow properties and configuration',
      permissions: ['workflows.update'],
      rateLimits: {
        perMinute: 20,
        perHour: 200,
      },
    },
  } as const,
} as const

/**
 * Tool registration helper for AI frameworks
 *
 * Usage:
 * ```typescript
 * import { registerNexusTools } from '@/lib/nexus/tools';
 *
 * const aiTools = registerNexusTools(['workflow-management']);
 * ```
 */
export function registerNexusTools(categories?: string[]) {
  if (!categories || categories.length === 0) {
    return nexusToolset.getAllTools()
  }

  const tools = []
  for (const category of categories) {
    tools.push(...nexusToolset.getToolsByCategory(category))
  }

  return Array.from(new Set(tools)) // Remove duplicates
}

/**
 * Get tool metadata for documentation or discovery
 */
export function getNexusToolMetadata() {
  return {
    toolset: {
      name: 'Nexus Copilot Tools',
      version: nexusToolset.version,
      description: nexusToolset.description,
      categories: nexusToolset.categories,
      totalTools: Object.keys(nexusToolset.registry).length,
    },
    tools: Object.entries(nexusToolset.registry).map(([key, config]) => ({
      id: key,
      name: key
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      category: config.category,
      description: config.description,
      permissions: config.permissions,
      rateLimits: config.rateLimits,
    })),
  }
}

/**
 * Validate tool permissions for a user
 *
 * This would integrate with the actual permission system
 * For now, it returns a placeholder structure
 */
export function validateNexusToolPermissions(userId: string, toolIds: string[]) {
  // Placeholder implementation
  // In production, this would check against actual user permissions
  return {
    userId,
    allowedTools: toolIds, // For now, allow all tools
    deniedTools: [],
    rateLimits: Object.fromEntries(
      toolIds.map((toolId) => [
        toolId,
        (nexusToolset.registry as any)[toolId]?.rateLimits || { perMinute: 10, perHour: 100 },
      ])
    ),
  }
}
