/**
 * Tool Adapters Registry
 *
 * Auto-registers all available Sim tools as Parlant-compatible adapters.
 * This module discovers and creates adapters for all existing tools.
 */

// Import Sim tool registries
import { getRegisteredTools as getClientTools } from '@/lib/copilot/tools/client/registry'
import {
  makeApiRequestServerTool,
  searchDocumentationServerTool,
  searchOnlineServerTool,
} from '@/lib/copilot/tools/server'
import {
  getBlocksAndToolsServerTool,
  getBlocksMetadataServerTool,
} from '@/lib/copilot/tools/server/blocks'
import {
  listGDriveFilesServerTool,
  readGDriveFileServerTool,
} from '@/lib/copilot/tools/server/gdrive'
import {
  getEnvironmentVariablesServerTool,
  getOAuthCredentialsServerTool,
  setEnvironmentVariablesServerTool,
} from '@/lib/copilot/tools/server/user'
import {
  buildWorkflowServerTool,
  editWorkflowServerTool,
  getWorkflowConsoleServerTool,
} from '@/lib/copilot/tools/server/workflow'
import { createLogger } from '@/lib/logs/console/logger'
import type { ToolAdapterRegistry } from '../adapter-registry'
import { createAndRegisterClientToolAdapter, createAndRegisterServerToolAdapter } from '../factory'
import { AnalysisAdapters } from './analysis'
import { AutomationAdapters } from './automation'
import { CommunicationAdapters } from './communication'
import { DataRetrievalAdapters } from './data-retrieval'
import { ExternalIntegrationAdapters } from './external-integration'
import { FileOperationAdapters } from './file-operations'
import { UserManagementAdapters } from './user-management'
// Import specialized adapters
import { WorkflowManagementAdapters } from './workflow'

const logger = createLogger('AdapterRegistration')

/**
 * Register all available tool adapters
 */
export async function registerAllAdapters(registry: ToolAdapterRegistry): Promise<void> {
  logger.info('Starting automatic tool adapter registration')

  let totalRegistered = 0

  try {
    // Register client tool adapters
    const clientToolCount = await registerClientToolAdapters()
    totalRegistered += clientToolCount

    // Register server tool adapters
    const serverToolCount = await registerServerToolAdapters()
    totalRegistered += serverToolCount

    // Register specialized adapters
    const specializedCount = await registerSpecializedAdapters(registry)
    totalRegistered += specializedCount

    logger.info('Tool adapter registration completed', {
      totalRegistered,
      clientTools: clientToolCount,
      serverTools: serverToolCount,
      specializedAdapters: specializedCount,
    })
  } catch (error: any) {
    logger.error('Failed to register tool adapters', {
      error: error.message,
      totalRegistered,
    })
    throw error
  }
}

/**
 * Register adapters for all client tools
 */
async function registerClientToolAdapters(): Promise<number> {
  let count = 0

  try {
    const clientTools = getClientTools()

    for (const [toolName, toolDef] of Object.entries(clientTools)) {
      try {
        createAndRegisterClientToolAdapter(toolDef, {
          description: getClientToolDescription(toolName, toolDef),
          usageGuidelines: getClientToolUsageGuidelines(toolName, toolDef),
          parameters: getClientToolParameters(toolName, toolDef),
          category: getClientToolCategory(toolName),
          estimatedDurationMs: 2000,
          cacheable: isClientToolCacheable(toolName),
        })
        count++
      } catch (error: any) {
        logger.warn('Failed to register client tool adapter', {
          toolName,
          error: error.message,
        })
      }
    }

    logger.info('Registered client tool adapters', { count })
  } catch (error: any) {
    logger.error('Error accessing client tools registry', { error: error.message })
  }

  return count
}

/**
 * Register adapters for all server tools
 */
