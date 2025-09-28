/**
 * Tool Adapter Factory Functions
 *
 * Provides factory methods for creating tool adapters with common patterns
 * and automatic registration with the global registry.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { registerToolAdapter } from './adapter-registry'
import { BaseToolAdapter, createToolSchema } from './base-adapter'
import type {
  AdapterContext,
  AdapterResult,
  ClientToolDefinition,
  ParlantToolSchema,
  PermissionLevel,
  SimServerTool,
  ToolAdapter,
  ToolCategory,
} from './types'

const logger = createLogger('AdapterFactory')

/**
 * Create a tool adapter from a Sim client tool
 */
export function createClientToolAdapter(
  clientTool: ClientToolDefinition,
  options: AdapterOptions = {}
): ToolAdapter {
  const schema = createToolSchemaFromClientTool(clientTool, options)

  class ClientToolAdapter extends BaseToolAdapter {
    protected async executeInternal(args: any, context: AdapterContext): Promise<AdapterResult> {
      try {
        // Create execution context for the client tool
        const toolContext = {
          toolCallId: `adapter-${Date.now()}`,
          toolName: schema.Name,
          log: (level: any, message: string, extra?: Record<string, any>) => {
            this.logger[level]?.(message, {
              ...extra,
              userId: context.user_id,
              workspaceId: context.workspace_id,
            })
          },
        }

        // Execute the client tool
        const result = await clientTool.execute(toolContext, args)

        if (!result) {
          return this.createErrorResult(
            'EMPTY_RESULT',
            'Tool returned no result',
            'The tool completed but returned no data.'
          )
        }

        // Convert client tool result to adapter result
        return this.createSuccessResult(
          result.data,
          result.message || `${schema.Name} completed successfully`,
          {
            original_status: result.status,
          }
        )
      } catch (error: any) {
        logger.error('Client tool execution failed', {
          toolName: schema.Name,
          error: error.message,
        })

        return this.createErrorResult(
          'CLIENT_TOOL_ERROR',
          error.message || 'Client tool execution failed',
          'There was a problem executing this tool. Please try again.'
        )
      }
    }
  }

  return new ClientToolAdapter(schema)
}

/**
 * Create a tool adapter from a Sim server tool
 */
export function createServerToolAdapter(
  serverTool: SimServerTool,
  options: AdapterOptions = {}
): ToolAdapter {
  const schema = createToolSchemaFromServerTool(serverTool, options)

  class ServerToolAdapter extends BaseToolAdapter {
    protected async executeInternal(args: any, context: AdapterContext): Promise<AdapterResult> {
      try {
        // Execute the server tool
        const result = await serverTool.execute(args)

        // Convert server tool result to adapter result
        return this.createSuccessResult(result, `${schema.Name} completed successfully`, {
          server_tool_result: true,
        })
      } catch (error: any) {
        logger.error('Server tool execution failed', {
          toolName: schema.Name,
          error: error.message,
        })

        return this.createErrorResult(
          'SERVER_TOOL_ERROR',
          error.message || 'Server tool execution failed',
          'There was a problem executing this tool. Please try again.'
        )
      }
    }
  }

  return new ServerToolAdapter(schema)
}

/**
 * Create a custom tool adapter with a manual execution function
 */
export function createCustomToolAdapter(
  Name: string,
  description: string,
  usage_guidelines: string,
  parameters: Record<string, any>,
  executeFunction: (args: any, context: AdapterContext) => Promise<AdapterResult>,
  options: AdapterOptions = {}
): ToolAdapter {
  const schema = createToolSchema(Name, description, usage_guidelines, parameters, {
    category: options.category || 'automation',
    permission_level: options.permissionLevel || 'workspace',
    performance: {
      estimated_duration_ms: options.estimatedDurationMs || 1000,
      cacheable: options.cacheable !== false,
      resource_usage: options.resourceUsage || 'medium',
    },
  })

  class CustomToolAdapter extends BaseToolAdapter {
    protected async executeInternal(args: any, context: AdapterContext): Promise<AdapterResult> {
      return executeFunction(args, context)
    }
  }

  return new CustomToolAdapter(schema)
}

/**
 * Create and register a tool adapter from a client tool
 */
export function createAndRegisterClientToolAdapter(
  clientTool: ClientToolDefinition,
  options: AdapterOptions = {}
): ToolAdapter {
  const adapter = createClientToolAdapter(clientTool, options)
  registerToolAdapter(adapter)
  logger.info('Created and registered client tool adapter', { toolName: adapter.schema.Name })
  return adapter
}

/**
 * Create and register a tool adapter from a server tool
 */
export function createAndRegisterServerToolAdapter(
  serverTool: SimServerTool,
  options: AdapterOptions = {}
): ToolAdapter {
  const adapter = createServerToolAdapter(serverTool, options)
  registerToolAdapter(adapter)
  logger.info('Created and registered server tool adapter', { toolName: adapter.schema.Name })
  return adapter
}

/**
 * Create and register a custom tool adapter
 */