async function registerServerToolAdapters(): Promise<number> {
  const serverTools = [
    // Workflow tools
    { tool: buildWorkflowServerTool, category: 'workflow-management' as const },
    { tool: editWorkflowServerTool, category: 'workflow-management' as const },
    { tool: getWorkflowConsoleServerTool, category: 'workflow-management' as const },

    // Block tools
    { tool: getBlocksAndToolsServerTool, category: 'data-retrieval' as const },
    { tool: getBlocksMetadataServerTool, category: 'data-retrieval' as const },

    // Search and external tools
    { tool: searchDocumentationServerTool, category: 'data-retrieval' as const },
    { tool: searchOnlineServerTool, category: 'external-integration' as const },
    { tool: makeApiRequestServerTool, category: 'external-integration' as const },

    // User management tools
    { tool: getEnvironmentVariablesServerTool, category: 'user-management' as const },
    { tool: setEnvironmentVariablesServerTool, category: 'user-management' as const },
    { tool: getOAuthCredentialsServerTool, category: 'user-management' as const },

    // Google Drive integration
    { tool: listGDriveFilesServerTool, category: 'file-operations' as const },
    { tool: readGDriveFileServerTool, category: 'file-operations' as const },
  ]

  let count = 0

  for (const { tool, category } of serverTools) {
    try {
      createAndRegisterServerToolAdapter(tool, {
        description: getServerToolDescription(tool.name),
        usageGuidelines: getServerToolUsageGuidelines(tool.name),
        parameters: getServerToolParameters(tool.name),
        category,
        estimatedDurationMs: getServerToolDuration(tool.name),
        cacheable: isServerToolCacheable(tool.name),
      })
      count++
    } catch (error: any) {
      logger.warn('Failed to register server tool adapter', {
        toolName: tool.name,
        error: error.message,
      })
    }
  }

  logger.info('Registered server tool adapters', { count })
  return count
}

/**
 * Register specialized adapters that don't map directly to existing tools
 */
async function registerSpecializedAdapters(registry: ToolAdapterRegistry): Promise<number> {
  let count = 0

  const adapterGroups = [
    WorkflowManagementAdapters,
    DataRetrievalAdapters,
    ExternalIntegrationAdapters,
    FileOperationAdapters,
    CommunicationAdapters,
    AnalysisAdapters,
    AutomationAdapters,
    UserManagementAdapters,
  ]

  for (const AdapterGroup of adapterGroups) {
    try {
      const adapters = new AdapterGroup()
      const groupAdapters = adapters.createAdapters()

      for (const adapter of groupAdapters) {
        registry.register(adapter)
        count++
      }

      logger.debug('Registered specialized adapter group', {
        group: AdapterGroup.name,
        count: groupAdapters.length,
      })
    } catch (error: any) {
      logger.warn('Failed to register specialized adapter group', {
        group: AdapterGroup.name,
        error: error.message,
      })
    }
  }

  logger.info('Registered specialized adapters', { count })
  return count
}

// Helper functions for generating tool metadata

function getClientToolDescription(toolName: string, toolDef: any): string {
  const descriptions: Record<string, string> = {
    build_workflow: 'Build a new workflow from YAML configuration with visual diff preview',
    edit_workflow: 'Edit an existing workflow with intelligent modifications',
    run_workflow: 'Execute a workflow and monitor its progress',
    get_workflow_console: 'Access workflow execution logs and debugging information',
    get_user_workflow: 'Retrieve a specific user workflow by ID',
    list_user_workflows: 'List all workflows accessible to the current user',
    get_workflow_from_name: 'Find a workflow by its name or title',
    get_blocks_and_tools: 'Get all available workflow blocks and tools',
    get_blocks_metadata: 'Retrieve detailed metadata about workflow blocks',
    set_global_workflow_variables: 'Set global variables accessible to all workflows',
    get_global_workflow_variables: 'Retrieve global workflow variables',
    checkoff_todo: 'Mark a todo item as completed',
    mark_todo_in_progress: 'Mark a todo item as in progress',
  }

  return descriptions[toolName] || `Execute client tool: ${toolName}`
}

function getClientToolUsageGuidelines(toolName: string, toolDef: any): string {
  const guidelines: Record<string, string> = {
    build_workflow:
      'Use when you need to create a new workflow from YAML. Always review the visual diff before accepting changes. Provide a clear description of what the workflow does.',
    edit_workflow:
      'Use when modifying existing workflows. Specify exactly what changes you want to make. The tool will show you a diff of the changes.',
    run_workflow:
      'Use to execute workflows and see results. Monitor the execution progress and handle any errors that occur.',
    get_workflow_console:
      'Use when debugging workflow executions. This provides detailed logs and error information.',
    get_user_workflow:
      'Use when you need details about a specific workflow. Requires the workflow ID.',
    list_user_workflows: 'Use to discover available workflows. Can filter by various criteria.',
    get_workflow_from_name:
      'Use when you know the workflow name but not the ID. Useful for referencing workflows by name.',
    get_blocks_and_tools: 'Use when building workflows to see what components are available.',
    get_blocks_metadata: 'Use when you need detailed information about specific workflow blocks.',
    set_global_workflow_variables:
      'Use to set variables that all workflows can access. Be careful not to overwrite important values.',
    get_global_workflow_variables: 'Use to see what global variables are available to workflows.',
    checkoff_todo: 'Use when a todo item has been completed successfully.',
    mark_todo_in_progress: 'Use when starting work on a todo item to track progress.',
  }

  return guidelines[toolName] || `Use this tool to ${toolName.replace(/_/g, ' ')}`
}

function getClientToolParameters(toolName: string, toolDef: any): Record<string, any> {
  // Return tool-specific parameter schemas
  // This would be enhanced with actual schema discovery from the tools
  return {
    type: 'object',
    properties: {},
    required: [],
  }
}

function getClientToolCategory(
  toolName: string
):
  | 'workflow-management'
  | 'data-retrieval'
  | 'external-integration'
  | 'user-management'
  | 'file-operations'
  | 'communication'
  | 'analysis'
  | 'automation' {
  const categoryMap: Record<string, any> = {
    build_workflow: 'workflow-management',
    edit_workflow: 'workflow-management',
    run_workflow: 'workflow-management',
    get_workflow_console: 'workflow-management',
    get_user_workflow: 'data-retrieval',
    list_user_workflows: 'data-retrieval',
    get_workflow_from_name: 'data-retrieval',
    get_blocks_and_tools: 'data-retrieval',
    get_blocks_metadata: 'data-retrieval',
    set_global_workflow_variables: 'user-management',
    get_global_workflow_variables: 'data-retrieval',
    checkoff_todo: 'automation',
    mark_todo_in_progress: 'automation',
  }

  return categoryMap[toolName] || 'automation'
}

function isClientToolCacheable(toolName: string): boolean {
  const noncacheableTools = [
    'build_workflow',
    'edit_workflow',
    'run_workflow',
    'set_global_workflow_variables',
    'checkoff_todo',
    'mark_todo_in_progress',
  ]

  return !noncacheableTools.includes(toolName)
}

function getServerToolDescription(toolName: string): string {
  const descriptions: Record<string, string> = {
    build_workflow: 'Build a workflow from YAML configuration on the server',
    edit_workflow: 'Edit workflow configuration on the server',
    get_workflow_console: 'Get workflow execution console output from the server',
    get_blocks_and_tools: 'Retrieve available workflow blocks and tools from server',
    get_blocks_metadata: 'Get detailed metadata about workflow blocks from server',
    search_documentation: 'Search through documentation and help content',
    search_online: 'Perform web search to find relevant information',
    make_api_request: 'Make HTTP API calls to external services',
    get_environment_variables: 'Retrieve user environment variables',
    set_environment_variables: 'Set user environment variables',
    get_oauth_credentials: 'Get OAuth credentials for external service integration',
    list_gdrive_files: 'List files from Google Drive',
    read_gdrive_file: 'Read content from a Google Drive file',
  }

  return descriptions[toolName] || `Execute server tool: ${toolName}`
}

function getServerToolUsageGuidelines(toolName: string): string {
  const guidelines: Record<string, string> = {
    search_documentation:
      'Use when users need help with features or have questions about functionality.',
    search_online: 'Use when you need current information not available in the system.',
    make_api_request:
      'Use for integrating with external APIs. Be careful with authentication and rate limits.',
    get_environment_variables:
      'Use to check what environment variables are configured for the user.',
    set_environment_variables: 'Use to configure user-specific settings and API keys.',
    get_oauth_credentials: 'Use when accessing OAuth-protected services on behalf of the user.',
    list_gdrive_files: "Use to browse user's Google Drive files. Requires proper authentication.",
    read_gdrive_file: 'Use to read content from Google Drive files. Check permissions first.',
  }

  return guidelines[toolName] || `Use this server tool to ${toolName.replace(/_/g, ' ')}`
}

function getServerToolParameters(toolName: string): Record<string, any> {
  // Return tool-specific parameter schemas
  return {
    type: 'object',
    properties: {},
    required: [],
  }
}

function getServerToolDuration(toolName: string): number {
  const durationMap: Record<string, number> = {
    search_online: 5000,
    make_api_request: 3000,
    list_gdrive_files: 2000,
    read_gdrive_file: 3000,
    search_documentation: 1000,
  }

  return durationMap[toolName] || 2000
}

function isServerToolCacheable(toolName: string): boolean {
  const noncacheableTools = ['make_api_request', 'set_environment_variables']

  return !noncacheableTools.includes(toolName)
}