export function createAndRegisterCustomToolAdapter(
  Name: string,
  description: string,
  usage_guidelines: string,
  parameters: Record<string, any>,
  executeFunction: (args: any, context: AdapterContext) => Promise<AdapterResult>,
  options: AdapterOptions = {}
): ToolAdapter {
  const adapter = createCustomToolAdapter(
    Name,
    description,
    usage_guidelines,
    parameters,
    executeFunction,
    options
  )
  registerToolAdapter(adapter)
  logger.info('Created and registered custom tool adapter', { toolName: adapter.schema.Name })
  return adapter
}

/**
 * Batch create multiple tool adapters from client tools
 */
export function createClientToolAdapters(
  clientTools: ClientToolDefinition[],
  options: AdapterOptions = {}
): ToolAdapter[] {
  return clientTools.map((tool) => createClientToolAdapter(tool, options))
}

/**
 * Batch create multiple tool adapters from server tools
 */
export function createServerToolAdapters(
  serverTools: SimServerTool[],
  options: AdapterOptions = {}
): ToolAdapter[] {
  return serverTools.map((tool) => createServerToolAdapter(tool, options))
}

/**
 * Create a wrapper that adds common functionality to any tool adapter
 */
export function wrapToolAdapter(adapter: ToolAdapter, wrapper: ToolAdapterWrapper): ToolAdapter {
  const originalExecute = adapter.execute.bind(adapter)

  return {
    ...adapter,
    execute: async (args: any, context: AdapterContext): Promise<AdapterResult> => {
      // Pre-execution hook
      if (wrapper.beforeExecute) {
        const preResult = await wrapper.beforeExecute(args, context)
        if (preResult) {
          return preResult
        }
      }

      // Execute original tool
      let result: AdapterResult
      try {
        result = await originalExecute(args, context)
      } catch (error: any) {
        if (wrapper.onError) {
          return wrapper.onError(error, args, context)
        }
        throw error
      }

      // Post-execution hook
      if (wrapper.afterExecute) {
        result = (await wrapper.afterExecute(result, args, context)) || result
      }

      return result
    },
  }
}

/**
 * Helper functions for creating tool schemas
 */
function createToolSchemaFromClientTool(
  clientTool: ClientToolDefinition,
  options: AdapterOptions
): ParlantToolSchema {
  // Extract information from client tool metadata if available
  const metadata = clientTool.metadata
  const displayName = metadata?.displayNames?.success?.text || clientTool.Name

  return createToolSchema(
    clientTool.Name,
    options.description || `Execute ${displayName}`,
    options.usageGuidelines || `Use this tool to ${displayName.toLowerCase()}`,
    options.parameters || {},
    {
      category: options.category || 'workflow-management',
      permission_level: options.permissionLevel || 'workspace',
      performance: {
        estimated_duration_ms: options.estimatedDurationMs || 2000,
        cacheable: options.cacheable !== false,
        resource_usage: options.resourceUsage || 'medium',
      },
    }
  )
}

function createToolSchemaFromServerTool(
  serverTool: SimServerTool,
  options: AdapterOptions
): ParlantToolSchema {
  return createToolSchema(
    serverTool.Name,
    options.description || `Execute server tool: ${serverTool.Name}`,
    options.usageGuidelines || `Use this tool to execute ${serverTool.Name} on the server`,
    options.parameters || {},
    {
      category: options.category || 'external-integration',
      permission_level: options.permissionLevel || 'workspace',
      performance: {
        estimated_duration_ms: options.estimatedDurationMs || 3000,
        cacheable: options.cacheable !== false,
        resource_usage: options.resourceUsage || 'medium',
      },
    }
  )
}

/**
 * Create a tool adapter that proxies to an existing tool function
 */
export function createProxyToolAdapter(
  Name: string,
  description: string,
  proxyFunction: (args: any) => Promise<any>,
  options: AdapterOptions = {}
): ToolAdapter {
  return createCustomToolAdapter(
    Name,
    description,
    options.usageGuidelines || `Use this tool to ${description.toLowerCase()}`,
    options.parameters || {},
    async (args: any, context: AdapterContext): Promise<AdapterResult> => {
      try {
        const result = await proxyFunction(args)
        return {
          success: true,
          data: result,
          message: `${Name} completed successfully`,
          metadata: {
            execution_time_ms: 0,
            cached: false,
          },
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'PROXY_ERROR',
            message: error.message || 'Proxy function failed',
            user_message: 'There was a problem executing this tool. Please try again.',
            suggestions: ['Try again', 'Check your input parameters'],
            retryable: true,
          },
        }
      }
    },
    options
  )
}

// Export the main factory function for backward compatibility
export const createToolAdapter = createCustomToolAdapter

export interface AdapterOptions {
  description?: string
  usageGuidelines?: string
  parameters?: Record<string, any>
  category?: ToolCategory
  permissionLevel?: PermissionLevel
  estimatedDurationMs?: number
  cacheable?: boolean
  resourceUsage?: 'low' | 'medium' | 'high'
}

export interface ToolAdapterWrapper {
  beforeExecute?: (args: any, context: AdapterContext) => Promise<AdapterResult | null>
  afterExecute?: (
    result: AdapterResult,
    args: any,
    context: AdapterContext
  ) => Promise<AdapterResult | null>
  onError?: (error: any, args: any, context: AdapterContext) => Promise<AdapterResult>
}
